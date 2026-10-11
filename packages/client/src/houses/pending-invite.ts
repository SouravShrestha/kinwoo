import { parseInviteInput } from "@kinwoo/core/houses";

import type { KeyValueStorage } from "./storage";

export const PENDING_INVITE_KEY = "kinwoo.pendingInvite";

const listeners = new Set<() => void>();

export function subscribePendingInvite(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Stored before sign-in so the join can resume afterwards; returns the cleaned code or null.
export async function savePendingInvite(
  storage: KeyValueStorage,
  input: string,
): Promise<string | null> {
  const parsed = parseInviteInput(input);
  if (!parsed.ok) return null;

  await storage.setItem(PENDING_INVITE_KEY, parsed.code);
  listeners.forEach((listener) => listener());
  return parsed.code;
}

// Reads and clears in one step so a code is only ever resumed once.
export async function takePendingInvite(storage: KeyValueStorage): Promise<string | null> {
  const stored = await storage.getItem(PENDING_INVITE_KEY);
  if (stored === null) return null;

  await storage.removeItem(PENDING_INVITE_KEY);

  const parsed = parseInviteInput(stored);
  return parsed.ok ? parsed.code : null;
}
