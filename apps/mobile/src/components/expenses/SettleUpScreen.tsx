import { useHouseBalances } from "@kinwoo/client/expenses";
import { useHouseMembers } from "@kinwoo/client/houses";
import { unsettledPairs } from "@kinwoo/core/expenses";
import { formatPaise } from "@kinwoo/core/grocery";
import { memberDisplayName } from "@kinwoo/core/houses";
import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { SwipeDownScreen } from "@/components/SwipeDownScreen";
import { goBack, openRecordPayment } from "@/lib/house-navigation";
import { useSwipeDownToDismiss } from "@/lib/use-swipe-down-to-dismiss";
import { useTheme } from "@/theme/ThemeProvider";

export function SettleUpScreen({
  houseId,
  simplifyDebts,
}: {
  houseId: string;
  simplifyDebts: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { data: balances } = useHouseBalances(houseId, simplifyDebts);
  const { data: members } = useHouseMembers(houseId);
  const { pan, scrollGesture, onScroll, sheetStyle } = useSwipeDownToDismiss(goBack);
  const pairs = balances ? unsettledPairs(balances) : [];

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
          </View>

          {balances ? (
            <>
              <Text
                accessibilityRole="header"
                className="mt-4 px-6 font-display-normal text-xl text-foreground"
              >
                {pairs.length > 0 ? "Which balance do you want to settle?" : "You are settled up"}
              </Text>
              <View className="mt-8">
                {pairs.map((pair, index) => {
                  const owes = pair.netPaise < 0;
                  const email = members?.find((member) => member.userId === pair.userId)?.email;
                  return (
                    <Pressable
                      key={pair.userId}
                      accessibilityRole="button"
                      onPress={() => openRecordPayment(pair.userId)}
                      className={`flex-row items-center gap-4 px-6 py-5 active:opacity-80 ${
                        index < pairs.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <Avatar name={pair.name} url={pair.avatarUrl} size={48} />
                      <View className="flex-1">
                        <Text className="font-display-normal text-base text-foreground">
                          {memberDisplayName(pair.name)}
                        </Text>
                        {email ? (
                          <Text
                            numberOfLines={1}
                            className="mt-0.5 font-display-normal text-xs text-muted-foreground"
                          >
                            {email}
                          </Text>
                        ) : null}
                      </View>
                      <View className="items-end">
                        <Text
                          className={`font-display-normal text-xs ${
                            owes ? "text-destructive" : "text-accent"
                          }`}
                        >
                          {owes ? "you owe" : "owes you"}
                        </Text>
                        <Text
                          className={`font-display-medium text-base ${
                            owes ? "text-destructive" : "text-accent"
                          }`}
                        >
                          {formatPaise(Math.abs(pair.netPaise))}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </Animated.ScrollView>
      </GestureDetector>
    </SwipeDownScreen>
  );
}
