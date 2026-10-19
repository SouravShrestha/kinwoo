import * as geometry from "./data";
import { SvgIcon, type WebIconProps } from "./icon";

export { DEFAULT_ICON_SIZE, type IconProps } from "./types";
export type { WebIconProps } from "./icon";

export const HomeIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.homeIcon} />
);

export const CartIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.cartIcon} />
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

export const CartActiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.cartActiveIcon} />
);

export const BillActiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.billActiveIcon} />
);

export const ProfileActiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.profileActiveIcon} />
);

export const ActivitiesIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.activitiesIcon} />
);

export const ActivitiesActiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.activitiesActiveIcon} />
);

export const BellIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.bellIcon} />
);

export const NotificationIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.notificationIcon} />
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
export const HousePinIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.housePinIcon} />
);

export const BuildIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.buildIcon} />
);

export const CodeIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.codeIcon} />
);

export const CloseIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.closeIcon} />
);
export const CopyIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.copyIcon} />
);
export const EmailIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.emailIcon} />
);
export const LockIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.lockIcon} />
);
export const TickIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.tickIcon} />
);

export const SunIcon = (props: WebIconProps) => <SvgIcon {...props} geometry={geometry.sunIcon} />;

export const MoonIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.moonIcon} />
);

export const AutoThemeIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.autoThemeIcon} />
);
export const QrIcon = (props: WebIconProps) => <SvgIcon {...props} geometry={geometry.qrIcon} />;
export const CameraIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.cameraIcon} />
);
export const SettingsIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.settingsIcon} />
);
export const TextInputIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.textInputIcon} />
);
export const EnterIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.enterIcon} />
);
export const ShareIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.shareIcon} />
);
export const InviteIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.inviteIcon} />
);
export const HouseSettingsIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.houseSettingsIcon} />
);
export const MemberIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.memberIcon} />
);
export const BasketIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.basketIcon} />
);
export const MoreVerticalIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.moreVerticalIcon} />
);
export const FilterIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.filterIcon} />
);
export const SortIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.sortIcon} />
);
export const CaretDownIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.caretDownIcon} />
);
export const PlusCircleIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.plusCircleIcon} />
);
export const CartMinusIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.cartMinusIcon} />
);
export const CartCheckIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.cartCheckIcon} />
);
export const CartPlusIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.cartPlusIcon} />
);
export const CartCrossIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.cartCrossIcon} />
);
export const UserCrossIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.userCrossIcon} />
);
export const BagDollarIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.bagDollarIcon} />
);
export const UserCheckIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.userCheckIcon} />
);
export const FilePlusIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.filePlusIcon} />
);
export const ArchiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.archiveIcon} />
);
export const ArchiveFilledIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.archiveFilledIcon} />
);
export const TrashIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.trashIcon} />
);
export const HousePlusIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.housePlusIcon} />
);
export const HandshakeIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.handshakeIcon} />
);
export const FrownIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.frownIcon} />
);
export const PulseIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.pulseIcon} />
);
export const CheckCircleIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.checkCircleIcon} />
);
export const VegetablesIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.vegetablesIcon} />
);
export const FruitsIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.fruitsIcon} />
);
export const ClockIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.clockIcon} />
);
export const CheckIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.checkIcon} />
);
export const StaplesIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.staplesIcon} />
);
export const SpicesIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.spicesIcon} />
);
export const DairyIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.dairyIcon} />
);
export const MeatFishIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.meatFishIcon} />
);
export const BakeryIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.bakeryIcon} />
);
export const SnacksIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.snacksIcon} />
);
export const BeveragesIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.beveragesIcon} />
);
export const HouseholdIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.householdIcon} />
);
export const OtherIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.otherIcon} />
);
export const PersonalCareIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.personalCareIcon} />
);
export const ListIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.listIcon} />
);
export const GroceryIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.groceryIcon} />
);
export const TodoIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.todoIcon} />
);
export const WalletIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.walletIcon} />
);
export const EventsIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.eventsIcon} />
);
export const ShoppingIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.shoppingIcon} />
);
export const DiningIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.diningIcon} />
);
export const ListSettingsIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.listSettingsIcon} />
);
export const HeartIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.heartIcon} />
);
export const TrashOutlineIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.trashOutlineIcon} />
);
export const EditIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.editIcon} />
);
export const LogoutIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.logoutIcon} />
);
export const LockFilledIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.lockFilledIcon} />
);
export const WorldIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.worldIcon} />
);
export const LeaveHouseIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.leaveHouseIcon} />
);
export const PendingIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.pendingIcon} />
);
export const UserCircleIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.userCircleIcon} />
);
export const BadgeCheckIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.badgeCheckIcon} />
);
export const PendingActiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.pendingActiveIcon} />
);
export const UserCircleActiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.userCircleActiveIcon} />
);
export const BadgeCheckActiveIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.badgeCheckActiveIcon} />
);
export const VerifiedIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.verifiedIcon} />
);
export const TransactionIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.transactionIcon} />
);
export const DocumentIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.documentIcon} />
);
export const ShieldCheckIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.shieldCheckIcon} />
);
export const RupeeIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.rupeeIcon} />
);
export const CalendarIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.calendarIcon} />
);
export const SharesIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.sharesIcon} />
);
export const BoltIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.boltIcon} />
);
export const CarIcon = (props: WebIconProps) => <SvgIcon {...props} geometry={geometry.carIcon} />;
export const GlobeFilledIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.globeFilledIcon} />
);
export const CloudLockFilledIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.cloudLockFilledIcon} />
);
export const SimplifyIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.simplifyIcon} />
);
export const SettleUpIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.settleUpIcon} />
);
export const BalancesIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.balancesIcon} />
);
export const TotalsIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.totalsIcon} />
);
export const NoteIcon = (props: WebIconProps) => (
  <SvgIcon {...props} geometry={geometry.noteIcon} />
);
