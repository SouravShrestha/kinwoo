import * as geometry from "./data";
import { SvgIcon } from "./native/icon";
import type { IconProps } from "./types";

export { DEFAULT_ICON_SIZE, type IconProps } from "./types";

export const HomeIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.homeIcon} />;

export const ListIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.listIcon} />;

export const BillIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.billIcon} />;

export const ProfileIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.profileIcon} />
);

export const ProfileOutlineIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.profileOutlineIcon} />
);

export const BellIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.bellIcon} />;

export const GlobeIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.globeIcon} />;

export const AppearanceIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.appearanceIcon} />
);

export const ArrowRightIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.arrowRightIcon} />
);

export const GoogleIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.googleIcon} />
);
