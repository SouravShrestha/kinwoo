import { RouteLoading } from "@/components/RouteLoading";
import { FormPageSkeleton, ItemFormSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <FormPageSkeleton>
        <ItemFormSkeleton variant="single" />
      </FormPageSkeleton>
    </RouteLoading>
  );
}
