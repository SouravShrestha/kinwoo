import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
  useBottomSheet,
  useBottomSheetTimingConfigs,
} from "@gorhom/bottom-sheet";
import { colors, radius } from "@kinwoo/tokens/native";
import { cssInterop } from "nativewind";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ComponentRef } from "react";
import { Easing, runOnJS, useAnimatedReaction } from "react-native-reanimated";
import { TouchableOpacity } from "react-native-gesture-handler";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSheetStack } from "./sheet-stack";
import { useTheme } from "@/theme/ThemeProvider";

/** How long to wait for a dismiss to settle before forcing a remount. */
const STUCK_DISMISS_MS = 1200;

export function BottomSheet({
  open,
  onClose,
  label,
  dismissable = true,
  showHandle = true,
  scrollable = true,
  maxHeight,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  label: string;
  dismissable?: boolean;
  showHandle?: boolean;
  scrollable?: boolean;
  maxHeight?: number;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  useSheetStack(open, dismissable, onClose);

  const animationConfigs = useBottomSheetTimingConfigs({
    duration: 220,
    easing: Easing.out(Easing.cubic),
  });

  const sheetRef = useRef<ComponentRef<typeof BottomSheetModal>>(null);
  const presented = useRef(false);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // gorhom is imperative and occasionally wedges mid-dismiss. The counters let
  // us detect a dismiss that never settles and remount via key={instance}.
  const settled = useRef(0);
  const wanted = useRef(0);
  const [instance, setInstance] = useState(0);

  useEffect(() => {
    if (!open) return;
    wanted.current += 1;
    setInstance(wanted.current);
  }, [open]);

  useEffect(() => {
    if (open) {
      if (instance !== wanted.current) return;
      presented.current = true;
      sheetRef.current?.present();
      return;
    }

    if (!presented.current) return;
    presented.current = false;
    sheetRef.current?.dismiss();

    const deadline = setTimeout(() => {
      if (settled.current === instance) return;
      wanted.current += 1;
      setInstance(wanted.current);
    }, STUCK_DISMISS_MS);

    return () => clearTimeout(deadline);
  }, [open, instance]);

  const handleDismissed = useCallback(() => {
    settled.current = instance;
    if (instance !== wanted.current) return;
    // openRef rather than open: this fires from a stale closure during the
    // dismiss animation.
    if (!openRef.current || !dismissable) return;
    onClose?.();
  }, [dismissable, onClose, instance]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={dismissable ? "close" : "none"}
      />
    ),
    [dismissable],
  );

  const handleIndicatorStyle = useMemo(
    () => ({
      backgroundColor: palette.mutedForeground,
      opacity: showHandle ? 0.3 : 0,
      width: showHandle ? 40 : 0,
    }),
    [showHandle, palette.mutedForeground],
  );

  const padding = {
    paddingHorizontal: 24,
    paddingTop: showHandle ? 14 : 12,
    paddingBottom: Math.max(insets.bottom, 32),
  };

  const a11y = {
    accessibilityViewIsModal: true,
    accessibilityLabel: label,
  } as const;

  return (
    <BottomSheetModal
      key={instance}
      ref={sheetRef}
      stackBehavior="push"
      enableDynamicSizing
      maxDynamicContentSize={maxHeight}
      enablePanDownToClose={dismissable}
      enableContentPanningGesture={dismissable}
      enableHandlePanningGesture={dismissable}
      onDismiss={handleDismissed}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: palette.background }}
      style={{
        borderTopLeftRadius: radius["2xl"],
        borderTopRightRadius: radius["2xl"],
        overflow: "hidden",
      }}
      handleIndicatorStyle={handleIndicatorStyle}
      animationConfigs={animationConfigs}
    >
      <CloseWatcher onClosed={handleDismissed} />
      {scrollable ? (
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...a11y}
        >
          <View style={padding}>{children}</View>
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView {...a11y}>
          <View style={padding}>{children}</View>
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

/**
 * Catches a gesture-driven close, which `onDismiss` does not always report.
 */
function CloseWatcher({ onClosed }: { onClosed: () => void }) {
  const { animatedIndex } = useBottomSheet();

  useAnimatedReaction(
    () => animatedIndex.value,
    (index, previous) => {
      if (previous !== null && previous > -0.9 && index <= -0.99) {
        runOnJS(onClosed)();
      }
    },
    [onClosed],
  );

  return null;
}

/**
 * gorhom's keyboard-aware input and gesture-handler's touchable, re-exported
 * with NativeWind support so content inside a sheet can still use className.
 */
export const SheetTextInput = BottomSheetTextInput;
export const SheetTouchable = TouchableOpacity;

cssInterop(SheetTextInput, { className: "style" });
cssInterop(SheetTouchable, { className: "style" });
