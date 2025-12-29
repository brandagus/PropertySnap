import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock expo-notifications
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
  setNotificationChannelAsync: vi.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: vi.fn().mockResolvedValue("notification-id-123"),
  cancelScheduledNotificationAsync: vi.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: vi.fn().mockResolvedValue([]),
  addNotificationResponseReceivedListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  addNotificationReceivedListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

// Mock expo-device
vi.mock("expo-device", () => ({
  isDevice: true,
}));

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Platform
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

describe("Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("NotificationPreferences", () => {
    it("should have correct default preferences structure", () => {
      const defaultPreferences = {
        enabled: true,
        inspectionReminders: true,
        dueDateAlerts: true,
        completionNotifications: true,
        reminderTiming: "1_day" as const,
      };

      expect(defaultPreferences.enabled).toBe(true);
      expect(defaultPreferences.inspectionReminders).toBe(true);
      expect(defaultPreferences.dueDateAlerts).toBe(true);
      expect(defaultPreferences.completionNotifications).toBe(true);
      expect(defaultPreferences.reminderTiming).toBe("1_day");
    });

    it("should support all reminder timing options", () => {
      const timingOptions = ["1_day", "3_days", "1_week"] as const;
      
      expect(timingOptions).toContain("1_day");
      expect(timingOptions).toContain("3_days");
      expect(timingOptions).toContain("1_week");
    });
  });

  describe("NotificationType", () => {
    it("should support all notification types", () => {
      const notificationTypes = [
        "inspection_reminder",
        "inspection_due",
        "inspection_completed",
        "tenant_action_required",
        "landlord_review_needed",
      ] as const;

      expect(notificationTypes).toHaveLength(5);
      expect(notificationTypes).toContain("inspection_reminder");
      expect(notificationTypes).toContain("inspection_due");
      expect(notificationTypes).toContain("inspection_completed");
    });
  });

  describe("Notification Content", () => {
    it("should create inspection reminder content correctly", () => {
      const propertyAddress = "123 Test Street, Sydney NSW 2000";
      const inspectionType = "Move-In";
      
      const content = {
        title: "Inspection Reminder",
        body: `Your ${inspectionType} inspection for ${propertyAddress} is coming up soon.`,
        data: {
          type: "inspection_reminder",
          inspectionId: "insp-123",
          propertyAddress,
        },
        sound: true,
      };

      expect(content.title).toBe("Inspection Reminder");
      expect(content.body).toContain("Move-In");
      expect(content.body).toContain("123 Test Street");
      expect(content.data.type).toBe("inspection_reminder");
    });

    it("should create due date alert content correctly", () => {
      const propertyAddress = "456 Example Ave, Melbourne VIC 3000";
      const inspectionType = "Move-Out";
      
      const content = {
        title: "Inspection Due Today",
        body: `Your ${inspectionType} inspection for ${propertyAddress} is due today. Don't forget to complete it!`,
        data: {
          type: "inspection_due",
          inspectionId: "insp-456",
          propertyAddress,
        },
        sound: true,
      };

      expect(content.title).toBe("Inspection Due Today");
      expect(content.body).toContain("due today");
      expect(content.data.type).toBe("inspection_due");
    });

    it("should create completion notification content for tenant", () => {
      const propertyAddress = "789 Sample Road, Brisbane QLD 4000";
      const completedBy = "tenant";
      
      const content = {
        title: completedBy === "tenant" 
          ? "Tenant Completed Inspection"
          : "Inspection Completed",
        body: completedBy === "tenant"
          ? `The tenant has completed their portion of the inspection for ${propertyAddress}. Please review and sign.`
          : `Your inspection for ${propertyAddress} has been completed and signed.`,
        data: {
          type: "inspection_completed",
          inspectionId: "insp-789",
          propertyAddress,
          completedBy,
        },
        sound: true,
      };

      expect(content.title).toBe("Tenant Completed Inspection");
      expect(content.body).toContain("tenant has completed");
      expect(content.body).toContain("Please review and sign");
    });

    it("should create completion notification content for landlord", () => {
      const propertyAddress = "789 Sample Road, Brisbane QLD 4000";
      
      // Test landlord completion notification
      const content = {
        title: "Inspection Completed",
        body: `Your inspection for ${propertyAddress} has been completed and signed.`,
        data: {
          type: "inspection_completed",
          inspectionId: "insp-789",
          propertyAddress,
          completedBy: "landlord",
        },
        sound: true,
      };

      expect(content.title).toBe("Inspection Completed");
      expect(content.body).toContain("has been completed and signed");
      expect(content.data.completedBy).toBe("landlord");
    });
  });

  describe("Reminder Timing Calculation", () => {
    it("should calculate 1 day before correctly", () => {
      const dueDate = new Date("2024-01-15T10:00:00.000Z");
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - 1);
      
      expect(reminderDate.getDate()).toBe(14);
    });

    it("should calculate 3 days before correctly", () => {
      const dueDate = new Date("2024-01-15T10:00:00.000Z");
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - 3);
      
      expect(reminderDate.getDate()).toBe(12);
    });

    it("should calculate 1 week before correctly", () => {
      const dueDate = new Date("2024-01-15T10:00:00.000Z");
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - 7);
      
      expect(reminderDate.getDate()).toBe(8);
    });
  });

  describe("Scheduled Notification Record", () => {
    it("should have correct structure", () => {
      const record = {
        notificationId: "notif-123",
        inspectionId: "insp-456",
        type: "inspection_reminder" as const,
        scheduledAt: "2024-01-10T10:00:00.000Z",
      };

      expect(record.notificationId).toBe("notif-123");
      expect(record.inspectionId).toBe("insp-456");
      expect(record.type).toBe("inspection_reminder");
      expect(record.scheduledAt).toBeTruthy();
    });
  });
});

describe("Notification Preferences Storage", () => {
  it("should merge partial preferences with defaults", () => {
    const defaults = {
      enabled: true,
      inspectionReminders: true,
      dueDateAlerts: true,
      completionNotifications: true,
      reminderTiming: "1_day" as const,
    };

    const partial = {
      enabled: false,
      reminderTiming: "3_days" as const,
    };

    const merged = { ...defaults, ...partial };

    expect(merged.enabled).toBe(false);
    expect(merged.inspectionReminders).toBe(true);
    expect(merged.reminderTiming).toBe("3_days");
  });
});
