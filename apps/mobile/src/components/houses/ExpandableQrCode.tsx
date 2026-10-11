import { useState } from "react";
import { Modal, useWindowDimensions, View } from "react-native";

import { Pressable } from "@/components/Pressable";

import { QrCode } from "./QrCode";

const FULLSCREEN_MAX_SIZE = 400;
const FULLSCREEN_WIDTH_RATIO = 0.8;

export function ExpandableQrCode({
  value,
  label,
  size,
}: {
  value: string;
  label: string;
  size: number;
}) {
  const [open, setOpen] = useState(false);
  const { width, height } = useWindowDimensions();
  const fullscreenSize = Math.min(
    Math.min(width, height) * FULLSCREEN_WIDTH_RATIO,
    FULLSCREEN_MAX_SIZE,
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Enlarge ${label}`}
        onPress={() => setOpen(true)}
        className="active:opacity-80"
      >
        <QrCode value={value} label={label} size={size} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close QR code"
          onPress={() => setOpen(false)}
          className="flex-1 items-center justify-center bg-black/80"
        >
          <View>
            <QrCode value={value} label={label} size={fullscreenSize} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
