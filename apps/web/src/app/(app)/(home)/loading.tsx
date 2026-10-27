import { RouteLoading } from "@/components/RouteLoading";
import { HomeSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <HomeSkeleton />
    </RouteLoading>
  );
}
