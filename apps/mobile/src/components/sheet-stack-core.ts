// Keep free of react-native imports so it can be unit tested.
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
