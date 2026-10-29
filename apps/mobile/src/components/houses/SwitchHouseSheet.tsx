import { useAuth } from "@kinwoo/client/auth";
import { useActiveHouse } from "@kinwoo/client/houses";
import { useNotifications } from "@kinwoo/client/notifications";
import {
  ADD_HOUSE_LABEL,
  SWITCH_HOUSE_TITLE,
  canAddHouse,
  unreadCountByHouse,
} from "@kinwoo/core/houses";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Text, View, type LayoutChangeEvent } from "react-native";

import { BottomSheet } from "../BottomSheet";
import { Button } from "../Button";
import { ListRow } from "./Rows";
import { SetupHousePrompt } from "./SetupHousePrompt";
import { SheetHeader } from "./SheetHeader";

export function SwitchHouseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} label={SWITCH_HOUSE_TITLE} showClose>
      <SwitchHouseContent onClose={onClose} />
    </BottomSheet>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      className="size-7 items-center justify-center"
    >
      <View className="size-5 items-center justify-center rounded-full border border-foreground">
        {checked ? <View className="size-2.5 rounded-full bg-foreground" /> : null}
      </View>
    </View>
  );
}

const PADDING_BOTTOM = 16;

// Mounts only while the sheet is presented, so it always opens on the list.
function SwitchHouseContent({ onClose }: { onClose: () => void }) {
  const { houses, activeHouseId, setActiveHouse } = useActiveHouse();
  const { user } = useAuth();
  const { data: notifications } = useNotifications(user?.id ?? null);
  const unreadByHouse = unreadCountByHouse(notifications);
  const [adding, setAdding] = useState(false);
  const [heights, setHeights] = useState({ list: 0, add: 0 });

  const go = (href: Href) => {
    onClose();
    router.push(href);
  };

  const measure = (key: "list" | "add") => (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setHeights((current) => (current[key] === height ? current : { ...current, [key]: height }));
  };

  const addView = (
    <View
      onLayout={measure("add")}
      pointerEvents={adding ? "auto" : "none"}
      importantForAccessibility={adding ? "auto" : "no-hide-descendants"}
      className={adding ? "" : "absolute inset-x-0 top-0 opacity-0"}
    >
      <SheetHeader onBack={() => setAdding(false)} />
      <View className="mt-6">
        <SetupHousePrompt
          level
          onCreate={() => go("/house/create")}
          onJoin={() => go("/house/join")}
        />
      </View>
    </View>
  );

  const listView = (
    <View
      onLayout={measure("list")}
      pointerEvents={adding ? "none" : "auto"}
      importantForAccessibility={adding ? "no-hide-descendants" : "auto"}
      className={adding ? "absolute inset-x-0 top-0 opacity-0" : "flex-1"}
    >
      <SheetHeader title={SWITCH_HOUSE_TITLE} />
      <View className="mt-8">
        {houses.map(({ house }) => {
          const active = house.id === activeHouseId;
          const unread = active ? 0 : (unreadByHouse[house.id] ?? 0);
          const unreadLabel = unread > 0 ? `, ${unread} unread` : "";

          return (
            <ListRow
              key={house.id}
              leading={<Radio checked={active} />}
              title={house.name}
              subtitle={house.address}
              trailing={
                unread > 0 ? (
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    className="ml-3 h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5"
                  >
                    <Text className="font-display-medium text-[11px] leading-3 text-destructive-foreground">
                      {unread > 9 ? "9+" : unread}
                    </Text>
                  </View>
                ) : null
              }
              accessibilityLabel={
                active ? `${house.name}, current house` : `Switch to ${house.name}${unreadLabel}`
              }
              onPress={() => {
                setActiveHouse(house.id);
                onClose();
              }}
            />
          );
        })}
      </View>
      {canAddHouse(houses.length) ? (
        <View className="mt-auto pt-6">
          <Button label={ADD_HOUSE_LABEL} onPress={() => setAdding(true)} />
        </View>
      ) : null}
    </View>
  );

  // The sheet keeps the taller of the two views, so switching between them does not jump.
  return (
    <View
      style={{
        paddingBottom: PADDING_BOTTOM,
        minHeight: Math.max(heights.list, heights.add) + PADDING_BOTTOM,
      }}
    >
      {listView}
      {addView}
    </View>
  );
}
