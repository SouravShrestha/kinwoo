import { useSyncExternalStore } from "react";

export type InstallKind = "native" | "ios" | "none";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export function installKind(env: {
  standalone: boolean;
  hasPrompt: boolean;
  ios: boolean;
}): InstallKind {
  if (env.standalone) return "none";
  if (env.hasPrompt) return "native";
  return env.ios ? "ios" : "none";
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

// Registered at import time because the browser fires this once, early; a listener added when
// the profile screen mounts would miss it. AppProviders imports this module for that reason.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function currentKind(): InstallKind {
  const { userAgent, maxTouchPoints } = navigator;
  return installKind({
    standalone: isStandalone(),
    hasPrompt: deferred !== null,
    // iPadOS reports a Mac user agent, so touch support is the tell.
    ios:
      /iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && maxTouchPoints > 1),
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useInstallKind(): InstallKind {
  return useSyncExternalStore(subscribe, currentKind, () => "none");
}

export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (!event) return;
  // prompt() works once per event; the row reappears if the browser fires a new one.
  deferred = null;
  emit();
  await event.prompt();
}
