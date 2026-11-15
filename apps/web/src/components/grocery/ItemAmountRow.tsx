import { RupeeIcon } from "@kinwoo/icons";

import { ItemCategoryImage } from "@/components/CategoryImages";

// One item of a batch purchase with its own amount field.
export function ItemAmountRow({
  id,
  name,
  detail,
  categoryName,
  value,
  error,
  onChange,
}: {
  id: string;
  name: string;
  detail?: string;
  categoryName: string | null;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}) {
  const inputId = `item-amount-${id}`;
  return (
    <li>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"
        >
          <ItemCategoryImage name={categoryName ?? undefined} size={40} />
        </span>
        <label htmlFor={inputId} className="min-w-0 flex-1 font-display font-normal">
          <span className="block truncate text-base text-foreground">{name}</span>
          {detail ? (
            <span className="block truncate text-sm text-muted-foreground">{detail}</span>
          ) : null}
        </label>
        <div className="flex h-12 w-28 shrink-0 items-center gap-1.5 rounded-xl bg-muted px-3 font-display text-base font-normal text-foreground focus-within:outline-2 focus-within:outline-primary">
          <RupeeIcon size={14} className="shrink-0 text-muted-foreground" />
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-hint` : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-right outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      {error ? (
        <p
          id={`${inputId}-hint`}
          role="alert"
          className="mt-2 text-right font-display text-sm font-normal text-destructive"
        >
          {error}
        </p>
      ) : null}
    </li>
  );
}
