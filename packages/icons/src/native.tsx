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

export const HomeActiveIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.homeActiveIcon} />
);

export const ListActiveIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.listActiveIcon} />
);

export const BillActiveIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.billActiveIcon} />
);

export const ProfileActiveIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.profileActiveIcon} />
);

export const BellIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.bellIcon} />;

export const NotificationIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.notificationIcon} />
);

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
export const HousePinIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.housePinIcon} />
);

export const BuildIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.buildIcon} />;

export const CodeIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.codeIcon} />;

export const CloseIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.closeIcon} />;
export const CopyIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.copyIcon} />;

export const EmailIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.emailIcon} />;

export const LockIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.lockIcon} />;

export const TickIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.tickIcon} />;

export const SunIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.sunIcon} />;

export const MoonIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.moonIcon} />;

export const AutoThemeIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.autoThemeIcon} />
);
export const QrIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.qrIcon} />;
export const CameraIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.cameraIcon} />
);
export const SettingsIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.settingsIcon} />
);
export const TextInputIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.textInputIcon} />
);
export const EnterIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.enterIcon} />;
export const ShareIcon = (props: IconProps) => <SvgIcon {...props} geometry={geometry.shareIcon} />;
export const InviteIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.inviteIcon} />
);
export const HouseSettingsIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.houseSettingsIcon} />
);
export const MemberIcon = (props: IconProps) => (
  <SvgIcon {...props} geometry={geometry.memberIcon} />
);
