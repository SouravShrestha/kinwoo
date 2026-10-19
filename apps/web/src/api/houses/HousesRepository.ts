import type { Database } from "@kinwoo/core/db";
import {
  isHouseJoinMode,
  parseInvitePreview,
  parseJoinResult,
  parseRpcError,
} from "@kinwoo/core/houses";
import type { SupabaseClient } from "@supabase/supabase-js";

import { toPublicAvatarUrl } from "../avatars/avatarUrls";
import {
  HouseRepositoryError,
  type House,
  type HouseInvite,
  type HouseMember,
  type HouseMembership,
  type HouseRole,
  type HouseUpdate,
  type IHousesRepository,
  type InvitedEmail,
  type InvitePreview,
  type JoinResult,
} from "./IHousesRepository";

const HOUSE_COLUMNS = "id, name, address, join_mode";
const INVITE_COLUMNS = "id, code, uses";
const INVITED_EMAIL_COLUMNS = "id, email, created_at";

type HouseRow = Pick<
  Database["public"]["Tables"]["houses"]["Row"],
  "id" | "name" | "address" | "join_mode"
>;
type InviteRow = Database["public"]["Tables"]["house_invites"]["Row"];
type InvitedEmailRow = Database["public"]["Tables"]["house_invited_emails"]["Row"];

function toHouse(row: HouseRow): House {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    joinMode: isHouseJoinMode(row.join_mode) ? row.join_mode : "anyone",
  };
}

function toInvite(row: Pick<InviteRow, "id" | "code" | "uses">): HouseInvite {
  return { id: row.id, code: row.code, uses: row.uses };
}

function toInvitedEmail(row: Pick<InvitedEmailRow, "id" | "email" | "created_at">): InvitedEmail {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

function fail(error: { message: string }): never {
  throw new HouseRepositoryError(error.message, parseRpcError(error.message));
}

// Takes the session-scoped client, not service-role, so RLS and the RPCs enforce every rule
// rather than a WHERE clause we could forget.
export class HousesRepository implements IHousesRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listMemberships(userId: string): Promise<HouseMembership[]> {
    const { data, error } = await this.client
      .from("house_members")
      .select(`role, houses!inner(${HOUSE_COLUMNS})`)
      .eq("user_id", userId)
      .eq("status", "active")
      .order("joined_at", { ascending: true });

    if (error) fail(error);

    return (data ?? []).map((row) => ({
      role: row.role,
      house: toHouse(row.houses as unknown as HouseRow),
    }));
  }

  async findMembership(userId: string, houseId: string): Promise<HouseMembership | null> {
    const { data, error } = await this.client
      .from("house_members")
      .select(`role, houses!inner(${HOUSE_COLUMNS})`)
      .eq("user_id", userId)
      .eq("house_id", houseId)
      .eq("status", "active")
      .maybeSingle();

    if (error) fail(error);
    if (!data) return null;

    return { role: data.role, house: toHouse(data.houses as unknown as HouseRow) };
  }

  async createHouse(input: { name: string; address: string | null }): Promise<House> {
    const { data, error } = await this.client.rpc("create_house", {
      p_name: input.name,
      p_address: input.address ?? undefined,
    });

    if (error) fail(error);
    return toHouse(data as HouseRow);
  }

  async updateHouse(houseId: string, update: HouseUpdate): Promise<House | null> {
    const { data, error } = await this.client
      .from("houses")
      .update(update)
      .eq("id", houseId)
      .select(HOUSE_COLUMNS)
      .maybeSingle();

    if (error) fail(error);
    return data ? toHouse(data as HouseRow) : null;
  }

  async listMembers(houseId: string): Promise<HouseMember[]> {
    const [members, emails] = await Promise.all([
      this.client
        .from("house_members")
        .select(
          "user_id, role, joined_at, profiles!house_members_user_id_fkey(display_name, avatar_url)",
        )
        .eq("house_id", houseId)
        .eq("status", "active")
        .order("joined_at", { ascending: true }),
      this.client.rpc("list_member_emails", { p_house_id: houseId }),
    ]);

    const { data, error } = members;
    if (error) fail(error);
    if (emails.error) fail(emails.error);

    const emailByUser = new Map(emails.data.map((row) => [row.user_id, row.email]));

    return (data ?? []).map((row) => {
      const profile = row.profiles as unknown as {
        display_name: string | null;
        avatar_url: string | null;
      } | null;

      return {
        userId: row.user_id,
        displayName: profile?.display_name ?? null,
        avatarUrl: toPublicAvatarUrl(this.client, profile?.avatar_url),
        email: emailByUser.get(row.user_id) ?? null,
        role: row.role,
        joinedAt: row.joined_at,
      };
    });
  }

  async setMemberRole(houseId: string, userId: string, role: HouseRole): Promise<void> {
    const { error } = await this.client.rpc("set_member_role", {
      p_house_id: houseId,
      p_user_id: userId,
      p_role: role,
    });
    if (error) fail(error);
  }

  async removeMember(houseId: string, userId: string, keepDebt: boolean): Promise<void> {
    const { error } = await this.client.rpc("remove_member", {
      p_house_id: houseId,
      p_user_id: userId,
      p_keep_debt: keepDebt,
    });
    if (error) fail(error);
  }

  async leaveHouse(houseId: string, acknowledgeDebt: boolean): Promise<void> {
    const { error } = await this.client.rpc("leave_house", {
      p_house_id: houseId,
      p_acknowledge_debt: acknowledgeDebt,
    });
    if (error) fail(error);
  }

  async findInvite(houseId: string): Promise<HouseInvite | null> {
    const { data, error } = await this.client
      .from("house_invites")
      .select(INVITE_COLUMNS)
      .eq("house_id", houseId)
      .maybeSingle();

    if (error) fail(error);
    return data ? toInvite(data) : null;
  }

  async listInvitedEmails(houseId: string): Promise<InvitedEmail[]> {
    const { data, error } = await this.client
      .from("house_invited_emails")
      .select(INVITED_EMAIL_COLUMNS)
      .eq("house_id", houseId)
      .order("created_at", { ascending: true });

    if (error) fail(error);
    return (data ?? []).map(toInvitedEmail);
  }

  async addInvitedEmail(houseId: string, email: string): Promise<InvitedEmail> {
    const { data, error } = await this.client.rpc("add_invited_email", {
      p_house_id: houseId,
      p_email: email,
    });

    if (error) fail(error);
    return toInvitedEmail(data as InvitedEmailRow);
  }

  async removeInvitedEmail(invitedEmailId: string): Promise<void> {
    const { error } = await this.client.rpc("remove_invited_email", { p_id: invitedEmailId });
    if (error) fail(error);
  }

  async previewInvite(code: string): Promise<InvitePreview> {
    const { data, error } = await this.client.rpc("get_invite_preview", { p_code: code });
    if (error) fail(error);

    const preview = parseInvitePreview(data);
    if (!("houseId" in preview)) return preview;

    return {
      ...preview,
      invitedByAvatarUrl: toPublicAvatarUrl(this.client, preview.invitedByAvatarUrl),
      members: preview.members.map((member) => ({
        ...member,
        avatarUrl: toPublicAvatarUrl(this.client, member.avatarUrl),
      })),
    };
  }

  async joinHouse(code: string): Promise<JoinResult> {
    const { data, error } = await this.client.rpc("join_house", { p_code: code });
    if (error) fail(error);
    return parseJoinResult(data);
  }
}
