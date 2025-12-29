import { useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import * as Haptics from "expo-haptics";

export default function InviteTenantScreen() {
  const router = useRouter();
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const colors = useColors();
  const { state, dispatch } = useApp();
  
  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const property = useMemo(() => {
    return state.properties.find(p => p.id === propertyId);
  }, [state.properties, propertyId]);

  // Set default message when property is found
  useState(() => {
    if (property) {
      setMessage(
        `Hi ${tenantName || "[Name]"},\n\nI'm inviting you to complete the move-in inspection for ${property.address}.\n\nDownload PropertySnap and use the link below to get started.`
      );
    }
  });

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSendInvite = () => {
    const newErrors: typeof errors = {};
    
    if (!tenantName.trim()) {
      newErrors.name = "Tenant name is required";
    }
    
    if (!tenantEmail.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(tenantEmail)) {
      newErrors.email = "Please enter a valid email";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setIsLoading(true);
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Simulate sending invite
    setTimeout(() => {
      if (property) {
        const updatedProperty = {
          ...property,
          tenantName: tenantName.trim(),
          tenantEmail: tenantEmail.trim(),
        };
        dispatch({ type: "UPDATE_PROPERTY", payload: updatedProperty });
      }
      
      setIsLoading(false);
      setIsSent(true);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 1500);
  };

  if (!property) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Property not found</Text>
      </ScreenContainer>
    );
  }

  if (isSent) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-6">
        <View className="flex-1 items-center justify-center">
          <View 
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: `${colors.success}20` }}
          >
            <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
          </View>
          <Text className="text-2xl font-bold text-foreground text-center mb-2">
            Invitation Sent!
          </Text>
          <Text className="text-base text-muted text-center mb-8">
            {tenantName} will receive an email with instructions to join the inspection.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.doneButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text className="text-white text-base font-semibold">Done</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-4">
            {/* Header */}
            <View className="flex-row items-center mb-6">
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
              </Pressable>
              <Text className="text-xl font-bold text-foreground ml-4">Invite Tenant</Text>
            </View>

            {/* Property Info */}
            <View 
              className="p-4 rounded-xl mb-6"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-sm text-muted mb-1">Property</Text>
              <Text className="text-base font-semibold text-foreground">
                {property.address}
              </Text>
            </View>

            {/* Form */}
            <View className="gap-4">
              {/* Tenant Name */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">Tenant Name *</Text>
                <TextInput
                  value={tenantName}
                  onChangeText={setTenantName}
                  placeholder="Enter tenant's full name"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                  style={[
                    styles.input,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: errors.name ? colors.error : colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
                {errors.name && (
                  <Text className="text-error text-sm mt-1">{errors.name}</Text>
                )}
              </View>

              {/* Tenant Email */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">Email Address *</Text>
                <TextInput
                  value={tenantEmail}
                  onChangeText={setTenantEmail}
                  placeholder="tenant@email.com"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={[
                    styles.input,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: errors.email ? colors.error : colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
                {errors.email && (
                  <Text className="text-error text-sm mt-1">{errors.email}</Text>
                )}
              </View>

              {/* Tenant Phone (Optional) */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">Phone Number (Optional)</Text>
                <TextInput
                  value={tenantPhone}
                  onChangeText={setTenantPhone}
                  placeholder="For SMS invite"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  style={[
                    styles.input,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
              </View>

              {/* Message Preview */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">Invitation Message</Text>
                <TextInput
                  value={message || `Hi ${tenantName || "[Name]"},\n\nI'm inviting you to complete the move-in inspection for ${property.address}.\n\nDownload PropertySnap and use the link below to get started.`}
                  onChangeText={setMessage}
                  placeholder="Customize your message..."
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={6}
                  style={[
                    styles.textArea,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Preview Card */}
            <View className="mt-6">
              <Text className="text-sm font-medium text-muted mb-3">PREVIEW</Text>
              <View 
                className="p-4 rounded-xl"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <View className="flex-row items-center mb-3">
                  <IconSymbol name="envelope.fill" size={20} color={colors.primary} />
                  <Text className="text-sm text-muted ml-2">Email to: {tenantEmail || "tenant@email.com"}</Text>
                </View>
                <Text className="text-base font-semibold text-foreground mb-2">
                  PropertySnap Inspection Invite
                </Text>
                <Text className="text-sm text-muted leading-5">
                  {tenantName || "Tenant"} has been invited to complete the move-in inspection for {property.address}.
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSendInvite}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: isLoading ? colors.muted : colors.primary },
                pressed && !isLoading && styles.buttonPressed,
              ]}
            >
              <IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-2">
                {isLoading ? "Sending..." : "Send Invitation"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: "top",
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  doneButton: {
    height: 48,
    paddingHorizontal: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
