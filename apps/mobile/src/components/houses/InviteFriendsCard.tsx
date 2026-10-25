import { ArrowRightIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Image, Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

import { inviteFriends } from "@/lib/images";
import { useTheme } from "@/theme/ThemeProvider";

const IMAGE_ASPECT_RATIO = 2;

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
      className="mt-4 w-full flex-row items-stretch overflow-hidden rounded-lg border border-border bg-card active:opacity-80"
    >
      <Image
        source={inviteFriends}
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        style={{ aspectRatio: IMAGE_ASPECT_RATIO }}
        className="-mb-2 -ml-2 w-[45%] self-end"
      />
      <View className="flex-1 justify-between -ml-12 gap-6 py-1.5 pl-2 pr-5">
        <Text className="font-display-normal text-sm leading-5 text-foreground text-right">
          Solo mode is fine, but it's better with friends
        </Text>
        <View className="flex-row items-center justify-end gap-2">
          <Text className="font-display-medium text-base text-foreground">Invite friends</Text>
          {canInvite ? <ArrowRightIcon size={16} color={foreground} /> : null}
        </View>
      </View>
    </Pressable>
  );
}
