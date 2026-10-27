import { RouteLoading } from "@/components/RouteLoading";
import { ExpenseDetailSkeleton, FormPageSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <FormPageSkeleton submit={false}>
        <ExpenseDetailSkeleton />
      </FormPageSkeleton>
    </RouteLoading>
  );
}
