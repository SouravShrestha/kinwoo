import { HousesRepository } from "@/api/houses/HousesRepository";
import { HousesService } from "@/api/houses/HousesService";
import type { HouseServiceErrorCode } from "@/api/houses/IHousesService";

import { createRouteHandler } from "./route";

export { badRequest, readJsonObject } from "./route";

const STATUS_BY_CODE: Record<HouseServiceErrorCode, number> = {
  INVALID_INPUT: 400,
  INVALID_NAME: 400,
  INVALID_EMAIL: 400,
  NOT_AUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_A_MEMBER: 404,
  LAST_ADMIN: 409,
  USE_LEAVE_HOUSE: 409,
  OUTSTANDING_BALANCE: 409,
  HOUSE_LIMIT_REACHED: 409,
  HOUSE_FULL: 409,
  NO_PENDING_REQUEST: 409,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
};

export const handleHouseRequest = createRouteHandler(
  (client) => new HousesService(new HousesRepository(client)),
  STATUS_BY_CODE,
);
