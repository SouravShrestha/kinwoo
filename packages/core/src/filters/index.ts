export type FilterOption = {
  id: string;
  label: string;
  count?: number;
};

export type FilterGroup = {
  id: string;
  label: string;
  options: readonly FilterOption[];
  // Single-option group shown as its own toggle chip instead of a tab in the filter sheet.
  toggle?: boolean;
};

// Option ids selected per group id. A group with no selection is absent, never an empty array.
export type FilterSelection = Readonly<Record<string, readonly string[]>>;

export const EMPTY_FILTER_SELECTION: FilterSelection = {};

export function selectedIn(selection: FilterSelection, groupId: string): readonly string[] {
  return selection[groupId] ?? [];
}

export function isSelected(selection: FilterSelection, groupId: string, optionId: string): boolean {
  return selectedIn(selection, groupId).includes(optionId);
}

export function countSelected(selection: FilterSelection): number {
  return Object.values(selection).reduce((total, ids) => total + ids.length, 0);
}

export function toggleOption(
  selection: FilterSelection,
  groupId: string,
  optionId: string,
): FilterSelection {
  const current = selectedIn(selection, groupId);
  const next = current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId];

  const rest: Record<string, readonly string[]> = { ...selection };
  delete rest[groupId];
  return next.length > 0 ? { ...rest, [groupId]: next } : rest;
}

export function pruneSelection(
  selection: FilterSelection,
  groups: readonly FilterGroup[],
): FilterSelection {
  const pruned: Record<string, readonly string[]> = {};
  for (const group of groups) {
    const kept = selectedIn(selection, group.id).filter((id) =>
      group.options.some((option) => option.id === id),
    );
    if (kept.length > 0) pruned[group.id] = kept;
  }
  return countSelected(pruned) === countSelected(selection) ? selection : pruned;
}

export function groupLabel(group: FilterGroup, selection: FilterSelection): string {
  const count = selectedIn(selection, group.id).length;
  return count > 0 ? `${group.label} (${count})` : group.label;
}

export function selectedEntries(
  groups: readonly FilterGroup[],
  selection: FilterSelection,
): { group: FilterGroup; option: FilterOption }[] {
  return groups.flatMap((group) =>
    group.options
      .filter((option) => isSelected(selection, group.id, option.id))
      .map((option) => ({ group, option })),
  );
}

// Within a group options are ORed; across groups they are ANDed.
export function applyFilters<T>(
  items: readonly T[],
  selection: FilterSelection,
  matches: (item: T, groupId: string, optionId: string) => boolean,
): T[] {
  const active = Object.entries(selection).filter(([, ids]) => ids.length > 0);
  if (active.length === 0) return [...items];
  return items.filter((item) =>
    active.every(([groupId, ids]) => ids.some((optionId) => matches(item, groupId, optionId))),
  );
}

export type SortOption = {
  id: string;
  label: string;
};
