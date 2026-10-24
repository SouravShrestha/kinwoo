export const APP_NAME = "Kinwoo";

export const SUPPORT_EMAIL = "hello@kinwoo.in";

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

export const HELP_LABELS = {
  group: "Help & Support",
  feedback: "Send feedback",
  email: "Email",
} as const;

export const AUTHOR_NAME = "Sourav Shrestha";
export const AUTHOR_URL = "https://www.cbsdev.me/";

export const REPO_URL = "https://github.com/SouravShrestha/kinwoo";
export const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

// Placeholder until the app is published.
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=in.kinwoo.app";

export const FOOTER_COPY = {
  tagline: ["Truly", "Indian", "App"],
  madeWith: "Made with",
  madeIn: "in India",
  version: (version: string) => `App version ${version}`,
} as const;

export const NOT_FOUND_COPY = {
  code: "404",
  title: "Page not found",
  hint: "The page you’re looking for doesn’t exist or has been moved",
  action: "Go Home",
} as const;
