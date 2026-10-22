import { createContext, useContext, useEffect, type ReactNode } from "react";

export type SheetFooterContent = { node: ReactNode; maxHeight: number };

export type SheetFooterSlot = {
  get: () => SheetFooterContent | null;
  set: (content: SheetFooterContent | null) => void;
  getHeight: () => number;
  setHeight: (height: number) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createSheetFooterSlot(): SheetFooterSlot {
  let content: SheetFooterContent | null = null;
  let height = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  return {
    get: () => content,
    set: (next) => {
      content = next;
      if (!next) height = 0;
      emit();
    },
    getHeight: () => height,
    setHeight: (next) => {
      if (next === height) return;
      height = next;
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const SheetFooterContext = createContext<SheetFooterSlot | null>(null);

// Renders its children in the sheet's footer, pinned to the bottom edge. Growing content
// (up to `maxHeight`) extends upwards and the sheet grows to make room, so the bottom row
// never moves.
export function SheetFooter({ maxHeight, children }: { maxHeight: number; children: ReactNode }) {
  const slot = useContext(SheetFooterContext);

  useEffect(() => {
    slot?.set({ node: children, maxHeight });
  });

  useEffect(() => () => slot?.set(null), [slot]);

  return null;
}
