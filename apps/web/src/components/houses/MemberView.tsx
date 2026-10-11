"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useHouseMembers, type MemberConfirm } from "@kinwoo/client/houses";
import {
  leaveState,
  memberDisplayName,
  roleActionLabel,
  roleLabel,
  type HouseMembership,
} from "@kinwoo/core/houses";

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
      <div>
        <SheetHeader onBack={onBack} />
        <p className="mt-4 text-base text-muted-foreground">That person is no longer here.</p>
      </div>
    );
  }

  const isSelf = member.userId === user?.id;
  const isAdmin = membership.role === "admin";
  const name = memberDisplayName(member.displayName);
  const nextRole = member.role === "admin" ? "member" : "admin";

  return (
    <div>
      <SheetHeader onBack={onBack} />

      <div className="mt-6 flex items-start gap-4">
        <Avatar name={member.displayName} url={member.avatarUrl} size={64} />
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <h2 className="max-w-full truncate font-display text-xl font-medium">
            {isSelf ? "You" : name}
          </h2>
          {member.email ? (
            <p className="mt-0.5 max-w-full truncate text-sm text-muted-foreground">
              {member.email}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm">
          {roleLabel(member.role)}
        </span>
      </div>

      <ErrorText message={confirm.open ? null : actions.error} />

      {isAdmin && !isSelf ? (
        <div className="mt-8 flex flex-col gap-3">
          <Button
            variant={member.role === "admin" ? "outline" : "primary"}
            label={roleActionLabel(member.role)}
            onClick={() => confirm.askRole(member.userId, name, nextRole)}
          />
          <Button
            variant="destructive"
            label="Remove from house"
            onClick={() => confirm.askRemove(member.userId, name)}
          />
        </div>
      ) : null}

      {isSelf ? (
        <div className="mt-8">
          <LeaveAction state={leaveState(list, member.userId)} onClick={confirm.askLeave} />
        </div>
      ) : null}
    </div>
  );
}
