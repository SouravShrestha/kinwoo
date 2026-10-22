import {
  computeSplit,
  isAmountDraft,
  SPLIT_METHOD_LABELS,
  type SplitInput,
  type SplitMethod,
} from "@kinwoo/core/expenses";
import { useState } from "react";

import type { PayerMember } from "./payer-split";

type ValueMethod = Exclude<SplitMethod, "equal">;

// Storing who is left out (rather than who is in) keeps members who load later included.
type SplitChoice = {
  method: SplitMethod;
  excluded: string[];
  values: Record<ValueMethod, Record<string, string>>;
};

const EMPTY_VALUES: SplitChoice["values"] = {
  exact: {},
  percent: {},
  shares: {},
};

const DEFAULT_CHOICE: SplitChoice = { method: "equal", excluded: [], values: EMPTY_VALUES };

// Exact amounts stop adding up when the price changes, so they are cleared; a committed exact
// split falls back to an equal one.
function forNewTotal(choice: SplitChoice): SplitChoice {
  return {
    method: choice.method === "exact" ? "equal" : choice.method,
    excluded: choice.excluded,
    values: { ...choice.values, exact: {} },
  };
}

function inputOf(choice: SplitChoice, memberIds: readonly string[]): SplitInput {
  if (choice.method === "equal") {
    return { method: "equal", included: memberIds.filter((id) => !choice.excluded.includes(id)) };
  }
  return { method: choice.method, values: choice.values[choice.method] };
}

export type ExpenseSplitSeed = {
  method: SplitMethod;
  excluded: readonly string[];
  values: Readonly<Record<string, string>>;
};

function choiceFrom(seed: ExpenseSplitSeed | undefined): SplitChoice {
  if (!seed) return DEFAULT_CHOICE;
  return {
    method: seed.method,
    excluded: [...seed.excluded],
    values:
      seed.method === "equal"
        ? EMPTY_VALUES
        : { ...EMPTY_VALUES, [seed.method]: { ...seed.values } },
  };
}

// Edits in the sheet stay a draft until `commit`; `discard` drops them.
export function useExpenseSplit({
  members,
  totalPaise,
  initial,
}: {
  members: readonly PayerMember[];
  totalPaise: number;
  initial?: ExpenseSplitSeed;
}) {
  const [choice, setChoice] = useState<SplitChoice>(() => choiceFrom(initial));
  const [draft, setDraft] = useState<SplitChoice | null>(null);

  const [choiceTotal, setChoiceTotal] = useState(totalPaise);
  if (choiceTotal !== totalPaise) {
    setChoiceTotal(totalPaise);
    setChoice(forNewTotal(choice));
    setDraft(draft ? forNewTotal(draft) : null);
  }

  const editing = draft ?? choice;
  const memberIds = members.map((member) => member.userId);
  const result = computeSplit(totalPaise, memberIds, inputOf(editing, memberIds));
  const allIncluded = memberIds.every((id) => !editing.excluded.includes(id));

  const toggle = (userId: string) => {
    setDraft({
      ...editing,
      excluded: editing.excluded.includes(userId)
        ? editing.excluded.filter((id) => id !== userId)
        : [...editing.excluded, userId],
    });
  };

  const setValue = (userId: string, text: string) => {
    if (editing.method === "equal" || !isAmountDraft(text)) return;
    const method = editing.method;
    setDraft({
      ...editing,
      values: { ...editing.values, [method]: { ...editing.values[method], [userId]: text } },
    });
  };

  return {
    members,
    method: editing.method,
    label: SPLIT_METHOD_LABELS[choice.method],
    setMethod: (method: SplitMethod) => setDraft({ ...editing, method }),
    isIncluded: (userId: string) => !editing.excluded.includes(userId),
    allIncluded,
    toggle,
    toggleAll: () => setDraft({ ...editing, excluded: allIncluded ? [...memberIds] : [] }),
    valueText: (userId: string) =>
      editing.method === "equal" ? "" : (editing.values[editing.method][userId] ?? ""),
    setValue,
    shareOf: (userId: string) => result.sharesPaise[userId] ?? 0,
    sharesPaise: result.sharesPaise,
    values: editing.method === "equal" ? {} : editing.values[editing.method],
    summary: result.summary,
    canCommit: result.valid,
    commit: (): boolean => {
      if (!result.valid) return false;
      if (draft) setChoice(draft);
      setDraft(null);
      return true;
    },
    discard: () => setDraft(null),
  };
}

export type ExpenseSplitForm = ReturnType<typeof useExpenseSplit>;
