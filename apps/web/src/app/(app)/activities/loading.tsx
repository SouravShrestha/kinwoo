import { RouteLoading } from "@/components/RouteLoading";
import { ActivitiesSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <ActivitiesSkeleton />
    </RouteLoading>
  );
}
