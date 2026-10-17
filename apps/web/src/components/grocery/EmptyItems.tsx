import type { GroceryEmptyCopy } from "@kinwoo/core/grocery";

export function EmptyItems({ title, hint }: GroceryEmptyCopy) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center font-display">
      <div
        aria-hidden
        style={{ aspectRatio: 512 / 288, maskImage: "url(/images/no-item.png)" }}
        className="mb-4 w-3/5 max-w-56 bg-foreground mask-contain mask-center mask-no-repeat"
      />
      <p className="text-base text-foreground">{title}</p>
      {hint ? <p className="mt-2 text-base text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
