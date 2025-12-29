import * as FileSystem from "expo-file-system/legacy";

/**
 * Watermark configuration
 */
interface WatermarkConfig {
  address: string;
  timestamp: string;
  isVerified: boolean;
}

/**
 * Generate watermarked photo HTML for PDF
 * Since we can't modify actual image files easily in React Native,
 * we'll overlay the watermark in the PDF HTML rendering
 */
export function generateWatermarkOverlay(config: WatermarkConfig): string {
  const { address, timestamp, isVerified } = config;
  
  // Format the timestamp for display
  const formattedTimestamp = formatTimestamp(timestamp);
  
  // Verification indicator
  const verificationIcon = isVerified ? "✓" : "⚠";
  const verificationText = isVerified ? "VERIFIED" : "UNVERIFIED";
  const verificationColor = isVerified ? "#2D5C3F" : "#D97706";
  
  return `
    <div class="watermark-overlay">
      <div class="watermark-top">
        <span class="watermark-address">${truncateAddress(address)}</span>
      </div>
      <div class="watermark-bottom">
        <span class="watermark-timestamp" style="background-color: ${verificationColor};">
          ${verificationIcon} ${formattedTimestamp} - ${verificationText}
        </span>
      </div>
    </div>
  `;
}

/**
 * Generate CSS for watermark overlay
 */
export function getWatermarkStyles(): string {
  return `
    .photo-with-watermark {
      position: relative;
      overflow: hidden;
    }
    
    .watermark-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
    }
    
    .watermark-top {
      background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
      padding: 8px 10px;
    }
    
    .watermark-address {
      font-size: 9px;
      color: #FFFFFF;
      font-weight: 600;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      letter-spacing: 0.3px;
    }
    
    .watermark-bottom {
      background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
      padding: 8px 10px;
      display: flex;
      justify-content: flex-end;
    }
    
    .watermark-timestamp {
      font-size: 8px;
      color: #FFFFFF;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 3px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
  `;
}

/**
 * Format timestamp for watermark display
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

/**
 * Truncate address for watermark (max ~40 chars)
 */
function truncateAddress(address: string): string {
  if (address.length <= 45) return address;
  return address.substring(0, 42) + "...";
}

/**
 * Generate watermarked photo container HTML for PDF
 */
export function generateWatermarkedPhotoHTML(
  photoBase64: string,
  address: string,
  timestamp: string | null,
  isExifVerified: boolean
): string {
  if (!timestamp) {
    // No timestamp available - just show photo without watermark
    return `
      <div class="photo-container">
        <img src="${photoBase64}" alt="Inspection photo" class="checkpoint-photo" />
      </div>
    `;
  }
  
  const watermarkOverlay = generateWatermarkOverlay({
    address,
    timestamp,
    isVerified: isExifVerified,
  });
  
  return `
    <div class="photo-container photo-with-watermark">
      <img src="${photoBase64}" alt="Inspection photo" class="checkpoint-photo" />
      ${watermarkOverlay}
    </div>
  `;
}

/**
 * Generate in-app watermark overlay component props
 * For use in React Native Image overlay
 */
export function getInAppWatermarkData(
  address: string,
  timestamp: string | null,
  isExifVerified: boolean
): {
  addressText: string;
  timestampText: string;
  isVerified: boolean;
  verificationColor: string;
} | null {
  if (!timestamp) return null;
  
  return {
    addressText: truncateAddress(address),
    timestampText: formatTimestamp(timestamp),
    isVerified: isExifVerified,
    verificationColor: isExifVerified ? "#2D5C3F" : "#D97706",
  };
}
