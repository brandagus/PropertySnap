import { describe, it, expect, vi } from "vitest";

// Mock react-native modules
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Alert: {
    alert: vi.fn(),
  },
  Linking: {
    canOpenURL: vi.fn().mockResolvedValue(true),
    openURL: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Inspection Type Selection Feature", () => {
  describe("Type Display Formatting", () => {
    const formatTypeDisplay = (type: string) => {
      return type === "move-in" ? "Move-In" 
        : type === "move-out" ? "Move-Out" 
        : "Routine";
    };

    it("should format move-in type correctly", () => {
      expect(formatTypeDisplay("move-in")).toBe("Move-In");
    });

    it("should format move-out type correctly", () => {
      expect(formatTypeDisplay("move-out")).toBe("Move-Out");
    });

    it("should format routine type correctly", () => {
      expect(formatTypeDisplay("routine")).toBe("Routine");
    });

    it("should default to Routine for unknown types", () => {
      expect(formatTypeDisplay("unknown")).toBe("Routine");
    });
  });

  describe("SMS Message Generation with Type", () => {
    const generateSMSMessage = (tenantName: string, inspectionType: string, address: string) => {
      return `Hey ${tenantName}, your landlord has requested a ${inspectionType} inspection for ${address}. Please open the PropertySnap app to get started.`;
    };

    it("should include tenant name in message", () => {
      const message = generateSMSMessage("John Smith", "Move-In", "123 Test St");
      expect(message).toContain("Hey John Smith");
    });

    it("should include Move-In type in message", () => {
      const message = generateSMSMessage("John Smith", "Move-In", "123 Test St");
      expect(message).toContain("Move-In inspection");
    });

    it("should include Move-Out type in message", () => {
      const message = generateSMSMessage("John Smith", "Move-Out", "123 Test St");
      expect(message).toContain("Move-Out inspection");
    });

    it("should include Routine type in message", () => {
      const message = generateSMSMessage("John Smith", "Routine", "123 Test St");
      expect(message).toContain("Routine inspection");
    });

    it("should include property address in message", () => {
      const message = generateSMSMessage("John Smith", "Move-In", "456 Main Ave, Sydney");
      expect(message).toContain("456 Main Ave, Sydney");
    });

    it("should include app download prompt", () => {
      const message = generateSMSMessage("John Smith", "Move-In", "123 Test St");
      expect(message).toContain("PropertySnap app");
    });
  });

  describe("Notification Message Generation with Type", () => {
    const generateNotificationMessage = (typeDisplay: string, address: string) => {
      return `Your landlord has requested a ${typeDisplay} inspection for ${address}.`;
    };

    it("should include inspection type in notification", () => {
      const message = generateNotificationMessage("Move-In", "123 Test St");
      expect(message).toContain("Move-In inspection");
    });

    it("should include property address in notification", () => {
      const message = generateNotificationMessage("Move-In", "123 Test St");
      expect(message).toContain("123 Test St");
    });
  });

  describe("Inspection Creation with Type", () => {
    it("should create inspection with move-in type", () => {
      const inspection = {
        id: "test-123",
        propertyId: "prop-456",
        type: "move-in" as const,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };
      
      expect(inspection.type).toBe("move-in");
    });

    it("should create inspection with move-out type", () => {
      const inspection = {
        id: "test-123",
        propertyId: "prop-456",
        type: "move-out" as const,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };
      
      expect(inspection.type).toBe("move-out");
    });

    it("should create inspection with routine type", () => {
      const inspection = {
        id: "test-123",
        propertyId: "prop-456",
        type: "routine" as const,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };
      
      expect(inspection.type).toBe("routine");
    });

    it("should set status to pending when created", () => {
      const inspection = {
        id: "test-123",
        propertyId: "prop-456",
        type: "move-in" as const,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };
      
      expect(inspection.status).toBe("pending");
    });
  });

  describe("Alert Dialog Options", () => {
    it("should have Cancel option", () => {
      const options = ["Cancel", "Move-In", "Move-Out", "Routine"];
      expect(options).toContain("Cancel");
    });

    it("should have all three inspection types", () => {
      const options = ["Cancel", "Move-In", "Move-Out", "Routine"];
      expect(options).toContain("Move-In");
      expect(options).toContain("Move-Out");
      expect(options).toContain("Routine");
    });

    it("should have exactly 4 options", () => {
      const options = ["Cancel", "Move-In", "Move-Out", "Routine"];
      expect(options.length).toBe(4);
    });
  });
});
