import { beforeEach, describe, expect, it, vi } from "vitest";

import { FeedbackService } from "./FeedbackService";
import { formatFeedbackMessage } from "./FeedbackRepository";
import type { IFeedbackRepository } from "./IFeedbackRepository";

const VALID = {
  email: "a@b.co",
  subject: "Hello",
  description: "Line one\nLine two",
  type: "bug",
} as const;

function setup(send = vi.fn(async () => {})) {
  const repository: IFeedbackRepository = { send };
  return { send, service: new FeedbackService(repository) };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("FeedbackService", () => {
  it("sends a valid submission with text cleaned", async () => {
    const { send, service } = setup();
    const result = await service.submit({ ...VALID, subject: "  Hi\tthere\u0000 " });
    expect(result).toEqual({ ok: true, data: null });
    expect(send).toHaveBeenCalledWith({ ...VALID, subject: "Hi there" });
  });

  it.each([
    ["bad email", { email: "nope" }],
    ["missing subject", { subject: "  " }],
    ["long description", { description: "x".repeat(2001) }],
    ["unknown type", { type: "spam" }],
    ["non-string subject", { subject: 5 }],
  ])("rejects %s without sending", async (_name, override) => {
    const { send, service } = setup();
    const result = await service.submit({ ...VALID, ...override });
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(send).not.toHaveBeenCalled();
  });

  it("reports UNAVAILABLE without leaking the cause", async () => {
    const { service } = setup(
      vi.fn(async () => {
        throw new Error("token 123:secret");
      }),
    );
    const result = await service.submit(VALID);
    expect(result).toMatchObject({ ok: false, code: "UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});

describe("formatFeedbackMessage", () => {
  it("escapes HTML so Telegram does not reject or render user markup", () => {
    const text = formatFeedbackMessage({ ...VALID, subject: "<b>&</b>" });
    expect(text).toContain("&lt;b&gt;&amp;&lt;/b&gt;");
    expect(text).toContain("Bug report");
  });
});
