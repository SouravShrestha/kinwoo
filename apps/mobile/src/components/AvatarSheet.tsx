import { useBusyWhile } from "@kinwoo/client/activity";
import { useAvatars, useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import { colors } from "@kinwoo/tokens/native";
import { useState } from "react";
import { Image, Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

import { BottomSheet } from "./BottomSheet";

export function AvatarSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setAvatar } = useProfile();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { data: avatars, isError } = useAvatars(open);
  const [saving, setSaving] = useState(false);
  useBusyWhile(saving);

  const choose = async (url: string) => {
    if (url === profile?.avatarUrl) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await setAvatar(url);
      onClose();
    } catch {
      toast.error("Could not update your avatar. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} label="Choose your avatar" maxHeight={620} showClose>
      <Text className="pr-10 font-display-medium text-xl text-foreground">Choose your avatar</Text>

      {isError ? (
        <Text accessibilityLiveRegion="polite" className="mt-6 text-sm text-muted-foreground">
          We couldn’t load the avatars. Close this and try again.
        </Text>
      ) : null}

      {avatars?.length === 0 ? (
        <Text className="mt-6 text-sm text-muted-foreground">No avatars are available yet.</Text>
      ) : null}

      <View accessibilityRole="radiogroup" className="-mx-3 mt-6 flex-row flex-wrap pb-6">
        {(avatars ?? []).map((url, index) => {
          const selected = url === profile?.avatarUrl;

          return (
            <View key={url} className="w-1/3 p-3">
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled: saving }}
                accessibilityLabel={`Avatar ${index + 1}`}
                disabled={saving}
                onPress={() => void choose(url)}
                className="aspect-square overflow-hidden rounded-full bg-muted p-2 active:opacity-80"
                style={{
                  borderColor: selected ? palette.accent : palette.border,
                  borderWidth: selected ? 3 : 1,
                }}
              >
                <Image
                  source={{ uri: url }}
                  accessibilityIgnoresInvertColors
                  resizeMode="cover"
                  className="size-full rounded-full"
                />
              </Pressable>
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}
