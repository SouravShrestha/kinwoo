import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
const verifyOtp = vi.fn();
const applyCookies = vi.fn((response: unknown) => response);

vi.mock("@/integrations/supabase/client.route", () => ({
  createRouteClient: () => ({
    supabase: { auth: { exchangeCodeForSession, verifyOtp } },
    applyCookies,
  }),
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  applyCookies.mockImplementation((response: unknown) => response);
  process.env.NEXT_PUBLIC_SITE_URL = "https://kinwoo.cbsdev.me";
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

const call = async (query: string) => {
  const { GET } = await import("./route");
  return GET(new Request(`https://kinwoo.cbsdev.me/auth/callback${query}`));
};

const locationOf = (response: Response) => response.headers.get("location") ?? "";

describe("the PKCE code path", () => {
  it("exchanges the code and redirects to the sanitised next path", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await call("?code=abc&next=%2Fprofile");

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(locationOf(response)).toBe("https://kinwoo.cbsdev.me/profile");
  });

  it("flushes cookies on success, which is where the session lives", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    await call("?code=abc");
    expect(applyCookies).toHaveBeenCalledOnce();
  });

  it("reports exchange_failed when Supabase rejects the code", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "bad code" } });

    expect(locationOf(await call("?code=stale"))).toContain("auth_error=exchange_failed");
  });

  it("reports unavailable when the call throws", async () => {
    exchangeCodeForSession.mockRejectedValue(new Error("network"));

    expect(locationOf(await call("?code=abc"))).toContain("auth_error=unavailable");
  });
});

describe("the email token path", () => {
  it("verifies an allowed OTP type", async () => {
    verifyOtp.mockResolvedValue({ error: null });

    const response = await call("?token_hash=hash&type=magiclink");

    expect(verifyOtp).toHaveBeenCalledWith({ type: "magiclink", token_hash: "hash" });
    expect(locationOf(response)).toBe("https://kinwoo.cbsdev.me/");
  });

  it("rejects an OTP type outside the allow-list without calling Supabase", async () => {
    const response = await call("?token_hash=hash&type=sms");

    expect(locationOf(response)).toContain("auth_error=bad_token_type");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("rejects a token with no type at all", async () => {
    expect(locationOf(await call("?token_hash=hash"))).toContain("auth_error=bad_token_type");
  });

  it("reports verify_failed for an expired token", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "expired" } });

    expect(locationOf(await call("?token_hash=old&type=email"))).toContain(
      "auth_error=verify_failed",
    );
  });
});

describe("rejections before any credential work", () => {
  it("reports provider_denied when the provider sent an error", async () => {
    const response = await call("?error=access_denied");

    expect(locationOf(response)).toContain("auth_error=provider_denied");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("reports missing_code when there is no credential", async () => {
    expect(locationOf(await call(""))).toContain("auth_error=missing_code");
  });
});

describe("open-redirect hardening", () => {
  it("discards an off-site next parameter", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    expect(locationOf(await call("?code=abc&next=https%3A%2F%2Fevil.example"))).toBe(
      "https://kinwoo.cbsdev.me/",
    );
  });

  it("discards a protocol-relative next parameter", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    expect(locationOf(await call("?code=abc&next=%2F%2Fevil.example"))).toBe(
      "https://kinwoo.cbsdev.me/",
    );
  });

  it("does not loop back into the auth routes", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    expect(locationOf(await call("?code=abc&next=%2Fauth%2Fcallback"))).toBe(
      "https://kinwoo.cbsdev.me/",
    );
  });

  it("keeps the configured origin even when the request arrives on another host", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const { GET } = await import("./route");

    const response = await GET(
      new Request("https://internal.worker.dev/auth/callback?code=abc&next=%2Fprofile"),
    );

    expect(locationOf(response)).toBe("https://kinwoo.cbsdev.me/profile");
  });
});
