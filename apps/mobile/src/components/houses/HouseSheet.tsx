import { useAuth } from "@kinwoo/client/auth";
import {
  useActiveHouse,
  useHouseMembers,
  useHouseSheetNav,
  useMemberConfirm,
  type HouseSheetView,
} from "@kinwoo/client/houses";
import { HOUSE_MENU_TITLE, leaveState, type HouseMembership } from "@kinwoo/core/houses";
import { useState } from "react";
import { View } from "react-native";

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

// Mounts only while the sheet is presented, so the navigation stack starts fresh each time.
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
  // Other views never shrink the sheet below the height the menu opened at.
  const [minHeight, setMinHeight] = useState(0);
  const onMenu = view.name === "menu";

  return (
    <>
      <View
        className="pb-4"
        style={{ minHeight }}
        onLayout={(event) => {
          if (!onMenu) return;
          const { height } = event.nativeEvent.layout;
          setMinHeight((current) => Math.max(current, height));
        }}
      >
        {view.name === "members" ? (
          <MembersView
            membership={membership}
            onBack={onBack}
            onSelect={(userId) => nav.push({ name: "member", userId })}
          />
        ) : view.name === "member" ? (
          <MemberView
            membership={membership}
            userId={view.userId}
            confirm={confirm}
            onBack={onBack}
          />
        ) : view.name === "settings" ? (
          <SettingsView
            membership={membership}
            confirm={confirm}
            onBack={onBack}
            onSaved={onClose}
          />
        ) : (
          <HouseMenuView membership={membership} onNavigate={nav.push} onClose={onClose} />
        )}
      </View>

      <MemberConfirmDialog confirm={confirm} houseName={membership.house.name} leave={leave} />
    </>
  );
}
