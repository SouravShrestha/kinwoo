import { serviceResults } from "../_shared/result";
import type { INotificationRepository } from "./INotificationRepository";
import type { INotificationService, NotificationServiceErrorCode } from "./INotificationService";

// shortcut: no paging. Older notifications simply fall off the list; move to a cursor like the
// activity feed if people need to reach further back.
export const NOTIFICATION_LIMIT = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MESSAGES: Record<NotificationServiceErrorCode, string> = {
  INVALID_INPUT: "That is not a valid notification.",
  UNAVAILABLE: "Could not update notifications",
};

const { invalidInput, run } = serviceResults<NotificationServiceErrorCode>({
  messageFor: (code) => MESSAGES[code],
  codeOf: () => null,
  invalidInputCode: "INVALID_INPUT",
  unavailableCode: "UNAVAILABLE",
});

export class NotificationService implements INotificationService {
  constructor(private readonly repository: INotificationRepository) {}

  list() {
    return run(() => this.repository.list(NOTIFICATION_LIMIT));
  }

  async markRead(id: unknown) {
    if (typeof id !== "string" || !UUID.test(id)) return invalidInput(MESSAGES.INVALID_INPUT);
    return run(async () => {
      await this.repository.markRead(id);
      return null;
    });
  }

  markAllRead() {
    return run(async () => {
      await this.repository.markAllRead();
      return null;
    });
  }
}
