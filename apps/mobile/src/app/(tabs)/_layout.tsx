import { createListStorage } from "@kinwoo/client/grocery";
import { rejectHouseRequired, useActiveHouse, useHouseAccess } from "@kinwoo/client/houses";
import { TABS, type TabKey } from "@kinwoo/core/app";
import {
  ActivitiesActiveIcon,
  ActivitiesIcon,
  BasketOutlineIcon,
  BillFilledIcon,
  BillActiveIcon,
  BillIcon,
  CartActiveIcon,
  CartIcon,
  HomeActiveIcon,
  HomeIcon,
} from "@kinwoo/icons/native";
import { BlurTargetView } from "expo-blur";
import { Tabs, router, usePathname } from "expo-router";
import { useRef, type ComponentType } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatingActionButton } from "@/components/FloatingActionButton";
import { TabBar } from "@/components/TabBar";
import { TabBarIcon } from "@/components/TabBarIcon";
import { openNewExpense } from "@/lib/house-navigation";
import { houseStorage } from "@/lib/house-storage";
import { TAB_BAR_HEIGHT, tabBarBottom } from "@/lib/tab-bar";
import type { IconProps } from "@kinwoo/icons/native";

const ICONS: Record<
  TabKey,
  { active: ComponentType<IconProps>; inactive: ComponentType<IconProps> }
> = {
  home: { active: HomeActiveIcon, inactive: HomeIcon },
  tasks: { active: CartActiveIcon, inactive: CartIcon },
  bills: { active: BillActiveIcon, inactive: BillIcon },
  activities: { active: ActivitiesActiveIcon, inactive: ActivitiesIcon },
};

/** Traced sizes differ per glyph, so each is nudged to look optically equal. */
const SIZES: Record<TabKey, number> = { home: 25, tasks: 25, bills: 24, activities: 26 };

const ROUTE_NAMES: Record<TabKey, string> = {
  home: "index",
  tasks: "tasks",
  bills: "bills",
  activities: "activities",
};

const SIDE = 16;
const ADD_SIZE = 48;
const ADD_GAP = 12;
const listStorage = createListStorage(houseStorage);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { hasNoHouse } = useHouseAccess();
  const { activeHouse } = useActiveHouse();
  const blurTarget = useRef<View>(null);
  const bottom = tabBarBottom(insets.bottom);

  const guard = (go: () => void) => {
    if (hasNoHouse) rejectHouseRequired(pathname, () => router.navigate("/"));
    else go();
  };

  // Adds to the list last picked on Tasks; /item/new falls back to the default list.
  const addItem = () => {
    const houseId = activeHouse?.house.id;
    void (houseId ? listStorage.loadSelectedList(houseId) : Promise.resolve(null)).then((listId) =>
      router.push(listId ? { pathname: "/item/new", params: { listId } } : "/item/new"),
    );
  };

  return (
    <View className="flex-1">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <Tabs
          screenOptions={{ headerShown: false }}
          // Floats over the screens, which pad themselves with useTabBarSpace().
          // ponytail: solid card instead of web's frosted blur, add expo-blur if that look matters.
          tabBar={(props) => (
            <TabBar
              {...props}
              style={{
                position: "absolute",
                left: SIDE,
                right: SIDE + ADD_SIZE + ADD_GAP,
                bottom,
              }}
            />
          )}
        >
          {TABS.map((tab) => {
            const { active: Active, inactive: Inactive } = ICONS[tab.key];

            return (
              <Tabs.Screen
                key={tab.key}
                name={ROUTE_NAMES[tab.key]}
                listeners={{
                  tabPress: (event) => {
                    if (!hasNoHouse || !tab.requiresHouse) return;
                    event.preventDefault();
                    rejectHouseRequired(pathname, () => router.navigate("/"));
                  },
                }}
                options={{
                  title: tab.label,
                  tabBarAccessibilityLabel: tab.label,
                  // react-navigation types this as ColorValue, but it always hands
                  // back one of the hex strings configured above.
                  tabBarIcon: ({ focused, color }) => (
                    <TabBarIcon
                      focused={focused}
                      color={color as string}
                      size={SIZES[tab.key]}
                      Active={Active}
                      Inactive={Inactive}
                    />
                  ),
                }}
              />
            );
          })}
        </Tabs>
      </BlurTargetView>
      <FloatingActionButton
        blurTarget={blurTarget}
        style={{
          position: "absolute",
          right: SIDE,
          bottom: bottom + (TAB_BAR_HEIGHT - ADD_SIZE) / 2,
        }}
        actions={[
          {
            label: "New Items",
            icon: (color) => <BasketOutlineIcon size={20} color={color} />,
            onSelect: () => guard(addItem),
          },
          {
            label: "New Expense",
            icon: (color) => <BillFilledIcon size={18} color={color} />,
            onSelect: () => guard(openNewExpense),
          },
        ]}
      />
    </View>
  );
}
