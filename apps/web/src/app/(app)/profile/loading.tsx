import { RouteLoading } from "@/components/RouteLoading";
import { ProfileSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <ProfileSkeleton />
    </RouteLoading>
  );
}
