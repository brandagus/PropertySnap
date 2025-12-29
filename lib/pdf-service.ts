import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Property, Inspection, Checkpoint, Team } from "./app-context";
import { generateWatermarkOverlay, getWatermarkStyles } from "./watermark-service";

// Branding options for white-label PDFs
export interface PDFBrandingOptions {
  companyLogo?: string | null;
  companyName?: string | null;
}

// Color Palette - Luxury/Legal Aesthetic
const COLORS = {
  burgundy: "#8B2635",
  burgundyDark: "#6D1E2A",
  gold: "#C59849",
  goldLight: "#D4AF61",
  navy: "#1C2839",
  charcoal: "#3A3A3A",
  cream: "#F9F7F4",
  white: "#FFFFFF",
  lightGray: "#E8E6E3",
  mutedText: "#6B6B6B",
  forestGreen: "#2D5C3F",
  amber: "#D97706",
  deepRed: "#991B1B",
};

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Format time for display
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get condition text color
function getConditionColor(condition: string | null): string {
  switch (condition) {
    case "pass":
      return COLORS.forestGreen;
    case "pass-attention":
      return COLORS.amber;
    case "fail":
      return COLORS.deepRed;
    default:
      return COLORS.mutedText;
  }
}

// Format condition for display - text-based, not button style
function formatCondition(condition: string | null): string {
  if (!condition) return "";
  switch (condition) {
    case "pass":
      return "Pass";
    case "pass-attention":
      return "Needs Attention";
    case "fail":
      return "Fail - Action Required";
    default:
      return condition.charAt(0).toUpperCase() + condition.slice(1);
  }
}

// Get condition icon
function getConditionIcon(condition: string | null): string {
  switch (condition) {
    case "pass":
      return "✓";
    case "pass-attention":
      return "⚠";
    case "fail":
      return "✗";
    default:
      return "";
  }
}

