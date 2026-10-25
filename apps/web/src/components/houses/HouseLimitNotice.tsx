"use client";

import { useHouseNavigation } from "@/lib/house-navigation";

import { Button } from "../Button";

export function HouseLimitNotice({ message }: { message: string }) {
  const { goHome } = useHouseNavigation();

  return (
    <div className="pt-4">
      <p className="font-display text-base font-normal leading-relaxed text-muted-foreground">
        {message}
      </p>
      <Button className="mt-10" label="Go home" onClick={goHome} />
    </div>
  );
}
