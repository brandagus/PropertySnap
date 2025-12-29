import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Property, Inspection, Checkpoint } from "./app-context";

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

// Get condition badge color - updated for new Pass/Fail system
function getConditionColor(condition: string | null): string {
  switch (condition) {
    case "pass":
      return "#2D5C3F";
    case "pass-attention":
      return "#D97706";
    case "fail":
      return "#991B1B";
    case "excellent":
    case "good":
      return "#2D5C3F";
    case "fair":
      return "#D97706";
    case "poor":
    case "damaged":
      return "#991B1B";
    default:
      return "#6B6B6B";
  }
}

// Get condition background color
function getConditionBgColor(condition: string | null): string {
  switch (condition) {
    case "pass":
      return "#E8F5E9";
    case "pass-attention":
      return "#FFF3E0";
    case "fail":
      return "#FFEBEE";
    case "excellent":
    case "good":
      return "#E8F5E9";
    case "fair":
      return "#FFF3E0";
    case "poor":
    case "damaged":
      return "#FFEBEE";
    default:
      return "#F5F5F5";
  }
}

// Format condition for display
function formatCondition(condition: string | null): string {
  if (!condition) return "";
  switch (condition) {
    case "pass":
      return "Pass";
    case "pass-attention":
      return "Pass - Needs Attention";
    case "fail":
      return "Fail - Action Required";
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "fair":
      return "Fair";
    case "poor":
      return "Poor";
    case "damaged":
      return "Damaged";
    default:
      return condition.charAt(0).toUpperCase() + condition.slice(1);
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
async function generatePDFHTML(property: Property, inspection: Inspection): Promise<string> {
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

  // Get property photo (first photo from first checkpoint, or null)
  let propertyPhotoBase64: string | null = null;
  for (const checkpoints of Object.values(processedCheckpoints)) {
    for (const cp of checkpoints) {
      if (cp.photoBase64) {
        propertyPhotoBase64 = cp.photoBase64;
        break;
      }
    }
    if (propertyPhotoBase64) break;
  }

  // Generate room sections HTML
  const roomSections = Object.entries(processedCheckpoints)
    .map(([room, checkpoints], roomIndex) => {
      const roomHasAnyPhoto = checkpoints.some(cp => !!cp.photoBase64);
      const roomHasAnyCondition = checkpoints.some(cp => 
        cp.landlordCondition || cp.tenantCondition || cp.moveOutCondition
      );
      const roomNotInspected = !roomHasAnyPhoto && !roomHasAnyCondition;
      
      return `
      <div class="room-section">
        <div class="room-header">
          <div class="room-number">${String(roomIndex + 1).padStart(2, '0')}</div>
          <h2 class="room-title">${room}${roomNotInspected ? ' <span class="not-inspected-badge">(Not Inspected)</span>' : ''}</h2>
        </div>
        <div class="gold-divider"></div>
        <div class="checkpoints-grid">
          ${checkpoints
            .map((checkpoint) => {
              const condition = checkpoint.landlordCondition || checkpoint.tenantCondition || checkpoint.moveOutCondition;
              const hasPhoto = !!checkpoint.photoBase64;
              const hasNotes = !!checkpoint.notes && checkpoint.notes.trim().length > 0;
              const conditionText = formatCondition(condition);
              
              return `
            <div class="checkpoint-card">
              ${hasPhoto
                ? `<div class="photo-container">
                    <img src="${checkpoint.photoBase64}" alt="${checkpoint.title}" class="checkpoint-photo" />
                  </div>`
                : `<div class="photo-placeholder">
                    <div class="placeholder-icon">📷</div>
                    <span class="placeholder-text">No photo provided</span>
                  </div>`
              }
              <div class="checkpoint-details">
                <h3 class="checkpoint-title">${checkpoint.title}</h3>
                ${conditionText ? `<div class="condition-badge" style="background-color: ${getConditionBgColor(condition)}; color: ${getConditionColor(condition)}; border: 1px solid ${getConditionColor(condition)};">
                  ${conditionText}
                </div>` : ''}
                <div class="checkpoint-notes">
                  ${hasNotes ? `<p>${checkpoint.notes}</p>` : '<p class="no-info">No additional notes</p>'}
                </div>
                ${checkpoint.timestamp ? `<p class="checkpoint-timestamp">Inspected: ${formatDate(checkpoint.timestamp)} at ${formatTime(checkpoint.timestamp)}</p>` : ''}
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
          margin: 0;
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
        
        /* Burgundy header bar */
        .cover-header-bar {
          background: ${COLORS.burgundy};
          height: 12px;
          width: 100%;
        }
        
        /* Main cover content */
        .cover-content {
          padding: 50px 60px;
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 12px);
        }
        
        /* Logo section */
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
        
        .cover-brand {
          display: flex;
          flex-direction: column;
        }
        
        .cover-brand-name {
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 28px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          letter-spacing: -0.5px;
        }
        
        .cover-brand-tagline {
          font-size: 12px;
          color: ${COLORS.mutedText};
          font-style: italic;
          margin-top: 2px;
        }
        
        /* Gold divider */
        .cover-gold-divider {
          height: 3px;
          background: linear-gradient(90deg, ${COLORS.gold} 0%, ${COLORS.goldLight} 50%, ${COLORS.gold} 100%);
          margin: 30px 0;
          border-radius: 2px;
        }
        
        /* Document title */
        .cover-document-title {
          text-align: center;
          margin: 30px 0 40px 0;
        }
        
        .cover-document-title h1 {
          font-size: 42px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          letter-spacing: -1px;
          margin-bottom: 8px;
        }
        
        .cover-document-subtitle {
          font-size: 16px;
          color: ${COLORS.navy};
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 3px;
        }
        
        /* Property photo section */
        .cover-photo-section {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 20px 0;
        }
        
        .cover-photo-frame {
          position: relative;
          max-width: 420px;
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
          height: 280px;
          object-fit: cover;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }
        
        .cover-photo-placeholder {
          width: 100%;
          height: 280px;
          background: linear-gradient(135deg, ${COLORS.lightGray} 0%, ${COLORS.cream} 100%);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: ${COLORS.mutedText};
          border: 2px dashed ${COLORS.lightGray};
        }
        
        .cover-photo-placeholder-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }
        
        /* Property details card */
        .cover-property-card {
          background: ${COLORS.white};
          border-radius: 12px;
          padding: 32px 40px;
          margin-top: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border-left: 5px solid ${COLORS.burgundy};
        }
        
        .cover-property-address {
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 26px;
          font-weight: 600;
          color: ${COLORS.navy};
          margin-bottom: 16px;
          line-height: 1.3;
        }
        
        .cover-property-meta {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        
        .cover-property-meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .cover-property-meta-label {
          font-size: 11px;
          color: ${COLORS.mutedText};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .cover-property-meta-value {
          font-size: 14px;
          font-weight: 600;
          color: ${COLORS.navy};
        }
        
        .cover-inspection-badge {
          display: inline-block;
          background: ${COLORS.burgundy};
          color: ${COLORS.white};
          padding: 10px 24px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        
        /* Cover footer */
        .cover-footer {
          margin-top: auto;
          padding-top: 30px;
          border-top: 1px solid ${COLORS.lightGray};
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .cover-footer-date {
          font-size: 12px;
          color: ${COLORS.mutedText};
        }
        
        .cover-footer-date strong {
          color: ${COLORS.navy};
          font-weight: 600;
        }
        
        .cover-footer-id {
          font-size: 11px;
          color: ${COLORS.mutedText};
          font-family: monospace;
        }
        
        /* ==================== REPORT CONTENT ==================== */
        .report-content {
          padding: 50px 55px;
          background: ${COLORS.white};
        }
        
        /* Report header */
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 24px;
          border-bottom: 3px solid ${COLORS.burgundy};
          margin-bottom: 40px;
        }
        
        .report-header-left h1 {
          font-size: 32px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          margin-bottom: 4px;
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
          font-size: 14px;
          font-weight: 600;
          color: ${COLORS.navy};
        }
        
        .report-header-right .type {
          font-size: 12px;
          color: ${COLORS.gold};
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 4px;
        }
        
        /* Property Summary Section */
        .property-summary {
          background: ${COLORS.cream};
          border-radius: 12px;
          padding: 32px;
          margin-bottom: 40px;
          border: 1px solid ${COLORS.lightGray};
        }
        
        .property-summary h2 {
          font-size: 22px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid ${COLORS.gold};
        }
        
        .property-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        
        .property-detail {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .property-detail-label {
          font-size: 10px;
          color: ${COLORS.mutedText};
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 600;
        }
        
        .property-detail-value {
          font-size: 14px;
          color: ${COLORS.navy};
          font-weight: 500;
        }
        
        /* Room Sections */
        .room-section {
          margin-bottom: 50px;
          page-break-inside: avoid;
        }
        
        .room-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }
        
        .room-number {
          width: 40px;
          height: 40px;
          background: ${COLORS.burgundy};
          color: ${COLORS.white};
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 18px;
          font-weight: 700;
        }
        
        .room-title {
          font-size: 24px;
          font-weight: 700;
          color: ${COLORS.navy};
          flex: 1;
        }
        
        .not-inspected-badge {
          font-size: 12px;
          color: ${COLORS.mutedText};
          font-weight: 400;
          font-style: italic;
        }
        
        .gold-divider {
          height: 2px;
          background: linear-gradient(90deg, ${COLORS.gold} 0%, transparent 100%);
          margin-bottom: 24px;
          border-radius: 1px;
        }
        
        /* Checkpoints Grid */
        .checkpoints-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        
        .checkpoint-card {
          background: ${COLORS.cream};
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid ${COLORS.lightGray};
        }
        
        .photo-container {
          width: 100%;
          height: 160px;
          overflow: hidden;
          background: ${COLORS.lightGray};
        }
        
        .checkpoint-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .photo-placeholder {
          width: 100%;
          height: 160px;
          background: linear-gradient(135deg, ${COLORS.lightGray} 0%, ${COLORS.cream} 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: ${COLORS.mutedText};
        }
        
        .placeholder-icon {
          font-size: 32px;
          margin-bottom: 8px;
          opacity: 0.4;
        }
        
        .placeholder-text {
          font-size: 11px;
          font-style: italic;
        }
        
        .checkpoint-details {
          padding: 16px;
        }
        
        .checkpoint-title {
          font-size: 14px;
          font-weight: 600;
          color: ${COLORS.navy};
          margin-bottom: 10px;
        }
        
        .condition-badge {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .checkpoint-notes {
          font-size: 11px;
          color: ${COLORS.charcoal};
          line-height: 1.6;
          margin-bottom: 8px;
        }
        
        .checkpoint-notes .no-info {
          color: ${COLORS.mutedText};
          font-style: italic;
        }
        
        .checkpoint-timestamp {
          font-size: 10px;
          color: ${COLORS.mutedText};
        }
        
        /* Signature Section */
        .signature-section {
          page-break-before: always;
          padding-top: 50px;
        }
        
        .signature-section-header {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .signature-section-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: ${COLORS.burgundy};
          margin-bottom: 8px;
        }
        
        .signature-section-header p {
          font-size: 13px;
          color: ${COLORS.mutedText};
        }
        
        .signature-gold-divider {
          height: 3px;
          background: ${COLORS.gold};
          width: 100px;
          margin: 20px auto;
          border-radius: 2px;
        }
        
        .signatures-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 40px;
          margin-bottom: 40px;
        }
        
        .signature-box {
          background: ${COLORS.cream};
          border: 2px solid ${COLORS.lightGray};
          border-radius: 12px;
          padding: 28px;
          text-align: center;
        }
        
        .signature-box h3 {
          font-size: 14px;
          font-weight: 600;
          color: ${COLORS.burgundy};
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .signature-line {
          border-bottom: 2px solid ${COLORS.navy};
          height: 80px;
          margin-bottom: 16px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 8px;
          background: ${COLORS.white};
          border-radius: 4px 4px 0 0;
        }
        
        .signature-image {
          max-height: 65px;
          max-width: 90%;
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
          padding: 28px;
          margin-top: 40px;
        }
        
        .disclaimer-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
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
        
        /* Footer */
        .report-footer {
          margin-top: 60px;
          padding-top: 24px;
          border-top: 2px solid ${COLORS.gold};
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .report-footer-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .footer-logo {
          width: 32px;
          height: 32px;
          background: ${COLORS.burgundy};
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 14px;
          color: ${COLORS.white};
          font-weight: 700;
        }
        
        .footer-brand {
          font-size: 12px;
          color: ${COLORS.burgundy};
          font-weight: 600;
        }
        
        .footer-tagline {
          font-size: 10px;
          color: ${COLORS.mutedText};
          font-style: italic;
        }
        
        .report-footer-right {
          text-align: right;
        }
        
        .report-footer-right p {
          font-size: 10px;
          color: ${COLORS.mutedText};
          margin-bottom: 2px;
        }
        
        .report-footer-right .report-id {
          font-family: monospace;
          font-size: 9px;
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
            <div class="cover-logo">PS</div>
            <div class="cover-brand">
              <div class="cover-brand-name">PropertySnap</div>
              <div class="cover-brand-tagline">Protect your bond, every time</div>
            </div>
          </div>
          
          <!-- Gold Divider -->
          <div class="cover-gold-divider"></div>
          
          <!-- Document Title -->
          <div class="cover-document-title">
            <h1>Property Inspection Report</h1>
            <div class="cover-document-subtitle">Official Documentation</div>
          </div>
          
          <!-- Property Photo -->
          <div class="cover-photo-section">
            <div class="cover-photo-frame">
              <div class="cover-photo-border"></div>
              ${propertyPhotoBase64 
                ? `<img src="${propertyPhotoBase64}" class="cover-photo" alt="Property" />`
                : `<div class="cover-photo-placeholder">
                    <div class="cover-photo-placeholder-icon">🏠</div>
                    <span>Property Photo</span>
                  </div>`
              }
            </div>
          </div>
          
          <!-- Property Details Card -->
          <div class="cover-property-card">
            <div class="cover-property-address">${property.address}</div>
            <div class="cover-property-meta">
              <div class="cover-property-meta-item">
                <span class="cover-property-meta-label">Type</span>
                <span class="cover-property-meta-value">${property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}</span>
              </div>
              <div class="cover-property-meta-item">
                <span class="cover-property-meta-label">Bedrooms</span>
                <span class="cover-property-meta-value">${property.bedrooms}</span>
              </div>
              <div class="cover-property-meta-item">
                <span class="cover-property-meta-label">Bathrooms</span>
                <span class="cover-property-meta-value">${property.bathrooms}</span>
              </div>
            </div>
            <div class="cover-inspection-badge">
              ${inspection.type === "move-in" ? "Move-In Inspection" : "Move-Out Inspection"}
            </div>
          </div>
          
          <!-- Footer -->
          <div class="cover-footer">
            <div class="cover-footer-date">
              <strong>Report Generated:</strong> ${formatDate(new Date().toISOString())}
            </div>
            <div class="cover-footer-id">
              ID: ${inspection.id.substring(0, 8).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
      
      <!-- ==================== REPORT CONTENT ==================== -->
      <div class="report-content">
        <!-- Report Header -->
        <div class="report-header">
          <div class="report-header-left">
            <h1>PropertySnap</h1>
            <p>Official Rental Inspection Report</p>
          </div>
          <div class="report-header-right">
            <p class="date">${formatDate(inspection.createdAt)}</p>
            <p class="type">${inspection.type === "move-in" ? "Move-In" : "Move-Out"} Inspection</p>
          </div>
        </div>
        
        <!-- Property Summary -->
        <div class="property-summary">
          <h2>Property Details</h2>
          <div class="property-details-grid">
            <div class="property-detail">
              <span class="property-detail-label">Address</span>
              <span class="property-detail-value">${property.address}</span>
            </div>
            <div class="property-detail">
              <span class="property-detail-label">Property Type</span>
              <span class="property-detail-value">${property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}</span>
            </div>
            <div class="property-detail">
              <span class="property-detail-label">Bedrooms</span>
              <span class="property-detail-value">${property.bedrooms}</span>
            </div>
            <div class="property-detail">
              <span class="property-detail-label">Bathrooms</span>
              <span class="property-detail-value">${property.bathrooms}</span>
            </div>
            ${property.tenantName ? `
            <div class="property-detail">
              <span class="property-detail-label">Tenant</span>
              <span class="property-detail-value">${property.tenantName}</span>
            </div>
            ` : ""}
            ${property.tenantEmail ? `
            <div class="property-detail">
              <span class="property-detail-label">Tenant Email</span>
              <span class="property-detail-value">${property.tenantEmail}</span>
            </div>
            ` : ""}
          </div>
        </div>
        
        <!-- Room Sections -->
        ${roomSections}
        
        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-section-header">
            <h2>Signatures & Acknowledgment</h2>
            <div class="signature-gold-divider"></div>
            <p>Both parties confirm the accuracy of this inspection report</p>
          </div>
          
          <div class="signatures-grid">
            <div class="signature-box">
              <h3>Landlord / Property Manager</h3>
              <div class="signature-line">
                ${landlordSigBase64 ? `<img src="${landlordSigBase64}" class="signature-image" alt="Landlord Signature" />` : ""}
              </div>
              <p class="signature-name">${inspection.landlordName || "___________________"}</p>
              <p class="signature-date">Date: ${inspection.landlordSignedAt ? formatDate(inspection.landlordSignedAt) : "___________________"}</p>
            </div>
            <div class="signature-box">
              <h3>Tenant</h3>
              <div class="signature-line">
                ${tenantSigBase64 ? `<img src="${tenantSigBase64}" class="signature-image" alt="Tenant Signature" />` : ""}
              </div>
              <p class="signature-name">${inspection.tenantName || "___________________"}</p>
              <p class="signature-date">Date: ${inspection.tenantSignedAt ? formatDate(inspection.tenantSignedAt) : "___________________"}</p>
            </div>
          </div>
          
          <div class="disclaimer">
            <div class="disclaimer-header">
              <div class="disclaimer-icon">⚖</div>
              <h4>Legal Notice</h4>
            </div>
            <p>
              This inspection report constitutes an official record of the property's condition at the time of inspection. 
              By signing above, both parties acknowledge that the photographs, condition assessments, and notes contained 
              herein accurately represent the state of the property. Any discrepancies or disputes must be reported in 
              writing within seven (7) days of receiving this document. This report may be used as evidence in bond 
              disputes, tribunal hearings, or legal proceedings.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="report-footer">
          <div class="report-footer-left">
            <div class="footer-logo">PS</div>
            <div>
              <div class="footer-brand">PropertySnap</div>
              <div class="footer-tagline">Protect your bond, every time</div>
            </div>
          </div>
          <div class="report-footer-right">
            <p>Generated: ${formatDate(new Date().toISOString())} at ${formatTime(new Date().toISOString())}</p>
            <p class="report-id">Report ID: ${inspection.id}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate PDF from inspection
export async function generateInspectionPDF(
  property: Property,
  inspection: Inspection
): Promise<{ uri: string; filename: string }> {
  const html = await generatePDFHTML(property, inspection);
  
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });
  
  // Generate a meaningful filename
  const dateStr = new Date().toISOString().split("T")[0];
  const addressSlug = property.address
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 30);
  const filename = `PropertySnap_${inspection.type}_${addressSlug}_${dateStr}.pdf`;
  
  // Move to a better location with proper filename
  const newUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.moveAsync({
    from: uri,
    to: newUri,
  });
  
  return { uri: newUri, filename };
}

// Share the generated PDF
export async function sharePDF(uri: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Share Inspection Report",
      UTI: "com.adobe.pdf",
    });
  } else {
    throw new Error("Sharing is not available on this device");
  }
}

// Print the PDF directly
export async function printPDF(property: Property, inspection: Inspection): Promise<void> {
  const html = await generatePDFHTML(property, inspection);
  await Print.printAsync({ html });
}
