export interface IconProps {
  size?: number;
  // React Native has no currentColor cascade, so native call sites must pass a
  // value from `@kinwoo/tokens/native`.
  color?: string;
}

export const DEFAULT_ICON_SIZE = 24;
