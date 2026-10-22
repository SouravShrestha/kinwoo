"use client";

import { toast, useToast, type ToastState } from "@kinwoo/client/toast";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import { cn } from "@/lib/utils";

const EXIT_MS = 200;
const DISMISS_DISTANCE_PX = 40;

export function Toaster() {
  const current = useToast();
  const [shown, setShown] = useState<ToastState | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragOffset = useRef(0);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStartY.current = event.clientY;
    dragOffset.current = 0;
    event.currentTarget.style.transition = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    dragOffset.current = Math.min(0, event.clientY - dragStartY.current);
    event.currentTarget.style.transform = `translateY(${dragOffset.current}px)`;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    dragStartY.current = null;
    if (event.type === "pointerup" && dragOffset.current <= -DISMISS_DISTANCE_PX) {
      toast.dismiss();
      return;
    }
    event.currentTarget.style.transition = "transform 150ms ease-out";
    event.currentTarget.style.transform = "";
  };

  if (current && current !== shown) setShown(current);

  useEffect(() => {
    if (current || !shown) return;
    const timer = setTimeout(() => setShown(null), EXIT_MS);
    return () => clearTimeout(timer);
  }, [current, shown]);

  if (!shown) return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-0 z-[10000] w-full max-w-md -translate-x-1/2">
      <div
        key={shown.id}
        className="pointer-events-auto mt-[env(safe-area-inset-top)] touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          role={shown.variant === "error" ? "alert" : "status"}
          className={cn(
            "flex w-full justify-center bg-foreground px-4 py-3",
            "text-center text-sm font-medium tracking-wide text-background",
            current ? "toast-in" : "toast-out",
          )}
        >
          {shown.message}
        </div>
      </div>
    </div>
  );
}
