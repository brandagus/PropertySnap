import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert, Switch } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, TeamMember, TeamRole, PropertyAccessType, generateId, getRoleLabel, getRoleDescription } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const roles: TeamRole[] = ["manager", "inspector", "viewer"];

export default function InviteTeamMemberScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, dispatch } = useApp();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<TeamRole>("inspector");
  const [accessType, setAccessType] = useState<PropertyAccessType>("all");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

  const handleInvite = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter the team member's name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    if (accessType === "specific" && selectedPropertyIds.length === 0) {
      Alert.alert("Error", "Please select at least one property for this team member");
      return;
    }

    const newMember: TeamMember = {
      id: generateId(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: selectedRole,
      propertyAccess: accessType,
      assignedPropertyIds: accessType === "specific" ? selectedPropertyIds : [],
      invitedAt: new Date().toISOString(),
      acceptedAt: null,
      status: "pending",
    };

    dispatch({ type: "ADD_TEAM_MEMBER", payload: newMember });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert(
      "Invitation Sent",
      `An invitation has been sent to ${email}. They will receive an email with instructions to join your team.`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  const togglePropertySelection = (propertyId: string) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4">
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-xl font-bold text-foreground ml-4">Invite Team Member</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-6 pb-32">
          {/* Basic Info */}
          <View 
            className="p-5 rounded-xl mb-4"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-base font-semibold text-foreground mb-4">
              Basic Information
            </Text>
            
            <Text className="text-sm font-medium text-foreground mb-2">Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g., John Smith"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
              ]}
              returnKeyType="next"
            />

            <Text className="text-sm font-medium text-foreground mb-2 mt-4">Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g., john@company.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
              ]}
              returnKeyType="done"
            />
          </View>

          {/* Role Selection */}
          <View 
            className="p-5 rounded-xl mb-4"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-base font-semibold text-foreground mb-4">
              Role & Permissions
            </Text>
            
            {roles.map((role) => (
              <Pressable
                key={role}
                onPress={() => setSelectedRole(role)}
                style={({ pressed }) => [
                  styles.roleOption,
                  { 
                    backgroundColor: selectedRole === role ? colors.primary + "15" : colors.background,
                    borderColor: selectedRole === role ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View className="flex-row items-center">
                  <View 
                    className="w-5 h-5 rounded-full border-2 items-center justify-center mr-3"
                    style={{ borderColor: selectedRole === role ? colors.primary : colors.border }}
                  >
                    {selectedRole === role && (
                      <View 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors.primary }}
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text 
                      className="text-base font-medium"
                      style={{ color: selectedRole === role ? colors.primary : colors.foreground }}
                    >
                      {getRoleLabel(role)}
                    </Text>
                    <Text className="text-sm text-muted mt-0.5">
                      {getRoleDescription(role)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Property Access */}
          <View 
            className="p-5 rounded-xl mb-4"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-base font-semibold text-foreground mb-2">
              Property Access
            </Text>
            <Text className="text-sm text-muted mb-4">
              Choose which properties this team member can access
            </Text>

            {/* Access Type Toggle */}
            <View 
              className="flex-row items-center justify-between p-4 rounded-lg mb-4"
              style={{ backgroundColor: colors.background }}
            >
              <View className="flex-1 mr-4">
                <Text className="text-base font-medium text-foreground">
                  Access All Properties
                </Text>
                <Text className="text-sm text-muted">
                  Automatically includes new properties
                </Text>
              </View>
              <Switch
                value={accessType === "all"}
                onValueChange={(value) => setAccessType(value ? "all" : "specific")}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Property Selection (only shown when specific access) */}
            {accessType === "specific" && (
              <View>
                <Text className="text-sm font-medium text-foreground mb-3">
                  Select Properties ({selectedPropertyIds.length} selected)
                </Text>
                
                {state.properties.length === 0 ? (
                  <View 
                    className="p-4 rounded-lg items-center"
                    style={{ backgroundColor: colors.background }}
                  >
                    <Text className="text-sm text-muted">
                      No properties available. Add properties first.
                    </Text>
                  </View>
                ) : (
                  state.properties.map((property) => {
                    const isSelected = selectedPropertyIds.includes(property.id);
                    return (
                      <Pressable
                        key={property.id}
                        onPress={() => togglePropertySelection(property.id)}
                        style={({ pressed }) => [
                          styles.propertyOption,
                          { 
                            backgroundColor: isSelected ? colors.primary + "15" : colors.background,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <View 
                          className="w-5 h-5 rounded border-2 items-center justify-center mr-3"
                          style={{ 
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primary : "transparent",
                          }}
                        >
                          {isSelected && (
                            <IconSymbol name="checkmark" size={12} color="#FFFFFF" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-base text-foreground" numberOfLines={1}>
                            {property.address}
                          </Text>
                          <Text className="text-xs text-muted">
                            {property.propertyType} • {property.bedrooms} bed • {property.bathrooms} bath
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Send Invite Button */}
      <View 
        className="absolute bottom-0 left-0 right-0 px-6 py-4"
        style={{ backgroundColor: colors.background }}
      >
        <Pressable
          onPress={handleInvite}
          style={({ pressed }) => [
            styles.inviteButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.9 },
          ]}
        >
          <IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />
          <Text className="text-white text-base font-semibold ml-2">Send Invitation</Text>
        </Pressable>
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
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  roleOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  propertyOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  inviteButton: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
