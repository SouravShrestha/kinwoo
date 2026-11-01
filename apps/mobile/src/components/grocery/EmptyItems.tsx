import type { GroceryEmptyCopy } from "@kinwoo/core/grocery";
import {
  NoAssignedIcon,
  NoActivityIcon,
  NoBoughtIcon,
  NoExpenseIcon,
  NoFilterMatchIcon,
  NoNotificationsIcon,
  NoPendingIcon,
  NoPrivateIcon,
  NoSettledIcon,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

const ICON_SIZE = 52;

const EMPTY_ICONS = {
  pending: NoPendingIcon,
  assigned: NoAssignedIcon,
  bought: NoBoughtIcon,
  expense: NoExpenseIcon,
  settled: NoSettledIcon,
  private: NoPrivateIcon,
  activity: NoActivityIcon,
  notifications: NoNotificationsIcon,
  filter: NoFilterMatchIcon,
};

export function EmptyItems({
  icon,
  title,
  hint,
  children,
}: Omit<GroceryEmptyCopy, "hint"> & {
  hint?: string | null;
  icon: keyof typeof EMPTY_ICONS;
  children?: ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const Icon = EMPTY_ICONS[icon];
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Icon size={ICON_SIZE} color={colors[resolvedTheme].foreground} />
      <Text className="text-center text-base text-foreground font-display-normal mt-5">
        {title}
      </Text>
      {hint ? (
        <Text className="mt-2 text-center text-base text-muted-foreground font-display-normal">
          {hint}
        </Text>
      ) : null}
      {children ? <View className="mt-6">{children}</View> : null}
    </View>
  );
}
