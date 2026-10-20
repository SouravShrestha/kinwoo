import type {
  CreateHouseInput,
  House,
  HouseInvite,
  HouseMember,
  HouseMembership,
  HouseRole,
  InvitedEmail,
  InvitePreview,
  JoinResult,
  UpdateHouseInput,
} from "@kinwoo/core/houses";

import { apiRequest } from "../api/request";

const segment = encodeURIComponent;

export async function fetchHouses(): Promise<HouseMembership[]> {
  const body = await apiRequest<{ houses: HouseMembership[] }>("/api/houses");
  return body.houses;
}

export async function createHouse(input: CreateHouseInput): Promise<House> {
  const body = await apiRequest<{ house: House }>("/api/houses", { method: "POST", body: input });
  return body.house;
}

export async function updateHouse(houseId: string, input: UpdateHouseInput): Promise<House> {
  const body = await apiRequest<{ house: House }>(`/api/houses/${segment(houseId)}`, {
    method: "PATCH",
    body: input,
  });
  return body.house;
}

export async function fetchMembers(houseId: string): Promise<HouseMember[]> {
  const body = await apiRequest<{ members: HouseMember[] }>(
    `/api/houses/${segment(houseId)}/members`,
  );
  return body.members;
}

export async function setMemberRole(
  houseId: string,
  userId: string,
  role: HouseRole,
): Promise<void> {
  await apiRequest(`/api/houses/${segment(houseId)}/members/${segment(userId)}`, {
    method: "PATCH",
    body: { role },
  });
}

export async function removeMember(
  houseId: string,
  userId: string,
  keepDebt: boolean,
): Promise<void> {
  const query = keepDebt ? "?keepDebt=true" : "";
  await apiRequest(`/api/houses/${segment(houseId)}/members/${segment(userId)}${query}`, {
    method: "DELETE",
  });
}

export async function leaveHouse(houseId: string, acknowledgeDebt: boolean): Promise<void> {
  await apiRequest(`/api/houses/${segment(houseId)}/leave`, {
    method: "POST",
    body: { acknowledgeDebt },
  });
}

export async function fetchInvite(houseId: string): Promise<HouseInvite> {
  const body = await apiRequest<{ invite: HouseInvite }>(`/api/houses/${segment(houseId)}/invite`);
  return body.invite;
}

export async function rotateInvite(houseId: string): Promise<HouseInvite> {
  const body = await apiRequest<{ invite: HouseInvite }>(`/api/houses/${segment(houseId)}/invite`, {
    method: "POST",
  });
  return body.invite;
}

export async function fetchInvitedEmails(houseId: string): Promise<InvitedEmail[]> {
  const body = await apiRequest<{ invitedEmails: InvitedEmail[] }>(
    `/api/houses/${segment(houseId)}/invited-emails`,
  );
  return body.invitedEmails;
}

export async function addInvitedEmail(houseId: string, email: string): Promise<InvitedEmail> {
  const body = await apiRequest<{ invitedEmail: InvitedEmail }>(
    `/api/houses/${segment(houseId)}/invited-emails`,
    { method: "POST", body: { email } },
  );
  return body.invitedEmail;
}

export async function removeInvitedEmail(houseId: string, invitedEmailId: string): Promise<void> {
  await apiRequest(`/api/houses/${segment(houseId)}/invited-emails/${segment(invitedEmailId)}`, {
    method: "DELETE",
  });
}

export async function fetchInvitePreview(code: string): Promise<InvitePreview> {
  const body = await apiRequest<{ preview: InvitePreview }>(`/api/invites/${segment(code)}`);
  return body.preview;
}

export async function joinHouse(code: string): Promise<JoinResult> {
  const body = await apiRequest<{ result: JoinResult }>(`/api/invites/${segment(code)}/join`, {
    method: "POST",
  });
  return body.result;
}
