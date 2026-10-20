import type { ListItemsWithHistory } from "@kinwoo/client/grocery";

// Recent purchases load with the list; this reaches further back one page at a time.
export function OlderPurchasesButton({
  history,
}: {
  history: Pick<ListItemsWithHistory, "hasOlder" | "loadingOlder" | "loadOlder">;
}) {
  if (!history.hasOlder) return null;

  return (
    <div className="mt-6 flex justify-center">
      <button
        type="button"
        disabled={history.loadingOlder}
        onClick={history.loadOlder}
        className="rounded-lg px-3 py-2 font-display text-sm font-medium text-foreground transition-colors hover:cursor-pointer hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {history.loadingOlder ? "Loading…" : "Show older purchases"}
      </button>
    </div>
  );
}
