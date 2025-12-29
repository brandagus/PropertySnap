import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, Inspection, Property } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface InspectionWithProperty extends Inspection {
  property: Property;
}

export default function InspectionsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state } = useApp();

  // Flatten all inspections with their property info
  const allInspections: InspectionWithProperty[] = state.properties.flatMap(property =>
    property.inspections
      .filter(i => i.status !== "archived")
      .map(inspection => ({
        ...inspection,
        property,
      }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingInspections = allInspections.filter(i => i.status === "pending");
  const completedInspections = allInspections.filter(i => i.status === "completed");

  const handleInspectionPress = (inspection: InspectionWithProperty) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/inspection/${inspection.id}`);
  };

  const renderInspectionCard = ({ item }: { item: InspectionWithProperty }) => (
    <Pressable
      onPress={() => handleInspectionPress(item)}
      style={({ pressed }) => [
        styles.inspectionCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.cardPressed,
      ]}
    >
      <View className="flex-row items-center">
        <View 
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ 
            backgroundColor: item.status === "pending" 
              ? `${colors.warning}20` 
              : `${colors.success}20` 
          }}
        >
          <IconSymbol 
            name={item.status === "pending" ? "doc.text.fill" : "checkmark.circle.fill"} 
            size={24} 
            color={item.status === "pending" ? colors.warning : colors.success} 
          />
        </View>
        <View className="flex-1 ml-4">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {item.property.address}
          </Text>
          <Text className="text-sm text-muted mt-1">
            {item.type === "move-in" ? "Move-in" : "Move-out"} Inspection
          </Text>
          <Text className="text-xs text-muted mt-1">
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View 
          style={[
            styles.statusBadge, 
            { backgroundColor: item.status === "pending" ? colors.warning : colors.success }
          ]}
        >
          <Text className="text-xs font-medium text-white">
            {item.status === "pending" ? "Pending" : "Completed"}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8">
      <View 
        className="w-24 h-24 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: `${colors.primary}15` }}
      >
        <IconSymbol name="doc.text.fill" size={48} color={colors.primary} />
      </View>
      <Text className="text-xl font-semibold text-foreground text-center mb-2">
        No Inspections Yet
      </Text>
      <Text className="text-base text-muted text-center">
        Create a property and start an inspection to see it here
      </Text>
    </View>
  );

  const renderSectionHeader = (title: string, count: number) => (
    <View className="flex-row items-center justify-between mb-3 mt-4">
      <Text className="text-lg font-semibold text-foreground">{title}</Text>
      <View 
        className="px-2 py-1 rounded-full"
        style={{ backgroundColor: colors.border }}
      >
        <Text className="text-xs font-medium text-muted">{count}</Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 py-4">
          <Text className="text-2xl font-bold text-foreground">Inspections</Text>
        </View>

        {allInspections.length === 0 ? (
          renderEmptyState()
        ) : (
          <View className="flex-1 px-4">
            {pendingInspections.length > 0 && (
              <>
                {renderSectionHeader("Pending", pendingInspections.length)}
                <FlatList
                  data={pendingInspections}
                  renderItem={renderInspectionCard}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </>
            )}
            
            {completedInspections.length > 0 && (
              <>
                {renderSectionHeader("Completed", completedInspections.length)}
                <FlatList
                  data={completedInspections}
                  renderItem={renderInspectionCard}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </>
            )}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  inspectionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardPressed: {
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
