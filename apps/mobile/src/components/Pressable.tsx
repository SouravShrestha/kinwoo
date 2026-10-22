import { Pressable as NativePressable, type PressableProps } from "react-native";

import { usePressGuard } from "@/lib/press-guard";

// Every button dims while pressed, like the filter chips. A className that sets its own `active:`
// style keeps it.
const DEFAULT_PRESS_CLASS = "active:opacity-70";

export function Pressable({
  onPress,
  allowDoublePress = false,
  className,
  ...rest
}: PressableProps & { allowDoublePress?: boolean }) {
  const guardedPress = usePressGuard(onPress, allowDoublePress);
  const pressClass = className?.includes("active:")
    ? className
    : `${className ?? ""} ${DEFAULT_PRESS_CLASS}`.trim();
  return <NativePressable onPress={guardedPress} className={pressClass} {...rest} />;
}
