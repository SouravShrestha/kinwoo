import { TrashIcon, VerifiedIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { View } from "react-native";
import Animated, { Easing, FadeInDown, FadeOutDown, ReduceMotion } from "react-native-reanimated";

import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

export const ASSIGNED_SELECTION_BAR_HEIGHT = 92;

const ENTERING = FadeInDown.duration(220)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const EXITING = FadeOutDown.duration(160).reduceMotion(ReduceMotion.System);

const ICON_BUTTON_CLASS =
  "size-12 items-center justify-center rounded-xl border border-border active:bg-muted";

export function AssignedSelectionBar({
  canMarkBought,
  deleting,
  onDelete,
  onMarkBought,
}: {
  canMarkBought: boolean;
  deleting: boolean;
  onDelete: () => void;
  onMarkBought: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  return (
    <Animated.View
      entering={ENTERING}
      exiting={EXITING}
      className="absolute inset-x-0 bottom-0 border-t border-border bg-background"
    >
      <View
        className="flex-row items-center gap-3 px-5 pb-5 pt-5"
        style={{ height: ASSIGNED_SELECTION_BAR_HEIGHT }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete"
          accessibilityState={{ disabled: deleting }}
          disabled={deleting}
          onPress={onDelete}
          className={`${ICON_BUTTON_CLASS} ${deleting ? "opacity-50" : ""}`}
        >
          <TrashIcon size={18} color={palette.foreground} />
        </Pressable>
        <View className="flex-1">
          <Button
            label="Mark bought"
            icon={<VerifiedIcon size={18} color={palette.primaryForeground} />}
            disabled={!canMarkBought}
            onPress={onMarkBought}
            className="h-12"
          />
        </View>
      </View>
    </Animated.View>
  );
}
