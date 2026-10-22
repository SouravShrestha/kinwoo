"use client";

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
import { CaretDownIcon, CloseIcon, FilterIcon, SortIcon, TickIcon } from "@kinwoo/icons";
import { useRef, useState, type ReactNode } from "react";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { SheetHeader } from "./houses/SheetHeader";
import { cn } from "@/lib/utils";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

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
  className,
}: {
  groups: readonly FilterGroup[];
  value: FilterSelection;
  onChange: (value: FilterSelection) => void;
  sort?: SortConfig;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterSelection>(value);
  const [draftSort, setDraftSort] = useState(sort?.value ?? "");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const total = countSelected(value);
  const sortActive = sort !== undefined && sort.value !== sort.defaultValue;
  const sortLabel = sort?.options.find((option) => option.id === sort.value)?.label;

  const openSheet = (groupId?: string) => {
    setDraft(value);
    setDraftSort(sort?.value ?? "");
    setActiveGroupId(groupId ?? sheetGroups[0]?.id ?? null);
    setOpen(true);
  };

  const toggleGroups = groups.filter((group) => group.toggle);
  const sheetGroups = groups.filter((group) => !group.toggle);
  const selectedGroups = sheetGroups.filter((group) => (value[group.id]?.length ?? 0) > 0);
  const otherGroups = sheetGroups.filter((group) => (value[group.id]?.length ?? 0) === 0);

  const renderToggleChip = (group: FilterGroup) => {
    const option = group.options[0];
    if (!option) return null;
    const active = isSelected(value, group.id, option.id);
    return (
      <Chip key={group.id} active={active}>
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onChange(toggleOption(value, group.id, option.id))}
          className={cn("rounded-xl px-3 py-2 hover:cursor-pointer hover:opacity-70", FOCUS_RING)}
        >
          {option.label}
        </button>
      </Chip>
    );
  };

  const renderGroupChip = (group: FilterGroup) => {
    const count = value[group.id]?.length ?? 0;
    return (
      <Chip key={group.id} active={count > 0}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={count > 0 ? `${group.label}, ${count} selected` : group.label}
          onClick={() => openSheet(group.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-2 hover:cursor-pointer hover:opacity-70",
            FOCUS_RING,
          )}
        >
          <span>{groupLabel(group, value)}</span>
          <CaretDownIcon size={7} />
        </button>
      </Chip>
    );
  };

  return (
    <>
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Filters"
        className={cn("flex gap-2 overflow-x-auto scrollbar-none", className)}
      >
        <Chip active={total > 0}>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={total > 0 ? `Filters, ${total} selected` : "Filters"}
            onClick={() => openSheet()}
            className={cn(
              "flex items-center gap-1.5 rounded-xl py-2 pl-3 pr-2.5 hover:cursor-pointer hover:opacity-70",
              FOCUS_RING,
            )}
          >
            <FilterIcon size={13} />
            <span>{total > 0 ? `Filters (${total})` : "Filters"}</span>
            <CaretDownIcon size={7} />
          </button>
          {total > 0 ? (
            <>
              <span aria-hidden className="h-4 w-px bg-foreground/40" />
              <button
                type="button"
                aria-label="Clear all filters"
                onClick={() => onChange(EMPTY_FILTER_SELECTION)}
                className={cn(
                  "rounded-xl py-2 pl-2.5 pr-3 text-foreground hover:cursor-pointer hover:opacity-70",
                  FOCUS_RING,
                )}
              >
                Clear
              </button>
            </>
          ) : null}
        </Chip>

        {toggleGroups.map(renderToggleChip)}

        {selectedGroups.map(renderGroupChip)}

        {sort ? (
          <Chip active={sortActive}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={sortLabel ? `Sort, ${sortLabel}` : "Sort"}
              onClick={() => openSheet(SORT_TAB_ID)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 hover:cursor-pointer hover:opacity-70",
                FOCUS_RING,
              )}
            >
              <SortIcon size={17} />
              <span>{sortLabel ?? "Sort"}</span>
              <CaretDownIcon size={7} />
            </button>
          </Chip>
        ) : null}

        {otherGroups.map(renderGroupChip)}
      </div>

      <FilterSheet
        open={open}
        onClose={() => setOpen(false)}
        groups={sheetGroups}
        selectionGroups={groups}
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
          toolbarRef.current?.scrollTo({ left: 0 });
        }}
      />
    </>
  );
}

function Chip({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center rounded-xl border bg-card font-display text-sm font-medium text-foreground transition-colors",
        active ? "border-foreground" : "border-border",
      )}
    >
      {children}
    </div>
  );
}

