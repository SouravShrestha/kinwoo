import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

// iOS "will" events fire as the keyboard starts moving, so the animation tracks it.
// Android only has "did" events.
const SHOW_EVENT = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const HIDE_EVENT = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(SHOW_EVENT, () => setVisible(true));
    const hide = Keyboard.addListener(HIDE_EVENT, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
