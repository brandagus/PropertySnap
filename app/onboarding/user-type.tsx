import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp, UserType } from "@/lib/app-context";
import { fonts, design } from "@/constants/typography";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface UserTypeOption {
  type: UserType;
  icon: "building.2.fill" | "key.fill" | "briefcase.fill";
  title: string;
  description: string;
}

const userTypes: UserTypeOption[] = [
  {
    type: "landlord",
    icon: "building.2.fill",
    title: "I'm a Landlord",
    description: "Create properties, document conditions, and invite tenants to complete inspections.",
  },
  {
    type: "tenant",
    icon: "key.fill",
    title: "I'm a Tenant",
    description: "Review landlord photos, add your own documentation, and sign off on inspections.",
  },
  {
    type: "manager",
    icon: "briefcase.fill",
    title: "I'm a Property Manager",
    description: "Manage multiple properties, create templates, and oversee all inspections.",
  },
];

export default function UserTypeScreen() {
  const router = useRouter();
  const { dispatch } = useApp();

  const handleSelectType = (type: UserType) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    dispatch({ type: "SET_USER_TYPE", payload: type });
    router.push("/auth/signup");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to PropertySnap</Text>
          <Text style={styles.subtitle}>Select your role to get started</Text>
        </View>

        <View style={styles.cardsContainer}>
          {userTypes.map((option) => (
            <Pressable
              key={option.type}
              onPress={() => handleSelectType(option.type)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <IconSymbol name={option.icon} size={28} color="#8B2635" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
              </View>
              <IconSymbol name="chevron.right" size={20} color="#6B6B6B" />
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{" "}
          </Text>
          <Pressable onPress={() => router.push("/auth/login")}>
            <Text style={styles.loginLink}>Log in</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 48,
    marginBottom: 40,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: "#1C2839",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: "#6B6B6B",
    textAlign: "center",
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E6E3",
    ...design.shadow.card,
  },
  cardPressed: {
    borderColor: "#C59849",
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F9F7F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.headingSemibold,
    fontSize: 18,
    color: "#1C2839",
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#6B6B6B",
    lineHeight: 20,
  },
  footer: {
    marginTop: "auto",
    paddingBottom: 32,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
