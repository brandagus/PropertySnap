import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, generateId } from "@/lib/app-context";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const { dispatch } = useApp();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleLogin = async () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
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

    // Simulate login - in production this would call an API
    setTimeout(() => {
      const user = {
        id: generateId(),
        email,
        userType: "landlord" as const,
        subscriptionTier: "free" as const,
        inspectionsUsed: 0,
      };
      
      dispatch({ type: "LOGIN", payload: user });
      dispatch({ type: "SET_ONBOARDED", payload: true });
      setIsLoading(false);
      router.replace("/(tabs)");
    }, 1000);
  };

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
          <View className="px-6 pt-12">
            {/* Header */}
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
            </Pressable>

            <Text className="text-3xl font-bold text-foreground mt-6 mb-2">
              Welcome Back
            </Text>
            <Text className="text-base text-muted mb-8">
              Log in to continue managing your inspections
            </Text>

            {/* Form */}
            <View className="gap-4">
              {/* Email */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={[
                    styles.input,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: errors.email ? colors.error : colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
                {errors.email && (
                  <Text className="text-error text-sm mt-1">{errors.email}</Text>
                )}
              </View>

              {/* Password */}
              <View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm font-medium text-foreground">Password</Text>
                  <Text className="text-sm text-primary font-medium">Forgot password?</Text>
                </View>
                <View className="relative">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      { 
                        backgroundColor: colors.surface,
                        borderColor: errors.password ? colors.error : colors.border,
                        color: colors.foreground,
                        paddingRight: 48,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <IconSymbol 
                      name={showPassword ? "eye.slash.fill" : "eye.fill"} 
                      size={20} 
                      color={colors.muted} 
                    />
                  </Pressable>
                </View>
                {errors.password && (
                  <Text className="text-error text-sm mt-1">{errors.password}</Text>
                )}
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: isLoading ? colors.muted : colors.primary },
                pressed && !isLoading && styles.buttonPressed,
              ]}
            >
              <Text className="text-white text-base font-semibold">
                {isLoading ? "Logging in..." : "Log In"}
              </Text>
            </Pressable>

            {/* Signup Link */}
            <View className="mt-6 items-center">
              <Text className="text-sm text-muted">
                Don't have an account?{" "}
                <Text 
                  className="text-primary font-semibold"
                  onPress={() => router.replace("/auth/signup")}
                >
                  Sign up
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
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
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 14,
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
