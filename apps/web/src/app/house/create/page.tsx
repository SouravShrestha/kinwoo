import { HOUSE_SCREEN_TITLES } from "@kinwoo/core/houses";

import { CreateScreen } from "@/components/houses/CreateScreen";

export const metadata = { title: HOUSE_SCREEN_TITLES.create };

export default function CreateHousePage() {
  return <CreateScreen />;
}
