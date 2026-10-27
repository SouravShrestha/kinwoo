import { HOUSE_SCREEN_TITLES } from "@kinwoo/core/houses";

import { RouteLoading } from "@/components/RouteLoading";
import { HouseScreenSkeleton, InviteSkeleton } from "@/components/skeleton/skeletons";

export default function Loading() {
  return (
    <RouteLoading>
      <HouseScreenSkeleton title={HOUSE_SCREEN_TITLES.invite} dismissible>
        <InviteSkeleton />
      </HouseScreenSkeleton>
    </RouteLoading>
  );
}
