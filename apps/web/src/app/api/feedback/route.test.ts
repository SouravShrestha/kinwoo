import { beforeEach, describe, expect, it, vi } from "vitest";

const submit = vi.fn();
const checkRateLimit = vi.fn();

vi.mock("@/integrations/supabase/client.route", () => ({
  createRouteClient: () => ({}),
  getVerifiedUser: vi.fn(),
}));
vi.mock("@/api/feedback/FeedbackRepository", () => ({ FeedbackRepository: class {} }));
vi.mock("@/api/feedback/FeedbackService", () => ({
  FeedbackService: class {
    submit = submit;
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

const BODY = { email: "a@b.co", subject: "Hi", description: "Hello", type: "bug" };

beforeEach(() => {
  vi.clearAllMocks();
  checkRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
  submit.mockResolvedValue({ ok: true, data: null });
});

async function call(body: unknown = BODY, headers: Record<string, string> = {}) {
  const { POST } = await import("./route");
  return POST(
    new Request("https://kinwoo.in/api/feedback", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        origin: "https://kinwoo.in",
        host: "kinwoo.in",
        ...headers,
      },
    }),
  );
}

describe("POST /api/feedback", () => {
  it("submits for a same-origin JSON request", async () => {
    expect((await call()).status).toBe(200);
    expect(submit).toHaveBeenCalledWith(BODY);
  });

  it("403s a cross-origin request before rate limiting", async () => {
    expect((await call(BODY, { origin: "https://evil.example" })).status).toBe(403);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("415s a non-JSON request", async () => {
    expect((await call(BODY, { "content-type": "text/plain" })).status).toBe(415);
  });

  it("429s with Retry-After when rate limited", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 30_000 });
    const response = await call();
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(submit).not.toHaveBeenCalled();
  });

  it("fakes success for a filled honeypot without sending", async () => {
    const response = await call({ ...BODY, kw_hp_field: "bot" });
    expect(response.status).toBe(200);
    expect(submit).not.toHaveBeenCalled();
  });

  it("maps service failures to 400 and 503", async () => {
    submit.mockResolvedValue({ ok: false, code: "INVALID_INPUT", message: "no" });
    expect((await call()).status).toBe(400);
    submit.mockResolvedValue({ ok: false, code: "UNAVAILABLE", message: "down" });
    expect((await call()).status).toBe(503);
  });
});
