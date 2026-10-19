import type { PayerMember, PayerSplitForm } from "@kinwoo/client/expenses";
import { payerRemainingLabel } from "@kinwoo/core/expenses";
import { formatPaise } from "@kinwoo/core/grocery";
import { splitMemberName } from "@kinwoo/core/houses";
import { ArrowRightIcon, CheckCircleIcon, CheckIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useState } from "react";
import { Keyboard, Text, useWindowDimensions, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet, SHEET_KEYBOARD_GAP, SheetTextInput } from "@/components/BottomSheet";
import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { useKeyboardHeight } from "@/lib/use-keyboard-visible";
import { useTheme } from "@/theme/ThemeProvider";

const TITLE = "Who paid for the expense?";
const LIST_GAP = 28;
const SUMMARY_GAP = 24;
const SUMMARY_GAP_TYPING = 12;
// gorhom's handle row plus BottomSheet's top padding.
const SHEET_TOP = 38;
const SCREEN_TOP_GAP = 24;
const MIN_LIST_HEIGHT = 128;

function nameLines(member: PayerMember): { first: string; rest: string } {
  return member.isYou ? { first: "You", rest: "" } : splitMemberName(member.name);
}

export function PayerSheet({
  open,
  onClose,
  payers,
}: {
  open: boolean;
  onClose: () => void;
  payers: PayerSplitForm;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { split } = payers;
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const summaryGap = keyboardHeight > 0 ? SUMMARY_GAP_TYPING : SUMMARY_GAP;
  const [titleHeight, setTitleHeight] = useState(0);
  const [summaryHeight, setSummaryHeight] = useState(0);
  const [listHeight, setListHeight] = useState(0);

  // The list takes whatever the screen has left around the title and summary, and only
  // scrolls once the members no longer fit.
  const listMaxHeight = Math.max(
    MIN_LIST_HEIGHT,
    windowHeight -
      insets.top -
      SCREEN_TOP_GAP -
      keyboardHeight -
      SHEET_TOP -
      titleHeight -
      LIST_GAP -
      summaryGap -
      summaryHeight -
      (keyboardHeight > 0 ? SHEET_KEYBOARD_GAP : Math.max(insets.bottom, 32)),
  );
  const scrolls = listHeight > listMaxHeight;

  const cancel = () => {
    Keyboard.dismiss();
    payers.discard();
    onClose();
  };
  const done = () => {
    if (!payers.commit()) return;
    Keyboard.dismiss();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={cancel} label={TITLE} scrollable={false}>
      <View onLayout={(event) => setTitleHeight(event.nativeEvent.layout.height)}>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard changes"
            onPress={cancel}
            hitSlop={12}
            className="size-10 items-start justify-center active:opacity-60"
          >
            <View style={{ transform: [{ rotate: "90deg" }] }}>
              <ArrowRightIcon size={28} color={palette.foreground} />
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save who paid"
            accessibilityState={{ disabled: !payers.canCommit }}
            disabled={!payers.canCommit}
            onPress={done}
            allowDoublePress
            hitSlop={12}
            className={`size-10 items-end justify-center active:opacity-60 ${
              payers.canCommit ? "" : "opacity-40"
            }`}
          >
            <CheckCircleIcon size={26} color={palette.foreground} />
          </Pressable>
        </View>
        <Text
          accessibilityRole="header"
          className="mt-2 font-display-medium text-xl text-foreground"
        >
          {TITLE}
        </Text>
      </View>

      <ScrollView
        scrollEnabled={scrolls}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={scrolls}
        onContentSizeChange={(_, height) => setListHeight(height)}
        style={{ maxHeight: listMaxHeight, marginTop: LIST_GAP }}
      >
        {payers.members.map((member) => {
          const selected = payers.isSelected(member.userId);
          const { first, rest } = nameLines(member);
          const label = member.isYou ? "You" : member.name;

          return (
            <View key={member.userId} className="min-h-16 flex-row items-center gap-4 py-2">
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={label}
                onPress={() => payers.toggle(member.userId)}
                allowDoublePress
                className="min-w-0 flex-1 flex-row items-center gap-4 self-stretch active:opacity-70"
              >
                <View
                  className={`size-5 items-center justify-center rounded-md ${
                    selected ? "bg-foreground" : "border border-border"
                  }`}
                >
                  {selected ? <CheckIcon size={10} color={palette.background} /> : null}
                </View>
                <Avatar name={member.name} url={member.avatarUrl} size={36} />
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="font-display-normal text-base text-foreground">
                    {first}
                  </Text>
                  {rest ? (
                    <Text
                      numberOfLines={1}
                      className="font-display-normal text-base text-foreground"
                    >
                      {rest}
                    </Text>
                  ) : null}
                </View>
              </Pressable>

              <View className="h-11 w-24 flex-row items-center rounded-xl bg-muted px-3">
                <Text className="font-display-normal text-base text-muted-foreground">₹</Text>
                <SheetTextInput
                  accessibilityLabel={`Amount paid by ${label}`}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={palette.mutedForeground}
                  value={payers.amountText(member.userId)}
                  onChangeText={(text: string) => payers.setAmount(member.userId, text)}
                  className="min-w-0 flex-1 pl-1 text-right font-display-normal text-foreground"
                  style={{ fontSize: 16, paddingVertical: 0 }}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View
        accessibilityLiveRegion="polite"
        onLayout={(event) => setSummaryHeight(event.nativeEvent.layout.height)}
        className="items-center self-end"
        style={{ marginTop: summaryGap }}
      >
        <Text className="font-display-medium text-lg text-foreground">
          {formatPaise(split.assignedPaise)} of {formatPaise(payers.totalPaise)}
        </Text>
        <Text
          className={`font-display-normal text-base ${
            split.state === "over" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {payerRemainingLabel(split)}
        </Text>
      </View>
    </BottomSheet>
  );
}
