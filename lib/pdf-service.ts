import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Property, Inspection, Checkpoint } from "./app-context";

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
    // Legacy support
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
    // Legacy support
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
// Returns empty string for null condition (individual checkpoints)
// "Not Inspected" is only shown at room level when room has no photos AND no assessments
function formatCondition(condition: string | null): string {
  if (!condition) return "";
  switch (condition) {
    case "pass":
      return "Pass";
    case "pass-attention":
      return "Pass - Needs Attention";
    case "fail":
      return "Fail - Action Required";
    // Legacy support
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
    // Check if already a data URI
    if (uri.startsWith("data:")) {
      return uri;
    }
    
    // Read file and convert to base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Determine mime type from extension
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

  // Generate room sections HTML
  const roomSections = Object.entries(processedCheckpoints)
    .map(
      ([room, checkpoints]) => {
        // Check if entire room has no photos AND no assessments
        const roomHasAnyPhoto = checkpoints.some(cp => !!cp.photoBase64);
        const roomHasAnyCondition = checkpoints.some(cp => 
          cp.landlordCondition || cp.tenantCondition || cp.moveOutCondition
        );
        const roomNotInspected = !roomHasAnyPhoto && !roomHasAnyCondition;
        
        return `
      <div class="room-section">
        <h2 class="room-title">${room}${roomNotInspected ? ' <span style="font-size: 14px; color: #6B6B6B; font-weight: normal;">(Not Inspected)</span>' : ''}</h2>
        <div class="checkpoints-grid">
          ${checkpoints
            .map(
              (checkpoint) => {
                const condition = checkpoint.landlordCondition || checkpoint.tenantCondition || checkpoint.moveOutCondition;
                const hasPhoto = !!checkpoint.photoBase64;
                const hasNotes = !!checkpoint.notes && checkpoint.notes.trim().length > 0;
                const conditionText = formatCondition(condition);
                
                return `
            <div class="checkpoint-card">
              ${
                hasPhoto
                  ? `<div class="photo-container">
                      <img src="${checkpoint.photoBase64}" alt="${checkpoint.title}" class="checkpoint-photo" />
                    </div>`
                  : `<div class="photo-placeholder">
                      <span class="placeholder-text">No photo provided</span>
                    </div>`
              }
              <div class="checkpoint-details">
                <h3 class="checkpoint-title">${checkpoint.title}</h3>
                ${conditionText ? `<div class="condition-badge" style="background-color: ${getConditionBgColor(condition)}; color: ${getConditionColor(condition)}; border: 1px solid ${getConditionColor(condition)};">
                  ${conditionText}
                </div>` : ''}
                <div class="checkpoint-notes">
                  ${hasNotes ? checkpoint.notes : '<span class="no-info">No information provided</span>'}
                </div>
                ${checkpoint.timestamp ? `<p class="checkpoint-timestamp">Inspected: ${formatDate(checkpoint.timestamp)} at ${formatTime(checkpoint.timestamp)}</p>` : ''}
              </div>
            </div>
          `;
              }
            )
            .join("")}
        </div>
      </div>
    `;
      }
    )
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
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 25mm 30mm 25mm 30mm;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          line-height: 1.6;
          color: #1C2839;
          background: #FFFFFF;
        }
        
        h1, h2, h3, .cover-title, .cover-property-address, .report-header-left h1 {
          font-family: 'Crimson Pro', Georgia, 'Times New Roman', serif;
        }
        
        /* Cover Page */
        .cover-page {
          page-break-after: always;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 60px 40px;
          background: linear-gradient(135deg, #8B2635 0%, #6D1E2A 100%);
          color: #FFFFFF;
          margin: -25mm -30mm;
          width: calc(100% + 60mm);
        }
        
        .cover-logo {
          width: 100px;
          height: 100px;
          background: #FFFFFF;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 40px;
          color: #8B2635;
          font-weight: 700;
        }
        
        .cover-title {
          font-size: 42px;
          font-weight: 700;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }
        
        .cover-subtitle {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 56px;
          font-style: italic;
        }
        
        .cover-property {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 40px;
          max-width: 440px;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .cover-property-address {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 16px;
          line-height: 1.3;
        }
        
        .cover-property-details {
          font-size: 14px;
          opacity: 0.9;
        }
        
        .cover-inspection-type {
          display: inline-block;
          background: #C59849;
          color: #FFFFFF;
          padding: 10px 28px;
          border-radius: 24px;
          font-size: 13px;
          font-weight: 600;
          margin-top: 40px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        
        .cover-date {
          margin-top: 56px;
          font-size: 13px;
          opacity: 0.75;
        }
        
        /* Report Content */
        .report-content {
          padding: 0;
        }
        
        /* Report Header */
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 0;
          border-bottom: 2px solid #8B2635;
          margin-bottom: 32px;
        }
        
        .report-header-left h1 {
          font-size: 28px;
          font-weight: 700;
          color: #8B2635;
          margin-bottom: 4px;
        }
        
        .report-header-left p {
          font-size: 12px;
          color: #6B6B6B;
        }
        
        .report-header-right {
          text-align: right;
        }
        
        .report-header-right .date {
          font-size: 14px;
          font-weight: 600;
          color: #1C2839;
        }
        
        .report-header-right .type {
          font-size: 12px;
          color: #6B6B6B;
          margin-top: 2px;
        }
        
        /* Property Summary */
        .property-summary {
          background: #F9F7F4;
          border-radius: 12px;
          padding: 28px;
          margin-bottom: 40px;
          border: 1px solid #E8E6E3;
        }
        
        .property-summary h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1C2839;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #E8E6E3;
        }
        
        .property-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        
        .property-detail {
          display: flex;
          flex-direction: column;
        }
        
        .property-detail-label {
          font-size: 10px;
          color: #6B6B6B;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
          font-weight: 500;
        }
        
        .property-detail-value {
          font-size: 14px;
          font-weight: 500;
          color: #1C2839;
        }
        
        /* Room Sections */
        .room-section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        
        .room-title {
          font-size: 20px;
          font-weight: 700;
          color: #8B2635;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 3px solid #C59849;
        }
        
        .checkpoints-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        
        .checkpoint-card {
          background: #FFFFFF;
          border: 1px solid #E8E6E3;
          border-radius: 10px;
          overflow: hidden;
          page-break-inside: avoid;
        }
        
        .photo-container {
          width: 100%;
          height: 160px;
          overflow: hidden;
          background: #F5F3F0;
        }
        
        .checkpoint-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .photo-placeholder {
          width: 100%;
          height: 160px;
          background: #F5F3F0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid #E8E6E3;
        }
        
        .placeholder-text {
          color: #A8A8A8;
          font-size: 12px;
          font-style: italic;
        }
        
        .checkpoint-details {
          padding: 16px;
        }
        
        .checkpoint-title {
          font-size: 14px;
          font-weight: 600;
          color: #1C2839;
          margin-bottom: 10px;
        }
        
        .condition-badge {
          display: inline-block;
          padding: 5px 14px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        
        .checkpoint-notes {
          font-size: 11px;
          color: #3A3A3A;
          margin-bottom: 10px;
          line-height: 1.5;
          min-height: 20px;
        }
        
        .checkpoint-notes .no-info {
          color: #A8A8A8;
          font-style: italic;
        }
        
        .checkpoint-timestamp {
          font-size: 10px;
          color: #A8A8A8;
        }
        
        /* Signature Section */
        .signature-section {
          page-break-before: always;
          padding-top: 40px;
        }
        
        .signature-section h2 {
          font-size: 20px;
          font-weight: 700;
          color: #8B2635;
          margin-bottom: 28px;
          padding-bottom: 10px;
          border-bottom: 3px solid #C59849;
        }
        
        .signatures-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 40px;
        }
        
        .signature-box {
          background: #F9F7F4;
          border: 1px solid #E8E6E3;
          border-radius: 12px;
          padding: 28px;
        }
        
        .signature-box h3 {
          font-size: 14px;
          font-weight: 600;
          color: #1C2839;
          margin-bottom: 20px;
        }
        
        .signature-line {
          border-bottom: 2px solid #1C2839;
          height: 70px;
          margin-bottom: 12px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 8px;
        }
        
        .signature-image {
          max-height: 55px;
          max-width: 100%;
        }
        
        .signature-name {
          font-size: 13px;
          color: #1C2839;
          text-align: center;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .signature-date {
          font-size: 11px;
          color: #6B6B6B;
          text-align: center;
        }
        
        /* Footer */
        .report-footer {
          margin-top: 56px;
          padding-top: 28px;
          border-top: 1px solid #E8E6E3;
          text-align: center;
        }
        
        .report-footer p {
          font-size: 10px;
          color: #A8A8A8;
          margin-bottom: 4px;
        }
        
        .report-footer .brand {
          font-weight: 600;
          color: #8B2635;
        }
        
        /* Disclaimer */
        .disclaimer {
          background: #FFFBF5;
          border: 1px solid #C59849;
          border-radius: 10px;
          padding: 20px;
          margin-top: 32px;
        }
        
        .disclaimer h4 {
          font-size: 12px;
          font-weight: 600;
          color: #8B2635;
          margin-bottom: 10px;
        }
        
        .disclaimer p {
          font-size: 11px;
          color: #3A3A3A;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <!-- Cover Page -->
      <div class="cover-page">
        <div class="cover-logo">PS</div>
        <h1 class="cover-title">Property Inspection Report</h1>
        <p class="cover-subtitle">Protect your bond, every time</p>
        
        <div class="cover-property">
          <p class="cover-property-address">${property.address}</p>
          <p class="cover-property-details">
            ${property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)} • 
            ${property.bedrooms} Bedroom${property.bedrooms !== 1 ? "s" : ""} • 
            ${property.bathrooms} Bathroom${property.bathrooms !== 1 ? "s" : ""}
          </p>
        </div>
        
        <div class="cover-inspection-type">
          ${inspection.type === "move-in" ? "Move-In Inspection" : "Move-Out Inspection"}
        </div>
        
        <p class="cover-date">
          Generated on ${formatDate(new Date().toISOString())}
        </p>
      </div>
      
      <!-- Report Content -->
      <div class="report-content">
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
            ${
              property.tenantName
                ? `
            <div class="property-detail">
              <span class="property-detail-label">Tenant</span>
              <span class="property-detail-value">${property.tenantName}</span>
            </div>
            `
                : ""
            }
            ${
              property.tenantEmail
                ? `
            <div class="property-detail">
              <span class="property-detail-label">Tenant Email</span>
              <span class="property-detail-value">${property.tenantEmail}</span>
            </div>
            `
                : ""
            }
          </div>
        </div>
        
        <!-- Room Sections -->
        ${roomSections}
        
        <!-- Signature Section -->
        <div class="signature-section">
          <h2>Signatures & Acknowledgment</h2>
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
            <h4>Legal Notice</h4>
            <p>
              This inspection report constitutes an official record of the property's condition at the time of inspection. 
              By signing above, both parties acknowledge that the photographs, condition assessments, and notes contained 
              herein accurately represent the state of the property. Any discrepancies or disputes must be reported in 
              writing within seven (7) days of receiving this document. This report may be used as evidence in bond 
              disputes or legal proceedings.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="report-footer">
          <p>Generated by <span class="brand">PropertySnap</span> • Protect your bond, every time</p>
          <p>Report ID: ${inspection.id}</p>
          <p>Generated: ${formatDate(new Date().toISOString())} at ${formatTime(new Date().toISOString())}</p>
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
