// Web Push (RFC 8030) with VAPID (RFC 8292) and aes128gcm payload encryption (RFC 8291), on Web
// Crypto only. The npm web-push package needs Node crypto APIs that Deno does not fully offer.
// Imports nothing so Deno and Vitest both run it as is.
export type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };
export type Vapid = { subject: string; publicKey: string; privateKey: string };

const encoder = new TextEncoder();
const RECORD_SIZE = 4096;
const P256 = { name: "ECDH", namedCurve: "P-256" } as const;

export function fromBase64Url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  bytes: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    bytes * 8,
  );
  return new Uint8Array(bits);
}

/** Encrypts `payload` for one subscription. `fixed` exists so tests can replay the RFC vector. */
export async function encryptPayload(
  payload: Uint8Array,
  keys: Subscription["keys"],
  fixed?: { salt: Uint8Array; serverKeys: CryptoKeyPair },
): Promise<Uint8Array> {
  const uaPublic = fromBase64Url(keys.p256dh);
  const authSecret = fromBase64Url(keys.auth);
  const serverKeys =
    fixed?.serverKeys ?? (await crypto.subtle.generateKey(P256, true, ["deriveBits"]));
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, P256, false, []);
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, serverKeys.privateKey, 256),
  );

  const ikm = await hkdf(
    authSecret,
    shared,
    concat(encoder.encode("WebPush: info\0"), uaPublic, serverPublic),
    32,
  );
  const salt = fixed?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode("Content-Encoding: nonce\0"), 12);

  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // A single record ends with the 0x02 delimiter.
  const record = concat(payload, Uint8Array.of(2));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, record),
  );

  const size = new Uint8Array(4);
  new DataView(size.buffer).setUint32(0, RECORD_SIZE);
  return concat(salt, size, Uint8Array.of(serverPublic.length), serverPublic, sealed);
}

export async function vapidAuthorization(endpoint: string, vapid: Vapid): Promise<string> {
  const publicKey = fromBase64Url(vapid.publicKey);
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: vapid.privateKey,
      x: toBase64Url(publicKey.slice(1, 33)),
      y: toBase64Url(publicKey.slice(33, 65)),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const part = (value: unknown) => toBase64Url(encoder.encode(JSON.stringify(value)));
  const unsigned = `${part({ typ: "JWT", alg: "ES256" })}.${part({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: vapid.subject,
  })}`;
  // Web Crypto signs as r||s, the form a JWT wants.
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsigned),
  );
  return `vapid t=${unsigned}.${toBase64Url(new Uint8Array(signature))}, k=${vapid.publicKey}`;
}

/** Returns the push service's HTTP status: 201 is accepted, 404 and 410 mean the subscription is gone. */
export async function sendWebPush(
  subscription: Subscription,
  payload: unknown,
  vapid: Vapid,
  ttlSeconds: number,
): Promise<number> {
  const body = await encryptPayload(encoder.encode(JSON.stringify(payload)), subscription.keys);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(subscription.endpoint, vapid),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttlSeconds),
      Urgency: "high",
    },
    body,
  });
  await response.body?.cancel();
  return response.status;
}

export function parseSubscription(token: string): Subscription | null {
  try {
    const value = JSON.parse(token);
    return typeof value?.endpoint === "string" && value.keys?.p256dh && value.keys?.auth
      ? value
      : null;
  } catch {
    return null;
  }
}
