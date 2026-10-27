import { RouteLoading } from "@/components/RouteLoading";
import { AddItemPageSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <AddItemPageSkeleton />
    </RouteLoading>
  );
}
