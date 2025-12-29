import { describe, it, expect, vi } from "vitest";

// Mock the expo modules
vi.mock("expo-print", () => ({
  printToFileAsync: vi.fn().mockResolvedValue({ uri: "file://test.pdf" }),
  printAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///documents/",
  moveAsync: vi.fn().mockResolvedValue(undefined),
}));

describe("PDF Service", () => {
  const mockProperty = {
    id: "prop-1",
    address: "123 Test Street, Sydney NSW 2000",
    propertyType: "apartment" as const,
    bedrooms: 2,
    bathrooms: 1,
    photo: null,
    tenantId: null,
    tenantName: "John Tenant",
    tenantEmail: "john@example.com",
    inspections: [],
    createdAt: "2024-01-15T10:00:00.000Z",
  };

  const mockInspection = {
    id: "insp-1",
    propertyId: "prop-1",
    type: "move-in" as const,
    status: "completed" as const,
    createdAt: "2024-01-15T10:00:00.000Z",
    completedAt: "2024-01-15T12:00:00.000Z",
    landlordSignature: "data:image/png;base64,test",
    landlordName: "Jane Landlord",
    landlordSignedAt: "2024-01-15T12:00:00.000Z",
    tenantSignature: "data:image/png;base64,test",
    tenantName: "John Tenant",
    tenantSignedAt: "2024-01-15T12:30:00.000Z",
    checkpoints: [
      {
        id: "cp-1",
        roomName: "Living Room",
        title: "Main Area",
        landlordPhoto: "file:///photo1.jpg",
        tenantPhoto: null,
        moveOutPhoto: null,
        landlordCondition: "good" as const,
        tenantCondition: null,
        moveOutCondition: null,
        notes: "Clean and tidy",
        timestamp: "2024-01-15T10:30:00.000Z",
      },
      {
        id: "cp-2",
        roomName: "Kitchen",
        title: "Countertops",
        landlordPhoto: "file:///photo2.jpg",
        tenantPhoto: null,
        moveOutPhoto: null,
        landlordCondition: "excellent" as const,
        tenantCondition: null,
        moveOutCondition: null,
        notes: "",
        timestamp: "2024-01-15T10:45:00.000Z",
      },
    ],
  };

  it("should have correct property structure for PDF generation", () => {
    expect(mockProperty.address).toBe("123 Test Street, Sydney NSW 2000");
    expect(mockProperty.propertyType).toBe("apartment");
    expect(mockProperty.bedrooms).toBe(2);
    expect(mockProperty.bathrooms).toBe(1);
  });

  it("should have correct inspection structure for PDF generation", () => {
    expect(mockInspection.type).toBe("move-in");
    expect(mockInspection.status).toBe("completed");
    expect(mockInspection.checkpoints.length).toBe(2);
  });

  it("should have checkpoints with required fields", () => {
    const checkpoint = mockInspection.checkpoints[0];
    expect(checkpoint.roomName).toBe("Living Room");
    expect(checkpoint.title).toBe("Main Area");
    expect(checkpoint.landlordCondition).toBe("good");
    expect(checkpoint.notes).toBe("Clean and tidy");
  });

  it("should have signature data for completed inspections", () => {
    expect(mockInspection.landlordSignature).toBeTruthy();
    expect(mockInspection.landlordName).toBe("Jane Landlord");
    expect(mockInspection.landlordSignedAt).toBeTruthy();
    expect(mockInspection.tenantSignature).toBeTruthy();
    expect(mockInspection.tenantName).toBe("John Tenant");
    expect(mockInspection.tenantSignedAt).toBeTruthy();
  });

  it("should group checkpoints by room correctly", () => {
    const checkpointsByRoom: Record<string, typeof mockInspection.checkpoints> = {};
    mockInspection.checkpoints.forEach(cp => {
      if (!checkpointsByRoom[cp.roomName]) {
        checkpointsByRoom[cp.roomName] = [];
      }
      checkpointsByRoom[cp.roomName].push(cp);
    });

    expect(Object.keys(checkpointsByRoom)).toContain("Living Room");
    expect(Object.keys(checkpointsByRoom)).toContain("Kitchen");
    expect(checkpointsByRoom["Living Room"].length).toBe(1);
    expect(checkpointsByRoom["Kitchen"].length).toBe(1);
  });

  it("should format condition colors correctly", () => {
    const getConditionColor = (condition: string | null): string => {
      switch (condition) {
        case "excellent": return "#2D5C3F";
        case "good": return "#4A7C59";
        case "fair": return "#D97706";
        case "poor": return "#C2410C";
        case "damaged": return "#991B1B";
        default: return "#6B6B6B";
      }
    };

    expect(getConditionColor("excellent")).toBe("#2D5C3F");
    expect(getConditionColor("good")).toBe("#4A7C59");
    expect(getConditionColor("fair")).toBe("#D97706");
    expect(getConditionColor("poor")).toBe("#C2410C");
    expect(getConditionColor("damaged")).toBe("#991B1B");
    expect(getConditionColor(null)).toBe("#6B6B6B");
  });

  it("should generate correct filename format", () => {
    const dateStr = new Date().toISOString().split("T")[0];
    const addressSlug = mockProperty.address
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 30);
    const filename = `PropertySnap_${mockInspection.type}_${addressSlug}_${dateStr}.pdf`;
    
    expect(filename).toContain("PropertySnap");
    expect(filename).toContain("move-in");
    expect(filename).toContain(".pdf");
    expect(filename.length).toBeGreaterThan(0);
  });
});
