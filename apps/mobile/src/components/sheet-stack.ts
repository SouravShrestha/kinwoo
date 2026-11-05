import { useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { isTop, push, remove } from "@kinwoo/client/sheets";

// Non-dismissable sheets never join the stack; their back handler just swallows the press.
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
    if (!isOpen) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!dismissable) return true;
      if (!isTop(id)) return false;
      onClose?.();
      return true;
    });
    return () => subscription.remove();
  }, [isOpen, dismissable, onClose, id]);
}
