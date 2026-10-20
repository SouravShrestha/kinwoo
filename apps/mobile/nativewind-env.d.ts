/// <reference types="nativewind/types" />

/*
 * The triple-slash reference above is what NativeWind's own docs tell you to
 * write, but it does not actually resolve in this install: nativewind@4.2.7
 * ships no `exports` field in its package.json, so `nativewind/types` cannot
 * be resolved as a subpath under `moduleResolution: "bundler"` (which
 * `expo/tsconfig.base` sets) — the reference silently fails rather than
 * erroring, so `className` was accepted at runtime but rejected by `tsc`.
 * Worse, the file it points at (`nativewind/types.d.ts`) itself references
 * `react-native-css-interop/types`, and that package is not present in
 * `node_modules` at all under this install, so even a resolvable reference
 * would have hit a second dead end.
 *
 * The declarations below are the augmentation NativeWind's types.d.ts is
 * supposed to provide — `className?: string` on the three RN primitives this
 * app actually uses. If a future NativeWind/Expo upgrade fixes the package's
 * own exports map, the triple-slash reference above will start resolving
 * these on its own; this block can be deleted once `tsc --noEmit` still
 * passes with it removed.
 */
import "react-native";

declare module "react-native" {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
}
