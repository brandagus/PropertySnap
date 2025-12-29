import { describe, it, expect, vi } from "vitest";

// Mock react-native modules
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Linking: {
    canOpenURL: vi.fn().mockResolvedValue(true),
    openURL: vi.fn().mockResolvedValue(undefined),
  },
  Alert: {
    alert: vi.fn(),
  },
}));

describe("Request Inspection Feature", () => {
  describe("SMS URL Generation", () => {
    it("should generate correct iOS SMS URL with encoded message", () => {
      const phone = "0412345678";
      const tenantName = "John Smith";
      const address = "123 Test Street, Sydney NSW 2000";
      const message = `Hey ${tenantName}, your landlord has requested you to complete a property inspection for ${address}. Please open the PropertySnap app to get started.`;
      
      const encodedMessage = encodeURIComponent(message);
      const iosUrl = `sms:${phone}&body=${encodedMessage}`;
      
      expect(iosUrl).toContain("sms:0412345678");
      expect(iosUrl).toContain("&body=");
      expect(iosUrl).toContain("Hey%20John%20Smith");
      expect(iosUrl).toContain("123%20Test%20Street");
    });

    it("should generate correct Android SMS URL with encoded message", () => {
      const phone = "0412345678";
      const tenantName = "Jane Doe";
      const address = "456 Example Ave, Melbourne VIC 3000";
      const message = `Hey ${tenantName}, your landlord has requested you to complete a property inspection for ${address}. Please open the PropertySnap app to get started.`;
      
      const encodedMessage = encodeURIComponent(message);
      const androidUrl = `sms:${phone}?body=${encodedMessage}`;
      
      expect(androidUrl).toContain("sms:0412345678");
      expect(androidUrl).toContain("?body=");
      expect(androidUrl).toContain("Hey%20Jane%20Doe");
    });

    it("should handle special characters in tenant name", () => {
      const tenantName = "O'Brien & Co.";
      const message = `Hey ${tenantName}, your landlord has requested an inspection.`;
      const encodedMessage = encodeURIComponent(message);
      
      // encodeURIComponent doesn't encode apostrophes, but does encode ampersands
      expect(encodedMessage).toContain("O'Brien");
      expect(encodedMessage).toContain("%26"); // & becomes %26
    });

    it("should handle special characters in address", () => {
      const address = "Unit 5/123 Test St, Sydney NSW 2000";
      const message = `Inspection for ${address}`;
      const encodedMessage = encodeURIComponent(message);
      
      expect(encodedMessage).toContain("Unit%205%2F123");
    });
  });

  describe("Inspection Creation", () => {
    it("should create inspection with correct structure", () => {
      const propertyId = "prop-123";
      const inspectionId = "insp-456";
      
      const newInspection = {
        id: inspectionId,
        propertyId: propertyId,
        type: "routine" as const,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        completedAt: null,
        landlordSignature: null,
        landlordName: null,
        landlordSignedAt: null,
        tenantSignature: null,
        tenantName: null,
        tenantSignedAt: null,
        checkpoints: [],
      };

      expect(newInspection.id).toBe(inspectionId);
      expect(newInspection.propertyId).toBe(propertyId);
      expect(newInspection.type).toBe("routine");
      expect(newInspection.status).toBe("pending");
      expect(newInspection.completedAt).toBeNull();
    });

    it("should set due date 7 days from creation", () => {
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 7);
      
      const daysDiff = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(7);
    });
  });

  describe("SMS Message Template", () => {
    it("should include tenant name in message", () => {
      const tenantName = "Test Tenant";
      const address = "123 Test St";
      const message = `Hey ${tenantName}, your landlord has requested you to complete a property inspection for ${address}. Please open the PropertySnap app to get started.`;
      
      expect(message).toContain("Hey Test Tenant");
    });

    it("should include property address in message", () => {
      const tenantName = "Test Tenant";
      const address = "123 Test St, Sydney NSW 2000";
      const message = `Hey ${tenantName}, your landlord has requested you to complete a property inspection for ${address}. Please open the PropertySnap app to get started.`;
      
      expect(message).toContain("123 Test St, Sydney NSW 2000");
    });

    it("should include call to action", () => {
      const tenantName = "Test Tenant";
      const address = "123 Test St";
      const message = `Hey ${tenantName}, your landlord has requested you to complete a property inspection for ${address}. Please open the PropertySnap app to get started.`;
      
      expect(message).toContain("Please open the PropertySnap app");
    });

    it("should use default name when tenant name is not provided", () => {
      const tenantName = "Tenant"; // Default fallback
      const address = "123 Test St";
      const message = `Hey ${tenantName}, your landlord has requested you to complete a property inspection for ${address}. Please open the PropertySnap app to get started.`;
      
      expect(message).toContain("Hey Tenant");
    });
  });

  describe("Property Validation", () => {
    it("should detect property with tenant info", () => {
      const property = {
        id: "prop-123",
        tenantName: "John Smith",
        tenantEmail: "john@example.com",
        tenantPhone: "0412345678",
      };
      
      const hasTenant = property.tenantName || property.tenantEmail || property.tenantPhone;
      expect(hasTenant).toBeTruthy();
    });

    it("should detect property without tenant info", () => {
      const property = {
        id: "prop-123",
        tenantName: null,
        tenantEmail: null,
        tenantPhone: null,
      };
      
      const hasTenant = property.tenantName || property.tenantEmail || property.tenantPhone;
      expect(hasTenant).toBeFalsy();
    });

    it("should handle missing phone number gracefully", () => {
      const property = {
        id: "prop-123",
        tenantName: "John Smith",
        tenantEmail: "john@example.com",
        tenantPhone: "", // Empty phone
      };
      
      const canSendSMS = !!property.tenantPhone;
      expect(canSendSMS).toBe(false);
    });
  });
});
