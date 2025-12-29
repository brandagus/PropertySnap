import { useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, Alert, Linking, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

export default function SMSComposeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    propertyId: string;
    phone: string;
    tenantName: string;
    address: string;
    message: string;
  }>();
  const colors = useColors();
  
  const [message, setMessage] = useState(params.message || "");

  const handleSendSMS = async () => {
    if (!params.phone) {
      Alert.alert("Error", "No phone number provided");
      return;
    }
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Format phone number (remove spaces, dashes)
    const cleanPhone = params.phone.replace(/[\s-]/g, "");
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create SMS URL
    const smsUrl = Platform.OS === "ios"
      ? `sms:${cleanPhone}&body=${encodedMessage}`
      : `sms:${cleanPhone}?body=${encodedMessage}`;
    
    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
        router.back();
      } else {
        Alert.alert("Error", "Unable to open SMS app. Please check if SMS is available on this device.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open SMS app");
    }
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Send SMS Reminder
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Recipient Info */}
        <View style={[styles.recipientCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.recipientRow}>
            <Text style={[styles.recipientLabel, { color: colors.muted }]}>To:</Text>
            <Text style={[styles.recipientValue, { color: colors.foreground }]}>
              {params.tenantName}
            </Text>
          </View>
          <View style={styles.recipientRow}>
            <Text style={[styles.recipientLabel, { color: colors.muted }]}>Phone:</Text>
            <Text style={[styles.recipientValue, { color: colors.foreground }]}>
              {params.phone}
            </Text>
          </View>
          <View style={styles.recipientRow}>
            <Text style={[styles.recipientLabel, { color: colors.muted }]}>Property:</Text>
            <Text style={[styles.recipientValue, { color: colors.foreground }]} numberOfLines={2}>
              {params.address}
            </Text>
          </View>
        </View>

        {/* Message Input */}
        <View style={styles.messageSection}>
          <Text style={[styles.messageLabel, { color: colors.foreground }]}>Message</Text>
          <TextInput
            style={[
              styles.messageInput,
              { 
                backgroundColor: colors.surface, 
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            placeholder="Enter your message..."
            placeholderTextColor={colors.muted}
          />
          <Text style={[styles.charCount, { color: colors.muted }]}>
            {message.length} characters
          </Text>
        </View>

        {/* Send Button */}
        <Pressable
          onPress={handleSendSMS}
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <IconSymbol name="paperplane.fill" size={20} color="#FFFFFF" />
          <Text style={styles.sendButtonText}>Open SMS App</Text>
        </Pressable>

        <Text style={[styles.disclaimer, { color: colors.muted }]}>
          This will open your default SMS app with the message pre-filled. 
          Standard messaging rates may apply.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "CrimsonPro_600SemiBold",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  recipientCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  recipientRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  recipientLabel: {
    fontSize: 14,
    width: 70,
  },
  recipientValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  messageSection: {
    marginBottom: 20,
  },
  messageLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  messageInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 180,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 6,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  disclaimer: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
