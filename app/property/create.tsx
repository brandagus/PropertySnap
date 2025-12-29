import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, generateId, PropertyType } from "@/lib/app-context";
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
  const colors = useColors();
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
      photo,
      tenantId: null,
      tenantName: null,
      tenantEmail: null,
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
    <View className="mb-4">
      <Text className="text-sm font-medium text-foreground mb-2">{label}</Text>
      <View className="flex-row items-center">
        <Pressable
          onPress={() => value > min && setValue(value - 1)}
          style={({ pressed }) => [
            styles.numberButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text className="text-xl text-foreground">−</Text>
        </Pressable>
        <View 
          className="flex-1 mx-4 h-12 items-center justify-center rounded-lg"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <Text className="text-lg font-semibold text-foreground">{value}</Text>
        </View>
        <Pressable
          onPress={() => value < max && setValue(value + 1)}
          style={({ pressed }) => [
            styles.numberButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text className="text-xl text-foreground">+</Text>
        </Pressable>
      </View>
    </View>
  );

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
              <Text className="text-xl font-bold text-foreground ml-4">Add Property</Text>
            </View>

            {/* Photo Upload */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-foreground mb-2">Property Photo</Text>
              {photo ? (
                <View className="relative">
                  <Image source={{ uri: photo }} style={styles.photoPreview} />
                  <Pressable
                    onPress={() => setPhoto(null)}
                    style={[styles.removePhotoButton, { backgroundColor: colors.error }]}
                  >
                    <IconSymbol name="xmark" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={handleTakePhoto}
                    style={({ pressed }) => [
                      styles.photoButton,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <IconSymbol name="camera.fill" size={24} color={colors.primary} />
                    <Text className="text-sm text-muted mt-2">Take Photo</Text>
                  </Pressable>
                  <Pressable
                    onPress={handlePickImage}
                    style={({ pressed }) => [
                      styles.photoButton,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <IconSymbol name="photo.fill" size={24} color={colors.primary} />
                    <Text className="text-sm text-muted mt-2">Choose Photo</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Address */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Property Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Enter the full address"
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={2}
                style={[
                  styles.input,
                  styles.textArea,
                  { 
                    backgroundColor: colors.surface,
                    borderColor: errors.address ? colors.error : colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
              {errors.address && (
                <Text className="text-error text-sm mt-1">{errors.address}</Text>
              )}
            </View>

            {/* Property Type */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Property Type</Text>
              <Pressable
                onPress={() => setShowTypePicker(!showTypePicker)}
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
                ]}
              >
                <Text style={{ color: colors.foreground }}>
                  {propertyTypes.find(t => t.value === propertyType)?.label}
                </Text>
                <IconSymbol name="chevron.right" size={18} color={colors.muted} />
              </Pressable>
              {showTypePicker && (
                <View 
                  className="mt-2 rounded-lg overflow-hidden"
                  style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                >
                  {propertyTypes.map((type) => (
                    <Pressable
                      key={type.value}
                      onPress={() => {
                        setPropertyType(type.value);
                        setShowTypePicker(false);
                      }}
                      style={({ pressed }) => [
                        styles.typeOption,
                        propertyType === type.value && { backgroundColor: `${colors.primary}15` },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text 
                        className="text-base"
                        style={{ color: propertyType === type.value ? colors.primary : colors.foreground }}
                      >
                        {type.label}
                      </Text>
                      {propertyType === type.value && (
                        <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
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
                { backgroundColor: isLoading ? colors.muted : colors.primary },
                pressed && !isLoading && styles.buttonPressed,
              ]}
            >
              <Text className="text-white text-base font-semibold">
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
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  photoButton: {
    flex: 1,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  numberButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
