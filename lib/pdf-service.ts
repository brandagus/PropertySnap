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

// Get condition badge color
function getConditionColor(condition: string | null): string {
  switch (condition) {
    case "excellent":
      return "#2D5C3F";
    case "good":
      return "#4A7C59";
    case "fair":
      return "#D97706";
    case "poor":
      return "#C2410C";
    case "damaged":
      return "#991B1B";
    default:
      return "#6B6B6B";
  }
}

// Get condition background color
function getConditionBgColor(condition: string | null): string {
  switch (condition) {
    case "excellent":
      return "#E8F5E9";
    case "good":
      return "#F1F8E9";
    case "fair":
      return "#FFF3E0";
    case "poor":
      return "#FBE9E7";
    case "damaged":
      return "#FFEBEE";
    default:
      return "#F5F5F5";
  }
}

// Format condition for display
function formatCondition(condition: string | null): string {
  if (!condition) return "Not Rated";
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

// Generate the HTML template for the PDF
function generatePDFHTML(property: Property, inspection: Inspection): string {
  const checkpointsByRoom = inspection.checkpoints.reduce((acc, checkpoint) => {
    const room = checkpoint.roomName || "General";
    if (!acc[room]) {
      acc[room] = [];
    }
    acc[room].push(checkpoint);
    return acc;
  }, {} as Record<string, Checkpoint[]>);

  const roomSections = Object.entries(checkpointsByRoom)
    .map(
      ([room, checkpoints]) => `
      <div class="room-section">
        <h2 class="room-title">${room}</h2>
        <div class="checkpoints-grid">
          ${checkpoints
            .map(
              (checkpoint) => {
                const photo = checkpoint.landlordPhoto || checkpoint.tenantPhoto || checkpoint.moveOutPhoto;
                const condition = checkpoint.landlordCondition || checkpoint.tenantCondition || checkpoint.moveOutCondition;
                return `
            <div class="checkpoint-card">
              ${
                photo
                  ? `<div class="photo-container">
                      <img src="${photo}" alt="${checkpoint.title}" class="checkpoint-photo" />
                    </div>`
                  : `<div class="photo-placeholder">
                      <span>No Photo</span>
                    </div>`
              }
              <div class="checkpoint-details">
                <h3 class="checkpoint-title">${checkpoint.title}</h3>
                <div class="condition-badge" style="background-color: ${getConditionBgColor(condition)}; color: ${getConditionColor(condition)}; border: 1px solid ${getConditionColor(condition)};">
                  ${formatCondition(condition)}
                </div>
                ${checkpoint.notes ? `<p class="checkpoint-notes">${checkpoint.notes}</p>` : ""}
                ${checkpoint.timestamp ? `<p class="checkpoint-timestamp">Captured: ${formatDate(checkpoint.timestamp)} at ${formatTime(checkpoint.timestamp)}</p>` : ""}
              </div>
            </div>
          `;
              }
            )
            .join("")}
        </div>
      </div>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Property Inspection Report</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #1C2839;
          background: #FFFFFF;
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
          padding: 40px;
          background: linear-gradient(135deg, #8B2635 0%, #6D1E2A 100%);
          color: #FFFFFF;
        }
        
        .cover-logo {
          width: 80px;
          height: 80px;
          background: #FFFFFF;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          font-size: 32px;
          color: #8B2635;
          font-weight: bold;
        }
        
        .cover-title {
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        
        .cover-subtitle {
          font-size: 18px;
          opacity: 0.9;
          margin-bottom: 48px;
        }
        
        .cover-property {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 32px;
          max-width: 400px;
          width: 100%;
        }
        
        .cover-property-address {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .cover-property-details {
          font-size: 14px;
          opacity: 0.9;
        }
        
        .cover-inspection-type {
          display: inline-block;
          background: #C59849;
          color: #FFFFFF;
          padding: 8px 24px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-top: 32px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .cover-date {
          margin-top: 48px;
          font-size: 14px;
          opacity: 0.8;
        }
        
        /* Report Header */
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0;
          border-bottom: 2px solid #E8E6E3;
          margin-bottom: 24px;
        }
        
        .report-header-left h1 {
          font-size: 24px;
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
        }
        
        /* Property Summary */
        .property-summary {
          background: #F9F7F4;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 32px;
          border: 1px solid #E8E6E3;
        }
        
        .property-summary h2 {
          font-size: 16px;
          font-weight: 600;
          color: #1C2839;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #E8E6E3;
        }
        
        .property-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        
        .property-detail {
          display: flex;
          flex-direction: column;
        }
        
        .property-detail-label {
          font-size: 11px;
          color: #6B6B6B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        
        .property-detail-value {
          font-size: 14px;
          font-weight: 500;
          color: #1C2839;
        }
        
        /* Room Sections */
        .room-section {
          margin-bottom: 32px;
          page-break-inside: avoid;
        }
        
        .room-title {
          font-size: 18px;
          font-weight: 700;
          color: #8B2635;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #C59849;
        }
        
        .checkpoints-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        
        .checkpoint-card {
          background: #FFFFFF;
          border: 1px solid #E8E6E3;
          border-radius: 8px;
          overflow: hidden;
          page-break-inside: avoid;
        }
        
        .photo-container {
          width: 100%;
          height: 150px;
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
          height: 150px;
          background: #F5F3F0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #A8A8A8;
          font-size: 12px;
        }
        
        .checkpoint-details {
          padding: 12px;
        }
        
        .checkpoint-title {
          font-size: 14px;
          font-weight: 600;
          color: #1C2839;
          margin-bottom: 8px;
        }
        
        .condition-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        
        .checkpoint-notes {
          font-size: 12px;
          color: #3A3A3A;
          margin-bottom: 8px;
          line-height: 1.4;
        }
        
        .checkpoint-timestamp {
          font-size: 10px;
          color: #A8A8A8;
        }
        
        /* Signature Section */
        .signature-section {
          page-break-before: always;
          padding-top: 32px;
        }
        
        .signature-section h2 {
          font-size: 18px;
          font-weight: 700;
          color: #8B2635;
          margin-bottom: 24px;
          padding-bottom: 8px;
          border-bottom: 2px solid #C59849;
        }
        
        .signatures-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 32px;
        }
        
        .signature-box {
          background: #F9F7F4;
          border: 1px solid #E8E6E3;
          border-radius: 8px;
          padding: 24px;
        }
        
        .signature-box h3 {
          font-size: 14px;
          font-weight: 600;
          color: #1C2839;
          margin-bottom: 16px;
        }
        
        .signature-line {
          border-bottom: 1px solid #1C2839;
          height: 60px;
          margin-bottom: 8px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        
        .signature-image {
          max-height: 50px;
          max-width: 100%;
        }
        
        .signature-name {
          font-size: 12px;
          color: #6B6B6B;
          text-align: center;
          margin-bottom: 8px;
        }
        
        .signature-date {
          font-size: 11px;
          color: #A8A8A8;
          text-align: center;
        }
        
        /* Footer */
        .report-footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #E8E6E3;
          text-align: center;
        }
        
        .report-footer p {
          font-size: 10px;
          color: #A8A8A8;
        }
        
        .report-footer .brand {
          font-weight: 600;
          color: #8B2635;
        }
        
        /* Disclaimer */
        .disclaimer {
          background: #FFF3E0;
          border: 1px solid #D97706;
          border-radius: 8px;
          padding: 16px;
          margin-top: 24px;
        }
        
        .disclaimer h4 {
          font-size: 12px;
          font-weight: 600;
          color: #D97706;
          margin-bottom: 8px;
        }
        
        .disclaimer p {
          font-size: 11px;
          color: #3A3A3A;
          line-height: 1.5;
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
            <p>Rental Inspection Report</p>
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
          <h2>Signatures</h2>
          <div class="signatures-grid">
            <div class="signature-box">
              <h3>Landlord / Property Manager</h3>
              <div class="signature-line">
                ${inspection.landlordSignature ? `<img src="${inspection.landlordSignature}" class="signature-image" alt="Landlord Signature" />` : ""}
              </div>
              <p class="signature-name">${inspection.landlordName || "___________________"}</p>
              <p class="signature-date">Date: ${inspection.landlordSignedAt ? formatDate(inspection.landlordSignedAt) : "___________________"}</p>
            </div>
            <div class="signature-box">
              <h3>Tenant</h3>
              <div class="signature-line">
                ${inspection.tenantSignature ? `<img src="${inspection.tenantSignature}" class="signature-image" alt="Tenant Signature" />` : ""}
              </div>
              <p class="signature-name">${inspection.tenantName || "___________________"}</p>
              <p class="signature-date">Date: ${inspection.tenantSignedAt ? formatDate(inspection.tenantSignedAt) : "___________________"}</p>
            </div>
          </div>
          
          <div class="disclaimer">
            <h4>Important Notice</h4>
            <p>
              This inspection report documents the condition of the property at the time of inspection. 
              Both parties acknowledge that the photographs and condition ratings accurately represent 
              the state of the property. Any discrepancies should be reported within 7 days of receiving 
              this report.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="report-footer">
          <p>Generated by <span class="brand">PropertySnap</span> • Protect your bond, every time</p>
          <p>Report ID: ${inspection.id} • Generated: ${formatDate(new Date().toISOString())} at ${formatTime(new Date().toISOString())}</p>
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
  const html = generatePDFHTML(property, inspection);
  
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
  const html = generatePDFHTML(property, inspection);
  await Print.printAsync({ html });
}
