import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const createServerClientMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

const ORIGINAL_ENV = { ...process.env };

interface FakeAuth {
  getClaims?: ReturnType<typeof vi.fn>;
  getUser: ReturnType<typeof vi.fn>;
}

function fakeClient(auth: FakeAuth) {
  return { auth };
}

async function loadModule() {
  vi.resetModules();
  return import("./client.route");
}

beforeEach(() => {
  createServerClientMock.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

const requestWithCookie = (cookie: string) =>
  new Request("https://kinwoo.cbsdev.me/api/thing", { headers: { cookie } });

const requestWithBearer = (token: string) =>
  new Request("https://kinwoo.cbsdev.me/api/thing", {
    headers: { authorization: `Bearer ${token}` },
  });

describe("getVerifiedUser with a bearer token", () => {
  it("resolves locally via getClaims without a network call", async () => {
    const getClaims = vi.fn(async () => ({ data: { claims: { sub: "user-1" } }, error: null }));
    const getUser = vi.fn();
    createServerClientMock.mockReturnValue(fakeClient({ getClaims, getUser }));

    const { getVerifiedUser } = await loadModule();

    await expect(getVerifiedUser(requestWithBearer("jwt-1"))).resolves.toEqual({ id: "user-1" });
    expect(getClaims).toHaveBeenCalledOnce();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("forwards the token on the Authorization header", async () => {
    createServerClientMock.mockReturnValue(
      fakeClient({
        getClaims: vi.fn(async () => ({ data: { claims: { sub: "user-1" } }, error: null })),
        getUser: vi.fn(),
      }),
    );

    const { getVerifiedUser } = await loadModule();
    await getVerifiedUser(requestWithBearer("jwt-1"));

    const options = createServerClientMock.mock.calls[0][2] as {
      global?: { headers?: Record<string, string> };
    };
    expect(options.global?.headers?.Authorization).toBe("Bearer jwt-1");
  });

  it("prefers the bearer token over a session cookie", async () => {
    createServerClientMock.mockReturnValue(
      fakeClient({
        getClaims: vi.fn(async () => ({ data: { claims: { sub: "bearer-user" } }, error: null })),
        getUser: vi.fn(async () => ({ data: { user: { id: "cookie-user" } }, error: null })),
      }),
    );

    const { getVerifiedUser } = await loadModule();
    const request = new Request("https://kinwoo.cbsdev.me/api/thing", {
      headers: { authorization: "Bearer jwt-1", cookie: "sb-auth-token=cookie" },
    });

    await expect(getVerifiedUser(request)).resolves.toEqual({ id: "bearer-user" });
  });

  it("resolves null for a forged token", async () => {
    createServerClientMock.mockReturnValue(
      fakeClient({
        getClaims: vi.fn(async () => ({ data: null, error: { message: "invalid signature" } })),
        getUser: vi.fn(async () => ({ data: { user: null }, error: { message: "invalid JWT" } })),
      }),
    );

    const { getVerifiedUser } = await loadModule();
    await expect(getVerifiedUser(requestWithBearer("forged"))).resolves.toBeNull();
  });

  it("resolves null for an expired token", async () => {
    createServerClientMock.mockReturnValue(
      fakeClient({
        getClaims: vi.fn(async () => ({ data: null, error: { message: "token is expired" } })),
        getUser: vi.fn(async () => ({ data: { user: null }, error: { message: "token expired" } })),
      }),
    );

    const { getVerifiedUser } = await loadModule();
    await expect(getVerifiedUser(requestWithBearer("expired"))).resolves.toBeNull();
  });

  it("falls back to getUser when getClaims throws", async () => {
    const getUser = vi.fn(async () => ({ data: { user: { id: "user-2" } }, error: null }));
    createServerClientMock.mockReturnValue(
      fakeClient({
        getClaims: vi.fn(async () => {
          throw new Error("not implemented in this version");
        }),
        getUser,
      }),
    );

    const { getVerifiedUser } = await loadModule();

    await expect(getVerifiedUser(requestWithBearer("jwt-2"))).resolves.toEqual({ id: "user-2" });
    expect(getUser).toHaveBeenCalledOnce();
  });

  it("uses getUser when the installed client has no getClaims", async () => {
    const getUser = vi.fn(async () => ({ data: { user: { id: "user-3" } }, error: null }));
    createServerClientMock.mockReturnValue(fakeClient({ getUser }));

    const { getVerifiedUser } = await loadModule();

    await expect(getVerifiedUser(requestWithBearer("jwt-3"))).resolves.toEqual({ id: "user-3" });
    expect(getUser).toHaveBeenCalledWith("jwt-3");
  });

  it("ignores an Authorization header that is not a bearer scheme", async () => {
    const getUser = vi.fn(async () => ({ data: { user: null }, error: null }));
    createServerClientMock.mockReturnValue(fakeClient({ getUser }));

    const { getVerifiedUser } = await loadModule();
    const request = new Request("https://kinwoo.cbsdev.me/api/thing", {
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });

    await expect(getVerifiedUser(request)).resolves.toBeNull();
  });
});

describe("getVerifiedUser with a session cookie", () => {
  it("resolves the cookie session via getClaims", async () => {
    const getClaims = vi.fn(async () => ({ data: { claims: { sub: "user-4" } }, error: null }));
    const getUser = vi.fn();
    createServerClientMock.mockReturnValue(fakeClient({ getClaims, getUser }));

    const { getVerifiedUser } = await loadModule();

    await expect(getVerifiedUser(requestWithCookie("sb-auth-token=abc"))).resolves.toEqual({
      id: "user-4",
    });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("resolves null when no credential is present at all", async () => {
    createServerClientMock.mockReturnValue(
      fakeClient({
        getClaims: vi.fn(async () => ({ data: { claims: undefined }, error: null })),
        getUser: vi.fn(),
      }),
    );

    const { getVerifiedUser } = await loadModule();
    const request = new Request("https://kinwoo.cbsdev.me/api/thing");

    await expect(getVerifiedUser(request)).resolves.toBeNull();
  });

  it("reads cookies through the parser, preserving base64 padding", async () => {
    createServerClientMock.mockReturnValue(
      fakeClient({
        getClaims: vi.fn(async () => ({ data: { claims: { sub: "user-5" } }, error: null })),
        getUser: vi.fn(),
      }),
    );

    const { getVerifiedUser } = await loadModule();
    await getVerifiedUser(requestWithCookie("sb-auth-token=eyJ9=="));

    const options = createServerClientMock.mock.calls[0][2] as {
      cookies: { getAll: () => { name: string; value: string }[] };
    };
    expect(options.cookies.getAll()).toEqual([{ name: "sb-auth-token", value: "eyJ9==" }]);
  });
});

describe("environment validation", () => {
  it("throws naming the missing variable", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { createRouteClient } = await loadModule();
    const request = new Request("https://kinwoo.cbsdev.me/api/thing");

    expect(() => createRouteClient(request)).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});

describe("cookie buffering", () => {
  it("flushes buffered Supabase cookies onto the response", async () => {
    createServerClientMock.mockReturnValue(fakeClient({ getUser: vi.fn() }));

    const { createRouteClient } = await loadModule();
    const request = new Request("https://kinwoo.cbsdev.me/api/thing");
    const { applyCookies } = createRouteClient(request);

    const options = createServerClientMock.mock.calls[0][2] as {
      cookies: { setAll: (c: { name: string; value: string; options?: object }[]) => void };
    };
    options.cookies.setAll([{ name: "sb-auth-token", value: "fresh", options: { path: "/" } }]);

    const set = vi.fn();
    applyCookies({ cookies: { set } } as never);

    expect(set).toHaveBeenCalledWith("sb-auth-token", "fresh", { path: "/" });
  });

  it("keeps buffers separate per request", async () => {
    createServerClientMock.mockReturnValue(fakeClient({ getUser: vi.fn() }));

    const { createRouteClient } = await loadModule();
    const first = new Request("https://kinwoo.cbsdev.me/a");
    const second = new Request("https://kinwoo.cbsdev.me/b");

    createRouteClient(first);
    const firstOptions = createServerClientMock.mock.calls[0][2] as {
      cookies: { setAll: (c: { name: string; value: string }[]) => void };
    };
    firstOptions.cookies.setAll([{ name: "first", value: "1" }]);

    const { applyCookies: applySecond } = createRouteClient(second);
    const set = vi.fn();
    applySecond({ cookies: { set } } as never);

    expect(set).not.toHaveBeenCalled();
  });

  it("lets a handler add its own cookie to the same flush", async () => {
    createServerClientMock.mockReturnValue(fakeClient({ getUser: vi.fn() }));

    const { createRouteClient, queueCookie } = await loadModule();
    const request = new Request("https://kinwoo.cbsdev.me/api/thing");
    const { applyCookies } = createRouteClient(request);

    queueCookie(request, { name: "kinwoo-locale", value: "en" });

    const set = vi.fn();
    applyCookies({ cookies: { set } } as never);

    expect(set).toHaveBeenCalledWith("kinwoo-locale", "en", undefined);
  });

  it("lets a later client in the same request see cookies an earlier one refreshed", async () => {
    createServerClientMock.mockReturnValue(fakeClient({ getUser: vi.fn() }));

    const { createRouteClient } = await loadModule();
    const request = requestWithCookie("sb-auth-token=stale; other=1");
    createRouteClient(request);
    createRouteClient(request);

    type Options = {
      cookies: {
        getAll: () => { name: string; value: string }[];
        setAll: (c: { name: string; value: string; options?: object }[]) => void;
      };
    };
    const first = createServerClientMock.mock.calls[0][2] as Options;
    const second = createServerClientMock.mock.calls[1][2] as Options;
    first.cookies.setAll([
      { name: "sb-auth-token", value: "fresh" },
      { name: "other", value: "", options: { maxAge: 0 } },
    ]);

    expect(second.cookies.getAll()).toEqual([{ name: "sb-auth-token", value: "fresh" }]);
  });

  it("is a no-op for a request that never created a client", async () => {
    const { applyCookies } = await loadModule();
    const set = vi.fn();

    applyCookies(new Request("https://kinwoo.cbsdev.me/x"), { cookies: { set } } as never);

    expect(set).not.toHaveBeenCalled();
  });
});

describe("createRouteClient credentials", () => {
  type Options = {
    cookies: { getAll: () => unknown[] };
    global?: { headers: Record<string, string> };
  };

  it("runs queries under a bearer token so RLS sees the mobile caller", async () => {
    createServerClientMock.mockReturnValue(fakeClient({ getUser: vi.fn() }));

    const { createRouteClient } = await loadModule();
    createRouteClient(
      new Request("https://kinwoo.cbsdev.me/api/profile", {
        headers: { authorization: "Bearer jwt-1", cookie: "sb-auth-token=cookie" },
      }),
    );

    const options = createServerClientMock.mock.calls[0][2] as Options;
    expect(options.global?.headers.Authorization).toBe("Bearer jwt-1");
    expect(options.cookies.getAll()).toEqual([]);
  });

  it("falls back to the session cookie when there is no bearer token", async () => {
    createServerClientMock.mockReturnValue(fakeClient({ getUser: vi.fn() }));

    const { createRouteClient } = await loadModule();
    createRouteClient(requestWithCookie("sb-auth-token=abc"));

    const options = createServerClientMock.mock.calls[0][2] as Options;
    expect(options.global).toBeUndefined();
    expect(options.cookies.getAll()).toEqual([{ name: "sb-auth-token", value: "abc" }]);
  });
});
