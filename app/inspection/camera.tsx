import { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

export default function CameraScreen() {
  const router = useRouter();
  const { checkpointId, inspectionId } = useLocalSearchParams<{ 
    checkpointId: string; 
    inspectionId: string;
  }>();
  const colors = useColors();
  const [flashOn, setFlashOn] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    // Automatically open camera on mount
    openCamera();
  }, []);

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      router.back();
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      router.back();
    } else if (result.assets[0]) {
      // Return the photo URI back to the previous screen
      // In a real implementation, you'd pass this back via params or context
      router.back();
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white text-lg">Opening camera...</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text className="text-white text-base">Cancel</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cancelButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
