import { prisma } from "./prisma";
import { uploadFile, generateVoiceKey, getExtensionFromMimeType } from "./storage";
import { logger } from "./logger";

/**
 * Migration script to move voice recordings from PostgreSQL to S3
 *
 * Usage:
 * ```bash
 * npx tsx src/lib/migrate-voice-to-s3.ts
 * ```
 *
 * This script:
 * 1. Finds all quiz submissions with voiceData (stored in PostgreSQL)
 * 2. Uploads each recording to S3
 * 3. Updates the submission with voiceUrl
 * 4. Optionally clears voiceData to free up database space
 */

interface MigrationOptions {
  dryRun?: boolean;
  clearVoiceData?: boolean;
  batchSize?: number;
}

export async function migrateVoiceRecordingsToS3(
  options: MigrationOptions = {}
): Promise<{ migrated: number; failed: number; skipped: number }> {
  const { dryRun = false, clearVoiceData = false, batchSize = 10 } = options;

  logger.info({
    msg: "Starting voice recordings migration to S3",
    dryRun,
    clearVoiceData,
    batchSize,
  });

  // Find all submissions with voiceData but no voiceUrl
  const submissions = await prisma.lessonQuizSubmission.findMany({
    where: {
      voiceData: { not: null },
      voiceUrl: null,
    },
    select: {
      id: true,
      quizId: true,
      studentId: true,
      voiceData: true,
      voiceMimeType: true,
    },
  });

  logger.info({
    msg: "Found submissions to migrate",
    count: submissions.length,
  });

  let migrated = 0;
  let failed = 0;
  let skipped = 0;

  // Process in batches
  for (let i = 0; i < submissions.length; i += batchSize) {
    const batch = submissions.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (submission) => {
        try {
          if (!submission.voiceData) {
            skipped++;
            return;
          }

          const mimeType = submission.voiceMimeType || "audio/webm";
          const extension = getExtensionFromMimeType(mimeType);
          const key = generateVoiceKey(
            submission.quizId,
            submission.studentId,
            extension
          );

          if (dryRun) {
            logger.info({
              msg: "DRY RUN: Would upload to S3",
              submissionId: submission.id,
              key,
              size: submission.voiceData.length,
            });
            migrated++;
            return;
          }

          // Upload to S3
          const url = await uploadFile(key, Buffer.from(submission.voiceData), mimeType);

          // Update submission
          await prisma.lessonQuizSubmission.update({
            where: { id: submission.id },
            data: {
              voiceUrl: url,
              ...(clearVoiceData ? { voiceData: null } : {}),
            },
          });

          logger.info({
            msg: "Migrated voice recording to S3",
            submissionId: submission.id,
            url,
            clearedData: clearVoiceData,
          });

          migrated++;
        } catch (error) {
          logger.error({
            msg: "Failed to migrate voice recording",
            submissionId: submission.id,
            error: error instanceof Error ? error.message : String(error),
          });
          failed++;
        }
      })
    );

    logger.info({
      msg: "Batch processed",
      batch: Math.floor(i / batchSize) + 1,
      totalBatches: Math.ceil(submissions.length / batchSize),
      migrated,
      failed,
      skipped,
    });
  }

  logger.info({
    msg: "Migration completed",
    migrated,
    failed,
    skipped,
    total: submissions.length,
  });

  return { migrated, failed, skipped };
}

// Run migration if executed directly
if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  const clearVoiceData = process.argv.includes("--clear-data");

  migrateVoiceRecordingsToS3({ dryRun, clearVoiceData })
    .then((result) => {
      console.log("Migration completed:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
