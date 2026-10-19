import { INVITE_SHARE_DIALOG_TITLE } from "@kinwoo/core/houses";
import type { RefObject } from "react";
import type { View } from "react-native";
import Share from "react-native-share";
import { captureRef } from "react-native-view-shot";

export async function captureInviteCard(card: RefObject<View | null>): Promise<string | null> {
  if (!card.current) return null;

  return captureRef(card, { format: "png", quality: 1, result: "tmpfile" });
}

// Resolves when the user closes the share sheet, which can be arbitrarily long. Callers must
// not treat that wait as app work.
export async function openInviteShare(uri: string, message: string) {
  await Share.open({
    title: INVITE_SHARE_DIALOG_TITLE,
    message,
    url: uri,
    type: "image/png",
    failOnCancel: false,
  });
}
