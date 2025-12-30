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
  
  // Get custom logo if provided
  const customLogoBase64 = branding?.companyLogo ? await getBase64Image(branding.companyLogo) : null;

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
              
              // Get timestamp data for watermark - prefer verified photo data
              const verifiedData = checkpoint.verifiedPhotoData;
              const photoTimestamp = checkpoint.landlordPhotoTimestamp || checkpoint.tenantPhotoTimestamp || checkpoint.moveOutPhotoTimestamp;
              const timestampForWatermark = verifiedData?.captureDate || photoTimestamp?.captureDate || photoTimestamp?.uploadDate || checkpoint.timestamp;
              const isVerified = verifiedData?.verificationMethod === 'camera-capture' || photoTimestamp?.isExifAvailable || false;
              const isGpsVerified = verifiedData?.locationVerified || false;
              
              // Generate verification badge HTML
              const verificationBadgeHtml = verifiedData ? `
                <div class="verification-badge ${isGpsVerified ? 'verified' : 'partial'}">
                  <span class="badge-icon">${isGpsVerified ? '✓' : '⚠'}</span>
                  <span class="badge-text">${isGpsVerified ? 'Verified Capture + GPS' : 'Verified Capture'}</span>
                </div>
              ` : (isVerified ? `
                <div class="verification-badge partial">
                  <span class="badge-icon">✓</span>
                  <span class="badge-text">EXIF Verified</span>
                </div>
              ` : `
                <div class="verification-badge unverified">
                  <span class="badge-icon">⚠</span>
                  <span class="badge-text">Unverified</span>
                </div>
              `);
              
              return `
            <div class="checkpoint-card">
              ${hasPhoto
                ? `<div class="photo-container photo-with-watermark">
                    <img src="${checkpoint.photoBase64}" alt="Photo ${photoIndex + 1}" class="checkpoint-photo" />
                    ${timestampForWatermark ? generateWatermarkOverlay({
                      address: property.address,
                      timestamp: timestampForWatermark,
                      isVerified: isVerified,
                    }) : ''}
                  </div>`
                : `<div class="photo-placeholder">
                    <div class="placeholder-icon">📷</div>
                    <span class="placeholder-text">No photo provided</span>
                  </div>`
              }
              <div class="checkpoint-details">
                <h3 class="checkpoint-label">Photo ${photoIndex + 1}</h3>
                ${hasPhoto ? verificationBadgeHtml : ''}
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

  // Determine company name for display
  const displayCompanyName = branding?.companyName || 'PropertySnap';

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
          margin: 25mm 30mm;
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
          background: ${COLORS.cream};
          padding: 50px 60px;
          min-height: 100%;
        }
        
        .cover-header-bar {
          background: ${COLORS.burgundy};
          height: 8px;
          width: 100%;
          margin-bottom: 40px;
          border-radius: 4px;
        }
        
        .cover-logo-section {
          display: flex;
          align-items: center;
          margin-bottom: 40px;
        }
        
        .cover-logo {
          width: 70px;
          height: 70px;
          background: ${COLORS.burgundy};
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 32px;
          color: ${COLORS.white};
          font-weight: 700;
          margin-right: 20px;
          box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
        }
        
        .cover-logo-image {
          width: 70px;
          height: 70px;
          border-radius: 14px;
          object-fit: contain;
          background: white;
          margin-right: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .cover-brand-name {
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 28px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          letter-spacing: -0.5px;
        }
        
        .cover-gold-divider {
          height: 3px;
          background: linear-gradient(90deg, ${COLORS.gold} 0%, ${COLORS.goldLight} 50%, ${COLORS.gold} 100%);
          margin: 35px 0;
          border-radius: 2px;
        }
        
        .cover-document-title {
          text-align: center;
          margin: 35px 0 40px 0;
        }
        
        .cover-document-title h1 {
          font-size: 42px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          letter-spacing: -1px;
          margin-bottom: 10px;
        }
        
        .cover-document-subtitle {
          font-size: 14px;
          color: ${COLORS.navy};
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 3px;
        }
        
        .cover-photo-section {
          display: flex;
          justify-content: center;
          margin: 30px 0;
        }
        
        .cover-photo-frame {
          position: relative;
          max-width: 400px;
          width: 100%;
        }
        
        .cover-photo-border {
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          border: 3px solid ${COLORS.gold};
          border-radius: 12px;
          pointer-events: none;
        }
        
        .cover-photo {
          width: 100%;
          height: 250px;
          object-fit: cover;
          border-radius: 8px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }
        
        .cover-property-card {
          background: ${COLORS.white};
          border-radius: 12px;
          padding: 30px 36px;
          margin-top: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border-left: 5px solid ${COLORS.burgundy};
        }
        
        .cover-property-address {
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 24px;
          font-weight: 600;
          color: ${COLORS.navy};
          margin-bottom: 18px;
          line-height: 1.3;
        }
        
        .cover-property-meta {
          display: flex;
          gap: 30px;
          flex-wrap: wrap;
        }
        
        .cover-meta-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        
        .cover-meta-label {
          font-size: 9px;
          color: ${COLORS.mutedText};
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        
        .cover-meta-value {
          font-size: 14px;
          color: ${COLORS.navy};
          font-weight: 600;
        }
        
        .cover-legal-notice {
          background: ${COLORS.white};
          border: 2px solid ${COLORS.burgundy};
          border-radius: 8px;
          padding: 20px 24px;
          margin-top: 30px;
        }
        
        .cover-legal-notice h4 {
          font-size: 12px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .cover-legal-notice p {
          font-size: 10px;
          color: ${COLORS.charcoal};
          line-height: 1.7;
        }
        
        /* ==================== REPORT PAGES ==================== */
        .report-page {
          background: ${COLORS.white};
        }
        
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 24px;
          border-bottom: 3px solid ${COLORS.burgundy};
          margin-bottom: 30px;
        }
        
        .report-header-left h1 {
          font-size: 28px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          margin-bottom: 6px;
        }
        
        .report-header-left p {
          font-size: 13px;
          color: ${COLORS.charcoal};
        }
        
        .report-header-right {
          text-align: right;
        }
        
        .report-header-right .date {
          font-size: 14px;
          font-weight: 600;
          color: ${COLORS.navy};
        }
        
        .report-header-right .type {
          font-size: 12px;
          color: ${COLORS.mutedText};
          margin-top: 4px;
        }
        
        /* Room Sections */
        .room-section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        
        .room-header {
          margin-bottom: 12px;
        }
        
        .room-title {
          font-size: 22px;
          font-weight: 600;
          color: ${COLORS.burgundy};
        }
        
        .not-inspected-badge {
          font-size: 12px;
          font-weight: 400;
          color: ${COLORS.mutedText};
          font-style: italic;
        }
        
        .gold-divider {
          height: 2px;
          background: ${COLORS.gold};
          margin-bottom: 20px;
          border-radius: 1px;
        }
        
        .checkpoints-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        
        .checkpoint-card {
          background: ${COLORS.cream};
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid ${COLORS.lightGray};
        }
        
        .photo-container {
          position: relative;
          width: 100%;
          height: 280px;
          overflow: hidden;
        }
        
        .checkpoint-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .photo-placeholder {
          width: 100%;
          height: 280px;
          background: ${COLORS.lightGray};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .placeholder-icon {
          font-size: 28px;
          opacity: 0.5;
        }
        
        .placeholder-text {
          font-size: 11px;
          color: ${COLORS.mutedText};
        }
        
        .checkpoint-details {
          padding: 14px 16px;
        }
        
        .checkpoint-label {
          font-size: 14px;
          font-weight: 600;
          color: ${COLORS.navy};
          margin-bottom: 6px;
        }
        
        .verification-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .verification-badge.verified {
          background: ${COLORS.forestGreen};
          color: ${COLORS.white};
        }
        
        .verification-badge.partial {
          background: ${COLORS.navy};
          color: ${COLORS.gold};
        }
        
        .verification-badge.unverified {
          background: ${COLORS.burgundy};
          color: ${COLORS.white};
        }
        
        .badge-icon {
          font-size: 11px;
        }
        
        .condition-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 8px;
        }
        
        .condition-icon {
          font-size: 14px;
        }
        
        .checkpoint-notes {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid ${COLORS.lightGray};
        }
        
        .checkpoint-notes p {
          font-size: 11px;
          color: ${COLORS.charcoal};
          line-height: 1.6;
        }
        
        /* Watermark styles */
        ${getWatermarkStyles()}
        
        /* Signature Section */
        .signature-section {
          margin-top: 50px;
          page-break-inside: avoid;
        }
        
        .signature-section-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .signature-section-header h2 {
          font-size: 24px;
          font-weight: 600;
          color: ${COLORS.burgundy};
          margin-bottom: 10px;
        }
        
        .signature-gold-divider {
          height: 2px;
          background: ${COLORS.gold};
          width: 150px;
          margin: 0 auto 12px auto;
          border-radius: 1px;
        }
        
        .signature-section-header p {
          font-size: 12px;
          color: ${COLORS.mutedText};
        }
        
        .signatures-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 30px;
        }
        
        .signature-box {
          background: ${COLORS.cream};
          border-radius: 12px;
          padding: 24px;
          border: 1px solid ${COLORS.lightGray};
        }
        
        .signature-box-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        
        .signature-role-icon {
          font-size: 20px;
        }
        
        .signature-role {
          font-size: 14px;
          font-weight: 600;
          color: ${COLORS.navy};
        }
        
        .signature-image-container {
          background: ${COLORS.white};
          border: 1px solid ${COLORS.lightGray};
          border-radius: 8px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }
        
        .signature-image {
          max-width: 90%;
          max-height: 80px;
          object-fit: contain;
        }
        
        .signature-placeholder {
          color: ${COLORS.mutedText};
          font-style: italic;
          font-size: 12px;
        }
        
        .signature-name {
          font-size: 14px;
          color: ${COLORS.navy};
          font-weight: 600;
          margin-bottom: 6px;
        }
        
        .signature-date {
          font-size: 11px;
          color: ${COLORS.mutedText};
        }
        
        /* Disclaimer */
        .disclaimer {
          background: ${COLORS.white};
          border: 2px solid ${COLORS.burgundy};
          border-radius: 10px;
          padding: 24px 28px;
          margin-top: 40px;
        }
        
        .disclaimer-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        
        .disclaimer-icon {
          width: 36px;
          height: 36px;
          background: ${COLORS.burgundy};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${COLORS.white};
          font-size: 18px;
        }
        
        .disclaimer h4 {
          font-size: 16px;
          font-weight: 700;
          color: ${COLORS.burgundy};
        }
        
        .disclaimer p {
          font-size: 11px;
          color: ${COLORS.charcoal};
          line-height: 1.8;
        }
        
        /* Footer - Minimal */
        .report-footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid ${COLORS.lightGray};
          text-align: center;
        }
        
        .footer-text {
          font-size: 10px;
          color: ${COLORS.mutedText};
        }
        
        .footer-report-id {
          font-family: monospace;
          font-size: 9px;
          color: ${COLORS.mutedText};
          margin-top: 4px;
        }
      </style>
    </head>
    <body>
      <!-- ==================== COVER PAGE ==================== -->
      <div class="cover-page">
        <div class="cover-header-bar"></div>
        
        <!-- Logo Section -->
        <div class="cover-logo-section">
          ${customLogoBase64 
            ? `<img src="${customLogoBase64}" class="cover-logo-image" alt="Company Logo" />`
            : `<div class="cover-logo">PS</div>`
          }
          <div class="cover-brand-name">${displayCompanyName}</div>
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
        
        <!-- Footer - Minimal -->
        <div class="report-footer">
          <div class="footer-text">Captured using PropertySnap</div>
          <div class="footer-report-id">Report ID: ${inspection.id} • Generated: ${formatDate(new Date().toISOString())}</div>
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
        dialogTitle: "Share Inspection Report",
        UTI: "com.adobe.pdf",
      });
      return { success: true };
    } else {
      return { success: false, error: "Sharing is not available on this device" };
    }
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
    
    const result = await Print.printAsync({
      html,
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error printing PDF:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to print PDF" 
    };
  }
}


// Generate cover page HTML for inspection history
function generateCoverPageHTML(
  property: Property, 
  inspections: Inspection[],
  customLogoBase64: string | null,
  companyName: string | null
): string {
  const completedInspections = inspections.filter(i => i.status === "completed");
  const pendingInspections = inspections.filter(i => i.status === "pending");
  
  const moveInCount = inspections.filter(i => i.type === "move-in").length;
  const moveOutCount = inspections.filter(i => i.type === "move-out").length;
  const routineCount = inspections.filter(i => i.type === "routine").length;
  
  const firstInspection = inspections.length > 0 
    ? inspections.reduce((oldest, i) => new Date(i.createdAt) < new Date(oldest.createdAt) ? i : oldest)
    : null;
  const lastInspection = inspections.length > 0
    ? inspections.reduce((newest, i) => new Date(i.createdAt) > new Date(newest.createdAt) ? i : newest)
    : null;

  return `
    <div class="cover-page">
      <div class="cover-header">
        ${customLogoBase64 
          ? `<img src="${customLogoBase64}" class="cover-logo" alt="Company Logo" />`
          : `<div class="cover-logo-placeholder">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <rect width="60" height="60" rx="12" fill="${COLORS.burgundy}"/>
                <path d="M30 15L45 28V45H35V35H25V45H15V28L30 15Z" fill="${COLORS.gold}"/>
              </svg>
            </div>`
        }
        <div class="cover-title-section">
          <h1 class="cover-title">Property Inspection History</h1>
          <p class="cover-subtitle">${companyName || "PropertySnap"}</p>
        </div>
      </div>
      
      <div class="cover-property-section">
        <h2 class="cover-section-title">Property Details</h2>
        <div class="cover-property-card">
          <p class="cover-address">${property.address}</p>
          <p class="cover-property-type">${property.propertyType} • ${property.bedrooms} Bedrooms • ${property.bathrooms} Bathrooms</p>
          ${property.tenantName ? `<p class="cover-tenant">Current Tenant: ${property.tenantName}</p>` : ""}
        </div>
      </div>
      
      <div class="cover-summary-section">
        <h2 class="cover-section-title">Inspection Summary</h2>
        <div class="cover-stats-grid">
          <div class="cover-stat-card">
            <span class="cover-stat-number">${inspections.length}</span>
            <span class="cover-stat-label">Total Inspections</span>
          </div>
          <div class="cover-stat-card">
            <span class="cover-stat-number">${completedInspections.length}</span>
            <span class="cover-stat-label">Completed</span>
          </div>
          <div class="cover-stat-card">
            <span class="cover-stat-number">${pendingInspections.length}</span>
            <span class="cover-stat-label">Pending</span>
          </div>
        </div>
        
        <div class="cover-type-breakdown">
          <h3 class="cover-breakdown-title">By Type</h3>
          <div class="cover-type-row">
            <span class="cover-type-label">Move-In Inspections:</span>
            <span class="cover-type-value">${moveInCount}</span>
          </div>
          <div class="cover-type-row">
            <span class="cover-type-label">Move-Out Inspections:</span>
            <span class="cover-type-value">${moveOutCount}</span>
          </div>
          <div class="cover-type-row">
            <span class="cover-type-label">Routine Inspections:</span>
            <span class="cover-type-value">${routineCount}</span>
          </div>
        </div>
        
        ${firstInspection && lastInspection ? `
          <div class="cover-date-range">
            <p class="cover-date-text">
              <strong>Date Range:</strong> ${formatDate(firstInspection.createdAt)} to ${formatDate(lastInspection.createdAt)}
            </p>
          </div>
        ` : ""}
      </div>
      
      <div class="cover-toc-section">
        <h2 class="cover-section-title">Table of Contents</h2>
        <div class="cover-toc-list">
          ${inspections.map((inspection, index) => {
            const typeLabel = inspection.type === "move-in" ? "Move-In" 
              : inspection.type === "move-out" ? "Move-Out" 
              : "Routine";
            const statusLabel = inspection.status === "completed" ? "✓" : "○";
            return `
              <div class="cover-toc-item">
                <span class="cover-toc-number">${index + 1}.</span>
                <span class="cover-toc-type">${typeLabel} Inspection</span>
                <span class="cover-toc-date">${formatDate(inspection.createdAt)}</span>
                <span class="cover-toc-status">${statusLabel}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
      
      <div class="cover-footer">
        <p class="cover-generated">Generated on ${formatDate(new Date().toISOString())} at ${formatTime(new Date().toISOString())}</p>
        <p class="cover-confidential">CONFIDENTIAL - Property Inspection Records</p>
      </div>
    </div>
  `;
}

// Generate CSS for cover page
function getCoverPageStyles(): string {
  return `
    .cover-page {
      page-break-after: always;
      padding: 40px;
      background: linear-gradient(180deg, ${COLORS.cream} 0%, ${COLORS.white} 100%);
      min-height: 100vh;
      box-sizing: border-box;
    }
    
    .cover-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${COLORS.burgundy};
    }
    
    .cover-logo {
      width: 80px;
      height: 80px;
      object-fit: contain;
    }
    
    .cover-logo-placeholder {
      width: 80px;
      height: 80px;
    }
    
    .cover-title-section {
      flex: 1;
    }
    
    .cover-title {
      font-size: 32px;
      font-weight: 700;
      color: ${COLORS.burgundy};
      margin: 0 0 4px 0;
      font-family: 'Georgia', serif;
    }
    
    .cover-subtitle {
      font-size: 16px;
      color: ${COLORS.mutedText};
      margin: 0;
    }
    
    .cover-section-title {
      font-size: 18px;
      font-weight: 600;
      color: ${COLORS.navy};
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid ${COLORS.gold};
    }
    
    .cover-property-section {
      margin-bottom: 30px;
    }
    
    .cover-property-card {
      background: ${COLORS.white};
      border: 1px solid ${COLORS.lightGray};
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid ${COLORS.burgundy};
    }
    
    .cover-address {
      font-size: 20px;
      font-weight: 600;
      color: ${COLORS.charcoal};
      margin: 0 0 8px 0;
    }
    
    .cover-property-type {
      font-size: 14px;
      color: ${COLORS.mutedText};
      margin: 0 0 4px 0;
    }
    
    .cover-tenant {
      font-size: 14px;
      color: ${COLORS.navy};
      margin: 8px 0 0 0;
    }
    
    .cover-summary-section {
      margin-bottom: 30px;
    }
    
    .cover-stats-grid {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }
    
    .cover-stat-card {
      flex: 1;
      background: ${COLORS.white};
      border: 1px solid ${COLORS.lightGray};
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    
    .cover-stat-number {
      display: block;
      font-size: 32px;
      font-weight: 700;
      color: ${COLORS.burgundy};
    }
    
    .cover-stat-label {
      display: block;
      font-size: 12px;
      color: ${COLORS.mutedText};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .cover-type-breakdown {
      background: ${COLORS.white};
      border: 1px solid ${COLORS.lightGray};
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    
    .cover-breakdown-title {
      font-size: 14px;
      font-weight: 600;
      color: ${COLORS.navy};
      margin: 0 0 12px 0;
    }
    
    .cover-type-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid ${COLORS.lightGray};
    }
    
    .cover-type-row:last-child {
      border-bottom: none;
    }
    
    .cover-type-label {
      font-size: 14px;
      color: ${COLORS.charcoal};
    }
    
    .cover-type-value {
      font-size: 14px;
      font-weight: 600;
      color: ${COLORS.burgundy};
    }
    
    .cover-date-range {
      background: ${COLORS.cream};
      border-radius: 8px;
      padding: 12px 16px;
    }
    
    .cover-date-text {
      font-size: 14px;
      color: ${COLORS.charcoal};
      margin: 0;
    }
    
    .cover-toc-section {
      margin-bottom: 30px;
    }
    
    .cover-toc-list {
      background: ${COLORS.white};
      border: 1px solid ${COLORS.lightGray};
      border-radius: 8px;
      overflow: hidden;
    }
    
    .cover-toc-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid ${COLORS.lightGray};
      gap: 12px;
    }
    
    .cover-toc-item:last-child {
      border-bottom: none;
    }
    
    .cover-toc-number {
      font-size: 14px;
      font-weight: 600;
      color: ${COLORS.burgundy};
      width: 24px;
    }
    
    .cover-toc-type {
      font-size: 14px;
      color: ${COLORS.charcoal};
      flex: 1;
    }
    
    .cover-toc-date {
      font-size: 13px;
      color: ${COLORS.mutedText};
    }
    
    .cover-toc-status {
      font-size: 16px;
      color: ${COLORS.forestGreen};
    }
    
    .cover-footer {
      margin-top: auto;
      padding-top: 20px;
      border-top: 1px solid ${COLORS.lightGray};
      text-align: center;
    }
    
    .cover-generated {
      font-size: 12px;
      color: ${COLORS.mutedText};
      margin: 0 0 4px 0;
    }
    
    .cover-confidential {
      font-size: 11px;
      color: ${COLORS.burgundy};
      font-weight: 600;
      letter-spacing: 1px;
      margin: 0;
    }
  `;
}

// Generate divider page between inspections
function generateDividerHTML(inspection: Inspection, index: number): string {
  const typeLabel = inspection.type === "move-in" ? "Move-In" 
    : inspection.type === "move-out" ? "Move-Out" 
    : "Routine";
  const statusLabel = inspection.status === "completed" ? "Completed" : "Pending";
  const statusColor = inspection.status === "completed" ? COLORS.forestGreen : COLORS.amber;
  
  return `
    <div class="divider-page">
      <div class="divider-content">
        <div class="divider-number">Inspection ${index + 1}</div>
        <h2 class="divider-type">${typeLabel} Inspection</h2>
        <p class="divider-date">${formatDate(inspection.createdAt)}</p>
        <div class="divider-status" style="background: ${statusColor}20; color: ${statusColor}; border-color: ${statusColor};">
          ${statusLabel}
        </div>
      </div>
    </div>
  `;
}

// Generate CSS for divider pages
function getDividerStyles(): string {
  return `
    .divider-page {
      page-break-after: always;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: ${COLORS.cream};
    }
    
    .divider-content {
      text-align: center;
      padding: 40px;
    }
    
    .divider-number {
      font-size: 14px;
      font-weight: 600;
      color: ${COLORS.mutedText};
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 16px;
    }
    
    .divider-type {
      font-size: 36px;
      font-weight: 700;
      color: ${COLORS.burgundy};
      margin: 0 0 8px 0;
      font-family: 'Georgia', serif;
    }
    
    .divider-date {
      font-size: 18px;
      color: ${COLORS.charcoal};
      margin: 0 0 24px 0;
    }
    
    .divider-status {
      display: inline-block;
      padding: 8px 24px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      border: 2px solid;
    }
  `;
}

// Generate combined HTML for all inspections
async function generateCombinedPDFHTML(
  property: Property, 
  inspections: Inspection[],
  branding?: PDFBrandingOptions
): Promise<string> {
  // Sort inspections by date (oldest first)
  const sortedInspections = [...inspections].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // Get custom logo if provided
  const customLogoBase64 = branding?.companyLogo ? await getBase64Image(branding.companyLogo) : null;
  const companyName = branding?.companyName || null;
  
  // Generate cover page
  const coverPageHTML = generateCoverPageHTML(property, sortedInspections, customLogoBase64, companyName);
  
  // Generate each inspection's content
  const inspectionSections: string[] = [];
  
  for (let i = 0; i < sortedInspections.length; i++) {
    const inspection = sortedInspections[i];
    
    // Add divider page
    inspectionSections.push(generateDividerHTML(inspection, i));
    
    // Generate the inspection content (reuse existing function logic)
    const inspectionHTML = await generatePDFHTML(property, inspection, branding);
    
    // Extract just the body content (remove html/head tags)
    const bodyMatch = inspectionHTML.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      inspectionSections.push(`<div class="inspection-section">${bodyMatch[1]}</div>`);
    }
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.5;
          color: ${COLORS.charcoal};
          background: ${COLORS.white};
        }
        
        ${getCoverPageStyles()}
        ${getDividerStyles()}
        
        .inspection-section {
          page-break-before: always;
        }
        
        @media print {
          .cover-page, .divider-page {
            page-break-after: always;
          }
          .inspection-section {
            page-break-before: always;
          }
        }
      </style>
    </head>
    <body>
      ${coverPageHTML}
      ${inspectionSections.join("")}
    </body>
    </html>
  `;
}

// Export all inspections for a property as combined PDF
export async function generateInspectionHistoryPDF(
  property: Property,
  inspections: Inspection[],
  branding?: PDFBrandingOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    if (inspections.length === 0) {
      return { success: false, error: "No inspections to export" };
    }
    
    const html = await generateCombinedPDFHTML(property, inspections, branding);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Generate filename with property address and date
    const sanitizedAddress = property.address.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${sanitizedAddress}_Inspection_History_${dateStr}.pdf`;
    
    // Move to a location with proper filename
    const newUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });
    
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      await Sharing.shareAsync(newUri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Inspection History",
        UTI: "com.adobe.pdf",
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error generating inspection history PDF:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to generate PDF" 
    };
  }
}
