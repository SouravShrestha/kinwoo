import { describe, expect, it } from "vitest";

import {
  CHUNK_LENGTH,
  createChunkedSecureStorage,
  type KeyValueStorage,
  type SecureStoreLike,
} from "./secure-storage";

function memorySecureStore(): SecureStoreLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => void data.set(key, value),
    deleteItemAsync: async (key) => void data.delete(key),
  };
}

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => void data.set(key, value),
    removeItem: async (key) => void data.delete(key),
  };
}

describe("createChunkedSecureStorage", () => {
  it("round-trips a value larger than one chunk", async () => {
    const secure = memorySecureStore();
    const storage = createChunkedSecureStorage(secure);
    const value = "é".repeat(CHUNK_LENGTH * 2 + 7);

    await storage.setItem("sb-auth", value);

    expect(await storage.getItem("sb-auth")).toBe(value);
    expect(secure.data.get("sb-auth.n")).toBe("3");
    for (const chunk of secure.data.values()) {
      expect(chunk.length).toBeLessThanOrEqual(CHUNK_LENGTH);
    }
  });

  it("drops leftover chunks when a value shrinks", async () => {
    const secure = memorySecureStore();
    const storage = createChunkedSecureStorage(secure);

    await storage.setItem("k", "x".repeat(CHUNK_LENGTH * 3));
    await storage.setItem("k", "short");

    expect(await storage.getItem("k")).toBe("short");
    expect([...secure.data.keys()].sort()).toEqual(["k.0", "k.n"]);
  });

  it("removes every chunk", async () => {
    const secure = memorySecureStore();
    const storage = createChunkedSecureStorage(secure);

    await storage.setItem("k", "x".repeat(CHUNK_LENGTH + 1));
    await storage.removeItem("k");

    expect(secure.data.size).toBe(0);
    expect(await storage.getItem("k")).toBeNull();
  });

  it("moves a legacy session across on first read", async () => {
    const secure = memorySecureStore();
    const legacy = memoryStorage({ k: "old-session" });
    const storage = createChunkedSecureStorage(secure, legacy);

    expect(await storage.getItem("k")).toBe("old-session");
    expect(legacy.data.has("k")).toBe(false);
    expect(await createChunkedSecureStorage(secure).getItem("k")).toBe("old-session");
  });

  it("treats a missing chunk as no session", async () => {
    const secure = memorySecureStore();
    const storage = createChunkedSecureStorage(secure);

    await storage.setItem("k", "x".repeat(CHUNK_LENGTH + 1));
    secure.data.delete("k.1");

    expect(await storage.getItem("k")).toBeNull();
  });
});
