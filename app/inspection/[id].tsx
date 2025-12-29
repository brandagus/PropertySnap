import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image, TextInput, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, Checkpoint, ConditionRating, generateId } from "@/lib/app-context";
import { generateInspectionPDF, printInspectionPDF } from "@/lib/pdf-service";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { extractPhotoTimestamp } from "@/lib/exif-service";

const conditionOptions: { value: ConditionRating; label: string; description: string; color: string }[] = [
  { value: "pass", label: "Pass", description: "No issues, everything is fine", color: "#2D5C3F" },
  { value: "pass-attention", label: "Pass - Needs Attention", description: "Minor issues, not urgent", color: "#D97706" },
  { value: "fail", label: "Fail - Action Required", description: "Urgent repair needed", color: "#991B1B" },
];

export default function InspectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { state, dispatch } = useApp();
  // Start with NO room expanded (collapsed by default)
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [showConditionPicker, setShowConditionPicker] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingRoomName, setEditingRoomName] = useState<string | null>(null);

  // Find the inspection and its property
  const { inspection, property } = useMemo(() => {
    for (const prop of state.properties) {
      const insp = prop.inspections.find(i => i.id === id);
      if (insp) {
        return { inspection: insp, property: prop };
      }
    }
    return { inspection: null, property: null };
  }, [state.properties, id]);

  if (!inspection || !property) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Inspection not found</Text>
      </ScreenContainer>
    );
  }

  // Group checkpoints by room
  const checkpointsByRoom = useMemo(() => {
    const grouped: Record<string, Checkpoint[]> = {};
    inspection.checkpoints.forEach(cp => {
      if (!grouped[cp.roomName]) {
        grouped[cp.roomName] = [];
      }
      grouped[cp.roomName].push(cp);
    });
    return grouped;
  }, [inspection.checkpoints]);

  const completedCount = inspection.checkpoints.filter(cp => cp.landlordPhoto).length;
  const totalCount = inspection.checkpoints.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const roomNames = Object.keys(checkpointsByRoom);

  const handleTakePhoto = async (checkpoint: Checkpoint) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Extract EXIF timestamp from the photo
      const timestampData = await extractPhotoTimestamp(result.assets[0].uri);
      
      const updatedCheckpoint: Checkpoint = {
        ...checkpoint,
        landlordPhoto: result.assets[0].uri,
        timestamp: new Date().toISOString(),
        landlordPhotoTimestamp: {
          captureDate: timestampData.captureDate,
          isExifAvailable: timestampData.isExifAvailable,
          uploadDate: timestampData.uploadDate,
        },
      };
      
      dispatch({
        type: "UPDATE_CHECKPOINT",
        payload: { inspectionId: inspection.id, checkpoint: updatedCheckpoint },
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handlePickPhoto = async (checkpoint: Checkpoint) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Extract EXIF timestamp from the photo
      const timestampData = await extractPhotoTimestamp(result.assets[0].uri);
      
      const updatedCheckpoint: Checkpoint = {
        ...checkpoint,
        landlordPhoto: result.assets[0].uri,
        timestamp: new Date().toISOString(),
        landlordPhotoTimestamp: {
          captureDate: timestampData.captureDate,
          isExifAvailable: timestampData.isExifAvailable,
          uploadDate: timestampData.uploadDate,
        },
      };
      
      dispatch({
        type: "UPDATE_CHECKPOINT",
        payload: { inspectionId: inspection.id, checkpoint: updatedCheckpoint },
      });
    }
  };

  const handleConditionChange = (checkpoint: Checkpoint, condition: ConditionRating) => {
    const updatedCheckpoint: Checkpoint = {
      ...checkpoint,
      landlordCondition: condition,
    };
    
    dispatch({
      type: "UPDATE_CHECKPOINT",
      payload: { inspectionId: inspection.id, checkpoint: updatedCheckpoint },
    });
    setShowConditionPicker(null);
  };

  const handleNotesChange = (checkpoint: Checkpoint, notes: string) => {
    const updatedCheckpoint: Checkpoint = {
      ...checkpoint,
      notes,
    };
    
    dispatch({
      type: "UPDATE_CHECKPOINT",
      payload: { inspectionId: inspection.id, checkpoint: updatedCheckpoint },
    });
  };

  const handleAddCheckpoint = (roomName: string) => {
    const newCheckpoint: Checkpoint = {
      id: generateId(),
      roomName,
      title: "New Checkpoint",
      landlordPhoto: null,
      tenantPhoto: null,
      moveOutPhoto: null,
      landlordCondition: null,
      tenantCondition: null,
      moveOutCondition: null,
      notes: "",
      timestamp: null,
      landlordPhotoTimestamp: null,
      tenantPhotoTimestamp: null,
      moveOutPhotoTimestamp: null,
    };

    const updatedInspection = {
      ...inspection,
      checkpoints: [...inspection.checkpoints, newCheckpoint],
    };

    dispatch({ type: "UPDATE_INSPECTION", payload: updatedInspection });
  };

  // Delete entire room (all checkpoints in that room)
  const handleDeleteRoom = (roomName: string) => {
    Alert.alert(
      "Delete Room",
      `Are you sure you want to delete "${roomName}" and all its checkpoints? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedCheckpoints = inspection.checkpoints.filter(
              cp => cp.roomName !== roomName
            );
            const updatedInspection = {
              ...inspection,
              checkpoints: updatedCheckpoints,
            };
            dispatch({ type: "UPDATE_INSPECTION", payload: updatedInspection });
            setExpandedRoom(null);
            
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  // Rename room (update all checkpoints with that room name)
  const handleRenameRoom = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) {
      setEditingRoomName(null);
      return;
    }

    const updatedCheckpoints = inspection.checkpoints.map(cp =>
      cp.roomName === oldName ? { ...cp, roomName: newName.trim() } : cp
    );
    const updatedInspection = {
      ...inspection,
      checkpoints: updatedCheckpoints,
    };
    dispatch({ type: "UPDATE_INSPECTION", payload: updatedInspection });
    setEditingRoomName(null);
    setExpandedRoom(newName.trim());
  };

  const handleCompleteInspection = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(`/inspection/signature?inspectionId=${inspection.id}`);
  };

  // PDF Generation Handlers
  const handleExportPDF = async () => {
    setShowExportMenu(false);
    setIsGeneratingPDF(true);
    
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      const result = await generateInspectionPDF(property, inspection);
      
      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        throw new Error(result.error || "Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert(
        "Export Failed",
        "Unable to generate the PDF report. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrintPDF = async () => {
    setShowExportMenu(false);
    setIsGeneratingPDF(true);
    
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      const result = await printInspectionPDF(property, inspection);
      if (!result.success) {
        throw new Error(result.error || "Failed to print PDF");
      }
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error printing PDF:", error);
      Alert.alert(
        "Print Failed",
        "Unable to print the report. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const renderCheckpoint = (checkpoint: Checkpoint) => (
    <View 
      key={checkpoint.id}
      className="mb-4 p-4 rounded-xl"
      style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}
    >
      {/* Checkpoint Title */}
      <TextInput
        value={checkpoint.title}
        onChangeText={(text) => {
          const updated = { ...checkpoint, title: text };
          dispatch({
            type: "UPDATE_CHECKPOINT",
            payload: { inspectionId: inspection.id, checkpoint: updated },
          });
        }}
        className="text-base font-semibold text-foreground mb-3"
        style={{ color: colors.foreground }}
        placeholder="Checkpoint title"
        placeholderTextColor={colors.muted}
      />

      {/* Photo Section */}
      {checkpoint.landlordPhoto ? (
        <View className="relative mb-3">
          <Image 
            source={{ uri: checkpoint.landlordPhoto }} 
            style={styles.checkpointPhoto}
          />
          <Pressable
            onPress={() => {
              const updated = { ...checkpoint, landlordPhoto: null };
              dispatch({
                type: "UPDATE_CHECKPOINT",
                payload: { inspectionId: inspection.id, checkpoint: updated },
              });
            }}
            style={[styles.removePhotoButton, { backgroundColor: colors.error }]}
          >
            <IconSymbol name="xmark" size={14} color="#FFFFFF" />
          </Pressable>
          {/* Photo Timestamp - EXIF verified or upload fallback */}
          {checkpoint.landlordPhotoTimestamp ? (
            <View style={[
              styles.timestampBadge,
              !checkpoint.landlordPhotoTimestamp.isExifAvailable && styles.timestampWarning
            ]}>
              {checkpoint.landlordPhotoTimestamp.isExifAvailable ? (
                <>
                  <IconSymbol name="checkmark.shield.fill" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text className="text-xs text-white">
                    Captured: {new Date(checkpoint.landlordPhotoTimestamp.captureDate!).toLocaleString()}
                  </Text>
                </>
              ) : (
                <>
                  <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#FCD34D" style={{ marginRight: 4 }} />
                  <Text className="text-xs text-white">
                    Upload date - original timestamp unavailable
                  </Text>
                </>
              )}
            </View>
          ) : checkpoint.timestamp && (
            <View style={[styles.timestampBadge, styles.timestampWarning]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#FCD34D" style={{ marginRight: 4 }} />
              <Text className="text-xs text-white">
                Upload date - original timestamp unavailable
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View className="flex-row gap-2 mb-3">
          <Pressable
            onPress={() => handleTakePhoto(checkpoint)}
            style={({ pressed }) => [
              styles.photoButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9 },
            ]}
          >
            <IconSymbol name="camera.fill" size={18} color="#FFFFFF" />
            <Text className="text-white text-sm font-medium ml-2">Take Photo</Text>
          </Pressable>
          <Pressable
            onPress={() => handlePickPhoto(checkpoint)}
            style={({ pressed }) => [
              styles.photoButton,
              { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="photo.fill" size={18} color={colors.primary} />
            <Text className="text-sm font-medium ml-2" style={{ color: colors.primary }}>Gallery</Text>
          </Pressable>
        </View>
      )}

      {/* Condition Picker */}
      <View className="mb-3">
        <Text className="text-sm text-muted mb-2">Condition Assessment</Text>
        <Pressable
          onPress={() => setShowConditionPicker(
            showConditionPicker === checkpoint.id ? null : checkpoint.id
          )}
          style={[
            styles.conditionButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {checkpoint.landlordCondition ? (
            <View className="flex-row items-center">
              <View 
                style={[
                  styles.conditionDot, 
                  { backgroundColor: conditionOptions.find(c => c.value === checkpoint.landlordCondition)?.color || colors.muted }
                ]} 
              />
              <Text className="text-foreground ml-2">
                {conditionOptions.find(c => c.value === checkpoint.landlordCondition)?.label || "Unknown"}
              </Text>
            </View>
          ) : (
            <Text className="text-muted">Select condition</Text>
          )}
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </Pressable>
        
        {showConditionPicker === checkpoint.id && (
          <View 
            className="mt-2 rounded-lg overflow-hidden"
            style={{ borderWidth: 1, borderColor: colors.border }}
          >
            {conditionOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleConditionChange(checkpoint, option.value)}
                style={({ pressed }) => [
                  styles.conditionOption,
                  { backgroundColor: pressed ? colors.border : colors.surface },
                ]}
              >
                <View style={[styles.conditionDot, { backgroundColor: option.color }]} />
                <View className="ml-3 flex-1">
                  <Text className="text-foreground font-medium">{option.label}</Text>
                  <Text className="text-muted text-xs">{option.description}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Notes */}
      <View>
        <Text className="text-sm text-muted mb-2">Notes (optional)</Text>
        <TextInput
          value={checkpoint.notes}
          onChangeText={(text) => handleNotesChange(checkpoint, text)}
          placeholder="Add notes about this area..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={2}
          style={[
            styles.notesInput,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
          ]}
        />
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
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
        <View className="flex-1 ml-4">
          <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
            {inspection.type === "move-in" ? "Move-in" : "Move-out"} Inspection
          </Text>
          <Text className="text-sm text-muted" numberOfLines={1}>
            {property.address}
          </Text>
        </View>
        
        {/* Export Button */}
        <Pressable
          onPress={() => setShowExportMenu(!showExportMenu)}
          disabled={isGeneratingPDF}
          style={({ pressed }) => [
            styles.exportButton,
            { backgroundColor: colors.accent },
            pressed && { opacity: 0.9 },
            isGeneratingPDF && { opacity: 0.6 },
          ]}
        >
          {isGeneratingPDF ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <IconSymbol name="doc.fill" size={16} color="#FFFFFF" />
              <Text className="text-white text-sm font-medium ml-1">PDF</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Export Menu Dropdown */}
      {showExportMenu && (
        <View 
          className="absolute right-6 z-50 rounded-lg overflow-hidden"
          style={[
            styles.exportMenu,
            { 
              backgroundColor: colors.background,
              borderColor: colors.border,
              top: 70,
            }
          ]}
        >
          <Pressable
            onPress={handleExportPDF}
            style={({ pressed }) => [
              styles.exportMenuItem,
              { backgroundColor: pressed ? colors.surface : colors.background },
            ]}
          >
            <IconSymbol name="square.and.arrow.up" size={18} color={colors.primary} />
            <View className="ml-3">
              <Text className="text-foreground font-medium">Share PDF</Text>
              <Text className="text-muted text-xs">Export and share report</Text>
            </View>
          </Pressable>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Pressable
            onPress={handlePrintPDF}
            style={({ pressed }) => [
              styles.exportMenuItem,
              { backgroundColor: pressed ? colors.surface : colors.background },
            ]}
          >
            <IconSymbol name="printer.fill" size={18} color={colors.primary} />
            <View className="ml-3">
              <Text className="text-foreground font-medium">Print Report</Text>
              <Text className="text-muted text-xs">Print directly</Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Progress Bar */}
      <View className="px-6 mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm text-muted">Progress</Text>
          <Text className="text-sm font-medium text-foreground">
            {completedCount}/{totalCount} photos
          </Text>
        </View>
        <View 
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: colors.border }}
        >
          <View 
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: colors.primary }}
          />
        </View>
      </View>

      {/* Room List - Collapsed by default */}
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-6 pb-32">
          {roomNames.map((roomName) => {
            const checkpoints = checkpointsByRoom[roomName];
            const isExpanded = expandedRoom === roomName;
            const roomCompleted = checkpoints.filter(cp => cp.landlordPhoto).length;
            
            return (
              <View key={roomName} className="mb-3">
                {/* Room Header - Collapsed State */}
                <Pressable
                  onPress={() => setExpandedRoom(isExpanded ? null : roomName)}
                  style={({ pressed }) => [
                    styles.roomHeader,
                    { 
                      backgroundColor: isExpanded ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: isExpanded ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <View className="flex-row items-center flex-1">
                    <IconSymbol 
                      name={isExpanded ? "chevron.right" : "chevron.right"} 
                      size={18} 
                      color={isExpanded ? "#FFFFFF" : colors.muted}
                      style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                    />
                    {editingRoomName === roomName ? (
                      <TextInput
                        autoFocus
                        defaultValue={roomName}
                        onEndEditing={(e) => handleRenameRoom(roomName, e.nativeEvent.text)}
                        onSubmitEditing={(e) => handleRenameRoom(roomName, e.nativeEvent.text)}
                        style={[
                          styles.roomNameInput,
                          { color: isExpanded ? "#FFFFFF" : colors.foreground },
                        ]}
                        returnKeyType="done"
                      />
                    ) : (
                      <Text 
                        className="text-base font-semibold ml-3"
                        style={{ color: isExpanded ? "#FFFFFF" : colors.foreground }}
                      >
                        {roomName}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center">
                    {/* Progress badge */}
                    <View 
                      style={[
                        styles.progressBadge,
                        { 
                          backgroundColor: isExpanded ? "rgba(255,255,255,0.2)" : colors.background,
                          borderColor: isExpanded ? "transparent" : colors.border,
                        }
                      ]}
                    >
                      <Text 
                        className="text-xs font-medium"
                        style={{ color: isExpanded ? "#FFFFFF" : colors.muted }}
                      >
                        {roomCompleted}/{checkpoints.length}
                      </Text>
                    </View>
                  </View>
                </Pressable>

                {/* Expanded Room Content */}
                {isExpanded && (
                  <View 
                    className="mt-2 p-4 rounded-xl"
                    style={{ backgroundColor: colors.surface }}
                  >
                    {/* Room Actions */}
                    <View className="flex-row gap-2 mb-4">
                      <Pressable
                        onPress={() => setEditingRoomName(roomName)}
                        style={({ pressed }) => [
                          styles.roomActionButton,
                          { borderColor: colors.border },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <IconSymbol name="pencil" size={16} color={colors.primary} />
                        <Text className="text-sm ml-2" style={{ color: colors.primary }}>Rename</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteRoom(roomName)}
                        style={({ pressed }) => [
                          styles.roomActionButton,
                          { borderColor: colors.error },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <IconSymbol name="trash.fill" size={16} color={colors.error} />
                        <Text className="text-sm ml-2" style={{ color: colors.error }}>Delete Room</Text>
                      </Pressable>
                    </View>

                    {/* Checkpoints */}
                    {checkpoints.map(renderCheckpoint)}
                    
                    {/* Add Checkpoint Button */}
                    <Pressable
                      onPress={() => handleAddCheckpoint(roomName)}
                      style={({ pressed }) => [
                        styles.addCheckpointButton,
                        { borderColor: colors.border },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <IconSymbol name="plus" size={18} color={colors.primary} />
                      <Text className="text-sm font-medium ml-2" style={{ color: colors.primary }}>
                        Add Checkpoint
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {/* Add New Room */}
          <Pressable
            onPress={() => {
              const newRoomName = `Room ${roomNames.length + 1}`;
              handleAddCheckpoint(newRoomName);
              setExpandedRoom(newRoomName);
            }}
            style={({ pressed }) => [
              styles.addRoomButton,
              { borderColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="plus" size={20} color={colors.primary} />
            <Text className="text-base font-medium ml-2" style={{ color: colors.primary }}>
              Add New Room
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Complete Button */}
      <View 
        className="absolute bottom-0 left-0 right-0 px-6 py-4"
        style={{ backgroundColor: colors.background }}
      >
        <Pressable
          onPress={handleCompleteInspection}
          disabled={completedCount === 0}
          style={({ pressed }) => [
            styles.completeButton,
            { backgroundColor: completedCount === 0 ? colors.muted : colors.success },
            pressed && completedCount > 0 && { opacity: 0.9 },
          ]}
        >
          <Text className="text-white text-base font-semibold">
            Complete & Sign Inspection
          </Text>
        </Pressable>
      </View>

      {/* Overlay to close export menu */}
      {showExportMenu && (
        <Pressable
          onPress={() => setShowExportMenu(false)}
          style={StyleSheet.absoluteFill}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportMenu: {
    width: 200,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  exportMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
  },
  roomNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
    padding: 0,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  roomActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkpointPhoto: {
    width: "100%",
    height: 180,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timestampBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(45,92,63,0.9)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  timestampWarning: {
    backgroundColor: "rgba(139,38,53,0.9)",
  },
  photoButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  conditionButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  conditionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  conditionOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E6E3",
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
  },
  addCheckpointButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addRoomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    marginTop: 8,
  },
  completeButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
