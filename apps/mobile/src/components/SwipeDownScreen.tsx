import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { ReactNode } from "react";
import { GestureDetector, type PanGesture } from "react-native-gesture-handler";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import type { StyleProp, ViewStyle } from "react-native";

export function SwipeDownScreen({
  pan,
  sheetStyle,
  children,
}: {
  pan: PanGesture;
  sheetStyle: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  children: ReactNode;
}) {
  return (
    // The screen is a native modal above the root portal host, so its sheets need their own.
    <BottomSheetModalProvider>
      <GestureDetector gesture={pan}>
        <Animated.View className="flex-1 bg-background" style={sheetStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </BottomSheetModalProvider>
  );
}
