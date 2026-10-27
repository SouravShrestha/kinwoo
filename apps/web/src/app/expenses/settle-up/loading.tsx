import { RouteLoading } from "@/components/RouteLoading";
import { SettleUpSkeleton, SheetPageSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <SheetPageSkeleton>
        <SettleUpSkeleton />
      </SheetPageSkeleton>
    </RouteLoading>
  );
}
