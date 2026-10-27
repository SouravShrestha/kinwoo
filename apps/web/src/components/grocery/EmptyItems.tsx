import type { GroceryEmptyCopy } from "@kinwoo/core/grocery";
import Image from "next/image";
import type { ReactNode } from "react";

export const EMPTY_IMAGES = {
  list: { src: "/images/empty-list.webp", width: 480, height: 576 },
  expense: { src: "/images/no-expense.webp", width: 480, height: 512 },
  activity: { src: "/images/no-activity.webp", width: 480, height: 432 },
  notifications: { src: "/images/no-notifications.webp", width: 480, height: 576 },
};

export function EmptyItems({
  image,
  title,
  hint,
  children,
}: Omit<GroceryEmptyCopy, "hint"> & {
  hint?: string | null;
  image: keyof typeof EMPTY_IMAGES;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center px-6 text-center font-display font-normal">
      <Image {...EMPTY_IMAGES[image]} alt="" loading="eager" className="size-40 object-contain" />
      <p className="mt-3 text-base text-foreground">{title}</p>
      {hint ? <p className="mt-2 text-base text-muted-foreground">{hint}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
