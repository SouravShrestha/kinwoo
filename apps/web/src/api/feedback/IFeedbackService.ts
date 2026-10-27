import type { FeedbackTypeId } from "@kinwoo/core/app";

import type { ServiceResult } from "../_shared/result";

export type FeedbackServiceErrorCode = "INVALID_INPUT" | "UNAVAILABLE";

export type Feedback = {
  email: string;
  subject: string;
  description: string;
  type: FeedbackTypeId;
};

export type FeedbackResult = ServiceResult<null, FeedbackServiceErrorCode>;

export interface IFeedbackService {
  submit(input: Record<string, unknown>): Promise<FeedbackResult>;
}
