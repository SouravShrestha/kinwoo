import { cn } from "@/lib/utils";

import { Avatar } from "./Avatar";

const STACK_LIMIT = 3;

export function AvatarStack({
  members,
  total,
  size = 44,
  surface,
}: {
  members: { name: string | null; avatarUrl: string | null }[];
  total: number;
  size?: number;
  surface: "sheet" | "card";
}) {
  const shown = members.slice(0, STACK_LIMIT);
  const hidden = total - shown.length;
  const ring = surface === "card" ? "border-card" : "border-sheet";

  return (
    <span className="flex items-center">
      {shown.map((member, index) => (
        <span key={index} className={cn("rounded-full", index > 0 && `-ml-2.5 border-2 ${ring}`)}>
          <Avatar
            name={member.name}
            url={member.avatarUrl}
            size={size}
            tone={surface === "card" ? "background" : "muted"}
          />
        </span>
      ))}
      {hidden > 0 ? (
        <span
          aria-hidden
          className={cn(
            "-ml-2.5 flex items-center justify-center rounded-full bg-border border-2 font-semibold",
            ring,
          )}
          style={{ width: size + 4, height: size + 4, fontSize: size * 0.32 }}
        >
          +{hidden}
        </span>
      ) : null}
    </span>
  );
}
