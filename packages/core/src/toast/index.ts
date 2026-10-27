export const TOAST_VARIANTS = ["default", "success", "error", "warning", "info"] as const;

export type ToastVariant = (typeof TOAST_VARIANTS)[number];

export const TOAST_VISIBLE_MS = 2800;

export const TOAST_MESSAGES = {
  codeCopied: "Code copied to your clipboard.",
  inviteCopied: "Invite copied to your clipboard.",
  reminderCopied: "Reminder copied to your clipboard.",
  copyFailed: "Couldn't copy. Select the code instead.",
  houseCreated: "House created.",
  houseSaved: "Changes saved.",
  paymentRecorded: "Payment recorded.",
  paymentUpdated: "Payment updated.",
  paymentDeleted: "Payment deleted.",
  houseJoined: "You joined the house.",
  joinRequested: "Request sent. An admin will review it.",
  inviteEmailAdded: "Invite sent.",
  inviteEmailRemoved: "Invite removed.",
  inviteRotated: "New invite code ready. The old one no longer works.",
  houseRequired: "This feature needs a house. \nJoin or create one to get started.",
  inviteAdminOnly: "Only admins can invite housemates.",
  houseLimitReached: "You can only be in one house for now.",
  installLater: "You can install Kinwoo anytime from your Profile.",
  logoutFailed: "Couldn't log out. Try again.",
  profileSaved: "Profile updated.",
  googleLinkFailed: "Couldn't link Google. Try again.",
  googleUnlinked: "Google account unlinked.",
  googleUnlinkFailed: "Couldn't unlink Google. Try again.",
  mailUnavailable: "No email app found. Write to hello@kinwoo.in instead.",
  notificationsBlocked: "Notifications are blocked. Allow them in system settings.",
  notificationsBlockedInBrowser:
    "Notifications are blocked for this site. Allow them in your browser settings.",
  notificationsFailed: "Couldn't update notifications. Try again.",
  notificationsReadFailed: "Couldn't mark notifications as read. Try again.",
  loginCancelled: "Login was cancelled.",
  googleAlreadyLinked: "That Google account is already linked to another Kinwoo account.",
  loginLinkIncomplete: "That login link was incomplete. Try again.",
  loginLinkExpired: "That login link has expired or was already used.",
  loginLinkUnknown: "That login link is not one we recognise.",
  loginUnavailable: "We could not reach the login service. Try again in a moment.",
  loginFailed: "Login failed. Try again.",
  offline: "You're offline. Showing your last saved data.",
  backOnline: "You're back online.",
} as const;

export type ToastMessageKey = keyof typeof TOAST_MESSAGES;

const AUTH_ERROR_MESSAGE_KEYS: Record<string, ToastMessageKey> = {
  provider_denied: "loginCancelled",
  identity_already_linked: "googleAlreadyLinked",
  missing_code: "loginLinkIncomplete",
  exchange_failed: "loginLinkExpired",
  verify_failed: "loginLinkExpired",
  bad_token_type: "loginLinkUnknown",
  unavailable: "loginUnavailable",
};

export function authErrorToastMessage(code: string): string {
  return TOAST_MESSAGES[AUTH_ERROR_MESSAGE_KEYS[code] ?? "loginFailed"];
}
