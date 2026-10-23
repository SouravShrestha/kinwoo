import { describe, expect, it } from "vitest";

import {
  isExpoPushToken,
  isPushToken,
  isPushType,
  isWebPushToken,
  webPushToken,
  notificationInboxId,
  notificationTarget,
  pushAction,
  withPushType,
} from "./index";

describe("notificationInboxId", () => {
  it("returns a uuid and rejects anything else", () => {
    const id = "0b6f1f0e-3c1a-4f6e-9d57-2f6f7c1a9e10";
    expect(notificationInboxId({ notificationId: id })).toBe(id);
    for (const value of ["", "abc", `${id}/../x`, 42, undefined]) {
      expect(notificationInboxId({ notificationId: value }), String(value)).toBeNull();
    }
    expect(notificationInboxId(null)).toBeNull();
  });
});

describe("pushAction", () => {
  const base = { enabled: true, permission: "granted", isDevice: true } as const;

  it("registers when allowed", () => {
    expect(pushAction(base)).toBe("register");
  });

  it("asks once when permission is undetermined", () => {
    expect(pushAction({ ...base, permission: "undetermined" })).toBe("request");
  });

  it("never asks again after a denial", () => {
    expect(pushAction({ ...base, permission: "denied" })).toBe("skip");
  });

  it("skips when the switch is off or on a simulator", () => {
    expect(pushAction({ ...base, enabled: false })).toBe("skip");
    expect(pushAction({ ...base, enabled: false, permission: "undetermined" })).toBe("skip");
    expect(pushAction({ ...base, isDevice: false })).toBe("skip");
  });
});

describe("isExpoPushToken", () => {
  it("accepts both Expo token prefixes", () => {
    expect(isExpoPushToken("ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[aaaaaaaaaaaaaaaaaaaaaa]")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const value of [
      "",
      "not-a-token",
      "ExponentPushToken[short]",
      "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa] extra",
      "ExponentPushToken[aaaaaaaaaaaaaaaaaaaa/a]",
      null,
      42,
    ]) {
      expect(isExpoPushToken(value), String(value)).toBe(false);
    }
  });
});

describe("web push tokens", () => {
  const keys = { p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6", auth: "BTBZMqHH6r4Tts7J_aSIgg" };
  const fcm = "https://fcm.googleapis.com/fcm/send/abc:APA91b-_x";

  it("builds one canonical token from a browser subscription", () => {
    const token = webPushToken({ keys: { auth: keys.auth, p256dh: keys.p256dh }, endpoint: fcm });
    expect(token).toBe(JSON.stringify({ endpoint: fcm, keys }));
    expect(isWebPushToken(token)).toBe(true);
    expect(isPushToken(token)).toBe(true);
    expect(isPushToken("ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]")).toBe(true);
  });

  it("accepts the other browsers' push services", () => {
    for (const endpoint of [
      "https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
      "https://web.push.apple.com/QAbc-_",
      "https://wns2-par02p.notify.windows.com/w/?token=BQYAAA%2b%2f",
    ]) {
      expect(webPushToken({ endpoint, keys }), endpoint).not.toBeNull();
    }
  });

  it("rejects endpoints that are not a browser push service", () => {
    for (const endpoint of [
      "https://evil.test/fcm/send/abc",
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://fcm.googleapis.com.evil.test/x",
      "https://evil.test/@fcm.googleapis.com/x",
      "https://fcm.googleapis.com/",
      "https://localhost/x",
    ]) {
      expect(webPushToken({ endpoint, keys }), endpoint).toBeNull();
    }
  });

  it("rejects missing keys and malformed values", () => {
    expect(webPushToken({ endpoint: fcm })).toBeNull();
    expect(webPushToken({ endpoint: fcm, keys: { p256dh: "a b", auth: keys.auth } })).toBeNull();
    for (const value of ["", "{}", null, 42, `${webPushToken({ endpoint: fcm, keys })}x`]) {
      expect(isPushToken(value), String(value)).toBe(false);
    }
  });
});

describe("notificationTarget", () => {
  it("returns an in-app path", () => {
    expect(notificationTarget({ url: "/expense/abc" })).toBe("/expense/abc");
  });

  it("rejects external, protocol-relative and malformed targets", () => {
    for (const url of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "expense/abc",
      "",
      "/ok\nnewline",
      `/${"a".repeat(300)}`,
      42,
      undefined,
    ]) {
      expect(notificationTarget({ url }), String(url)).toBeNull();
    }
  });

  it("returns null when there is no data object", () => {
    expect(notificationTarget(null)).toBeNull();
    expect(notificationTarget("/expense/abc")).toBeNull();
    expect(notificationTarget({})).toBeNull();
  });
});

describe("push types", () => {
  it("recognises only known types", () => {
    expect(isPushType("expense.created")).toBe(true);
    expect(isPushType("tips")).toBe(true);
    expect(isPushType("expense.deleted")).toBe(false);
    expect(isPushType(undefined)).toBe(false);
  });

  it("mutes and unmutes one type without duplicates", () => {
    const muted = withPushType([], "join_requested", false);
    expect(muted).toEqual(["join_requested"]);
    expect(withPushType(muted, "join_requested", false)).toEqual(["join_requested"]);
    expect(withPushType(muted, "expense.created", false)).toEqual([
      "join_requested",
      "expense.created",
    ]);
    expect(withPushType(muted, "join_requested", true)).toEqual([]);
  });
});
