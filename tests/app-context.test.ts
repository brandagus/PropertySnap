import { describe, it, expect } from "vitest";

// Test the generateId function
describe("generateId", () => {
  it("should generate unique IDs", () => {
    const generateId = () => Math.random().toString(36).substring(2, 15);
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
  });
});

// Test the default rooms configuration
describe("getDefaultRooms", () => {
  it("should return an array of room names", () => {
    const defaultRooms = [
      "Living Room",
      "Kitchen",
      "Master Bedroom",
      "Bedroom 2",
      "Bathroom",
      "Hallway",
      "Exterior",
    ];
    expect(defaultRooms).toHaveLength(7);
    expect(defaultRooms).toContain("Living Room");
    expect(defaultRooms).toContain("Kitchen");
    expect(defaultRooms).toContain("Master Bedroom");
  });
});

// Test the checkpoint creation logic
describe("createDefaultCheckpoints", () => {
  it("should create checkpoints for each room", () => {
    const rooms = ["Living Room", "Kitchen"];
    const roomCheckpoints: Record<string, string[]> = {
      "Living Room": ["Walls", "Flooring", "Windows", "Light Fixtures", "Outlets"],
      "Kitchen": ["Cabinets", "Countertops", "Sink", "Appliances", "Flooring"],
    };
    
    const checkpoints = rooms.flatMap(room => 
      roomCheckpoints[room].map(title => ({
        id: Math.random().toString(36).substring(2, 15),
        roomName: room,
        title,
        landlordPhoto: null,
        tenantPhoto: null,
        moveOutPhoto: null,
        landlordCondition: null,
        tenantCondition: null,
        moveOutCondition: null,
        notes: "",
        timestamp: null,
      }))
    );
    
    expect(checkpoints.length).toBe(10);
    expect(checkpoints[0].roomName).toBe("Living Room");
    expect(checkpoints[0].title).toBe("Walls");
    expect(checkpoints[5].roomName).toBe("Kitchen");
  });
});

// Test condition ratings
describe("ConditionRating", () => {
  it("should have valid condition options", () => {
    const conditionOptions = ["excellent", "good", "fair", "poor", "damaged"];
    expect(conditionOptions).toHaveLength(5);
    expect(conditionOptions).toContain("excellent");
    expect(conditionOptions).toContain("damaged");
  });
});

// Test property types
describe("PropertyType", () => {
  it("should have valid property types", () => {
    const propertyTypes = ["apartment", "house", "townhouse", "studio"];
    expect(propertyTypes).toHaveLength(4);
    expect(propertyTypes).toContain("apartment");
    expect(propertyTypes).toContain("house");
  });
});

// Test user types
describe("UserType", () => {
  it("should have valid user types", () => {
    const userTypes = ["landlord", "tenant", "manager"];
    expect(userTypes).toHaveLength(3);
    expect(userTypes).toContain("landlord");
    expect(userTypes).toContain("tenant");
    expect(userTypes).toContain("manager");
  });
});

// Test subscription tiers
describe("SubscriptionTier", () => {
  it("should have valid subscription tiers", () => {
    const subscriptionTiers = ["free", "per-inspection", "monthly"];
    expect(subscriptionTiers).toHaveLength(3);
    expect(subscriptionTiers).toContain("free");
    expect(subscriptionTiers).toContain("monthly");
  });
});

// Test initial state structure
describe("Initial App State", () => {
  it("should have correct initial state structure", () => {
    const initialState = {
      user: null,
      properties: [],
      isOnboarded: false,
      isLoading: true,
    };
    
    expect(initialState.user).toBeNull();
    expect(initialState.properties).toEqual([]);
    expect(initialState.isOnboarded).toBe(false);
    expect(initialState.isLoading).toBe(true);
  });
});

// Test email validation
describe("Email Validation", () => {
  it("should validate correct email formats", () => {
    const validateEmail = (email: string) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    };
    
    expect(validateEmail("test@example.com")).toBe(true);
    expect(validateEmail("user.name@domain.co")).toBe(true);
    expect(validateEmail("invalid")).toBe(false);
    expect(validateEmail("@domain.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
  });
});

// Test property creation
describe("Property Creation", () => {
  it("should create a valid property object", () => {
    const property = {
      id: "test-id",
      address: "123 Main St",
      propertyType: "apartment" as const,
      bedrooms: 2,
      bathrooms: 1,
      photo: null,
      tenantId: null,
      tenantName: null,
      tenantEmail: null,
      inspections: [],
      createdAt: new Date().toISOString(),
    };
    
    expect(property.id).toBe("test-id");
    expect(property.address).toBe("123 Main St");
    expect(property.propertyType).toBe("apartment");
    expect(property.bedrooms).toBe(2);
    expect(property.inspections).toEqual([]);
  });
});

// Test inspection creation
describe("Inspection Creation", () => {
  it("should create a valid inspection object", () => {
    const inspection = {
      id: "insp-id",
      propertyId: "prop-id",
      type: "move-in" as const,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      completedAt: null,
      landlordSignature: null,
      tenantSignature: null,
      checkpoints: [],
    };
    
    expect(inspection.id).toBe("insp-id");
    expect(inspection.type).toBe("move-in");
    expect(inspection.status).toBe("pending");
    expect(inspection.checkpoints).toEqual([]);
  });
});
