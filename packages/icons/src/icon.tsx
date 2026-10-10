import { DEFAULT_ICON_SIZE, type IconProps } from "./types";
import type { IconGeometry } from "./data";

export type WebIconProps = IconProps & { className?: string };

// Decorative: `aria-hidden` hides icons from assistive tech, so the label must live on the control.
export function SvgIcon({
  geometry,
  size = DEFAULT_ICON_SIZE,
  color = "currentColor",
  className,
}: WebIconProps & { geometry: IconGeometry }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={geometry.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {geometry.paths.map((path, index) => (
        <path
          key={index}
          d={path.d}
          fill={path.fill ?? color}
          fillRule={path.fillRule}
          clipRule={path.clipRule}
        />
      ))}
    </svg>
  );
}
