"use client";

import { listIconOption, type GroceryList } from "@kinwoo/core/grocery";
import { PlusCircleIcon } from "@kinwoo/icons";
import { useState } from "react";

import { CategoryIcon } from "./CategoryIcon";
import { NewListSheet } from "./NewListSheet";
import { OptionSheet } from "./OptionSheet";

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
            icon: <CategoryIcon name={listIconOption(list.icon).label} size={24} />,
          })),
          { id: NEW_LIST, label: "New list", icon: <PlusCircleIcon size={24} />, dashed: true },
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
        onCreated={onSelect}
      />
    </>
  );
}
