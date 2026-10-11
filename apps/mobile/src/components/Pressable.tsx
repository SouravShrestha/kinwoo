import { Pressable as NativePressable, type PressableProps } from "react-native";

import { usePressGuard } from "@/lib/press-guard";

export function Pressable({
  onPress,
  allowDoublePress = false,
  ...rest
}: PressableProps & { allowDoublePress?: boolean }) {
  const guardedPress = usePressGuard(onPress, allowDoublePress);
  return <NativePressable onPress={guardedPress} {...rest} />;
}
