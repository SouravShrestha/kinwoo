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
import { HousePinIcon, HouseSettingsIcon, InviteIcon, MemberIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router, type Href } from "expo-router";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { Button } from "../Button";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";
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
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { houses, activeHouseId, setActiveHouse } = useActiveHouse();
  const { house } = membership;
  const members = useHouseMembers(house.id);
  const isAdmin = membership.role === "admin";

  const go = (href: Href) => {
    onClose();
    router.push(href);
  };

  return (
    <View>
      <View accessibilityRole="header" className="pr-10">
        <View className="flex-row items-center gap-1.5">
          <HousePinIcon size={20} color={palette.foreground} />
          <Text numberOfLines={1} className="shrink font-display-medium text-xl text-foreground">
            {house.name}
          </Text>
        </View>
        {house.address ? (
          <Text
            numberOfLines={1}
            className="mt-0.5 text-sm text-muted-foreground font-display-normal"
          >
            {house.address}
          </Text>
        ) : null}
      </View>

      {houses.length > 1 ? (
        <View className="mt-4">
          {houses.map(({ house: option, role }) => {
            const active = option.id === activeHouseId;

            return (
              <ListRow
                key={option.id}
                leading={<HousePinIcon size={28} color={palette.foreground} />}
                title={option.name}
                subtitle={role === "admin" ? "Admin" : "Member"}
                accessibilityLabel={
                  active ? `${option.name}, current house` : `Switch to ${option.name}`
                }
                trailing={active ? <Text className="text-base text-foreground">✓</Text> : null}
                onPress={() => {
                  setActiveHouse(option.id);
                  onClose();
                }}
              />
            );
          })}
        </View>
      ) : null}

      <View className="mt-8 gap-3">
        <MenuCard
          icon={<MemberIcon size={14} color={palette.foreground} />}
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
          onPress={() => onNavigate({ name: "members" })}
        />
        <View className="flex-row gap-3">
          <MenuCard
            tall
            icon={<InviteIcon size={14} color={palette.foreground} />}
            title={INVITE_ACTION_TITLE}
            onPress={() => {
              if (isAdmin) return go("/house/invite");
              onClose();
              toast.warning(TOAST_MESSAGES.inviteAdminOnly);
            }}
          />
          <MenuCard
            tall
            icon={<HouseSettingsIcon size={15} color={palette.foreground} />}
            title={SETTINGS_SHEET_TITLE}
            onPress={() => onNavigate({ name: "settings" })}
          />
        </View>
      </View>

      {canAddHouse(houses.length) ? (
        <View className="mt-4 gap-3">
          <Button label="Create a house" onPress={() => go("/house/create")} />
          <Button label="Join with a code" variant="outline" onPress={() => go("/house/join")} />
        </View>
      ) : null}
    </View>
  );
}

function MenuCard({
  icon,
  stack,
  caption,
  title,
  tall = false,
  onPress,
}: {
  icon: ReactNode;
  stack?: ReactNode;
  caption?: string;
  title: string;
  tall?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${title}, ${caption}` : title}
      onPress={onPress}
      className={`justify-between rounded-lg border border-border bg-card p-5 active:opacity-80 ${
        tall ? "h-40 flex-1" : "h-[168px] pt-3"
      }`}
    >
      <View className="-mr-2 items-end">
        <View className="size-9 items-center justify-center rounded-full bg-background border border-border">
          {icon}
        </View>
      </View>
      <View>
        {stack ? <View className="mb-2">{stack}</View> : null}
        {caption ? (
          <Text className="mb-1 text-sm text-foreground font-display-normal">{caption}</Text>
        ) : null}
        <Text className="text-lg text-foreground font-display-normal">{title}</Text>
      </View>
    </Pressable>
  );
}
