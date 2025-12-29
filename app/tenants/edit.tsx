import { useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import { typography } from "@/constants/typography";
import * as Haptics from "expo-haptics";

export default function EditTenantScreen() {
  const router = useRouter();
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const colors = useColors();
  const { state, dispatch } = useApp();

  // Find the property
  const property = useMemo(() => {
    return state.properties.find(p => p.id === propertyId);
  }, [state.properties, propertyId]);

  // Initialize form state with existing tenant data
  const [tenantName, setTenantName] = useState(property?.tenantName || "");
  const [tenantEmail, setTenantEmail] = useState(property?.tenantEmail || "");
  const [tenantPhone, setTenantPhone] = useState(property?.tenantPhone || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!property) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={[typography.body, { color: colors.muted }]}>Property not found</Text>
      </ScreenContainer>
    );
  }

  const hasChanges = 
    tenantName !== (property.tenantName || "") ||
    tenantEmail !== (property.tenantEmail || "") ||
    tenantPhone !== (property.tenantPhone || "");

  const handleSave = () => {
    if (!tenantName.trim()) {
      Alert.alert("Name Required", "Please enter the tenant's name.");
      return;
    }

    setIsSaving(true);
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Update property with new tenant details
    const updatedProperty = {
      ...property,
      tenantName: tenantName.trim(),
      tenantEmail: tenantEmail.trim() || null,
      tenantPhone: tenantPhone.trim() || null,
    };

    dispatch({ type: "UPDATE_PROPERTY", payload: updatedProperty });

    setTimeout(() => {
      setIsSaving(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    }, 300);
  };

  const handleUnassignTenant = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      "Unassign Tenant",
      `Are you sure you want to remove ${property.tenantName || "this tenant"} from ${property.address}?\n\nThey will no longer have access to this property's inspections.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unassign",
          style: "destructive",
          onPress: () => {
            // Clear tenant data from property
            const updatedProperty = {
              ...property,
              tenantName: null,
              tenantEmail: null,
              tenantPhone: null,
            };

            dispatch({ type: "UPDATE_PROPERTY", payload: updatedProperty });

            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            Alert.alert(
              "Tenant Unassigned",
              "The tenant has been removed from this property.",
              [{ text: "OK", onPress: () => router.back() }]
            );
          },
        },
      ]
    );
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to go back?",
        [
          { text: "Stay", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Edit Tenant
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && { opacity: 0.7 },
              (!hasChanges || isSaving) && { opacity: 0.4 },
            ]}
          >
            <Text style={[styles.saveButtonText, { color: colors.primary }]}>
              {isSaving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Property Info */}
          <View style={[styles.propertyInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="building.2.fill" size={20} color={colors.primary} />
            <View style={styles.propertyDetails}>
              <Text style={[styles.propertyAddress, { color: colors.foreground }]} numberOfLines={2}>
                {property.address}
              </Text>
              <Text style={[styles.propertyType, { color: colors.muted }]}>
                {property.propertyType} • {property.bedrooms} bed • {property.bathrooms} bath
              </Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>
              TENANT DETAILS
            </Text>

            {/* Name Field */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Name <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border,
                    color: colors.foreground,
                  }
                ]}
                value={tenantName}
                onChangeText={setTenantName}
                placeholder="Enter tenant's full name"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Email Field */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border,
                    color: colors.foreground,
                  }
                ]}
                value={tenantEmail}
                onChangeText={setTenantEmail}
                placeholder="Enter tenant's email address"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Phone Field */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Phone Number
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border,
                    color: colors.foreground,
                  }
                ]}
                value={tenantPhone}
                onChangeText={setTenantPhone}
                placeholder="Enter tenant's phone number"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
              <Text style={[styles.fieldHint, { color: colors.muted }]}>
                Used for SMS notifications when requesting inspections
              </Text>
            </View>
          </View>

          {/* Danger Zone */}
          <View style={styles.dangerSection}>
            <Text style={[styles.sectionTitle, { color: colors.error }]}>
              DANGER ZONE
            </Text>
            
            <Pressable
              onPress={handleUnassignTenant}
              style={({ pressed }) => [
                styles.dangerButton,
                { borderColor: colors.error },
                pressed && { opacity: 0.8, backgroundColor: `${colors.error}10` },
              ]}
            >
              <IconSymbol name="person.badge.plus" size={20} color={colors.error} />
              <View style={styles.dangerButtonContent}>
                <Text style={[styles.dangerButtonTitle, { color: colors.error }]}>
                  Unassign Tenant
                </Text>
                <Text style={[styles.dangerButtonSubtitle, { color: colors.muted }]}>
                  Remove tenant from this property. They will lose access to all inspections.
                </Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  propertyInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  propertyDetails: {
    flex: 1,
  },
  propertyAddress: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  propertyType: {
    fontSize: 13,
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  fieldHint: {
    fontSize: 12,
    marginTop: 6,
  },
  dangerSection: {
    marginTop: 8,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  dangerButtonContent: {
    flex: 1,
  },
  dangerButtonTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  dangerButtonSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
