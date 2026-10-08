import { useAuth } from "@kinwoo/client/auth";
import { APP_NAME } from "@kinwoo/core/app";
import { GoogleIcon } from "@kinwoo/icons/native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Linking, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthSheet } from "@/components/AuthSheet";
import { Button } from "@/components/Button";
import { landingImage, landingImageDark } from "@/lib/images";
import { useTheme } from "@/theme/ThemeProvider";

const TERMS_URL = "https://kinwoo.cbsdev.me/legal/terms";
const PRIVACY_URL = "https://kinwoo.cbsdev.me/legal/privacy";

export default function LoginScreen() {
  const { isLoggedIn, ready, canSignInWithGoogle, signInWithGoogle } = useAuth();
  const { resolvedTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const [emailOpen, setEmailOpen] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Leaving this screen is the gate's job everywhere else, but the gate only
  // redirects *to* login, so the way back out lives here.
  useEffect(() => {
    if (ready && isLoggedIn) router.replace("/");
  }, [ready, isLoggedIn]);

  const google = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in failed.");
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-background px-7" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-1 items-center justify-center">
        <Image
          source={resolvedTheme === "dark" ? landingImageDark : landingImage}
          accessibilityIgnoresInvertColors
          accessible
          accessibilityLabel="Three people filling a shared shopping list together"
          resizeMode="contain"
          className="h-64 w-full"
        />
      </View>

      <View className="">
        <Text className="font-display-medium text-3xl text-foreground">Welcome to {APP_NAME}</Text>
        <Text className="mt-2 text-base text-muted-foreground">
          Everything shared. Nothing forgotten.
        </Text>
      </View>

      <View className="mt-10">
        <Button label="Log in with Email" onPress={() => setEmailOpen(true)} />

        {canSignInWithGoogle ? (
          <Button
            label="Continue with Google"
            variant="outline"
            loading={googleBusy}
            onPress={google}
            icon={<GoogleIcon size={20} />}
            className="mt-3"
          />
        ) : null}

        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            className="mt-3 text-center text-sm text-destructive"
          >
            {error}
          </Text>
        ) : null}
      </View>

      <View style={{ paddingBottom: insets.bottom + 24 }} className="mt-8">
        <Text className="text-center text-xs text-muted-foreground">
          By continuing to use {APP_NAME}, you agree to our{" "}
          <Text className="underline" onPress={() => void Linking.openURL(TERMS_URL)}>
            Terms &amp; Conditions
          </Text>{" "}
          and{" "}
          <Text className="underline" onPress={() => void Linking.openURL(PRIVACY_URL)}>
            Privacy Policy
          </Text>
          .
        </Text>
      </View>

      <AuthSheet open={emailOpen} onClose={() => setEmailOpen(false)} />
    </View>
  );
}
