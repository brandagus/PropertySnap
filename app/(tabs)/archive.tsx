import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, Inspection, Property } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface ArchivedInspection extends Inspection {
  property: Property;
}

export default function ArchiveScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

  // Get all completed/archived inspections
  const archivedInspections: ArchivedInspection[] = state.properties.flatMap(property =>
    property.inspections
      .filter(i => i.status === "completed" || i.status === "archived")
      .map(inspection => ({
        ...inspection,
        property,
      }))
  ).sort((a, b) => {
    const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return dateB - dateA;
  });

  // Filter by search query
  const filteredInspections = archivedInspections.filter(inspection => {
    const query = searchQuery.toLowerCase();
    return (
      inspection.property.address.toLowerCase().includes(query) ||
      (inspection.property.tenantName?.toLowerCase().includes(query) ?? false)
    );
  });

  const handleInspectionPress = (inspection: ArchivedInspection) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Navigate to view PDF or inspection details
    router.push(`/inspection/${inspection.id}`);
  };

  const renderInspectionCard = ({ item }: { item: ArchivedInspection }) => (
    <Pressable
      onPress={() => handleInspectionPress(item)}
      style={({ pressed }) => [
        styles.inspectionCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.cardPressed,
      ]}
    >
      <View className="flex-row items-start">
        <View 
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: `${colors.success}20` }}
        >
          <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
        </View>
        <View className="flex-1 ml-4">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {item.property.address}
          </Text>
          {item.property.tenantName && (
            <Text className="text-sm text-muted mt-1">
              Tenant: {item.property.tenantName}
            </Text>
          )}
          <View className="flex-row items-center mt-2">
            <Text className="text-xs text-muted">
              {item.type === "move-in" ? "Move-in" : "Move-out"} • {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : "N/A"}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            // View PDF action
          }}
          style={({ pressed }) => [
            styles.viewPdfButton,
            { borderColor: colors.primary },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text className="text-primary text-sm font-medium">View PDF</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8">
      <View 
        className="w-24 h-24 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: `${colors.primary}15` }}
      >
        <IconSymbol name="archivebox.fill" size={48} color={colors.primary} />
      </View>
      <Text className="text-xl font-semibold text-foreground text-center mb-2">
        No Archived Inspections
      </Text>
      <Text className="text-base text-muted text-center">
        Completed inspections will appear here for your records
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 py-4">
          <Text className="text-2xl font-bold text-foreground">Archive</Text>
        </View>

        {/* Search Bar */}
        {archivedInspections.length > 0 && (
          <View className="px-4 mb-4">
            <View 
              className="flex-row items-center px-4 rounded-lg"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by address or tenant..."
                placeholderTextColor={colors.muted}
                style={[styles.searchInput, { color: colors.foreground }]}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <IconSymbol name="xmark" size={18} color={colors.muted} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {archivedInspections.length === 0 ? (
          renderEmptyState()
        ) : filteredInspections.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-base text-muted text-center">
              No inspections match your search
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredInspections}
            renderItem={renderInspectionCard}
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
  inspectionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardPressed: {
    opacity: 0.7,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 8,
    fontSize: 16,
  },
  viewPdfButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
});
