import { useBusyWhile } from "@kinwoo/client/activity";
import { avatarChoices, useAvatars, useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import { UploadPhotoIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { Image, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { AvatarGridSkeleton } from "@/components/skeleton/skeletons";
import { pickAvatarPhoto } from "@/lib/avatar-photo";
import { useTheme } from "@/theme/ThemeProvider";

import { BottomSheet, useSheetScrollTo } from "./BottomSheet";
import { SheetFooter } from "./sheet-footer";

const FOOTER_GAP = 16;
const FOOTER_HEIGHT = FOOTER_GAP + 56;

const SHEET_SETTLE_MS = 300;

export function AvatarSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} label="Choose your avatar" maxHeight={620} showClose>
      <AvatarSheetContent open={open} onClose={onClose} />
    </BottomSheet>
  );
}

function AvatarSheetContent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setAvatar, uploadAvatar } = useProfile();
  const scrollTo = useSheetScrollTo();
  const selectedTile = useRef<View>(null);
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { data: avatars, isError } = useAvatars(open);
  const [saving, setSaving] = useState(false);
  useBusyWhile(saving);

  useEffect(() => {
    if (!open || !avatars) return;
    // Wait for the sheet to finish sizing, or the scroll is clamped to a not-yet-scrollable view.
    const timer = setTimeout(() => scrollTo(selectedTile.current), SHEET_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [open, avatars, scrollTo]);

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

  const upload = async () => {
    setSaving(true);
    try {
      const photo = await pickAvatarPhoto();
      if (!photo) return;
      await uploadAvatar(photo, randomUUID());
      onClose();
    } catch {
      toast.error("Could not upload your photo. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Text className="pr-10 font-display-medium text-xl text-foreground">Choose your avatar</Text>

      {isError ? (
        <Text accessibilityLiveRegion="polite" className="mt-6 text-sm text-muted-foreground">
          We couldn’t load the avatars. Close this and try again.
        </Text>
      ) : null}

      {avatars?.length === 0 ? (
        <Text className="mt-6 text-sm text-muted-foreground">No avatars are available yet.</Text>
      ) : null}

      {!avatars && !isError ? (
        <View className="mt-6">
          <AvatarGridSkeleton />
        </View>
      ) : null}
      <View
        accessibilityRole="radiogroup"
        className={`-mx-3 mt-6 flex-row flex-wrap ${!avatars && !isError ? "hidden" : ""}`}
      >
        {avatarChoices(profile, avatars ?? []).map((url, index) => {
          const selected = url === profile?.avatarUrl;

          return (
            <View key={url} ref={selected ? selectedTile : undefined} className="w-1/3 p-3">
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

      <SheetFooter maxHeight={FOOTER_HEIGHT}>
        <View style={{ paddingTop: FOOTER_GAP }}>
          <Button
            label="Upload photo"
            variant="outline"
            icon={<UploadPhotoIcon size={20} color={palette.foreground} />}
            disabled={saving}
            onPress={() => void upload()}
          />
        </View>
      </SheetFooter>
    </>
  );
}
