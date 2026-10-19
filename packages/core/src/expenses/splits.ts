import { formatPaise } from "../grocery/bought-groups";
import { amountDraftToPaise, payerRemainingLabel, payerSplit } from "./payers";

export type SplitMethod = "equal" | "exact" | "percent" | "shares";

export const SPLIT_METHODS: readonly SplitMethod[] = ["equal", "exact", "percent", "shares"];

export const SPLIT_METHOD_LABELS: Record<SplitMethod, string> = {
  equal: "Equally",
  exact: "By amounts",
  percent: "By percent",
  shares: "By shares",
};

export const SPLIT_METHOD_TITLES: Record<SplitMethod, string> = {
  equal: "Split equally",
  exact: "Split by exact amounts",
  percent: "Split by percentages",
  shares: "Split by shares",
};

export type SplitInput =
  | { method: "equal"; included: readonly string[] }
  | { method: Exclude<SplitMethod, "equal">; values: Readonly<Record<string, string>> };

export type SplitResult = {
  sharesPaise: Record<string, number>;
  valid: boolean;
  summary: { primary: string; secondary: string; error: boolean };
};

const FULL_PERCENT = 10_000;

// Largest-remainder allocation, so the parts always add up to the total exactly.
export function allocatePaise(totalPaise: number, weights: readonly number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) return weights.map(() => 0);
  const exact = weights.map((weight) => (totalPaise * weight) / weightSum);
  const parts = exact.map(Math.floor);
  let leftover = totalPaise - parts.reduce((sum, part) => sum + part, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (leftover <= 0) break;
    parts[index] += 1;
    leftover -= 1;
  }
  return parts;
}

export function formatHundredths(value: number): string {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  if (fraction === 0) return `${sign}${whole}`;
  return `${sign}${whole}.${String(fraction).padStart(2, "0").replace(/0$/, "")}`;
}

function people(count: number): string {
  return count === 1 ? "1 person" : `${count} people`;
}

function byMember(memberIds: readonly string[], parts: readonly number[]): Record<string, number> {
  return Object.fromEntries(memberIds.map((id, index) => [id, parts[index] ?? 0]));
}

export function computeSplit(
  totalPaise: number,
  memberIds: readonly string[],
  input: SplitInput,
): SplitResult {
  if (input.method === "equal") {
    const included = memberIds.filter((id) => input.included.includes(id));
    const parts = allocatePaise(
      totalPaise,
      included.map(() => 1),
    );
    if (included.length === 0) {
      return {
        sharesPaise: byMember(memberIds, []),
        valid: false,
        summary: { primary: "Select at least one person", secondary: "", error: true },
      };
    }
    return {
      sharesPaise: byMember(included, parts),
      valid: totalPaise > 0,
      summary: {
        primary: `${formatPaise(Math.floor(totalPaise / included.length))}/person`,
        secondary: `(${people(included.length)})`,
        error: false,
      },
    };
  }

  const amounts = memberIds.map((id) => amountDraftToPaise(input.values[id] ?? ""));
  const sum = amounts.reduce((total, amount) => total + amount, 0);

  if (input.method === "exact") {
    const split = payerSplit(totalPaise, sum);
    return {
      sharesPaise: byMember(memberIds, amounts),
      valid: totalPaise > 0 && split.state === "balanced",
      summary: {
        primary: `${formatPaise(sum)} of ${formatPaise(totalPaise)}`,
        secondary: payerRemainingLabel(split),
        error: split.state === "over",
      },
    };
  }

  if (input.method === "percent") {
    const remaining = FULL_PERCENT - sum;
    // Only a complete 100% is allocated (so the parts add up); until then each share is its
    // literal percentage of the total rather than being scaled up to fill it.
    const parts =
      remaining === 0
        ? allocatePaise(totalPaise, amounts)
        : amounts.map((percent) => Math.round((totalPaise * percent) / FULL_PERCENT));
    return {
      sharesPaise: byMember(memberIds, parts),
      valid: totalPaise > 0 && remaining === 0,
      summary: {
        primary: `${formatHundredths(sum)}% of 100%`,
        secondary:
          remaining < 0
            ? `${formatHundredths(-remaining)}% over`
            : `${formatHundredths(remaining)}% left`,
        error: remaining < 0,
      },
    };
  }

  return {
    sharesPaise: byMember(memberIds, allocatePaise(totalPaise, amounts)),
    valid: totalPaise > 0 && sum > 0,
    summary: {
      primary: `${formatHundredths(sum)} total ${sum === 100 ? "share" : "shares"}`,
      secondary: sum > 0 ? "" : "Add at least one share",
      error: false,
    },
  };
}
