import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, generateId, createDefaultCheckpoints, getDefaultRooms } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  scheduleInspectionReminder,
  scheduleDueDateAlert,
} from "@/lib/notification-service";

export default function PropertyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { state, dispatch } = useApp();

  const property = useMemo(() => {
    return state.properties.find(p => p.id === id);
  }, [state.properties, id]);

  if (!property) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Property not found</Text>
      </ScreenContainer>
    );
  }

  const activeInspection = property.inspections.find(i => i.status === "pending");
  const completedInspections = property.inspections.filter(i => i.status === "completed");

  const handleStartInspection = (type: "move-in" | "move-out" | "routine") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const newInspection = {
      id: generateId(),
      propertyId: property.id,
      type,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      completedAt: null,
      landlordSignature: null,
      landlordName: null,
      landlordSignedAt: null,
      tenantSignature: null,
      tenantName: null,
      tenantSignedAt: null,
      checkpoints: createDefaultCheckpoints(getDefaultRooms()),
    };

    dispatch({ type: "ADD_INSPECTION", payload: { propertyId: property.id, inspection: newInspection } });
    
    // Schedule notification reminders for the inspection (7 days from now as default due date)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    
    const typeLabel = type === "move-in" ? "Move-In" : type === "move-out" ? "Move-Out" : "Routine";
    
    // Schedule reminder notification
    scheduleInspectionReminder(
      newInspection.id,
      property.address,
      typeLabel,
      dueDate
    );
    
    // Schedule due date alert
    scheduleDueDateAlert(
      newInspection.id,
      property.address,
      typeLabel,
      dueDate
    );
    
    router.push(`/inspection/${newInspection.id}`);
  };

  const handleInviteTenant = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/inspection/invite?propertyId=${property.id}`);
  };

  const handleDeleteProperty = () => {
    Alert.alert(
      "Delete Property",
      "Are you sure you want to delete this property? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            dispatch({ type: "DELETE_PROPERTY", payload: property.id });
            router.back();
          },
        },
      ]
    );
  };

  const handleChangePhoto = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library to change the property photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      dispatch({
        type: "UPDATE_PROPERTY",
        payload: {
          ...property,
          photo: result.assets[0].uri,
        },
      });
    }
  };

  const handleTakePhoto = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your camera to take a property photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      dispatch({
        type: "UPDATE_PROPERTY",
        payload: {
          ...property,
          photo: result.assets[0].uri,
        },
      });
    }
  };

  const handlePhotoOptions = () => {
    Alert.alert(
      "Change Property Photo",
      "Choose how to update the property photo",
      [
        { text: "Take Photo", onPress: handleTakePhoto },
        { text: "Choose from Library", onPress: handleChangePhoto },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center px-6 py-4">
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text className="text-xl font-bold text-foreground ml-4 flex-1" numberOfLines={1}>
            Property Details
          </Text>
          <Pressable
            onPress={handleDeleteProperty}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <IconSymbol name="trash.fill" size={22} color={colors.error} />
          </Pressable>
        </View>

        {/* Property Image */}
        <Pressable onPress={handlePhotoOptions}>
          {property.photo ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: property.photo }} style={styles.propertyImage} />
              <View style={[styles.editPhotoOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                <IconSymbol name="camera.fill" size={24} color="#FFFFFF" />
                <Text style={styles.editPhotoText}>Tap to change photo</Text>
              </View>
            </View>
          ) : (
            <View 
              style={[styles.propertyImage, styles.placeholderImage]}
              className="items-center justify-center"
            >
              <IconSymbol name="camera.fill" size={48} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: 8, fontSize: 14 }}>Tap to add property photo</Text>
            </View>
          )}
        </Pressable>

        {/* Property Info */}
        <View className="px-6 py-4">
          <Text className="text-2xl font-bold text-foreground mb-2">
            {property.address}
          </Text>
          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center">
              <Text className="text-base text-muted">
                {property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-base text-muted">
                {property.bedrooms} bed • {property.bathrooms} bath
              </Text>
            </View>
          </View>
        </View>

        {/* Tenant Info */}
        <View className="px-6 mb-4">
          <View 
            className="p-4 rounded-xl"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-sm font-medium text-muted mb-2">TENANT</Text>
            {property.tenantName ? (
              <View>
                <Text className="text-base font-semibold text-foreground">
                  {property.tenantName}
                </Text>
                <Text className="text-sm text-muted mt-1">
                  {property.tenantEmail}
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center justify-between">
                <Text className="text-base text-muted">No tenant assigned</Text>
                <Pressable
                  onPress={handleInviteTenant}
                  style={({ pressed }) => [
                    styles.inviteButton,
                    { borderColor: colors.primary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text className="text-primary text-sm font-medium">Invite Tenant</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Active Inspection */}
        {activeInspection && (
          <View className="px-6 mb-4">
            <View 
              className="p-4 rounded-xl"
              style={{ backgroundColor: `${colors.warning}15` }}
            >
              <View className="flex-row items-center mb-2">
                <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.warning} />
                <Text className="text-sm font-medium text-warning ml-2">INSPECTION IN PROGRESS</Text>
              </View>
              <Text className="text-base text-foreground mb-3">
                {activeInspection.type === "move-in" ? "Move-In" : activeInspection.type === "move-out" ? "Move-Out" : "Routine"} inspection started on{" "}
                {new Date(activeInspection.createdAt).toLocaleDateString()}
              </Text>
              <Pressable
                onPress={() => router.push(`/inspection/${activeInspection.id}`)}
                style={({ pressed }) => [
                  styles.continueButton,
                  { backgroundColor: colors.warning },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text className="text-white text-base font-semibold">Continue Inspection</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Start Inspection Buttons */}
        {!activeInspection && (
          <View className="px-6 mb-4">
            <Text className="text-sm font-medium text-muted mb-3">START NEW INSPECTION</Text>
            <View style={styles.inspectionButtonsContainer}>
              <Pressable
                onPress={() => handleStartInspection("move-in")}
                style={({ pressed }) => [
                  styles.inspectionButton,
                  { backgroundColor: colors.primary },
                  pressed && styles.buttonPressed,
                ]}
              >
                <IconSymbol name="camera.fill" size={18} color="#FFFFFF" />
                <Text className="text-white text-sm font-semibold ml-2">Move-In</Text>
              </Pressable>
              <Pressable
                onPress={() => handleStartInspection("routine")}
                style={({ pressed }) => [
                  styles.inspectionButton,
                  { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
                  pressed && styles.buttonPressed,
                ]}
              >
                <IconSymbol name="camera.fill" size={18} color={colors.primary} />
                <Text className="text-primary text-sm font-semibold ml-2">Routine</Text>
              </Pressable>
              <Pressable
                onPress={() => handleStartInspection("move-out")}
                style={({ pressed }) => [
                  styles.inspectionButton,
                  { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
                  pressed && styles.buttonPressed,
                ]}
              >
                <IconSymbol name="camera.fill" size={18} color={colors.primary} />
                <Text className="text-primary text-sm font-semibold ml-2">Move-Out</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Completed Inspections */}
        {completedInspections.length > 0 && (
          <View className="px-6 mb-8">
            <Text className="text-sm font-medium text-muted mb-3">COMPLETED INSPECTIONS</Text>
            {completedInspections.map((inspection) => (
              <Pressable
                key={inspection.id}
                onPress={() => router.push(`/inspection/${inspection.id}`)}
                style={({ pressed }) => [
                  styles.completedCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View className="flex-row items-center">
                  <View 
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${colors.success}20` }}
                  >
                    <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-base font-medium text-foreground">
                      {inspection.type === "move-in" ? "Move-In" : inspection.type === "move-out" ? "Move-Out" : "Routine"} Inspection
                    </Text>
                    <Text className="text-sm text-muted">
                      {inspection.completedAt ? new Date(inspection.completedAt).toLocaleDateString() : "N/A"}
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color={colors.muted} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  imageContainer: {
    position: "relative",
  },
  propertyImage: {
    width: "100%",
    height: 200,
  },
  placeholderImage: {
    backgroundColor: "#F1F5F9",
  },
  editPhotoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  editPhotoText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  inviteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  continueButton: {
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  inspectionButtonsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  inspectionButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  completedCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
});
