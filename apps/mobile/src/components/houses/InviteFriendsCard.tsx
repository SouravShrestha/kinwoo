import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

import { inviteFriends } from "@/lib/images";
import { useTheme } from "@/theme/ThemeProvider";

const IMAGE_STYLE = {
  width: "45%",
  aspectRatio: 2,
  alignSelf: "flex-end",
  marginLeft: -8,
  marginBottom: -8,
} as const;

type InviteFriendsCardProps = {
  canInvite: boolean;
  onPress: () => void;
};

export function InviteFriendsCard({ canInvite, onPress }: InviteFriendsCardProps) {
  const { resolvedTheme } = useTheme();
  const foreground = colors[resolvedTheme].foreground;

  return (
    <Pressable
      accessibilityRole={canInvite ? "button" : undefined}
      accessibilityLabel="Invite friends. Solo mode is fine, but it's better with friends"
      disabled={!canInvite}
      onPress={onPress}
      className="w-full flex-row items-stretch overflow-hidden rounded-lg border border-border bg-card active:opacity-80"
    >
      <Image
        source={inviteFriends}
        accessibilityIgnoresInvertColors
        contentFit="contain"
        style={IMAGE_STYLE}
      />
      {/* Same paddings and reserved line heights as BalanceCard, so both cards are one height. */}
      <View className="flex-1 justify-between -ml-12 gap-4 py-6 pl-2 pr-5">
        <Text className="min-h-10 font-display-normal text-sm leading-5 text-foreground text-right">
          Solo mode is fine, but it's better with friends
        </Text>
        <View className="min-h-7 flex-row items-center justify-end gap-2">
          <Text className="font-display-medium text-base text-foreground">Invite friends</Text>
          {canInvite ? <ArrowRightIcon size={16} color={foreground} /> : null}
        </View>
      </View>
    </Pressable>
  );
}
