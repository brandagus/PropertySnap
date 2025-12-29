import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Switch, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { fonts, design } from "@/constants/typography";
import * as Haptics from "expo-haptics";
import {
  NotificationPreferences,
  getNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermissions,
  getAllScheduledNotifications,
} from "@/lib/notification-service";
import { typography } from "@/constants/typography";

type ReminderTiming = "1_day" | "3_days" | "1_week";

const REMINDER_OPTIONS: { value: ReminderTiming; label: string }[] = [
  { value: "1_day", label: "1 day before" },
  { value: "3_days", label: "3 days before" },
  { value: "1_week", label: "1 week before" },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    inspectionReminders: true,
    dueDateAlerts: true,
    completionNotifications: true,
    reminderTiming: "1_day",
  });
  const [scheduledCount, setScheduledCount] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(true);

  useEffect(() => {
    loadPreferences();
    loadScheduledCount();
  }, []);

  const loadPreferences = async () => {
    const prefs = await getNotificationPreferences();
    setPreferences(prefs);
  };

  const loadScheduledCount = async () => {
    const scheduled = await getAllScheduledNotifications();
    setScheduledCount(scheduled.length);
  };

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // If enabling notifications, request permissions first
    if (key === "enabled" && value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setPermissionGranted(false);
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to receive inspection reminders.",
          [{ text: "OK" }]
        );
        return;
      }
      setPermissionGranted(true);
    }

    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    await saveNotificationPreferences({ [key]: value });
  };

  const handleTimingChange = async (timing: ReminderTiming) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const updated = { ...preferences, reminderTiming: timing };
    setPreferences(updated);
    await saveNotificationPreferences({ reminderTiming: timing });
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View 
        className="flex-row items-center px-6 py-4 border-b"
        style={{ borderColor: colors.border }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            { opacity: pressed ? 0.7 : 1, marginRight: 16 }
          ]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[typography.h2, { color: colors.foreground }]}>
          Notifications
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Main Toggle */}
        <View 
          className="rounded-xl p-4 mb-6"
          style={{ backgroundColor: colors.surface }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text style={[typography.bodySemibold, { color: colors.foreground }]}>
                Push Notifications
              </Text>
              <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]}>
                Receive reminders and alerts about your inspections
              </Text>
            </View>
            <Switch
              value={preferences.enabled}
              onValueChange={(value) => handleToggle("enabled", value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          {!permissionGranted && (
            <View 
              className="mt-3 p-3 rounded-lg"
              style={{ backgroundColor: "rgba(139,38,53,0.1)" }}
            >
              <Text style={[typography.small, { color: colors.error }]}>
                Notifications are disabled in your device settings. Please enable them to receive reminders.
              </Text>
            </View>
          )}
        </View>

        {/* Notification Types */}
        <Text style={[typography.label, { color: colors.muted, marginBottom: 12 }]}>
          NOTIFICATION TYPES
        </Text>
        
        <View 
          className="rounded-xl mb-6"
          style={{ backgroundColor: colors.surface }}
        >
          {/* Inspection Reminders */}
          <View 
            className="flex-row items-center justify-between p-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <View className="flex-row items-center flex-1 mr-4">
              <View 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "rgba(197,152,73,0.15)" }}
              >
                <IconSymbol name="bell.fill" size={20} color="#C59849" />
              </View>
              <View className="flex-1">
                <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
                  Inspection Reminders
                </Text>
                <Text style={[typography.small, { color: colors.muted }]}>
                  Get reminded before upcoming inspections
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.inspectionReminders}
              onValueChange={(value) => handleToggle("inspectionReminders", value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              disabled={!preferences.enabled}
            />
          </View>

          {/* Due Date Alerts */}
          <View 
            className="flex-row items-center justify-between p-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <View className="flex-row items-center flex-1 mr-4">
              <View 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "rgba(139,38,53,0.15)" }}
              >
                <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#8B2635" />
              </View>
              <View className="flex-1">
                <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
                  Due Date Alerts
                </Text>
                <Text style={[typography.small, { color: colors.muted }]}>
                  Alert when an inspection is due today
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.dueDateAlerts}
              onValueChange={(value) => handleToggle("dueDateAlerts", value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              disabled={!preferences.enabled}
            />
          </View>

          {/* Completion Notifications */}
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center flex-1 mr-4">
              <View 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "rgba(45,92,63,0.15)" }}
              >
                <IconSymbol name="checkmark.circle.fill" size={20} color="#2D5C3F" />
              </View>
              <View className="flex-1">
                <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
                  Completion Updates
                </Text>
                <Text style={[typography.small, { color: colors.muted }]}>
                  Notify when tenant completes their inspection
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.completionNotifications}
              onValueChange={(value) => handleToggle("completionNotifications", value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              disabled={!preferences.enabled}
            />
          </View>
        </View>

        {/* Reminder Timing */}
        <Text style={[typography.label, { color: colors.muted, marginBottom: 12 }]}>
          REMINDER TIMING
        </Text>
        
        <View 
          className="rounded-xl mb-6"
          style={{ backgroundColor: colors.surface }}
        >
          {REMINDER_OPTIONS.map((option, index) => (
            <Pressable
              key={option.value}
              onPress={() => handleTimingChange(option.value)}
              disabled={!preferences.enabled || !preferences.inspectionReminders}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                  borderBottomWidth: index < REMINDER_OPTIONS.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                  opacity: (!preferences.enabled || !preferences.inspectionReminders) ? 0.5 : (pressed ? 0.7 : 1),
                }
              ]}
            >
              <Text style={[typography.body, { color: colors.foreground }]}>
                {option.label}
              </Text>
              {preferences.reminderTiming === option.value && (
                <IconSymbol name="checkmark" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Scheduled Notifications Info */}
        <View 
          className="rounded-xl p-4 mb-6"
          style={{ backgroundColor: colors.surface }}
        >
          <View className="flex-row items-center">
            <IconSymbol name="clock.fill" size={20} color={colors.muted} />
            <Text style={[typography.body, { color: colors.muted, marginLeft: 8 }]}>
              {scheduledCount} notification{scheduledCount !== 1 ? "s" : ""} scheduled
            </Text>
          </View>
        </View>

        {/* Info Note */}
        <View 
          className="rounded-xl p-4 mb-8"
          style={{ backgroundColor: "rgba(28,40,57,0.05)" }}
        >
          <View className="flex-row">
            <IconSymbol name="info.circle.fill" size={18} color={colors.muted} />
            <Text style={[typography.small, { color: colors.muted, marginLeft: 8, flex: 1 }]}>
              Notifications are sent locally on your device. They will work even when offline, but require the app to be installed.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
