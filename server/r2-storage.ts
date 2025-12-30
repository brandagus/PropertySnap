/**
 * Cloudflare R2 Storage Service for PropertySnap photos
 * Uses S3-compatible API with Cloudflare R2
 */

import { createHmac, createHash } from "crypto";

// R2 Configuration from environment
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  bucketName: process.env.R2_BUCKET_NAME || "propertysnap",
};

// R2 endpoint URL
function getR2Endpoint(): string {
  return `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
}

// Generate AWS Signature V4 for R2
function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Buffer {
  const kDate = createHmac("sha256", `AWS4${key}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(regionName).digest();
  const kService = createHmac("sha256", kRegion).update(serviceName).digest();
  const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
  return kSigning;
}

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

interface SignedHeaders {
  Authorization: string;
  "x-amz-date": string;
  "x-amz-content-sha256": string;
  Host: string;
  "Content-Type"?: string;
}

function signRequest(
  method: string,
  path: string,
  payload: Buffer | string,
  contentType?: string
): SignedHeaders {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  
  const region = "auto";
  const service = "s3";
  const host = `${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
  
  const payloadHash = sha256(payload);
  
  // Canonical request
  const canonicalHeaders = contentType
    ? `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
    : `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  
  const signedHeaders = contentType
    ? "content-type;host;x-amz-content-sha256;x-amz-date"
    : "host;x-amz-content-sha256;x-amz-date";
  
  const canonicalRequest = [
    method,
    path,
    "", // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  
  // String to sign
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  
  // Calculate signature
  const signingKey = getSignatureKey(
    R2_CONFIG.secretAccessKey,
    dateStamp,
    region,
    service
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");
  
  // Authorization header
  const authorization = `${algorithm} Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  const headers: SignedHeaders = {
    Authorization: authorization,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    Host: host,
  };
  
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  
  return headers;
}

/**
 * Upload a photo to Cloudflare R2
 */
export async function uploadPhotoToR2(
  base64Data: string,
  fileName: string,
  contentType: string = "image/jpeg"
): Promise<{ key: string; url: string }> {
  if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }
  
  const buffer = Buffer.from(base64Data, "base64");
  const key = `photos/${Date.now()}-${fileName}`;
  const path = `/${R2_CONFIG.bucketName}/${key}`;
  
  const headers = signRequest("PUT", path, buffer, contentType);
  
  const response = await fetch(`${getR2Endpoint()}${path}`, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Length": buffer.length.toString(),
    },
    body: buffer,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`R2 upload failed: ${response.status} - ${errorText}`);
  }
  
  // Return the public URL (assuming bucket is configured for public access)
  // Or use R2 custom domain if configured
  const publicUrl = `https://pub-${R2_CONFIG.accountId}.r2.dev/${key}`;
  
  return { key, url: publicUrl };
}

/**
 * Generate a signed URL for downloading a photo from R2
 */
export async function getR2SignedUrl(key: string): Promise<string> {
  if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }
  
  // For simplicity, return the public URL
  // In production, you might want to generate presigned URLs
  return `https://pub-${R2_CONFIG.accountId}.r2.dev/${key}`;
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
