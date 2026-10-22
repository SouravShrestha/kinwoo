import { useCallback, useRef } from "react";

export const DOUBLE_PRESS_WINDOW_MS = 500;

export function usePressGuard<Args extends unknown[]>(
  handler: ((...args: Args) => void) | null | undefined,
  allowDoublePress = false,
): ((...args: Args) => void) | undefined {
  const lastPressAt = useRef(0);

  const guarded = useCallback(
    (...args: Args) => {
      const now = Date.now();
      if (!allowDoublePress && now - lastPressAt.current < DOUBLE_PRESS_WINDOW_MS) return;
      lastPressAt.current = now;
      handler?.(...args);
    },
    [handler, allowDoublePress],
  );

  return handler ? guarded : undefined;
}
