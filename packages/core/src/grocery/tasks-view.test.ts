import { describe, expect, it } from "vitest";

import { pruneSelection } from "../filters";
import { groceryFilterGroups } from "./filters";
import { parseTasksView, TASKS_VIEWS, type TasksView } from "./tasks-view";

const views = Object.keys(TASKS_VIEWS) as TasksView[];

describe("parseTasksView", () => {
  it("accepts every known view", () => {
    for (const view of views) expect(parseTasksView(view)).toBe(view);
  });

  it("rejects unknown, inherited and non-string values", () => {
    for (const value of ["", "bought", "constructor", "toString", undefined, null, ["mine"], 1]) {
      expect(parseTasksView(value)).toBeNull();
    }
  });
});

describe("TASKS_VIEWS", () => {
  it("only preselects filter options that exist on the view's tab", () => {
    for (const view of views) {
      const { tab, filters } = TASKS_VIEWS[view];
      const groups = groceryFilterGroups(tab, [], "user");
      expect(pruneSelection(filters, groups), view).toBe(filters);
    }
  });
});
