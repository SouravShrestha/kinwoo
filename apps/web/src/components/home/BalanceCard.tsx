"use client";

import { balanceHeadline, balanceHeadlineParts, type HouseBalances } from "@kinwoo/core/expenses";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import santa1 from "../../../../../assets/gifs/santa_1.webp";
import santa2 from "../../../../../assets/gifs/santa_2.webp";
import santa3 from "../../../../../assets/gifs/santa_3.webp";
import santa4 from "../../../../../assets/gifs/santa_4.webp";
import santa5 from "../../../../../assets/gifs/santa_5.webp";

const santas = [santa1, santa2, santa3, santa4, santa5];
// Picked once per page load. The card only renders client-side after balances load, so the
// server and client picks never have to match.
const santa = santas[Math.floor(Math.random() * santas.length)];

// Autoplay once per app open; later mounts (e.g. tapping Home) show a still frame until tapped.
let autoplayed = false;

const LEAD = { owed: "You're owed", owe: "You owe" } as const;

export function HeroCard({ onReplay, children }: { onReplay?: () => void; children: ReactNode }) {
  // A new query string makes the browser restart the two-loop animation.
  const [plays, setPlays] = useState(0);
  const [still] = useState(autoplayed);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    autoplayed = true;
    if (!still) return;
    // ponytail: drawImage of an animated webp paints its first frame; no separate still asset.
    const img = new window.Image();
    img.onload = () => canvas.current?.getContext("2d")?.drawImage(img, 0, 0, 200, 200);
    img.src = santa.src;
  }, [still]);
  return (
    <div className="flex w-full flex-col items-center gap-3 px-3 pt-4 pb-7">
      <button
        type="button"
        aria-label="Replay animation"
        onClick={() => {
          setPlays((n) => n + 1);
          onReplay?.();
        }}
        className="rounded-full hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {still && plays === 0 ? (
          <canvas ref={canvas} width={200} height={200} className="size-[72px]" />
        ) : (
          <Image
            key={plays}
            src={`${santa.src}?play=${plays}`}
            alt=""
            width={72}
            height={72}
            unoptimized
          />
        )}
      </button>
      {children}
    </div>
  );
}

export function BalanceCard({
  balances,
  onReplay,
}: {
  balances: HouseBalances;
  onReplay?: () => void;
}) {
  const text = balanceHeadlineParts(balances);
  return (
    <HeroCard onReplay={onReplay}>
      <Link
        href="/bills"
        aria-label={`${balanceHeadline(balances)}. Open bills`}
        className="flex flex-col items-center gap-0.5 text-center font-display font-medium hover:cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="text-sm leading-[18px] text-balance">
          {text.tone === "neutral" ? text.before.trim() : LEAD[text.tone]}
        </span>
        {text.amount ? (
          <span className="text-[26px] leading-10 tracking-[-0.02em] text-foreground">
            {text.amount}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">Across all your shared bills</span>
      </Link>
    </HeroCard>
  );
}
