import { HOME_DECOR_OPACITY, HOME_DECOR_VIEWBOX, homeDecorPieces } from "@kinwoo/icons/decor";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, FadeInDown, ReduceMotion } from "react-native-reanimated";
import { SvgXml } from "react-native-svg";

import { useTheme } from "@/theme/ThemeProvider";

const fall = (delay: number) =>
  FadeInDown.duration(700)
    .delay(delay)
    .easing(Easing.bezier(0.22, 1, 0.36, 1))
    .withInitialValues({ transform: [{ translateY: -120 }] })
    .reduceMotion(ReduceMotion.System);

// One layered SVG per piece so each falls in on its own delay.
const pieces = homeDecorPieces.map((p) => ({
  entering: fall(p.delay),
  xml: `<svg viewBox="${HOME_DECOR_VIEWBOX}" fill="none">${p.svg}</svg>`,
}));

export function HomeDecor({ animate = true }: { animate?: boolean }) {
  const { resolvedTheme, colors } = useTheme();
  const color = colors[resolvedTheme].primary;

  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 top-0 h-[290px]"
      style={{ opacity: HOME_DECOR_OPACITY }}
    >
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          entering={animate ? p.entering : undefined}
          style={StyleSheet.absoluteFill}
        >
          <SvgXml
            xml={p.xml}
            width="100%"
            height="100%"
            color={color}
            preserveAspectRatio="xMidYMid slice"
          />
        </Animated.View>
      ))}
    </View>
  );
}
