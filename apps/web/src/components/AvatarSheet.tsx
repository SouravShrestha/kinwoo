"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { avatarChoices, useAvatars, useProfile } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import { UploadPhotoIcon } from "@kinwoo/icons";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { randomUuid } from "@/lib/uuid";

import { AvatarCropper } from "./AvatarCropper";
import { AvatarGridSkeleton } from "@/components/skeleton/skeletons";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";

export function AvatarSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setAvatar, uploadAvatar } = useProfile();
  const { data: avatars, isError } = useAvatars(open);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  useBusyWhile(saving);

  useEffect(() => {
    if (!open || photo) return;
    grid.current
      ?.querySelector('[aria-checked="true"]')
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [open, photo, avatars]);

  const upload = async (jpeg: Blob) => {
    setSaving(true);
    try {
      await uploadAvatar(jpeg, randomUuid());
      setPhoto(null);
      onClose();
    } catch {
      toast.error("Could not upload your photo. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
    <BottomSheet
      open={open}
      onClose={() => {
        setPhoto(null);
        onClose();
      }}
      label="Choose your avatar"
      showClose
      className={photo ? undefined : "pb-0"}
    >
      <h2 className="pr-10 font-display text-xl font-medium">
        {photo ? "Adjust your photo" : "Choose your avatar"}
      </h2>

      {photo ? (
        <AvatarCropper
          file={photo}
          saving={saving}
          onCancel={() => setPhoto(null)}
          onSave={(jpeg) => void upload(jpeg)}
        />
      ) : (
        <>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
          />
          {isError ? (
            <p role="status" className="mt-6 text-sm text-muted-foreground">
              We couldn’t load the avatars. Close this and try again.
            </p>
          ) : null}

          {avatars?.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No avatars are available yet.</p>
          ) : null}

          {!avatars && !isError ? (
            <div className="mt-6">
              <AvatarGridSkeleton />
            </div>
          ) : null}
          <div
            ref={grid}
            hidden={!avatars && !isError}
            className="-mx-3 mt-6 flex flex-wrap"
            role="radiogroup"
            aria-label="Avatars"
          >
            {avatarChoices(profile, avatars ?? []).map((url, index) => {
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
                      "relative block aspect-square w-full overflow-hidden rounded-full bg-muted hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-default disabled:opacity-50",
                      selected ? "border-3 border-accent" : "border border-border",
                    )}
                  >
                    <span className="absolute inset-2">
                      <Image
                        src={url}
                        alt=""
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 25vw, 160px"
                        loader={({ src }) => src}
                        className="rounded-full object-cover"
                      />
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-0 -mx-6 bg-sheet px-6 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <Button
              label="Upload photo"
              variant="outline"
              icon={<UploadPhotoIcon size={20} />}
              disabled={saving}
              onClick={() => {
                // Clearing after a pick makes mobile browsers drop the file, so clear before.
                if (fileInput.current) fileInput.current.value = "";
                fileInput.current?.click();
              }}
            />
          </div>
        </>
      )}
    </BottomSheet>
  );
}
