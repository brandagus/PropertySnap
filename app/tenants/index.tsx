import { useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, Property, generateId, createDefaultCheckpoints, getDefaultRooms, InspectionType } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform, Linking } from "react-native";
import {
  sendTenantActionRequired,
  scheduleInspectionReminder,
  scheduleDueDateAlert,
} from "@/lib/notification-service";
import { DatePickerModal } from "@/components/date-picker-modal";

export default function ManageTenantsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, dispatch } = useApp();
  
  // State for date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingInspection, setPendingInspection] = useState<{
    property: Property;
    type: InspectionType;
    tenantName: string;
  } | null>(null);
  
  // Get properties with tenants assigned
  const propertiesWithTenants = state.properties.filter(
    p => p.tenantName || p.tenantEmail || p.tenantPhone
  );
  
  // Get properties without tenants
  const propertiesWithoutTenants = state.properties.filter(
    p => !p.tenantName && !p.tenantEmail && !p.tenantPhone
  );

  const handleRequestInspection = async (property: Property) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const tenantName = property.tenantName || "Tenant";
    
    // First, show inspection type selection
    Alert.alert(
      "Select Inspection Type",
      `What type of inspection would you like to request for ${property.address}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move-In",
          onPress: () => createInspectionWithType(property, "move-in", tenantName),
        },
        {
          text: "Move-Out",
          onPress: () => createInspectionWithType(property, "move-out", tenantName),
        },
        {
          text: "Routine",
          onPress: () => createInspectionWithType(property, "routine", tenantName),
        },
      ]
    );
  };

  const createInspectionWithType = (
    property: Property,
    inspectionType: InspectionType,
    tenantName: string
  ) => {
    // Store pending inspection details and show date picker
    setPendingInspection({ property, type: inspectionType, tenantName });
    setShowDatePicker(true);
  };

  const handleDateSelected = async (selectedDate: Date) => {
    if (!pendingInspection) return;
    
    const { property, type: inspectionType, tenantName } = pendingInspection;
    
    // Format type for display
    const typeDisplay = inspectionType === "move-in" ? "Move-In" 
      : inspectionType === "move-out" ? "Move-Out" 
      : "Routine";

    // 1. Create new pending inspection with selected type and due date
    const newInspection = {
      id: generateId(),
      propertyId: property.id,
      type: inspectionType,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      completedAt: null,
      dueDate: selectedDate.toISOString(),
      landlordSignature: null,
      landlordName: null,
      landlordSignedAt: null,
      tenantSignature: null,
      tenantName: null,
      tenantSignedAt: null,
      checkpoints: createDefaultCheckpoints(getDefaultRooms()),
    };
    
    dispatch({ type: "ADD_INSPECTION", payload: { propertyId: property.id, inspection: newInspection } });
    
    // 2. Schedule notification reminders using selected due date
    scheduleInspectionReminder(
      newInspection.id,
      property.address,
      typeDisplay,
      selectedDate
    );
    
    scheduleDueDateAlert(
      newInspection.id,
      property.address,
      typeDisplay,
      selectedDate
    );
    
    // 3. Send push notification to tenant
    await sendTenantActionRequired(
      newInspection.id,
      property.address,
      `Your landlord has requested a ${typeDisplay} inspection for ${property.address}. Due by ${selectedDate.toLocaleDateString()}.`
    );
    
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Clear pending state
    setPendingInspection(null);
    
    // 4. Ask if they want to send SMS
    Alert.alert(
      "Inspection Created",
      `A ${typeDisplay} inspection has been created with due date ${selectedDate.toLocaleDateString()}. Would you also like to send an SMS to ${tenantName}?`,
      [
        { text: "No, I'm Done", style: "cancel" },
        {
          text: "Send SMS",
          onPress: () => openSMSAppWithType(property, typeDisplay, selectedDate),
        },
      ]
    );
  };
  
  const openSMSAppWithType = (property: Property, inspectionType: string, dueDate?: Date) => {
    const tenantName = property.tenantName || "Tenant";
    const phone = property.tenantPhone || "";
    const dueDateText = dueDate ? ` Please complete by ${dueDate.toLocaleDateString()}.` : "";
    const message = `Hey ${tenantName}, your landlord has requested a ${inspectionType} inspection for ${property.address}.${dueDateText} Please open the PropertySnap app to get started.`;
    
    if (!phone) {
      Alert.alert("No Phone Number", "This tenant doesn't have a phone number on file.");
      return;
    }
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Use different URL schemes for iOS and Android
    let smsUrl: string;
    if (Platform.OS === "ios") {
      smsUrl = `sms:${phone}&body=${encodedMessage}`;
    } else if (Platform.OS === "android") {
      smsUrl = `sms:${phone}?body=${encodedMessage}`;
    } else {
      smsUrl = `sms:${phone}?body=${encodedMessage}`;
    }
    
    Linking.canOpenURL(smsUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(smsUrl);
        } else {
          Alert.alert("SMS Not Available", "Unable to open the messaging app on this device.");
        }
      })
      .catch((err) => {
        console.error("Error opening SMS app:", err);
        Alert.alert("Error", "Failed to open the messaging app.");
      });
  };

  const openSMSApp = (property: Property) => {
    const tenantName = property.tenantName || "Tenant";
    const phone = property.tenantPhone || "";
    const message = `Hey ${tenantName}, your landlord has requested you to complete a property inspection for ${property.address}. Please open the PropertySnap app to get started.`;
    
    if (!phone) {
      Alert.alert("No Phone Number", "This tenant doesn't have a phone number on file.");
      return;
    }
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Use different URL schemes for iOS and Android
    let smsUrl: string;
    if (Platform.OS === "ios") {
      // iOS uses sms: with &body= for the message
      smsUrl = `sms:${phone}&body=${encodedMessage}`;
    } else if (Platform.OS === "android") {
      // Android uses sms: with ?body= for the message
      smsUrl = `sms:${phone}?body=${encodedMessage}`;
    } else {
      // Web fallback
      smsUrl = `sms:${phone}?body=${encodedMessage}`;
    }
    
    Linking.canOpenURL(smsUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(smsUrl);
        } else {
          Alert.alert("SMS Not Available", "Unable to open the messaging app on this device.");
        }
      })
      .catch((err) => {
        console.error("Error opening SMS app:", err);
        Alert.alert("Error", "Failed to open the messaging app.");
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
                onPress={() => router.push({ pathname: "/tenants/edit" as any, params: { propertyId: property.id } })}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.editButton,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
              >
                <IconSymbol name="pencil" size={16} color={colors.foreground} />
                <Text style={[styles.actionButtonText, { color: colors.foreground }]}>Edit Tenant</Text>
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

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => {
          setShowDatePicker(false);
          setPendingInspection(null);
        }}
        onSelect={handleDateSelected}
        initialDate={(() => {
          const d = new Date();
          d.setDate(d.getDate() + 7);
          return d;
        })()}
        minimumDate={new Date()}
        title="Select Due Date"
      />
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
  editButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
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
