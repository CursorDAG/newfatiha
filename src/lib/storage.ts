import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger";

/**
 * Storage configuration from environment variables
 */
interface StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
}

/**
 * Get storage configuration from environment
 */
function getStorageConfig(): StorageConfig {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "us-east-1";
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicUrl = process.env.S3_PUBLIC_URL;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 storage not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables."
    );
  }

  return {
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicUrl,
  };
}

/**
 * Create S3 client instance
 */
function createS3Client(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: !!config.endpoint, // Required for MinIO and other S3-compatible services
  });
}

/**
 * Upload a file to S3 storage
 */
export async function uploadFile(
  key: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const config = getStorageConfig();
  const client = createS3Client(config);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );

    logger.info({
      msg: "File uploaded to S3",
      key,
      bucket: config.bucket,
      size: data.length,
    });

    // Return public URL if configured, otherwise return S3 key
    if (config.publicUrl) {
      return `${config.publicUrl}/${key}`;
    }

    return key;
  } catch (error) {
    logger.error({
      msg: "Failed to upload file to S3",
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Failed to upload file to storage");
  }
}

/**
 * Generate a signed URL for downloading a file
 * @param key - S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const config = getStorageConfig();
  const client = createS3Client(config);

  try {
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });

    logger.debug({
      msg: "Generated signed URL",
      key,
      expiresIn,
    });

    return url;
  } catch (error) {
    logger.error({
      msg: "Failed to generate signed URL",
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Failed to generate download URL");
  }
}

/**
 * Delete a file from S3 storage
 */
export async function deleteFile(key: string): Promise<void> {
  const config = getStorageConfig();
  const client = createS3Client(config);

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );

    logger.info({
      msg: "File deleted from S3",
      key,
      bucket: config.bucket,
    });
  } catch (error) {
    logger.error({
      msg: "Failed to delete file from S3",
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Failed to delete file from storage");
  }
}

/**
 * Generate a unique storage key for voice recordings
 */
export function generateVoiceKey(
  quizId: string,
  studentId: string,
  extension: string
): string {
  const timestamp = Date.now();
  return `voice-recordings/${quizId}/${studentId}-${timestamp}.${extension}`;
}

/**
 * Extract file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
  };

  return mimeMap[mimeType] || "webm";
}

/**
 * Check if S3 storage is configured
 */
export function isStorageConfigured(): boolean {
  return !!(
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}
