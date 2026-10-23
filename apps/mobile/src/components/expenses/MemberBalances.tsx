import { useMemberBalances } from "@kinwoo/client/expenses";
import { useActiveHouse } from "@kinwoo/client/houses";
import {
  paymentReminderMessage,
  REMINDER_SHARE_DIALOG_TITLE,
  type MemberBalanceRow,
} from "@kinwoo/core/expenses";
import { formatPaise } from "@kinwoo/core/grocery";
import { memberDisplayName, shortMemberName } from "@kinwoo/core/houses";
import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useState } from "react";
import { Share, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExpandCaret, useExpandProgress } from "@/components/grocery/AssignMemberStrip";
import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { SwipeDownScreen } from "@/components/SwipeDownScreen";
import { goBack, openRecordPayment } from "@/lib/house-navigation";
import { useSwipeDownToDismiss } from "@/lib/use-swipe-down-to-dismiss";
import { useTheme } from "@/theme/ThemeProvider";

function PillButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="rounded-xl border border-border bg-card px-5 py-2 active:opacity-80"
    >
      <Text className="font-display-medium text-sm text-foreground">{label}</Text>
    </Pressable>
  );
}

const MEMBER_AVATAR = 44;
const BRANCH_ROW = 48;

function MemberRow({ row, houseName }: { row: MemberBalanceRow; houseName: string }) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { member, settlements } = row;
  const [open, setOpen] = useState(member.isSelf);
  const name = memberDisplayName(member.name);
  const owes = member.netPaise < 0;
  const progress = useExpandProgress(open);
  const contentHeight = useSharedValue(0);
  const bodyStyle = useAnimatedStyle(() => ({
    height: contentHeight.get() * progress.get(),
    opacity: progress.get(),
    overflow: "hidden",
  }));

  return (
    <View className="border-b border-border px-6 py-6">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          settlements.length > 0
            ? `${open ? "Hide" : "Show"} who ${member.isSelf ? "you settle" : `${name} settles`} with`
            : undefined
        }
        accessibilityState={{ expanded: settlements.length > 0 ? open : undefined }}
        disabled={settlements.length === 0}
        onPress={() => setOpen((value) => !value)}
        allowDoublePress
        className="flex-row items-center gap-3"
      >
        <Avatar name={member.name} url={member.avatarUrl} size={MEMBER_AVATAR} />
        <Text className="flex-1 font-display-normal text-base text-foreground">
          <Text className="font-display-medium">{member.isSelf ? "You" : name}</Text>
          {member.netPaise === 0 ? (
            member.isSelf ? (
              " are settled up"
            ) : (
              " is settled up"
            )
          ) : (
            <>
              {owes
                ? member.isSelf
                  ? " owe "
                  : " owes "
                : member.isSelf
                  ? " get back "
                  : " gets back "}
              <Text className={`font-display-medium ${owes ? "text-destructive" : "text-accent"}`}>
                {formatPaise(Math.abs(member.netPaise))}
              </Text>
              {" in total"}
            </>
          )}
        </Text>
        {settlements.length > 0 ? (
          <View className="-mr-2 size-10 items-center justify-center">
            <ExpandCaret progress={progress} color={palette.mutedForeground} />
          </View>
        ) : null}
      </Pressable>

      {settlements.length > 0 ? (
        <Animated.View style={bodyStyle}>
          {/* Absolute, so its natural height is measured whatever height the clip is at. */}
          <View
            className="absolute inset-x-0 top-0"
            onLayout={(event) => contentHeight.set(event.nativeEvent.layout.height)}
          >
            <View className="mt-2" style={{ marginLeft: MEMBER_AVATAR / 2 }}>
              {settlements.map((settlement, index) => {
                const other =
                  settlement.from.userId === member.userId ? settlement.to : settlement.from;
                const last = index === settlements.length - 1;
                return (
                  <View
                    key={`${settlement.from.userId}-${settlement.to.userId}`}
                    className={last ? undefined : "pb-3"}
                  >
                    <View
                      className="absolute left-0 top-0 w-px bg-border"
                      style={last ? { height: BRANCH_ROW / 2 } : { bottom: 0 }}
                    />
                    <View
                      className="absolute left-0 h-px w-5 bg-border"
                      style={{ top: BRANCH_ROW / 2 }}
                    />
                    <View className="ml-5">
                      <View className="flex-row items-center gap-3" style={{ height: BRANCH_ROW }}>
                        <Avatar name={other.name} url={other.avatarUrl} size={26} />
                        <Text className="flex-1 font-display-normal text-sm text-muted-foreground">
                          {settlement.from.isSelf
                            ? "You owe"
                            : `${shortMemberName(settlement.from.name)} owes`}{" "}
                          <Text className="font-display-medium text-destructive">
                            {formatPaise(settlement.amountPaise)}
                          </Text>{" "}
                          to {settlement.to.isSelf ? "you" : shortMemberName(settlement.to.name)}
                        </Text>
                      </View>
                      <View className="flex-row gap-2" style={{ paddingLeft: 38 }}>
                        {settlement.from.isSelf ? null : (
                          <PillButton
                            label="Remind"
                            onPress={() =>
                              void Share.share(
                                {
                                  message: paymentReminderMessage({
                                    debtorName: settlement.from.name,
                                    creditorName: settlement.to.name,
                                    houseName,
                                    amountPaise: settlement.amountPaise,
                                  }),
                                },
                                { dialogTitle: REMINDER_SHARE_DIALOG_TITLE },
                              )
                            }
                          />
                        )}
                        <PillButton
                          label="Settle up"
                          onPress={() =>
                            openRecordPayment(
                              settlement.from.userId,
                              settlement.to.userId,
                              settlement.amountPaise,
                            )
                          }
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

export function MemberBalances({ houseId }: { houseId: string }) {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { data: rows } = useMemberBalances(houseId);
  const { activeHouse } = useActiveHouse();
  const { pan, scrollGesture, onScroll, sheetStyle } = useSwipeDownToDismiss(goBack);

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
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <View className="px-6" style={{ paddingTop: insets.top + 20 }}>
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
            <Text
              accessibilityRole="header"
              className="mt-4 font-display-normal text-xl text-foreground"
            >
              Balance Summary
            </Text>
          </View>

          {rows && activeHouse ? (
            <View className="mt-10">
              {rows.map((row) => (
                <MemberRow key={row.member.userId} row={row} houseName={activeHouse.house.name} />
              ))}
            </View>
          ) : null}
        </Animated.ScrollView>
      </GestureDetector>
    </SwipeDownScreen>
  );
}
