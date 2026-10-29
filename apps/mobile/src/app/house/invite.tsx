import { useAuth } from "@kinwoo/client/auth";
import {
  useInviteManager,
  useRequireHouse,
  type InviteManager as InviteManagerState,
} from "@kinwoo/client/houses";
import {
  HOUSE_SCREEN_TITLES,
  INVITE_EMAIL_MAX_LENGTH,
  INVITE_SCREEN_SUBTITLE,
  JOIN_MODE_OPTIONS,
  joinModeOption,
  memberDisplayName,
  roleLabel,
  type HouseMembership,
  type HouseJoinMode,
} from "@kinwoo/core/houses";
import {
  CopyIcon,
  EmailIcon,
  EnterIcon,
  GlobeIcon,
  LockIcon,
  ResetIcon,
  ShareIcon,
  TickIcon,
  TrashIcon,
} from "@kinwoo/icons/native";
import { toast } from "@kinwoo/client/toast";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { colors } from "@kinwoo/tokens/native";
import * as Clipboard from "expo-clipboard";
import { useRef, useState } from "react";
import { Modal, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pressable } from "@/components/Pressable";
import { Avatar } from "@/components/houses/Avatar";
import { Field } from "@/components/houses/Field";
import { HouseScreen } from "@/components/houses/HouseScreen";
import { ExpandableQrCode } from "@/components/houses/ExpandableQrCode";
import { InviteCard } from "@/components/houses/InviteCard";
import { HouseSheet } from "@/components/houses/HouseSheet";
import { ListRow } from "@/components/houses/Rows";
import { InviteSkeleton } from "@/components/skeleton/skeletons";
import { goHome } from "@/lib/house-navigation";
import { captureInviteCard, openInviteShare } from "@/lib/share-invite";
import { siteOrigin } from "@/lib/site";
import { useTheme } from "@/theme/ThemeProvider";

export default function InviteScreen() {
  const membership = useRequireHouse(goHome, { adminOnly: true });

  return membership ? (
    <InviteManager key={membership.house.id} membership={membership} />
  ) : (
    <HouseScreen title={HOUSE_SCREEN_TITLES.invite} dismissible>
      {null}
    </HouseScreen>
  );
}

function InviteManager({ membership }: { membership: HouseMembership }) {
  const house = membership.house;
  const manager = useInviteManager({ house, origin: siteOrigin() });
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const [sharing, setSharing] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const cardRef = useRef<View>(null);
  const emailSendDisabled = manager.emailBusy || manager.emailDraft.trim() === "";

  const copyCode = async () => {
    if (!manager.code) return;
    try {
      await Clipboard.setStringAsync(manager.code);
      toast.success(TOAST_MESSAGES.codeCopied);
    } catch {
      toast.error(TOAST_MESSAGES.copyFailed);
    }
  };

  const share = async () => {
    if (!manager.shareMessage) return;
    setSharing(true);
    const uri = await captureInviteCard(cardRef)
      .catch(() => null)
      .finally(() => setSharing(false));
    if (!uri) return;
    // One frame so the cleared loading state commits and the bar starts finishing before the
    // native sheet takes over the main thread.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await openInviteShare(uri, manager.shareMessage).catch(() => undefined);
  };

  return (
    <HouseScreen title={HOUSE_SCREEN_TITLES.invite} dismissible>
      <Text
        accessibilityRole="header"
        className="pb-1 font-display-medium text-base text-foreground"
      >
        {house.name}
      </Text>
      {manager.loading ? (
        <InviteSkeleton />
      ) : (
        <View>
          <Text className="text-sm font-display-normal text-muted-foreground mb-2">
            {INVITE_SCREEN_SUBTITLE}
          </Text>

          {manager.code ? (
            <View className="mt-6 flex-row items-center gap-6">
              {manager.shareUrl ? (
                <ExpandableQrCode value={manager.shareUrl} label="Invite QR code" size={128} />
              ) : null}
              <View className="flex-1">
                <Text className="text-sm text-foreground font-display-normal">
                  Can&apos;t scan? Enter code manually:
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Copy invite code ${manager.code.split("").join(" ")}`}
                  onPress={() => void copyCode()}
                  className="mt-3 h-14 flex-row items-center self-start rounded-xl bg-muted px-5 active:opacity-70"
                >
                  <Text className="mr-4 font-display-semibold text-xl tracking-[4px] text-foreground">
                    {manager.code}
                  </Text>
                  <CopyIcon size={14} color={palette.foreground} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: manager.rotating }}
                  disabled={manager.rotating}
                  onPress={() => setConfirmRotate(true)}
                  className="mt-2 h-10 flex-row items-center gap-2 self-end active:opacity-70"
                >
                  <ResetIcon size={14} color={palette.destructive} />
                  <Text className="text-sm font-display-normal text-destructive underline">
                    Reset code
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="mt-6 rounded-3xl bg-muted px-6 py-8">
              <Text className="text-center text-base text-muted-foreground">
                {manager.loadError
                  ? "Couldn't load your invite code."
                  : "There's no invite code yet."}
              </Text>
            </View>
          )}

          <Field
            className="mt-6"
            label="Invite members"
            icon={<EmailIcon size={16} color={palette.mutedForeground} />}
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send invite"
                accessibilityState={{ disabled: emailSendDisabled }}
                disabled={emailSendDisabled}
                onPress={() => void manager.addEmail()}
                hitSlop={4}
                className={`size-10 items-center justify-center rounded-xl bg-primary ${
                  emailSendDisabled ? "opacity-40" : "active:opacity-80"
                }`}
              >
                <EnterIcon size={22} color={palette.primaryForeground} />
              </Pressable>
            }
            placeholder="someone@abc.com"
            keyboardType="email-address"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            maxLength={INVITE_EMAIL_MAX_LENGTH}
            value={manager.emailDraft}
            onChangeText={manager.setEmailDraft}
            onSubmitEditing={() => void manager.addEmail()}
            disabled={manager.emailBusy}
            error={manager.emailError}
          />

          {manager.shareMessage && manager.code && manager.shareUrl ? (
            <View className="mt-6">
              <Button
                label="Share invite link"
                icon={<ShareIcon size={20} color={palette.primaryForeground} />}
                loading={sharing}
                onPress={() => void share()}
              />
              <View pointerEvents="none" className="absolute -left-[9999px] top-0">
                <InviteCard
                  ref={cardRef}
                  houseName={house.name}
                  code={manager.code}
                  url={manager.shareUrl}
                />
              </View>
            </View>
          ) : null}

          <Text
            accessibilityRole="header"
            className="mt-6 text-sm font-display-normal text-foreground"
          >
            General access
          </Text>
          <JoinModeMenu value={manager.joinMode} onChange={manager.setJoinMode} />

          <PeopleWithAccess manager={manager} />

          <ConfirmDialog
            open={confirmRotate}
            copy={CONFIRM_COPY.rotateInvite}
            isPending={manager.rotating}
            onConfirm={() => {
              void manager.rotateCode().then(() => setConfirmRotate(false));
            }}
            onCancel={() => setConfirmRotate(false)}
          />
        </View>
      )}
    </HouseScreen>
  );
}

function PeopleWithAccess({ manager }: { manager: InviteManagerState }) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <View className="mt-8">
      <Text accessibilityRole="header" className="text-sm font-display-normal text-foreground">
        People with access
      </Text>
      <View className="mt-2">
        {manager.members.map((member) => {
          const name = memberDisplayName(member.displayName);
          const isSelf = member.userId === user?.id;
          return (
            <ListRow
              key={member.userId}
              leading={<Avatar name={member.displayName} url={member.avatarUrl} />}
              title={isSelf ? "You" : name}
              subtitle={roleLabel(member.role)}
              accessibilityLabel={`${name}, ${roleLabel(member.role)}`}
              onPress={() => {
                setSelected(member.userId);
                setSheetOpen(true);
              }}
            />
          );
        })}
        {manager.invitedEmails.map((invited) => (
          <ListRow
            key={invited.id}
            leading={<Avatar name={invited.email} url={null} />}
            title={invited.email}
            subtitle="Invited"
            trailing={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${invited.email}`}
                disabled={manager.emailBusy}
                onPress={() => void manager.removeEmail(invited.id)}
                className="size-10 items-center justify-center active:opacity-60"
              >
                <TrashIcon size={18} color={palette.destructive} />
              </Pressable>
            }
          />
        ))}
      </View>

      {selected ? (
        <HouseSheet
          open={sheetOpen}
          initialView={{ name: "member", userId: selected }}
          onClose={() => setSheetOpen(false)}
          onLeft={goHome}
        />
      ) : null}
    </View>
  );
}

