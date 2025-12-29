import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp, generateId } from "@/lib/app-context";
import { fonts, design } from "@/constants/typography";
import * as Haptics from "expo-haptics";

export default function SignupScreen() {
  const router = useRouter();
  const { dispatch } = useApp();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasMinLength && hasUppercase && hasNumber;
  };

  const handleSignup = async () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (!validatePassword(password)) {
      newErrors.password = "Password must be at least 8 characters with 1 uppercase and 1 number";
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to start documenting your properties</Text>

            {/* Form */}
            <View style={styles.form}>
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#A8A8A8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={[
                    styles.input,
                    errors.email && styles.inputError,
                  ]}
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create a password"
                    placeholderTextColor="#A8A8A8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      styles.passwordInput,
                      errors.password && styles.inputError,
                    ]}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <IconSymbol 
                      name={showPassword ? "eye.slash.fill" : "eye.fill"} 
                      size={20} 
                      color="#6B6B6B" 
                    />
                  </Pressable>
                </View>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#A8A8A8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    errors.confirmPassword && styles.inputError,
                  ]}
                />
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSignup}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                isLoading && styles.submitButtonDisabled,
                pressed && !isLoading && styles.buttonPressed,
              ]}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Text>
            </Pressable>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Pressable onPress={() => router.replace("/auth/login")}>
                <Text style={styles.loginLink}>Log in</Text>
              </Pressable>
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
  title: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: "#1C2839",
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: "#6B6B6B",
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: "#1C2839",
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
  inputError: {
    borderWidth: 2,
    borderColor: "#991B1B",
    backgroundColor: "#FEF2F2",
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 14,
    padding: 4,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#991B1B",
  },
  submitButton: {
    height: 52,
    backgroundColor: "#8B2635",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    paddingBottom: 32,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: "#6B6B6B",
  },
  loginLink: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: "#8B2635",
  },
});
