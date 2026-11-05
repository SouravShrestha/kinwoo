import { ArrowRightIcon } from "@kinwoo/icons/native";
import { Text, View } from "react-native";

import { HeroCard } from "@/components/home/BalanceCard";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

type InviteFriendsCardProps = {
  canInvite: boolean;
  onPress: () => void;
  onReplay?: () => void;
};

const LINE = "text-center font-display-medium text-sm leading-[18px] text-foreground";

export function InviteFriendsCard({ canInvite, onPress, onReplay }: InviteFriendsCardProps) {
  const { resolvedTheme, colors } = useTheme();
  const foreground = colors[resolvedTheme].foreground;

  return (
    <HeroCard onReplay={onReplay}>
      <Pressable
        accessibilityRole={canInvite ? "button" : undefined}
        accessibilityLabel="Invite friends. Solo mode is fine, but it's better with friends"
        disabled={!canInvite}
        onPress={onPress}
        className="items-center gap-1.5 active:opacity-80"
      >
        <Text className={LINE}>Solo mode is fine,</Text>
        <Text className={LINE}>but it's better with friends</Text>
        <View className="mt-2 flex-row items-center gap-2">
          <Text className="font-display-medium text-lg text-foreground">Invite friends</Text>
          {canInvite ? <ArrowRightIcon size={16} color={foreground} /> : null}
        </View>
      </Pressable>
    </HeroCard>
  );
}
