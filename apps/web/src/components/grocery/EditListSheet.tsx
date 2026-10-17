"use client";

import {
  groceryErrorFromCause,
  useDeleteList,
  useGroceryItems,
  useUpdateList,
} from "@kinwoo/client/grocery";
import { useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { CONFIRM_COPY, visibilityConfirmCopy } from "@kinwoo/core/confirm";
import {
  groceryErrorMessage,
  itemsAssignedToOthers,
  LIST_NAME_MAX_LENGTH,
  listIconOption,
  type GroceryList,
  type ListVisibility,
  type UpdateListInput,
} from "@kinwoo/core/grocery";
import { memberDisplayName } from "@kinwoo/core/houses";
import { TrashIcon } from "@kinwoo/icons";
import { useRef, useState } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/houses/Avatar";
import { SheetHeader } from "@/components/houses/SheetHeader";
import { CategoryIcon } from "./CategoryIcon";
import { ListIconPicker } from "./ListIconPicker";
import { ListVisibilityToggle } from "./ListVisibilityToggle";

export function EditListSheet({
  open,
  onClose,
  houseId,
  list,
  isAdmin,
  currentUserId,
  onRemoved,
}: {
  open: boolean;
  onClose: () => void;
  houseId: string;
  list: GroceryList | null;
  isAdmin: boolean;
  currentUserId: string;
  onRemoved?: (listId: string) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>("🛒");
  const [visibility, setVisibility] = useState<ListVisibility>("shared");
  const [isDefault, setIsDefault] = useState(false);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [transition, setTransition] = useState<"forward" | "back" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<UpdateListInput | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const [formHeight, setFormHeight] = useState<number>();

  const listId = list?.id ?? "";
  const updateList = useUpdateList(houseId, listId);
  const deleteList = useDeleteList(houseId);
  const { data: items } = useGroceryItems(houseId, list?.id ?? null);
  const { data: members } = useHouseMembers(houseId);

  // Seed the form from the list each time the sheet opens for it, synced during
  // render so the first paint already shows the list's values.
  const sessionKey = open && list ? list.id : null;
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (sessionKey !== syncedKey) {
    setSyncedKey(sessionKey);
    if (list) {
      setName(list.name);
      setIcon(list.icon || "🛒");
      setVisibility(list.visibility);
      setIsDefault(list.isDefault);
    }
    setPickingIcon(false);
    setTransition(null);
    setConfirmDelete(false);
    setPendingChanges(null);
  }

  if (!list) return null;

  const selectedIcon = listIconOption(icon);
  const wasDefault = list.isDefault;
  const canBeDefault = visibility !== "private";
  // Name and icon can be changed by the creator or an Admin; visibility by the creator only.
  const canEditMeta = isAdmin || list.createdBy === currentUserId;
  const canEditVisibility = list.createdBy === currentUserId;
  const canDelete = canEditMeta;
  const creator = members?.find((member) => member.userId === list.createdBy);
  const isDeleting = deleteList.isPending;
  const hasItemsAssignedToOthers = itemsAssignedToOthers(items ?? [], list.createdBy).length > 0;
  const visibilityCopy = visibilityConfirmCopy(visibility);

  const handleVisibilityChange = (next: ListVisibility) => {
    if (next === "private" && hasItemsAssignedToOthers) {
      toast.error(groceryErrorMessage("LIST_HAS_ASSIGNED_ITEMS"));
      return;
    }
    setVisibility(next);
  };

  const showPicker = () => {
    setFormHeight(formRef.current?.offsetHeight);
    setTransition("forward");
    setPickingIcon(true);
  };

  const hidePicker = () => {
    setTransition("back");
    setPickingIcon(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const changes: UpdateListInput = {};
    if (trimmed !== list.name) changes.name = trimmed;
    if (icon !== list.icon) changes.icon = icon;
    if (canEditVisibility && visibility !== list.visibility) changes.visibility = visibility;
    if (isAdmin && isDefault && !list.isDefault) changes.isDefault = true;

    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    if (changes.visibility !== undefined) {
      setPendingChanges(changes);
      return;
    }

    await save(changes);
  };

  const save = async (changes: UpdateListInput) => {
    try {
      await updateList.mutateAsync(changes);
      toast.success("List updated");
      onClose();
    } catch (cause) {
      toast.error(groceryErrorFromCause(cause, "Failed to update list"));
    } finally {
      setPendingChanges(null);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteList.mutateAsync(list.id);
      toast.success(`Deleted "${list.name}"`);
      onClose();
      onRemoved?.(list.id);
    } catch {
      toast.error("Failed to delete list");
    } finally {
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        label="Edit list"
        showClose
        className="min-h-[42dvh]"
      >
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
            <SheetHeader title="Edit list" />

            <form onSubmit={handleSubmit} className="mt-10 pb-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  aria-label={`Icon: ${selectedIcon.label}. Change icon`}
                  onClick={canEditMeta ? showPicker : undefined}
                  disabled={!canEditMeta}
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-opacity hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CategoryIcon name={selectedIcon.label} size={26} />
                </button>
                <label htmlFor="edit-list-name" className="sr-only">
                  List name
                </label>
                <input
                  id="edit-list-name"
                  type="text"
                  required
                  autoComplete="off"
                  readOnly={!canEditMeta}
                  maxLength={LIST_NAME_MAX_LENGTH}
                  placeholder="e.g. Party Supplies, Weekly Essentials"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 min-w-0 flex-1 rounded-xl bg-muted px-5 font-display text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-foreground read-only:cursor-not-allowed read-only:opacity-60"
                />
              </div>

              {canEditVisibility ? (
                <div className="mt-10 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-display text-base text-foreground">Visibility</p>
                    <p className="mt-1 font-display text-sm text-muted-foreground">
                      {wasDefault
                        ? "The default list is always public"
                        : visibility === "private"
                          ? "Only you can see and edit this list"
                          : "All housemates can see and add items"}
                    </p>
                  </div>
                  <ListVisibilityToggle
                    value={visibility}
                    onChange={handleVisibilityChange}
                    disabled={wasDefault}
                  />
                </div>
              ) : null}

              {isAdmin && canBeDefault ? (
                <div className="mt-8 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-display text-base text-foreground">Default list</p>
                    <p className="mt-1 font-display text-sm text-muted-foreground">
                      {wasDefault
                        ? "This is the default. Set another list as default to change it."
                        : "New items land here"}
                    </p>
                  </div>
                  <DefaultToggle
                    checked={isDefault}
                    disabled={wasDefault}
                    onChange={setIsDefault}
                  />
                </div>
              ) : null}

              {creator ? (
                <div className="mt-8">
                  <p className="font-display text-sm text-muted-foreground">Created by</p>
                  <div className="mt-3 flex min-w-0 items-center gap-3">
                    <Avatar name={creator.displayName} url={creator.avatarUrl} size={36} />
                    <div className="min-w-0">
                      <p className="truncate font-display text-base text-foreground">
                        {creator.userId === currentUserId
                          ? "You"
                          : memberDisplayName(creator.displayName)}
                      </p>
                      {creator.email ? (
                        <p className="truncate font-display text-sm text-muted-foreground">
                          {creator.email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-10 flex gap-3">
                {!wasDefault && canDelete ? (
                  <DeleteButton disabled={isDeleting} onClick={() => setConfirmDelete(true)} />
                ) : null}
                <Button
                  type="submit"
                  label="Save Changes"
                  loading={updateList.isPending}
                  disabled={!name.trim() || isDeleting}
                  className="min-w-0 flex-1"
                />
              </div>
            </form>
          </div>
        )}
      </BottomSheet>

      <ConfirmDialog
        open={pendingChanges !== null}
        copy={visibilityCopy}
        isPending={updateList.isPending}
        onConfirm={() => pendingChanges && void save(pendingChanges)}
        onCancel={() => setPendingChanges(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        copy={CONFIRM_COPY.deleteList}
        isPending={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function DeleteButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Delete"
      disabled={disabled}
      onClick={onClick}
      className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive transition-opacity hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      <TrashIcon size={20} />
    </button>
  );
}

function DefaultToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Set as default list"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 shrink-0 rounded-full bg-muted-foreground/30 transition-colors aria-checked:bg-foreground hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span
        aria-hidden
        className="absolute left-1 top-1 size-5 rounded-full bg-muted-foreground transition-[transform,background-color] duration-200 ease-out data-[on=true]:translate-x-5 data-[on=true]:bg-background"
        data-on={checked}
      />
    </button>
  );
}
