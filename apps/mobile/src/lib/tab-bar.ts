import { BottomTabBarHeightContext } from "expo-router/tabs";
import { use } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_BAR_HEIGHT = 64;

/** Gap between the floating tab bar and the bottom edge. */
export function tabBarBottom(insetBottom: number) {
  return Math.max(16, insetBottom - 8);
}

/**
 * Space to leave at the bottom so content clears the floating tab bar: its height plus its
 * offset and a gap inside tabs, the bottom inset elsewhere.
 */
export function useTabBarSpace() {
  const { bottom } = useSafeAreaInsets();
  const inTabs = use(BottomTabBarHeightContext) !== undefined;
  return inTabs ? tabBarBottom(bottom) + TAB_BAR_HEIGHT + 16 : bottom;
}
