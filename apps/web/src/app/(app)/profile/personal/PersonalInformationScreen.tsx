"use client";

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
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { CheckIcon, EditIcon, GoogleIcon, LinkIcon, UnlinkIcon } from "@kinwoo/icons";
import { useState, type ReactNode } from "react";

import { AvatarSheet } from "@/components/AvatarSheet";
import { BackButton } from "@/components/BackButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field } from "@/components/houses/Field";
import { cn } from "@/lib/utils";

function IconButton({
  label,
  onClick,
  disabled,
  boxed,
  filled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  boxed?: boolean;
  filled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center justify-center hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50",
        boxed ? "size-[54px] rounded-2xl border border-border bg-muted" : "size-10 rounded-xl",
        filled && "border-foreground bg-foreground text-background",
      )}
    >
      {children}
    </button>
  );
}

export function PersonalInformationScreen() {
  const { user, canSignInWithGoogle, linkGoogle, unlinkGoogle } = useAuth();
  const { profile, setDisplayName } = useProfile();

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
    <main className="px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <BackButton href="/profile" />

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          aria-label="Change avatar"
          onClick={() => setAvatarOpen(true)}
          className="relative size-20 overflow-hidden rounded-full bg-accent hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile?.avatarUrl ?? "/images/profile-image.png"}
            alt=""
            width={80}
            height={80}
            className="size-20 rounded-full object-cover"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[30%] items-center justify-center bg-black/55"
          >
            <EditIcon size={14} color="#fff" />
          </span>
        </button>
      </div>

      <form
        className="mt-8 flex items-start gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (editing) void save();
        }}
      >
        <Field
          key={editing ? "editing" : "viewing"}
          label="Name"
          className="min-w-0 flex-1"
          value={editing ? draft : (profile?.displayName ?? "")}
          onValueChange={(next) => {
            setDraft(next);
            setError(null);
          }}
          error={error}
          readOnly={!editing}
          disabled={saving}
          autoFocus={editing}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          autoComplete="name"
          placeholder="Daisy"
        />
        {/* Offset by the Field label (20px line + 12px margin) so the button sits beside the input. */}
        <div className="mt-8">
          {editing ? (
            <IconButton
              boxed
              filled
              label="Save name"
              disabled={saving}
              onClick={() => void save()}
            >
              <CheckIcon size={18} />
            </IconButton>
          ) : (
            <IconButton boxed label="Edit name" disabled={!profile} onClick={startEditing}>
              <EditIcon size={18} />
            </IconButton>
          )}
        </div>
      </form>

      <Field
        className="mt-6"
        label="Email"
        value={user?.email ?? ""}
        onValueChange={() => {}}
        readOnly
      />

      {canSignInWithGoogle ? (
        <div className="mt-8">
          <p className="mb-3 font-display text-sm font-normal text-foreground">Linked Accounts</p>
          {googleIdentity ? (
            <div className="flex h-14 items-center pl-4">
              <span className="w-9 shrink-0">
                <GoogleIcon size={20} />
              </span>
              <span className="min-w-0 flex-1 truncate text-base">
                {googleIdentity.identity_data?.email ?? "Google"}
              </span>
              <IconButton
                label="Unlink Google"
                disabled={!canUnlink || unlinking}
                onClick={() => setUnlinkOpen(true)}
              >
                <UnlinkIcon size={22} />
              </IconButton>
            </div>
          ) : (
            <button
              type="button"
              aria-label="Link Google"
              disabled={linking}
              onClick={() => void link()}
              className="flex h-14 w-full items-center pl-4 text-left hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="w-9 shrink-0">
                <GoogleIcon size={20} />
              </span>
              <span className="min-w-0 flex-1 truncate text-base">Link Google</span>
              <span className="flex size-10 items-center justify-center">
                <LinkIcon size={14} />
              </span>
            </button>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={unlinkOpen}
        copy={CONFIRM_COPY.unlinkGoogle}
        isPending={unlinking}
        onConfirm={() => void unlink()}
        onCancel={() => setUnlinkOpen(false)}
      />
      <AvatarSheet open={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </main>
  );
}
