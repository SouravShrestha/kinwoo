"use client";

import { useIsBusy } from "@kinwoo/client/activity";
import { useEffect, useState } from "react";

type Phase = "idle" | "running" | "finishing";

const FINISH_MS = 200;

const STYLES: Record<Phase, { width: string; opacity: number; transition: string }> = {
  idle: { width: "0%", opacity: 0, transition: "none" },
  running: {
    width: "90%",
    opacity: 1,
    transition: "width 5s cubic-bezier(0.215, 0.61, 0.355, 1), opacity 200ms",
  },
  finishing: {
    width: "100%",
    opacity: 0,
    transition: `width ${FINISH_MS}ms, opacity ${FINISH_MS}ms ${FINISH_MS}ms`,
  },
};

export function TopLoader() {
  const busy = useIsBusy();
  const [phase, setPhase] = useState<Phase>("idle");
  const [wasBusy, setWasBusy] = useState(false);

  if (busy !== wasBusy) {
    setWasBusy(busy);
    setPhase(busy ? "running" : phase === "running" ? "finishing" : phase);
  }

  useEffect(() => {
    if (phase !== "finishing") return;
    const timer = setTimeout(() => setPhase("idle"), FINISH_MS * 2);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-1/2 top-0 z-[9999] h-1 w-full max-w-md -translate-x-1/2"
    >
      <div className="h-full bg-foreground" style={STYLES[phase]} />
    </div>
  );
}
