import { useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { isTop, push, remove } from "@kinwoo/client/sheets";

// Non-dismissable sheets never register, which makes back a no-op behind the login wall.
export function useSheetStack(isOpen: boolean, dismissable: boolean, onClose?: () => void) {
  const [id] = useState(() => Symbol("sheet"));
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (isOpen && dismissable) push(id, () => onCloseRef.current?.());
    else remove(id);
    return () => remove(id);
  }, [isOpen, dismissable, id]);

  useEffect(() => {
    if (!isOpen || !dismissable) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isTop(id)) return false;
      onClose?.();
      return true;
    });
    return () => subscription.remove();
  }, [isOpen, dismissable, onClose, id]);
}
