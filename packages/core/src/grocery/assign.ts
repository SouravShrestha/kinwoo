import type { AssignItemsResult } from "./types";

export type AssignOutcome = { tone: "success" | "error"; message: string };

function itemCount(count: number): string {
  return count === 1 ? "1 item" : `${count} items`;
}

function bulkOutcome(result: AssignItemsResult, done: (count: string) => string): AssignOutcome {
  const { assigned, requested } = result;
  if (assigned === 0) {
    return { tone: "error", message: "Those items were already taken by someone else." };
  }
  if (assigned < requested) {
    return {
      tone: "success",
      message: `${done(`${assigned} of ${requested} items`)}. The rest were already taken.`,
    };
  }
  return { tone: "success", message: done(itemCount(assigned)) };
}

export function bulkAssignOutcome(result: AssignItemsResult, assigneeName: string): AssignOutcome {
  return bulkOutcome(result, (count) => `Assigned ${count} to ${assigneeName}`);
}

export function bulkClaimOutcome(result: AssignItemsResult): AssignOutcome {
  return bulkOutcome(result, (count) => `Assigned ${count} to you`);
}

export function bulkDeleteOutcome(deleted: number, requested: number): AssignOutcome {
  if (deleted === 0) {
    return { tone: "error", message: "Couldn't delete those items. Try again." };
  }
  if (deleted < requested) {
    return {
      tone: "success",
      message: `Deleted ${deleted} of ${requested} items. The rest couldn't be deleted.`,
    };
  }
  return { tone: "success", message: `Deleted ${itemCount(deleted)}` };
}

export function bulkArchiveOutcome(archived: number, requested: number): AssignOutcome {
  if (archived === 0) {
    return { tone: "error", message: "Couldn't archive those items. Try again." };
  }
  if (archived < requested) {
    return {
      tone: "success",
      message: `Archived ${archived} of ${requested} items. The rest couldn't be archived.`,
    };
  }
  return { tone: "success", message: `Archived ${itemCount(archived)}` };
}

export function selectionLabel(count: number): string {
  return count === 1 ? "1 item selected" : `${count} items selected`;
}

export function pendingCountLabel(count: number): string {
  return `${itemCount(count)} to buy`;
}

export function assignedCountLabel(count: number): string {
  return `${itemCount(count)} assigned`;
}
