import { listIconOption, type GroceryList } from "@kinwoo/core/grocery";
import { CategoryIcon, PlusCircleIcon } from "@kinwoo/icons/native";
import { useState } from "react";

import { OptionSheet } from "@/components/OptionSheet";
import { NewListSheet } from "./NewListSheet";

const NEW_LIST = "__new_list__";

export function ListSwitcherSheet({
  open,
  onClose,
  lists,
  selectedListId,
  onSelect,
  houseId,
}: {
  open: boolean;
  onClose: () => void;
  lists: GroceryList[];
  selectedListId: string | null;
  onSelect: (listId: string) => void;
  houseId: string;
}) {
  const [newListOpen, setNewListOpen] = useState(false);

  return (
    <>
      <OptionSheet
        open={open}
        onClose={onClose}
        title="Choose a list"
        columns={3}
        options={[
          ...lists.map((list) => ({
            id: list.id,
            label: list.name,
            icon: (color: string) => (
              <CategoryIcon name={listIconOption(list.icon).label} size={24} color={color} />
            ),
          })),
          {
            id: NEW_LIST,
            label: "New list",
            icon: (color: string) => <PlusCircleIcon size={24} color={color} />,
            dashed: true,
          },
        ]}
        selectedId={selectedListId}
        onSelect={(id) => {
          onClose();
          if (id === NEW_LIST) {
            setNewListOpen(true);
            return;
          }
          onSelect(id);
        }}
      />

      <NewListSheet
        open={newListOpen}
        onClose={() => setNewListOpen(false)}
        houseId={houseId}
        onCreated={(created) => onSelect(created.id)}
      />
    </>
  );
}
