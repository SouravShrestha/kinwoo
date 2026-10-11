import { router } from "expo-router";

export function goHome() {
  router.dismissTo("/");
}

// A deep link can land on a house screen with nothing underneath it to go back to.
export function goBack() {
  if (router.canGoBack()) router.back();
  else goHome();
}
