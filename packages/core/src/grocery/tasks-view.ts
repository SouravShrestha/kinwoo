import type { FilterSelection } from "../filters";
import type { GroceryTabKey } from "./tabs";

// Where a link into the Lists screen lands: a tab plus the filters already applied on it.
export const TASKS_VIEWS = {
  pending: { tab: "pending", filters: {} },
  today: { tab: "pending", filters: { urgency: ["today"] } },
  assigned: { tab: "assigned", filters: {} },
  mine: { tab: "assigned", filters: { people: ["claimed_by_me", "assigned_to_me"] } },
} as const satisfies Record<string, { tab: GroceryTabKey; filters: FilterSelection }>;

export type TasksView = keyof typeof TASKS_VIEWS;

export function parseTasksView(value: unknown): TasksView | null {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TASKS_VIEWS, value)
    ? (value as TasksView)
    : null;
}
