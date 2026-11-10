"use client";

import { CONFIRM_COPY } from "@kinwoo/core/confirm";
import { useState } from "react";

import { ConfirmDialog } from "./ConfirmDialog";

// "Discard changes?" before closing a form with edits. `ask` returns false so swipe handlers
// spring the screen back.
export function useDiscardConfirm(dirty: boolean, discard: () => void) {
  const [open, setOpen] = useState(false);
  const ask = () => {
    setOpen(true);
    return false as const;
  };
  const dialog = (
    <ConfirmDialog
      open={open}
      copy={CONFIRM_COPY.discardChanges}
      onConfirm={() => {
        setOpen(false);
        discard();
      }}
      onCancel={() => setOpen(false)}
    />
  );
  return { ask, requestClose: () => (dirty ? ask() : discard()), dialog };
}
