import { useState, useRef, useMemo } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Dimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import SignatureScreen, { SignatureViewRef } from "react-native-signature-canvas";
import {
  sendCompletionNotification,
  cancelInspectionNotifications,
} from "@/lib/notification-service";

const { width } = Dimensions.get("window");

export default function SignatureScreenComponent() {
  const router = useRouter();
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const colors = useColors();
  const { state, dispatch } = useApp();
  const signatureRef = useRef<SignatureViewRef>(null);
  
  const [printName, setPrintName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; signature?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Find the inspection
  const { inspection, property } = useMemo(() => {
    for (const prop of state.properties) {
      const insp = prop.inspections.find(i => i.id === inspectionId);
      if (insp) {
        return { inspection: insp, property: prop };
      }
    }
    return { inspection: null, property: null };
  }, [state.properties, inspectionId]);

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setSignature(null);
  };

  const handleSignatureEnd = () => {
    signatureRef.current?.readSignature();
  };

  const handleSignatureSave = (sig: string) => {
    setSignature(sig);
  };

  const handleSubmit = () => {
    const newErrors: typeof errors = {};
    
    if (!printName.trim()) {
      newErrors.name = "Please print your name";
    }
    
    if (!signature) {
      newErrors.signature = "Please sign above";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    if (!inspection) return;

    setIsLoading(true);
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Update inspection with signature
    setTimeout(async () => {
      const updatedInspection = {
        ...inspection,
        status: "completed" as const,
        completedAt: new Date().toISOString(),
        landlordSignature: signature,
      };

      dispatch({ type: "UPDATE_INSPECTION", payload: updatedInspection });
      
      // Cancel any scheduled reminders for this inspection
      await cancelInspectionNotifications(inspection.id);
      
      // Send completion notification
      if (property) {
        await sendCompletionNotification(
          inspection.id,
          property.address,
          "landlord"
        );
      }
      
      setIsLoading(false);
      setIsComplete(true);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 1000);
  };

  if (!inspection || !property) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Inspection not found</Text>
      </ScreenContainer>
    );
  }

  if (isComplete) {
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
            Inspection Complete!
          </Text>
          <Text className="text-base text-muted text-center mb-2">
            Signed by {printName}
          </Text>
          <Text className="text-sm text-muted text-center mb-8">
            {currentDate}
          </Text>
          
          <View className="w-full gap-3">
            <Pressable
              onPress={() => {
                // Navigate to PDF export
                router.replace("/(tabs)");
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.9 },
              ]}
            >
              <IconSymbol name="doc.text.fill" size={18} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-2">View Report</Text>
            </Pressable>
            
            <Pressable
              onPress={() => router.replace("/(tabs)")}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text className="text-foreground text-base font-semibold">Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1">
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
          <Text className="text-xl font-bold text-foreground ml-4">Sign Inspection</Text>
        </View>

        <View className="flex-1 px-6">
          {/* Info Card */}
          <View 
            className="p-4 rounded-xl mb-6"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-sm text-muted mb-1">Property</Text>
            <Text className="text-base font-semibold text-foreground mb-2">
              {property.address}
            </Text>
            <Text className="text-sm text-muted">
              {inspection.type === "move-in" ? "Move-in" : "Move-out"} Inspection • {currentDate}
            </Text>
          </View>

          {/* Signature Canvas */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-foreground mb-2">Your Signature *</Text>
            <View 
              style={[
                styles.signatureContainer,
                { borderColor: errors.signature ? colors.error : colors.border },
              ]}
            >
              <SignatureScreen
                ref={signatureRef}
                onEnd={handleSignatureEnd}
                onOK={handleSignatureSave}
                onEmpty={() => setSignature(null)}
                autoClear={false}
                descriptionText=""
                webStyle={`
                  .m-signature-pad {
                    box-shadow: none;
                    border: none;
                    margin: 0;
                  }
                  .m-signature-pad--body {
                    border: none;
                  }
                  .m-signature-pad--footer {
                    display: none;
                  }
                  body, html {
                    background-color: #FFFFFF;
                  }
                `}
                backgroundColor="#FFFFFF"
                penColor="#3B82F6"
                minWidth={2}
                maxWidth={4}
              />
              {!signature && (
                <View style={styles.signaturePlaceholder} pointerEvents="none">
                  <Text className="text-muted text-base">Sign here</Text>
                </View>
              )}
            </View>
            {errors.signature && (
              <Text className="text-error text-sm mt-1">{errors.signature}</Text>
            )}
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol name="arrow.clockwise" size={16} color={colors.primary} />
              <Text className="text-primary text-sm font-medium ml-1">Clear</Text>
            </Pressable>
          </View>

          {/* Print Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-foreground mb-2">Print Your Name *</Text>
            <TextInput
              value={printName}
              onChangeText={setPrintName}
              placeholder="Enter your full name"
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

          {/* Date (Read-only) */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-foreground mb-2">Date</Text>
            <View 
              style={[
                styles.input,
                { 
                  backgroundColor: colors.border,
                  borderColor: colors.border,
                  justifyContent: "center",
                },
              ]}
            >
              <Text style={{ color: colors.foreground }}>{currentDate}</Text>
            </View>
          </View>

          {/* Confirmation */}
          <View 
            className="p-4 rounded-xl mb-6"
            style={{ backgroundColor: `${colors.primary}10` }}
          >
            <Text className="text-sm text-foreground leading-5">
              By signing, I confirm that this inspection accurately reflects the condition of the property at the time of inspection.
            </Text>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: isLoading ? colors.muted : colors.success },
              pressed && !isLoading && { opacity: 0.9 },
            ]}
          >
            <IconSymbol name="pencil" size={18} color="#FFFFFF" />
            <Text className="text-white text-base font-semibold ml-2">
              {isLoading ? "Submitting..." : "Submit Signature"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  signatureContainer: {
    height: 200,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  signaturePlaceholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 8,
    padding: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    height: 48,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
