import { describe, expect, it } from "vitest";

import { formatPaise as corePaise } from "../../../packages/core/src/grocery/bought-groups";
import { PUSH_TYPES as corePushTypes } from "../../../packages/core/src/push/events";
import {
  audienceFor,
  chunk,
  deadTokens,
  formatPaise,
  messageFor,
  PUSH_TYPES,
  sameSecret,
  type Activity,
} from "./logic";

const ASHA = "00000000-0000-4000-8000-000000000001";
const ROHAN = "00000000-0000-4000-8000-000000000002";
const MEERA = "00000000-0000-4000-8000-000000000003";

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: "a1",
    house_id: "h1",
    actor_id: ASHA,
    type: "expense.created",
    entity_type: "expense",
    entity_id: "e1",
    payload: {},
    ...overrides,
  };
}

describe("audienceFor", () => {
  it("sends an expense to its sharers, never the actor, once each", () => {
    const result = audienceFor(
      activity({
        payload: {
          shares: [
            { user_id: ASHA, share_paise: 100 },
            { user_id: ROHAN, share_paise: 100 },
            { user_id: ROHAN, share_paise: 100 },
            { user_id: MEERA, share_paise: 100 },
          ],
        },
      }),
    );
    expect(result).toEqual({ kind: "users", ids: [ROHAN, MEERA] });
  });

  it("sends nothing when the actor is the only sharer", () => {
    const result = audienceFor(activity({ payload: { shares: [{ user_id: ASHA }] } }));
    expect(result).toEqual({ kind: "none" });
  });

  it("ignores malformed ids and payloads", () => {
    expect(audienceFor(activity({ payload: { shares: [{ user_id: "nope" }, null, 4] } }))).toEqual({
      kind: "none",
    });
    expect(audienceFor(activity({ payload: { shares: "x" } }))).toEqual({ kind: "none" });
  });

  it("tells the other party about a payment", () => {
    const base = { type: "settlement.recorded", payload: { payer_id: ASHA, payee_id: ROHAN } };
    expect(audienceFor(activity(base))).toEqual({ kind: "users", ids: [ROHAN] });
    expect(audienceFor(activity({ ...base, actor_id: ROHAN }))).toEqual({
      kind: "users",
      ids: [ASHA],
    });
  });

  it("tells the assignee, unless they assigned it to themselves", () => {
    const base = { type: "grocery_item.assigned" };
    expect(audienceFor(activity({ ...base, payload: { assigned_to: ROHAN } }))).toEqual({
      kind: "users",
      ids: [ROHAN],
    });
    expect(audienceFor(activity({ ...base, payload: { assigned_to: ASHA } }))).toEqual({
      kind: "none",
    });
  });

  it("sends a join request to admins and ignores other event types", () => {
    expect(audienceFor(activity({ type: "join_requested" }))).toEqual({ kind: "admins" });
    expect(audienceFor(activity({ type: "expense.deleted" }))).toEqual({ kind: "none" });
  });
});

describe("messageFor", () => {
  it("names the actor, title and amount of a new expense", () => {
    expect(
      messageFor(activity({ payload: { title: "Dinner", amount_paise: 84000 } }), "Asha"),
    ).toEqual({ title: "New expense", body: "Asha added Dinner · ₹840", url: "/expense/e1" });
  });

  it("announces an edited expense to its current sharers", () => {
    const edited = activity({
      type: "expense.updated",
      payload: { title: "Dinner", amount_paise: 90000, shares: [{ user_id: ROHAN }] },
    });
    expect(audienceFor(edited)).toEqual({ kind: "users", ids: [ROHAN] });
    expect(messageFor(edited, "Asha")).toEqual({
      title: "Expense updated",
      body: "Asha updated Dinner · ₹900",
      url: "/expense/e1",
    });
  });

  it("falls back when the actor or fields are missing", () => {
    expect(messageFor(activity({ payload: {} }), null)?.body).toBe("Someone added an expense");
  });

  it("describes a payment and links to it", () => {
    expect(
      messageFor(
        activity({
          type: "settlement.recorded",
          entity_id: "s1",
          payload: { payer_name: "Rohan", payee_name: "Asha", amount_paise: 12550 },
        }),
        "Rohan",
      ),
    ).toEqual({
      title: "Payment recorded",
      body: "Rohan paid Asha ₹125.50",
      url: "/expenses/payment?settlementId=s1",
    });
  });

  it("describes an assignment and a join request", () => {
    expect(
      messageFor(activity({ type: "grocery_item.assigned", payload: { name: "Milk" } }), "Asha"),
    ).toMatchObject({ body: "Asha assigned you Milk", url: "/tasks" });
    expect(messageFor(activity({ type: "join_requested" }), "Meera")).toMatchObject({
      body: "Meera wants to join your house",
      url: "/",
    });
  });

  it("collapses whitespace and shortens very long text", () => {
    const body = messageFor(
      activity({ payload: { title: `a\n\n${"b".repeat(300)}` } }),
      "Asha",
    )!.body;
    expect(body).not.toContain("\n");
    expect(body.length).toBeLessThan(130);
    expect(body).toContain("…");
  });

  it("returns null for events it does not announce, or when the target is unknown", () => {
    expect(messageFor(activity({ type: "expense.deleted" }), "Asha")).toBeNull();
    expect(messageFor(activity({ entity_id: null }), "Asha")).toBeNull();
  });
});

describe("helpers", () => {
  it("splits into batches of 100", () => {
    const batches = chunk(Array.from({ length: 250 }, (_, i) => i));
    expect(batches.map((batch) => batch.length)).toEqual([100, 100, 50]);
    expect(chunk([])).toEqual([]);
  });

  it("finds the tokens Expo says are gone", () => {
    const tickets = [
      { status: "ok" },
      { status: "error", details: { error: "DeviceNotRegistered" } },
      { status: "error", details: { error: "MessageTooBig" } },
    ];
    expect(deadTokens(tickets, ["t1", "t2", "t3"])).toEqual(["t2"]);
    expect(deadTokens([], ["t1"])).toEqual([]);
  });

  it("compares secrets and refuses empty ones", () => {
    expect(sameSecret("abc123", "abc123")).toBe(true);
    expect(sameSecret("abc124", "abc123")).toBe(false);
    expect(sameSecret("abc", "abc123")).toBe(false);
    expect(sameSecret(null, "abc123")).toBe(false);
    expect(sameSecret("", "")).toBe(false);
    expect(sameSecret("abc", undefined)).toBe(false);
  });

  it("lists the same push types as @kinwoo/core", () => {
    expect([...PUSH_TYPES]).toEqual([...corePushTypes]);
  });

  it("formats rupees exactly like @kinwoo/core", () => {
    for (const paise of [0, 5, 100, 12550, 99999, 100000, 12345678, 1000000000, -4500]) {
      expect(formatPaise(paise), String(paise)).toBe(corePaise(paise));
    }
  });
});
