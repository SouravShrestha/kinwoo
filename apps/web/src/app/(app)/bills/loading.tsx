import { RouteLoading } from "@/components/RouteLoading";
import { BillsSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <BillsSkeleton />
    </RouteLoading>
  );
}
