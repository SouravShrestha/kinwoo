import {
  canAddHouse,
  houseAddressErrorMessage,
  houseErrorMessage,
  houseNameErrorMessage,
  inviteEmailErrorMessage,
  isHouseJoinMode,
  parseInviteInput,
  validateHouseAddress,
  validateHouseName,
  validateInviteEmail,
  type UpdateHouseInput,
} from "@kinwoo/core/houses";

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
import type { HouseResult, HouseServiceErrorCode, IHousesService } from "./IHousesService";

function ok<T>(data: T): HouseResult<T> {
  return { ok: true, data };
}

function failure(code: HouseServiceErrorCode, message?: string): HouseResult<never> {
  return { ok: false, code, message: message ?? houseErrorMessage(code) };
}

function invalidInput(message: string): HouseResult<never> {
  return failure("INVALID_INPUT", message);
}

function fromError(cause: unknown): HouseResult<never> {
  if (cause instanceof HouseRepositoryError && cause.code) return failure(cause.code);
  return failure("UNAVAILABLE", "Something went wrong. Please try again.");
}

export class HousesService implements IHousesService {
  constructor(private readonly repository: IHousesRepository) {}

  async listHouses(userId: string): Promise<HouseResult<HouseMembership[]>> {
    return this.run(() => this.repository.listMemberships(userId));
  }

  async getHouse(userId: string, houseId: string): Promise<HouseResult<HouseMembership>> {
    try {
      const membership = await this.repository.findMembership(userId, houseId);
      return membership ? ok(membership) : failure("NOT_FOUND");
    } catch (cause) {
      return fromError(cause);
    }
  }

  async createHouse(
    userId: string,
    input: { name: string; address?: string | null },
  ): Promise<HouseResult<House>> {
    const name = validateHouseName(input.name);
    if (!name.ok) return invalidInput(houseNameErrorMessage(name.error));

    const address = validateHouseAddress(input.address);
    if (!address.ok) return invalidInput(houseAddressErrorMessage(address.error));

    // The database enforces this too; checking first saves a write and keeps the rule readable here.
    return this.run(async () => {
      const memberships = await this.repository.listMemberships(userId);
      if (!canAddHouse(memberships.length)) {
        throw new HouseRepositoryError("HOUSE_LIMIT_REACHED", "HOUSE_LIMIT_REACHED");
      }

      return this.repository.createHouse({
        name: name.value,
        address: address.value,
      });
    });
  }

  async updateHouse(
    userId: string,
    houseId: string,
    input: UpdateHouseInput,
  ): Promise<HouseResult<House>> {
    const update: HouseUpdate = {};

    if (input.name !== undefined) {
      const name = validateHouseName(input.name);
      if (!name.ok) return invalidInput(houseNameErrorMessage(name.error));
      update.name = name.value;
    }

    if (input.address !== undefined) {
      const address = validateHouseAddress(input.address);
      if (!address.ok) return invalidInput(houseAddressErrorMessage(address.error));
      update.address = address.value;
    }

    if (input.joinMode !== undefined) {
      if (!isHouseJoinMode(input.joinMode)) return invalidInput("Choose who can join.");
      update.join_mode = input.joinMode;
    }

    if (Object.keys(update).length === 0) return invalidInput("Nothing to update.");

    try {
      const updated = await this.repository.updateHouse(houseId, update);
      if (updated) return ok(updated);

      // RLS hides a house from non-admins' updates without raising, so zero rows is either
      // "not yours" or "not a member". Telling them apart avoids a misleading "not found".
      const membership = await this.repository.findMembership(userId, houseId);
      return membership ? failure("FORBIDDEN") : failure("NOT_FOUND");
    } catch (cause) {
      return fromError(cause);
    }
  }

  async listMembers(userId: string, houseId: string): Promise<HouseResult<HouseMember[]>> {
    try {
      const membership = await this.repository.findMembership(userId, houseId);
      if (!membership) return failure("NOT_FOUND");
      return ok(await this.repository.listMembers(houseId));
    } catch (cause) {
      return fromError(cause);
    }
  }

  async setMemberRole(
    houseId: string,
    userId: string,
    role: HouseRole,
  ): Promise<HouseResult<null>> {
    return this.run(async () => {
      await this.repository.setMemberRole(houseId, userId, role);
      return null;
    });
  }

  async removeMember(
    houseId: string,
    userId: string,
    keepDebt: boolean,
  ): Promise<HouseResult<null>> {
    return this.run(async () => {
      await this.repository.removeMember(houseId, userId, keepDebt);
      return null;
    });
  }

  async leaveHouse(houseId: string, acknowledgeDebt: boolean): Promise<HouseResult<null>> {
    return this.run(async () => {
      await this.repository.leaveHouse(houseId, acknowledgeDebt);
      return null;
    });
  }

  async getInvite(userId: string, houseId: string): Promise<HouseResult<HouseInvite>> {
    try {
      const membership = await this.repository.findMembership(userId, houseId);
      if (!membership) return failure("NOT_FOUND");
      if (membership.role !== "admin") return failure("FORBIDDEN");
      const invite = await this.repository.findInvite(houseId);
      return invite ? ok(invite) : failure("NOT_FOUND");
    } catch (cause) {
      return fromError(cause);
    }
  }

  async listInvitedEmails(userId: string, houseId: string): Promise<HouseResult<InvitedEmail[]>> {
    try {
      const membership = await this.repository.findMembership(userId, houseId);
      if (!membership) return failure("NOT_FOUND");
      if (membership.role !== "admin") return failure("FORBIDDEN");
      return ok(await this.repository.listInvitedEmails(houseId));
    } catch (cause) {
      return fromError(cause);
    }
  }

  async addInvitedEmail(houseId: string, email: string): Promise<HouseResult<InvitedEmail>> {
    const parsed = validateInviteEmail(email);
    if (!parsed.ok) return invalidInput(inviteEmailErrorMessage(parsed.error));
    return this.run(() => this.repository.addInvitedEmail(houseId, parsed.value));
  }

  async removeInvitedEmail(invitedEmailId: string): Promise<HouseResult<null>> {
    return this.run(async () => {
      await this.repository.removeInvitedEmail(invitedEmailId);
      return null;
    });
  }

  // A malformed code is answered locally: it can never match, and sending it would spend one of
  // the user's rate-limited guesses.
  async previewInvite(code: string): Promise<HouseResult<InvitePreview>> {
    const parsed = parseInviteInput(code);
    if (!parsed.ok) return ok({ status: "invalid" });
    return this.run(() => this.repository.previewInvite(parsed.code));
  }

  async joinHouse(code: string): Promise<HouseResult<JoinResult>> {
    const parsed = parseInviteInput(code);
    if (!parsed.ok) return ok({ status: "invalid" });
    return this.run(() => this.repository.joinHouse(parsed.code));
  }

  private async run<T>(action: () => Promise<T>): Promise<HouseResult<T>> {
    try {
      return ok(await action());
    } catch (cause) {
      return fromError(cause);
    }
  }
}
