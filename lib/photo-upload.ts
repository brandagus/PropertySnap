/**
 * Photo Upload Service
 * Handles uploading photos to Cloudflare R2 cloud storage via backend API
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Auth from '@/lib/_core/auth';

// Backend API URL - use environment variable or default to Render deployment
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://propertysnap.onrender.com';

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export interface PhotoUploadOptions {
  uri: string;
  fileName?: string;
  contentType?: string;
  authToken?: string;
}

/**
 * Upload a photo to cloud storage (Cloudflare R2)
 * Returns the cloud URL for the uploaded photo
 */
export async function uploadPhotoToCloud(options: PhotoUploadOptions): Promise<UploadResult> {
  const { uri, fileName, contentType = 'image/jpeg', authToken } = options;
  
  try {
    // Read the file as base64
    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    
    // Generate a unique filename if not provided
    const finalFileName = fileName || `photo_${Date.now()}.jpg`;
    
    // Call the backend API to upload
    const response = await fetch(`${API_BASE_URL}/api/trpc/storage.uploadPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
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
      console.error('Upload failed:', response.status, errorText);
      return {
        success: false,
        error: `Upload failed: ${response.status}`,
      };
    }
    
    const result = await response.json();
    
    // tRPC wraps the result in a specific structure
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
    console.error('Error uploading photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload multiple photos to cloud storage
 */
export async function uploadMultiplePhotos(
  photos: PhotoUploadOptions[],
  onProgress?: (completed: number, total: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (let i = 0; i < photos.length; i++) {
    const result = await uploadPhotoToCloud(photos[i]);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, photos.length);
    }
  }
  
  return results;
}

/**
 * Check if a URI is a local file or cloud URL
 */
export function isCloudUrl(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

/**
 * Get the display URL for a photo (handles both local and cloud)
 */
export function getPhotoDisplayUrl(uri: string): string {
  if (isCloudUrl(uri)) {
    return uri;
  }
  // Local file - return as-is for local display
  return uri;
}

/**
 * Upload a photo and return the cloud URL, or return local URI if upload fails
 * This provides graceful fallback for offline scenarios
 */
export async function uploadPhotoWithFallback(
  uri: string,
  authToken?: string
): Promise<{ uri: string; isCloud: boolean; error?: string }> {
  // Get auth token if not provided
  let token = authToken;
  if (!token && Platform.OS !== 'web') {
    token = await Auth.getSessionToken() || undefined;
  }
  
  // Try to upload to cloud
  const result = await uploadPhotoToCloud({
    uri,
    authToken: token,
  });
  
  if (result.success && result.url) {
    return {
      uri: result.url,
      isCloud: true,
    };
  }
  
  // Fallback to local URI
  console.log('Cloud upload failed, using local URI:', result.error);
  return {
    uri,
    isCloud: false,
    error: result.error,
  };
}

/**
 * Batch upload photos with progress tracking
 * Returns array of cloud URLs (or local URIs for failed uploads)
 */
export async function batchUploadPhotos(
  uris: string[],
  authToken?: string,
  onProgress?: (completed: number, total: number, currentUri: string) => void
): Promise<{ results: Array<{ original: string; uploaded: string; isCloud: boolean }> }> {
  const results: Array<{ original: string; uploaded: string; isCloud: boolean }> = [];
  
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    
    if (onProgress) {
      onProgress(i, uris.length, uri);
    }
    
    // Skip if already a cloud URL
    if (isCloudUrl(uri)) {
      results.push({ original: uri, uploaded: uri, isCloud: true });
      continue;
    }
    
    const uploadResult = await uploadPhotoWithFallback(uri, authToken);
    results.push({
      original: uri,
      uploaded: uploadResult.uri,
      isCloud: uploadResult.isCloud,
    });
  }
  
  if (onProgress) {
    onProgress(uris.length, uris.length, '');
  }
  
  return { results };
}
