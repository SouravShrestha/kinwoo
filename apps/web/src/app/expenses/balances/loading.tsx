import { RouteLoading } from "@/components/RouteLoading";
import { MemberBalanceRowsSkeleton, SheetPageSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <SheetPageSkeleton title="Balance Summary">
        <MemberBalanceRowsSkeleton />
      </SheetPageSkeleton>
    </RouteLoading>
  );
}
