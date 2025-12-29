import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, TeamMember, getRoleLabel, canManageTeam } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export default function TeamScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, dispatch } = useApp();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState("");

  const isAdmin = canManageTeam(state.user?.teamRole);
  const hasTeam = !!state.team;

  const handleCreateTeam = () => {
    if (!teamName.trim()) {
      Alert.alert("Error", "Please enter a team name");
      return;
    }

    dispatch({ type: "CREATE_TEAM", payload: { name: teamName.trim() } });
    setShowCreateTeam(false);
    setTeamName("");

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    Alert.alert(
      "Remove Team Member",
      `Are you sure you want to remove ${member.name} from the team?`,
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
          },
        },
      ]
    );
  };

  const getStatusColor = (status: TeamMember["status"]) => {
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

  // No team yet - show create team UI
  if (!hasTeam) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-row items-center mb-6">
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text className="text-2xl font-bold text-foreground ml-4">Team</Text>
        </View>

        {showCreateTeam ? (
          <View 
            className="p-6 rounded-xl"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-lg font-semibold text-foreground mb-4">
              Create Your Team
            </Text>
            <Text className="text-sm text-muted mb-4">
              Set up a team to invite property managers, inspectors, and other staff members.
            </Text>
            
            <Text className="text-sm font-medium text-foreground mb-2">
              Company / Agency Name
            </Text>
            <TextInput
              value={teamName}
              onChangeText={setTeamName}
              placeholder="e.g., Ray White Sydney"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
              ]}
              returnKeyType="done"
              onSubmitEditing={handleCreateTeam}
            />

            <View className="flex-row gap-3 mt-6">
              <Pressable
                onPress={() => setShowCreateTeam(false)}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text className="text-foreground font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateTeam}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.primary, flex: 2 },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text className="text-white font-medium">Create Team</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <View 
              className="w-20 h-20 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: colors.surface }}
            >
              <IconSymbol name="person.3.fill" size={40} color={colors.primary} />
            </View>
            <Text className="text-xl font-bold text-foreground mb-2 text-center">
              Enterprise Team Management
            </Text>
            <Text className="text-base text-muted text-center mb-8 px-6">
              Create a team to invite staff members, assign properties, and manage access permissions.
            </Text>
            <Pressable
              onPress={() => setShowCreateTeam(true)}
              style={({ pressed }) => [
                styles.createButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.9 },
              ]}
            >
              <IconSymbol name="plus" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold text-base ml-2">Create Team</Text>
            </Pressable>
          </View>
        )}
      </ScreenContainer>
    );
  }

  // Has team - show team management
  return (
    <ScreenContainer>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <View className="ml-4">
            <Text className="text-xl font-bold text-foreground">{state.team?.name}</Text>
            <Text className="text-sm text-muted">
              {state.team?.members.length || 0} team members
            </Text>
          </View>
        </View>
        {isAdmin && (
          <Pressable
            onPress={() => router.push("/team/invite")}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9 },
            ]}
          >
            <IconSymbol name="plus" size={18} color="#FFFFFF" />
            <Text className="text-white font-medium text-sm ml-1">Invite</Text>
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-6 pb-8">
          {/* Owner Card */}
          <View 
            className="p-4 rounded-xl mb-4"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent }}
          >
            <View className="flex-row items-center">
              <View 
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="text-white font-bold text-lg">
                  {state.user?.name?.[0] || state.user?.email?.[0]?.toUpperCase() || "A"}
                </Text>
              </View>
              <View className="ml-4 flex-1">
                <View className="flex-row items-center">
                  <Text className="text-base font-semibold text-foreground">
                    {state.user?.name || state.user?.email}
                  </Text>
                  <View 
                    className="ml-2 px-2 py-0.5 rounded"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <Text className="text-xs text-white font-medium">Owner</Text>
                  </View>
                </View>
                <Text className="text-sm text-muted">{state.user?.email}</Text>
              </View>
            </View>
          </View>

          {/* Team Members */}
          {state.team?.members.length === 0 ? (
            <View 
              className="p-8 rounded-xl items-center"
              style={{ backgroundColor: colors.surface }}
            >
              <IconSymbol name="person.badge.plus" size={48} color={colors.muted} />
              <Text className="text-base font-medium text-foreground mt-4 mb-2">
                No team members yet
              </Text>
              <Text className="text-sm text-muted text-center">
                Invite property managers, inspectors, or other staff to join your team.
              </Text>
            </View>
          ) : (
            state.team?.members.map((member) => (
              <Pressable
                key={member.id}
                onPress={() => router.push(`/team/member/${member.id}`)}
                style={({ pressed }) => [
                  styles.memberCard,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View className="flex-row items-center">
                  <View 
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.border }}
                  >
                    <Text className="text-foreground font-bold text-lg">
                      {member.name[0]?.toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View className="ml-4 flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-base font-semibold text-foreground">
                        {member.name}
                      </Text>
                      <View 
                        className="ml-2 w-2 h-2 rounded-full"
                        style={{ backgroundColor: getStatusColor(member.status) }}
                      />
                    </View>
                    <Text className="text-sm text-muted">{member.email}</Text>
                    <View className="flex-row items-center mt-1">
                      <Text className="text-xs text-muted">
                        {getRoleLabel(member.role)}
                      </Text>
                      <Text className="text-xs text-muted mx-2">•</Text>
                      <Text className="text-xs text-muted">
                        {member.propertyAccess === "all" 
                          ? "All properties" 
                          : `${member.assignedPropertyIds.length} properties`}
                      </Text>
                    </View>
                  </View>
                  {isAdmin && (
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={() => handleRemoveMember(member)}
                        style={({ pressed }) => [
                          styles.iconButton,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <IconSymbol name="trash.fill" size={18} color={colors.error} />
                      </Pressable>
                      <IconSymbol name="chevron.right" size={18} color={colors.muted} />
                    </View>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  memberCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconButton: {
    padding: 8,
    marginRight: 4,
  },
});
