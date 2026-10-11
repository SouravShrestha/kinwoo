import { UNNAMED_MEMBER_NAME } from "./constants";
import type { HouseMember, HouseRole } from "./types";

// display_name is NULL until a user finishes first login.
export function memberDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : UNNAMED_MEMBER_NAME;
}

export function memberInitial(name: string | null | undefined): string {
  return Array.from(memberDisplayName(name))[0]?.toUpperCase() ?? "?";
}

export function timeOfDayGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good Morning!";
  if (hour < 17) return "Good Afternoon!";
  return "Good Evening!";
}

export function homeGreeting(
  name: string | null | undefined,
  now: Date = new Date(),
): { salutation: string; message: string } {
  const firstName = name?.trim().split(/\s+/)[0];
  return {
    salutation: firstName ? `Hi ${firstName}` : "Hi",
    message: timeOfDayGreeting(now),
  };
}

export function memberCountLabel(count: number): string {
  return count === 1 ? "1 member" : `${count} members`;
}

export function roleLabel(role: HouseRole): string {
  return role === "admin" ? "Admin" : "Member";
}

export function sortMembers(members: HouseMember[]): HouseMember[] {
  return [...members].sort((a, b) => {
    if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
    return memberDisplayName(a.displayName).localeCompare(memberDisplayName(b.displayName));
  });
}

export function adminCount(members: HouseMember[]): number {
  return members.filter((member) => member.role === "admin").length;
}
