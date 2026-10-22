import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
  useBottomSheet,
  useBottomSheetTimingConfigs,
} from "@gorhom/bottom-sheet";
import { CloseIcon } from "@kinwoo/icons/native";
import { colors, radius } from "@kinwoo/tokens/native";
import { cssInterop } from "nativewind";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ComponentRef } from "react";
import { Easing, runOnJS, useAnimatedReaction } from "react-native-reanimated";
import { Gesture, GestureDetector, TouchableOpacity } from "react-native-gesture-handler";
import { Keyboard, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Pressable } from "./Pressable";
import { createSheetFooterSlot, SheetFooterContext, type SheetFooterSlot } from "./sheet-footer";
import { useSheetStack } from "./sheet-stack";
import { useKeyboardVisible } from "@/lib/use-keyboard-visible";
import { useTheme } from "@/theme/ThemeProvider";

const STUCK_DISMISS_MS = 1200;
// The keyboard covers the home indicator, so only a small gap is kept above it.
export const SHEET_KEYBOARD_GAP = 20;

export function BottomSheet({
  open,
  onClose,
  label,
  dismissable = true,
  showHandle = true,
  showClose = false,
  scrollable = true,
  maxHeight,
  minHeightRatio,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  label: string;
  dismissable?: boolean;
  showHandle?: boolean;
  showClose?: boolean;
  scrollable?: boolean;
  maxHeight?: number;
  minHeightRatio?: number;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
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

  const keyboardVisible = useRef(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      keyboardVisible.current = true;
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardVisible.current = false;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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

  const handleBackdropPress = useCallback(() => {
    if (keyboardVisible.current) {
      Keyboard.dismiss();
      return;
    }
    sheetRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <KeyboardAwareBackdrop
        {...props}
        dismissable={dismissable}
        onBackdropPress={handleBackdropPress}
      />
    ),
    [dismissable, handleBackdropPress],
  );

  const handleIndicatorStyle = useMemo(
    () => ({
      backgroundColor: palette.mutedForeground,
      opacity: showHandle ? 0.3 : 0,
      width: showHandle ? 40 : 0,
    }),
    [showHandle, palette.mutedForeground],
  );

  const bottomPadding = Math.max(insets.bottom, 32);
  const [footerSlot] = useState(createSheetFooterSlot);
  const footerHeight = useSyncExternalStore(footerSlot.subscribe, footerSlot.getHeight);
  const keyboardShown = useKeyboardVisible();

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <FooterHost {...props} slot={footerSlot} bottomPadding={bottomPadding} />
    ),
    [footerSlot, bottomPadding],
  );

  const padding = {
    paddingHorizontal: 24,
    paddingTop: showHandle ? 14 : 12,
    // The footer floats over the content, so the content leaves room for it while it shows.
    paddingBottom: keyboardShown
      ? SHEET_KEYBOARD_GAP
      : footerHeight > 0
        ? footerHeight
        : bottomPadding,
    minHeight: minHeightRatio ? screenHeight * minHeightRatio : undefined,
  };

  const closeButton = showClose ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={8}
      onPress={() => sheetRef.current?.dismiss()}
      className="absolute right-3 top-2 z-10 size-9 items-center justify-center active:opacity-60"
    >
      <CloseIcon size={22} color={palette.foreground} />
    </Pressable>
  ) : null;

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
      // Otherwise the sheet can be dragged down behind a keyboard that stays up.
      enableBlurKeyboardOnGesture
      // Edge-to-edge never resizes the window, so gorhom's resize mode would leave the sheet
      // under the keyboard. Pan mode shifts the sheet from the keyboard events instead.
      android_keyboardInputMode="adjustPan"
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      backgroundStyle={{ backgroundColor: palette.sheet }}
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
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          {...a11y}
        >
          <View style={padding}>
            {closeButton}
            <SheetFooterContext.Provider value={footerSlot}>{children}</SheetFooterContext.Provider>
          </View>
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView {...a11y}>
          <View style={padding}>
            {closeButton}
            <SheetFooterContext.Provider value={footerSlot}>{children}</SheetFooterContext.Provider>
          </View>
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

// The default `pressBehavior="close"` closes immediately, leaving no chance to dismiss the
// keyboard first, so the press is driven by our own tap gesture.
function KeyboardAwareBackdrop({
  dismissable,
  onBackdropPress,
  ...props
}: BottomSheetBackdropProps & {
  dismissable: boolean;
  onBackdropPress: () => void;
}) {
  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(onBackdropPress)();
      }),
    [onBackdropPress],
  );

  const backdrop = (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="none"
    />
  );

  if (!dismissable) return backdrop;

  return <GestureDetector gesture={tap}>{backdrop}</GestureDetector>;
}

// `onDismiss` does not always report a gesture-driven close.
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

// gorhom pins the footer by its measured height, which lags a growing child by a frame or more.
// A fixed-height, touch-transparent box with the content at its bottom keeps the bottom edge
// still while the content grows. Hidden while typing so it never covers the focused field;
// the content drops its footer spacer at the same time so it sits right above the keyboard.
function FooterHost({
  animatedFooterPosition,
  slot,
  bottomPadding,
}: BottomSheetFooterProps & { slot: SheetFooterSlot; bottomPadding: number }) {
  const content = useSyncExternalStore(slot.subscribe, slot.get);
  const { resolvedTheme } = useTheme();
  const keyboardVisible = useKeyboardVisible();

  if (!content || keyboardVisible) return null;

  return (
    <BottomSheetFooter animatedFooterPosition={animatedFooterPosition}>
      <View
        pointerEvents="box-none"
        style={{ height: content.maxHeight + bottomPadding, justifyContent: "flex-end" }}
      >
        <View
          onLayout={(event) => slot.setHeight(event.nativeEvent.layout.height)}
          style={{
            paddingHorizontal: 24,
            paddingBottom: bottomPadding,
            backgroundColor: colors[resolvedTheme].sheet,
          }}
        >
          {content.node}
        </View>
      </View>
    </BottomSheetFooter>
  );
}

export const SheetTextInput = BottomSheetTextInput;
export const SheetTouchable = TouchableOpacity;

cssInterop(SheetTextInput, { className: "style" });
cssInterop(SheetTouchable, { className: "style" });
