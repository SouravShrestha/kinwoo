import { colors } from "@kinwoo/tokens/native";
import { Modal, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { ReactNode } from "react";

import { useTheme } from "@/theme/ThemeProvider";

import { Button } from "./Button";
import { Pressable } from "./Pressable";
import { useSheetStack } from "./sheet-stack";

// A centred card over a dimmed backdrop. It interrupts the current flow rather than being part of
// it, so it is a dialog and not a bottom sheet.
export function ConfirmDialog({
  open,
  title,
  description,
  error,
  confirmLabel,
  confirmVariant = "destructive",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isPending = false,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  error?: string | null;
  confirmLabel: string;
  confirmVariant?: "primary" | "destructive";
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const { themeStyle, resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  useSheetStack(open, !isPending, onCancel);

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
          style={[themeStyle, { backgroundColor: "rgba(0,0,0,0.6)" }]}
        >
          <Pressable
            onPress={isPending ? undefined : onCancel}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="absolute inset-0"
          />
          <View
            accessibilityLabel={title}
            className="w-full max-w-xs gap-5 rounded-2xl border p-6"
            style={{ backgroundColor: palette.sheet, borderColor: palette.border }}
          >
            <View className="items-center">
              <Text className="text-center font-display-medium text-lg text-foreground">
                {title}
              </Text>
              {description ? (
                <Text className="mt-1 text-center text-sm text-muted-foreground">
                  {description}
                </Text>
              ) : null}
              {error ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="mt-3 text-center text-sm text-destructive"
                >
                  {error}
                </Text>
              ) : null}
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label={cancelLabel}
                  variant="outline"
                  disabled={isPending}
                  onPress={onCancel}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={confirmLabel}
                  variant={confirmVariant}
                  loading={isPending}
                  onPress={onConfirm}
                />
              </View>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
