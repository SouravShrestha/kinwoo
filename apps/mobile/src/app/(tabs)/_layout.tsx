import { rejectHouseRequired, useHouseAccess } from "@kinwoo/client/houses";
import { TABS, type TabKey } from "@kinwoo/core/app";
import {
  ActivitiesActiveIcon,
  ActivitiesIcon,
  BillActiveIcon,
  BillIcon,
  CartActiveIcon,
  CartIcon,
  HomeActiveIcon,
  HomeIcon,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Tabs, router, usePathname } from "expo-router";
import type { ComponentType } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBarIcon } from "@/components/TabBarIcon";
import { useTheme } from "@/theme/ThemeProvider";
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

const TAB_BAR_CONTENT_HEIGHT = 64;
const TAB_BAR_PADDING_TOP = 12;

export default function TabsLayout() {
  const { resolvedTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const palette = colors[resolvedTheme];
  const pathname = usePathname();
  const { hasNoHouse } = useHouseAccess();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: palette.foreground,
        tabBarInactiveTintColor: palette.mutedForeground,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: TAB_BAR_PADDING_TOP,
        },
      }}
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
  );
}
