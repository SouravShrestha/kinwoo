import type {
  House,
  HouseErrorCode,
  HouseInvite,
  HouseJoinMode,
  HouseMember,
  HouseMembership,
  HouseRole,
  InvitedEmail,
  InvitePreview,
  JoinResult,
} from "@kinwoo/core/houses";

export type {
  House,
  HouseInvite,
  HouseJoinMode,
  HouseMember,
  HouseMembership,
  HouseRole,
  InvitedEmail,
  InvitePreview,
  JoinResult,
};

export class HouseRepositoryError extends Error {
  constructor(
    message: string,
    readonly code: HouseErrorCode | null,
  ) {
    super(message);
    this.name = "HouseRepositoryError";
  }
}

// Keys are column names: the object is passed straight to the table update.
export type HouseUpdate = {
  name?: string;
  address?: string | null;
  join_mode?: HouseJoinMode;
};

export interface IHousesRepository {
  listMemberships(userId: string): Promise<HouseMembership[]>;
  findMembership(userId: string, houseId: string): Promise<HouseMembership | null>;
  createHouse(input: { name: string; address: string | null }): Promise<House>;
  updateHouse(houseId: string, update: HouseUpdate): Promise<House | null>;

  listMembers(houseId: string): Promise<HouseMember[]>;
  setMemberRole(houseId: string, userId: string, role: HouseRole): Promise<void>;
  removeMember(houseId: string, userId: string, keepDebt: boolean): Promise<void>;
  leaveHouse(houseId: string, acknowledgeDebt: boolean): Promise<void>;

  findInvite(houseId: string): Promise<HouseInvite | null>;
  rotateInviteCode(houseId: string): Promise<void>;

  listInvitedEmails(houseId: string): Promise<InvitedEmail[]>;
  addInvitedEmail(houseId: string, email: string): Promise<InvitedEmail>;
  removeInvitedEmail(invitedEmailId: string): Promise<void>;

  previewInvite(code: string): Promise<InvitePreview>;
  joinHouse(code: string): Promise<JoinResult>;
}
