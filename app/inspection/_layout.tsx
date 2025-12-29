import { Stack } from "expo-router";

export default function InspectionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="invite" />
      <Stack.Screen name="camera" />
      <Stack.Screen name="signature" />
    </Stack>
  );
}
