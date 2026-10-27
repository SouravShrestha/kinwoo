import { registerPushToken, unregisterPushToken } from "@kinwoo/client/push";
import { pushAction, webPushToken, type PushPermission } from "@kinwoo/core/push";
import { useSyncExternalStore } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushOutcome = "registered" | "denied" | "skipped";
export type BrowserPushState = PushPermission | "unsupported";

function supported(): boolean {
  return (
    Boolean(VAPID_PUBLIC_KEY) &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function currentState(): BrowserPushState {
  if (!supported()) return "unsupported";
  return Notification.permission === "default" ? "undetermined" : Notification.permission;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  let status: PermissionStatus | undefined;
  // Picks up a change made in the browser's site settings while the app is open.
  void navigator.permissions
    ?.query({ name: "notifications" })
    .then((result) => {
      status = result;
      result.addEventListener("change", emit);
    })
    .catch(() => {});
  return () => {
    listeners.delete(listener);
    status?.removeEventListener("change", emit);
  };
}

export function useBrowserPushState(): BrowserPushState {
  return useSyncExternalStore(subscribe, currentState, () => "unsupported");
}

function applicationServerKey(): Uint8Array<ArrayBuffer> {
  const binary = atob(VAPID_PUBLIC_KEY!.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * Stores this browser's push subscription for the signed-in user. The permission prompt needs a
 * tap, so it is shown only when `canAsk` is set; on page load the browser is registered only if
 * the user has already allowed notifications.
 */
export async function registerBrowser(enabled: boolean, canAsk: boolean): Promise<PushOutcome> {
  const state = currentState();
  if (state === "unsupported") return "skipped";

  const action = pushAction({ enabled, permission: state, isDevice: true });
  if (action === "skip") return enabled && state === "denied" ? "denied" : "skipped";
  if (action === "request") {
    if (!canAsk) return "skipped";
    const asked = await Notification.requestPermission();
    emit();
    if (asked !== "granted") return "denied";
  }

  // The worker is registered in production builds only.
  if (!(await navigator.serviceWorker.getRegistration())) return "skipped";
  const { pushManager } = await navigator.serviceWorker.ready;
  const subscription =
    (await pushManager.getSubscription()) ??
    (await pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(),
    }));

  const token = webPushToken(subscription.toJSON());
  if (!token) return "skipped";
  await registerPushToken(token);
  return "registered";
}

/** Stops this browser receiving the signed-in user's notifications. Never blocks logging out. */
export async function unregisterBrowser(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    const token = subscription && webPushToken(subscription.toJSON());
    if (token) await unregisterPushToken(token);
  } catch {
    // The next sign-in in this browser takes the subscription over, so a failure here is harmless.
  }
}
