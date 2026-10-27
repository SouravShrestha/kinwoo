import { createListStorage, useGroceryLists } from "@kinwoo/client/grocery";
import { PlusCircleOutlineIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useEffect, useState } from "react";
import { Text } from "react-native";

import { Pressable } from "@/components/Pressable";
import { houseStorage } from "@/lib/house-storage";
import { useTheme } from "@/theme/ThemeProvider";

type QuickAddBarProps = {
  houseId: string;
  onPress: (targetListId: string) => void;
};

export function QuickAddBar({ houseId, onPress }: QuickAddBarProps) {
  const { data: lists } = useGroceryLists(houseId);
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add item to ${targetList?.name ?? "list"}`}
      onPress={() => {
        if (targetList) onPress(targetList.id);
      }}
      className="flex-row items-center gap-2.5 rounded-full border border-border bg-muted/60 px-4 py-3.5 active:opacity-70"
    >
      <PlusCircleOutlineIcon size={24} color={palette.mutedForeground} />
      <Text className="font-display-normal text-base text-muted-foreground">Add a new item</Text>
    </Pressable>
  );
}
