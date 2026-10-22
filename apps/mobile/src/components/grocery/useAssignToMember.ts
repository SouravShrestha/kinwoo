import { useAuth } from "@kinwoo/client/auth";
import { useAssignItem, useAssignItems } from "@kinwoo/client/grocery";
import { useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { bulkAssignOutcome } from "@kinwoo/core/grocery";

export function useAssignToMember({
  houseId,
  listId,
  itemIds,
  onAssigned,
}: {
  houseId: string;
  listId: string;
  itemIds: string[];
  onAssigned?: () => void;
}) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const { data: members, isLoading } = useHouseMembers(houseId);
  const assignItem = useAssignItem(houseId, listId);
  const assignItems = useAssignItems(houseId, listId, currentUserId);

  const eligibleMembers = (members ?? []).filter((m) => m.userId !== currentUserId);
  const self = (members ?? []).find((m) => m.userId === currentUserId);

  const assign = async (assignedTo: string, memberName: string) => {
    if (assignItem.isPending || itemIds.length === 0) return;

    // The optimistic update moves the items out of Pending at once, so finish straight away and
    // report the outcome by toast; the error path rolls the cache back.
    if (itemIds.length > 1) {
      assignItems.mutate(
        { itemIds, assignedTo, assignedToName: memberName },
        {
          onSuccess: (result) => {
            const outcome = bulkAssignOutcome(result, memberName);
            if (outcome.tone === "error") toast.error(outcome.message);
            else toast.success(outcome.message);
          },
          onError: () => toast.error("Couldn't assign those items. Try again."),
        },
      );
      onAssigned?.();
      return;
    }

    try {
      await assignItem.mutateAsync({ itemId: itemIds[0]!, assignedTo });
      toast.success(`Assigned to ${memberName}`);
      onAssigned?.();
    } catch {
      toast.error("Failed to assign item");
    }
  };

  return { members: eligibleMembers, self, isLoading, assign, isAssigning: assignItem.isPending };
}
