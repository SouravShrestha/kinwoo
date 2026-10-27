import { RouteLoading } from "@/components/RouteLoading";
import { SheetPageSkeleton, TotalsSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <SheetPageSkeleton>
        <TotalsSkeleton />
      </SheetPageSkeleton>
    </RouteLoading>
  );
}
