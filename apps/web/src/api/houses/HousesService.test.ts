import { describe, expect, it, vi } from "vitest";

import { HousesService } from "./HousesService";
import {
  HouseRepositoryError,
  type House,
  type HouseInvite,
  type HouseMembership,
  type IHousesRepository,
  type InvitedEmail,
} from "./IHousesRepository";

const house: House = {
  id: "h1",
  name: "Flat",
  address: null,
  joinMode: "anyone",
  simplifyDebts: false,
};
const invite: HouseInvite = { id: "i1", code: "ABC234", uses: 0 };
const invitedEmail: InvitedEmail = {
  id: "e1",
  email: "asha@example.com",
  createdAt: "2026-10-09T00:00:00.000Z",
};

function fakeRepository(overrides: Partial<IHousesRepository> = {}): IHousesRepository {
  return {
    listMemberships: vi.fn().mockResolvedValue([]),
    findMembership: vi.fn().mockResolvedValue(null),
    createHouse: vi.fn().mockResolvedValue(house),
    updateHouse: vi.fn().mockResolvedValue(house),
    listMembers: vi.fn().mockResolvedValue([]),
    setMemberRole: vi.fn().mockResolvedValue(undefined),
    removeMember: vi.fn().mockResolvedValue(undefined),
    leaveHouse: vi.fn().mockResolvedValue(undefined),
    findInvite: vi.fn().mockResolvedValue(invite),
    listInvitedEmails: vi.fn().mockResolvedValue([invitedEmail]),
    addInvitedEmail: vi.fn().mockResolvedValue(invitedEmail),
    removeInvitedEmail: vi.fn().mockResolvedValue(undefined),
    previewInvite: vi.fn().mockResolvedValue({ status: "expired" }),
    joinHouse: vi.fn().mockResolvedValue({ status: "joined", houseId: "h1" }),
    ...overrides,
  };
}

const adminOf = (id: string): HouseMembership => ({ role: "admin", house: { ...house, id } });
const memberOf = (id: string): HouseMembership => ({ role: "member", house: { ...house, id } });

describe("createHouse", () => {
  it("normalises input before it reaches the repository", async () => {
    const repository = fakeRepository();

    const result = await new HousesService(repository).createHouse("u1", {
      name: "  Sourav   G4 ",
      address: " 12 Street ",
    });

    expect(result).toEqual({ ok: true, data: house });
    expect(repository.createHouse).toHaveBeenCalledWith({
      name: "Sourav G4",
      address: "12 Street",
    });
  });

  it("rejects an invalid name without calling the repository", async () => {
    const repository = fakeRepository();

    const result = await new HousesService(repository).createHouse("u1", { name: "   " });

    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(repository.createHouse).not.toHaveBeenCalled();
  });

  it("maps a database error code to friendly copy", async () => {
    const repository = fakeRepository({
      createHouse: vi.fn().mockRejectedValue(new HouseRepositoryError("x", "HOUSE_LIMIT_REACHED")),
    });

    const result = await new HousesService(repository).createHouse("u1", { name: "Flat" });

    expect(result).toEqual({
      ok: false,
      code: "HOUSE_LIMIT_REACHED",
      message: "You can only be in one house for now. Leave your current house first.",
    });
  });

  it("reports an unrecognised failure as unavailable", async () => {
    const repository = fakeRepository({
      createHouse: vi.fn().mockRejectedValue(new Error("connection reset")),
    });

    const result = await new HousesService(repository).createHouse("u1", { name: "Flat" });

    expect(result).toMatchObject({ ok: false, code: "UNAVAILABLE" });
  });
});

describe("createHouse house limit", () => {
  it("refuses a second house without writing", async () => {
    const repository = fakeRepository({
      listMemberships: vi.fn().mockResolvedValue([memberOf("h1")]),
    });

    const result = await new HousesService(repository).createHouse("u1", { name: "Another" });

    expect(result).toMatchObject({ ok: false, code: "HOUSE_LIMIT_REACHED" });
    expect(repository.createHouse).not.toHaveBeenCalled();
  });
});

describe("getHouse", () => {
  it("returns NOT_FOUND when the caller is not an active member", async () => {
    const result = await new HousesService(fakeRepository()).getHouse("u1", "h1");
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });
});

describe("updateHouse", () => {
  it("rejects an empty patch", async () => {
    const result = await new HousesService(fakeRepository()).updateHouse("u1", "h1", {});
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });

  it("clears an optional field when given a blank value", async () => {
    const repository = fakeRepository();

    await new HousesService(repository).updateHouse("u1", "h1", { address: "" });

    expect(repository.updateHouse).toHaveBeenCalledWith("h1", { address: null });
  });

  it("tells a non-admin member apart from a stranger when no row changes", async () => {
    const asMember = fakeRepository({
      updateHouse: vi.fn().mockResolvedValue(null),
      findMembership: vi.fn().mockResolvedValue(memberOf("h1")),
    });
    const asStranger = fakeRepository({ updateHouse: vi.fn().mockResolvedValue(null) });

    expect(await new HousesService(asMember).updateHouse("u1", "h1", { name: "X" })).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
    expect(
      await new HousesService(asStranger).updateHouse("u1", "h1", { name: "X" }),
    ).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });
});

