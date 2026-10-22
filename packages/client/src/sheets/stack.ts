// Module state on purpose: every sheet in one app must share a single stack, so only the top
// sheet answers Escape, Android back and focus trapping.
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

export function reset(): void {
  stack = [];
}
