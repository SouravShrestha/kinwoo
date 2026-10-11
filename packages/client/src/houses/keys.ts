// Every per-house key starts with ["houses", houseId], so removing that prefix drops the house's
// detail, members and invite in one call when access is lost.
export const houseKeys = {
  all: ["houses"] as const,
  list: () => ["houses", "list"] as const,
  detail: (houseId: string) => ["houses", houseId] as const,
  members: (houseId: string) => ["houses", houseId, "members"] as const,
  invite: (houseId: string) => ["houses", houseId, "invite"] as const,
  invitedEmails: (houseId: string) => ["houses", houseId, "invited-emails"] as const,
  invitePreview: (code: string) => ["invite-preview", code] as const,
};

export const LIST_SEGMENT = "list";

// The house a failed query belonged to, when the failure means the user can no longer see it.
export function lostAccessHouseId(queryKey: readonly unknown[], error: unknown): string | null {
  const [scope, houseId] = queryKey;
  if (scope !== "houses" || typeof houseId !== "string" || houseId === LIST_SEGMENT) return null;

  const status = (error as { status?: unknown } | null)?.status;
  return status === 404 ? houseId : null;
}
