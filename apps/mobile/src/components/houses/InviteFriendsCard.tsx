import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Image, Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

import { inviteFriends } from "@/lib/images";
import { useTheme } from "@/theme/ThemeProvider";

const IMAGE_ASPECT_RATIO = 900 / 575;

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
        tintColor={foreground}
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        style={{ aspectRatio: IMAGE_ASPECT_RATIO }}
        className="w-[45%] self-end -ml-3 -mb-2"
      />
      <View className="flex-1 justify-between gap-6 py-5 pl-3 pr-5 -ml-10">
        <Text className="font-display-normal text-sm leading-5 text-foreground text-right">
          Solo mode is fine, but it's better with friends
        </Text>
        <View className="flex-row items-center justify-end gap-2 mt-5">
          <Text className="font-display-medium text-base text-foreground">Invite friends</Text>
          {canInvite ? <ArrowRightIcon size={16} color={foreground} /> : null}
        </View>
      </View>
    </Pressable>
  );
}
