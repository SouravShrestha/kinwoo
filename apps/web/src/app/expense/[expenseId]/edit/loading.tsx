import { RouteLoading } from "@/components/RouteLoading";
import { ExpenseFormPageSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <ExpenseFormPageSkeleton title="Edit expense" />
    </RouteLoading>
  );
}
