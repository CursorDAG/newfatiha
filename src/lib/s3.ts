/**
 * S3-compatible storage utilities for lesson recordings
 * Supports AWS S3, MinIO, Cloudflare R2, and other S3-compatible services
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT, // Optional: for MinIO or custom S3
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: !!process.env.S3_ENDPOINT, // Required for MinIO
});

const BUCKET_NAME = process.env.S3_BUCKET || "fatiha-recordings";
const PUBLIC_URL = process.env.S3_PUBLIC_URL; // Optional CDN URL

/**
 * Generate presigned URL for uploading a video file
 * @param key - S3 object key (path)
 * @param contentType - MIME type (e.g., "video/mp4")
 * @param expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
 * @returns Presigned upload URL
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate signed URL for viewing/downloading a video file
 * @param key - S3 object key (path)
 * @param expiresIn - URL expiration in seconds (default: 14400 = 4 hours)
 * @returns Signed view URL
 */
export async function getSignedViewUrl(
  key: string,
  expiresIn: number = 14400
): Promise<string> {
  // If public CDN URL is configured, use it instead of signed URL
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete an object from S3
 * @param key - S3 object key (path)
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Get object metadata (size, content type, etc.)
 * @param key - S3 object key (path)
 * @returns Object metadata
 */
export async function getObjectMetadata(key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
}> {
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    size: response.ContentLength || 0,
    contentType: response.ContentType || "application/octet-stream",
    lastModified: response.LastModified || new Date(),
  };
}

/**
 * Generate S3 key for a lesson recording
 * @param streamId - Stream ID
 * @param lessonId - Lesson ID
 * @param filename - Original filename
 * @returns S3 key path
 */
export function generateRecordingKey(
  streamId: string,
  lessonId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `recordings/${streamId}/${lessonId}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Check if S3 is configured
 * @returns true if S3 credentials are set
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET
  );
}
