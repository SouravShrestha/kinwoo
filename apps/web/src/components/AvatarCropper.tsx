"use client";

import { AVATAR_UPLOAD_QUALITY, AVATAR_UPLOAD_SIZE } from "@kinwoo/client/profile";
import { toast } from "@kinwoo/client/toast";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import {
  CROP_VIEW,
  MAX_ZOOM,
  centerCrop,
  clampCrop,
  cropScale,
  zoomCrop,
  type Crop,
} from "@/lib/avatar-crop";

import { Button } from "./Button";

const KEY_STEP = 12;
const KEY_MOVES: Record<string, [number, number]> = {
  ArrowLeft: [KEY_STEP, 0],
  ArrowRight: [-KEY_STEP, 0],
  ArrowUp: [0, KEY_STEP],
  ArrowDown: [0, -KEY_STEP],
};

export function AvatarCropper({
  file,
  saving,
  onCancel,
  onSave,
}: {
  file: File;
  saving: boolean;
  onCancel: () => void;
  onSave: (jpeg: Blob) => void;
}) {
  const [src] = useState(() => URL.createObjectURL(file));
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const move = (dx: number, dy: number) => {
    if (!crop || !size) return;
    setCrop(clampCrop({ ...crop, x: crop.x + dx, y: crop.y + dy }, size.width, size.height));
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag.current) return;
    move(event.clientX - drag.current.x, event.clientY - drag.current.y);
    drag.current = { x: event.clientX, y: event.clientY };
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = KEY_MOVES[event.key];
    if (!step) return;
    event.preventDefault();
    move(...step);
  };

  const save = () => {
    const img = image.current;
    if (!img || !size || !crop) return;

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = AVATAR_UPLOAD_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return;

    const scale = cropScale(crop, size.width, size.height);
    // JPEG has no alpha, so a transparent PNG would otherwise turn black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, AVATAR_UPLOAD_SIZE, AVATAR_UPLOAD_SIZE);
    context.drawImage(
      img,
      -crop.x / scale,
      -crop.y / scale,
      CROP_VIEW / scale,
      CROP_VIEW / scale,
      0,
      0,
      AVATAR_UPLOAD_SIZE,
      AVATAR_UPLOAD_SIZE,
    );
    canvas.toBlob(
      (blob) => (blob ? onSave(blob) : toast.error("Could not prepare your photo.")),
      "image/jpeg",
      AVATAR_UPLOAD_QUALITY,
    );
  };

  const scale = crop && size ? cropScale(crop, size.width, size.height) : 1;

  return (
    <div className="mt-6 flex flex-col items-center gap-5 pb-6">
      <div
        role="group"
        aria-label="Drag the photo or use the arrow keys to choose the part to show"
        tabIndex={0}
        data-no-swipe
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        style={{ width: CROP_VIEW, height: CROP_VIEW }}
        className="relative cursor-grab touch-none select-none overflow-hidden rounded-xl bg-muted active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={image}
            src={src}
            alt=""
            draggable={false}
            onLoad={(event) => {
              // The decoded image outlives the blob URL, so release it as soon as it is loaded.
              URL.revokeObjectURL(src);
              const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
              setSize({ width, height });
              setCrop(centerCrop(width, height));
            }}
            onError={() => {
              URL.revokeObjectURL(src);
              toast.error("We can’t read that image. Try a JPEG or PNG.");
              onCancel();
            }}
            style={
              crop && size
                ? {
                    width: size.width * scale,
                    height: size.height * scale,
                    left: crop.x,
                    top: crop.y,
                  }
                : { visibility: "hidden" }
            }
            className="pointer-events-none absolute max-w-none"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgb(0_0_0/0.55)]" />
      </div>

      <input
        type="range"
        aria-label="Zoom"
        min={1}
        max={MAX_ZOOM}
        step={0.01}
        value={crop?.zoom ?? 1}
        disabled={!crop || saving}
        onChange={(event) =>
          crop &&
          size &&
          setCrop(zoomCrop(crop, Number(event.target.value), size.width, size.height))
        }
        style={{ width: CROP_VIEW }}
        className="accent-accent hover:cursor-pointer"
      />

      <div className="flex w-full gap-3">
        <Button label="Cancel" variant="outline" disabled={saving} onClick={onCancel} />
        <Button label="Save" loading={saving} disabled={!crop} onClick={save} />
      </div>
    </div>
  );
}
