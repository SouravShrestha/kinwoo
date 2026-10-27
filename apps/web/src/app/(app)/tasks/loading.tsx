import { RouteLoading } from "@/components/RouteLoading";
import { TasksSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <TasksSkeleton />
    </RouteLoading>
  );
}
