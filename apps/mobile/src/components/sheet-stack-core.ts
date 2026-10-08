/**
 * A module-level LIFO of open sheets, so Android's back gesture closes only the
 * topmost one instead of every listener firing at once.
 *
 * Kept free of react-native imports so it can be unit tested; the hook that
 * binds it to BackHandler lives in sheet-stack.ts.
 */
let stack: symbol[] = [];

export function push(id: symbol): void {
  stack = [...stack.filter((entry) => entry !== id), id];
}

export function remove(id: symbol): void {
  stack = stack.filter((entry) => entry !== id);
}

export function isTop(id: symbol): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}

/** Test seam only. */
export function reset(): void {
  stack = [];
}
