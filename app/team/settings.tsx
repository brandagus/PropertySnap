import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Image, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function AgencySettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, dispatch } = useApp();
  const [companyName, setCompanyName] = useState(state.team?.companyName || "");
  const [isUploading, setIsUploading] = useState(false);

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1], // Square for logo
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsUploading(true);
      
      // In a real app, you'd upload to a server here
      // For now, we store the local URI
      dispatch({
        type: "UPDATE_TEAM_BRANDING",
        payload: { companyLogo: result.assets[0].uri },
      });

      setIsUploading(false);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert(
      "Remove Logo",
      "Are you sure you want to remove your company logo? The default PropertySnap logo will be used on PDF reports.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            dispatch({
              type: "UPDATE_TEAM_BRANDING",
              payload: { companyLogo: null },
            });
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const handleSaveCompanyName = () => {
    dispatch({
      type: "UPDATE_TEAM_BRANDING",
      payload: { companyName: companyName.trim() || null },
    });
    
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    Alert.alert("Saved", "Company name has been updated.");
  };

  if (!state.team) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          No team found. Create a team first.
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Agency Settings
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Company Logo Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Company Logo
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.muted }]}>
            Upload your company logo to replace the PropertySnap logo on PDF reports. Square images work best.
          </Text>

          <View style={styles.logoContainer}>
            {state.team.companyLogo ? (
              <View style={styles.logoPreviewContainer}>
                <Image
                  source={{ uri: state.team.companyLogo }}
                  style={[styles.logoPreview, { borderColor: colors.border }]}
                  resizeMode="contain"
                />
                <View style={styles.logoActions}>
                  <Pressable
                    onPress={handlePickLogo}
                    style={({ pressed }) => [
                      styles.logoActionButton,
                      { backgroundColor: colors.primary },
                      pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <IconSymbol name="camera.fill" size={18} color="#FFFFFF" />
                    <Text style={styles.logoActionText}>Change</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleRemoveLogo}
                    style={({ pressed }) => [
                      styles.logoActionButton,
                      { backgroundColor: colors.error },
                      pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <IconSymbol name="trash.fill" size={18} color="#FFFFFF" />
                    <Text style={styles.logoActionText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={handlePickLogo}
                disabled={isUploading}
                style={({ pressed }) => [
                  styles.uploadButton,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {isUploading ? (
                  <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                  <>
                    <View style={[styles.uploadIconContainer, { backgroundColor: colors.primary + "15" }]}>
                      <IconSymbol name="camera.fill" size={32} color={colors.primary} />
                    </View>
                    <Text style={[styles.uploadText, { color: colors.foreground }]}>
                      Upload Company Logo
                    </Text>
                    <Text style={[styles.uploadHint, { color: colors.muted }]}>
                      PNG or JPG, square format recommended
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Company Name Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Company Name
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.muted }]}>
            This name will appear in the header of your PDF reports instead of "PropertySnap".
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="e.g., Ray White Sydney"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            onSubmitEditing={handleSaveCompanyName}
          />

          <Pressable
            onPress={handleSaveCompanyName}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.saveButtonText}>Save Company Name</Text>
          </Pressable>
        </View>

        {/* Preview Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            PDF Preview
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.muted }]}>
            This is how your branding will appear on PDF reports.
          </Text>

          <View style={[styles.previewCard, { backgroundColor: "#F9F7F4", borderColor: colors.border }]}>
            {/* Simulated PDF Header */}
            <View style={[styles.previewHeader, { backgroundColor: "#8B2635" }]}>
              <View style={styles.previewHeaderContent}>
                {state.team.companyLogo ? (
                  <Image
                    source={{ uri: state.team.companyLogo }}
                    style={styles.previewLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.previewDefaultLogo}>
                    <Text style={styles.previewLogoText}>PS</Text>
                  </View>
                )}
                <Text style={styles.previewCompanyName}>
                  {state.team.companyName || "PropertySnap"}
                </Text>
              </View>
            </View>
            <View style={styles.previewBody}>
              <Text style={styles.previewTitle}>Property Inspection Report</Text>
              <View style={[styles.previewDivider, { backgroundColor: "#C59849" }]} />
              <Text style={styles.previewAddress}>123 Sample Street, Sydney NSW 2000</Text>
            </View>
          </View>
        </View>

        {/* Info Note */}
        <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary }]}>
          <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Your branding will appear on all PDF reports generated by your team members.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "CrimsonPro_700Bold",
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "CrimsonPro_700Bold",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 16,
  },
  logoContainer: {
    alignItems: "center",
  },
  logoPreviewContainer: {
    alignItems: "center",
    gap: 16,
  },
  logoPreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
  },
  logoActions: {
    flexDirection: "row",
    gap: 12,
  },
  logoActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  logoActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  uploadButton: {
    width: "100%",
    paddingVertical: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  uploadHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  input: {
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  saveButton: {
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  previewCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewHeader: {
    padding: 16,
  },
  previewHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewLogo: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  previewDefaultLogo: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  previewLogoText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#8B2635",
    fontFamily: "CrimsonPro_700Bold",
  },
  previewCompanyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  previewBody: {
    padding: 16,
    alignItems: "center",
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C2839",
    fontFamily: "CrimsonPro_600SemiBold",
    marginBottom: 8,
  },
  previewDivider: {
    width: 60,
    height: 2,
    marginBottom: 8,
  },
  previewAddress: {
    fontSize: 12,
    color: "#4A5568",
    fontFamily: "Inter_400Regular",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
});
