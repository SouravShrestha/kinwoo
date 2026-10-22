import { HOUSE_SCREEN_TITLES } from "@kinwoo/core/houses";

import { InviteScreen } from "@/components/houses/InviteScreen";

export const metadata = { title: HOUSE_SCREEN_TITLES.invite };

export default function InvitePage() {
  return <InviteScreen />;
}
