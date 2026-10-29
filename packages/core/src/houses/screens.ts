export const HOUSE_MENU_TITLE = "Your house";

export const MEMBERS_SHEET_TITLE = "Manage members";
export const INVITE_ACTION_TITLE = "Invite housemates";
export const SETTINGS_SHEET_TITLE = "House settings";
export const SWITCH_HOUSE_TITLE = "Switch house";
export const ADD_HOUSE_LABEL = "Add new house";

export const HOUSE_SCREEN_TITLES = {
  create: "Build your house",
  join: "",
  invite: "Share invites",
} as const;

export const CREATE_HOUSE_SUBTITLE =
  "Let’s set up your space. You can change these details anytime.";

export const INVITE_SCREEN_SUBTITLE =
  "Flatmates can join by scanning this QR code or entering the invite code.";

export type HouseScreenName = keyof typeof HOUSE_SCREEN_TITLES;

export const JOIN_BLOCKED_TITLE = "Join a house";
export const JOIN_SCREEN_HEADING = "Got a code?";
export const JOIN_SCREEN_SUBTITLE = "Got a 6-character code from a flatmate? Enter it below.";
export const JOIN_SCAN_NOT_INVITE = "That QR code isn't a Kinwoo invite.";
