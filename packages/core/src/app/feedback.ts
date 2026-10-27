export const FEEDBACK_PATH = "/feedback";

export const FEEDBACK_EMAIL_MAX = 254;
export const FEEDBACK_SUBJECT_MAX = 120;
export const FEEDBACK_DESCRIPTION_MAX = 2000;

// Deliberately meaningless: names like "website" or "url" get autofilled and flag real users as bots.
export const FEEDBACK_HONEYPOT_FIELD = "kw_hp_field";

export const FEEDBACK_TYPES = [
  { id: "feedback", label: "Feedback or feature request" },
  { id: "bug", label: "Bug report" },
  { id: "access", label: "I cannot access my account" },
  { id: "abuse", label: "Report abuse" },
  { id: "deletion", label: "Account deletion request" },
] as const;

export type FeedbackTypeId = (typeof FEEDBACK_TYPES)[number]["id"];

export const FEEDBACK_COPY = {
  title: "What can we help you with?",
  intro: "Tell us what is on your mind. The more detail you give, the easier it is to help.",
  email: "Your email address",
  subject: "Subject",
  description: "Description",
  type: "Type of issue",
  submit: "Submit",
  sent: "Thanks, we got your message.",
  failed: "Something went wrong. Please try again.",
} as const;
