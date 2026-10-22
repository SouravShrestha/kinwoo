import { HOUSE_SCREEN_TITLES } from "@kinwoo/core/houses";

import { JoinScreen } from "@/components/houses/JoinScreen";

export const metadata = { title: HOUSE_SCREEN_TITLES.join };

export default async function JoinHousePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; confirm?: string }>;
}) {
  const { code, confirm } = await searchParams;

  return (
    <JoinScreen
      key={`${code ?? ""}:${confirm ?? ""}`}
      initialCode={code}
      confirmInitialCode={confirm === "1"}
    />
  );
}
