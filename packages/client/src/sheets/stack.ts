// Module state on purpose: every sheet in one app must share a single stack, so only the top
// sheet answers Escape, Android back and focus trapping.
let stack: symbol[] = [];
const closers = new Map<symbol, () => void>();

export function push(id: symbol, close?: () => void): void {
  stack = [...stack.filter((entry) => entry !== id), id];
  if (close) closers.set(id, close);
  else closers.delete(id);
}

export function remove(id: symbol): void {
  stack = stack.filter((entry) => entry !== id);
  closers.delete(id);
}

export function isTop(id: symbol): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}

/** Closes every open sheet that registered a close callback, topmost first. */
export function closeAll(): void {
  for (const id of [...stack].reverse()) closers.get(id)?.();
}

export function reset(): void {
  stack = [];
  closers.clear();
}
