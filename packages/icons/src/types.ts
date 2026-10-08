export interface IconProps {
  size?: number;
  /**
   * Web icons default to `currentColor`, so colour normally comes from the
   * parent's text colour. React Native has no such cascade, so native call
   * sites pass a value from `@kinwoo/tokens/native` instead.
   */
  color?: string;
}

export const DEFAULT_ICON_SIZE = 24;
