import { useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, Property } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function getStatusColor(property: Property, colors: ReturnType<typeof useColors>) {
  const hasActiveInspection = property.inspections.some(i => i.status === "pending");
  const hasCompletedInspection = property.inspections.some(i => i.status === "completed");
  
  if (hasActiveInspection) return colors.warning;
  if (hasCompletedInspection) return colors.success;
  return colors.muted;
}

function getStatusText(property: Property) {
  const hasActiveInspection = property.inspections.some(i => i.status === "pending");
  const hasCompletedInspection = property.inspections.some(i => i.status === "completed");
  
  if (hasActiveInspection) return "Inspection Pending";
  if (hasCompletedInspection) return "Completed";
  return "Vacant";
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, dispatch } = useApp();

  // Redirect to onboarding if not onboarded
  useEffect(() => {
    if (!state.isLoading && !state.isOnboarded) {
      router.replace("/onboarding");
    }
  }, [state.isLoading, state.isOnboarded]);

  const handleAddProperty = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/property/create");
  };

  const handlePropertyPress = (property: Property) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/property/${property.id}`);
  };

  const renderPropertyCard = ({ item }: { item: Property }) => (
    <Pressable
      onPress={() => handlePropertyPress(item)}
      style={({ pressed }) => [
        styles.propertyCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.cardPressed,
      ]}
    >
      <View className="flex-row items-center">
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.propertyImage} />
        ) : (
          <View 
            style={[styles.propertyImage, styles.placeholderImage]}
            className="items-center justify-center"
          >
            <IconSymbol name="building.2.fill" size={32} color={colors.muted} />
          </View>
        )}
        <View className="flex-1 ml-4">
          <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
            {item.address}
          </Text>
          <Text className="text-sm text-muted mt-1">
            {item.propertyType.charAt(0).toUpperCase() + item.propertyType.slice(1)} • {item.bedrooms} bed • {item.bathrooms} bath
          </Text>
          <View 
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item, colors) }]}
            className="mt-2 self-start"
          >
            <Text className="text-xs font-medium text-white">
              {getStatusText(item)}
            </Text>
          </View>
        </View>
        <IconSymbol name="chevron.right" size={20} color={colors.muted} />
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8">
      <View 
        className="w-24 h-24 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: `${colors.primary}15` }}
      >
        <IconSymbol name="building.2.fill" size={48} color={colors.primary} />
      </View>
      <Text className="text-xl font-semibold text-foreground text-center mb-2">
        No Properties Yet
      </Text>
      <Text className="text-base text-muted text-center mb-8">
        Add your first property to start documenting inspections
      </Text>
      <Pressable
        onPress={handleAddProperty}
        style={({ pressed }) => [
          styles.addButton,
          { backgroundColor: colors.primary },
          pressed && styles.buttonPressed,
        ]}
      >
        <IconSymbol name="plus" size={20} color="#FFFFFF" />
        <Text className="text-white text-base font-semibold ml-2">Add Property</Text>
      </Pressable>
    </View>
  );

  if (state.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="text-2xl font-bold text-foreground">My Properties</Text>
          {state.properties.length > 0 && (
            <Pressable
              onPress={handleAddProperty}
              style={({ pressed }) => [
                styles.headerAddButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <IconSymbol name="plus" size={20} color="#FFFFFF" />
            </Pressable>
          )}
        </View>

        {/* Property List or Empty State */}
        {state.properties.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={state.properties}
            renderItem={renderPropertyCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  propertyCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  propertyImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: "#F1F5F9",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  headerAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
