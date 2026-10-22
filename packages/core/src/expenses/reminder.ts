import { formatPaise } from "../grocery/bought-groups";
import { memberDisplayName } from "../houses/members";

export const REMINDER_SHARE_DIALOG_TITLE = "Send reminder";

export function paymentReminderMessage(input: {
  debtorName: string | null;
  creditorName: string | null;
  houseName: string;
  amountPaise: number;
}): string {
  const amount = formatPaise(input.amountPaise);
  return (
    `Hi ${memberDisplayName(input.debtorName)}, a reminder from ${input.houseName} on Kinwoo: ` +
    `you owe ${memberDisplayName(input.creditorName)} ${amount} for shared expenses. ` +
    `Please pay when you can, then record the payment in Kinwoo so the balances stay up to date.`
  );
}
