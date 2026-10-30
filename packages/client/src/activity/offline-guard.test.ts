import { InfiniteQueryObserver, onlineManager, QueryClient } from "@tanstack/react-query";
import { invalidateWhileOnline } from "../houses/query-client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { guardOfflineLoads } from "./offline-guard";

afterEach(() => onlineManager.setOnline(true));

describe("guardOfflineLoads", () => {
  it("fails a first load offline once and reports it once", async () => {
    onlineManager.setOnline(false);
    const client = new QueryClient();
    const onBlocked = vi.fn();
    const stop = guardOfflineLoads(client, onBlocked);
    const queryFn = vi.fn(async () => "x");

    const a = client.fetchQuery({ queryKey: ["a"], queryFn }).catch(() => undefined);
    const b = client.fetchQuery({ queryKey: ["b"], queryFn }).catch(() => undefined);
    await Promise.all([a, b]);
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(client.getQueryState(["a"])?.status).toBe("error");
    expect(client.getQueryState(["a"])?.fetchStatus).toBe("idle");
    expect(queryFn).not.toHaveBeenCalled();
    expect(onBlocked).toHaveBeenCalledTimes(1);
    expect(onBlocked).toHaveBeenCalledWith("unsaved");
    stop();
  });

  it("leaves a query that already has data alone", async () => {
    onlineManager.setOnline(false);
    const client = new QueryClient();
    client.setQueryData(["a"], "saved");
    const onBlocked = vi.fn();
    const stop = guardOfflineLoads(client, onBlocked);

    void client.refetchQueries({ queryKey: ["a"] });
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(client.getQueryData(["a"])).toBe("saved");
    expect(client.getQueryState(["a"])?.status).toBe("success");
    expect(onBlocked).not.toHaveBeenCalled();
    stop();
  });
});

describe("offline list paging and refreshes", () => {
  it("reports a next page requested offline without cancelling it", async () => {
    const client = new QueryClient();
    const options = {
      queryKey: ["pages"],
      queryFn: async () => ["p"],
      initialPageParam: 0,
      getNextPageParam: () => 1,
    };
    await client.fetchInfiniteQuery(options);
    onlineManager.setOnline(false);
    const onBlocked = vi.fn();
    const stop = guardOfflineLoads(client, onBlocked);

    const observer = new InfiniteQueryObserver(client, options);
    void observer.fetchNextPage();
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(onBlocked).toHaveBeenCalledWith("more");
    expect(client.getQueryState(["pages"])?.fetchStatus).toBe("paused");
    stop();
  });

  it("does not wait for a refresh once offline", async () => {
    onlineManager.setOnline(false);
    const client = new QueryClient();
    const queryFn = vi.fn(async () => "x");
    client.setQueryData(["a"], "saved");
    void client.fetchQuery({ queryKey: ["a"], queryFn, staleTime: 0 });
    await expect(invalidateWhileOnline(client, { queryKey: ["a"] })).resolves.toBeUndefined();
  });
});
