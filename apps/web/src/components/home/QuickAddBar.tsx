"use client";

import { createListStorage, useGroceryLists } from "@kinwoo/client/grocery";
import { PlusCircleOutlineIcon } from "@kinwoo/icons";
import { useEffect, useState } from "react";

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
      aria-label={`Add item to ${targetList?.name ?? "list"}`}
      onClick={() => {
        if (targetList) onPress(targetList.id);
      }}
      className="flex w-full items-center gap-2.5 rounded-full border border-border bg-muted/60 px-4 py-3.5 text-left transition-colors hover:bg-muted hover:cursor-pointer mt-4"
    >
      <PlusCircleOutlineIcon size={24} className="shrink-0 text-muted-foreground" />
      <span className="font-display text-base font-normal text-muted-foreground">
        Add a new item
      </span>
    </button>
  );
}
