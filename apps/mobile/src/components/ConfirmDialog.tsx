import { CONFIRM_CANCEL_LABEL, type ConfirmCopy, type ConfirmIconName } from "@kinwoo/core/confirm";
import {
  LeaveHouseIcon,
  LockFilledIcon,
  LogoutIcon,
  TrashIcon,
  UserCheckIcon,
  UserCrossIcon,
  WorldIcon,
  type IconProps,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import type { ComponentType } from "react";
import { Modal, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useTheme } from "@/theme/ThemeProvider";

import { Button } from "./Button";
import { Pressable } from "./Pressable";
import { useSheetStack } from "./sheet-stack";

const ICONS: Record<ConfirmIconName, ComponentType<IconProps>> = {
  trash: TrashIcon,
  logout: LogoutIcon,
  lock: LockFilledIcon,
  world: WorldIcon,
  leaveHouse: LeaveHouseIcon,
  userCheck: UserCheckIcon,
  userCross: UserCrossIcon,
};

// A centred card over a dimmed backdrop. It interrupts the current flow rather than being part of
// it, so it is a dialog and not a bottom sheet.
export function ConfirmDialog({
  open,
  copy,
  error,
  onConfirm,
  onCancel,
  isPending = false,
}: {
  open: boolean;
  copy: ConfirmCopy;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const { themeStyle, resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  useSheetStack(open, !isPending, onCancel);

  const Icon = ICONS[copy.icon];
  const iconColor = copy.tone === "destructive" ? palette.destructive : palette.foreground;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={isPending ? undefined : onCancel}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* A Modal is a separate native window, so it does not inherit the theme variables. */}
        <View
          className="flex-1 items-center justify-center px-6"
          style={[themeStyle, { backgroundColor: palette.backdrop }]}
        >
          <Pressable
            onPress={isPending ? undefined : onCancel}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="absolute inset-0"
          />
          <View
            accessibilityLabel={copy.title}
            className="w-full max-w-sm overflow-hidden rounded-2xl border"
            style={{ backgroundColor: palette.dialog, borderColor: palette.dialogBorder }}
          >
            <View className="items-center py-6">
              <Icon size={24} color={iconColor} />
            </View>

            <View className="px-6 py-3 mt-1" style={{ backgroundColor: palette.dialogHeader }}>
              <Text className="text-center font-display-medium text-lg text-foreground">
                {copy.title}
              </Text>
            </View>

            <View className="px-6 pt-5 my-2">
              <Text className="text-center font-display-normal text-base text-foreground">
                {copy.message}
              </Text>
              {error ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="mt-3 text-center text-base text-destructive"
                >
                  {error}
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-center gap-4 px-6 pb-5 pt-6">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={CONFIRM_CANCEL_LABEL}
                accessibilityState={{ disabled: isPending }}
                disabled={isPending}
                onPress={onCancel}
                className={`h-14 flex-1 items-center justify-center ${isPending ? "opacity-50" : "active:opacity-80"}`}
              >
                <View className="border-b-[1.4px] border-foreground pb-0">
                  <Text className="font-display-medium text-base text-foreground">
                    {CONFIRM_CANCEL_LABEL}
                  </Text>
                </View>
              </Pressable>
              <View className="flex-1">
                <Button label={copy.confirmLabel} loading={isPending} onPress={onConfirm} />
              </View>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
