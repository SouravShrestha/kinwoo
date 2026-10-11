import type { QueryClient } from "@tanstack/react-query";

import { houseKeys } from "./keys";

export type MemberRow = {
  house_id?: string;
  user_id?: string;
  status?: string;
};

export type HouseRow = {
  id?: string;
  deleted_at?: string | null;
};

export type RealtimeAction =
  | { type: "drop-house"; houseId: string }
  | { type: "refresh-houses" }
  | { type: "refresh-house"; houseId: string }
  | { type: "refresh-members"; houseId: string }
  | { type: "refresh-invited-emails"; houseId: string };

const ENDED_STATUSES = new Set(["removed", "left", "rejected"]);

// A change to the signed-in user's own membership. Removal is the one that must be instant: the
// row stays readable to its owner exactly so this event can reach them.
export function ownMembershipActions(row: MemberRow): RealtimeAction[] {
  if (!row.house_id) return [{ type: "refresh-houses" }];

  if (row.status && ENDED_STATUSES.has(row.status)) {
    return [{ type: "drop-house", houseId: row.house_id }];
  }

  return [{ type: "refresh-houses" }];
}

export function houseMemberActions(row: MemberRow, houseId: string): RealtimeAction[] {
  return [
    { type: "refresh-members", houseId: row.house_id ?? houseId },
    { type: "refresh-invited-emails", houseId: row.house_id ?? houseId },
  ];
}

export function houseRowActions(row: HouseRow, houseId: string): RealtimeAction[] {
  if (row.deleted_at) return [{ type: "drop-house", houseId: row.id ?? houseId }];

  return [{ type: "refresh-houses" }, { type: "refresh-house", houseId: row.id ?? houseId }];
}

export function applyRealtimeActions(
  queryClient: QueryClient,
  actions: RealtimeAction[],
  dropHouse: (houseId: string) => void,
): void {
  for (const action of actions) {
    switch (action.type) {
      case "drop-house":
        dropHouse(action.houseId);
        break;
      case "refresh-houses":
        void queryClient.invalidateQueries({ queryKey: houseKeys.list() });
        break;
      case "refresh-house":
        void queryClient.invalidateQueries({
          queryKey: houseKeys.detail(action.houseId),
          exact: true,
        });
        break;
      case "refresh-members":
        void queryClient.invalidateQueries({ queryKey: houseKeys.members(action.houseId) });
        break;
      case "refresh-invited-emails":
        void queryClient.invalidateQueries({ queryKey: houseKeys.invitedEmails(action.houseId) });
        break;
    }
  }
}
