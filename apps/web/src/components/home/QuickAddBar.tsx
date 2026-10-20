"use client";

import { createListStorage, useGroceryLists } from "@kinwoo/client/grocery";
import { listIconOption } from "@kinwoo/core/grocery";
import { useEffect, useState } from "react";

import { CategoryIcon } from "@kinwoo/icons";

import { houseStorage } from "@/lib/house-storage";

export function QuickAddBar({
  houseId,
  onPress,
}: {
  houseId: string;
  onPress: (listId: string) => void;
}) {
  const { data: lists } = useGroceryLists(houseId);
  const [targetListId, setTargetListId] = useState<string | null>(null);

  useEffect(() => {
    if (!lists || lists.length === 0) return;
    const storage = createListStorage(houseStorage);
    void storage.loadSelectedList(houseId).then((storedId) => {
      if (storedId && lists.some((l) => l.id === storedId)) {
        setTargetListId(storedId);
      } else {
        const defaultList = lists.find((l) => l.isDefault) ?? lists[0];
        setTargetListId(defaultList?.id ?? null);
      }
    });
  }, [houseId, lists]);

  const targetList =
    lists?.find((l) => l.id === targetListId) ?? lists?.find((l) => l.isDefault) ?? lists?.[0];

  return (
    <button
      type="button"
      onClick={() => {
        if (targetList) onPress(targetList.id);
      }}
      className="flex w-full items-center justify-between rounded-2xl border border-border/80 bg-muted/50 px-4 py-3.5 text-left transition-colors hover:bg-muted hover:cursor-pointer"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-lg font-bold text-muted-foreground">+</span>
        <span className="font-display text-base text-muted-foreground">Add an item...</span>
      </div>
      {targetList ? (
        <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1">
          <CategoryIcon name={listIconOption(targetList.icon).label} size={14} />
          <span className="max-w-[120px] truncate text-xs font-display font-medium text-foreground">
            {targetList.name}
          </span>
        </div>
      ) : null}
    </button>
  );
}
