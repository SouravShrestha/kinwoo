"use client";

import { useMemberBalances } from "@kinwoo/client/expenses";
import { useActiveHouse } from "@kinwoo/client/houses";
import { paymentReminderMessage, type MemberBalanceRow } from "@kinwoo/core/expenses";
import { formatPaise } from "@kinwoo/core/grocery";
import { memberDisplayName, shortMemberName } from "@kinwoo/core/houses";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { CaretDownIcon } from "@kinwoo/icons";
import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/houses/Avatar";
import { recordPaymentPath } from "@/lib/house-navigation";
import { MemberBalanceRowsSkeleton } from "@/components/skeleton/skeletons";
import { shareOrCopy } from "@/lib/share-text";
import { cn } from "@/lib/utils";

const PILL =
  "rounded-xl border border-border bg-card px-5 py-2 font-display text-sm font-medium text-foreground transition-opacity hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

const MEMBER_AVATAR = 44;
const BRANCH_ROW = 48;

function MemberRow({ row, houseName }: { row: MemberBalanceRow; houseName: string }) {
  const { member, settlements } = row;
  const [open, setOpen] = useState(member.isSelf);
  const name = memberDisplayName(member.name);
  const owes = member.netPaise < 0;

  return (
    <li className="border-b border-border px-6 py-6">
      <button
        type="button"
        disabled={settlements.length === 0}
        aria-expanded={settlements.length > 0 ? open : undefined}
        aria-label={
          settlements.length > 0
            ? `${open ? "Hide" : "Show"} who ${member.isSelf ? "you settle" : `${name} settles`} with`
            : undefined
        }
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 text-left enabled:hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <Avatar name={member.name} url={member.avatarUrl} size={MEMBER_AVATAR} />
        <span className="block min-w-0 flex-1 font-display text-base text-foreground">
          <span className="font-medium">{member.isSelf ? "You" : name}</span>
          {member.netPaise === 0 ? (
            member.isSelf ? (
              " are settled up"
            ) : (
              " is settled up"
            )
          ) : (
            <>
              {owes
                ? member.isSelf
                  ? " owe "
                  : " owes "
                : member.isSelf
                  ? " get back "
                  : " gets back "}
              <span className={cn("font-medium", owes ? "text-destructive" : "text-accent")}>
                {formatPaise(Math.abs(member.netPaise))}
              </span>
              {" in total"}
            </>
          )}
        </span>
        {settlements.length > 0 ? (
          <span className="-mr-2 flex size-10 shrink-0 items-center justify-center text-muted-foreground">
            <CaretDownIcon
              size={9}
              className={cn(
                "transition-transform duration-200 ease-out motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </span>
        ) : null}
      </button>

      {settlements.length > 0 ? (
        <div
          inert={!open}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <ul className="mt-2" style={{ marginLeft: MEMBER_AVATAR / 2 }}>
              {settlements.map((settlement, index) => {
                const other =
                  settlement.from.userId === member.userId ? settlement.to : settlement.from;
                const last = index === settlements.length - 1;
                return (
                  <li
                    key={`${settlement.from.userId}-${settlement.to.userId}`}
                    className={cn("relative", !last && "pb-3")}
                  >
                    <div
                      aria-hidden
                      className="absolute left-0 top-0 w-px bg-border"
                      style={last ? { height: BRANCH_ROW / 2 } : { bottom: 0 }}
                    />
                    <div
                      aria-hidden
                      className="absolute left-0 h-px w-5 bg-border"
                      style={{ top: BRANCH_ROW / 2 }}
                    />
                    <div className="ml-5">
                      <div className="flex items-center gap-3" style={{ height: BRANCH_ROW }}>
                        <Avatar name={other.name} url={other.avatarUrl} size={26} />
                        <p className="min-w-0 flex-1 font-display text-sm text-muted-foreground">
                          {settlement.from.isSelf
                            ? "You owe"
                            : `${shortMemberName(settlement.from.name)} owes`}{" "}
                          <span className="font-medium text-destructive">
                            {formatPaise(settlement.amountPaise)}
                          </span>{" "}
                          to {settlement.to.isSelf ? "you" : shortMemberName(settlement.to.name)}
                        </p>
                      </div>
                      <div className="flex gap-2" style={{ paddingLeft: 38 }}>
                        {settlement.from.isSelf ? null : (
                          <button
                            type="button"
                            className={PILL}
                            onClick={() =>
                              void shareOrCopy(
                                paymentReminderMessage({
                                  debtorName: settlement.from.name,
                                  creditorName: settlement.to.name,
                                  houseName,
                                  amountPaise: settlement.amountPaise,
                                }),
                                TOAST_MESSAGES.reminderCopied,
                              )
                            }
                          >
                            Remind
                          </button>
                        )}
                        <Link
                          href={recordPaymentPath(
                            settlement.from.userId,
                            settlement.to.userId,
                            settlement.amountPaise,
                          )}
                          className={PILL}
                        >
                          Settle up
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function MemberBalances({ houseId }: { houseId: string }) {
  const { data: rows } = useMemberBalances(houseId);
  const { activeHouse } = useActiveHouse();
  if (!rows || !activeHouse) return <MemberBalanceRowsSkeleton />;
  return (
    <ul className="mt-10">
      {rows.map((row) => (
        <MemberRow key={row.member.userId} row={row} houseName={activeHouse.house.name} />
      ))}
    </ul>
  );
}
