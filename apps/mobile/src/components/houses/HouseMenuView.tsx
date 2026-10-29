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
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { Skeleton } from "@/components/skeleton/Skeleton";
import { useTheme } from "@/theme/ThemeProvider";
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
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const { house } = membership;
  const members = useHouseMembers(house.id);
  const isAdmin = membership.role === "admin";

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
            ) : (
              <Skeleton className="h-8 w-20 rounded-full" />
            )
          }
          caption={members.data ? memberCountLabel(members.data.length) : undefined}
          title={MEMBERS_SHEET_TITLE}
          onPress={() => onNavigate({ name: "members" })}
        />
        <View className="flex-row gap-3">
          <MenuCard
            size="tall"
            icon={<InviteIcon size={14} color={palette.foreground} />}
            title={INVITE_ACTION_TITLE}
            onPress={() => {
              onClose();
              if (isAdmin) return router.push("/house/invite");
              toast.warning(TOAST_MESSAGES.inviteAdminOnly);
            }}
          />
          <View className="flex-1 gap-3">
            <MenuCard
              size="half"
              icon={<HouseSettingsIcon size={15} color={palette.foreground} />}
              title={SETTINGS_SHEET_TITLE}
              onPress={() => onNavigate({ name: "settings" })}
            />
            {onSwitch ? (
              <MenuCard
                size="half"
                icon={<SwitchHouseIcon size={15} color={palette.foreground} />}
                title={SWITCH_HOUSE_TITLE.replace(" ", "\n")}
                onPress={onSwitch}
              />
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
