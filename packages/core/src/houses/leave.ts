import { adminCount } from "./members";
import type { HouseMember, HouseRole } from "./types";

// "sole": leaving deletes the house. "needs_admin": the last admin must promote someone first.
export type LeaveState = "ok" | "sole" | "needs_admin";

export const DANGER_ZONE_TITLE = "Danger zone";

export function leaveState(members: HouseMember[], userId: string): LeaveState {
  if (members.length <= 1) return "sole";
  const self = members.find((member) => member.userId === userId);
  if (self?.role === "admin" && adminCount(members) === 1) return "needs_admin";
  return "ok";
}

export function leaveActionLabel(state: LeaveState): string {
  return state === "sole" ? "Delete house" : "Leave house";
}

export function leaveNote(state: LeaveState): string | null {
  if (state === "sole") return "You're the only person here. Leaving will delete this house.";
  if (state === "needs_admin") return "Make another member an admin before leaving.";
  return null;
}

export function roleActionLabel(currentRole: HouseRole): string {
  return currentRole === "admin" ? "Remove as admin" : "Make admin";
}
