import { useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, Property } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform, Linking } from "react-native";

export default function ManageTenantsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state } = useApp();
  
  // Get properties with tenants assigned
  const propertiesWithTenants = state.properties.filter(
    p => p.tenantName || p.tenantEmail || p.tenantPhone
  );
  
  // Get properties without tenants
  const propertiesWithoutTenants = state.properties.filter(
    p => !p.tenantName && !p.tenantEmail && !p.tenantPhone
  );

  const handleRequestInspection = (property: Property) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Navigate to property detail to start inspection
    Alert.alert(
      "Request Inspection",
      `Send inspection request to ${property.tenantName || "tenant"} for ${property.address}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Send Request", 
          onPress: () => {
            // In a real app, this would send a push notification
            Alert.alert("Request Sent", "Inspection request has been sent to the tenant.");
          }
        },
      ]
    );
  };

  const handleSendSMS = (property: Property) => {
    if (!property.tenantPhone) {
      Alert.alert("No Phone Number", "Please add a phone number for this tenant first.");
      return;
    }
    
    const tenantName = property.tenantName || "Tenant";
    const defaultMessage = `Hi ${tenantName}, we have a pending inspection for ${property.address}. Would you mind completing it when you get a chance? If not possible, could you let us know when this week we can send someone to perform it? Thanks!`;
    
    // Navigate to SMS compose screen with pre-filled message
    router.push({
      pathname: "/tenants/sms" as any,
      params: {
        propertyId: property.id,
        phone: property.tenantPhone,
        tenantName: tenantName,
        address: property.address,
        message: defaultMessage,
      },
    });
  };

  const renderPropertyItem = ({ item: property }: { item: Property }) => {
    const hasTenant = property.tenantName || property.tenantEmail;
    const pendingInspections = property.inspections.filter(i => i.status === "pending").length;
    
    return (
      <View style={[styles.propertyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.propertyHeader}>
          <View style={styles.propertyInfo}>
            <Text style={[styles.propertyAddress, { color: colors.foreground }]} numberOfLines={2}>
              {property.address}
            </Text>
            <Text style={[styles.propertyType, { color: colors.muted }]}>
              {property.propertyType} • {property.bedrooms} bed • {property.bathrooms} bath
            </Text>
          </View>
          {pendingInspections > 0 && (
            <View style={[styles.pendingBadge, { backgroundColor: "#D97706" }]}>
              <Text style={styles.pendingBadgeText}>{pendingInspections} pending</Text>
            </View>
          )}
        </View>
        
        {hasTenant ? (
          <View style={styles.tenantSection}>
            <View style={[styles.tenantInfo, { borderColor: colors.border }]}>
              <View style={[styles.tenantAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.tenantInitial}>
                  {(property.tenantName || "T").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.tenantDetails}>
                <Text style={[styles.tenantName, { color: colors.foreground }]}>
                  {property.tenantName || "Tenant"}
                </Text>
                {property.tenantEmail && (
                  <Text style={[styles.tenantContact, { color: colors.muted }]} numberOfLines={1}>
                    {property.tenantEmail}
                  </Text>
                )}
                {property.tenantPhone && (
                  <Text style={[styles.tenantContact, { color: colors.muted }]}>
                    {property.tenantPhone}
                  </Text>
                )}
              </View>
            </View>
            
            <View style={styles.actionButtons}>
              <Pressable
                onPress={() => handleRequestInspection(property)}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
              >
                <IconSymbol name="paperplane.fill" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Request Inspection</Text>
              </Pressable>
              
              <Pressable
                onPress={() => handleSendSMS(property)}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.smsButton,
                  { borderColor: colors.primary },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
              >
                <IconSymbol name="message.fill" size={16} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Send SMS</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push({ pathname: "/tenants/assign" as any, params: { propertyId: property.id } })}
            style={({ pressed }) => [
              styles.assignTenantButton,
              { borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="person.badge.plus" size={20} color={colors.primary} />
            <Text style={[styles.assignTenantText, { color: colors.primary }]}>
              Assign Tenant
            </Text>
          </Pressable>
        )}
      </View>
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
          Manage Tenants
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {state.properties.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="person.2" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No Properties Yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Add properties first to manage tenants
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...propertiesWithTenants, ...propertiesWithoutTenants]}
          keyExtractor={(item) => item.id}
          renderItem={renderPropertyItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            propertiesWithTenants.length > 0 ? (
              <Text style={[styles.sectionHeader, { color: colors.muted }]}>
                {propertiesWithTenants.length} {propertiesWithTenants.length === 1 ? "property" : "properties"} with tenants
              </Text>
            ) : null
          }
        />
      )}
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
  listContent: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  propertyCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  propertyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 12,
  },
  propertyInfo: {
    flex: 1,
    marginRight: 12,
  },
  propertyAddress: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  propertyType: {
    fontSize: 13,
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tenantSection: {
    padding: 16,
    paddingTop: 0,
  },
  tenantInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    marginBottom: 12,
  },
  tenantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tenantInitial: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tenantDetails: {
    flex: 1,
  },
  tenantName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  tenantContact: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  smsButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  assignTenantButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 8,
  },
  assignTenantText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
