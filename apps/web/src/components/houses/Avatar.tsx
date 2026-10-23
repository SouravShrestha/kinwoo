import { memberInitial } from "@kinwoo/core/houses";

import { cn } from "@/lib/utils";

export function Avatar({
  name,
  url,
  size = 40,
  tone = "muted",
}: {
  name: string | null;
  url: string | null;
  size?: number;
  tone?: "muted" | "background";
}) {
  const frame = { width: size, height: size };

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        tone === "background" ? "bg-background" : "bg-muted",
      )}
      style={frame}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          className="size-full rounded-full object-cover"
        />
      ) : (
        <span className="font-medium" style={{ fontSize: size * 0.4 }}>
          {memberInitial(name)}
        </span>
      )}
    </span>
  );
}
