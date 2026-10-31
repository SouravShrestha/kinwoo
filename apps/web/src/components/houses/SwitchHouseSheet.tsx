"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useActiveHouse } from "@kinwoo/client/houses";
import { useNotifications } from "@kinwoo/client/notifications";
import {
  ADD_HOUSE_LABEL,
  SWITCH_HOUSE_TITLE,
  canAddHouse,
  unreadCountByHouse,
} from "@kinwoo/core/houses";
import { useRouter } from "@/lib/router";
import { useState } from "react";

import { cn } from "@/lib/utils";
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
    <span aria-hidden className="flex size-7 items-center justify-center">
      <span className="flex size-5 items-center justify-center rounded-full border border-foreground">
        {checked ? <span className="size-2.5 rounded-full bg-foreground" /> : null}
      </span>
    </span>
  );
}

// Mounts only while the sheet is rendered, so it always opens on the list.
function SwitchHouseContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { houses, activeHouseId, setActiveHouse } = useActiveHouse();
  const { user } = useAuth();
  const { data: notifications } = useNotifications(user?.id ?? null);
  const unreadByHouse = unreadCountByHouse(notifications);
  const [adding, setAdding] = useState(false);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const addView = (
    <div className={cn("col-start-1 row-start-1", !adding && "invisible")}>
      <SheetHeader onBack={() => setAdding(false)} />
      <div className="mt-6 flex">
        <SetupHousePrompt
          level
          onCreate={() => go("/house/create")}
          onJoin={() => go("/house/join")}
        />
      </div>
    </div>
  );

  const listView = (
    <div className={cn("col-start-1 row-start-1 flex flex-col", adding && "invisible")}>
      <SheetHeader title={SWITCH_HOUSE_TITLE} />
      <div className="mt-8">
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
                  <span
                    aria-hidden
                    className="ml-3 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-none text-destructive-foreground"
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null
              }
              label={
                active ? `${house.name}, current house` : `Switch to ${house.name}${unreadLabel}`
              }
              onClick={() => {
                setActiveHouse(house.id);
                onClose();
              }}
            />
          );
        })}
      </div>
      {canAddHouse(houses.length) ? (
        <div className="mt-auto pt-6">
          <Button className="w-full" label={ADD_HOUSE_LABEL} onClick={() => setAdding(true)} />
        </div>
      ) : null}
    </div>
  );

  // Both views share one grid cell, so the sheet keeps the taller height and does not jump.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] pb-4">
      {listView}
      {addView}
    </div>
  );
}
