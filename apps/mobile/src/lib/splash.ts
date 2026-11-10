import * as SplashScreen from "expo-splash-screen";

const MIN_SPLASH_MS = 500;
const MAX_SPLASH_MS = 5000;
const shownAt = Date.now();

SplashScreen.preventAutoHideAsync();

function hideAfter(ms: number): () => void {
  const timer = setTimeout(
    () => void SplashScreen.hideAsync(),
    Math.max(0, ms - (Date.now() - shownAt)),
  );
  return () => clearTimeout(timer);
}

/** Hides the splash once the minimum display time has passed. Returns a cancel function. */
export const hideSplashWhenSettled = () => hideAfter(MIN_SPLASH_MS);

// Safety net so a stalled auth restore can never trap the user on the splash.
export const hideSplashAfterTimeout = () => hideAfter(MAX_SPLASH_MS);
