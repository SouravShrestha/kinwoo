export type HouseRole = "admin" | "member";

export type HouseJoinMode = "anyone" | "invited";

export type House = {
  id: string;
  name: string;
  address: string | null;
  joinMode: HouseJoinMode;
  simplifyDebts: boolean;
};

export type HouseMembership = {
  house: House;
  role: HouseRole;
};

export type HouseMember = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  role: HouseRole;
  joinedAt: string | null;
};

export type HouseInvite = {
  id: string;
  code: string;
  uses: number;
};

export type InvitedEmail = {
  id: string;
  email: string;
  createdAt: string;
};

export type InviteFailureStatus = "invalid" | "not_invited" | "full" | "house_limit";

export type InvitePreviewMember = {
  name: string | null;
  avatarUrl: string | null;
};

export type InvitePreview =
  | {
      status: "valid" | "already_member";
      houseId: string;
      name: string;
      address: string | null;
      memberCount: number;
      members: InvitePreviewMember[];
      invitedBy: string | null;
      invitedByAvatarUrl: string | null;
      requiresApproval: boolean;
    }
  | { status: InviteFailureStatus };

export type JoinResult =
  | { status: "joined" | "pending" | "already_member"; houseId: string }
  | { status: InviteFailureStatus };

export type CreateHouseInput = {
  name: string;
  address?: string | null;
};

export type UpdateHouseInput = {
  name?: string;
  address?: string | null;
  joinMode?: HouseJoinMode;
};
