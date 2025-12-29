import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Notification types
export type NotificationType = 
  | "inspection_reminder"
  | "inspection_due"
  | "inspection_completed"
  | "tenant_action_required"
  | "landlord_review_needed";

// Notification preference settings
export interface NotificationPreferences {
  enabled: boolean;
  inspectionReminders: boolean;
  dueDateAlerts: boolean;
  completionNotifications: boolean;
  reminderTiming: "1_day" | "3_days" | "1_week";
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  inspectionReminders: true,
  dueDateAlerts: true,
  completionNotifications: true,
  reminderTiming: "1_day",
};

const PREFERENCES_KEY = "@notification_preferences";
const SCHEDULED_NOTIFICATIONS_KEY = "@scheduled_notifications";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push notification permissions");
    return false;
  }

  // Configure Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("inspection-reminders", {
      name: "Inspection Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B2635",
    });
  }

  return true;
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save notification preferences
 */
export async function saveNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const current = await getNotificationPreferences();
    const updated = { ...current, ...preferences };
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving notification preferences:", error);
  }
}

/**
 * Schedule an inspection reminder notification
 */
export async function scheduleInspectionReminder(
  inspectionId: string,
  propertyAddress: string,
  inspectionType: string,
  dueDate: Date
): Promise<string | null> {
  const preferences = await getNotificationPreferences();
  
  if (!preferences.enabled || !preferences.inspectionReminders) {
    return null;
  }

  // Calculate reminder time based on preferences
  const reminderDate = new Date(dueDate);
  switch (preferences.reminderTiming) {
    case "1_week":
      reminderDate.setDate(reminderDate.getDate() - 7);
      break;
    case "3_days":
      reminderDate.setDate(reminderDate.getDate() - 3);
      break;
    case "1_day":
    default:
      reminderDate.setDate(reminderDate.getDate() - 1);
      break;
  }

  // Don't schedule if reminder date is in the past
  if (reminderDate <= new Date()) {
    return null;
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Inspection Reminder",
        body: `Your ${inspectionType} inspection for ${propertyAddress} is coming up soon.`,
        data: {
          type: "inspection_reminder" as NotificationType,
          inspectionId,
          propertyAddress,
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });

    // Store scheduled notification for tracking
    await storeScheduledNotification(notificationId, inspectionId, "inspection_reminder");

    return notificationId;
  } catch (error) {
    console.error("Error scheduling inspection reminder:", error);
    return null;
  }
}

/**
 * Schedule a due date alert
 */
export async function scheduleDueDateAlert(
  inspectionId: string,
  propertyAddress: string,
  inspectionType: string,
  dueDate: Date
): Promise<string | null> {
  const preferences = await getNotificationPreferences();
  
  if (!preferences.enabled || !preferences.dueDateAlerts) {
    return null;
  }

  // Schedule for the morning of the due date
  const alertDate = new Date(dueDate);
  alertDate.setHours(9, 0, 0, 0);

  // Don't schedule if due date is in the past
  if (alertDate <= new Date()) {
    return null;
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Inspection Due Today",
        body: `Your ${inspectionType} inspection for ${propertyAddress} is due today. Don't forget to complete it!`,
        data: {
          type: "inspection_due" as NotificationType,
          inspectionId,
          propertyAddress,
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alertDate,
      },
    });

    await storeScheduledNotification(notificationId, inspectionId, "inspection_due");

    return notificationId;
  } catch (error) {
    console.error("Error scheduling due date alert:", error);
    return null;
  }
}

/**
 * Send immediate notification when inspection is completed
 */
export async function sendCompletionNotification(
  inspectionId: string,
  propertyAddress: string,
  completedBy: "landlord" | "tenant"
): Promise<string | null> {
  const preferences = await getNotificationPreferences();
  
  if (!preferences.enabled || !preferences.completionNotifications) {
    return null;
  }

  const title = completedBy === "tenant" 
    ? "Tenant Completed Inspection"
    : "Inspection Completed";
  
  const body = completedBy === "tenant"
    ? `The tenant has completed their portion of the inspection for ${propertyAddress}. Please review and sign.`
    : `Your inspection for ${propertyAddress} has been completed and signed.`;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: "inspection_completed" as NotificationType,
          inspectionId,
          propertyAddress,
          completedBy,
        },
        sound: true,
      },
      trigger: null, // Immediate notification
    });

    return notificationId;
  } catch (error) {
    console.error("Error sending completion notification:", error);
    return null;
  }
}

/**
 * Send notification to tenant that action is required
 */
export async function sendTenantActionRequired(
  inspectionId: string,
  propertyAddress: string,
  message: string
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Inspection Action Required",
        body: message || `Please complete your inspection for ${propertyAddress}.`,
        data: {
          type: "tenant_action_required" as NotificationType,
          inspectionId,
          propertyAddress,
        },
        sound: true,
      },
      trigger: null,
    });

    return notificationId;
  } catch (error) {
    console.error("Error sending tenant action notification:", error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await removeScheduledNotification(notificationId);
  } catch (error) {
    console.error("Error canceling notification:", error);
  }
}

/**
 * Cancel all notifications for an inspection
 */
export async function cancelInspectionNotifications(inspectionId: string): Promise<void> {
  try {
    const scheduled = await getScheduledNotifications();
    const toCancel = scheduled.filter(n => n.inspectionId === inspectionId);
    
    for (const notification of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
    }

    // Update stored notifications
    const remaining = scheduled.filter(n => n.inspectionId !== inspectionId);
    await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(remaining));
  } catch (error) {
    console.error("Error canceling inspection notifications:", error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error getting scheduled notifications:", error);
    return [];
  }
}

// Helper functions for tracking scheduled notifications
interface ScheduledNotificationRecord {
  notificationId: string;
  inspectionId: string;
  type: NotificationType;
  scheduledAt: string;
}

async function storeScheduledNotification(
  notificationId: string,
  inspectionId: string,
  type: NotificationType
): Promise<void> {
  try {
    const scheduled = await getScheduledNotifications();
    scheduled.push({
      notificationId,
      inspectionId,
      type,
      scheduledAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(scheduled));
  } catch (error) {
    console.error("Error storing scheduled notification:", error);
  }
}

async function getScheduledNotifications(): Promise<ScheduledNotificationRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error getting scheduled notifications:", error);
    return [];
  }
}

async function removeScheduledNotification(notificationId: string): Promise<void> {
  try {
    const scheduled = await getScheduledNotifications();
    const filtered = scheduled.filter(n => n.notificationId !== notificationId);
    await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing scheduled notification:", error);
  }
}

/**
 * Add notification response listener
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}
