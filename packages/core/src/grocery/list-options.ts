import type { ListVisibility } from "./types";

// `value` is what gets stored on the list. It stays an emoji so every screen that still renders
// `list.icon` as text keeps working; `label` names the matching glyph in `CategoryIcon`.
export const LIST_ICON_OPTIONS = [
  { value: "🛒", label: "Grocery" },
  { value: "✅", label: "To-do" },
  { value: "👛", label: "Wallet" },
  { value: "�", label: "Events" },
  { value: "🛍️", label: "Shopping" },
  { value: "🍽️", label: "Dining" },
] as const;

export const DEFAULT_LIST_ICON = LIST_ICON_OPTIONS[0].value;

export const DEFAULT_LIST_VISIBILITY: ListVisibility = "shared";

export const LIST_VISIBILITY_OPTIONS: readonly {
  value: ListVisibility;
  label: string;
  description: string;
}[] = [
  {
    value: "private",
    label: "Private",
    description: "Only you can view and edit this list",
  },
  {
    value: "shared",
    label: "Shared",
    description: "Housemates can view and edit this list",
  },
];

export function listIconOption(icon: string) {
  return LIST_ICON_OPTIONS.find((option) => option.value === icon) ?? LIST_ICON_OPTIONS[0];
}

export function listVisibilityOption(visibility: ListVisibility) {
  return (
    LIST_VISIBILITY_OPTIONS.find((option) => option.value === visibility) ??
    LIST_VISIBILITY_OPTIONS[0]
  );
}
