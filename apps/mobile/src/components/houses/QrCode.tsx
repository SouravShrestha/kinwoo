import { qrPathData } from "@kinwoo/core/houses";
import { colors } from "@kinwoo/tokens/native";
import { useMemo } from "react";
import Svg, { Path, Rect } from "react-native-svg";
import { encode } from "uqr";

// Scanners expect dark modules on a light ground, so the tile ignores the active theme.
const DARK = colors.light.foreground;
const LIGHT = colors.light.background;
const QUIET_ZONE = 2;

export function QrCode({ value, label, size }: { value: string; label: string; size: number }) {
  const { path, modules } = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: QUIET_ZONE });
    return { path: qrPathData(qr.data), modules: qr.size };
  }, [value]);

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${modules} ${modules}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Rect width={modules} height={modules} rx={1.5} fill={LIGHT} />
      <Path d={path} fill={DARK} />
    </Svg>
  );
}
