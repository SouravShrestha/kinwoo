import { onlineManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient, OFFLINE_ERROR_CODE } from "./query-client";

describe("createAppQueryClient offline writes", () => {
  afterEach(() => onlineManager.setOnline(true));

  it("fails a mutation before its optimistic update when offline", async () => {
    onlineManager.setOnline(false);
    const onMutate = vi.fn();
    const mutationFn = vi.fn();
    const client = createAppQueryClient();
    const mutation = client.getMutationCache().build(client, { mutationFn, onMutate });

    await expect(mutation.execute(undefined)).rejects.toMatchObject({ code: OFFLINE_ERROR_CODE });
    expect(onMutate).not.toHaveBeenCalled();
    expect(mutationFn).not.toHaveBeenCalled();
  });
});

describe("createAppQueryClient after a write", () => {
  it("marks queries from other features stale when any mutation succeeds", async () => {
    const client = createAppQueryClient();
    await client.fetchQuery({ queryKey: ["expenses", "h1", "list"], queryFn: () => [] });
    expect(client.getQueryState(["expenses", "h1", "list"])?.isInvalidated).toBe(false);

    const mutation = client.getMutationCache().build(client, { mutationFn: async () => "ok" });
    await mutation.execute(undefined);

    expect(client.getQueryState(["expenses", "h1", "list"])?.isInvalidated).toBe(true);
  });
});