describe("updateHouse join mode", () => {
  it("writes the join_mode column", async () => {
    const repository = fakeRepository();

    await new HousesService(repository).updateHouse("u1", "h1", { joinMode: "invited" });

    expect(repository.updateHouse).toHaveBeenCalledWith("h1", { join_mode: "invited" });
  });

  it("rejects an unknown mode", async () => {
    const repository = fakeRepository();

    const result = await new HousesService(repository).updateHouse("u1", "h1", {
      joinMode: "everyone" as never,
    });

    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(repository.updateHouse).not.toHaveBeenCalled();
  });
});

describe("invited emails", () => {
  it("restricts the list to admins", async () => {
    const asMember = new HousesService(
      fakeRepository({ findMembership: vi.fn().mockResolvedValue(memberOf("h1")) }),
    );
    const asAdmin = new HousesService(
      fakeRepository({ findMembership: vi.fn().mockResolvedValue(adminOf("h1")) }),
    );

    expect(await asMember.listInvitedEmails("u1", "h1")).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
    expect(await asAdmin.listInvitedEmails("u1", "h1")).toEqual({
      ok: true,
      data: [invitedEmail],
    });
  });

  it("normalises the address before adding it", async () => {
    const repository = fakeRepository();

    await new HousesService(repository).addInvitedEmail("h1", "  Asha@Example.com ");

    expect(repository.addInvitedEmail).toHaveBeenCalledWith("h1", "asha@example.com");
  });

  it("rejects a malformed address without calling the repository", async () => {
    const repository = fakeRepository();

    const result = await new HousesService(repository).addInvitedEmail("h1", "asha");

    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(repository.addInvitedEmail).not.toHaveBeenCalled();
  });
});

describe("listMembers and getInvite", () => {
  it("hide a house from someone who is not in it", async () => {
    const service = new HousesService(fakeRepository());

    expect(await service.listMembers("u1", "h1")).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(await service.getInvite("u1", "h1")).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("restrict the invite code to admins", async () => {
    const asMember = new HousesService(
      fakeRepository({ findMembership: vi.fn().mockResolvedValue(memberOf("h1")) }),
    );
    const asAdmin = new HousesService(
      fakeRepository({ findMembership: vi.fn().mockResolvedValue(adminOf("h1")) }),
    );

    expect(await asMember.getInvite("u1", "h1")).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(await asAdmin.getInvite("u1", "h1")).toEqual({ ok: true, data: invite });
  });
});

describe("previewInvite and joinHouse", () => {
  it("normalise the code before calling the repository", async () => {
    const repository = fakeRepository();
    const service = new HousesService(repository);

    await service.previewInvite("abc 234");
    await service.joinHouse("https://kinwoo.cbsdev.me/join/abc234");

    expect(repository.previewInvite).toHaveBeenCalledWith("ABC234");
    expect(repository.joinHouse).toHaveBeenCalledWith("ABC234");
  });

  it("answers a malformed code locally so no guess is spent", async () => {
    const repository = fakeRepository();
    const service = new HousesService(repository);

    expect(await service.previewInvite("nope")).toEqual({ ok: true, data: { status: "invalid" } });
    expect(await service.joinHouse("")).toEqual({ ok: true, data: { status: "invalid" } });
    expect(repository.previewInvite).not.toHaveBeenCalled();
    expect(repository.joinHouse).not.toHaveBeenCalled();
  });

  it("surfaces rate limiting", async () => {
    const repository = fakeRepository({
      joinHouse: vi
        .fn()
        .mockRejectedValue(new HouseRepositoryError("RATE_LIMITED", "RATE_LIMITED")),
    });

    const result = await new HousesService(repository).joinHouse("ABC234");

    expect(result).toMatchObject({ ok: false, code: "RATE_LIMITED" });
  });
});

describe("member actions", () => {
  it("pass LAST_ADMIN through", async () => {
    const repository = fakeRepository({
      setMemberRole: vi
        .fn()
        .mockRejectedValue(new HouseRepositoryError("LAST_ADMIN", "LAST_ADMIN")),
    });

    const result = await new HousesService(repository).setMemberRole("h1", "u1", "member");

    expect(result).toEqual({
      ok: false,
      code: "LAST_ADMIN",
      message: "Promote another member to admin first.",
    });
  });

  it("forward the keep-debt and acknowledge flags", async () => {
    const repository = fakeRepository();
    const service = new HousesService(repository);

    await service.removeMember("h1", "u2", true);
    await service.leaveHouse("h1", true);

    expect(repository.removeMember).toHaveBeenCalledWith("h1", "u2", true);
    expect(repository.leaveHouse).toHaveBeenCalledWith("h1", true);
  });
});
