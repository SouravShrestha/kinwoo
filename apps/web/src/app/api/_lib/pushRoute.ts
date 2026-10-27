import type { PushServiceErrorCode } from "@/api/push/IPushService";
import { PushRepository } from "@/api/push/PushRepository";
import { PushService } from "@/api/push/PushService";

import { createRouteHandler } from "./route";

export { badRequest, readJsonObject } from "./route";

const STATUS_BY_CODE: Record<PushServiceErrorCode, number> = {
  INVALID_INPUT: 400,
  UNAVAILABLE: 503,
};

export const handlePushRequest = createRouteHandler(
  (client) => new PushService(new PushRepository(client)),
  STATUS_BY_CODE,
);
