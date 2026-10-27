import { RouteLoading } from "@/components/RouteLoading";
import {
  ExpenseRowsSkeleton,
  PrivateSpendingHeaderSkeleton,
  SheetPageSkeleton,
} from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <SheetPageSkeleton backClassName="-ml-1">
        <PrivateSpendingHeaderSkeleton />
        <ExpenseRowsSkeleton count={4} />
      </SheetPageSkeleton>
    </RouteLoading>
  );
}
