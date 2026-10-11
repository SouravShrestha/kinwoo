"use client";

import { useActiveHouse, useHouseMembers, type HouseSheetView } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import {
  INVITE_ACTION_TITLE,
  MEMBERS_SHEET_TITLE,
  SETTINGS_SHEET_TITLE,
  canAddHouse,
  memberCountLabel,
  type HouseMembership,
} from "@kinwoo/core/houses";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { HousePinIcon, HouseSettingsIcon, InviteIcon, MemberIcon } from "@kinwoo/icons";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Button } from "../Button";
import { AvatarStack } from "./AvatarStack";
import { ListRow } from "./Rows";

export function HouseMenuView({
  membership,
  onNavigate,
  onClose,
}: {
  membership: HouseMembership;
  onNavigate: (view: HouseSheetView) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { houses, activeHouseId, setActiveHouse } = useActiveHouse();
  const { house } = membership;
  const members = useHouseMembers(house.id);
  const isAdmin = membership.role === "admin";

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div>
      <h2 className="pr-10 font-display text-xl font-medium">
        <span className="flex items-center gap-1.5">
          <HousePinIcon size={20} className="shrink-0" />
          <span className="truncate">{house.name}</span>
        </span>
        {house.address ? (
          <span className="mt-0.5 block truncate font-display text-sm font-normal text-muted-foreground">
            {house.address}
          </span>
        ) : null}
      </h2>

      {houses.length > 1 ? (
        <div className="mt-4">
          {houses.map(({ house: option, role }) => {
            const active = option.id === activeHouseId;

            return (
              <ListRow
                key={option.id}
                leading={<HousePinIcon size={28} />}
                title={option.name}
                subtitle={role === "admin" ? "Admin" : "Member"}
                label={active ? `${option.name}, current house` : `Switch to ${option.name}`}
                trailing={active ? <span aria-hidden>✓</span> : null}
                onClick={() => {
                  setActiveHouse(option.id);
                  onClose();
                }}
              />
            );
          })}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <MenuCard
          icon={<MemberIcon size={14} />}
          stack={
            members.data ? (
              <AvatarStack
                surface="card"
                size={32}
                total={members.data.length}
                members={members.data.map((member) => ({
                  name: member.displayName,
                  avatarUrl: member.avatarUrl,
                }))}
              />
            ) : undefined
          }
          caption={members.data ? memberCountLabel(members.data.length) : undefined}
          title={MEMBERS_SHEET_TITLE}
          onClick={() => onNavigate({ name: "members" })}
        />
        <div className="flex gap-3">
          <MenuCard
            tall
            icon={<InviteIcon size={14} />}
            title={INVITE_ACTION_TITLE}
            onClick={() => {
              if (isAdmin) return go("/house/invite");
              onClose();
              toast.warning(TOAST_MESSAGES.inviteAdminOnly);
            }}
          />
          <MenuCard
            tall
            icon={<HouseSettingsIcon size={15} />}
            title={SETTINGS_SHEET_TITLE}
            onClick={() => onNavigate({ name: "settings" })}
          />
        </div>
      </div>

      {canAddHouse(houses.length) ? (
        <div className="mt-4 flex flex-col gap-3">
          <Button label="Create a house" onClick={() => go("/house/create")} />
          <Button label="Join with a code" variant="outline" onClick={() => go("/house/join")} />
        </div>
      ) : null}
    </div>
  );
}

function MenuCard({
  icon,
  stack,
  caption,
  title,
  tall = false,
  onClick,
}: {
  icon: ReactNode;
  stack?: ReactNode;
  caption?: string;
  title: string;
  tall?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={caption ? `${title}, ${caption}` : title}
      onClick={onClick}
      className={cn(
        "flex flex-col justify-between rounded-lg border border-border bg-card p-5 text-left",
        "hover:cursor-pointer hover:opacity-80",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        tall ? "h-40 min-w-0 flex-1" : "h-42 w-full pt-3",
      )}
    >
      <span className="-mr-2 flex justify-end self-stretch">
        <span className="flex size-9 items-center justify-center rounded-full bg-background border border-border">
          {icon}
        </span>
      </span>
      <span className="block">
        {stack ? <span className="mb-2 block">{stack}</span> : null}
        {caption ? (
          <span className="mb-1 block font-display text-sm font-normal">{caption}</span>
        ) : null}
        <span className="block font-display text-lg font-normal">{title}</span>
      </span>
    </button>
  );
}