type Anchor = { x: number; y: number };

function JoinModeMenu({
  value,
  onChange,
}: {
  value: HouseJoinMode;
  onChange: (mode: HouseJoinMode) => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const selected = joinModeOption(value);

  // The menu lives in a Modal so the scroll view cannot clip it; its position comes from the
  // trigger's place in the window, since the Modal does not share the screen's layout.
  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y) => {
      setAnchor({ x, y: y + 28 });
    });
  };

  return (
    <View className="mt-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`General access: ${selected.label}. ${selected.description}`}
        accessibilityHint="Opens a menu to change who can join"
        accessibilityState={{ expanded: anchor !== null }}
        onPress={openMenu}
        className="flex-row items-start active:opacity-60"
      >
        <View className="mr-4 size-10 items-center justify-center rounded-full bg-muted">
          {value === "invited" ? (
            <LockIcon size={16} color={palette.foreground} />
          ) : (
            <GlobeIcon size={16} color={palette.foreground} />
          )}
        </View>
        <View ref={triggerRef} collapsable={false} className="flex-1">
          <Text className="text-base text-foreground">{selected.label}</Text>
          <Text className="mt-1 text-sm text-muted-foreground">{selected.description}</Text>
        </View>
      </Pressable>

      <Modal
        transparent
        visible={anchor !== null}
        animationType="fade"
        onRequestClose={() => setAnchor(null)}
      >
        <Pressable
          accessibilityLabel="Close menu"
          onPress={() => setAnchor(null)}
          className="flex-1"
        >
          {anchor ? (
            <View
              accessibilityRole="menu"
              className="absolute min-w-60 rounded-md border border-border bg-muted py-1"
              style={{ left: anchor.x, top: anchor.y }}
            >
              {JOIN_MODE_OPTIONS.map((option) => {
                const checked = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="menuitem"
                    accessibilityState={{ checked }}
                    accessibilityLabel={option.label}
                    onPress={() => {
                      setAnchor(null);
                      onChange(option.value);
                    }}
                    className="h-11 flex-row items-center px-4 active:opacity-60"
                  >
                    <View className="mr-3 w-3 items-center">
                      {checked ? <TickIcon size={12} color={palette.accent} /> : null}
                    </View>
                    <Text className="text-sm text-foreground">{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