// Convert local file URI to base64 data URI for PDF embedding
async function getBase64Image(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  
  try {
    if (uri.startsWith("data:")) {
      return uri;
    }
    
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const extension = uri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
}

// Generate the HTML template for the PDF
async function generatePDFHTML(property: Property, inspection: Inspection, branding?: PDFBrandingOptions): Promise<string> {
  // Group checkpoints by room
  const checkpointsByRoom = inspection.checkpoints.reduce((acc, checkpoint) => {
    const room = checkpoint.roomName || "General";
    if (!acc[room]) {
      acc[room] = [];
    }
    acc[room].push(checkpoint);
    return acc;
  }, {} as Record<string, Checkpoint[]>);

  // Process all photos to base64
  const processedCheckpoints: Record<string, Array<Checkpoint & { photoBase64: string | null }>> = {};
  
  for (const [room, checkpoints] of Object.entries(checkpointsByRoom)) {
    processedCheckpoints[room] = await Promise.all(
      checkpoints.map(async (checkpoint) => {
        const photo = checkpoint.landlordPhoto || checkpoint.tenantPhoto || checkpoint.moveOutPhoto;
        const photoBase64 = await getBase64Image(photo);
        return { ...checkpoint, photoBase64 };
      })
    );
  }

  // Get property profile photo for cover (NOT first inspection photo)
  const profilePhotoBase64 = await getBase64Image(property.profilePhoto);

  // Generate room sections HTML - no room numbers, Photo 1/2/3 labels
  const roomSections = Object.entries(processedCheckpoints)
    .map(([room, checkpoints]) => {
      const roomHasAnyPhoto = checkpoints.some(cp => !!cp.photoBase64);
      const roomHasAnyCondition = checkpoints.some(cp => 
        cp.landlordCondition || cp.tenantCondition || cp.moveOutCondition
      );
      const roomNotInspected = !roomHasAnyPhoto && !roomHasAnyCondition;
      
      return `
      <div class="room-section">
        <div class="room-header">
          <h2 class="room-title">${room}${roomNotInspected ? ' <span class="not-inspected-badge">(Not Inspected)</span>' : ''}</h2>
        </div>
        <div class="gold-divider"></div>
        <div class="checkpoints-grid">
          ${checkpoints
            .map((checkpoint, photoIndex) => {
              const condition = checkpoint.landlordCondition || checkpoint.tenantCondition || checkpoint.moveOutCondition;
              const hasPhoto = !!checkpoint.photoBase64;
              const hasNotes = !!checkpoint.notes && checkpoint.notes.trim().length > 0;
              const conditionText = formatCondition(condition);
              const conditionIcon = getConditionIcon(condition);
              const conditionColor = getConditionColor(condition);
              
              // Get timestamp data for watermark
              const photoTimestamp = checkpoint.landlordPhotoTimestamp || checkpoint.tenantPhotoTimestamp || checkpoint.moveOutPhotoTimestamp;
              const timestampForWatermark = photoTimestamp?.captureDate || photoTimestamp?.uploadDate || checkpoint.timestamp;
              const isExifVerified = photoTimestamp?.isExifAvailable || false;
              
              return `
            <div class="checkpoint-card">
              ${hasPhoto
                ? `<div class="photo-container photo-with-watermark">
                    <img src="${checkpoint.photoBase64}" alt="Photo ${photoIndex + 1}" class="checkpoint-photo" />
                    ${timestampForWatermark ? generateWatermarkOverlay({
                      address: property.address,
                      timestamp: timestampForWatermark,
                      isVerified: isExifVerified,
                    }) : ''}
                  </div>`
                : `<div class="photo-placeholder">
                    <div class="placeholder-icon">📷</div>
                    <span class="placeholder-text">No photo provided</span>
                  </div>`
              }
              <div class="checkpoint-details">
                <h3 class="checkpoint-label">Photo ${photoIndex + 1}</h3>
                ${conditionText ? `<div class="condition-status" style="color: ${conditionColor};">
                  <span class="condition-icon">${conditionIcon}</span>
                  <span class="condition-text">Status: ${conditionText}</span>
                </div>` : ''}
                ${hasNotes ? `<div class="checkpoint-notes"><p>${checkpoint.notes}</p></div>` : ''}
              </div>
            </div>
          `;
            })
            .join("")}
        </div>
      </div>
    `;
    })
    .join("");

  // Convert signatures to base64
  const landlordSigBase64 = await getBase64Image(inspection.landlordSignature);
  const tenantSigBase64 = await getBase64Image(inspection.tenantSignature);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Property Inspection Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 20mm 25mm;
        }
        
        @page :first {
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          line-height: 1.7;
          color: ${COLORS.navy};
          background: ${COLORS.white};
        }
        
        h1, h2, h3, h4 {
          font-family: 'Crimson Pro', Georgia, 'Times New Roman', serif;
        }
        
        /* ==================== COVER PAGE ==================== */
        .cover-page {
          page-break-after: always;
          min-height: 100vh;
          background: ${COLORS.cream};
          position: relative;
          overflow: hidden;
        }
        
        .cover-header-bar {
          background: ${COLORS.burgundy};
          height: 14px;
          width: 100%;
        }
        
        .cover-content {
          padding: 60px 70px;
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 14px);
        }
        
        .cover-logo-section {
          display: flex;
          align-items: center;
          margin-bottom: 50px;
        }
        
        .cover-logo {
          width: 80px;
          height: 80px;
          background: ${COLORS.burgundy};
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 36px;
          color: ${COLORS.white};
          font-weight: 700;
          margin-right: 24px;
          box-shadow: 0 6px 16px rgba(139, 38, 53, 0.35);
        }
        
        .cover-brand {
          display: flex;
          flex-direction: column;
        }
        
        .cover-brand-name {
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 32px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          letter-spacing: -0.5px;
        }
        
        .cover-brand-tagline {
          font-size: 13px;
          color: ${COLORS.mutedText};
          font-style: italic;
          margin-top: 4px;
        }
        
        .cover-gold-divider {
          height: 4px;
          background: linear-gradient(90deg, ${COLORS.gold} 0%, ${COLORS.goldLight} 50%, ${COLORS.gold} 100%);
          margin: 40px 0;
          border-radius: 2px;
        }
        
        .cover-document-title {
          text-align: center;
          margin: 40px 0 50px 0;
        }
        
        .cover-document-title h1 {
          font-size: 48px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          letter-spacing: -1px;
          margin-bottom: 12px;
        }
        
        .cover-document-subtitle {
          font-size: 16px;
          color: ${COLORS.navy};
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 4px;
        }
        
        .cover-photo-section {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 30px 0;
        }
        
        .cover-photo-frame {
          position: relative;
          max-width: 450px;
          width: 100%;
        }
        
        .cover-photo-border {
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          border: 4px solid ${COLORS.gold};
          border-radius: 14px;
          pointer-events: none;
        }
        
        .cover-photo {
          width: 100%;
          height: 300px;
          object-fit: cover;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.18);
        }
        
        .cover-property-card {
          background: ${COLORS.white};
          border-radius: 14px;
          padding: 36px 44px;
          margin-top: 40px;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
          border-left: 6px solid ${COLORS.burgundy};
        }
        
        .cover-property-address {
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 28px;
          font-weight: 600;
          color: ${COLORS.navy};
          margin-bottom: 20px;
          line-height: 1.3;
        }
        
        .cover-property-meta {
          display: flex;
          gap: 40px;
          flex-wrap: wrap;
        }
        
        .cover-meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .cover-meta-label {
          font-size: 10px;
          color: ${COLORS.mutedText};
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        
        .cover-meta-value {
          font-size: 15px;
          color: ${COLORS.navy};
          font-weight: 600;
        }
        
        .cover-legal-notice {
          background: ${COLORS.white};
          border: 2px solid ${COLORS.burgundy};
          border-radius: 10px;
          padding: 24px 30px;
          margin-top: 40px;
        }
        
        .cover-legal-notice h4 {
          font-size: 14px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .cover-legal-notice p {
          font-size: 11px;
          color: ${COLORS.charcoal};
          line-height: 1.8;
        }
        
        /* ==================== REPORT PAGES ==================== */
        .report-page {
          padding: 0;
          background: ${COLORS.white};
        }
        
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 28px;
          border-bottom: 3px solid ${COLORS.burgundy};
          margin-bottom: 50px;
        }
        
        .report-header-left h1 {
          font-size: 36px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          margin-bottom: 6px;
        }
        
        .report-header-left p {
          font-size: 13px;
          color: ${COLORS.mutedText};
          font-style: italic;
        }
        
        .report-header-right {
          text-align: right;
        }
        
        .report-header-right .date {
          font-size: 15px;
          font-weight: 600;
          color: ${COLORS.navy};
        }
        
        .report-header-right .type {
          font-size: 12px;
          color: ${COLORS.gold};
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-top: 6px;
        }
        
        /* Room Sections - NO NUMBERS */
        .room-section {
          margin-bottom: 60px;
          page-break-inside: avoid;
        }
        
        .room-header {
          margin-bottom: 16px;
        }
        
        .room-title {
          font-size: 28px;
          font-weight: 700;
          color: ${COLORS.burgundy};
        }
        
        .not-inspected-badge {
          font-size: 14px;
          color: ${COLORS.mutedText};
          font-weight: 400;
          font-style: italic;
        }
        
        .gold-divider {
          height: 3px;
          background: linear-gradient(90deg, ${COLORS.gold} 0%, ${COLORS.goldLight} 40%, transparent 100%);
          margin-bottom: 30px;
          border-radius: 2px;
        }
        
        /* Checkpoints Grid */
        .checkpoints-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 28px;
        }
        
        .checkpoint-card {
          background: ${COLORS.cream};
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid ${COLORS.lightGray};
        }
        
        .photo-container {
          width: 100%;
          height: 180px;
          overflow: hidden;
          background: ${COLORS.lightGray};
          position: relative;
        }
        
        .checkpoint-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .photo-placeholder {
          width: 100%;
          height: 180px;
          background: linear-gradient(135deg, ${COLORS.lightGray} 0%, ${COLORS.cream} 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: ${COLORS.mutedText};
        }
        
        .placeholder-icon {
          font-size: 36px;
          margin-bottom: 10px;
          opacity: 0.4;
        }
        
        .placeholder-text {
          font-size: 12px;
          font-style: italic;
        }
        
        .checkpoint-details {
          padding: 20px;
        }
        
        /* Photo labels - "Photo 1", "Photo 2", etc. */
        .checkpoint-label {
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 16px;
          font-weight: 600;
          color: ${COLORS.navy};
          margin-bottom: 12px;
        }
        
        /* Flat text-based condition status - NOT a button */
        .condition-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 13px;
          font-weight: 600;
        }
        
        .condition-icon {
          font-size: 14px;
        }
        
        .condition-text {
          font-style: normal;
        }
        
        .checkpoint-notes {
          font-size: 12px;
          color: ${COLORS.charcoal};
          line-height: 1.7;
        }
        
        .checkpoint-notes p {
          margin: 0;
        }
        
        /* Watermark styles */
        ${getWatermarkStyles()}
        
        /* ==================== SIGNATURE SECTION ==================== */
        .signature-section {
          page-break-before: always;
          padding-top: 60px;
        }
        
        .signature-section-header {
          text-align: center;
          margin-bottom: 50px;
        }
        
        .signature-section-header h2 {
          font-size: 32px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          margin-bottom: 10px;
        }
        
        .signature-section-header p {
          font-size: 14px;
          color: ${COLORS.mutedText};
        }
        
        .signature-gold-divider {
          height: 4px;
          background: ${COLORS.gold};
          width: 120px;
          margin: 24px auto;
          border-radius: 2px;
        }
        
        .signatures-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 50px;
          margin-bottom: 50px;
        }
        
        .signature-box {
          background: ${COLORS.cream};
          border-radius: 12px;
          padding: 32px;
          border: 1px solid ${COLORS.lightGray};
        }
        
        .signature-box-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid ${COLORS.gold};
        }
        
        .signature-role-icon {
          width: 44px;
          height: 44px;
          background: ${COLORS.burgundy};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${COLORS.white};
          font-size: 20px;
        }
        
        .signature-role {
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          color: ${COLORS.navy};
        }
        
        .signature-image-container {
          height: 100px;
          background: ${COLORS.white};
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid ${COLORS.lightGray};
        }
        
        .signature-image {
          max-width: 100%;
          max-height: 90px;
          object-fit: contain;
        }
        
        .signature-placeholder {
          color: ${COLORS.mutedText};
          font-style: italic;
          font-size: 13px;
        }
        
        .signature-name {
          font-size: 15px;
          color: ${COLORS.navy};
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .signature-date {
          font-size: 12px;
          color: ${COLORS.mutedText};
        }
        
        /* Disclaimer */
        .disclaimer {
          background: ${COLORS.white};
          border: 2px solid ${COLORS.burgundy};
          border-radius: 12px;
          padding: 32px;
          margin-top: 50px;
        }
        
        .disclaimer-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }
        
        .disclaimer-icon {
          width: 40px;
          height: 40px;
          background: ${COLORS.burgundy};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${COLORS.white};
          font-size: 20px;
        }
        
        .disclaimer h4 {
          font-size: 18px;
          font-weight: 700;
          color: ${COLORS.burgundy};
        }
        
        .disclaimer p {
          font-size: 12px;
          color: ${COLORS.charcoal};
          line-height: 1.9;
        }
        
        /* Footer */
        .report-footer {
          margin-top: 70px;
          padding-top: 28px;
          border-top: 3px solid ${COLORS.gold};
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .report-footer-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        
        .footer-logo {
          width: 36px;
          height: 36px;
          background: ${COLORS.burgundy};
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 16px;
          color: ${COLORS.white};
          font-weight: 700;
        }
        
        .footer-brand {
          font-size: 14px;
          color: ${COLORS.burgundy};
          font-weight: 600;
        }
        
        .footer-tagline {
          font-size: 11px;
          color: ${COLORS.mutedText};
          font-style: italic;
        }
        
        .report-footer-right {
          text-align: right;
        }
        
        .report-footer-right p {
          font-size: 11px;
          color: ${COLORS.mutedText};
          margin-bottom: 3px;
        }
        
        .report-footer-right .report-id {
          font-family: monospace;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <!-- ==================== COVER PAGE ==================== -->
      <div class="cover-page">
        <div class="cover-header-bar"></div>
        
        <div class="cover-content">
          <!-- Logo Section -->
          <div class="cover-logo-section">
            ${branding?.companyLogo 
              ? `<img src="${await getBase64Image(branding.companyLogo)}" class="cover-logo-image" alt="Company Logo" style="width: 80px; height: 80px; border-radius: 16px; object-fit: contain; background: white;" />`
              : `<div class="cover-logo">PS</div>`
            }
            <div class="cover-brand">
              <div class="cover-brand-name">${branding?.companyName || 'PropertySnap'}</div>
              <div class="cover-brand-tagline">${branding?.companyName ? 'Property Inspection Services' : 'Protect your bond, every time'}</div>
            </div>
          </div>
          
          <!-- Gold Divider -->
          <div class="cover-gold-divider"></div>
          
          <!-- Document Title -->
          <div class="cover-document-title">
            <h1>Property Inspection Report</h1>
            <div class="cover-document-subtitle">Official Documentation</div>
          </div>
          
          <!-- Property Photo - ONLY if profile photo exists -->
          ${profilePhotoBase64 ? `
          <div class="cover-photo-section">
            <div class="cover-photo-frame">
              <div class="cover-photo-border"></div>
              <img src="${profilePhotoBase64}" class="cover-photo" alt="Property" />
            </div>
          </div>
          ` : ''}
          
          <!-- Property Details Card -->
          <div class="cover-property-card">
            <div class="cover-property-address">${property.address}</div>
            <div class="cover-property-meta">
              <div class="cover-meta-item">
                <span class="cover-meta-label">Property Type</span>
                <span class="cover-meta-value">${property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}</span>
              </div>
              <div class="cover-meta-item">
                <span class="cover-meta-label">Bedrooms</span>
                <span class="cover-meta-value">${property.bedrooms}</span>
              </div>
              <div class="cover-meta-item">
                <span class="cover-meta-label">Bathrooms</span>
                <span class="cover-meta-value">${property.bathrooms}</span>
              </div>
              <div class="cover-meta-item">
                <span class="cover-meta-label">Inspection Date</span>
                <span class="cover-meta-value">${formatDate(inspection.createdAt)}</span>
              </div>
              <div class="cover-meta-item">
                <span class="cover-meta-label">Inspection Type</span>
                <span class="cover-meta-value">${inspection.type === "move-in" ? "Move-In" : "Move-Out"}</span>
              </div>
            </div>
          </div>
          
          <!-- Legal Notice -->
          <div class="cover-legal-notice">
            <h4>Official Documentation</h4>
            <p>
              This property inspection report constitutes an official record of the condition of the premises 
              at the time of inspection. All photographs include verified timestamps extracted from image metadata 
              where available. This document may be used as evidence in tenancy disputes, bond claims, and 
              tribunal proceedings.
            </p>
          </div>
        </div>
      </div>
      
      <!-- ==================== INSPECTION REPORT ==================== -->
      <div class="report-page">
        <!-- Report Header -->
        <div class="report-header">
          <div class="report-header-left">
            <h1>Inspection Details</h1>
            <p>${property.address}</p>
          </div>
          <div class="report-header-right">
            <div class="date">${formatDate(inspection.createdAt)}</div>
            <div class="type">${inspection.type === "move-in" ? "Move-In Inspection" : "Move-Out Inspection"}</div>
          </div>
        </div>
        
        <!-- Room Sections -->
        ${roomSections}
        
        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-section-header">
            <h2>Signatures & Verification</h2>
            <div class="signature-gold-divider"></div>
            <p>Both parties acknowledge the accuracy of this inspection report</p>
          </div>
          
          <div class="signatures-grid">
            <!-- Landlord Signature -->
            <div class="signature-box">
              <div class="signature-box-header">
                <div class="signature-role-icon">🏠</div>
                <div class="signature-role">Landlord / Agent</div>
              </div>
              <div class="signature-image-container">
                ${landlordSigBase64 
                  ? `<img src="${landlordSigBase64}" class="signature-image" alt="Landlord Signature" />`
                  : `<span class="signature-placeholder">Awaiting signature</span>`
                }
              </div>
              ${inspection.landlordName ? `<div class="signature-name">${inspection.landlordName}</div>` : ''}
              ${inspection.landlordSignedAt ? `<div class="signature-date">Signed: ${formatDate(inspection.landlordSignedAt)} at ${formatTime(inspection.landlordSignedAt)}</div>` : ''}
            </div>
            
            <!-- Tenant Signature -->
            <div class="signature-box">
              <div class="signature-box-header">
                <div class="signature-role-icon">👤</div>
                <div class="signature-role">Tenant</div>
              </div>
              <div class="signature-image-container">
                ${tenantSigBase64 
                  ? `<img src="${tenantSigBase64}" class="signature-image" alt="Tenant Signature" />`
                  : `<span class="signature-placeholder">Awaiting signature</span>`
                }
              </div>
              ${inspection.tenantName ? `<div class="signature-name">${inspection.tenantName}</div>` : ''}
              ${inspection.tenantSignedAt ? `<div class="signature-date">Signed: ${formatDate(inspection.tenantSignedAt)} at ${formatTime(inspection.tenantSignedAt)}</div>` : ''}
            </div>
          </div>
          
          <!-- Disclaimer -->
          <div class="disclaimer">
            <div class="disclaimer-header">
              <div class="disclaimer-icon">⚖</div>
              <h4>Legal Disclaimer</h4>
            </div>
            <p>
              This inspection report has been prepared in accordance with standard property inspection practices. 
              The condition assessments and photographs contained herein represent the state of the property at the 
              time of inspection. Photo timestamps are extracted from image EXIF metadata where available; photos 
              without verified timestamps are clearly marked. Both parties should retain a copy of this report for 
              their records. This document may be submitted as evidence in bond disputes or tribunal proceedings.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="report-footer">
          <div class="report-footer-left">
            ${branding?.companyLogo 
              ? `<img src="${await getBase64Image(branding.companyLogo)}" style="width: 36px; height: 36px; border-radius: 8px; object-fit: contain; background: white;" alt="Logo" />`
              : `<div class="footer-logo">PS</div>`
            }
            <div>
              <div class="footer-brand">${branding?.companyName || 'PropertySnap'}</div>
              <div class="footer-tagline">${branding?.companyName ? 'Property Inspection Services' : 'Protect your bond, every time'}</div>
            </div>
          </div>
          <div class="report-footer-right">
            <p>Generated: ${formatDate(new Date().toISOString())}</p>
            <p class="report-id">Report ID: ${inspection.id}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate and share PDF
export async function generateInspectionPDF(
  property: Property,
  inspection: Inspection,
  branding?: PDFBrandingOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = await generatePDFHTML(property, inspection, branding);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Property Inspection Report",
        UTI: "com.adobe.pdf",
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to generate PDF" 
    };
  }
}

// Print PDF directly
export async function printInspectionPDF(
  property: Property,
  inspection: Inspection,
  branding?: PDFBrandingOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = await generatePDFHTML(property, inspection, branding);
    await Print.printAsync({ html });
    return { success: true };
  } catch (error) {
    console.error("Error printing PDF:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to print PDF" 
    };
  }
}
