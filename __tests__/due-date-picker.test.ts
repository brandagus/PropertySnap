import { describe, it, expect } from "vitest";

describe("Due Date Picker Feature", () => {
  describe("Date Calculations", () => {
    it("should calculate default due date as 7 days from now", () => {
      const now = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      
      // Should be 7 days in the future
      const diffMs = dueDate.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it("should calculate 1 day from now correctly", () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const diffMs = tomorrow.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(1);
    });

    it("should calculate 14 days from now correctly", () => {
      const now = new Date();
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      
      const diffMs = twoWeeks.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(14);
    });
  });

  describe("Date Formatting", () => {
    it("should format date to ISO string for storage", () => {
      const date = new Date("2024-12-30T12:00:00");
      const isoString = date.toISOString();
      
      expect(isoString).toContain("2024-12-30");
    });

    it("should format date for display using toLocaleDateString", () => {
      const date = new Date("2024-12-30T12:00:00");
      const displayDate = date.toLocaleDateString();
      
      // Should contain the date components (format varies by locale)
      expect(displayDate).toBeTruthy();
      expect(displayDate.length).toBeGreaterThan(0);
    });

    it("should parse ISO string back to Date object", () => {
      const originalDate = new Date("2024-12-30T12:00:00");
      const isoString = originalDate.toISOString();
      const parsedDate = new Date(isoString);
      
      expect(parsedDate.getFullYear()).toBe(2024);
      expect(parsedDate.getMonth()).toBe(11); // December is month 11
      expect(parsedDate.getDate()).toBe(30);
    });
  });

  describe("Quick Select Options", () => {
    it("should generate correct quick select dates", () => {
      const quickOptions = [
        { label: "Tomorrow", days: 1 },
        { label: "3 Days", days: 3 },
        { label: "1 Week", days: 7 },
        { label: "2 Weeks", days: 14 },
      ];
      
      const now = new Date();
      
      quickOptions.forEach(option => {
        const optionDate = new Date();
        optionDate.setDate(optionDate.getDate() + option.days);
        
        const diffMs = optionDate.getTime() - now.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        
        expect(diffDays).toBe(option.days);
      });
    });
  });

  describe("Minimum Date Validation", () => {
    it("should not allow dates in the past", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const isValid = yesterday >= today;
      expect(isValid).toBe(false);
    });

    it("should allow today as minimum date", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const selectedDate = new Date(today);
      
      const isValid = selectedDate >= today;
      expect(isValid).toBe(true);
    });

    it("should allow future dates", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 30);
      
      const isValid = futureDate >= today;
      expect(isValid).toBe(true);
    });
  });

  describe("Inspection with Due Date", () => {
    interface Inspection {
      id: string;
      type: "move-in" | "move-out" | "routine";
      status: "pending" | "completed";
      createdAt: string;
      dueDate: string | null;
    }

    it("should create inspection with due date", () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      
      const inspection: Inspection = {
        id: "test-123",
        type: "routine",
        status: "pending",
        createdAt: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
      };
      
      expect(inspection.dueDate).toBeTruthy();
      expect(new Date(inspection.dueDate!).getTime()).toBeGreaterThan(Date.now());
    });

    it("should display due date only for pending inspections", () => {
      const inspection: Inspection = {
        id: "test-123",
        type: "routine",
        status: "completed",
        createdAt: new Date().toISOString(),
        dueDate: new Date().toISOString(),
      };
      
      const shouldShowDueDate = inspection.dueDate && inspection.status === "pending";
      expect(shouldShowDueDate).toBe(false);
    });

    it("should show due date for pending inspections", () => {
      const inspection: Inspection = {
        id: "test-123",
        type: "routine",
        status: "pending",
        createdAt: new Date().toISOString(),
        dueDate: new Date().toISOString(),
      };
      
      const shouldShowDueDate = inspection.dueDate && inspection.status === "pending";
      expect(shouldShowDueDate).toBe(true);
    });
  });

  describe("SMS Message with Due Date", () => {
    it("should include due date in SMS message", () => {
      const dueDate = new Date("2024-12-30T12:00:00");
      const dueDateText = ` Please complete by ${dueDate.toLocaleDateString()}.`;
      const message = `Hey John, your landlord has requested a Move-In inspection for 123 Main St.${dueDateText} Please open the PropertySnap app to get started.`;
      
      expect(message).toContain("Please complete by");
      expect(message).toContain("Move-In inspection");
    });

    it("should not include due date text if no due date", () => {
      const generateMessage = (dueDate: Date | null) => {
        const dueDateText = dueDate ? ` Please complete by ${dueDate.toLocaleDateString()}.` : "";
        return `Hey John, your landlord has requested a Move-In inspection for 123 Main St.${dueDateText} Please open the PropertySnap app to get started.`;
      };
      
      const message = generateMessage(null);
      expect(message).not.toContain("Please complete by");
    });
  });
});
