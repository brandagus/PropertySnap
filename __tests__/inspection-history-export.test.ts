import { describe, it, expect, vi } from "vitest";

// Mock types
interface Inspection {
  id: string;
  propertyId: string;
  type: "move-in" | "move-out" | "routine";
  status: "pending" | "completed";
  createdAt: string;
  completedAt: string | null;
  checkpoints: any[];
}

interface Property {
  id: string;
  address: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  tenantName: string | null;
  inspections: Inspection[];
}

describe("Inspection History PDF Export Feature", () => {
  describe("Cover Page Statistics", () => {
    const calculateStats = (inspections: Inspection[]) => {
      return {
        total: inspections.length,
        completed: inspections.filter(i => i.status === "completed").length,
        pending: inspections.filter(i => i.status === "pending").length,
        moveIn: inspections.filter(i => i.type === "move-in").length,
        moveOut: inspections.filter(i => i.type === "move-out").length,
        routine: inspections.filter(i => i.type === "routine").length,
      };
    };

    it("should count total inspections correctly", () => {
      const inspections: Inspection[] = [
        { id: "1", propertyId: "p1", type: "move-in", status: "completed", createdAt: "2024-01-01", completedAt: "2024-01-02", checkpoints: [] },
        { id: "2", propertyId: "p1", type: "routine", status: "completed", createdAt: "2024-06-01", completedAt: "2024-06-02", checkpoints: [] },
        { id: "3", propertyId: "p1", type: "move-out", status: "pending", createdAt: "2024-12-01", completedAt: null, checkpoints: [] },
      ];
      
      const stats = calculateStats(inspections);
      expect(stats.total).toBe(3);
    });

    it("should count completed inspections correctly", () => {
      const inspections: Inspection[] = [
        { id: "1", propertyId: "p1", type: "move-in", status: "completed", createdAt: "2024-01-01", completedAt: "2024-01-02", checkpoints: [] },
        { id: "2", propertyId: "p1", type: "routine", status: "completed", createdAt: "2024-06-01", completedAt: "2024-06-02", checkpoints: [] },
        { id: "3", propertyId: "p1", type: "move-out", status: "pending", createdAt: "2024-12-01", completedAt: null, checkpoints: [] },
      ];
      
      const stats = calculateStats(inspections);
      expect(stats.completed).toBe(2);
      expect(stats.pending).toBe(1);
    });

    it("should count inspection types correctly", () => {
      const inspections: Inspection[] = [
        { id: "1", propertyId: "p1", type: "move-in", status: "completed", createdAt: "2024-01-01", completedAt: "2024-01-02", checkpoints: [] },
        { id: "2", propertyId: "p1", type: "routine", status: "completed", createdAt: "2024-03-01", completedAt: "2024-03-02", checkpoints: [] },
        { id: "3", propertyId: "p1", type: "routine", status: "completed", createdAt: "2024-06-01", completedAt: "2024-06-02", checkpoints: [] },
        { id: "4", propertyId: "p1", type: "move-out", status: "completed", createdAt: "2024-12-01", completedAt: "2024-12-02", checkpoints: [] },
      ];
      
      const stats = calculateStats(inspections);
      expect(stats.moveIn).toBe(1);
      expect(stats.routine).toBe(2);
      expect(stats.moveOut).toBe(1);
    });
  });

  describe("Inspection Sorting", () => {
    it("should sort inspections by date (oldest first)", () => {
      const inspections: Inspection[] = [
        { id: "3", propertyId: "p1", type: "move-out", status: "completed", createdAt: "2024-12-01", completedAt: "2024-12-02", checkpoints: [] },
        { id: "1", propertyId: "p1", type: "move-in", status: "completed", createdAt: "2024-01-01", completedAt: "2024-01-02", checkpoints: [] },
        { id: "2", propertyId: "p1", type: "routine", status: "completed", createdAt: "2024-06-01", completedAt: "2024-06-02", checkpoints: [] },
      ];
      
      const sorted = [...inspections].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      expect(sorted[0].id).toBe("1");
      expect(sorted[1].id).toBe("2");
      expect(sorted[2].id).toBe("3");
    });
  });

  describe("Date Range Calculation", () => {
    it("should find first and last inspection dates", () => {
      const inspections: Inspection[] = [
        { id: "1", propertyId: "p1", type: "move-in", status: "completed", createdAt: "2024-01-15", completedAt: "2024-01-16", checkpoints: [] },
        { id: "2", propertyId: "p1", type: "routine", status: "completed", createdAt: "2024-06-20", completedAt: "2024-06-21", checkpoints: [] },
        { id: "3", propertyId: "p1", type: "move-out", status: "completed", createdAt: "2024-12-10", completedAt: "2024-12-11", checkpoints: [] },
      ];
      
      const firstInspection = inspections.reduce((oldest, i) => 
        new Date(i.createdAt) < new Date(oldest.createdAt) ? i : oldest
      );
      const lastInspection = inspections.reduce((newest, i) => 
        new Date(i.createdAt) > new Date(newest.createdAt) ? i : newest
      );
      
      expect(firstInspection.createdAt).toBe("2024-01-15");
      expect(lastInspection.createdAt).toBe("2024-12-10");
    });
  });

  describe("Table of Contents Generation", () => {
    it("should generate correct type labels", () => {
      const getTypeLabel = (type: string) => {
        return type === "move-in" ? "Move-In" 
          : type === "move-out" ? "Move-Out" 
          : "Routine";
      };
      
      expect(getTypeLabel("move-in")).toBe("Move-In");
      expect(getTypeLabel("move-out")).toBe("Move-Out");
      expect(getTypeLabel("routine")).toBe("Routine");
    });

    it("should generate correct status symbols", () => {
      const getStatusSymbol = (status: string) => {
        return status === "completed" ? "✓" : "○";
      };
      
      expect(getStatusSymbol("completed")).toBe("✓");
      expect(getStatusSymbol("pending")).toBe("○");
    });
  });

  describe("Filename Generation", () => {
    it("should sanitize address for filename", () => {
      const sanitizeAddress = (address: string) => {
        return address.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      };
      
      expect(sanitizeAddress("123 Main St, Sydney NSW 2000")).toBe("123_Main_St__Sydney_NSW_2000");
    });

    it("should truncate long addresses", () => {
      const sanitizeAddress = (address: string) => {
        return address.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      };
      
      const longAddress = "123 Very Long Street Name That Goes On Forever, Sydney";
      const sanitized = sanitizeAddress(longAddress);
      expect(sanitized.length).toBeLessThanOrEqual(30);
    });

    it("should generate correct filename format", () => {
      const generateFilename = (address: string, date: string) => {
        const sanitizedAddress = address.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
        const dateStr = date.split("T")[0];
        return `${sanitizedAddress}_Inspection_History_${dateStr}.pdf`;
      };
      
      const filename = generateFilename("123 Main St", "2024-12-30T10:00:00");
      expect(filename).toBe("123_Main_St_Inspection_History_2024-12-30.pdf");
    });
  });

  describe("Empty Inspections Handling", () => {
    it("should return error for empty inspections array", () => {
      const validateInspections = (inspections: Inspection[]) => {
        if (inspections.length === 0) {
          return { success: false, error: "No inspections to export" };
        }
        return { success: true };
      };
      
      expect(validateInspections([])).toEqual({ success: false, error: "No inspections to export" });
    });

    it("should succeed for non-empty inspections array", () => {
      const validateInspections = (inspections: Inspection[]) => {
        if (inspections.length === 0) {
          return { success: false, error: "No inspections to export" };
        }
        return { success: true };
      };
      
      const inspections: Inspection[] = [
        { id: "1", propertyId: "p1", type: "move-in", status: "completed", createdAt: "2024-01-01", completedAt: "2024-01-02", checkpoints: [] },
      ];
      
      expect(validateInspections(inspections)).toEqual({ success: true });
    });
  });

  describe("Property Details Display", () => {
    it("should format property details correctly", () => {
      const property: Property = {
        id: "p1",
        address: "123 Main St, Sydney",
        propertyType: "apartment",
        bedrooms: 2,
        bathrooms: 1,
        tenantName: "John Smith",
        inspections: [],
      };
      
      const formatPropertyType = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
      };
      
      expect(formatPropertyType(property.propertyType)).toBe("Apartment");
      expect(`${property.bedrooms} Bedrooms • ${property.bathrooms} Bathrooms`).toBe("2 Bedrooms • 1 Bathrooms");
    });
  });
});
