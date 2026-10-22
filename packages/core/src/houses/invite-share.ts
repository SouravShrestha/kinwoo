export const INVITE_SHARE_MESSAGE = "Join {house} on Kinwoo. Open {url} or enter the code {code}.";

export const INVITE_SHARE_DIALOG_TITLE = "Share invite";

export const INVITE_CARD_TAGLINE = "You're invited";
export const INVITE_CARD_CODE_LABEL = "Invite code";
export const INVITE_CARD_SCAN_HINT = "Scan to join";

export function inviteShareMessage(input: {
  houseName: string;
  code: string;
  url: string;
}): string {
  const values = { house: input.houseName, url: input.url, code: input.code };
  return INVITE_SHARE_MESSAGE.replace(
    /\{(house|url|code)\}/g,
    (_, key: keyof typeof values) => values[key],
  );
}
