import { useEffect, useState } from "react";
import { BackHandler } from "react-native";

import { isTop, push, remove } from "./sheet-stack-core";

/**
 * Registers an open sheet so Android back closes the topmost one.
 *
 * Non-dismissable sheets never register, which is what makes back a no-op
 * behind the login wall.
 */
export function useSheetStack(isOpen: boolean, dismissable: boolean, onClose?: () => void) {
  const [id] = useState(() => Symbol("sheet"));

  useEffect(() => {
    if (isOpen && dismissable) push(id);
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
