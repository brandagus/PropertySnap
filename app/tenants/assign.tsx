import { useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import * as Haptics from "expo-haptics";

export default function AssignTenantScreen() {
  const router = useRouter();
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const colors = useColors();
  const { state, dispatch } = useApp();
  
  const property = state.properties.find(p => p.id === propertyId);
  
  const [tenantName, setTenantName] = useState(property?.tenantName || "");
  const [tenantEmail, setTenantEmail] = useState(property?.tenantEmail || "");
  const [tenantPhone, setTenantPhone] = useState(property?.tenantPhone || "");
  const [isLoading, setIsLoading] = useState(false);

  if (!property) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Property not found</Text>
      </ScreenContainer>
    );
  }

  const handleSave = () => {
    if (!tenantName.trim()) {
      Alert.alert("Required", "Please enter the tenant's name");
      return;
    }
    
    setIsLoading(true);
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const updatedProperty = {
      ...property,
      tenantName: tenantName.trim(),
      tenantEmail: tenantEmail.trim() || null,
      tenantPhone: tenantPhone.trim() || null,
    };
    
    dispatch({ type: "UPDATE_PROPERTY", payload: updatedProperty });
    
    setTimeout(() => {
      setIsLoading(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    }, 300);
  };

  const handleRemoveTenant = () => {
    Alert.alert(
      "Remove Tenant",
      `Are you sure you want to remove ${property.tenantName || "this tenant"} from this property?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const updatedProperty = {
              ...property,
              tenantId: null,
              tenantName: null,
              tenantEmail: null,
              tenantPhone: null,
            };
            dispatch({ type: "UPDATE_PROPERTY", payload: updatedProperty });
            router.back();
          },
        },
      ]
    );
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
          {property.tenantName ? "Edit Tenant" : "Assign Tenant"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Property Info */}
          <View style={[styles.propertyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.propertyLabel, { color: colors.muted }]}>Property</Text>
            <Text style={[styles.propertyAddress, { color: colors.foreground }]}>
              {property.address}
            </Text>
            <Text style={[styles.propertyType, { color: colors.muted }]}>
              {property.propertyType} • {property.bedrooms} bed • {property.bathrooms} bath
            </Text>
          </View>

          {/* Tenant Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Tenant Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
                ]}
                value={tenantName}
                onChangeText={setTenantName}
                placeholder="Enter tenant's full name"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
                ]}
                value={tenantEmail}
                onChangeText={setTenantEmail}
                placeholder="tenant@email.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Phone Number</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
                ]}
                value={tenantPhone}
                onChangeText={setTenantPhone}
                placeholder="0400 000 000"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
              />
              <Text style={[styles.helperText, { color: colors.muted }]}>
                Required for SMS reminders
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              isLoading && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? "Saving..." : "Save Tenant"}
            </Text>
          </Pressable>

          {/* Remove Tenant Button */}
          {property.tenantName && (
            <Pressable
              onPress={handleRemoveTenant}
              style={({ pressed }) => [
                styles.removeButton,
                { borderColor: "#991B1B" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol name="trash" size={18} color="#991B1B" />
              <Text style={styles.removeButtonText}>Remove Tenant</Text>
            </Pressable>
          )}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  propertyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  propertyLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  propertyAddress: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  propertyType: {
    fontSize: 13,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  removeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#991B1B",
  },
});
