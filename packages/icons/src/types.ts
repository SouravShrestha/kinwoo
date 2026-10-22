export interface IconProps {
  size?: number;
  // React Native has no currentColor cascade, so native call sites must pass a
  // value from `@kinwoo/tokens/native`.
  color?: string;
}

export const DEFAULT_ICON_SIZE = 24;

// `size` is the rendered width; height follows the viewBox so wide icons are not letterboxed.
export function iconHeight(viewBox: string, size: number): number {
  const [, , width, height] = viewBox.split(" ").map(Number);
  return (size * height) / width;
}
