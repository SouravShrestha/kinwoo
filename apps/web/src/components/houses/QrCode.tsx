"use client";

import { qrPathData } from "@kinwoo/core/houses";
import { resolve } from "@kinwoo/tokens";
import { useMemo } from "react";
import { encode } from "uqr";

// Scanners expect dark modules on a light ground, so the tile ignores the active theme.
const DARK = resolve("foreground", "light");
const LIGHT = resolve("background", "light");
const QUIET_ZONE = 2;

export function QrCode({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const { path, size } = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: QUIET_ZONE });
    return { path: qrPathData(qr.data), size: qr.size };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={size} height={size} rx={1.5} fill={LIGHT} />
      <path d={path} fill={DARK} />
    </svg>
  );
}
