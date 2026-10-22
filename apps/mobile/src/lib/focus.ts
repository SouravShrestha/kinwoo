import { focusManager } from "@tanstack/react-query";
import { AppState } from "react-native";

// React Query has no window focus on native, so app foregrounding stands in for it. This is what
// makes a removed member's house drop on return instead of waiting for the next poll.
export function installFocusManager(): () => void {
  const subscription = AppState.addEventListener("change", (state) => {
    focusManager.setFocused(state === "active");
  });

  return () => subscription.remove();
}
