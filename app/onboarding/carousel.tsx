import { useState, useRef } from "react";
import { View, Text, FlatList, Dimensions, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { fonts, design } from "@/constants/typography";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const { width } = Dimensions.get("window");

interface CarouselItem {
  id: string;
  icon: "camera.fill" | "doc.text.fill" | "checkmark.shield.fill";
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
    icon: "checkmark.shield.fill",
    title: "Legally-Defensible PDFs",
    description: "Generate professional reports with digital signatures that protect both landlords and tenants.",
  },
];

export default function CarouselScreen() {
  const router = useRouter();
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
      <View style={styles.iconContainer}>
        <IconSymbol name={item.icon} size={48} color="#8B2635" />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      {carouselData.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.carouselContainer}>
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

        <View style={styles.footer}>
          {renderPagination()}
          
          {currentIndex === carouselData.length - 1 ? (
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>
          ) : (
            <View style={styles.buttonRow}>
              <Pressable
                onPress={handleGetStarted}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.secondaryButtonText}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { flex: 1 },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F9F7F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    borderWidth: 2,
    borderColor: "#C59849",
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: "#1C2839",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: "#6B6B6B",
    textAlign: "center",
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#8B2635",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#E8E6E3",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    height: 52,
    backgroundColor: "#8B2635",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    ...design.shadow.button,
  },
  buttonPressed: {
    backgroundColor: "#6D1E2A",
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 52,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#8B2635",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: "#8B2635",
  },
});
