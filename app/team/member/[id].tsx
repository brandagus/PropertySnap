import { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, Switch } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, TeamRole, PropertyAccessType, getRoleLabel, getRoleDescription, canManageTeam } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const roles: TeamRole[] = ["manager", "inspector", "viewer"];

export default function TeamMemberDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { state, dispatch } = useApp();

  const member = useMemo(() => {
    return state.team?.members.find((m) => m.id === id);
  }, [state.team?.members, id]);

  const [selectedRole, setSelectedRole] = useState<TeamRole>(member?.role || "inspector");
  const [accessType, setAccessType] = useState<PropertyAccessType>(member?.propertyAccess || "all");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(
    member?.assignedPropertyIds || []
  );

  const isAdmin = canManageTeam(state.user?.teamRole);
  const hasChanges = member && (
    selectedRole !== member.role ||
    accessType !== member.propertyAccess ||
    JSON.stringify(selectedPropertyIds.sort()) !== JSON.stringify(member.assignedPropertyIds.sort())
  );

  if (!member) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Team member not found</Text>
      </ScreenContainer>
    );
  }

  const handleSaveChanges = () => {
    if (accessType === "specific" && selectedPropertyIds.length === 0) {
      Alert.alert("Error", "Please select at least one property for this team member");
      return;
    }

    const updatedMember = {
      ...member,
      role: selectedRole,
      propertyAccess: accessType,
      assignedPropertyIds: accessType === "specific" ? selectedPropertyIds : [],
    };

    dispatch({ type: "UPDATE_TEAM_MEMBER", payload: updatedMember });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert("Success", "Team member updated successfully", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  const handleRemoveMember = () => {
    Alert.alert(
      "Remove Team Member",
      `Are you sure you want to remove ${member.name} from the team? They will lose access to all properties.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            dispatch({ type: "REMOVE_TEAM_MEMBER", payload: member.id });
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            router.back();
          },
        },
      ]
    );
  };

  const togglePropertySelection = (propertyId: string) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(propertyId)
        ? prev.filter((pid) => pid !== propertyId)
        : [...prev, propertyId]
    );
  };

  const getStatusColor = (status: typeof member.status) => {
    switch (status) {
      case "active":
        return colors.success;
      case "pending":
        return colors.warning;
      case "disabled":
        return colors.error;
      default:
        return colors.muted;
    }
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
        <Text className="text-xl font-bold text-foreground ml-4">Team Member</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-6 pb-32">
          {/* Member Info Card */}
          <View 
            className="p-5 rounded-xl mb-4"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="flex-row items-center mb-4">
              <View 
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.border }}
              >
                <Text className="text-foreground font-bold text-2xl">
                  {member.name[0]?.toUpperCase() || "?"}
                </Text>
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-foreground">{member.name}</Text>
                <Text className="text-sm text-muted">{member.email}</Text>
                <View className="flex-row items-center mt-1">
                  <View 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: getStatusColor(member.status) }}
                  />
                  <Text className="text-sm capitalize" style={{ color: getStatusColor(member.status) }}>
                    {member.status}
                  </Text>
                </View>
              </View>
            </View>

            <View 
              className="flex-row items-center p-3 rounded-lg"
              style={{ backgroundColor: colors.background }}
            >
              <IconSymbol name="calendar" size={16} color={colors.muted} />
              <Text className="text-sm text-muted ml-2">
                Invited {new Date(member.invitedAt).toLocaleDateString()}
              </Text>
              {member.acceptedAt && (
                <>
                  <Text className="text-sm text-muted mx-2">•</Text>
                  <Text className="text-sm text-muted">
                    Joined {new Date(member.acceptedAt).toLocaleDateString()}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Role Selection */}
          {isAdmin && (
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
          )}

          {/* Property Access */}
          {isAdmin && (
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

              {/* Property Selection */}
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
                        No properties available.
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
          )}

          {/* Remove Member */}
          {isAdmin && (
            <Pressable
              onPress={handleRemoveMember}
              style={({ pressed }) => [
                styles.dangerButton,
                { borderColor: colors.error },
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol name="trash.fill" size={18} color={colors.error} />
              <Text className="text-base font-medium ml-2" style={{ color: colors.error }}>
                Remove from Team
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      {isAdmin && hasChanges && (
        <View 
          className="absolute bottom-0 left-0 right-0 px-6 py-4"
          style={{ backgroundColor: colors.background }}
        >
          <Pressable
            onPress={handleSaveChanges}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text className="text-white text-base font-semibold">Save Changes</Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
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
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
