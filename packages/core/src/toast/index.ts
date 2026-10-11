export const TOAST_VARIANTS = ["default", "success", "error", "warning", "info"] as const;

export type ToastVariant = (typeof TOAST_VARIANTS)[number];

export const TOAST_VISIBLE_MS = 2800;

export const TOAST_MESSAGES = {
  codeCopied: "Code copied to your clipboard.",
  inviteCopied: "Invite copied to your clipboard.",
  copyFailed: "Couldn't copy. Select the code instead.",
  houseCreated: "House created.",
  houseSaved: "Changes saved.",
  houseJoined: "You joined the house.",
  joinRequested: "Request sent. An admin will review it.",
  inviteEmailAdded: "Invite sent.",
  inviteEmailRemoved: "Invite removed.",
  houseRequired: "This feature needs a house. \nJoin or create one to get started.",
  inviteAdminOnly: "Only admins can invite housemates.",
  houseLimitReached: "You can only be in one house for now.",
  logoutFailed: "Couldn't log out. Try again.",
  loginCancelled: "Login was cancelled.",
  loginLinkIncomplete: "That login link was incomplete. Try again.",
  loginLinkExpired: "That login link has expired or was already used.",
  loginLinkUnknown: "That login link is not one we recognise.",
  loginUnavailable: "We could not reach the login service. Try again in a moment.",
  loginFailed: "Login failed. Try again.",
} as const;

export type ToastMessageKey = keyof typeof TOAST_MESSAGES;

const AUTH_ERROR_MESSAGE_KEYS: Record<string, ToastMessageKey> = {
  provider_denied: "loginCancelled",
  missing_code: "loginLinkIncomplete",
  exchange_failed: "loginLinkExpired",
  verify_failed: "loginLinkExpired",
  bad_token_type: "loginLinkUnknown",
  unavailable: "loginUnavailable",
};

export function authErrorToastMessage(code: string): string {
  return TOAST_MESSAGES[AUTH_ERROR_MESSAGE_KEYS[code] ?? "loginFailed"];
}
