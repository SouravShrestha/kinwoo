"use client";

import { useCallback, useMemo, useState } from "react";

export type ItemSelection = {
  selectedIds: string[];
  count: number;
  allSelected: boolean;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
};

// Selection is intersected with `selectableIds` on every render, so items that leave the list
// (claimed by someone else, filtered out, deleted) drop out of the selection on their own.
export function useItemSelection(selectableIds: readonly string[]): ItemSelection {
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());

  const selectedIds = useMemo(
    () => selectableIds.filter((id) => picked.has(id)),
    [selectableIds, picked],
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = selectableIds.length > 0 && selectedIds.length === selectableIds.length;

  const toggle = useCallback((id: string) => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setPicked(allSelected ? new Set() : new Set(selectableIds));
  }, [allSelected, selectableIds]);

  const clear = useCallback(() => setPicked(new Set()), []);

  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  return {
    selectedIds,
    count: selectedIds.length,
    allSelected,
    isSelected,
    toggle,
    toggleAll,
    clear,
  };
}
