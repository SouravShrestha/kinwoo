import { useCreateList } from "@kinwoo/client/grocery";
import { toast } from "@kinwoo/client/toast";
import {
  DEFAULT_LIST_ICON,
  DEFAULT_LIST_VISIBILITY,
  LIST_NAME_MAX_LENGTH,
  listIconOption,
  listVisibilityOption,
  type GroceryList,
  type ListVisibility,
} from "@kinwoo/core/grocery";
import { colors } from "@kinwoo/tokens/native";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, FadeInLeft, FadeInRight } from "react-native-reanimated";

import { BottomSheet, SheetTextInput } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SheetHeader } from "@/components/houses/SheetHeader";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

import { ListIconPicker } from "./ListIconPicker";
import { ListVisibilityToggle } from "./ListVisibilityToggle";

const VIEW_FORWARD = FadeInRight.duration(240).easing(Easing.out(Easing.cubic));
const VIEW_BACK = FadeInLeft.duration(240).easing(Easing.out(Easing.cubic));

export function NewListSheet({
  open,
  onClose,
  houseId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  houseId: string;
  onCreated?: (list: GroceryList) => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(DEFAULT_LIST_ICON);
  const [visibility, setVisibility] = useState<ListVisibility>(DEFAULT_LIST_VISIBILITY);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [returnedFromPicker, setReturnedFromPicker] = useState(false);
  const [formHeight, setFormHeight] = useState<number>();

  const hidePicker = () => {
    setReturnedFromPicker(true);
    setPickingIcon(false);
  };

  const createList = useCreateList(houseId);
  const selectedIcon = listIconOption(icon);
  const selectedVisibility = listVisibilityOption(visibility);

  const handleReset = () => {
    setName("");
    setIcon(DEFAULT_LIST_ICON);
    setVisibility(DEFAULT_LIST_VISIBILITY);
    setPickingIcon(false);
    setReturnedFromPicker(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      const created = await createList.mutateAsync({ name: trimmed, icon, visibility });
      toast.success("List created");
      handleReset();
      onCreated?.(created);
      onClose();
    } catch {
      toast.error("Failed to create list");
    }
  };

  return (
    <BottomSheet open={open} onClose={handleClose} label="New List" minHeightRatio={0.42}>
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
          <SheetHeader title="A fresh new list" />

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

            <View className="mt-8 flex-row items-center justify-between gap-4">
              <View className="flex-1">
                <Text className="font-display-normal text-base text-foreground">
                  Your list is {selectedVisibility.label}
                </Text>
                <Text className="mt-1 font-display-normal text-sm text-muted-foreground">
                  {selectedVisibility.description}
                </Text>
              </View>
              <ListVisibilityToggle value={visibility} onChange={setVisibility} />
            </View>

            <Button
              label="Create List"
              loading={createList.isPending}
              disabled={!name.trim()}
              onPress={handleCreate}
              className="mt-10"
            />
          </View>
        </Animated.View>
      )}
    </BottomSheet>
  );
}
