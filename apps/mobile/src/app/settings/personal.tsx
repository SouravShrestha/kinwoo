import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import { useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import {
  DISPLAY_NAME_MAX_LENGTH,
  displayNameErrorMessage,
  validateDisplayName,
} from "@kinwoo/core/auth";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { LOAD_FAILED_MESSAGE } from "@kinwoo/core/app";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import {
  ArrowRightIcon,
  CheckIcon,
  EditIcon,
  GoogleIcon,
  LinkIcon,
  UnlinkIcon,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarSheet } from "@/components/AvatarSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field } from "@/components/houses/Field";
import { Pressable } from "@/components/Pressable";
import { FieldSkeleton } from "@/components/skeleton/skeletons";
import { profileImage } from "@/lib/images";
import { useTheme } from "@/theme/ThemeProvider";

function IconButton({
  label,
  onPress,
  disabled,
  boxed,
  filled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  boxed?: boolean;
  filled?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`items-center justify-center ${
        boxed
          ? `size-[54px] rounded-2xl border ${
              filled ? "border-foreground bg-foreground" : "border-border bg-muted"
            }`
          : "size-10"
      } ${disabled ? "opacity-50" : ""}`}
    >
      {children}
    </Pressable>
  );
}

export default function PersonalInformationScreen() {
  const { user, canSignInWithGoogle, linkGoogle, unlinkGoogle } = useAuth();
  const { profile, error: profileError, setDisplayName } = useProfile();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const insets = useSafeAreaInsets();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  useBusyWhile(saving || linking || unlinking);

  const googleIdentity = user?.identities?.find((identity) => identity.provider === "google");
  // Supabase refuses to remove a user's only identity.
  const canUnlink = (user?.identities?.length ?? 0) > 1;

  const startEditing = () => {
    setDraft(profile?.displayName ?? "");
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const result = validateDisplayName(draft);
    if (!result.ok) {
      setError(displayNameErrorMessage(result.error));
      return;
    }
    if (result.value === profile?.displayName) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await setDisplayName(result.value);
      toast.success(TOAST_MESSAGES.profileSaved);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save that name.");
    } finally {
      setSaving(false);
    }
  };

  const link = async () => {
    setLinking(true);
    try {
      await linkGoogle();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : TOAST_MESSAGES.googleLinkFailed);
    } finally {
      setLinking(false);
    }
  };

  const unlink = async () => {
    setUnlinking(true);
    try {
      await unlinkGoogle();
      toast.success(TOAST_MESSAGES.googleUnlinked);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : TOAST_MESSAGES.googleUnlinkFailed);
    } finally {
      setUnlinking(false);
      setUnlinkOpen(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 40,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.dismissTo("/profile")}
        hitSlop={12}
        className="size-10 items-start justify-center"
      >
        <View style={{ transform: [{ rotate: "180deg" }] }}>
          <ArrowRightIcon size={28} color={palette.foreground} />
        </View>
      </Pressable>

      <View className="mt-6 items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change avatar"
          onPress={() => setAvatarOpen(true)}
          className="size-20 items-center justify-center overflow-hidden rounded-full bg-accent active:opacity-80"
        >
          <Image
            source={profile?.avatarUrl ? { uri: profile.avatarUrl } : profileImage}
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            className="size-20"
          />
          <View
            pointerEvents="none"
            className="absolute inset-x-0 bottom-0 h-[30%] items-center justify-center bg-black/55"
          >
            <EditIcon size={14} color="#fff" />
          </View>
        </Pressable>
      </View>

      {!profile && profileError ? (
        <Text className="mt-8 text-base text-muted-foreground">{LOAD_FAILED_MESSAGE}</Text>
      ) : !profile ? (
        <FieldSkeleton className="mt-8" />
      ) : (
        <View className="mt-8 flex-row items-start gap-3">
          <Field
            key={editing ? "editing" : "viewing"}
            label="Name"
            className="flex-1"
            value={editing ? draft : (profile?.displayName ?? "")}
            onChangeText={(value) => {
              setDraft(value);
              setError(null);
            }}
            error={error}
            disabled={!editing || saving}
            autoFocus={editing}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void save()}
            placeholder="Daisy"
          />
          {/* Offset by the Field label (20px line + 12px margin) so the button sits beside the input. */}
          <View className="mt-8">
            {editing ? (
              <IconButton
                boxed
                filled
                label="Save name"
                disabled={saving}
                onPress={() => void save()}
              >
                <CheckIcon size={18} color={palette.background} />
              </IconButton>
            ) : (
              <IconButton boxed label="Edit name" onPress={startEditing}>
                <EditIcon size={18} color={palette.foreground} />
              </IconButton>
            )}
          </View>
        </View>
      )}
      <Field className="mt-6" label="Email" value={user?.email ?? ""} disabled />

      {canSignInWithGoogle ? (
        <View className="mt-8">
          <Text className="mb-3 text-sm text-foreground font-display-normal">Linked Accounts</Text>
          {googleIdentity ? (
            <View className="h-14 flex-row items-center pl-4">
              <View className="w-9">
                <GoogleIcon size={20} />
              </View>
              <Text numberOfLines={1} className="flex-1 text-base text-foreground">
                {googleIdentity.identity_data?.email ?? "Google"}
              </Text>
              <IconButton
                label="Unlink Google account"
                disabled={!canUnlink || unlinking}
                onPress={() => setUnlinkOpen(true)}
              >
                <UnlinkIcon size={22} color={palette.foreground} />
              </IconButton>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Link Google account"
              disabled={linking}
              onPress={() => void link()}
              className={`h-14 flex-row items-center pl-4 ${linking ? "opacity-50" : ""}`}
            >
              <View className="w-9">
                <GoogleIcon size={20} />
              </View>
              <Text className="flex-1 text-base text-foreground">Link Google account</Text>
              <View className="size-10 items-center justify-center">
                <LinkIcon size={14} color={palette.foreground} />
              </View>
            </Pressable>
          )}
        </View>
      ) : null}

      <ConfirmDialog
        open={unlinkOpen}
        copy={CONFIRM_COPY.unlinkGoogle}
        isPending={unlinking}
        onConfirm={() => void unlink()}
        onCancel={() => setUnlinkOpen(false)}
      />
      <AvatarSheet open={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </ScrollView>
  );
}
