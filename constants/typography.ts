import { Platform, TextStyle } from "react-native";

// Font families
export const fonts = {
  // Crimson Pro - for headings (serif, timeless, credible)
  heading: Platform.select({
    ios: "CrimsonPro_700Bold",
    android: "CrimsonPro_700Bold",
    default: "CrimsonPro_700Bold",
  }) as string,
  headingSemibold: Platform.select({
    ios: "CrimsonPro_600SemiBold",
    android: "CrimsonPro_600SemiBold",
    default: "CrimsonPro_600SemiBold",
  }) as string,
  headingMedium: Platform.select({
    ios: "CrimsonPro_500Medium",
    android: "CrimsonPro_500Medium",
    default: "CrimsonPro_500Medium",
  }) as string,
  
  // Inter - for body text (clean, readable, professional)
  body: Platform.select({
    ios: "Inter_400Regular",
    android: "Inter_400Regular",
    default: "Inter_400Regular",
  }) as string,
  bodyMedium: Platform.select({
    ios: "Inter_500Medium",
    android: "Inter_500Medium",
    default: "Inter_500Medium",
  }) as string,
  bodySemibold: Platform.select({
    ios: "Inter_600SemiBold",
    android: "Inter_600SemiBold",
    default: "Inter_600SemiBold",
  }) as string,
  bodyBold: Platform.select({
    ios: "Inter_700Bold",
    android: "Inter_700Bold",
    default: "Inter_700Bold",
  }) as string,
};

// Typography styles
export const typography: Record<string, TextStyle> = {
  // Headings (Crimson Pro)
  h1: {
    fontFamily: fonts.heading,
    fontSize: 32,
    lineHeight: 40,
  },
  h2: {
    fontFamily: fonts.headingSemibold,
    fontSize: 24,
    lineHeight: 32,
  },
  h3: {
    fontFamily: fonts.headingSemibold,
    fontSize: 18,
    lineHeight: 24,
  },
  
  // Body (Inter)
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  bodySemibold: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    lineHeight: 22,
  },
  
  // Small text
  small: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  smallMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  
  // Button text
  button: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    lineHeight: 24,
  },
  
  // Label text
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Caption
  caption: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
};

// Design system constants
export const design = {
  // Border radius
  radius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    full: 24,
  },
  
  // Button heights
  button: {
    height: 52,
    heightSm: 44,
  },
  
  // Input heights
  input: {
    height: 48,
  },
  
  // Shadows
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    button: {
      shadowColor: "#8B2635",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    modal: {
      shadowColor: "#1C2839",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 32,
      elevation: 8,
    },
  },
};
