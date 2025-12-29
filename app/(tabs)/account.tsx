import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface MenuItem {
  icon: "person.circle.fill" | "bell.fill" | "creditcard.fill" | "doc.text.fill" | "questionmark.circle.fill" | "info.circle.fill";
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  destructive?: boolean;
}

export default function AccountScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, dispatch } = useApp();

  const handleLogout = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive",
          onPress: () => {
            dispatch({ type: "LOGOUT" });
            router.replace("/onboarding");
          }
        },
      ]
    );
  };

  const accountMenuItems: MenuItem[] = [
    {
      icon: "person.circle.fill",
      title: "Profile",
      subtitle: state.user?.email ?? "Not logged in",
      onPress: () => {},
      showChevron: true,
    },
    {
      icon: "bell.fill",
      title: "Notifications",
      subtitle: "Manage push notifications",
      onPress: () => {},
      showChevron: true,
    },
    {
      icon: "creditcard.fill",
      title: "Subscription",
      subtitle: state.user?.subscriptionTier === "free" ? "Free Plan" : "Pro Plan",
      onPress: () => {},
      showChevron: true,
    },
  ];

  const supportMenuItems: MenuItem[] = [
    {
      icon: "doc.text.fill",
      title: "Terms of Service",
      onPress: () => {},
      showChevron: true,
    },
    {
      icon: "doc.text.fill",
      title: "Privacy Policy",
      onPress: () => {},
      showChevron: true,
    },
    {
      icon: "questionmark.circle.fill",
      title: "Help & Support",
      onPress: () => {},
      showChevron: true,
    },
    {
      icon: "info.circle.fill",
      title: "About",
      subtitle: "Version 1.0.0",
      onPress: () => {},
      showChevron: true,
    },
  ];

  const renderMenuItem = (item: MenuItem, index: number, isLast: boolean) => (
    <Pressable
      key={index}
      onPress={() => {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        item.onPress();
      }}
      style={({ pressed }) => [
        styles.menuItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.border },
      ]}
    >
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: `${colors.primary}15` }}
      >
        <IconSymbol name={item.icon} size={20} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium text-foreground">{item.title}</Text>
        {item.subtitle && (
          <Text className="text-sm text-muted mt-0.5">{item.subtitle}</Text>
        )}
      </View>
      {item.showChevron && (
        <IconSymbol name="chevron.right" size={18} color={colors.muted} />
      )}
    </Pressable>
  );

  const renderSection = (title: string, items: MenuItem[]) => (
    <View className="mb-6">
      <Text className="text-sm font-medium text-muted mb-2 px-4">{title}</Text>
      <View 
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: colors.surface }}
      >
        {items.map((item, index) => renderMenuItem(item, index, index === items.length - 1))}
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 py-4">
          <Text className="text-2xl font-bold text-foreground">Account</Text>
        </View>

        {/* User Info Card */}
        <View className="px-4 mb-6">
          <View 
            className="p-4 rounded-xl flex-row items-center"
            style={{ backgroundColor: colors.surface }}
          >
            <View 
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <Text className="text-2xl font-bold text-primary">
                {state.user?.email?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semibold text-foreground">
                {state.user?.email ?? "Guest"}
              </Text>
              <Text className="text-sm text-muted mt-1">
                {state.user?.userType === "landlord" ? "Landlord" : 
                 state.user?.userType === "tenant" ? "Tenant" : 
                 state.user?.userType === "manager" ? "Property Manager" : "Guest"}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View className="px-4">
          {renderSection("ACCOUNT", accountMenuItems)}
          {renderSection("SUPPORT", supportMenuItems)}
        </View>

        {/* Logout Button */}
        <View className="px-4 mb-8">
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text className="text-error text-base font-semibold">Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  logoutButton: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
