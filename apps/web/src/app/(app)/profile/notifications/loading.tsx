import { RouteLoading } from "@/components/RouteLoading";

import { NotificationSettingsLoading } from "./NotificationSettingsScreen";

export default function Loading() {
  return (
    <RouteLoading>
      <NotificationSettingsLoading />
    </RouteLoading>
  );
}
