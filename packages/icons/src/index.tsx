import * as geometry from "./data";
import type { IconGeometry } from "./data";
import { SvgIcon, type WebIconProps } from "./icon";
import { activityGeometry, expenseCategoryGeometry, groceryCategoryGeometry } from "./semantic";

export { DEFAULT_ICON_SIZE, type IconProps } from "./types";
export type { WebIconProps } from "./icon";

// One component per geometry. Each export stays a separate, pure call so bundlers drop the
// icons (and their path data) a screen never imports.
function icon(shape: IconGeometry) {
  return function Icon(props: WebIconProps) {
    return <SvgIcon {...props} geometry={shape} />;
  };
}

export const HomeIcon = /*#__PURE__*/ icon(geometry.homeIcon);
export const CartIcon = /*#__PURE__*/ icon(geometry.cartIcon);
export const BillIcon = /*#__PURE__*/ icon(geometry.billIcon);
export const ProfileIcon = /*#__PURE__*/ icon(geometry.profileIcon);
export const HomeActiveIcon = /*#__PURE__*/ icon(geometry.homeActiveIcon);
export const CartActiveIcon = /*#__PURE__*/ icon(geometry.cartActiveIcon);
export const BillActiveIcon = /*#__PURE__*/ icon(geometry.billActiveIcon);
export const ActivitiesIcon = /*#__PURE__*/ icon(geometry.activitiesIcon);
export const ActivitiesActiveIcon = /*#__PURE__*/ icon(geometry.activitiesActiveIcon);
export const BellIcon = /*#__PURE__*/ icon(geometry.bellIcon);
export const NotificationIcon = /*#__PURE__*/ icon(geometry.notificationIcon);
export const GlobeIcon = /*#__PURE__*/ icon(geometry.globeIcon);
export const AppearanceIcon = /*#__PURE__*/ icon(geometry.appearanceIcon);
export const ArrowRightIcon = /*#__PURE__*/ icon(geometry.arrowRightIcon);
export const GoogleIcon = /*#__PURE__*/ icon(geometry.googleIcon);
export const HousePinIcon = /*#__PURE__*/ icon(geometry.housePinIcon);
export const BuildIcon = /*#__PURE__*/ icon(geometry.buildIcon);
export const CodeIcon = /*#__PURE__*/ icon(geometry.codeIcon);
export const CloseIcon = /*#__PURE__*/ icon(geometry.closeIcon);
export const CopyIcon = /*#__PURE__*/ icon(geometry.copyIcon);
export const EmailIcon = /*#__PURE__*/ icon(geometry.emailIcon);
export const LockIcon = /*#__PURE__*/ icon(geometry.lockIcon);
export const TickIcon = /*#__PURE__*/ icon(geometry.tickIcon);
export const SunIcon = /*#__PURE__*/ icon(geometry.sunIcon);
export const MoonIcon = /*#__PURE__*/ icon(geometry.moonIcon);
export const AutoThemeIcon = /*#__PURE__*/ icon(geometry.autoThemeIcon);
export const QrIcon = /*#__PURE__*/ icon(geometry.qrIcon);
export const CameraIcon = /*#__PURE__*/ icon(geometry.cameraIcon);
export const SettingsIcon = /*#__PURE__*/ icon(geometry.settingsIcon);
export const TextInputIcon = /*#__PURE__*/ icon(geometry.textInputIcon);
export const EnterIcon = /*#__PURE__*/ icon(geometry.enterIcon);
export const ShareIcon = /*#__PURE__*/ icon(geometry.shareIcon);
export const InviteIcon = /*#__PURE__*/ icon(geometry.inviteIcon);
export const HouseSettingsIcon = /*#__PURE__*/ icon(geometry.houseSettingsIcon);
export const MemberIcon = /*#__PURE__*/ icon(geometry.memberIcon);
export const BasketIcon = /*#__PURE__*/ icon(geometry.basketIcon);
export const MoreVerticalIcon = /*#__PURE__*/ icon(geometry.moreVerticalIcon);
export const FilterIcon = /*#__PURE__*/ icon(geometry.filterIcon);
export const SortIcon = /*#__PURE__*/ icon(geometry.sortIcon);
export const CaretDownIcon = /*#__PURE__*/ icon(geometry.caretDownIcon);
export const PlusCircleIcon = /*#__PURE__*/ icon(geometry.plusCircleIcon);
export const CartMinusIcon = /*#__PURE__*/ icon(geometry.cartMinusIcon);
export const CartCheckIcon = /*#__PURE__*/ icon(geometry.cartCheckIcon);
export const CartPlusIcon = /*#__PURE__*/ icon(geometry.cartPlusIcon);
export const CartCrossIcon = /*#__PURE__*/ icon(geometry.cartCrossIcon);
export const UserCrossIcon = /*#__PURE__*/ icon(geometry.userCrossIcon);
export const BagDollarIcon = /*#__PURE__*/ icon(geometry.bagDollarIcon);
export const UserCheckIcon = /*#__PURE__*/ icon(geometry.userCheckIcon);
export const FilePlusIcon = /*#__PURE__*/ icon(geometry.filePlusIcon);
export const TrashIcon = /*#__PURE__*/ icon(geometry.trashIcon);
export const HousePlusIcon = /*#__PURE__*/ icon(geometry.housePlusIcon);
export const FrownIcon = /*#__PURE__*/ icon(geometry.frownIcon);
export const PulseIcon = /*#__PURE__*/ icon(geometry.pulseIcon);
export const CheckCircleIcon = /*#__PURE__*/ icon(geometry.checkCircleIcon);
export const VegetablesIcon = /*#__PURE__*/ icon(geometry.vegetablesIcon);
export const FruitsIcon = /*#__PURE__*/ icon(geometry.fruitsIcon);
export const ClockIcon = /*#__PURE__*/ icon(geometry.clockIcon);
export const CheckIcon = /*#__PURE__*/ icon(geometry.checkIcon);
export const StaplesIcon = /*#__PURE__*/ icon(geometry.staplesIcon);
export const SpicesIcon = /*#__PURE__*/ icon(geometry.spicesIcon);
export const DairyIcon = /*#__PURE__*/ icon(geometry.dairyIcon);
export const MeatFishIcon = /*#__PURE__*/ icon(geometry.meatFishIcon);
export const BakeryIcon = /*#__PURE__*/ icon(geometry.bakeryIcon);
export const SnacksIcon = /*#__PURE__*/ icon(geometry.snacksIcon);
export const BeveragesIcon = /*#__PURE__*/ icon(geometry.beveragesIcon);
export const HouseholdIcon = /*#__PURE__*/ icon(geometry.householdIcon);
export const OtherIcon = /*#__PURE__*/ icon(geometry.otherIcon);
export const PersonalCareIcon = /*#__PURE__*/ icon(geometry.personalCareIcon);
export const GroceryIcon = /*#__PURE__*/ icon(geometry.groceryIcon);
export const TodoIcon = /*#__PURE__*/ icon(geometry.todoIcon);
export const WalletIcon = /*#__PURE__*/ icon(geometry.walletIcon);
export const EventsIcon = /*#__PURE__*/ icon(geometry.eventsIcon);
export const ShoppingIcon = /*#__PURE__*/ icon(geometry.shoppingIcon);
export const DiningIcon = /*#__PURE__*/ icon(geometry.diningIcon);
export const ListSettingsIcon = /*#__PURE__*/ icon(geometry.listSettingsIcon);
export const HeartIcon = /*#__PURE__*/ icon(geometry.heartIcon);
export const TrashOutlineIcon = /*#__PURE__*/ icon(geometry.trashOutlineIcon);
export const EditIcon = /*#__PURE__*/ icon(geometry.editIcon);
export const LogoutIcon = /*#__PURE__*/ icon(geometry.logoutIcon);
export const LockFilledIcon = /*#__PURE__*/ icon(geometry.lockFilledIcon);
export const WorldIcon = /*#__PURE__*/ icon(geometry.worldIcon);
export const LeaveHouseIcon = /*#__PURE__*/ icon(geometry.leaveHouseIcon);
export const PendingIcon = /*#__PURE__*/ icon(geometry.pendingIcon);
export const UserCircleIcon = /*#__PURE__*/ icon(geometry.userCircleIcon);
export const BadgeCheckIcon = /*#__PURE__*/ icon(geometry.badgeCheckIcon);
export const PendingActiveIcon = /*#__PURE__*/ icon(geometry.pendingActiveIcon);
export const UserCircleActiveIcon = /*#__PURE__*/ icon(geometry.userCircleActiveIcon);
export const BadgeCheckActiveIcon = /*#__PURE__*/ icon(geometry.badgeCheckActiveIcon);
export const VerifiedIcon = /*#__PURE__*/ icon(geometry.verifiedIcon);
export const TransactionIcon = /*#__PURE__*/ icon(geometry.transactionIcon);
export const DocumentIcon = /*#__PURE__*/ icon(geometry.documentIcon);
export const ShieldCheckIcon = /*#__PURE__*/ icon(geometry.shieldCheckIcon);
export const ShieldCheckOutlineIcon = /*#__PURE__*/ icon(geometry.shieldCheckOutlineIcon);
export const RupeeIcon = /*#__PURE__*/ icon(geometry.rupeeIcon);
export const CalendarIcon = /*#__PURE__*/ icon(geometry.calendarIcon);
export const SharesIcon = /*#__PURE__*/ icon(geometry.sharesIcon);
export const UtilitiesIcon = /*#__PURE__*/ icon(geometry.utilitiesIcon);
export const RentIcon = /*#__PURE__*/ icon(geometry.rentIcon);
export const CarIcon = /*#__PURE__*/ icon(geometry.carIcon);
export const GlobeFilledIcon = /*#__PURE__*/ icon(geometry.globeFilledIcon);
export const CloudLockFilledIcon = /*#__PURE__*/ icon(geometry.cloudLockFilledIcon);
export const SimplifyIcon = /*#__PURE__*/ icon(geometry.simplifyIcon);
export const SettleUpIcon = /*#__PURE__*/ icon(geometry.settleUpIcon);
export const BalancesIcon = /*#__PURE__*/ icon(geometry.balancesIcon);
export const TotalsIcon = /*#__PURE__*/ icon(geometry.totalsIcon);
export const NoteIcon = /*#__PURE__*/ icon(geometry.noteIcon);
export const ArchiveIcon = /*#__PURE__*/ icon(geometry.archiveIcon);
export const EditNoteIcon = /*#__PURE__*/ icon(geometry.editNoteIcon);
export const PaperPlaneIcon = /*#__PURE__*/ icon(geometry.paperPlaneIcon);
export const MoveIcon = /*#__PURE__*/ icon(geometry.moveIcon);

// Icons chosen by name; see semantic.ts.

export function CategoryIcon({ name, size }: { name: string | null | undefined; size: number }) {
  return <SvgIcon size={size} geometry={groceryCategoryGeometry(name)} />;
}

export function ExpenseCategoryIcon({ category, size }: { category: string; size: number }) {
  return <SvgIcon size={size} geometry={expenseCategoryGeometry(category)} />;
}

export function ActivityKindIcon({ name, size }: { name: string; size: number }) {
  return <SvgIcon size={size} geometry={activityGeometry(name)} />;
}
export const RecordPaymentIcon = /*#__PURE__*/ icon(geometry.recordPaymentIcon);
export const GiveMoneyIcon = /*#__PURE__*/ icon(geometry.giveMoneyIcon);
export const ResetIcon = /*#__PURE__*/ icon(geometry.resetIcon);
export const PaymentIcon = /*#__PURE__*/ icon(geometry.paymentIcon);
export const InstallIcon = /*#__PURE__*/ icon(geometry.installIcon);
