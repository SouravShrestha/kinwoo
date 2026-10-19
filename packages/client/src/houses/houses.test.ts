import { QueryClient } from "@tanstack/react-query";
import type { House, HouseMembership } from "@kinwoo/core/houses";
import { beforeEach, describe, expect, it } from "vitest";

import { ApiRequestError } from "../api/request";
import { resolveActiveHouse } from "./active-house";
import { addHouseToCache, removeHouseFromCache, updateHouseInCache } from "./cache";
import { houseKeys, lostAccessHouseId } from "./keys";
import { savePendingInvite, subscribePendingInvite, takePendingInvite } from "./pending-invite";
import { shouldRetry } from "./query-client";
import {
  applyRealtimeActions,
  houseMemberActions,
  houseRowActions,
  ownMembershipActions,
} from "./realtime";
import { createMemoryStorage } from "./storage";

const house = (id: string, name = id): House => ({
  id,
  name,
  address: null,
  joinMode: "anyone",
  simplifyDebts: false,
});
const membership = (id: string): HouseMembership => ({ role: "member", house: house(id) });

describe("resolveActiveHouse", () => {
  const houses = [membership("a"), membership("b")];

  it("keeps the stored house while the user still belongs to it", () => {
    expect(resolveActiveHouse("b", houses)).toBe("b");
  });

  it("falls back to the first house when the stored one is gone or unset", () => {
    expect(resolveActiveHouse("gone", houses)).toBe("a");
    expect(resolveActiveHouse(null, houses)).toBe("a");
  });

  it("is null when the user has no houses", () => {
    expect(resolveActiveHouse("a", [])).toBeNull();
  });
});

describe("houseKeys", () => {
  it("nests every per-house key under the house prefix", () => {
    const prefix = houseKeys.detail("h1");
    expect(houseKeys.members("h1").slice(0, 2)).toEqual(prefix);
    expect(houseKeys.invite("h1").slice(0, 2)).toEqual(prefix);
  });
});

describe("lostAccessHouseId", () => {
  it("returns the house for a 404 on a per-house query", () => {
    const error = new ApiRequestError("gone", 404, "NOT_FOUND");
    expect(lostAccessHouseId(houseKeys.members("h1"), error)).toBe("h1");
    expect(lostAccessHouseId(houseKeys.detail("h1"), error)).toBe("h1");
  });

  it("ignores the list, other statuses and unrelated queries", () => {
    expect(lostAccessHouseId(houseKeys.list(), new ApiRequestError("x", 404))).toBeNull();
    expect(lostAccessHouseId(houseKeys.members("h1"), new ApiRequestError("x", 403))).toBeNull();
    expect(lostAccessHouseId(houseKeys.members("h1"), new Error("offline"))).toBeNull();
    expect(lostAccessHouseId(["profile"], new ApiRequestError("x", 404))).toBeNull();
    expect(
      lostAccessHouseId(houseKeys.invitePreview("ABC234"), new ApiRequestError("x", 404)),
    ).toBe(null);
  });
});

describe("shouldRetry", () => {
  it("never retries a 4xx", () => {
    expect(shouldRetry(0, new ApiRequestError("x", 403))).toBe(false);
    expect(shouldRetry(0, new ApiRequestError("x", 404))).toBe(false);
  });

  it("retries network and 5xx failures a limited number of times", () => {
    expect(shouldRetry(0, new Error("offline"))).toBe(true);
    expect(shouldRetry(1, new ApiRequestError("x", 503))).toBe(true);
    expect(shouldRetry(2, new ApiRequestError("x", 503))).toBe(false);
  });
});

