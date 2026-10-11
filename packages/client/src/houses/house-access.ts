import { TOAST_MESSAGES } from "@kinwoo/core/toast";

import { useAuth } from "../auth/use-auth";
import { toast } from "../toast";
import { useActiveHouse } from "./active-house-provider";

export interface HouseAccessInput {
  authReady: boolean;
  isLoggedIn: boolean;
  houseListReady: boolean;
  loadFailed: boolean;
  hasHouse: boolean;
}

// Only true once the list has loaded: while it is in flight, or after a failed fetch, a real
// member must not be bounced.
export function lacksHouse(input: HouseAccessInput): boolean {
  return (
    input.authReady &&
    input.isLoggedIn &&
    input.houseListReady &&
    !input.loadFailed &&
    !input.hasHouse
  );
}

export function useHouseAccess(): { hasNoHouse: boolean } {
  const { ready: authReady, isLoggedIn } = useAuth();
  const { activeHouse, ready, loadFailed } = useActiveHouse();

  return {
    hasNoHouse: lacksHouse({
      authReady,
      isLoggedIn,
      houseListReady: ready,
      loadFailed,
      hasHouse: activeHouse !== null,
    }),
  };
}

export function rejectHouseRequired(pathname: string, goHome: () => void): void {
  toast.info(TOAST_MESSAGES.houseRequired);
  if (pathname !== "/") goHome();
}
