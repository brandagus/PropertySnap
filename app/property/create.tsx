import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp, generateId, PropertyType } from "@/lib/app-context";
import { fonts, design } from "@/constants/typography";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
  { value: "studio", label: "Studio" },
];

export default function CreatePropertyScreen() {
  const router = useRouter();
  const { dispatch } = useApp();
  
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("apartment");
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ address?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
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
      setPhoto(result.assets[0].uri);
    }
  };

  const handleCreateProperty = () => {
    const newErrors: typeof errors = {};
    
    if (!address.trim()) {
      newErrors.address = "Address is required";
    } else if (address.length > 200) {
      newErrors.address = "Address must be less than 200 characters";
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

    const newProperty = {
      id: generateId(),
      address: address.trim(),
      propertyType,
      bedrooms,
      bathrooms,
      photo, // Legacy field
      profilePhoto: photo, // Front of house photo for PDF cover
      tenantId: null,
      tenantName: null,
      tenantEmail: null,
      tenantPhone: null,
      inspections: [],
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: "ADD_PROPERTY", payload: newProperty });
    
    setTimeout(() => {
      setIsLoading(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    }, 500);
  };

  const renderNumberPicker = (
    label: string,
    value: number,
    setValue: (v: number) => void,
    min: number,
    max: number
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.numberPickerRow}>
        <Pressable
          onPress={() => value > min && setValue(value - 1)}
          style={({ pressed }) => [
            styles.numberButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.numberButtonText}>−</Text>
        </Pressable>
        <View style={styles.numberDisplay}>
          <Text style={styles.numberValue}>{value}</Text>
        </View>
        <Pressable
          onPress={() => value < max && setValue(value + 1)}
          style={({ pressed }) => [
            styles.numberButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.numberButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="chevron.left" size={24} color="#1C2839" />
              </Pressable>
              <Text style={styles.headerTitle}>Add Property</Text>
            </View>

            {/* Property Profile Photo - Front of House */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Property Photo (Front of House)</Text>
              <Text style={styles.helperText}>This photo will appear on inspection report covers</Text>
              {photo ? (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: photo }} style={styles.photoPreview} />
                  <Pressable
                    onPress={() => setPhoto(null)}
                    style={styles.removePhotoButton}
                  >
                    <IconSymbol name="xmark" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.photoButtonsRow}>
                  <Pressable
                    onPress={handleTakePhoto}
                    style={({ pressed }) => [
                      styles.photoButton,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <IconSymbol name="camera.fill" size={24} color="#8B2635" />
                    <Text style={styles.photoButtonText}>Take Photo</Text>
                  </Pressable>
                  <Pressable
                    onPress={handlePickImage}
                    style={({ pressed }) => [
                      styles.photoButton,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <IconSymbol name="photo.fill" size={24} color="#8B2635" />
                    <Text style={styles.photoButtonText}>Choose Photo</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Property Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Enter the full address"
                placeholderTextColor="#A8A8A8"
                multiline
                numberOfLines={2}
                style={[
                  styles.input,
                  styles.textArea,
                  errors.address && styles.inputError,
                ]}
              />
              {errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}
            </View>

            {/* Property Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Property Type</Text>
              <Pressable
                onPress={() => setShowTypePicker(!showTypePicker)}
                style={styles.selectButton}
              >
                <Text style={styles.selectButtonText}>
                  {propertyTypes.find(t => t.value === propertyType)?.label}
                </Text>
                <IconSymbol name="chevron.right" size={18} color="#6B6B6B" />
              </Pressable>
              {showTypePicker && (
                <View style={styles.typePickerContainer}>
                  {propertyTypes.map((type) => (
                    <Pressable
                      key={type.value}
                      onPress={() => {
                        setPropertyType(type.value);
                        setShowTypePicker(false);
                      }}
                      style={({ pressed }) => [
                        styles.typeOption,
                        propertyType === type.value && styles.typeOptionSelected,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        propertyType === type.value && styles.typeOptionTextSelected,
                      ]}>
                        {type.label}
                      </Text>
                      {propertyType === type.value && (
                        <IconSymbol name="checkmark.circle.fill" size={20} color="#8B2635" />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Bedrooms */}
            {renderNumberPicker("Bedrooms", bedrooms, setBedrooms, 0, 10)}

            {/* Bathrooms */}
            {renderNumberPicker("Bathrooms", bathrooms, setBathrooms, 1, 5)}

            {/* Submit Button */}
            <Pressable
              onPress={handleCreateProperty}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                isLoading && styles.submitButtonDisabled,
                pressed && !isLoading && styles.buttonPressed,
              ]}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? "Creating..." : "Create Property"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: "#1C2839",
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: "#1C2839",
    marginBottom: 4,
  },
  helperText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#6B6B6B",
    marginBottom: 8,
    fontStyle: "italic",
  },
  input: {
    height: 48,
    backgroundColor: "#F5F3F0",
    borderWidth: 1,
    borderColor: "#E8E6E3",
    borderRadius: 6,
    paddingHorizontal: 16,
    fontFamily: fonts.body,
    fontSize: 15,
    color: "#3A3A3A",
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  inputError: {
    borderWidth: 2,
    borderColor: "#991B1B",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#991B1B",
    marginTop: 4,
  },
  photoButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  photoButton: {
    flex: 1,
    height: 100,
    backgroundColor: "#F9F7F4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E6E3",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  photoButtonText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#6B6B6B",
    marginTop: 8,
  },
  photoPreviewContainer: {
    position: "relative",
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#991B1B",
    alignItems: "center",
    justifyContent: "center",
  },
  selectButton: {
    height: 48,
    backgroundColor: "#F5F3F0",
    borderWidth: 1,
    borderColor: "#E8E6E3",
    borderRadius: 6,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectButtonText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: "#3A3A3A",
  },
  typePickerContainer: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E6E3",
    overflow: "hidden",
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E6E3",
  },
  typeOptionSelected: {
    backgroundColor: "#F9F7F4",
  },
  typeOptionText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: "#3A3A3A",
  },
  typeOptionTextSelected: {
    fontFamily: fonts.bodyMedium,
    color: "#8B2635",
  },
  numberPickerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  numberButton: {
    width: 48,
    height: 48,
    backgroundColor: "#F5F3F0",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E8E6E3",
    alignItems: "center",
    justifyContent: "center",
  },
  numberButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 20,
    color: "#1C2839",
  },
  numberDisplay: {
    flex: 1,
    marginHorizontal: 16,
    height: 48,
    backgroundColor: "#F5F3F0",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E8E6E3",
    alignItems: "center",
    justifyContent: "center",
  },
  numberValue: {
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
    color: "#1C2839",
  },
  submitButton: {
    height: 52,
    backgroundColor: "#8B2635",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    ...design.shadow.button,
  },
  submitButtonDisabled: {
    backgroundColor: "#A8A8A8",
  },
  buttonPressed: {
    backgroundColor: "#6D1E2A",
    transform: [{ scale: 0.98 }],
  },
  submitButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: "#FFFFFF",
  },
});
