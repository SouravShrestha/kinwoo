"use client";

import { useHouseMembers, type HouseSheetView } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import {
  INVITE_ACTION_TITLE,
  MEMBERS_SHEET_TITLE,
  SETTINGS_SHEET_TITLE,
  SWITCH_HOUSE_TITLE,
  memberCountLabel,
  type HouseMembership,
} from "@kinwoo/core/houses";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import {
  HousePinIcon,
  HouseSettingsIcon,
  InviteIcon,
  MemberIcon,
  SwitchHouseIcon,
} from "@kinwoo/icons";
import { useRouter } from "@/lib/router";

import { Skeleton } from "@/components/skeleton/Skeleton";
import { AvatarStack } from "./AvatarStack";
import { MenuCard } from "./MenuCard";

export function HouseMenuView({
  membership,
  onNavigate,
  onClose,
  onSwitch,
}: {
  membership: HouseMembership;
  onNavigate: (view: HouseSheetView) => void;
  onClose: () => void;
  onSwitch?: () => void;
}) {
  const router = useRouter();
  const { house } = membership;
  const members = useHouseMembers(house.id);
  const isAdmin = membership.role === "admin";

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
            ) : (
              <Skeleton className="h-8 w-20 rounded-full" />
            )
          }
          caption={members.data ? memberCountLabel(members.data.length) : undefined}
          title={MEMBERS_SHEET_TITLE}
          onClick={() => onNavigate({ name: "members" })}
        />
        <div className="flex gap-3">
          <MenuCard
            size="tall"
            icon={<InviteIcon size={14} />}
            title={INVITE_ACTION_TITLE}
            onClick={() => {
              onClose();
              if (isAdmin) return router.push("/house/invite");
              toast.warning(TOAST_MESSAGES.inviteAdminOnly);
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <MenuCard
              size="half"
              icon={<HouseSettingsIcon size={15} />}
              title={SETTINGS_SHEET_TITLE}
              onClick={() => onNavigate({ name: "settings" })}
            />
            {onSwitch ? (
              <MenuCard
                size="half"
                icon={<SwitchHouseIcon size={15} />}
                title={SWITCH_HOUSE_TITLE.replace(" ", "\n")}
                onClick={onSwitch}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
