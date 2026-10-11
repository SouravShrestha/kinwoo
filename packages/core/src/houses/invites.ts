import type {
  HouseJoinMode,
  InviteFailureStatus,
  InvitePreview,
  InvitePreviewMember,
  JoinResult,
} from "./types";

const FAILURE_STATUSES: readonly InviteFailureStatus[] = [
  "invalid",
  "not_invited",
  "full",
  "house_limit",
];

function isFailureStatus(value: unknown): value is InviteFailureStatus {
  return (FAILURE_STATUSES as readonly unknown[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

// Anything unrecognised becomes "invalid" so a server change can never render a blank screen.
export function parseInvitePreview(json: unknown): InvitePreview {
  if (!isRecord(json)) return { status: "invalid" };

  const { status } = json;
  if (isFailureStatus(status)) return { status };
  if (status !== "valid" && status !== "already_member") return { status: "invalid" };
  if (typeof json.house_id !== "string" || typeof json.name !== "string") {
    return { status: "invalid" };
  }

  const members: InvitePreviewMember[] = Array.isArray(json.members)
    ? json.members.filter(isRecord).map((member) => ({
        name: stringOrNull(member.name),
        avatarUrl: stringOrNull(member.avatar_url),
      }))
    : [];

  return {
    status,
    houseId: json.house_id,
    name: json.name,
    address: stringOrNull(json.address),
    memberCount: typeof json.member_count === "number" ? json.member_count : members.length,
    members,
    invitedBy: stringOrNull(json.invited_by),
    invitedByAvatarUrl: stringOrNull(json.invited_by_avatar_url),
    requiresApproval: json.requires_approval === true,
  };
}

export function parseJoinResult(json: unknown): JoinResult {
  if (!isRecord(json)) return { status: "invalid" };

  const { status } = json;
  if (isFailureStatus(status)) return { status };

  if (
    (status === "joined" || status === "pending" || status === "already_member") &&
    typeof json.house_id === "string"
  ) {
    return { status, houseId: json.house_id };
  }

  return { status: "invalid" };
}

export const JOIN_MODE_OPTIONS: readonly {
  value: HouseJoinMode;
  label: string;
  description: string;
}[] = [
  {
    value: "invited",
    label: "Restricted",
    description: "Only invited people can join using this invite",
  },
  {
    value: "anyone",
    label: "Anyone can join",
    description: "Anyone with the invite code can join",
  },
];

export function joinModeOption(mode: HouseJoinMode) {
  return JOIN_MODE_OPTIONS.find((option) => option.value === mode) ?? JOIN_MODE_OPTIONS[0];
}
