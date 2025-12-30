/**
 * Cloudflare R2 Storage Service for PropertySnap photos
 * Uses AWS SDK for proper S3-compatible signing
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 Configuration from environment
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || "3495c38f5d93bcb817de97c806ee37f0",
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "a0472228a24600ae8b85f6b4aeee2d79",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "fd4ebfa7193cbd1120617a07c9472cd78c7466bd81a96d45b3a4f8a96d3102bb",
  bucketName: process.env.R2_BUCKET_NAME || "propertysnap",
  publicUrl: "https://pub-86a234c0d5b04afc9fa48e30dba97cb8.r2.dev",
};

// Create S3 client configured for R2
function getS3Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
  });
}

/**
 * Upload a photo to Cloudflare R2
 */
export async function uploadPhotoToR2(
  base64Data: string,
  fileName: string,
  contentType: string = "image/jpeg"
): Promise<{ key: string; url: string }> {
  if (!R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }
  
  const client = getS3Client();
  const buffer = Buffer.from(base64Data, "base64");
  const key = `photos/${Date.now()}-${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  
  await client.send(command);
  
  // Return the public URL
  const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;
  
  console.log("Photo uploaded to R2:", key);
  
  return { key, url: publicUrl };
}

/**
 * Generate a signed URL for downloading a photo from R2
 */
export async function getR2SignedUrl(key: string): Promise<string> {
  if (!R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }
  
  // Return the public URL since bucket has public access enabled
  return `${R2_CONFIG.publicUrl}/${key}`;
}

/**
 * Generate a presigned URL for uploading directly from client
 */
export async function getR2UploadUrl(
  fileName: string,
  contentType: string = "image/jpeg"
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  if (!R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }
  
  const client = getS3Client();
  const key = `photos/${Date.now()}-${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    ContentType: contentType,
  });
  
  // Generate presigned URL valid for 5 minutes
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;
  
  return { uploadUrl, key, publicUrl };
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
  return !!(
    R2_CONFIG.accountId &&
    R2_CONFIG.accessKeyId &&
    R2_CONFIG.secretAccessKey
  );
}
