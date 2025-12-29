import { useState, useRef } from "react";
import { View, Text, FlatList, Dimensions, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const { width } = Dimensions.get("window");

interface CarouselItem {
  id: string;
  icon: "camera.fill" | "doc.text.fill" | "checkmark.circle.fill";
  title: string;
  description: string;
}

const carouselData: CarouselItem[] = [
  {
    id: "1",
    icon: "camera.fill",
    title: "Document Property Condition",
    description: "Take timestamped photos of every room and detail to create a complete record of the property's condition.",
  },
  {
    id: "2",
    icon: "doc.text.fill",
    title: "Side-by-Side Comparison",
    description: "Compare move-in and move-out photos to clearly identify any changes during the tenancy.",
  },
  {
    id: "3",
    icon: "checkmark.circle.fill",
    title: "Legally-Defensible PDFs",
    description: "Generate professional reports with digital signatures that protect both landlords and tenants.",
  },
];

export default function CarouselScreen() {
  const router = useRouter();
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleGetStarted = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace("/onboarding/user-type");
  };

  const handleNext = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentIndex < carouselData.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const renderItem = ({ item }: { item: CarouselItem }) => (
    <View style={[styles.slide, { width }]}>
      <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center mb-8">
        <IconSymbol name={item.icon} size={48} color={colors.primary} />
      </View>
      <Text className="text-2xl font-bold text-foreground text-center mb-4 px-8">
        {item.title}
      </Text>
      <Text className="text-base text-muted text-center px-8 leading-6">
        {item.description}
      </Text>
    </View>
  );

  const renderPagination = () => (
    <View className="flex-row justify-center items-center gap-2 mb-8">
      {carouselData.map((_, index) => (
        <View
          key={index}
          className={`h-2 rounded-full ${
            index === currentIndex ? "w-8 bg-primary" : "w-2 bg-border"
          }`}
        />
      ))}
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1">
        <View className="flex-1 justify-center">
          <FlatList
            ref={flatListRef}
            data={carouselData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          />
        </View>

        <View className="px-6 pb-8">
          {renderPagination()}
          
          {currentIndex === carouselData.length - 1 ? (
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text className="text-white text-base font-semibold">Get Started</Text>
            </Pressable>
          ) : (
            <View className="flex-row gap-4">
              <Pressable
                onPress={handleGetStarted}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: colors.border },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text className="text-muted text-base font-semibold">Skip</Text>
              </Pressable>
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primary, flex: 1 },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text className="text-white text-base font-semibold">Next</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primaryButton: {
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
