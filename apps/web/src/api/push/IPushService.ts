import type { ServiceResult } from "../_shared/result";

export type PushServiceErrorCode = "INVALID_INPUT" | "UNAVAILABLE";

export type PushResult = ServiceResult<null, PushServiceErrorCode>;

export interface IPushService {
  registerToken(token: unknown): Promise<PushResult>;
  unregisterToken(token: unknown): Promise<PushResult>;
}
