import {
  amountDraftToPaise,
  isPaymentAmountDraft,
  PAYMENT_AMOUNT_WIDEST,
} from "@kinwoo/core/expenses";
import {
  ArrowRightIcon,
  EditIcon,
  GiveMoneyIcon,
  RecordPaymentIcon,
  RupeeIcon,
  TickIcon,
  TrashIcon,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Keyboard, Text, TextInput, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { PaymentDetailSkeleton } from "@/components/skeleton/skeletons";
import { SwipeDownScreen } from "@/components/SwipeDownScreen";
import { goBack } from "@/lib/house-navigation";
import { useKeyboardVisible } from "@/lib/use-keyboard-visible";
import { useSwipeDownToDismiss } from "@/lib/use-swipe-down-to-dismiss";
import { useTheme } from "@/theme/ThemeProvider";

const AVATAR = 72;
const AMOUNT_FONT = { fontSize: 40, lineHeight: 56, paddingVertical: 0 } as const;
const CARET_SPACE = 4;

export type PaymentParty = { name: string | null; url: string | null };

export type PaymentFormData = {
  payer: PaymentParty;
  payee: PaymentParty;
  heading: string;
  email: string | null;
  initialAmount: string;
};

// Shared by recording a payment and viewing one. Without `data` only the header shows.
export function PaymentForm({
  data,
  note,
  submitLabel,
  submitting,
  onSubmit,
  requireChange = false,
  onDelete,
  children,
}: {
  data: PaymentFormData | null;
  note: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (amountPaise: number) => void;
  // The submit button stays off until the amount differs from the one it started with.
  requireChange?: boolean;
  onDelete?: () => void;
  // Rendered inside the sheet, for dialogs.
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { pan, scrollGesture, onScroll, sheetStyle } = useSwipeDownToDismiss(goBack);
  const amountInput = useRef<TextInput>(null);
  // Null until the user types, so the field follows the starting amount until then.
  const [draft, setDraft] = useState<string | null>(null);
  const amount = draft ?? data?.initialAmount ?? "";
  const amountPaise = amountDraftToPaise(amount);
  const validAmount = amountPaise > 0;
  const changed = amountPaise !== amountDraftToPaise(data?.initialAmount ?? "");
  // The amount only counts once confirmed, and nothing can be submitted while editing.
  const [editing, setEditing] = useState(false);

  // The footer stays mounted and in place; it is only revealed once the keyboard is gone, so it
  // never rides up with the keyboard (Android resizes the window) or shifts when it returns.
  const keyboardVisible = useKeyboardVisible();
  const showFooter = !editing && !keyboardVisible;

  useEffect(() => {
    if (editing) amountInput.current?.focus();
  }, [editing]);

  const toggleEditing = () => {
    if (editing) Keyboard.dismiss();
    setEditing((value) => !value);
  };
  const editButtonClass = `ml-2 size-10 items-center justify-center rounded-full border ${
    editing ? "border-foreground bg-foreground" : "border-border bg-card"
  } ${editing && !validAmount ? "opacity-50" : "active:opacity-80"}`;

  return (
    <SwipeDownScreen pan={pan} sheetStyle={sheetStyle}>
      <GestureDetector gesture={scrollGesture}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          // Overscroll at the top would fight the pull-down; the sheet itself gives the feedback.
          bounces={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View
            className="flex-row items-center justify-between px-6"
            style={{ paddingTop: insets.top + 20 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={goBack}
              hitSlop={12}
              className="size-10 items-start justify-center"
            >
              <View style={{ transform: [{ rotate: "90deg" }] }}>
                <ArrowRightIcon size={28} color={palette.foreground} />
              </View>
            </Pressable>
            {data && onDelete ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete payment"
                disabled={editing}
                onPress={onDelete}
                hitSlop={6}
                className={`size-9 items-center justify-center rounded-lg bg-muted ${
                  editing ? "opacity-50" : "active:opacity-80"
                }`}
              >
                <TrashIcon size={16} color={palette.foreground} />
              </Pressable>
            ) : null}
          </View>

          {data ? (
            <View className="mt-16 items-center px-6">
              <View className="flex-row items-center gap-6">
                <Avatar name={data.payer.name} url={data.payer.url} size={AVATAR} />
                <GiveMoneyIcon size={44} color={palette.foreground} />
                <Avatar name={data.payee.name} url={data.payee.url} size={AVATAR} />
              </View>
              <Text
                accessibilityRole="header"
                className="mt-6 font-display-normal text-xl text-foreground"
              >
                {data.heading}
              </Text>
              {data.email ? (
                <Text className="mt-1 font-display-normal text-xs text-muted-foreground">
                  {data.email}
                </Text>
              ) : null}
              <View className="mt-6 flex-row items-center gap-3">
                <RupeeIcon size={30} color={palette.foreground} />
                <View>
                  <Text
                    accessible={false}
                    className="font-display-normal text-foreground opacity-0"
                    style={[AMOUNT_FONT, { paddingRight: CARET_SPACE }]}
                  >
                    {amount.length > PAYMENT_AMOUNT_WIDEST.length ? amount : PAYMENT_AMOUNT_WIDEST}
                  </Text>
                  <TextInput
                    ref={amountInput}
                    accessibilityLabel="Amount"
                    editable={editing}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={palette.mutedForeground}
                    value={amount}
                    onChangeText={(text) => isPaymentAmountDraft(text) && setDraft(text)}
                    className="absolute inset-0 font-display-normal text-foreground"
                    style={[AMOUNT_FONT, { textAlign: "center" }]}
                  />
                  <View
                    pointerEvents="none"
                    className={`absolute inset-x-0 h-0.5 rounded-full ${
                      editing ? "bg-foreground" : "bg-transparent"
                    }`}
                    style={{ bottom: -4 }}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={editing ? "Confirm amount" : "Edit amount"}
                  disabled={editing && !validAmount}
                  onPress={toggleEditing}
                  allowDoublePress
                  className={editButtonClass}
                >
                  {editing ? (
                    <TickIcon size={18} color={palette.background} />
                  ) : (
                    <EditIcon size={18} color={palette.foreground} />
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <PaymentDetailSkeleton />
          )}
        </Animated.ScrollView>
      </GestureDetector>
      {data ? (
        <View
          className="gap-4 px-6"
          style={{ paddingBottom: insets.bottom + 16, opacity: showFooter ? 1 : 0 }}
          pointerEvents={showFooter ? "auto" : "none"}
          accessibilityElementsHidden={!showFooter}
          importantForAccessibility={showFooter ? "auto" : "no-hide-descendants"}
        >
          <Text className="text-center font-display-normal text-sm text-muted-foreground">
            {note}
          </Text>
          <Button
            label={submitLabel}
            icon={<RecordPaymentIcon size={20} color={palette.background} />}
            loading={submitting}
            disabled={!validAmount || (requireChange && !changed)}
            onPress={() => onSubmit(amountPaise)}
          />
        </View>
      ) : null}
      {children}
    </SwipeDownScreen>
  );
}
