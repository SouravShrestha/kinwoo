import type { ProfileServiceErrorCode } from "@/api/profile/IProfileService";
import { ProfileRepository } from "@/api/profile/ProfileRepository";
import { ProfileService } from "@/api/profile/ProfileService";

import { createRouteHandler } from "./route";

export { badRequest, readJsonObject } from "./route";

const STATUS_BY_CODE: Record<ProfileServiceErrorCode, number> = {
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  UNAVAILABLE: 503,
};

export const handleProfileRequest = createRouteHandler(
  (client) => new ProfileService(new ProfileRepository(client)),
  STATUS_BY_CODE,
);
