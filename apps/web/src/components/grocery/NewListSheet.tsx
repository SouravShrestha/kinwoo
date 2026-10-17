"use client";

import { useCreateList } from "@kinwoo/client/grocery";
import { toast } from "@kinwoo/client/toast";
import {
  DEFAULT_LIST_ICON,
  DEFAULT_LIST_VISIBILITY,
  LIST_NAME_MAX_LENGTH,
  listIconOption,
  listVisibilityOption,
  type ListVisibility,
} from "@kinwoo/core/grocery";
import { useRef, useState } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { SheetHeader } from "@/components/houses/SheetHeader";

import { CategoryIcon } from "./CategoryIcon";
import { ListIconPicker } from "./ListIconPicker";
import { ListVisibilityToggle } from "./ListVisibilityToggle";

export function NewListSheet({
  open,
  onClose,
  houseId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  houseId: string;
  onCreated?: (listId: string) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(DEFAULT_LIST_ICON);
  const [visibility, setVisibility] = useState<ListVisibility>(DEFAULT_LIST_VISIBILITY);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [transition, setTransition] = useState<"forward" | "back" | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const [formHeight, setFormHeight] = useState<number>();

  const showPicker = () => {
    setFormHeight(formRef.current?.offsetHeight);
    setTransition("forward");
    setPickingIcon(true);
  };

  const hidePicker = () => {
    setTransition("back");
    setPickingIcon(false);
  };

  const createList = useCreateList(houseId);
  const selectedIcon = listIconOption(icon);
  const selectedVisibility = listVisibilityOption(visibility);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      const created = await createList.mutateAsync({ name: trimmed, icon, visibility });
      toast.success(`Created list "${trimmed}"`);
      setName("");
      setIcon(DEFAULT_LIST_ICON);
      setVisibility(DEFAULT_LIST_VISIBILITY);
      setTransition(null);
      onClose();
      onCreated?.(created.id);
    } catch {
      toast.error("Failed to create list");
    }
  };

  const handleClose = () => {
    setPickingIcon(false);
    setTransition(null);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={handleClose} label="New list" className="min-h-[42dvh]">
      {pickingIcon ? (
        <div key="picker" className="sheet-view-forward" style={{ minHeight: formHeight }}>
          <ListIconPicker
            selected={icon}
            onBack={hidePicker}
            onSelect={(next) => {
              setIcon(next);
              hidePicker();
            }}
          />
        </div>
      ) : (
        <div
          key="form"
          ref={formRef}
          className={transition === "back" ? "sheet-view-back" : undefined}
        >
          <SheetHeader title="A fresh new list" />

          <form onSubmit={handleSubmit} className="mt-10 pb-4">
            <div className="flex gap-3">
              <button
                type="button"
                aria-label={`Icon: ${selectedIcon.label}. Change icon`}
                onClick={showPicker}
                className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-opacity hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                <CategoryIcon name={selectedIcon.label} size={26} />
              </button>
              <label htmlFor="list-name" className="sr-only">
                List name
              </label>
              <input
                id="list-name"
                type="text"
                required
                autoComplete="off"
                maxLength={LIST_NAME_MAX_LENGTH}
                placeholder="e.g. Party Supplies, Weekly Essentials"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 min-w-0 flex-1 rounded-xl bg-muted px-5 font-display text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-foreground"
              />
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-base text-foreground" aria-live="polite">
                  Your list is {selectedVisibility.label}
                </p>
                <p className="mt-1 font-display text-sm text-muted-foreground">
                  {selectedVisibility.description}
                </p>
              </div>
              <ListVisibilityToggle value={visibility} onChange={setVisibility} />
            </div>

            <div className="mt-10">
              <Button
                type="submit"
                label="Create List"
                loading={createList.isPending}
                disabled={!name.trim()}
              />
            </div>
          </form>
        </div>
      )}
    </BottomSheet>
  );
}
