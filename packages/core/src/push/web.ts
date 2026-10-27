import { isExpoPushToken } from "./token";

// Only the browsers' own push services are accepted, so a stored endpoint can never point
// send-push at an arbitrary host. Mirrors push_tokens_token_format in the database.
const HOSTS = String.raw`(fcm\.googleapis\.com|web\.push\.apple\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*notify\.windows\.com)`;
const WEB_PUSH_TOKEN = new RegExp(
  String.raw`^\{"endpoint":"https://${HOSTS}/[A-Za-z0-9_~%./?=&+:@!$*,;-]+","keys":\{"p256dh":"[A-Za-z0-9_-]+","auth":"[A-Za-z0-9_-]+"\}\}$`,
);

export function isWebPushToken(value: unknown): value is string {
  return typeof value === "string" && value.length <= 2000 && WEB_PUSH_TOKEN.test(value);
}

export function isPushToken(value: unknown): value is string {
  return isExpoPushToken(value) || isWebPushToken(value);
}

// Fixed key order, so one browser subscription is always one row.
export function webPushToken(subscription: {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}): string | null {
  const { endpoint, keys } = subscription;
  const token = JSON.stringify({ endpoint, keys: { p256dh: keys?.p256dh, auth: keys?.auth } });
  return isWebPushToken(token) ? token : null;
}
