"use client";

import { TOAST_VISIBLE_MS, type ToastVariant } from "@kinwoo/core/toast";
import { useSyncExternalStore } from "react";

export type ToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
};

let current: ToastState | null = null;
let nextId = 0;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

function show(message: string, variant: ToastVariant) {
  if (hideTimer) clearTimeout(hideTimer);
  current = { id: ++nextId, message, variant };
  hideTimer = setTimeout(dismiss, TOAST_VISIBLE_MS);
  emit();
}

function dismiss() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
  if (!current) return;
  current = null;
  emit();
}

export const toast = {
  show: (message: string) => show(message, "default"),
  success: (message: string) => show(message, "success"),
  error: (message: string) => show(message, "error"),
  warning: (message: string) => show(message, "warning"),
  info: (message: string) => show(message, "info"),
  dismiss,
};

/** The toast to render now, or null. Each host decides how to animate in and out. */
export function useToast(): ToastState | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
