import { beforeEach, describe, expect, it, vi } from "vitest";

import { configureApiClient } from "../api/config";
import { fetchBalances, recordSettlement, setSimplifyDebts } from "./api";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(
    async () =>
      new Response(JSON.stringify({ ok: true, balances: { netPaise: 0, pairs: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  configureApiClient({
    baseUrl: "https://kinwoo.cbsdev.me/",
    fetch: fetchMock as unknown as typeof fetch,
    getAuthHeaders: async () => ({}),
  });
});

describe("expenses api", () => {
  it("PUTs the simplify debts setting for the house", async () => {
    await setSimplifyDebts("h1", true);

    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/expenses/simplify-debts");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify({ enabled: true }));
  });

  it("asks for simplified balances only when told to", async () => {
    await fetchBalances("h1");
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(
      "https://kinwoo.cbsdev.me/api/houses/h1/expenses/balances",
    );

    await fetchBalances("h1", true);
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(
      "https://kinwoo.cbsdev.me/api/houses/h1/expenses/balances?simplify=1",
    );
  });

  it("POSTs a payment and returns its id", async () => {
    fetchMock.mockImplementationOnce(
      async () => new Response(JSON.stringify({ settlement: { id: "s1" } }), { status: 200 }),
    );
    const input = { payerId: "a", payeeId: "b", amountPaise: 4000 };
    await expect(recordSettlement("h1", input)).resolves.toBe("s1");
    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    expect(url).toBe("https://kinwoo.cbsdev.me/api/houses/h1/expenses/settlements");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(input));
  });
});
