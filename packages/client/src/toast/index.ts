"use client";

import { LOAD_FAILED_MESSAGE } from "@kinwoo/core/app";
import { TOAST_VISIBLE_MS, type ToastVariant } from "@kinwoo/core/toast";
import { onlineManager } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";

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

/**
 * Toasts once when a screen's first load fails, leaving the screen as it is. Offline is skipped:
 * OfflineLoadGuard already explains it.
 */
export function useToastOnLoadFailure(failed: boolean): void {
  useEffect(() => {
    if (failed && onlineManager.isOnline()) toast.error(LOAD_FAILED_MESSAGE);
  }, [failed]);
}

/** The toast to render now, or null. Each host decides how to animate in and out. */
export function useToast(): ToastState | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
