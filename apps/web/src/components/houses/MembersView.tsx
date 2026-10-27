"use client";

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

import { ListRowsSkeleton } from "@/components/skeleton/skeletons";
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
    <div>
      <SheetHeader
        title={MEMBERS_SHEET_TITLE}
        subtitle={members.data ? memberCountLabel(members.data.length) : undefined}
        onBack={onBack}
      />

      {members.isError ? (
        <div className="mt-8">
          <p className="text-base text-muted-foreground">Couldn&apos;t load the members.</p>
          <Button
            className="mt-4"
            variant="outline"
            label="Try again"
            onClick={() => members.refetch()}
          />
        </div>
      ) : members.data ? (
        <ul className="mt-6 flex flex-col gap-3">
          {sortMembers(members.data).map((member) => {
            const isSelf = member.userId === user?.id;
            const name = memberDisplayName(member.displayName);

            return (
              <li key={member.userId}>
                <ListRow
                  leading={<Avatar name={member.displayName} url={member.avatarUrl} />}
                  title={isSelf ? "You" : name}
                  subtitle={member.email}
                  aside={roleLabel(member.role)}
                  label={`${name}, ${roleLabel(member.role)}`}
                  onClick={isAdmin || isSelf ? () => onSelect(member.userId) : undefined}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <ListRowsSkeleton count={4} spaced className="mt-6" />
      )}
    </div>
  );
}
