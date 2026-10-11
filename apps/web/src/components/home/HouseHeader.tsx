import { HousePinIcon, NotificationIcon } from "@kinwoo/icons";

type HouseHeaderProps = {
  name: string | null;
  address: string | null;
  onPressHouse: () => void;
};

export function HouseHeader({ name, address, onPressHouse }: HouseHeaderProps) {
  return (
    <>
      <h1 className="min-w-0 max-w-[70%] font-display text-lg font-medium">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onPressHouse}
          className="block w-full min-w-0 text-left hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <span className="-ml-1 flex items-center gap-1.5">
            {name ? <HousePinIcon size={18} className="shrink-0" /> : null}
            <span className="truncate font-display font-medium">{name ?? ""}</span>
          </span>
          {address ? (
            <span className="mt-0.5 block truncate text-xs font-display font-normal text-muted-foreground">
              {address}
            </span>
          ) : null}
        </button>
      </h1>
      <button
        type="button"
        aria-label="Notifications"
        className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <NotificationIcon size={22} />
      </button>
    </>
  );
}
