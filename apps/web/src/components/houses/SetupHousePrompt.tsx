import { BuildIcon, CodeIcon } from "@kinwoo/icons";
import type { ReactNode } from "react";

type SetupHousePromptProps = {
  onCreate: () => void;
  onJoin: () => void;
};

type ActionCardProps = {
  lines: [string, string];
  label: string;
  align: "left" | "right";
  onClick: () => void;
  background?: ReactNode;
  backgroundClassName?: string;
  labelAtTop?: boolean;
  className?: string;
};

function ActionCard({
  lines,
  label,
  align,
  onClick,
  background,
  backgroundClassName = "-top-1 -right-1",
  labelAtTop = false,
  className,
}: ActionCardProps) {
  const isRight = align === "right";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`relative flex min-w-0 flex-1 flex-col ${labelAtTop ? "justify-start" : "justify-end"} overflow-hidden rounded-lg border border-border bg-card p-3 hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${className ?? ""}`}
    >
      {background ? (
        <span aria-hidden="true" className={`pointer-events-none absolute ${backgroundClassName}`}>
          {background}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className={`relative font-display text-xl leading-7 font-normal ${isRight ? "text-right" : "text-left"}`}
      >
        {lines[0]}
        <br />
        {lines[1]}
      </span>
    </button>
  );
}

export function SetupHousePrompt({ onCreate, onJoin }: SetupHousePromptProps) {
  return (
    <div className="flex w-full flex-1 flex-col justify-center">
      <div className="flex w-full items-start gap-5">
        <ActionCard
          lines={["Build", "a house"]}
          label="Build a house"
          align="left"
          onClick={onCreate}
          background={<BuildIcon size={96} />}
          backgroundClassName="right-3 -bottom-4"
          labelAtTop
          className="mt-14 aspect-square"
        />
        <ActionCard
          lines={["I have", "a code"]}
          label="I have a code"
          align="right"
          onClick={onJoin}
          background={<CodeIcon size={64} />}
          backgroundClassName="-top-2 left-4"
          className="aspect-square"
        />
      </div>
    </div>
  );
}
