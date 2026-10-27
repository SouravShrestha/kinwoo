import { RouteLoading } from "@/components/RouteLoading";
import { PaymentDetailSkeleton, SheetPageSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <SheetPageSkeleton>
        <PaymentDetailSkeleton />
      </SheetPageSkeleton>
    </RouteLoading>
  );
}
