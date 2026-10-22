import "./globals.css";
// Must be the first import after styles: it has to initialise before any gesture consumer.
import "react-native-gesture-handler";

import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppProviders } from "@/components/AppProviders";
import "@/lib/splash";
import { ThemeProvider } from "@/theme/ThemeProvider";

// Transparent so the screen below shows through while the sheet is dragged down; the screen
// handles its own swipe because the native one loses to its ScrollView.
const SWIPE_DOWN_SHEET = {
  presentation: "transparentModal",
  animation: "slide_from_bottom",
  gestureEnabled: false,
} as const;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppProviders>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="house/invite" options={SWIPE_DOWN_SHEET} />
              <Stack.Screen name="profile" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="item/new" options={SWIPE_DOWN_SHEET} />
              <Stack.Screen
                name="item/bought"
                options={{ animation: "slide_from_bottom", gestureDirection: "vertical" }}
              />
              <Stack.Screen name="expense/new" options={SWIPE_DOWN_SHEET} />
              <Stack.Screen name="expense/edit" options={SWIPE_DOWN_SHEET} />
              <Stack.Screen name="expenses/private" options={SWIPE_DOWN_SHEET} />
              <Stack.Screen name="expenses/balances" options={SWIPE_DOWN_SHEET} />
              <Stack.Screen name="expenses/totals" options={SWIPE_DOWN_SHEET} />
              <Stack.Screen name="expenses/settle-up" options={SWIPE_DOWN_SHEET} />
              <Stack.Screen name="expenses/record-payment" options={SWIPE_DOWN_SHEET} />
              <Stack.Screen name="expenses/payment" options={SWIPE_DOWN_SHEET} />
              <Stack.Screen name="expense/[expenseId]" options={SWIPE_DOWN_SHEET} />
              <Stack.Screen name="item/bought-batch" options={SWIPE_DOWN_SHEET} />
            </Stack>
          </AppProviders>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
