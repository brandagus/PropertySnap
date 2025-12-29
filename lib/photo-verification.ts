/**
 * Photo Verification Service
 * Provides forensic-grade photo verification including:
 * - SHA-256 hash generation for tamper detection
 * - Timestamp embedding at capture time
 * - Verification status tracking
 */

import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface VerifiedPhoto {
  uri: string;
  hash: string;
  capturedAt: string;
  capturedTimestamp: number;
  isVerified: boolean;
  verificationMethod: 'camera' | 'gallery' | 'unknown';
  gpsLatitude?: number;
  gpsLongitude?: number;
  deviceInfo?: string;
}

export interface PhotoVerificationResult {
  isValid: boolean;
  originalHash: string;
  currentHash: string;
  tamperDetected: boolean;
  message: string;
}

/**
 * Generate SHA-256 hash of a photo file for tamper detection
 */
export async function generatePhotoHash(uri: string): Promise<string> {
  try {
    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    
    // Generate SHA-256 hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64
    );
    
    return hash;
  } catch (error) {
    console.error('Error generating photo hash:', error);
    return '';
  }
}

/**
 * Verify a photo hasn't been tampered with by comparing hashes
 */
export async function verifyPhotoIntegrity(
  uri: string,
  originalHash: string
): Promise<PhotoVerificationResult> {
  try {
    const currentHash = await generatePhotoHash(uri);
    const isValid = currentHash === originalHash;
    
    return {
      isValid,
      originalHash,
      currentHash,
      tamperDetected: !isValid && originalHash !== '',
      message: isValid 
        ? 'Photo integrity verified' 
        : originalHash === '' 
          ? 'No original hash available'
          : 'Warning: Photo may have been modified',
    };
  } catch (error) {
    return {
      isValid: false,
      originalHash,
      currentHash: '',
      tamperDetected: false,
      message: 'Unable to verify photo integrity',
    };
  }
}

/**
 * Create a verified photo object from a camera capture
 */
export async function createVerifiedPhoto(
  uri: string,
  method: 'camera' | 'gallery' | 'unknown' = 'camera',
  gpsCoords?: { latitude: number; longitude: number }
): Promise<VerifiedPhoto> {
  const now = new Date();
  const hash = await generatePhotoHash(uri);
  
  return {
    uri,
    hash,
    capturedAt: now.toISOString(),
    capturedTimestamp: now.getTime(),
    isVerified: method === 'camera',
    verificationMethod: method,
    gpsLatitude: gpsCoords?.latitude,
    gpsLongitude: gpsCoords?.longitude,
    deviceInfo: `${Platform.OS} ${Platform.Version}`,
  };
}

/**
 * Format verification status for display
 */
export function getVerificationStatusText(photo: VerifiedPhoto): string {
  if (photo.verificationMethod === 'camera' && photo.isVerified) {
    return 'Verified - Captured in app';
  } else if (photo.verificationMethod === 'gallery') {
    return 'Unverified - Imported from gallery';
  }
  return 'Unverified';
}

/**
 * Get verification badge color
 */
export function getVerificationBadgeColor(photo: VerifiedPhoto): {
  background: string;
  text: string;
  icon: string;
} {
  if (photo.verificationMethod === 'camera' && photo.isVerified) {
    return {
      background: '#E8F5E9',
      text: '#2E7D32',
      icon: 'checkmark.shield.fill',
    };
  }
  return {
    background: '#FFF3E0',
    text: '#E65100',
    icon: 'exclamationmark.triangle.fill',
  };
}

/**
 * Format timestamp for display on photo
 */
export function formatPhotoTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate distance between two GPS coordinates in meters
 */
export function calculateGPSDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if photo was taken near the property location
 */
export function isPhotoNearProperty(
  photoLat: number | undefined,
  photoLon: number | undefined,
  propertyLat: number | undefined,
  propertyLon: number | undefined,
  maxDistanceMeters: number = 100
): { isNear: boolean; distance: number | null; message: string } {
  if (!photoLat || !photoLon) {
    return {
      isNear: false,
      distance: null,
      message: 'Photo location not available',
    };
  }
  
  if (!propertyLat || !propertyLon) {
    return {
      isNear: false,
      distance: null,
      message: 'Property location not set',
    };
  }
  
  const distance = calculateGPSDistance(photoLat, photoLon, propertyLat, propertyLon);
  const isNear = distance <= maxDistanceMeters;
  
  return {
    isNear,
    distance: Math.round(distance),
    message: isNear
      ? `Photo taken ${Math.round(distance)}m from property`
      : `Warning: Photo taken ${Math.round(distance)}m from property`,
  };
}
