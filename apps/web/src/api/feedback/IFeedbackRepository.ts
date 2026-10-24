import type { Feedback } from "./IFeedbackService";

export interface IFeedbackRepository {
  send(feedback: Feedback): Promise<void>;
}
