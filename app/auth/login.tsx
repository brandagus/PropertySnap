import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { fonts, design } from "@/constants/typography";
import { getLoginUrl } from "@/constants/oauth";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthLogin = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);

    try {
      const loginUrl = getLoginUrl();
      console.log("[Login] Opening OAuth URL:", loginUrl);

      if (Platform.OS === "web") {
        // On web, redirect to the OAuth URL
        window.location.href = loginUrl;
      } else {
        // On native, open in-app browser
        const result = await WebBrowser.openAuthSessionAsync(loginUrl);
        console.log("[Login] WebBrowser result:", result);
        
        if (result.type === "success" && result.url) {
          // The OAuth callback will handle the rest
          // Extract params and navigate to callback
          const url = new URL(result.url);
          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state");
          const sessionToken = url.searchParams.get("sessionToken");
          const user = url.searchParams.get("user");
          
          if (sessionToken || (code && state)) {
            router.replace({
              pathname: "/oauth/callback",
              params: { code, state, sessionToken, user },
            });
          }
        }
      }
    } catch (error) {
      console.error("[Login] OAuth error:", error);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol name="chevron.left" size={24} color="#1C2839" />
            </Pressable>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <IconSymbol name="house.fill" size={48} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.title}>Welcome to PropertySnap</Text>
            <Text style={styles.subtitle}>
              Sign in to sync your inspections across devices and collaborate with tenants
            </Text>

            {/* OAuth Login Button */}
            <Pressable
              onPress={handleOAuthLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.oauthButton,
                isLoading && styles.buttonDisabled,
                pressed && !isLoading && styles.buttonPressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol name="person.circle.fill" size={24} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.oauthButtonText}>Continue with Manus Account</Text>
                </>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue as Guest */}
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.replace("/(tabs)");
              }}
              style={({ pressed }) => [
                styles.guestButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </Pressable>

            {/* Info Text */}
            <View style={styles.infoContainer}>
              <IconSymbol name="info.circle.fill" size={16} color="#6B6B6B" />
              <Text style={styles.infoText}>
                Guest mode saves data locally on your device. Sign in to enable cloud sync and collaboration features.
              </Text>
            </View>

            {/* Features List */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>With an account you can:</Text>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#2D5C3F" />
                <Text style={styles.featureText}>Sync inspections across all your devices</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#2D5C3F" />
                <Text style={styles.featureText}>Invite tenants to view and sign reports</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#2D5C3F" />
                <Text style={styles.featureText}>Store photos securely in the cloud</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#2D5C3F" />
                <Text style={styles.featureText}>Access your data from anywhere</Text>
              </View>
            </View>
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
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 24,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#8B2635",
    alignItems: "center",
    justifyContent: "center",
    ...design.shadow.card,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: "#1C2839",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: "#6B6B6B",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  oauthButton: {
    height: 56,
    backgroundColor: "#8B2635",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...design.shadow.button,
  },
  buttonDisabled: {
    backgroundColor: "#A8A8A8",
  },
  buttonPressed: {
    backgroundColor: "#6D1E2A",
    transform: [{ scale: 0.98 }],
  },
  buttonIcon: {
    marginRight: 12,
  },
  oauthButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8E6E3",
  },
  dividerText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#6B6B6B",
    marginHorizontal: 16,
  },
  guestButton: {
    height: 52,
    backgroundColor: "#F5F3F0",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E6E3",
    alignItems: "center",
    justifyContent: "center",
  },
  guestButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: "#1C2839",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#6B6B6B",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  featuresContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E8E6E3",
  },
  featuresTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: "#1C2839",
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#3A3A3A",
    marginLeft: 12,
    flex: 1,
  },
});
