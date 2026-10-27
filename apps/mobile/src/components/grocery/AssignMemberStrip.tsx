import { splitMemberName, type HouseMember } from "@kinwoo/core/houses";
import { CaretDownIcon } from "@kinwoo/icons/native";
import { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { Avatar } from "@/components/houses/Avatar";
import { Pressable } from "@/components/Pressable";
import { MemberStripSkeleton } from "@/components/skeleton/skeletons";

const STRIP_GAP = 16;
const MEMBER_AVATAR_SIZE = 48;
const MEMBER_NAME_LINE_HEIGHT = 16;

export const MEMBER_STRIP_HEIGHT = STRIP_GAP + MEMBER_AVATAR_SIZE + 8 + MEMBER_NAME_LINE_HEIGHT * 2;

export function useExpandProgress(expanded: boolean) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [expanded, progress]);

  return progress;
}

export function ExpandCaret({ progress, color }: { progress: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <CaretDownIcon size={8} color={color} />
    </Animated.View>
  );
}

export function AssignMemberStrip({
  progress,
  expanded,
  members,
  isLoading,
  isAssigning,
  onPick,
  inset = 20,
  bleed = false,
  gapAt = "top",
}: {
  progress: SharedValue<number>;
  expanded: boolean;
  members: readonly HouseMember[];
  isLoading: boolean;
  isAssigning: boolean;
  onPick: (memberId: string, memberName: string) => void;
  inset?: number;
  // Pulls the strip out through a parent's horizontal padding of `inset` so it scrolls edge to edge.
  bleed?: boolean;
  gapAt?: "top" | "bottom";
}) {
  const stripStyle = useAnimatedStyle(() => ({
    height: progress.value * MEMBER_STRIP_HEIGHT,
    opacity: progress.value,
  }));

  return (
    <Animated.View
      style={[stripStyle, bleed ? { marginHorizontal: -inset } : null]}
      className="overflow-hidden"
      pointerEvents={expanded ? "auto" : "none"}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
    >
      <View
        style={{
          height: MEMBER_STRIP_HEIGHT,
          paddingTop: gapAt === "top" ? STRIP_GAP : 0,
          paddingBottom: gapAt === "bottom" ? STRIP_GAP : 0,
        }}
      >
        {isLoading ? (
          <View style={{ paddingHorizontal: inset }}>
            <MemberStripSkeleton />
          </View>
        ) : members.length === 0 ? (
          <Text className="text-center text-sm text-muted-foreground font-display-normal">
            No other house members found
          </Text>
        ) : (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: inset, gap: 8 }}
          >
            {members.map((member) => {
              const name = member.displayName || member.email || "Member";
              const { first, rest } = splitMemberName(name);

              return (
                <Pressable
                  key={member.userId}
                  accessibilityRole="button"
                  accessibilityLabel={`Assign to ${name}`}
                  disabled={isAssigning}
                  onPress={() => onPick(member.userId, name)}
                  className="w-[72px] items-center gap-2 active:opacity-70"
                >
                  <Avatar
                    name={member.displayName}
                    url={member.avatarUrl}
                    size={MEMBER_AVATAR_SIZE}
                  />
                  <View className="w-full" style={{ height: MEMBER_NAME_LINE_HEIGHT * 2 }}>
                    <Text
                      className="text-center text-xs text-foreground font-display-medium"
                      style={{ lineHeight: MEMBER_NAME_LINE_HEIGHT }}
                      numberOfLines={1}
                    >
                      {first}
                    </Text>
                    <Text
                      className="text-center text-xs text-foreground font-display-medium"
                      style={{ lineHeight: MEMBER_NAME_LINE_HEIGHT }}
                      numberOfLines={1}
                    >
                      {rest}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
}
