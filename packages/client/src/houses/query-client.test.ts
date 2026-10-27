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
