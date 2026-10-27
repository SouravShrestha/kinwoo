export const PUSH_EVENTS = [
  { type: "expense.created", group: "Expenses", label: "A new expense is shared with me" },
  { type: "expense.updated", group: "Expenses", label: "An expense I share is edited" },
  { type: "settlement.recorded", group: "Expenses", label: "A settlement is recorded with me" },
  { type: "grocery_item.assigned", group: "Tasks", label: "An item is assigned to me" },
  { type: "join_requested", group: "House", label: "Someone asks to join my house" },
] as const;

// Not activity types: nothing in send-push sends these, so they stay out of PUSH_TYPES.
export const NEWS_EVENTS = [
  { type: "news", group: "News and updates", label: "Kinwoo news & updates" },
  { type: "tips", group: "News and updates", label: "Tips & ideas" },
] as const;

export const SETTING_EVENTS = [...PUSH_EVENTS, ...NEWS_EVENTS];

export type PushType = (typeof PUSH_EVENTS)[number]["type"];

export const PUSH_TYPES: readonly PushType[] = PUSH_EVENTS.map((event) => event.type);

export type SettingType = (typeof SETTING_EVENTS)[number]["type"];

export const isPushType = (value: unknown): value is SettingType =>
  SETTING_EVENTS.some((event) => event.type === value);

export function withPushType(muted: readonly string[], type: SettingType, on: boolean): string[] {
  const rest = muted.filter((entry) => entry !== type);
  return on ? rest : [...rest, type];
}
