/**
 * EXIF Service - Extract photo metadata using expo-media-library and expo-image-picker
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
 * Extract asset ID from various URI formats
 */
function extractAssetId(uri: string): string | null {
  // iOS ph:// format: ph://ED7AC36B-A150-4C38-BB8C-B6D696F4F2ED/L0/001
  if (uri.startsWith('ph://')) {
    return uri.replace('ph://', '').split('/')[0];
  }
  
  // iOS assets-library format
  if (uri.includes('assets-library://')) {
    const match = uri.match(/id=([A-F0-9-]+)/i);
    return match ? match[1] : null;
  }
  
  return null;
}

/**
 * Extract EXIF timestamp from a photo file
 * For gallery photos, we need to query MediaLibrary to get the original creation time
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
    
    // Try to extract asset ID from the URI
    const assetId = extractAssetId(photoUri);
    
    if (assetId) {
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
        console.log('Could not get asset info for asset ID:', assetId, e);
      }
    }
    
    // For file:// URIs from ImagePicker, try to find the asset in the library
    // ImagePicker returns a cached copy, so we need to search for the original
    if (photoUri.startsWith('file://') || photoUri.startsWith('/')) {
      try {
        // Get recent photos and try to match by filename or recent timestamp
        const recentAssets = await MediaLibrary.getAssetsAsync({
          first: 100,
          sortBy: [MediaLibrary.SortBy.creationTime],
          mediaType: MediaLibrary.MediaType.photo,
        });
        
        // The most recently accessed photo is likely the one the user just picked
        // This is a heuristic - ImagePicker doesn't give us the original asset ID
        if (recentAssets.assets.length > 0) {
          // Try to find a matching asset by checking the filename in the URI
          const filename = photoUri.split('/').pop()?.toLowerCase();
          
          for (const asset of recentAssets.assets) {
            const assetFilename = asset.filename?.toLowerCase();
            
            // Check if filenames match (without extensions sometimes)
            if (assetFilename && filename) {
              const assetBase = assetFilename.replace(/\.[^.]+$/, '');
              const uriBase = filename.replace(/\.[^.]+$/, '');
              
              if (assetFilename === filename || assetBase === uriBase) {
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
            }
          }
        }
      } catch (e) {
        console.log('Could not search media library:', e);
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
 * Extract timestamp from ImagePicker result which may include exif data
 * This is called with the full ImagePicker result to access any available metadata
 */
export async function extractTimestampFromPickerResult(
  uri: string,
  exif?: Record<string, unknown>
): Promise<PhotoTimestamp> {
  const uploadDate = new Date().toISOString();
  
  // First check if ImagePicker provided EXIF data directly
  if (exif) {
    // Look for DateTimeOriginal or DateTimeDigitized
    const dateTimeOriginal = exif.DateTimeOriginal || exif.DateTime || exif.DateTimeDigitized;
    
    if (dateTimeOriginal && typeof dateTimeOriginal === 'string') {
      try {
        // EXIF date format: "2024:12:26 14:30:45"
        const [datePart, timePart] = dateTimeOriginal.split(' ');
        const [year, month, day] = datePart.split(':');
        const isoDate = `${year}-${month}-${day}T${timePart}`;
        const captureDate = new Date(isoDate).toISOString();
        
        return {
          captureDate,
          isExifAvailable: true,
          uploadDate,
          displayDate: formatDateForDisplay(captureDate),
          warning: null,
        };
      } catch (e) {
        console.log('Could not parse EXIF date:', dateTimeOriginal, e);
      }
    }
  }
  
  // Fall back to MediaLibrary extraction
  return extractPhotoTimestamp(uri);
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
