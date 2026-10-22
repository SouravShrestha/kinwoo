import { AddItemScreen } from "@/components/grocery/AddItemScreen";

export const metadata = { title: "Add item" };

export default async function AddItemPage({
  searchParams,
}: {
  searchParams: Promise<{ listId?: string | string[] }>;
}) {
  const { listId } = await searchParams;
  return <AddItemScreen listId={typeof listId === "string" ? listId : null} />;
}
