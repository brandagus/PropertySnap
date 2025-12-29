import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, UserType } from "@/lib/app-context";
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
  const colors = useColors();
  const { dispatch } = useApp();

  const handleSelectType = (type: UserType) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    dispatch({ type: "SET_USER_TYPE", payload: type });
    router.push("/auth/signup");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-6">
      <View className="flex-1 pt-12">
        <Text className="text-3xl font-bold text-foreground text-center mb-2">
          Welcome to PropertySnap
        </Text>
        <Text className="text-base text-muted text-center mb-10">
          Select your role to get started
        </Text>

        <View className="gap-4">
          {userTypes.map((option) => (
            <Pressable
              key={option.type}
              onPress={() => handleSelectType(option.type)}
              style={({ pressed }) => [
                styles.card,
                { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                pressed && styles.cardPressed,
              ]}
            >
              <View 
                className="w-14 h-14 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: `${colors.primary}15` }}
              >
                <IconSymbol name={option.icon} size={28} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-foreground mb-1">
                  {option.title}
                </Text>
                <Text className="text-sm text-muted leading-5">
                  {option.description}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        <View className="mt-auto pb-8">
          <Text className="text-sm text-muted text-center">
            Already have an account?{" "}
            <Text 
              className="text-primary font-semibold"
              onPress={() => router.push("/auth/login")}
            >
              Log in
            </Text>
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
