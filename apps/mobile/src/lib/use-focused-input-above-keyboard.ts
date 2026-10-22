import { useCallback, useEffect, useRef } from "react";
import { Keyboard, TextInput } from "react-native";
import Animated, { useAnimatedRef, type SharedValue } from "react-native-reanimated";

const KEYBOARD_GAP = 12;

// The native scroll-into-view leaves the focused input flush against the keyboard, so this
// nudges the scroll until it sits at least KEYBOARD_GAP above the keyboard's top edge.
export function useFocusedInputAboveKeyboard(scrollY: SharedValue<number>) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const keyboardTop = useRef<number | null>(null);

  const revealFocusedInput = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const top = keyboardTop.current;
    if (!input || top === null) return;
    input.measureInWindow((_x, y, _width, height) => {
      const overlap = y + height + KEYBOARD_GAP - top;
      if (overlap > 0) {
        scrollRef.current?.scrollTo({ y: scrollY.get() + overlap, animated: true });
      }
    });
  }, [scrollRef, scrollY]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      revealFocusedInput();
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardTop.current = null;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [revealFocusedInput]);

  return { scrollRef, revealFocusedInput };
}
