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

export function leaveConfirmCopy(
  state: LeaveState,
  houseName: string,
): { title: string; message: string; confirmLabel: string } {
  if (state === "sole") {
    return {
      title: "Delete House",
      message: "This will delete the house and is irreversible.",
      confirmLabel: "Delete",
    };
  }
  return {
    title: `Leave ${houseName}?`,
    message: "You'll lose access to this house. You can rejoin with a new invite.",
    confirmLabel: "Leave",
  };
}

export function roleActionLabel(currentRole: HouseRole): string {
  return currentRole === "admin" ? "Remove as admin" : "Make admin";
}

export function roleConfirmCopy(
  name: string,
  role: HouseRole,
): { title: string; message: string; confirmLabel: string } {
  if (role === "admin") {
    return {
      title: `Make ${name} an admin?`,
      message: "They'll be able to manage members, invites and house settings.",
      confirmLabel: "Confirm",
    };
  }
  return {
    title: `Remove ${name} as admin?`,
    message: "They'll stay in the house as a member and lose admin access.",
    confirmLabel: "Confirm",
  };
}

export function removeConfirmCopy(name: string): {
  title: string;
  message: string;
  confirmLabel: string;
} {
  return {
    title: `Remove ${name}?`,
    message: "They'll lose access to this house. They can rejoin with a new invite.",
    confirmLabel: "Remove",
  };
}
