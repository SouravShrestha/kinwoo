"use client";

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
} from "@kinwoo/icons";
import { useAuth } from "@kinwoo/client/auth";
import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { useHouseNavigation } from "@/lib/house-navigation";
import { copyText, shareOrCopy } from "@/lib/share-text";
import { siteOrigin } from "@/lib/site";
import { cn } from "@/lib/utils";

import { Button } from "../Button";
import { ConfirmDialog } from "../ConfirmDialog";
import { Avatar } from "./Avatar";
import { Field } from "./Field";
import { HouseScreen } from "./HouseScreen";
import { HouseSheet } from "./HouseSheet";
import { ExpandableQrCode } from "./ExpandableQrCode";
import { ListRow } from "./Rows";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function InviteScreen() {
  const { goHome } = useHouseNavigation();
  const membership = useRequireHouse(goHome, { adminOnly: true });

  return (
    <HouseScreen title={HOUSE_SCREEN_TITLES.invite} dismissible>
      {membership ? <InviteManager key={membership.house.id} membership={membership} /> : null}
    </HouseScreen>
  );
}

function InviteManager({ membership }: { membership: HouseMembership }) {
  const house = membership.house;
  const manager = useInviteManager({ house, origin: siteOrigin() });
  const [confirmRotate, setConfirmRotate] = useState(false);

  if (manager.loading) return null;

  const copyCode = async () => {
    if (manager.code) await copyText(manager.code, TOAST_MESSAGES.codeCopied);
  };

  const share = async () => {
    if (manager.shareMessage) await shareOrCopy(manager.shareMessage, TOAST_MESSAGES.inviteCopied);
  };

  return (
    <div>
      <p className="font-display text-sm font-normal text-muted-foreground">
        {INVITE_SCREEN_SUBTITLE}
      </p>

      {manager.code ? (
        <div className="mt-8 flex items-center gap-6">
          {manager.shareUrl ? (
            <ExpandableQrCode
              value={manager.shareUrl}
              label="Invite QR code"
              className="size-32 shrink-0"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-normal">
              Can&apos;t scan? Enter code manually:
            </p>
            <button
              type="button"
              aria-label={`Copy invite code ${manager.code.split("").join(" ")}`}
              onClick={() => void copyCode()}
              className={cn(
                "mt-3 flex h-14 items-center gap-4 rounded-xl bg-muted px-5 hover:cursor-pointer hover:opacity-80",
                FOCUS,
              )}
            >
              <span className="font-display text-xl font-semibold tracking-[4px]">
                {manager.code}
              </span>
              <CopyIcon size={14} />
            </button>
            <button
              type="button"
              disabled={manager.rotating}
              onClick={() => setConfirmRotate(true)}
              className={cn(
                "mt-2 ml-auto flex h-10 w-fit items-center gap-2 font-display text-sm font-normal text-destructive underline hover:cursor-pointer hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50",
                FOCUS,
              )}
            >
              <ResetIcon size={14} />
              Reset code
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-3xl bg-muted px-6 py-8 text-center text-base text-muted-foreground">
          {manager.loadError ? "Couldn't load your invite code." : "There's no invite code yet."}
        </p>
      )}

      <form
        noValidate
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          void manager.addEmail();
        }}
      >
        <Field
          label="Invite members"
          icon={<EmailIcon size={16} />}
          action={
            <button
              type="submit"
              aria-label="Send invite"
              disabled={manager.emailBusy || manager.emailDraft.trim() === ""}
              className={cn(
                "flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground",
                "transition-opacity hover:cursor-pointer hover:opacity-90",
                "disabled:cursor-not-allowed disabled:opacity-40",
                FOCUS,
              )}
            >
              <EnterIcon size={22} />
            </button>
          }
          type="email"
          inputMode="email"
          enterKeyHint="send"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="someone@abc.com"
          maxLength={INVITE_EMAIL_MAX_LENGTH}
          value={manager.emailDraft}
          onValueChange={manager.setEmailDraft}
          disabled={manager.emailBusy}
          error={manager.emailError}
        />
      </form>

      {manager.shareMessage ? (
        <Button
          className="mt-6"
          label="Share invite link"
          icon={<ShareIcon size={20} />}
          onClick={() => void share()}
        />
      ) : null}

      <section className="mt-6" aria-labelledby="general-access">
        <h2 id="general-access" className="font-display text-sm font-normal">
          General access
        </h2>
        <JoinModeMenu value={manager.joinMode} onChange={manager.setJoinMode} />
      </section>

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
    </div>
  );
}

function PeopleWithAccess({ manager }: { manager: InviteManagerState }) {
  const { goHome } = useHouseNavigation();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <section className="mt-8" aria-labelledby="people-with-access">
      <h2 id="people-with-access" className="font-display text-sm font-normal">
        People with access
      </h2>
      <ul className="mt-2">
        {manager.members.map((member) => {
          const name = memberDisplayName(member.displayName);
          const isSelf = member.userId === user?.id;
          return (
            <li key={member.userId}>
              <ListRow
                leading={<Avatar name={member.displayName} url={member.avatarUrl} />}
                title={isSelf ? "You" : name}
                subtitle={roleLabel(member.role)}
                label={`${name}, ${roleLabel(member.role)}`}
                onClick={() => {
                  setSelected(member.userId);
                  setSheetOpen(true);
                }}
              />
            </li>
          );
        })}
        {manager.invitedEmails.map((invited) => (
          <li key={invited.id}>
            <ListRow
              leading={<Avatar name={invited.email} url={null} />}
              title={invited.email}
              subtitle="Invited"
              trailing={
                <button
                  type="button"
                  aria-label={`Remove ${invited.email}`}
                  disabled={manager.emailBusy}
                  onClick={() => void manager.removeEmail(invited.id)}
                  className={cn(
                    "flex size-10 items-center justify-center text-destructive hover:cursor-pointer hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50",
                    FOCUS,
                  )}
                >
                  <TrashIcon size={18} />
                </button>
              }
            />
          </li>
        ))}
      </ul>

      {selected ? (
        <HouseSheet
          open={sheetOpen}
          initialView={{ name: "member", userId: selected }}
          onClose={() => setSheetOpen(false)}
          onLeft={goHome}
        />
      ) : null}
    </section>
  );
}

function JoinModeMenu({
  value,
  onChange,
}: {
  value: HouseJoinMode;
  onChange: (mode: HouseJoinMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const selected = joinModeOption(value);

  useEffect(() => {
    if (!open) return;

    const selectedIndex = JOIN_MODE_OPTIONS.findIndex((option) => option.value === value);
    itemRefs.current[Math.max(0, selectedIndex)]?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, value]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative mt-4">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-start gap-4 text-left hover:cursor-pointer hover:opacity-70",
          FOCUS,
        )}
      >
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted"
        >
          {value === "invited" ? <LockIcon size={16} /> : <GlobeIcon size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base">{selected.label}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{selected.description}</span>
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="General access"
          onKeyDown={onMenuKeyDown}
          className="absolute left-14 top-8 z-10 min-w-60 rounded-md border border-border bg-muted py-1 shadow-lg"
        >
          {JOIN_MODE_OPTIONS.map((option, index) => (
            <button
              key={option.value}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              onClick={() => {
                onChange(option.value);
                close();
              }}
              className={cn(
                "flex h-11 w-full items-center gap-3 px-4 text-left text-sm hover:cursor-pointer hover:bg-background",
                FOCUS,
              )}
            >
              <span className="flex w-3 justify-center text-accent">
                {option.value === value ? <TickIcon size={12} /> : null}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
