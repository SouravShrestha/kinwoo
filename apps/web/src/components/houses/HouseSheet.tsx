"use client";

import { useAuth } from "@kinwoo/client/auth";
import {
  useActiveHouse,
  useHouseMembers,
  useHouseSheetNav,
  useMemberConfirm,
  type HouseSheetView,
} from "@kinwoo/client/houses";
import { HOUSE_MENU_TITLE, leaveState, type HouseMembership } from "@kinwoo/core/houses";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { BottomSheet } from "../BottomSheet";
import { HouseMenuView } from "./HouseMenuView";
import { MemberConfirmDialog } from "./MemberConfirmDialog";
import { MemberView } from "./MemberView";
import { MembersView } from "./MembersView";
import { SettingsView } from "./SettingsView";

export function HouseSheet({
  open,
  onClose,
  initialView,
  onLeft,
}: {
  open: boolean;
  onClose: () => void;
  initialView?: HouseSheetView;
  onLeft?: () => void;
}) {
  const { activeHouse } = useActiveHouse();

  return (
    <BottomSheet
      open={open && activeHouse !== null}
      onClose={onClose}
      label={HOUSE_MENU_TITLE}
      showClose
    >
      {activeHouse ? (
        <HouseSheetContent
          membership={activeHouse}
          initialView={initialView}
          onClose={onClose}
          onLeft={onLeft}
        />
      ) : null}
    </BottomSheet>
  );
}

// Mounts only while the sheet is rendered, so the navigation stack starts fresh each time.
function HouseSheetContent({
  membership,
  initialView,
  onClose,
  onLeft,
}: {
  membership: HouseMembership;
  initialView?: HouseSheetView;
  onClose: () => void;
  onLeft?: () => void;
}) {
  const nav = useHouseSheetNav(initialView);
  const confirm = useMemberConfirm(membership.house.id, {
    onLeft: () => {
      onClose();
      onLeft?.();
    },
    onRemoved: nav.back,
  });
  const { user } = useAuth();
  const members = useHouseMembers(membership.house.id);
  const leave = members.data && user ? leaveState(members.data, user.id) : "ok";
  const onBack = nav.canGoBack ? nav.back : undefined;
  const { view } = nav;
  const onMenu = view.name === "menu";
  const ref = useRef<HTMLDivElement>(null);
  // Other views never shrink the sheet below the height the menu opened at.
  const [minHeight, setMinHeight] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!onMenu || !node) return;
    const observer = new ResizeObserver(() => {
      setMinHeight((current) => Math.max(current, node.offsetHeight));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onMenu]);

  let content: ReactNode;

  if (view.name === "members") {
    content = (
      <MembersView
        membership={membership}
        onBack={onBack}
        onSelect={(userId) => nav.push({ name: "member", userId })}
      />
    );
  } else if (view.name === "member") {
    content = (
      <MemberView membership={membership} userId={view.userId} confirm={confirm} onBack={onBack} />
    );
  } else if (view.name === "settings") {
    content = (
      <SettingsView membership={membership} confirm={confirm} onBack={onBack} onSaved={onClose} />
    );
  } else {
    content = <HouseMenuView membership={membership} onNavigate={nav.push} onClose={onClose} />;
  }

  return (
    <>
      <div ref={ref} className="pb-4" style={{ minHeight }}>
        {content}
      </div>
      <MemberConfirmDialog confirm={confirm} houseName={membership.house.name} leave={leave} />
    </>
  );
}
