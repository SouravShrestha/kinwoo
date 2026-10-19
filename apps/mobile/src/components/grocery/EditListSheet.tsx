import {
  groceryErrorFromCause,
  useDeleteList,
  useGroceryItems,
  useUpdateList,
} from "@kinwoo/client/grocery";
import { useHouseMembers } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { deleteListConfirmCopy, visibilityConfirmCopy } from "@kinwoo/core/confirm";
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
import { TrashIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, FadeInLeft, FadeInRight } from "react-native-reanimated";

import { BottomSheet, SheetTextInput } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/houses/Avatar";
import { SheetHeader } from "@/components/houses/SheetHeader";
import { Pressable } from "@/components/Pressable";
import { Switch } from "@/components/Switch";
import { useTheme } from "@/theme/ThemeProvider";

import { ListIconPicker } from "./ListIconPicker";
import { ListVisibilityToggle } from "./ListVisibilityToggle";

const VIEW_FORWARD = FadeInRight.duration(240).easing(Easing.out(Easing.cubic));
const VIEW_BACK = FadeInLeft.duration(240).easing(Easing.out(Easing.cubic));

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
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>("🛒");
  const [visibility, setVisibility] = useState<ListVisibility>("shared");
  const [isDefault, setIsDefault] = useState(false);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [returnedFromPicker, setReturnedFromPicker] = useState(false);
  const [formHeight, setFormHeight] = useState<number>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<UpdateListInput | null>(null);

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
    setReturnedFromPicker(false);
    setConfirmDelete(false);
    setPendingChanges(null);
  }

  if (!list) return null;

  const selectedIcon = listIconOption(icon);
  const wasDefault = list.isDefault;
  const canBeDefault = visibility !== "private";
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

  const hidePicker = () => {
    setReturnedFromPicker(true);
    setPickingIcon(false);
  };

  const handleSave = async () => {
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
      <BottomSheet open={open} onClose={onClose} label="Edit List" showClose minHeightRatio={0.42}>
        {pickingIcon ? (
          <Animated.View key="picker" entering={VIEW_FORWARD} style={{ minHeight: formHeight }}>
            <ListIconPicker
              selected={icon}
              onBack={hidePicker}
              onSelect={(next) => {
                setIcon(next);
                hidePicker();
              }}
            />
          </Animated.View>
        ) : (
          <Animated.View
            key="form"
            entering={returnedFromPicker ? VIEW_BACK : undefined}
            onLayout={(event) => setFormHeight(event.nativeEvent.layout.height)}
          >
            <SheetHeader title="Edit list" />

            <View className="mt-10 pb-4">
              <View className="flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Icon: ${selectedIcon.label}. Change icon`}
                  onPress={() => setPickingIcon(true)}
                  allowDoublePress
                  className="size-12 items-center justify-center rounded-xl bg-muted active:opacity-80"
                >
                  <CategoryIcon name={selectedIcon.label} size={26} color={palette.foreground} />
                </Pressable>
                <SheetTextInput
                  accessibilityLabel="List name"
                  placeholder="e.g. Party Supplies, Weekly Essentials"
                  placeholderTextColor={palette.mutedForeground}
                  value={name}
                  onChangeText={setName}
                  maxLength={LIST_NAME_MAX_LENGTH}
                  autoComplete="off"
                  returnKeyType="done"
                  className="h-12 min-w-0 flex-1 rounded-xl bg-muted px-5 font-display-normal text-base text-foreground"
                />
              </View>

              {canEditVisibility ? (
                <View className="mt-10 flex-row items-center justify-between gap-4">
                  <View className="flex-1">
                    <Text className="font-display-normal text-base text-foreground">
                      Visibility
                    </Text>
                    <Text className="mt-1 font-display-normal text-sm text-muted-foreground">
                      {wasDefault
                        ? "The default list is always public"
                        : visibility === "private"
                          ? "Only you can see and edit this list"
                          : "All housemates can see and add items"}
                    </Text>
                  </View>
                  <ListVisibilityToggle
                    value={visibility}
                    onChange={handleVisibilityChange}
                    disabled={wasDefault}
                  />
                </View>
              ) : null}

              {isAdmin && canBeDefault ? (
                <View className="mt-8 flex-row items-center justify-between gap-4">
                  <View className="flex-1">
                    <Text className="font-display-normal text-base text-foreground">
                      Default list
                    </Text>
                    <Text className="mt-1 font-display-normal text-sm text-muted-foreground">
                      {wasDefault
                        ? "This is the default. Set another list as default to change it."
                        : "New items land here"}
                    </Text>
                  </View>
                  <Switch
                    checked={isDefault}
                    disabled={wasDefault}
                    onChange={setIsDefault}
                    accessibilityLabel="Set as default list"
                  />
                </View>
              ) : null}

              {creator ? (
                <View className="mt-8">
                  <Text className="font-display-normal text-sm text-muted-foreground">
                    Created by
                  </Text>
                  <View className="mt-3 min-w-0 flex-row items-center gap-3">
                    <Avatar name={creator.displayName} url={creator.avatarUrl} size={36} />
                    <View className="min-w-0 flex-shrink">
                      <Text
                        numberOfLines={1}
                        className="font-display-normal text-base text-foreground"
                      >
                        {creator.userId === currentUserId
                          ? "You"
                          : memberDisplayName(creator.displayName)}
                      </Text>
                      {creator.email ? (
                        <Text
                          numberOfLines={1}
                          className="font-display-normal text-sm text-muted-foreground"
                        >
                          {creator.email}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : null}

              <View className="mt-10 flex-row gap-3">
                {!wasDefault && canDelete ? (
                  <DeleteButton disabled={isDeleting} onPress={() => setConfirmDelete(true)} />
                ) : null}
                <Button
                  label="Save Changes"
                  loading={updateList.isPending}
                  disabled={!name.trim() || isDeleting}
                  onPress={handleSave}
                  className="flex-1"
                />
              </View>
            </View>
          </Animated.View>
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
        copy={deleteListConfirmCopy(list.visibility)}
        isPending={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function DeleteButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Delete"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      // Token colours are `var(--x)` here, which Tailwind v3 cannot apply an opacity modifier to,
      // so the tint is built from the hex value (26 = 15% alpha).
      style={{ backgroundColor: `${palette.destructive}26` }}
      className={`size-14 items-center justify-center rounded-xl ${disabled ? "opacity-50" : "active:opacity-80"}`}
    >
      <TrashIcon size={20} color={palette.destructive} />
    </Pressable>
  );
}
