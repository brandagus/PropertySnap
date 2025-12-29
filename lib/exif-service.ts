/**
 * EXIF Service - Extract photo metadata using expo-media-library
 * Uses native iOS/Android APIs to get actual photo capture timestamps
 * 
 * Note: exifreader package was removed due to module resolution issues on React Native
 */

import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

export interface PhotoTimestamp {
  // The actual capture date from EXIF metadata (if available)
  captureDate: string | null;
  // Whether EXIF data was successfully extracted
  isExifAvailable: boolean;
  // The upload/processing date as fallback
  uploadDate: string;
  // Human-readable display string
  displayDate: string;
  // Warning message if EXIF unavailable
  warning: string | null;
}

/**
 * Format date for display
 */
function formatDateForDisplay(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateString);
  }
}

/**
 * Extract EXIF timestamp from a photo file using expo-media-library
 * Returns the original capture date if available, with fallback to upload date
 */
export async function extractPhotoTimestamp(photoUri: string): Promise<PhotoTimestamp> {
  const uploadDate = new Date().toISOString();
  
  // Web platform doesn't support EXIF extraction
  if (Platform.OS === 'web') {
    return {
      captureDate: null,
      isExifAvailable: false,
      uploadDate,
      displayDate: formatDateForDisplay(uploadDate),
      warning: "Upload date - original timestamp unavailable",
    };
  }
  
  try {
    // Skip if not a valid URI
    if (!photoUri) {
      return {
        captureDate: null,
        isExifAvailable: false,
        uploadDate,
        displayDate: formatDateForDisplay(uploadDate),
        warning: "Upload date - original timestamp unavailable",
      };
    }
    
    // Request permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Media library permission not granted');
      return {
        captureDate: null,
        isExifAvailable: false,
        uploadDate,
        displayDate: formatDateForDisplay(uploadDate),
        warning: "Upload date - original timestamp unavailable",
      };
    }
    
    // Handle iOS ph:// URIs (photo library references)
    if (Platform.OS === 'ios' && photoUri.startsWith('ph://')) {
      const assetId = photoUri.replace('ph://', '').split('/')[0];
      
      try {
        const asset = await MediaLibrary.getAssetInfoAsync(assetId);
        
        if (asset && asset.creationTime) {
          const captureDate = new Date(asset.creationTime).toISOString();
          return {
            captureDate,
            isExifAvailable: true,
            uploadDate,
            displayDate: formatDateForDisplay(captureDate),
            warning: null,
          };
        }
      } catch (e) {
        console.log('Could not get asset info for ph:// URI:', e);
      }
    }
    
    // Handle file:// URIs - create asset to read metadata
    if (photoUri.startsWith('file://') || photoUri.startsWith('/')) {
      try {
        // Create asset to read metadata
        const asset = await MediaLibrary.createAssetAsync(photoUri);
        
        if (asset) {
          // Get full asset info including creation time
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
          
          if (assetInfo && assetInfo.creationTime) {
            const captureDate = new Date(assetInfo.creationTime).toISOString();
            return {
              captureDate,
              isExifAvailable: true,
              uploadDate,
              displayDate: formatDateForDisplay(captureDate),
              warning: null,
            };
          }
        }
      } catch (e) {
        console.log('Could not create/read asset for file:// URI:', e);
      }
    }

    // Fallback: no EXIF available
    return {
      captureDate: null,
      isExifAvailable: false,
      uploadDate,
      displayDate: formatDateForDisplay(uploadDate),
      warning: "Upload date - original timestamp unavailable",
    };
    
  } catch (error) {
    console.error("Error extracting EXIF data:", error);
    
    // Return upload date as fallback
    return {
      captureDate: null,
      isExifAvailable: false,
      uploadDate,
      displayDate: formatDateForDisplay(uploadDate),
      warning: "Upload date - original timestamp unavailable",
    };
  }
}

/**
 * Get display text for photo timestamp
 * Shows capture date if available, otherwise upload date with warning
 */
export function getTimestampDisplayText(timestamp: PhotoTimestamp): {
  dateText: string;
  isVerified: boolean;
  warningText: string | null;
} {
  if (timestamp.isExifAvailable && timestamp.captureDate) {
    return {
      dateText: `Captured: ${timestamp.displayDate}`,
      isVerified: true,
      warningText: null,
    };
  }
  
  return {
    dateText: `Uploaded: ${formatDateForDisplay(timestamp.uploadDate)}`,
    isVerified: false,
    warningText: timestamp.warning,
  };
}

/**
 * Format timestamp for PDF display
 * Returns formatted string with appropriate indicator
 */
export function formatTimestampForPDF(timestamp: PhotoTimestamp): {
  dateText: string;
  isVerified: boolean;
} {
  if (timestamp.isExifAvailable && timestamp.captureDate) {
    return {
      dateText: formatDateForDisplay(timestamp.captureDate),
      isVerified: true,
    };
  }
  
  return {
    dateText: formatDateForDisplay(timestamp.uploadDate),
    isVerified: false,
  };
}
