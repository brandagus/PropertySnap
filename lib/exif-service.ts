import * as FileSystem from "expo-file-system/legacy";
import ExifReader from "exifreader";

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
 * Parse EXIF date string to ISO format
 * EXIF dates are typically in format: "YYYY:MM:DD HH:MM:SS"
 */
function parseExifDate(exifDate: string): string | null {
  try {
    // EXIF format: "2024:01:15 14:30:45"
    // Convert to ISO: "2024-01-15T14:30:45"
    const match = exifDate.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }
    
    // Try alternative format with dashes
    const altMatch = exifDate.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (altMatch) {
      const [, year, month, day, hour, minute, second] = altMatch;
      return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }
    
    // If it's already ISO format, return as-is
    if (exifDate.includes("T")) {
      return exifDate;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Format date for display
 */
function formatDateForDisplay(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

/**
 * Extract EXIF timestamp from a photo file
 * Returns the original capture date if available, with fallback to upload date
 */
export async function extractPhotoTimestamp(photoUri: string): Promise<PhotoTimestamp> {
  const uploadDate = new Date().toISOString();
  
  try {
    // Skip if not a file URI
    if (!photoUri || photoUri.startsWith("data:")) {
      return {
        captureDate: null,
        isExifAvailable: false,
        uploadDate,
        displayDate: formatDateForDisplay(uploadDate),
        warning: "Upload date - original timestamp unavailable",
      };
    }
    
    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Convert base64 to ArrayBuffer for ExifReader
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Parse EXIF data
    const tags = ExifReader.load(bytes.buffer, { expanded: true });
    
    // Try to get the original capture date from various EXIF fields
    let captureDate: string | null = null;
    
    // Priority order for date fields:
    // 1. DateTimeOriginal - when the photo was actually taken
    // 2. DateTimeDigitized - when the photo was digitized
    // 3. DateTime - general modification date
    // 4. CreateDate - creation date
    
    const exifData = (tags.exif || {}) as Record<string, { description?: string }>;
    const xmpData = (tags.xmp || {}) as Record<string, { description?: string }>;
    
    // Check EXIF DateTimeOriginal
    if (exifData.DateTimeOriginal?.description) {
      captureDate = parseExifDate(exifData.DateTimeOriginal.description);
    }
    
    // Fallback to DateTimeDigitized
    if (!captureDate && exifData.DateTimeDigitized?.description) {
      captureDate = parseExifDate(exifData.DateTimeDigitized.description);
    }
    
    // Fallback to DateTime
    if (!captureDate && exifData.DateTime?.description) {
      captureDate = parseExifDate(exifData.DateTime.description);
    }
    
    // Check XMP CreateDate
    if (!captureDate && xmpData["CreateDate"]?.description) {
      captureDate = parseExifDate(xmpData["CreateDate"].description);
    }
    
    // Check XMP DateTimeOriginal
    if (!captureDate && xmpData["DateTimeOriginal"]?.description) {
      captureDate = parseExifDate(xmpData["DateTimeOriginal"].description);
    }
    
    if (captureDate) {
      return {
        captureDate,
        isExifAvailable: true,
        uploadDate,
        displayDate: formatDateForDisplay(captureDate),
        warning: null,
      };
    }
    
    // EXIF data exists but no date found
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
