import {
  countSelected,
  EMPTY_FILTER_SELECTION,
  groupLabel,
  isSelected,
  selectedEntries,
  toggleOption,
  type FilterGroup,
  type FilterSelection,
  type SortOption,
} from "@kinwoo/core/filters";
import { CaretDownIcon, CloseIcon, FilterIcon, SortIcon, TickIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useRef, useState, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { SheetHeader } from "./houses/SheetHeader";
import { Pressable } from "./Pressable";
import { useTheme } from "@/theme/ThemeProvider";

type Palette = (typeof colors)[keyof typeof colors];

// NativeWind cannot apply opacity modifiers to the var()-based token colours, so tints
// are built by appending an alpha byte to the token hex.
const tint = (hex: string, alpha: string) => `${hex}${alpha}`;

const SORT_TAB_ID = "__sort__";

export type SortConfig = {
  options: readonly SortOption[];
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
};

export function Filters({
  groups,
  value,
  onChange,
  sort,
  className = "pb-5",
}: {
  groups: readonly FilterGroup[];
  value: FilterSelection;
  onChange: (value: FilterSelection) => void;
  sort?: SortConfig;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterSelection>(value);
  const [draftSort, setDraftSort] = useState(sort?.value ?? "");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const chipsRef = useRef<ScrollView>(null);

  const total = countSelected(value);
  const sortActive = sort !== undefined && sort.value !== sort.defaultValue;
  const sortLabel = sort?.options.find((option) => option.id === sort.value)?.label;

  const openSheet = (groupId?: string) => {
    setDraft(value);
    setDraftSort(sort?.value ?? "");
    setActiveGroupId(groupId ?? groups[0]?.id ?? null);
    setOpen(true);
  };

  const selectedGroups = groups.filter((group) => (value[group.id]?.length ?? 0) > 0);
  const otherGroups = groups.filter((group) => (value[group.id]?.length ?? 0) === 0);

  const renderGroupChip = (group: FilterGroup) => {
    const count = value[group.id]?.length ?? 0;
    return (
      <Chip key={group.id} active={count > 0} palette={palette}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={count > 0 ? `${group.label}, ${count} selected` : group.label}
          onPress={() => openSheet(group.id)}
          className="flex-row items-center gap-1.5 px-3 py-2 active:opacity-70"
        >
          <Text className="font-display-medium text-sm text-foreground">
            {groupLabel(group, value)}
          </Text>
          <CaretDownIcon size={7} color={palette.foreground} />
        </Pressable>
      </Chip>
    );
  };

  return (
    <>
      <ScrollView
        ref={chipsRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0"
        contentContainerClassName={`gap-2 px-5 pt-3 ${className}`}
      >
        <Chip active={total > 0} palette={palette}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={total > 0 ? `Filters, ${total} selected` : "Filters"}
            onPress={() => openSheet()}
            className="flex-row items-center gap-1.5 py-2 pl-3 pr-2.5 active:opacity-70"
          >
            <FilterIcon size={13} color={palette.foreground} />
            <Text className="font-display-medium text-sm text-foreground">
              {total > 0 ? `Filters (${total})` : "Filters"}
            </Text>
            <CaretDownIcon size={7} color={palette.foreground} />
          </Pressable>
          {total > 0 ? (
            <>
              <View
                className="h-4 w-px"
                style={{ backgroundColor: tint(palette.foreground, "66") }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
                onPress={() => onChange(EMPTY_FILTER_SELECTION)}
                className="py-2 pl-2.5 pr-3 active:opacity-70"
              >
                <Text className="font-display-medium text-sm" style={{ color: palette.foreground }}>
                  Clear
                </Text>
              </Pressable>
            </>
          ) : null}
        </Chip>

        {selectedGroups.map(renderGroupChip)}

        {sort ? (
          <Chip active={sortActive} palette={palette}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={sortLabel ? `Sort, ${sortLabel}` : "Sort"}
              onPress={() => openSheet(SORT_TAB_ID)}
              className="flex-row items-center gap-1.5 px-3 py-2 active:opacity-70"
            >
              <SortIcon size={17} color={palette.foreground} />
              <Text className="font-display-medium text-sm text-foreground">
                {sortLabel ?? "Sort"}
              </Text>
              <CaretDownIcon size={7} color={palette.foreground} />
            </Pressable>
          </Chip>
        ) : null}

        {otherGroups.map(renderGroupChip)}
      </ScrollView>

      <FilterSheet
        open={open}
        onClose={() => setOpen(false)}
        groups={groups}
        draft={draft}
        onDraftChange={setDraft}
        sortOptions={sort?.options}
        draftSort={draftSort}
        defaultSort={sort?.defaultValue ?? ""}
        onDraftSortChange={setDraftSort}
        activeGroupId={activeGroupId}
        onActiveGroupChange={setActiveGroupId}
        onApply={() => {
          onChange(draft);
          sort?.onChange(draftSort);
          setOpen(false);
          chipsRef.current?.scrollTo({ x: 0, animated: false });
        }}
        palette={palette}
      />
    </>
  );
}

function Chip({
  active,
  palette,
  children,
}: {
  active: boolean;
  palette: Palette;
  children: ReactNode;
}) {
  return (
    <View
      className="flex-row items-center rounded-xl border"
      style={{
        borderColor: active ? palette.foreground : palette.border,
        backgroundColor: palette.card,
      }}
    >
      {children}
    </View>
  );
}

function FilterSheet({
  open,
  onClose,
  groups,
  draft,
  onDraftChange,
  sortOptions,
  draftSort,
  defaultSort,
  onDraftSortChange,
  activeGroupId,
  onActiveGroupChange,
  onApply,
  palette,
}: {
  open: boolean;
  onClose: () => void;
  groups: readonly FilterGroup[];
  draft: FilterSelection;
  onDraftChange: (draft: FilterSelection) => void;
  sortOptions: readonly SortOption[] | undefined;
  draftSort: string;
  defaultSort: string;
  onDraftSortChange: (sortId: string) => void;
  activeGroupId: string | null;
  onActiveGroupChange: (groupId: string) => void;
  onApply: () => void;
  palette: Palette;
}) {
  const sortTabActive = sortOptions !== undefined && activeGroupId === SORT_TAB_ID;
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const selected = selectedEntries(groups, draft);
  const nothingToClear = selected.length === 0 && draftSort === defaultSort;
  const clearAll = () => {
    onDraftChange(EMPTY_FILTER_SELECTION);
    onDraftSortChange(defaultSort);
  };

  return (
    <BottomSheet open={open} onClose={onClose} label="Filters and sorting" showClose>
      <SheetHeader title="Filters and sorting" />

      {selected.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-6 mt-4 grow-0"
          contentContainerClassName="gap-2 px-6"
        >
          {selected.map(({ group, option }) => (
            <Pressable
              key={`${group.id}:${option.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${option.label}`}
              onPress={() => onDraftChange(toggleOption(draft, group.id, option.id))}
              className="flex-row items-center gap-1.5 rounded-xl border py-1.5 pl-3 pr-2 active:opacity-70"
              style={{
                borderColor: palette.foreground,
                backgroundColor: palette.card,
              }}
            >
              <Text className="font-display-medium text-sm text-foreground">{option.label}</Text>
              <View
                className="size-4 items-center justify-center rounded-full"
                style={{ backgroundColor: palette.foreground }}
              >
                <CloseIcon size={10} color={palette.background} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View
        className="mt-4 flex-row overflow-hidden rounded-2xl border border-border"
        style={{ minHeight: 320 }}
      >
        <View className="w-[38%] border-r border-border py-2">
          {sortOptions ? (
            <TabButton
              active={sortTabActive}
              label="Sort by"
              palette={palette}
              onPress={() => onActiveGroupChange(SORT_TAB_ID)}
            />
          ) : null}
          {groups.map((group) => (
            <TabButton
              key={group.id}
              active={!sortTabActive && group.id === activeGroup?.id}
              label={groupLabel(group, draft)}
              palette={palette}
              onPress={() => onActiveGroupChange(group.id)}
            />
          ))}
        </View>

        <View className="flex-1 py-2">
          {sortTabActive
            ? sortOptions.map((option) => (
                <OptionRow
                  key={option.id}
                  role="radio"
                  checked={option.id === draftSort}
                  label={option.label}
                  palette={palette}
                  onPress={() => onDraftSortChange(option.id)}
                />
              ))
            : activeGroup?.options.map((option) => (
                <OptionRow
                  key={option.id}
                  role="checkbox"
                  checked={isSelected(draft, activeGroup.id, option.id)}
                  label={option.label}
                  count={option.count}
                  palette={palette}
                  onPress={() => onDraftChange(toggleOption(draft, activeGroup.id, option.id))}
                />
              ))}
        </View>
      </View>

      <View className="mt-5 flex-row items-center justify-between">
        <View className="w-1/2 items-start">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all"
            accessibilityState={{ disabled: nothingToClear }}
            disabled={nothingToClear}
            onPress={clearAll}
            className={`ml-6 py-2 pr-2 ${nothingToClear ? "opacity-50" : "active:opacity-70"}`}
          >
            <Text className="font-display-medium text-base text-foreground underline">
              Clear all
            </Text>
          </Pressable>
        </View>
        <Button label="Apply" onPress={onApply} className="w-1/2" />
      </View>
    </BottomSheet>
  );
}

function TabButton({
  active,
  label,
  palette,
  onPress,
}: {
  active: boolean;
  label: string;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="justify-center px-4 py-3.5"
      style={active ? { backgroundColor: tint(palette.foreground, "1F") } : undefined}
    >
      <Text
        className={[
          "text-sm",
          active
            ? "font-display-semibold text-foreground"
            : "font-display-normal text-muted-foreground",
        ].join(" ")}
      >
        {label}
      </Text>
      {active ? (
        <View
          className="absolute bottom-0 right-0 top-0 w-[3px] rounded-l-full"
          style={{ backgroundColor: palette.foreground }}
        />
      ) : null}
    </Pressable>
  );
}

function OptionRow({
  role,
  checked,
  label,
  count,
  palette,
  onPress,
}: {
  role: "checkbox" | "radio";
  checked: boolean;
  label: string;
  count?: number;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-row items-center justify-between gap-3 px-4 py-3.5 active:opacity-70"
    >
      <Text className="flex-1 font-display-normal text-sm text-foreground">
        {label}
        {count !== undefined ? <Text className="text-muted-foreground"> ({count})</Text> : null}
      </Text>
      <View
        className={`size-5 items-center justify-center border ${role === "radio" ? "rounded-full" : "rounded-md"}`}
        style={{
          borderColor: palette.foreground,
          backgroundColor: checked ? palette.foreground : "transparent",
        }}
      >
        {checked ? <TickIcon size={11} color={palette.background} /> : null}
      </View>
    </Pressable>
  );
}
