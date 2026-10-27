import { isPushToken } from "@kinwoo/core/push";

import { serviceResults } from "../_shared/result";
import type { IPushRepository } from "./IPushRepository";
import type { IPushService, PushResult, PushServiceErrorCode } from "./IPushService";

const MESSAGES: Record<PushServiceErrorCode, string> = {
  INVALID_INPUT: "That is not a valid push token.",
  UNAVAILABLE: "Could not update notifications",
};

const { invalidInput, run } = serviceResults<PushServiceErrorCode>({
  messageFor: (code) => MESSAGES[code],
  codeOf: () => null,
  invalidInputCode: "INVALID_INPUT",
  unavailableCode: "UNAVAILABLE",
});

export class PushService implements IPushService {
  constructor(private readonly repository: IPushRepository) {}

  async registerToken(token: unknown): Promise<PushResult> {
    if (!isPushToken(token)) return invalidInput(MESSAGES.INVALID_INPUT);
    return run(async () => {
      await this.repository.register(token);
      return null;
    });
  }

  async unregisterToken(token: unknown): Promise<PushResult> {
    if (!isPushToken(token)) return invalidInput(MESSAGES.INVALID_INPUT);
    return run(async () => {
      await this.repository.unregister(token);
      return null;
    });
  }
}