function FilterSheet({
  open,
  onClose,
  groups,
  selectionGroups,
  draft,
  onDraftChange,
  sortOptions,
  draftSort,
  defaultSort,
  onDraftSortChange,
  activeGroupId,
  onActiveGroupChange,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  groups: readonly FilterGroup[];
  selectionGroups: readonly FilterGroup[];
  draft: FilterSelection;
  onDraftChange: (draft: FilterSelection) => void;
  sortOptions: readonly SortOption[] | undefined;
  draftSort: string;
  defaultSort: string;
  onDraftSortChange: (sortId: string) => void;
  activeGroupId: string | null;
  onActiveGroupChange: (groupId: string) => void;
  onApply: () => void;
}) {
  const sortTabActive = sortOptions !== undefined && activeGroupId === SORT_TAB_ID;
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const selected = selectedEntries(selectionGroups, draft);
  const nothingToClear = selected.length === 0 && draftSort === defaultSort;
  const clearAll = () => {
    onDraftChange(EMPTY_FILTER_SELECTION);
    onDraftSortChange(defaultSort);
  };

  return (
    <BottomSheet open={open} onClose={onClose} label="Filters and sorting" showClose>
      <SheetHeader title="Filters and sorting" />

      {selected.length > 0 ? (
        <div className="-mx-6 mt-4 flex gap-2 overflow-x-auto px-6 [scrollbar-width:none]">
          {selected.map(({ group, option }) => (
            <button
              key={`${group.id}:${option.id}`}
              type="button"
              aria-label={`Remove ${option.label}`}
              onClick={() => onDraftChange(toggleOption(draft, group.id, option.id))}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl border border-foreground bg-card py-1.5 pl-3 pr-2 font-display text-sm font-medium text-foreground hover:cursor-pointer hover:opacity-70",
                FOCUS_RING,
              )}
            >
              <span>{option.label}</span>
              <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-background">
                <CloseIcon size={10} />
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex min-h-80 overflow-hidden rounded-2xl border border-border">
        <div
          role="tablist"
          aria-orientation="vertical"
          className="w-[38%] border-r border-border py-2"
        >
          {sortOptions ? (
            <TabButton
              active={sortTabActive}
              label="Sort by"
              onClick={() => onActiveGroupChange(SORT_TAB_ID)}
            />
          ) : null}
          {groups.map((group) => (
            <TabButton
              key={group.id}
              active={!sortTabActive && group.id === activeGroup?.id}
              label={groupLabel(group, draft)}
              onClick={() => onActiveGroupChange(group.id)}
            />
          ))}
        </div>

        <div role="tabpanel" className="flex-1 py-2">
          {sortTabActive
            ? sortOptions.map((option) => (
                <OptionRow
                  key={option.id}
                  role="radio"
                  checked={option.id === draftSort}
                  label={option.label}
                  onClick={() => onDraftSortChange(option.id)}
                />
              ))
            : activeGroup?.options.map((option) => (
                <OptionRow
                  key={option.id}
                  role="checkbox"
                  checked={isSelected(draft, activeGroup.id, option.id)}
                  label={option.label}
                  count={option.count}
                  onClick={() => onDraftChange(toggleOption(draft, activeGroup.id, option.id))}
                />
              ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex w-1/2 justify-start pl-8">
          <button
            type="button"
            disabled={nothingToClear}
            onClick={clearAll}
            className={cn(
              "rounded-md py-2 pr-2 font-display text-base font-medium text-foreground underline",
              nothingToClear
                ? "cursor-not-allowed opacity-50"
                : "hover:cursor-pointer hover:opacity-70",
              FOCUS_RING,
            )}
          >
            Clear all
          </button>
        </div>
        <Button label="Apply" onClick={onApply} className="w-1/2" />
      </div>
    </BottomSheet>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative block w-full px-4 py-3.5 text-left font-display text-sm hover:cursor-pointer",
        FOCUS_RING,
        active
          ? "bg-foreground/12 font-semibold text-foreground"
          : "font-normal text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-0 right-0 w-[3px] rounded-l-full bg-foreground"
        />
      ) : null}
    </button>
  );
}

function OptionRow({
  role,
  checked,
  label,
  count,
  onClick,
}: {
  role: "checkbox" | "radio";
  checked: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left font-display text-sm font-normal text-foreground hover:cursor-pointer hover:bg-muted/60",
        FOCUS_RING,
      )}
    >
      <span className="flex-1">
        {label}
        {count !== undefined ? <span className="text-muted-foreground"> ({count})</span> : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center border border-foreground text-background",
          role === "radio" ? "rounded-full" : "rounded-md",
          checked && "bg-foreground",
        )}
      >
        {checked ? <TickIcon size={11} /> : null}
      </span>
    </button>
  );
}
