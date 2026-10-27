import {
  FEEDBACK_DESCRIPTION_MAX,
  FEEDBACK_EMAIL_MAX,
  FEEDBACK_SUBJECT_MAX,
  FEEDBACK_TYPES,
  type FeedbackTypeId,
} from "@kinwoo/core/app";

import { serviceResults } from "../_shared/result";
import type { IFeedbackRepository } from "./IFeedbackRepository";
import type {
  FeedbackResult,
  FeedbackServiceErrorCode,
  IFeedbackService,
} from "./IFeedbackService";

const MESSAGES: Record<FeedbackServiceErrorCode, string> = {
  INVALID_INPUT: "Check the form and try again.",
  UNAVAILABLE: "Could not send your message",
};

const { invalidInput, run } = serviceResults<FeedbackServiceErrorCode>({
  messageFor: (code) => MESSAGES[code],
  codeOf: () => null,
  invalidInputCode: "INVALID_INPUT",
  unavailableCode: "UNAVAILABLE",
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Everything except tab and newline, which a multi-line description keeps.
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanText(value: unknown, max: number, multiline = false): string | null {
  if (typeof value !== "string") return null;
  const stripped = value.replace(CONTROL_CHARS, "");
  const text = (multiline ? stripped : stripped.replace(/[\r\n\t]+/g, " ")).trim();
  return text && text.length <= max ? text : null;
}

function isFeedbackType(value: unknown): value is FeedbackTypeId {
  return FEEDBACK_TYPES.some((option) => option.id === value);
}

export class FeedbackService implements IFeedbackService {
  constructor(private readonly repository: IFeedbackRepository) {}

  async submit(input: Record<string, unknown>): Promise<FeedbackResult> {
    const email = cleanText(input.email, FEEDBACK_EMAIL_MAX);
    const subject = cleanText(input.subject, FEEDBACK_SUBJECT_MAX);
    const description = cleanText(input.description, FEEDBACK_DESCRIPTION_MAX, true);
    const { type } = input;
    if (!email || !EMAIL.test(email)) return invalidInput("Enter a valid email address.");
    if (!subject || !description || !isFeedbackType(type))
      return invalidInput(MESSAGES.INVALID_INPUT);

    return run(async () => {
      await this.repository.send({ email, subject, description, type });
      return null;
    });
  }
}
