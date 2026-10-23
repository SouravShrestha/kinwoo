import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: true, headerBackTitle: "Back", animation: "slide_from_right" }}
    >
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
    </Stack>
  );
}
