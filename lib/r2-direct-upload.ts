/**
 * Direct R2 Upload Service
 * Uploads photos directly to Cloudflare R2 from the mobile app
 * Bypasses the backend server for faster, more reliable uploads
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

// R2 Configuration - hardcoded for now, will move to env later
const R2_CONFIG = {
  accountId: '3495c38f5d93bcb817de97c806ee37f0',
  accessKeyId: 'a0472228a24600ae8b85f6b4aeee2d79',
  secretAccessKey: 'fd4ebfa7193cbd1120617a07c9472cd78c7466bd81a96d45b3a4f8a96d3102bb',
  bucketName: 'propertysnap',
};

// Get R2 endpoint
function getR2Endpoint(): string {
  return `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
}

// Helper to convert string to Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Helper to convert Uint8Array to hex string
function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// HMAC-SHA256 using expo-crypto
async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  // For React Native, we need to use a different approach
  // expo-crypto doesn't support HMAC directly, so we'll use a pure JS implementation
  const keyHex = uint8ArrayToHex(key);
  const msgBytes = stringToUint8Array(message);
  
  // Simple HMAC implementation for SHA-256
  const blockSize = 64;
  let keyBytes = key;
  
  if (keyBytes.length > blockSize) {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      uint8ArrayToHex(keyBytes),
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    keyBytes = hexToUint8Array(hash);
  }
  
  if (keyBytes.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(keyBytes);
    keyBytes = padded;
  }
  
  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = keyBytes[i] ^ 0x5c;
    iKeyPad[i] = keyBytes[i] ^ 0x36;
  }
  
  const innerData = new Uint8Array(iKeyPad.length + msgBytes.length);
  innerData.set(iKeyPad);
  innerData.set(msgBytes, iKeyPad.length);
  
  const innerHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    uint8ArrayToHex(innerData),
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  
  const outerData = new Uint8Array(oKeyPad.length + 32);
  outerData.set(oKeyPad);
  outerData.set(hexToUint8Array(innerHash), oKeyPad.length);
  
  const outerHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    uint8ArrayToHex(outerData),
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  
  return hexToUint8Array(outerHash);
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// SHA-256 hash
async function sha256(data: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
}

// Generate AWS Signature V4 signing key
async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<Uint8Array> {
  const kDate = await hmacSha256(stringToUint8Array(`AWS4${key}`), dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

/**
 * Upload a photo directly to Cloudflare R2
 */
export async function uploadPhotoToR2Direct(
  uri: string,
  fileName?: string,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  try {
    // Read file as base64
    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    
    // Convert base64 to binary for upload
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Generate unique filename
    const finalFileName = fileName || `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const key = `photos/${finalFileName}`;
    const path = `/${R2_CONFIG.bucketName}/${key}`;
    
    // Prepare request
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    
    const region = 'auto';
    const service = 's3';
    const host = `${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
    
    // Calculate payload hash
    const payloadHash = await sha256(base64Data);
    
    // Canonical headers
    const canonicalHeaders = 
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    
    // Canonical request
    const canonicalRequest = [
      'PUT',
      path,
      '', // query string
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    
    // String to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256(canonicalRequest);
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');
    
    // Calculate signature
    const signingKey = await getSignatureKey(
      R2_CONFIG.secretAccessKey,
      dateStamp,
      region,
      service
    );
    const signatureBytes = await hmacSha256(signingKey, stringToSign);
    const signature = uint8ArrayToHex(signatureBytes);
    
    // Authorization header
    const authorization = `${algorithm} Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    // Make the upload request
    const response = await fetch(`${getR2Endpoint()}${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': authorization,
        'Content-Type': contentType,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Host': host,
        'Content-Length': bytes.length.toString(),
      },
      body: bytes,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('R2 upload failed:', response.status, errorText);
      return {
        success: false,
        error: `R2 upload failed: ${response.status} - ${errorText}`,
      };
    }
    
    // Return the public URL
    // Note: You need to enable public access on the bucket or use a custom domain
    // Use the actual public development URL from Cloudflare
    const publicUrl = `https://pub-86a234c0d5b04afc9fa48e30dba97cb8.r2.dev/${key}`;
    
    console.log('Photo uploaded to R2:', key);
    
    return {
      success: true,
      key,
      url: publicUrl,
    };
    
  } catch (error) {
    console.error('Error uploading to R2:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload photo with fallback to local storage
 */
export async function uploadPhotoWithFallback(
  uri: string
): Promise<{ uri: string; isCloud: boolean; error?: string }> {
  // Skip if already a cloud URL
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return { uri, isCloud: true };
  }
  
  // Try R2 upload
  const result = await uploadPhotoToR2Direct(uri);
  
  if (result.success && result.url) {
    return {
      uri: result.url,
      isCloud: true,
    };
  }
  
  // Fallback to local
  console.log('R2 upload failed, keeping local:', result.error);
  return {
    uri,
    isCloud: false,
    error: result.error,
  };
}
