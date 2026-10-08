export const APP_NAME = "Kinwoo";

export const SUPPORT_EMAIL = "souravshrestha@cbsdev.me";

export const AUTHOR_NAME = "Sourav Shrestha";
export const AUTHOR_URL = "https://www.cbsdev.me/";

export const REPO_URL = "https://github.com/SouravShrestha/kinwoo";
export const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

export function supportMailtoFor(options: {
  version: string;
  device: string;
  subject?: string;
}): string {
  const { version, device, subject = `${APP_NAME} support` } = options;
  const lines = ["", "", "---", `Version: ${version}`, `Device: ${device}`];
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  return `mailto:${SUPPORT_EMAIL}?${query}`;
}
