import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp, canManageTeam } from "@/lib/app-context";
import { fonts, design } from "@/constants/typography";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface MenuItem {
  icon: "person.circle.fill" | "bell.fill" | "creditcard.fill" | "doc.text.fill" | "questionmark.circle.fill" | "info.circle.fill" | "person.3.fill" | "building.2.fill" | "person.2.fill";
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  badge?: string;
}

export default function AccountScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();

  const isAdmin = canManageTeam(state.user?.teamRole);
  const hasTeam = !!state.team;

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
      subtitle: state.user?.subscriptionTier === "enterprise" 
        ? "Enterprise Plan" 
        : state.user?.subscriptionTier === "free" 
          ? "Free Plan" 
          : "Pro Plan",
      onPress: () => {},
      showChevron: true,
    },
  ];

  // Tenant management menu items
  const tenantMenuItems: MenuItem[] = [
    {
      icon: "person.2.fill" as any,
      title: "Manage Tenants",
      subtitle: `${state.properties.filter(p => p.tenantName).length} properties with tenants`,
      onPress: () => router.push("/tenants" as any),
      showChevron: true,
    },
  ];

  // Team management menu items (only for landlords/managers)
  const teamMenuItems: MenuItem[] = [
    {
      icon: "person.3.fill",
      title: "Team Management",
      subtitle: hasTeam 
        ? `${state.team?.members.length || 0} team members` 
        : "Set up your team",
      onPress: () => router.push("/team"),
      showChevron: true,
      badge: hasTeam && state.team?.members.some(m => m.status === "pending") 
        ? "NEW" 
        : undefined,
    },
    {
      icon: "building.2.fill",
      title: "Agency Settings",
      subtitle: hasTeam && isAdmin
        ? "Logo & branding"
        : "Admin access required",
      onPress: () => {
        if (hasTeam && isAdmin) {
          router.push("/team/settings");
        }
      },
      showChevron: hasTeam && isAdmin,
    },
  ];

  // Only show team menu for landlords and managers
  const showTeamMenu = state.user?.userType === "landlord" || state.user?.userType === "manager";

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
        !isLast && styles.menuItemBorder,
        pressed && { backgroundColor: "#F5F3F0" },
      ]}
    >
      <View style={styles.menuIconContainer}>
        <IconSymbol name={item.icon} size={20} color="#8B2635" />
      </View>
      <View style={styles.menuContent}>
        <View style={styles.menuTitleRow}>
          <Text style={styles.menuTitle}>{item.title}</Text>
          {item.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
        </View>
        {item.subtitle && (
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      {item.showChevron && (
        <IconSymbol name="chevron.right" size={18} color="#6B6B6B" />
      )}
    </Pressable>
  );

  const renderSection = (title: string, items: MenuItem[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {items.map((item, index) => renderMenuItem(item, index, index === items.length - 1))}
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.userCardContainer}>
          <View style={styles.userCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {(state.user?.name?.[0]?.toUpperCase()) || (state.user?.email?.charAt(0).toUpperCase()) || "?"}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {state.user?.name || state.user?.email || "Guest"}
              </Text>
              <Text style={styles.userRole}>
                {state.user?.userType === "landlord" ? "Landlord" : 
                 state.user?.userType === "tenant" ? "Tenant" : 
                 state.user?.userType === "manager" ? "Property Manager" : "Guest"}
                {state.user?.teamRole === "admin" && " • Team Admin"}
              </Text>
              {hasTeam && (
                <View style={styles.teamBadge}>
                  <IconSymbol name="building.2.fill" size={12} color="#C59849" />
                  <Text style={styles.teamBadgeText}>{state.team?.name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuContainer}>
          {renderSection("ACCOUNT", accountMenuItems)}
          {showTeamMenu && renderSection("TENANTS", tenantMenuItems)}
          {showTeamMenu && renderSection("ENTERPRISE", teamMenuItems)}
          {renderSection("SUPPORT", supportMenuItems)}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: "#1C2839",
  },
  userCardContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  userCard: {
    backgroundColor: "#F9F7F4",
    borderRadius: 8,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    ...design.shadow.card,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#8B2635",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: "#FFFFFF",
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontFamily: fonts.headingSemibold,
    fontSize: 18,
    color: "#1C2839",
    marginBottom: 4,
  },
  userRole: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#6B6B6B",
  },
  teamBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FDF8F0",
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  teamBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: "#C59849",
    marginLeft: 4,
  },
  menuContainer: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: "#6B6B6B",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E6E3",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E8E6E3",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9F7F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: "#1C2839",
  },
  menuSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#6B6B6B",
    marginTop: 2,
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#8B2635",
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: "#FFFFFF",
  },
  logoutContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  logoutButton: {
    height: 52,
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#991B1B",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: "#991B1B",
  },
});
