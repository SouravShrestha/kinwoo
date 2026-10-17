import { useAuth } from "@kinwoo/client/auth";
import { useHouseMembers } from "@kinwoo/client/houses";
import {
  MEMBERS_SHEET_TITLE,
  memberCountLabel,
  memberDisplayName,
  roleLabel,
  sortMembers,
  type HouseMembership,
} from "@kinwoo/core/houses";
import { Text, View } from "react-native";

import { Button } from "../Button";
import { Avatar } from "./Avatar";
import { ListRow } from "./Rows";
import { SheetHeader } from "./SheetHeader";

export function MembersView({
  membership,
  onBack,
  onSelect,
}: {
  membership: HouseMembership;
  onBack?: () => void;
  onSelect: (userId: string) => void;
}) {
  const { user } = useAuth();
  const members = useHouseMembers(membership.house.id);
  const isAdmin = membership.role === "admin";

  return (
    <View>
      <SheetHeader
        title={MEMBERS_SHEET_TITLE}
        subtitle={members.data ? memberCountLabel(members.data.length) : undefined}
        onBack={onBack}
      />

      {members.isError ? (
        <View className="mt-8">
          <Text className="text-base text-muted-foreground">Couldn't load the members.</Text>
          <Button
            className="mt-4"
            variant="outline"
            label="Try again"
            onPress={() => members.refetch()}
          />
        </View>
      ) : members.data ? (
        <View className="mt-6 gap-3">
          {sortMembers(members.data).map((member) => {
            const isSelf = member.userId === user?.id;
            const name = memberDisplayName(member.displayName);

            return (
              <ListRow
                key={member.userId}
                leading={<Avatar name={member.displayName} url={member.avatarUrl} />}
                title={isSelf ? "You" : name}
                subtitle={member.email}
                aside={roleLabel(member.role)}
                accessibilityLabel={`${name}, ${roleLabel(member.role)}`}
                onPress={isAdmin || isSelf ? () => onSelect(member.userId) : undefined}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
