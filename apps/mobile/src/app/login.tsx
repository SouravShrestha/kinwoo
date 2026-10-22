import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { APP_NAME } from "@kinwoo/core/app";
import { GoogleIcon } from "@kinwoo/icons/native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthSheet } from "@/components/AuthSheet";
import { Button } from "@/components/Button";
import { landingImage, landingImageDark, logoTypedBlack, logoTypedWhite } from "@/lib/images";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legal";
import { usePressGuard } from "@/lib/press-guard";
import { useTheme } from "@/theme/ThemeProvider";

export default function LoginScreen() {
  const { isLoggedIn, ready, canSignInWithGoogle, signInWithGoogle } = useAuth();
  const { ready: profileReady, needsDisplayName } = useProfile();
  const { resolvedTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const [emailOpen, setEmailOpen] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hold until the profile is ready and no name is owed: gorhom's modal does not reliably
  // present across a route change, so redirecting early would skip the display-name sheet.
  useEffect(() => {
    if (ready && isLoggedIn && profileReady && !needsDisplayName) router.replace("/");
  }, [ready, isLoggedIn, profileReady, needsDisplayName]);

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

  const openTerms = usePressGuard(() => void WebBrowser.openBrowserAsync(TERMS_URL));
  const openPrivacy = usePressGuard(() => void WebBrowser.openBrowserAsync(PRIVACY_URL));

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
        <Image
          source={resolvedTheme === "dark" ? logoTypedWhite : logoTypedBlack}
          accessibilityIgnoresInvertColors
          accessible
          accessibilityLabel={APP_NAME}
          resizeMode="contain"
          className="h-[45px] w-[160px]"
        />
        <Text className="font-display-normal mt-2 text-base text-muted-foreground ml-2">
          Everything shared. Nothing forgotten.
        </Text>
      </View>

      <View className="mt-12 px-1">
        <Button label="Sign in with Email" onPress={() => setEmailOpen(true)} />

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
          <Text className="underline" onPress={openTerms}>
            Terms &amp; Conditions
          </Text>{" "}
          and{" "}
          <Text className="underline" onPress={openPrivacy}>
            Privacy Policy
          </Text>
          .
        </Text>
      </View>

      <AuthSheet open={emailOpen} onClose={() => setEmailOpen(false)} />
    </View>
  );
}
