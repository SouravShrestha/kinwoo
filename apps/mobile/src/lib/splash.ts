import * as SplashScreen from "expo-splash-screen";

const MIN_SPLASH_MS = 1000;
const MAX_SPLASH_MS = 5000;
const shownAt = Date.now();

SplashScreen.preventAutoHideAsync();

/** Hides the splash once the minimum display time has passed. Returns a cancel function. */
export function hideSplashWhenSettled(): () => void {
  const remaining = Math.max(0, MIN_SPLASH_MS - (Date.now() - shownAt));
  const timer = setTimeout(() => void SplashScreen.hideAsync(), remaining);
  return () => clearTimeout(timer);
}

// Safety net so a stalled auth restore can never trap the user on the splash.
export function hideSplashAfterTimeout(): () => void {
  const remaining = Math.max(0, MAX_SPLASH_MS - (Date.now() - shownAt));
  const timer = setTimeout(() => void SplashScreen.hideAsync(), remaining);
  return () => clearTimeout(timer);
}
