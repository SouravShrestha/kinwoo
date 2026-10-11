import {
  INVITE_CARD_CODE_LABEL,
  INVITE_CARD_SCAN_HINT,
  INVITE_CARD_TAGLINE,
} from "@kinwoo/core/houses";
import { colors } from "@kinwoo/tokens/native";
import type { Ref } from "react";
import { Text, View } from "react-native";

import { QrCode } from "./QrCode";

export const INVITE_CARD_WIDTH = 320;

const palette = colors.light;

export function InviteCard({
  ref,
  houseName,
  code,
  url,
}: {
  ref?: Ref<View>;
  houseName: string;
  code: string;
  url: string;
}) {
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: INVITE_CARD_WIDTH,
        backgroundColor: palette.background,
        padding: 16,
      }}
    >
      <View
        style={{
          overflow: "hidden",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.card,
        }}
      >
        <View
          style={{ backgroundColor: palette.accent, paddingHorizontal: 24, paddingVertical: 28 }}
        >
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: palette.accentForeground,
              opacity: 0.85,
            }}
          >
            {INVITE_CARD_TAGLINE}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              marginTop: 8,
              fontFamily: "Poppins_600SemiBold",
              fontSize: 26,
              lineHeight: 34,
              color: palette.accentForeground,
            }}
          >
            {houseName}
          </Text>
        </View>

        <View style={{ alignItems: "center", paddingHorizontal: 24, paddingVertical: 24 }}>
          <QrCode value={url} label="Invite QR code" size={176} />
          <Text
            style={{
              marginTop: 12,
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: palette.mutedForeground,
            }}
          >
            {INVITE_CARD_SCAN_HINT}
          </Text>

          <View
            style={{
              marginTop: 20,
              width: "100%",
              borderTopWidth: 1,
              borderStyle: "dashed",
              borderColor: palette.border,
              paddingTop: 20,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: palette.mutedForeground,
              }}
            >
              {INVITE_CARD_CODE_LABEL}
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontFamily: "Poppins_600SemiBold",
                fontSize: 28,
                letterSpacing: 6,
                color: palette.foreground,
              }}
            >
              {code}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
