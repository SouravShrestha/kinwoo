import type { ListVisibility } from "../grocery/types";
import type { LeaveState } from "../houses/leave";
import type { HouseRole } from "../houses/types";

export type ConfirmIconName =
  "trash" | "archive" | "logout" | "lock" | "world" | "leaveHouse" | "userCheck" | "userCross";

export type ConfirmTone = "destructive" | "primary";

export type ConfirmCopy = {
  icon: ConfirmIconName;
  tone: ConfirmTone;
  title: string;
  message: string;
  confirmLabel: string;
};

export const CONFIRM_CANCEL_LABEL = "Cancel";

export const CONFIRM_COPY = {
  logout: {
    icon: "logout",
    tone: "destructive",
    title: "Log out?",
    message: "You'll need to sign in again to use Kinwoo.",
    confirmLabel: "Log out",
  },
  deleteList: {
    icon: "trash",
    tone: "destructive",
    title: "Delete List?",
    message:
      "This will delete the list and all its items. Recorded expenses won't be affected.\nThis action is irreversible",
    confirmLabel: "Delete",
  },
  deletePrivateList: {
    icon: "trash",
    tone: "destructive",
    title: "Delete List?",
    message:
      "This will delete the list, all its items and their purchases from your Private spending.\nThis action is irreversible",
    confirmLabel: "Delete",
  },
  deleteItem: {
    icon: "trash",
    tone: "destructive",
    title: "Delete item?",
    message: "Are you sure you want to delete this item?\nThis action is irreversible",
    confirmLabel: "Delete",
  },
  archiveBoughtItem: {
    icon: "archive",
    tone: "primary",
    title: "Archive item?",
    message:
      "It will be hidden from your bought items. The purchase and its transaction are kept, and private purchases still count in your spending.",
    confirmLabel: "Archive",
  },
  archiveBoughtItems: {
    icon: "archive",
    tone: "primary",
    title: "Archive items?",
    message:
      "All items in this purchase will be hidden from your bought items. The purchase and its transaction are kept, and private purchases still count in your spending.",
    confirmLabel: "Archive",
  },
  deleteExpense: {
    icon: "trash",
    tone: "destructive",
    title: "Delete expense?",
    message: "It will be removed from everyone's balances.\nThis action is irreversible",
    confirmLabel: "Delete",
  },
  deletePayment: {
    icon: "trash",
    tone: "destructive",
    title: "Delete payment?",
    message:
      "The balance between you will go back to what it was before it.\nThis action is irreversible",
    confirmLabel: "Delete",
  },
  listPrivate: {
    icon: "lock",
    tone: "destructive",
    title: "Make this list private?",
    message:
      "Other housemates will lose access to this list and its items. Linked expenses and payment history will remain available.",
    confirmLabel: "Make private",
  },
  listPublic: {
    icon: "world",
    tone: "primary",
    title: "Make this list public?",
    message: "Everyone in your house will be able to view and edit this list, including its items.",
    confirmLabel: "Make public",
  },
  deleteHouse: {
    icon: "trash",
    tone: "destructive",
    title: "Delete House",
    message: "This will delete the house and is irreversible.",
    confirmLabel: "Delete",
  },
  rotateInvite: {
    icon: "lock",
    tone: "destructive",
    title: "Reset invite code?",
    message:
      "The current code, link and QR code stop working. Anyone who hasn't joined yet needs the new one.",
    confirmLabel: "Reset",
  },
} as const satisfies Record<string, ConfirmCopy>;

export function visibilityConfirmCopy(next: ListVisibility): ConfirmCopy {
  return next === "private" ? CONFIRM_COPY.listPrivate : CONFIRM_COPY.listPublic;
}

export function deleteListConfirmCopy(visibility: ListVisibility): ConfirmCopy {
  return visibility === "private" ? CONFIRM_COPY.deletePrivateList : CONFIRM_COPY.deleteList;
}

export function leaveConfirmCopy(state: LeaveState, houseName: string): ConfirmCopy {
  if (state === "sole") return CONFIRM_COPY.deleteHouse;
  return {
    icon: "leaveHouse",
    tone: "destructive",
    title: `Leave ${houseName}?`,
    message: "You'll lose access to this house. You can rejoin with a new invite.",
    confirmLabel: "Leave",
  };
}

export function roleConfirmCopy(name: string, role: HouseRole): ConfirmCopy {
  if (role === "admin") {
    return {
      icon: "userCheck",
      tone: "primary",
      title: `Make ${name} an admin?`,
      message: "They'll be able to manage members, invites and house settings.",
      confirmLabel: "Confirm",
    };
  }
  return {
    icon: "userCross",
    tone: "destructive",
    title: `Remove ${name} as admin?`,
    message: "They'll stay in the house as a member and lose admin access.",
    confirmLabel: "Confirm",
  };
}

export function removeConfirmCopy(name: string): ConfirmCopy {
  return {
    icon: "trash",
    tone: "destructive",
    title: `Remove ${name}?`,
    message: "They'll lose access to this house. They can rejoin with a new invite.",
    confirmLabel: "Remove",
  };
}
