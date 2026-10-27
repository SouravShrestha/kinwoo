import { parseTasksView } from "@kinwoo/core/grocery";

import { TasksScreen } from "./TasksScreen";

export const metadata = { title: "Lists" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const view = parseTasksView((await searchParams).view);
  return <TasksScreen key={view ?? "default"} view={view} />;
}
