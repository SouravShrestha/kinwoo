import Svg, { Path } from "react-native-svg";

import { DEFAULT_ICON_SIZE, iconHeight, type IconProps } from "../types";
import type { IconGeometry } from "../data";

// `color` is also set on the root so paths filled with `currentColor` pick it up.
export function SvgIcon({
  geometry,
  size = DEFAULT_ICON_SIZE,
  color = "currentColor",
}: IconProps & { geometry: IconGeometry }) {
  return (
    <Svg
      width={size}
      height={iconHeight(geometry.viewBox, size)}
      viewBox={geometry.viewBox}
      fill="none"
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {geometry.paths.map((path, index) => (
        <Path
          key={index}
          d={path.d}
          fill={path.fill ?? color}
          fillRule={path.fillRule}
          clipRule={path.clipRule}
        />
      ))}
    </Svg>
  );
}
