import {
  amountDraftToPaise,
  isAmountDraft,
  paiseToAmountDraft,
  payerNamesLabel,
  payerSplit,
  rescaleAmounts,
} from "@kinwoo/core/expenses";
import { parseRupeesToPaise } from "@kinwoo/core/grocery";
import { memberDisplayName, sortMembers } from "@kinwoo/core/houses";
import { useMemo, useState } from "react";

import { useHouseMembers } from "../houses/queries";

export type PayerMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isYou: boolean;
};

export type PayerChoice = { selected: string[]; amounts: Record<string, string> };

function assignedPaiseOf(choice: PayerChoice, members: readonly PayerMember[]): number {
  return members
    .filter((member) => choice.selected.includes(member.userId))
    .reduce((sum, member) => sum + amountDraftToPaise(choice.amounts[member.userId] ?? ""), 0);
}

// A sole payer always covers the whole amount, so ticking or unticking down to one person moves
// the total to them.
export function togglePayer(choice: PayerChoice, userId: string, totalPaise: number): PayerChoice {
  const removing = choice.selected.includes(userId);
  const selected = removing
    ? choice.selected.filter((id) => id !== userId)
    : [...choice.selected, userId];
  if (selected.length === 1) {
    return { selected, amounts: { [selected[0]]: paiseToAmountDraft(totalPaise) } };
  }
  const amounts = removing
    ? Object.fromEntries(Object.entries(choice.amounts).filter(([id]) => id !== userId))
    : { ...choice.amounts, [userId]: "" };
  return { selected, amounts };
}

// Until the user edits the split, they are the sole payer and cover the full price. A new price
// keeps whoever was chosen and rescales their amounts from the total they were entered against,
// so retyping the price never loses the original proportions.
// Edits in the sheet stay a draft until `commit`; `discard` drops them.
export function usePayerSplit({
  houseId,
  currentUserId,
  price,
  initialAmounts,
}: {
  houseId: string;
  currentUserId: string | null;
  price: string;
  initialAmounts?: Readonly<Record<string, string>>;
}) {
  const membersQuery = useHouseMembers(houseId || null);
  const totalPaise = useMemo(() => {
    const result = parseRupeesToPaise(price);
    return result.ok ? (result.value ?? 0) : 0;
  }, [price]);

  const [choice, setChoice] = useState<(PayerChoice & { totalPaise: number }) | null>(() =>
    initialAmounts
      ? { selected: Object.keys(initialAmounts), amounts: { ...initialAmounts }, totalPaise }
      : null,
  );
  const [draft, setDraft] = useState<PayerChoice | null>(null);

  const [seenTotal, setSeenTotal] = useState(totalPaise);
  if (seenTotal !== totalPaise) {
    setSeenTotal(totalPaise);
    setDraft(null);
  }

  const members = useMemo<PayerMember[]>(() => {
    const all = sortMembers(membersQuery.data ?? []).map((member) => ({
      userId: member.userId,
      name: memberDisplayName(member.displayName),
      avatarUrl: member.avatarUrl,
      isYou: member.userId === currentUserId,
    }));
    return [...all.filter((member) => member.isYou), ...all.filter((member) => !member.isYou)];
  }, [membersQuery.data, currentUserId]);

  const committed: PayerChoice = !choice
    ? {
        selected: currentUserId ? [currentUserId] : [],
        amounts: currentUserId ? { [currentUserId]: paiseToAmountDraft(totalPaise) } : {},
      }
    : choice.totalPaise === totalPaise
      ? choice
      : {
          selected: choice.selected,
          amounts: rescaleAmounts(choice.selected, choice.amounts, totalPaise),
        };
  const editing = draft ?? committed;

  const toggle = (userId: string) => setDraft(togglePayer(editing, userId, totalPaise));

  const setAmount = (userId: string, text: string) => {
    if (!isAmountDraft(text)) return;
    // Every row has an amount field, so typing into an unticked one ticks it.
    const selected = editing.selected.includes(userId)
      ? editing.selected
      : [...editing.selected, userId];
    setDraft({ selected, amounts: { ...editing.amounts, [userId]: text } });
  };

  const split = payerSplit(totalPaise, assignedPaiseOf(editing, members));
  const canCommit = totalPaise > 0 && split.state === "balanced";

  return {
    members,
    totalPaise,
    label: payerNamesLabel(
      members
        .filter((member) => committed.selected.includes(member.userId))
        .map((member) => (member.isYou ? "You" : member.name.split(/\s+/)[0])),
    ),
    amounts: Object.fromEntries(
      committed.selected.map((id) => [id, committed.amounts[id] ?? ""]),
    ) as Record<string, string>,
    isSelected: (userId: string) => editing.selected.includes(userId),
    amountText: (userId: string) => editing.amounts[userId] ?? "",
    split,
    canCommit,
    toggle,
    setAmount,
    // Ticked rows left at zero are dropped so the "Paid by" label only names people who paid.
    commit: (): boolean => {
      if (!canCommit) return false;
      if (draft) {
        const selected = draft.selected.filter(
          (id) => amountDraftToPaise(draft.amounts[id] ?? "") > 0,
        );
        setChoice({
          selected,
          amounts: Object.fromEntries(selected.map((id) => [id, draft.amounts[id] ?? ""])),
          totalPaise,
        });
      }
      setDraft(null);
      return true;
    },
    discard: () => setDraft(null),
  };
}

export type PayerSplitForm = ReturnType<typeof usePayerSplit>;
