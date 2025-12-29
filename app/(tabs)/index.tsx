import { useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp, Property } from "@/lib/app-context";
import { fonts, design } from "@/constants/typography";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function getStatusColor(property: Property) {
  const hasActiveInspection = property.inspections.some(i => i.status === "pending");
  const hasCompletedInspection = property.inspections.some(i => i.status === "completed");
  
  if (hasActiveInspection) return "#D97706"; // Amber
  if (hasCompletedInspection) return "#2D5C3F"; // Forest green
  return "#6B6B6B"; // Warm gray
}

function getStatusBgColor(property: Property) {
  const hasActiveInspection = property.inspections.some(i => i.status === "pending");
  const hasCompletedInspection = property.inspections.some(i => i.status === "completed");
  
  if (hasActiveInspection) return "#FFF3E0"; // Light amber
  if (hasCompletedInspection) return "#E8F5E9"; // Light green
  return "#F5F3F0"; // Soft gray
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
  const { state } = useApp();

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
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardContent}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.propertyImage} />
        ) : (
          <View style={[styles.propertyImage, styles.placeholderImage]}>
            <IconSymbol name="building.2.fill" size={32} color="#6B6B6B" />
          </View>
        )}
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyAddress} numberOfLines={2}>
            {item.address}
          </Text>
          <Text style={styles.propertyDetails}>
            {item.propertyType.charAt(0).toUpperCase() + item.propertyType.slice(1)} • {item.bedrooms} bed • {item.bathrooms} bath
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item), borderColor: getStatusColor(item) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
              {getStatusText(item)}
            </Text>
          </View>
        </View>
        <IconSymbol name="chevron.right" size={20} color="#6B6B6B" />
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <IconSymbol name="building.2.fill" size={48} color="#8B2635" />
      </View>
      <Text style={styles.emptyTitle}>No Properties Yet</Text>
      <Text style={styles.emptyDescription}>
        Add your first property to start documenting inspections
      </Text>
      <Pressable
        onPress={handleAddProperty}
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <IconSymbol name="plus" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Property</Text>
      </Pressable>
    </View>
  );

  if (state.isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Properties</Text>
          {state.properties.length > 0 && (
            <Pressable
              onPress={handleAddProperty}
              style={({ pressed }) => [
                styles.headerAddButton,
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
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: "#6B6B6B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: "#1C2839",
  },
  headerAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#8B2635",
    alignItems: "center",
    justifyContent: "center",
    ...design.shadow.button,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  propertyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E6E3",
    marginBottom: 16,
    padding: 20,
    ...design.shadow.card,
  },
  cardPressed: {
    borderColor: "#C59849",
    transform: [{ scale: 0.98 }],
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  propertyImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: "#F9F7F4",
    alignItems: "center",
    justifyContent: "center",
  },
  propertyInfo: {
    flex: 1,
    marginLeft: 16,
  },
  propertyAddress: {
    fontFamily: fonts.headingSemibold,
    fontSize: 18,
    color: "#1C2839",
    marginBottom: 4,
  },
  propertyDetails: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#6B6B6B",
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F9F7F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#C59849",
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: "#1C2839",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyDescription: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: "#6B6B6B",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B2635",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 6,
    ...design.shadow.button,
  },
  buttonPressed: {
    backgroundColor: "#6D1E2A",
    transform: [{ scale: 0.98 }],
  },
  addButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: 8,
  },
});
