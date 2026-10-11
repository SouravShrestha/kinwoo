import { beforeEach, describe, expect, it } from "vitest";

import { isTop, push, remove, reset } from "./stack";

beforeEach(() => reset());

describe("the sheet stack", () => {
  it("treats the most recently pushed entry as the top", () => {
    const a = Symbol("a");
    const b = Symbol("b");

    push(a);
    expect(isTop(a)).toBe(true);

    push(b);
    expect(isTop(b)).toBe(true);
    expect(isTop(a)).toBe(false);
  });

  it("restores the previous entry when the top is removed", () => {
    const a = Symbol("a");
    const b = Symbol("b");

    push(a);
    push(b);
    remove(b);

    expect(isTop(a)).toBe(true);
  });

  it("handles out-of-order removal without disturbing the top", () => {
    const a = Symbol("a");
    const b = Symbol("b");

    push(a);
    push(b);
    remove(a);

    expect(isTop(b)).toBe(true);
  });

  it("does not duplicate an entry pushed twice", () => {
    const a = Symbol("a");
    const b = Symbol("b");

    push(a);
    push(b);
    push(a);
    remove(a);

    expect(isTop(b)).toBe(true);
  });

  it("reports no top when empty", () => {
    expect(isTop(Symbol("a"))).toBe(false);
  });

  it("is a no-op to remove an entry that was never pushed", () => {
    const a = Symbol("a");
    push(a);
    remove(Symbol("other"));

    expect(isTop(a)).toBe(true);
  });
});
