import { Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { SheetHeader } from "@/components/houses/SheetHeader";
import { Pressable } from "@/components/Pressable";
import { AssignRowsSkeleton } from "@/components/skeleton/skeletons";

import { useAssignToMember } from "./useAssignToMember";

export function AssignSheet({
  open,
  onClose,
  houseId,
  listId,
  itemIds,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  houseId: string;
  listId: string;
  itemIds: string[];
  onAssigned?: () => void;
}) {
  const { members, isLoading, assign, isAssigning } = useAssignToMember({
    houseId,
    listId,
    itemIds,
    onAssigned: () => {
      onAssigned?.();
      onClose();
    },
  });

  const many = itemIds.length > 1;
  const title = many ? `Assign ${itemIds.length} items` : "Assign Item";

  return (
    <BottomSheet open={open} onClose={onClose} label={title}>
      <SheetHeader
        title={title}
        subtitle={
          many
            ? "Choose a house member to buy all of these"
            : "Choose a house member to assign this item"
        }
      />

      <View className="mt-4 gap-2">
        {isLoading ? (
          <AssignRowsSkeleton />
        ) : members.length === 0 ? (
          <View className="py-6 items-center">
            <Text className="text-sm text-muted-foreground font-display-normal">
              No other house members found
            </Text>
          </View>
        ) : (
          members.map((member) => {
            const displayName = member.displayName || member.email || "Member";

            return (
              <View
                key={member.userId}
                className="flex-row items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-base font-display-medium text-foreground" numberOfLines={1}>
                    {displayName}
                  </Text>
                  {member.role ? (
                    <Text className="text-xs text-muted-foreground capitalize font-display-normal">
                      {member.role}
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Assign to ${displayName}`}
                  disabled={isAssigning}
                  onPress={() => assign(member.userId, displayName)}
                  className="rounded-lg bg-primary px-3 py-1.5 active:opacity-70"
                >
                  <Text className="text-xs font-display-medium text-primary-foreground">
                    Assign
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    </BottomSheet>
  );
}
