import { describe, expect, it } from "vitest";

import {
  encryptPayload,
  fromBase64Url,
  parseSubscription,
  toBase64Url,
  vapidAuthorization,
} from "./webpush";

const strip = (value: string) => value.replace(/\s+/g, "");

// RFC 8291 appendix A.
const RFC = {
  plaintext: "V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24",
  serverPublic: strip(
    "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  ),
  serverPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  uaPublic: strip(
    "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  ),
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  header: strip(
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  ),
  ciphertext: strip(
    "8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ",
  ),
};

async function serverKeys(): Promise<CryptoKeyPair> {
  const publicBytes = fromBase64Url(RFC.serverPublic);
  const curve = { name: "ECDH", namedCurve: "P-256" } as const;
  return {
    publicKey: await crypto.subtle.importKey("raw", publicBytes, curve, true, []),
    privateKey: await crypto.subtle.importKey(
      "jwk",
      {
        kty: "EC",
        crv: "P-256",
        d: RFC.serverPrivate,
        x: toBase64Url(publicBytes.slice(1, 33)),
        y: toBase64Url(publicBytes.slice(33, 65)),
      },
      curve,
      false,
      ["deriveBits"],
    ),
  };
}

describe("encryptPayload", () => {
  it("reproduces the RFC 8291 example byte for byte", async () => {
    const body = await encryptPayload(
      fromBase64Url(RFC.plaintext),
      { p256dh: RFC.uaPublic, auth: RFC.auth },
      { salt: fromBase64Url(RFC.salt), serverKeys: await serverKeys() },
    );
    const expected = new Uint8Array([
      ...fromBase64Url(RFC.header),
      ...fromBase64Url(RFC.ciphertext),
    ]);
    expect(Array.from(body)).toEqual(Array.from(expected));
  });

  it("uses a fresh salt and key each time", async () => {
    const keys = { p256dh: RFC.uaPublic, auth: RFC.auth };
    const payload = new TextEncoder().encode("hi");
    const [a, b] = await Promise.all([
      encryptPayload(payload, keys),
      encryptPayload(payload, keys),
    ]);
    expect(toBase64Url(a)).not.toBe(toBase64Url(b));
    expect(a.length).toBe(86 + payload.length + 1 + 16);
  });
});

describe("vapidAuthorization", () => {
  it("signs a token the public key verifies", async () => {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ]);
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const publicKey = toBase64Url(
      new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)),
    );

    const header = await vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", {
      subject: "mailto:hello@kinwoo.in",
      publicKey,
      privateKey: jwk.d!,
    });

    const match = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(header);
    expect(match).not.toBeNull();
    const [, head, claims, signature, k] = match!;
    expect(k).toBe(publicKey);
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(claims)));
    expect(decoded).toMatchObject({
      aud: "https://fcm.googleapis.com",
      sub: "mailto:hello@kinwoo.in",
    });
    expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    expect(decoded.exp).toBeLessThanOrEqual(Date.now() / 1000 + 24 * 60 * 60);
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(head)))).toEqual({
      typ: "JWT",
      alg: "ES256",
    });

    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pair.publicKey,
      fromBase64Url(signature),
      new TextEncoder().encode(`${head}.${claims}`),
    );
    expect(valid).toBe(true);
  });
});

describe("parseSubscription", () => {
  it("reads a stored token and rejects anything else", () => {
    const token = JSON.stringify({
      endpoint: "https://x.test/a",
      keys: { p256dh: "a", auth: "b" },
    });
    expect(parseSubscription(token)).toEqual(JSON.parse(token));
    for (const value of [
      "",
      "not json",
      "{}",
      '{"endpoint":"x"}',
      "ExponentPushToken[aaaaaaaaaa]",
    ]) {
      expect(parseSubscription(value), value).toBeNull();
    }
  });
});
