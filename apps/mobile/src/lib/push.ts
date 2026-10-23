import { registerPushToken, unregisterPushToken } from "@kinwoo/client/push";
import { isExpoPushToken, pushAction, type PushPermission } from "@kinwoo/core/push";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "default";
const TOKEN_KEY = "kinwoo.pushToken";

// Push is Android-only for now; iOS and web come later.
const supported = Device.isDevice && Platform.OS === "android";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PushOutcome = "registered" | "denied" | "skipped";

function toPermission(status: string): PushPermission {
  return status === "granted" || status === "denied" ? status : "undetermined";
}

async function readPermission(): Promise<PushPermission> {
  return toPermission((await Notifications.getPermissionsAsync()).status);
}

async function fetchToken(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null;

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return isExpoPushToken(data) ? data : null;
}

/**
 * Stores this phone's push token for the signed-in user. Asks for permission only while it is
 * undetermined; a denial is reported so the caller can point the user at system settings.
 */
export async function registerDevice(enabled: boolean): Promise<PushOutcome> {
  const permission = await readPermission();
  const action = pushAction({ enabled, permission, isDevice: supported });

  if (action === "skip")
    return enabled && supported && permission === "denied" ? "denied" : "skipped";

  // Android 13+ shows the permission dialog only once a channel exists.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Household updates",
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  if (action === "request") {
    const asked = toPermission((await Notifications.requestPermissionsAsync()).status);
    if (asked !== "granted") return "denied";
  }

  const token = await fetchToken();
  if (!token) return "skipped";

  await registerPushToken(token);
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return "registered";
}

/** Stops this phone receiving the signed-in user's notifications. Never blocks logging out. */
export async function unregisterDevice(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await unregisterPushToken(token);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // The next sign-in on this phone takes the token over, so a failure here is harmless.
  }
}
