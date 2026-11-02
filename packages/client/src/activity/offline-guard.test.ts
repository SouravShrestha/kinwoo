import {
  InfiniteQueryObserver,
  onlineManager,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { ApiRequestError } from "../api/request";
import { invalidateWhileOnline } from "../houses/query-client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { guardOfflineLoads, SLOW_LOAD_MS, watchLoadStatus } from "./offline-guard";

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
  it("cancels a next page requested offline and keeps the saved pages", async () => {
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
    expect(client.getQueryState(["pages"])?.fetchStatus).toBe("idle");
    expect(client.getQueryState(["pages"])?.status).toBe("error");
    expect(client.getQueryData<{ pages: string[][] }>(["pages"])?.pages).toEqual([["p"]]);
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

describe("watchLoadStatus", () => {
  it("reports a failed first load and a slow one", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const report = vi.fn();
    const stop = watchLoadStatus(client, report);
    const watch = (key: string, error: Error) =>
      new QueryObserver(client, {
        queryKey: [key],
        queryFn: () => Promise.reject(error),
        retry: false,
      }).subscribe(() => {});
    watch("fail", new Error("x"));
    // Neither leaves anything missing on screen: a 4xx is handled by its screen, and an
    // unobserved fetch renders nowhere.
    watch("forbidden", new ApiRequestError("no", 403));
    void client
      .fetchQuery({ queryKey: ["bg"], queryFn: () => Promise.reject(new Error("x")), retry: false })
      .catch(() => undefined);
    await vi.advanceTimersByTimeAsync(0);
    void client.fetchQuery({ queryKey: ["slow"], queryFn: () => new Promise(() => {}) });
    await vi.advanceTimersByTimeAsync(SLOW_LOAD_MS + 1);
    expect(report.mock.calls).toEqual([["failed"], ["slow"]]);
    stop();
    vi.useRealTimers();
  });
});
