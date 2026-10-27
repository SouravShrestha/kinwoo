import { RouteLoading } from "@/components/RouteLoading";
import { NotificationsSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <NotificationsSkeleton />
    </RouteLoading>
  );
}
