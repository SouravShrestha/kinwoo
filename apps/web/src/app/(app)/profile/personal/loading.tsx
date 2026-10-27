import { RouteLoading } from "@/components/RouteLoading";
import { PersonalInformationSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <PersonalInformationSkeleton />
    </RouteLoading>
  );
}