describe("pending invite", () => {
  it("saves a cleaned code and notifies subscribers", async () => {
    const storage = createMemoryStorage();
    let notified = 0;
    const unsubscribe = subscribePendingInvite(() => {
      notified += 1;
    });

    expect(await savePendingInvite(storage, "https://kinwoo.cbsdev.me/join/abc234")).toBe("ABC234");
    expect(notified).toBe(1);

    unsubscribe();
    await savePendingInvite(storage, "def567");
    expect(notified).toBe(1);
  });

  it("refuses to save something that is not a code", async () => {
    const storage = createMemoryStorage();
    expect(await savePendingInvite(storage, "hello")).toBeNull();
    expect(await takePendingInvite(storage)).toBeNull();
  });

  it("returns a saved code exactly once", async () => {
    const storage = createMemoryStorage();
    await savePendingInvite(storage, "ABC234");

    expect(await takePendingInvite(storage)).toBe("ABC234");
    expect(await takePendingInvite(storage)).toBeNull();
  });

  it("discards a corrupt stored value instead of resuming it", async () => {
    const storage = createMemoryStorage({ "kinwoo.pendingInvite": "garbage" });

    expect(await takePendingInvite(storage)).toBeNull();
    expect(await storage.getItem("kinwoo.pendingInvite")).toBeNull();
  });
});

describe("realtime actions", () => {
  it("drops a house when the user's own membership ends", () => {
    for (const status of ["removed", "left", "rejected"]) {
      expect(ownMembershipActions({ house_id: "h1", user_id: "u1", status })).toEqual([
        { type: "drop-house", houseId: "h1" },
      ]);
    }
  });

  it("refreshes the list when the user's own membership becomes active", () => {
    expect(ownMembershipActions({ house_id: "h1", status: "active" })).toEqual([
      { type: "refresh-houses" },
    ]);
  });

  it("refreshes members and invites when someone else's membership changes", () => {
    expect(houseMemberActions({ house_id: "h1", status: "active" }, "h1")).toEqual([
      { type: "refresh-members", houseId: "h1" },
      { type: "refresh-invited-emails", houseId: "h1" },
    ]);
  });

  it("refreshes a renamed house and drops a deleted one", () => {
    expect(houseRowActions({ id: "h1", deleted_at: null }, "h1")).toEqual([
      { type: "refresh-houses" },
      { type: "refresh-house", houseId: "h1" },
    ]);
    expect(houseRowActions({ id: "h1", deleted_at: "2026-10-10" }, "h1")).toEqual([
      { type: "drop-house", houseId: "h1" },
    ]);
  });
});

describe("house cache", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    queryClient.setQueryData(houseKeys.list(), [membership("a"), membership("b")]);
    queryClient.setQueryData(houseKeys.members("a"), [{ userId: "u1" }]);
    queryClient.setQueryData(houseKeys.invite("a"), []);
  });

  it("adds a new house as admin without duplicating it", () => {
    addHouseToCache(queryClient, house("c"));
    addHouseToCache(queryClient, house("c", "Renamed"));

    const list = queryClient.getQueryData<HouseMembership[]>(houseKeys.list());
    expect(list?.map((m) => m.house.id)).toEqual(["a", "b", "c"]);
    expect(list?.[2]).toEqual({ role: "admin", house: house("c", "Renamed") });
  });

  it("updates a house in place", () => {
    updateHouseInCache(queryClient, house("b", "New name"));

    const list = queryClient.getQueryData<HouseMembership[]>(houseKeys.list());
    expect(list?.[1].house.name).toBe("New name");
    expect(list?.[1].role).toBe("member");
  });

  it("removes a house and everything cached under it", () => {
    removeHouseFromCache(queryClient, "a");

    const list = queryClient.getQueryData<HouseMembership[]>(houseKeys.list());
    expect(list?.map((m) => m.house.id)).toEqual(["b"]);
    expect(queryClient.getQueryData(houseKeys.members("a"))).toBeUndefined();
    expect(queryClient.getQueryData(houseKeys.invite("a"))).toBeUndefined();
  });

  it("applies realtime actions to the cache", () => {
    const dropped: string[] = [];

    applyRealtimeActions(
      queryClient,
      [
        { type: "refresh-members", houseId: "a" },
        { type: "drop-house", houseId: "b" },
      ],
      (id) => dropped.push(id),
    );

    expect(dropped).toEqual(["b"]);
    expect(queryClient.getQueryState(houseKeys.members("a"))?.isInvalidated).toBe(true);
  });
});
