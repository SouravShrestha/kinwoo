import { ArrowRightIcon, CloudLockFilledIcon, SimplifyIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { SheetHeader } from "@/components/houses/SheetHeader";
import { Pressable } from "@/components/Pressable";
import { Switch } from "@/components/Switch";
import { useTheme } from "@/theme/ThemeProvider";

export function ExpensesMenuSheet({
  open,
  onClose,
  simplifyDebts,
  onSimplifyDebtsChange,
  onViewPrivate,
}: {
  open: boolean;
  onClose: () => void;
  simplifyDebts: boolean;
  onSimplifyDebtsChange: (next: boolean) => void;
  onViewPrivate: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  return (
    <BottomSheet open={open} onClose={onClose} label="Expense options" showClose>
      <SheetHeader />
      <View className="mt-14 flex-row items-start gap-3">
        <SimplifyIcon size={20} color={palette.foreground} />
        <View className="flex-1 -mt-1.5">
          <Text className="font-display-normal text-base text-foreground">Simplify debts</Text>
          <Text className="mt-1 font-display-normal text-sm text-muted-foreground">
            Settle house debts with fewer payments
          </Text>
        </View>
        <Switch
          checked={simplifyDebts}
          onChange={onSimplifyDebtsChange}
          accessibilityLabel="Simplify debts"
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View private spending"
        onPress={onViewPrivate}
        className="mt-6 min-h-12 flex-row items-center gap-3 active:opacity-60"
      >
        <CloudLockFilledIcon size={20} color={palette.foreground} />
        <Text className="flex-1 font-display-normal text-base text-foreground">
          View private spending
        </Text>
        <ArrowRightIcon size={20} color={palette.mutedForeground} />
      </Pressable>
    </BottomSheet>
  );
}
