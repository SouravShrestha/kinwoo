import { BottomTabBarHeightContext } from "expo-router/tabs";
import { use } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_BAR_HEIGHT = 64;
// Android's gesture nav gives no safe-area inset, so the floor needs to be higher than
// iOS's to keep the same visual clearance from the edge.
const MIN_BOTTOM = Platform.OS === "android" ? 24 : 16;

/** Gap between the floating tab bar and the bottom edge. */
export function tabBarBottom(insetBottom: number) {
  return Math.max(MIN_BOTTOM, insetBottom - 8);
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
