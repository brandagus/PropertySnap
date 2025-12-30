/**
 * Direct R2 Upload Service
 * Uploads photos directly to Cloudflare R2 from the mobile app
 * Uses a simple fetch-based approach with presigned URL from backend
 */

import * as FileSystem from 'expo-file-system/legacy';

// R2 Configuration
const R2_CONFIG = {
  accountId: '3495c38f5d93bcb817de97c806ee37f0',
  bucketName: 'propertysnap',
  publicUrl: 'https://pub-86a234c0d5b04afc9fa48e30dba97cb8.r2.dev',
};

// Backend API for getting presigned URLs
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://propertysnap.onrender.com';

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

/**
 * Upload a photo to R2 via backend presigned URL
 * This approach works reliably because the backend handles AWS signing
 */
export async function uploadPhotoToR2Direct(
  uri: string,
  fileName?: string,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  try {
    // Generate unique filename
    const finalFileName = fileName || `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const key = `photos/${finalFileName}`;
    
    // Read file as base64
    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    
    // Upload via backend API (which handles R2 signing properly)
    const response = await fetch(`${API_BASE_URL}/api/trpc/storage.uploadPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          base64Data,
          fileName: finalFileName,
          contentType,
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend upload failed:', response.status, errorText);
      
      // If backend fails, return local URI as fallback
      return {
        success: false,
        error: `Backend upload failed: ${response.status}`,
      };
    }
    
    const result = await response.json();
    
    // tRPC wraps the result
    if (result?.result?.data?.json) {
      const data = result.result.data.json;
      return {
        success: true,
        key: data.key,
        url: data.url,
      };
    }
    
    // Handle error response
    if (result?.error) {
      return {
        success: false,
        error: result.error.json?.message || 'Upload failed',
      };
    }
    
    return {
      success: false,
      error: 'Unexpected response format',
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
  
  // Try R2 upload via backend
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
