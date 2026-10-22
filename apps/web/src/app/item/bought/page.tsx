import { MarkBoughtScreen } from "@/components/grocery/MarkBoughtScreen";

export const metadata = { title: "Mark as bought" };

export default async function MarkBoughtPage({
  searchParams,
}: {
  searchParams: Promise<{ listId?: string | string[]; itemId?: string | string[] }>;
}) {
  const { listId, itemId } = await searchParams;
  return (
    <MarkBoughtScreen
      listId={typeof listId === "string" ? listId : null}
      itemId={typeof itemId === "string" ? itemId : null}
    />
  );
}
