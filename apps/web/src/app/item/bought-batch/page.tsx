import { BatchMarkBoughtScreen } from "@/components/grocery/BatchMarkBoughtScreen";

export const metadata = { title: "Mark items as bought" };

export default async function BatchMarkBoughtPage({
  searchParams,
}: {
  searchParams: Promise<{ listId?: string | string[]; itemIds?: string | string[] }>;
}) {
  const { listId, itemIds } = await searchParams;
  return (
    <BatchMarkBoughtScreen
      listId={typeof listId === "string" ? listId : null}
      itemIds={typeof itemIds === "string" ? itemIds.split(",").filter(Boolean) : []}
    />
  );
}
