import * as geometry from "./data";
import { SvgIcon, type WebIconProps } from "./icon";

export { DEFAULT_ICON_SIZE, type IconProps } from "./types";
export type { WebIconProps } from "./icon";

export const HomeIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.homeIcon} />
);

export const ListIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.listIcon} />
);

export const BillIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.billIcon} />
);

export const ProfileIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.profileIcon} />
);

export const ProfileOutlineIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.profileOutlineIcon} />
);

export const BellIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.bellIcon} />
);

export const GlobeIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.globeIcon} />
);

export const AppearanceIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.appearanceIcon} />
);

export const ArrowRightIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.arrowRightIcon} />
);

export const GoogleIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.googleIcon} />
);
