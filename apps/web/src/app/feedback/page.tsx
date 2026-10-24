import { FEEDBACK_PATH, HELP_LABELS } from "@kinwoo/core/app";
import type { Metadata } from "next";

import { FeedbackScreen } from "./FeedbackScreen";

export const metadata: Metadata = {
  title: HELP_LABELS.feedback,
  alternates: { canonical: FEEDBACK_PATH },
};

export default function FeedbackPage() {
  return <FeedbackScreen />;
}
