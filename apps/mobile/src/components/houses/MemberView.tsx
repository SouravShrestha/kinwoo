import { useAuth } from "@kinwoo/client/auth";
import { useHouseMembers, type MemberConfirm } from "@kinwoo/client/houses";
import {
  leaveState,
  memberDisplayName,
  roleActionLabel,
  roleLabel,
  type HouseMembership,
} from "@kinwoo/core/houses";
import { Text, View } from "react-native";

import { Button } from "../Button";
import { Avatar } from "./Avatar";
import { LeaveAction } from "./LeaveAction";
import { ErrorText } from "./Rows";
import { SheetHeader } from "./SheetHeader";

export function MemberView({
  membership,
  userId,
  confirm,
  onBack,
}: {
  membership: HouseMembership;
  userId: string;
  confirm: MemberConfirm;
  onBack?: () => void;
}) {
  const { user } = useAuth();
  const members = useHouseMembers(membership.house.id);
  const { actions } = confirm;

  const list = members.data ?? [];
  const member = list.find((entry) => entry.userId === userId);

  if (members.isPending) return <SheetHeader onBack={onBack} />;

  if (!member) {
    return (
      <View>
        <SheetHeader onBack={onBack} />
        <Text className="mt-4 text-base text-muted-foreground">That person is no longer here.</Text>
      </View>
    );
  }

  const isSelf = member.userId === user?.id;
  const isAdmin = membership.role === "admin";
  const name = memberDisplayName(member.displayName);
  const nextRole = member.role === "admin" ? "member" : "admin";

  return (
    <View>
      <SheetHeader onBack={onBack} />

      <View className="mt-6 flex-row items-start">
        <Avatar name={member.displayName} url={member.avatarUrl} size={64} />
        <View className="ml-4 flex-1 items-start">
          <Text className="font-display-medium text-xl text-foreground" numberOfLines={1}>
            {isSelf ? "You" : name}
          </Text>
          {member.email ? (
            <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={1}>
              {member.email}
            </Text>
          ) : null}
        </View>
        <View className="ml-4 rounded-full bg-muted px-3 py-1">
          <Text className="text-sm text-foreground">{roleLabel(member.role)}</Text>
        </View>
      </View>

      <ErrorText message={confirm.open ? null : actions.error} />

      {isAdmin && !isSelf ? (
        <View className="mt-8 gap-3">
          <Button
            variant={member.role === "admin" ? "outline" : "primary"}
            label={roleActionLabel(member.role)}
            onPress={() => confirm.askRole(member.userId, name, nextRole)}
          />
          <Button
            variant="destructive"
            label="Remove from house"
            onPress={() => confirm.askRemove(member.userId, name)}
          />
        </View>
      ) : null}

      {isSelf ? (
        <View className="mt-8">
          <LeaveAction state={leaveState(list, member.userId)} onPress={confirm.askLeave} />
        </View>
      ) : null}
    </View>
  );
}
