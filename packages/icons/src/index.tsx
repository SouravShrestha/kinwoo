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

export const HomeActiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.homeActiveIcon} />
);

export const ListActiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.listActiveIcon} />
);

export const BillActiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.billActiveIcon} />
);

export const ProfileActiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.profileActiveIcon} />
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
