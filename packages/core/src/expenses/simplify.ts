import type { HouseBalances, MemberNet, PairBalance } from "./types";

export type DebtTransfer = { fromId: string; toId: string; amountPaise: number };

const byAmountThenId = (a: { amount: number; id: string }, b: { amount: number; id: string }) =>
  b.amount - a.amount || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// Greedy: the biggest debtor pays the biggest creditor until one is cleared. This needs at most
// n - 1 transfers. Ties sort by id so every member's device arrives at the same set of transfers.
export function simplifyDebts(
  nets: readonly Pick<MemberNet, "userId" | "netPaise">[],
): DebtTransfer[] {
  const creditors = nets
    .filter((member) => member.netPaise > 0)
    .map((member) => ({ id: member.userId, amount: member.netPaise }))
    .sort(byAmountThenId);
  const debtors = nets
    .filter((member) => member.netPaise < 0)
    .map((member) => ({ id: member.userId, amount: -member.netPaise }))
    .sort(byAmountThenId);

  const transfers: DebtTransfer[] = [];
  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0]!;
    const debtor = debtors[0]!;
    const amount = Math.min(creditor.amount, debtor.amount);
    transfers.push({ fromId: debtor.id, toId: creditor.id, amountPaise: amount });
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount === 0) creditors.shift();
    else creditors.sort(byAmountThenId);
    if (debtor.amount === 0) debtors.shift();
    else debtors.sort(byAmountThenId);
  }
  return transfers;
}

export function simplifiedBalances(nets: readonly MemberNet[]): HouseBalances {
  const self = nets.find((member) => member.isSelf);
  if (!self) return { netPaise: 0, pairs: [] };
  const byId = new Map(nets.map((member) => [member.userId, member]));

  const pairs: PairBalance[] = [];
  for (const transfer of simplifyDebts(nets)) {
    const owedToSelf = transfer.toId === self.userId;
    if (!owedToSelf && transfer.fromId !== self.userId) continue;
    const other = byId.get(owedToSelf ? transfer.fromId : transfer.toId);
    if (!other) continue;
    pairs.push({
      userId: other.userId,
      name: other.name,
      avatarUrl: other.avatarUrl,
      netPaise: owedToSelf ? transfer.amountPaise : -transfer.amountPaise,
    });
  }
  pairs.sort((a, b) => Math.abs(b.netPaise) - Math.abs(a.netPaise));
  return { netPaise: self.netPaise, pairs };
}
