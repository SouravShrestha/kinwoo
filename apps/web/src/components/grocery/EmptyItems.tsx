import type { GroceryEmptyCopy } from "@kinwoo/core/grocery";
import {
  NoAssignedIcon,
  NoActivityIcon,
  NoBoughtIcon,
  NoExpenseIcon,
  NoFilterMatchIcon,
  NoNotificationsIcon,
  NoPendingIcon,
  NoPrivateIcon,
  NoSettledIcon,
} from "@kinwoo/icons";
import type { ReactNode } from "react";

const EMPTY_ICONS = {
  pending: NoPendingIcon,
  assigned: NoAssignedIcon,
  bought: NoBoughtIcon,
  expense: NoExpenseIcon,
  settled: NoSettledIcon,
  private: NoPrivateIcon,
  activity: NoActivityIcon,
  notifications: NoNotificationsIcon,
  filter: NoFilterMatchIcon,
};

export function EmptyItems({
  icon,
  title,
  hint,
  children,
}: Omit<GroceryEmptyCopy, "hint"> & {
  hint?: string | null;
  icon: keyof typeof EMPTY_ICONS;
  children?: ReactNode;
}) {
  const Icon = EMPTY_ICONS[icon];
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center px-6 text-center font-display font-normal">
      <Icon size={52} className="text-foreground" />
      <p className="mt-5 text-base text-foreground">{title}</p>
      {hint ? <p className="mt-2 text-base text-muted-foreground">{hint}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
