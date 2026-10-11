import { useState } from "react";

export type HouseSheetView =
  | { name: "menu" }
  | { name: "members" }
  | { name: "member"; userId: string }
  | { name: "settings" };

export function useHouseSheetNav(initial: HouseSheetView = { name: "menu" }) {
  const [stack, setStack] = useState<HouseSheetView[]>([initial]);

  return {
    view: stack[stack.length - 1],
    canGoBack: stack.length > 1,
    push: (view: HouseSheetView) => setStack((current) => [...current, view]),
    back: () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current)),
  };
}
