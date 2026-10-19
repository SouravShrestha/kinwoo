import { formatPaise, SHORT_MONTHS } from "../grocery/bought-groups";
import { monthLabel } from "../grocery/purchase-date";
import { memberDisplayName } from "../houses/members";
import { formatHundredths } from "./splits";
import type { Expense, HouseBalances, PairBalance } from "./types";

export type ExpenseMonth = { key: string; label: string; expenses: Expense[] };

// `spentOn` is a calendar date, so it is read as local midnight rather than UTC.
export function parseSpentOn(spentOn: string): Date {
  const [year, month, day] = spentOn.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function spentOnFor(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function spentOnParts(spentOn: string): { month: string; day: string } {
  const date = parseSpentOn(spentOn);
  return {
    month: SHORT_MONTHS[date.getMonth()] ?? "",
    day: String(date.getDate()).padStart(2, "0"),
  };
}

// Keeps the incoming order, which the API already sorts newest first.
export function groupExpensesByMonth(expenses: readonly Expense[]): ExpenseMonth[] {
  const months: ExpenseMonth[] = [];
  for (const expense of expenses) {
    const key = expense.spentOn.slice(0, 7);
    let month = months.find((entry) => entry.key === key);
    if (!month) {
      const date = parseSpentOn(expense.spentOn);
      month = { key, label: monthLabel(date.getFullYear(), date.getMonth()), expenses: [] };
      months.push(month);
    }
    month.expenses.push(expense);
  }
  return months;
}

export function paidBy(expense: Expense, userId: string | null): number {
  return expense.payers.find((payer) => payer.userId === userId)?.amountPaise ?? 0;
}

export function shareOf(expense: Expense, userId: string | null): number {
  return expense.shares.find((share) => share.userId === userId)?.sharePaise ?? 0;
}

export type ExpenseShareTone = "lent" | "borrowed" | "neutral";

export function expenseYourShare(
  expense: Expense,
  userId: string | null,
): { label: string; tone: ExpenseShareTone } {
  const paid = paidBy(expense, userId);
  const share = shareOf(expense, userId);
  const involved =
    expense.payers.some((payer) => payer.userId === userId) ||
    expense.shares.some((entry) => entry.userId === userId);
  if (!involved) return { label: "Not involved", tone: "neutral" };
  const difference = paid - share;
  if (difference > 0) return { label: `You lent ${formatPaise(difference)}`, tone: "lent" };
  if (difference < 0) {
    return { label: `You borrowed ${formatPaise(-difference)}`, tone: "borrowed" };
  }
  return { label: "You paid your share", tone: "neutral" };
}

export function expenseShareSummary(
  expense: Expense,
  userId: string | null,
): { label: string; amountPaise: number | null; tone: ExpenseShareTone } {
  const involved =
    expense.payers.some((payer) => payer.userId === userId) ||
    expense.shares.some((entry) => entry.userId === userId);
  if (!involved) return { label: "not involved", amountPaise: null, tone: "neutral" };
  const difference = paidBy(expense, userId) - shareOf(expense, userId);
  if (difference > 0) return { label: "you lent", amountPaise: difference, tone: "lent" };
  if (difference < 0) return { label: "you borrowed", amountPaise: -difference, tone: "borrowed" };
  return { label: "no balance", amountPaise: null, tone: "neutral" };
}

export function expensePayersLabel(expense: Expense, currentUserId: string | null): string {
  const names = expense.payers.map((payer) =>
    payer.userId === currentUserId ? "You" : memberDisplayName(payer.name),
  );
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} paid ${formatPaise(expense.amountPaise)}`;
  return `${names.length} people paid ${formatPaise(expense.amountPaise)}`;
}

export function canManageExpense(
  expense: Expense,
  userId: string | null,
  isAdmin: boolean,
): boolean {
  if (!userId) return false;
  if (isAdmin || expense.createdBy === userId) return true;
  return (
    expense.payers.some((payer) => payer.userId === userId) ||
    expense.shares.some((share) => share.userId === userId)
  );
}

export type BalanceTone = "owed" | "owe" | "neutral";

// Split around the amount so it can be coloured on its own.
export type BalanceText = { before: string; amount: string; after: string; tone: BalanceTone };

const joinBalanceText = (text: BalanceText) => `${text.before}${text.amount}${text.after}`;

export function balanceHeadlineParts(balances: HouseBalances): BalanceText {
  if (balances.netPaise > 0) {
    return {
      before: "You're owed ",
      amount: formatPaise(balances.netPaise),
      after: " overall",
      tone: "owed",
    };
  }
  if (balances.netPaise < 0) {
    return {
      before: "You owe ",
      amount: formatPaise(-balances.netPaise),
      after: " overall",
      tone: "owe",
    };
  }
  const before = balances.pairs.some((pair) => pair.netPaise !== 0)
    ? "You're even overall"
    : "All settled up";
  return { before, amount: "", after: "", tone: "neutral" };
}

export function balanceHeadline(balances: HouseBalances): string {
  return joinBalanceText(balanceHeadlineParts(balances));
}

export function pairBalanceParts(pair: PairBalance): BalanceText {
  const name = memberDisplayName(pair.name);
  if (pair.netPaise > 0) {
    return {
      before: `${name} owes you `,
      amount: formatPaise(pair.netPaise),
      after: "",
      tone: "owed",
    };
  }
  if (pair.netPaise < 0) {
    return {
      before: `You owe ${name} `,
      amount: formatPaise(-pair.netPaise),
      after: "",
      tone: "owe",
    };
  }
  return { before: `Settled with ${name}`, amount: "", after: "", tone: "neutral" };
}

export function pairBalanceLabel(pair: PairBalance): string {
  return joinBalanceText(pairBalanceParts(pair));
}

export function unsettledPairs(balances: HouseBalances): PairBalance[] {
  return balances.pairs.filter((pair) => pair.netPaise !== 0);
}

export function expenseSourceLabel(expense: Expense): string | null {
  if (!expense.source) return null;
  return expense.source.kind === "batch"
    ? "Recorded from a grocery purchase of several items"
    : "Recorded from a grocery purchase";
}

export function shareWeightLabel(expense: Expense, weight: number | null): string | null {
  if (weight === null) return null;
  if (expense.splitMethod === "percent") return `${formatHundredths(weight)}%`;
  if (expense.splitMethod === "shares") {
    return weight === 100 ? "1 share" : `${formatHundredths(weight)} shares`;
  }
  return null;
}
