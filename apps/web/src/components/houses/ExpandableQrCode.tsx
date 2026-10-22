"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { QrCode } from "./QrCode";

export function ExpandableQrCode({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={`Enlarge ${label}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(
          "block hover:cursor-pointer hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
          className,
        )}
      >
        <QrCode value={value} label={label} className="size-full" />
      </button>

      <dialog
        ref={dialogRef}
        aria-label={label}
        onClose={() => setOpen(false)}
        onClick={() => setOpen(false)}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-center justify-center bg-transparent p-0 backdrop:bg-black/80 open:flex hover:cursor-pointer"
      >
        <QrCode value={value} label={label} className="size-[min(80vw,80vh,25rem)]" />
      </dialog>
    </>
  );
}
