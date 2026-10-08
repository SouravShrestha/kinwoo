import { TABS, type TabKey } from "@kinwoo/core/app";
import {
  BillIcon,
  HomeIcon,
  ListIcon,
  ProfileIcon,
  ProfileOutlineIcon,
} from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { Tabs } from "expo-router";
import type { ComponentType } from "react";

import { useTheme } from "@/theme/ThemeProvider";
import type { IconProps } from "@kinwoo/icons/native";

/**
 * Profile is the only tab with a distinct focused glyph; the rest use one icon
 * and rely on colour for state.
 */
const ICONS: Record<
  TabKey,
  { active: ComponentType<IconProps>; inactive: ComponentType<IconProps> }
> = {
  home: { active: HomeIcon, inactive: HomeIcon },
  tasks: { active: ListIcon, inactive: ListIcon },
  bills: { active: BillIcon, inactive: BillIcon },
  profile: { active: ProfileIcon, inactive: ProfileOutlineIcon },
};

/** Traced sizes differ per glyph, so each is nudged to look optically equal. */
const SIZES: Record<TabKey, number> = { home: 25, tasks: 26, bills: 24, profile: 24 };

/** expo-router's file routes; "/" maps to the group's index. */
const ROUTE_NAMES: Record<TabKey, string> = {
  home: "index",
  tasks: "tasks",
  bills: "bills",
  profile: "profile",
};

export default function TabsLayout() {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];

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
          height: 64,
        },
      }}
    >
      {TABS.map((tab) => {
        const { active: Active, inactive: Inactive } = ICONS[tab.key];

        return (
          <Tabs.Screen
            key={tab.key}
            name={ROUTE_NAMES[tab.key]}
            options={{
              title: tab.label,
              tabBarAccessibilityLabel: tab.label,
              // react-navigation types this as ColorValue, but it always hands
              // back one of the hex strings configured above.
              tabBarIcon: ({ focused, color }) =>
                focused ? (
                  <Active size={SIZES[tab.key]} color={color as string} />
                ) : (
                  <Inactive size={SIZES[tab.key]} color={color as string} />
                ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
