import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import mobileAds, {
  AdsConsent,
  BannerAd as GoogleBannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";

// Only production builds set the real unit; every other build gets Google's test ads.
const UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID ?? TestIds.ADAPTIVE_BANNER;

let ready: Promise<boolean> | null = null;

/** Shows the UMP consent form when required, then starts the SDK once per app run. */
function startAds(): Promise<boolean> {
  return (ready ??= AdsConsent.gatherConsent()
    .then(async ({ canRequestAds }) => {
      if (canRequestAds) await mobileAds().initialize();
      return canRequestAds;
    })
    .catch(() => false));
}

/** Renders nothing, margins included, until consent allows ads. */
export function BannerAd({ className }: { className?: string }) {
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    // ponytail: Android only, add iOS once it has an AdMob app ID and the ATT prompt.
    if (Platform.OS !== "android") return;
    let live = true;
    void startAds().then((ok) => live && setCanShow(ok));
    return () => {
      live = false;
    };
  }, []);

  if (!canShow) return null;

  return (
    <View className={`items-center ${className ?? ""}`}>
      <GoogleBannerAd unitId={UNIT_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
