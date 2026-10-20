import type { HouseErrorCode, UpdateHouseInput } from "@kinwoo/core/houses";

import type {
  House,
  HouseInvite,
  HouseMember,
  HouseMembership,
  HouseRole,
  InvitedEmail,
  InvitePreview,
  JoinResult,
} from "./IHousesRepository";

export type HouseServiceErrorCode = HouseErrorCode | "INVALID_INPUT" | "UNAVAILABLE";

export type HouseResult<T> =
  { ok: true; data: T } | { ok: false; code: HouseServiceErrorCode; message: string };

export interface IHousesService {
  listHouses(userId: string): Promise<HouseResult<HouseMembership[]>>;
  getHouse(userId: string, houseId: string): Promise<HouseResult<HouseMembership>>;
  createHouse(
    userId: string,
    input: { name: string; address?: string | null },
  ): Promise<HouseResult<House>>;
  updateHouse(
    userId: string,
    houseId: string,
    input: UpdateHouseInput,
  ): Promise<HouseResult<House>>;

  listMembers(userId: string, houseId: string): Promise<HouseResult<HouseMember[]>>;
  setMemberRole(houseId: string, userId: string, role: HouseRole): Promise<HouseResult<null>>;
  removeMember(houseId: string, userId: string, keepDebt: boolean): Promise<HouseResult<null>>;
  leaveHouse(houseId: string, acknowledgeDebt: boolean): Promise<HouseResult<null>>;

  getInvite(userId: string, houseId: string): Promise<HouseResult<HouseInvite>>;
  rotateInvite(houseId: string): Promise<HouseResult<HouseInvite>>;

  listInvitedEmails(userId: string, houseId: string): Promise<HouseResult<InvitedEmail[]>>;
  addInvitedEmail(houseId: string, email: string): Promise<HouseResult<InvitedEmail>>;
  removeInvitedEmail(invitedEmailId: string): Promise<HouseResult<null>>;

  previewInvite(code: string): Promise<HouseResult<InvitePreview>>;
  joinHouse(code: string): Promise<HouseResult<JoinResult>>;
}
