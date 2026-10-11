"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useAvatars, useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { BottomSheet } from "./BottomSheet";

export function AvatarSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setAvatar } = useProfile();
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
    <BottomSheet open={open} onClose={onClose} label="Choose your avatar" showClose>
      <h2 className="pr-10 font-display text-xl font-medium">Choose your avatar</h2>

      {isError ? (
        <p role="status" className="mt-6 text-sm text-muted-foreground">
          We couldn’t load the avatars. Close this and try again.
        </p>
      ) : null}

      {avatars?.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No avatars are available yet.</p>
      ) : null}

      <div className="-mx-3 mt-6 flex flex-wrap pb-6" role="radiogroup" aria-label="Avatars">
        {(avatars ?? []).map((url, index) => {
          const selected = url === profile?.avatarUrl;

          return (
            <div key={url} className="w-1/3 p-3">
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Avatar ${index + 1}`}
                disabled={saving}
                onClick={() => void choose(url)}
                className={cn(
                  "block aspect-square w-full overflow-hidden rounded-full bg-muted p-2 hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-default disabled:opacity-50",
                  selected ? "border-3 border-accent" : "border border-border",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="size-full rounded-full object-cover" />
              </button>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
