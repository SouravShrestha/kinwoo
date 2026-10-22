import { CameraIcon, SettingsIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { useTheme } from "@/theme/ThemeProvider";

const REPEAT_IGNORE_MS = 2000;

// expo-camera takes a 0..1 share of the device's maximum zoom, so these approximate 1x, 2x and 3x.
const ZOOM_LEVELS = [
  { label: "1x", zoom: 0 },
  { label: "2x", zoom: 0.25 },
  { label: "3x", zoom: 0.4 },
];

const CORNERS = [
  "left-0 top-0 rounded-tl-xl border-l-4 border-t-4",
  "right-0 top-0 rounded-tr-xl border-r-4 border-t-4",
  "bottom-0 left-0 rounded-bl-xl border-b-4 border-l-4",
  "bottom-0 right-0 rounded-br-xl border-b-4 border-r-4",
];

export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const { resolvedTheme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const last = useRef<{ value: string; at: number } | null>(null);
  const [zoom, setZoom] = useState(ZOOM_LEVELS[0]!.zoom);
  const shouldAsk = permission !== null && !permission.granted && permission.canAskAgain;

  useEffect(() => {
    if (shouldAsk) void requestPermission();
  }, [shouldAsk, requestPermission]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View className="rounded-2xl border border-border bg-card p-5">
        <View className="mt-2 mb-4 items-center">
          <CameraIcon size={32} color={colors[resolvedTheme].mutedForeground} />
        </View>
        <Text className="text-base text-foreground font-display-normal text-center">
          {"Camera access is needed\nto scan QR code."}
        </Text>
        <Button
          className="mt-4"
          variant="outline"
          label={permission.canAskAgain ? "Allow camera" : "Open settings"}
          icon={
            permission.canAskAgain ? undefined : (
              <SettingsIcon size={20} color={colors[resolvedTheme].foreground} />
            )
          }
          onPress={() => {
            if (permission.canAskAgain) void requestPermission();
            else void Linking.openSettings();
          }}
        />
      </View>
    );
  }

  return (
    <View className="aspect-square w-full overflow-hidden rounded-2xl bg-muted">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        zoom={zoom}
        accessibilityLabel="Camera viewfinder"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => {
          const now = Date.now();
          const previous = last.current;
          if (previous && previous.value === data && now - previous.at < REPEAT_IGNORE_MS) return;
          last.current = { value: data, at: now };
          onScan(data);
        }}
      />
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View className="aspect-square w-[88%]">
          {CORNERS.map((corner) => (
            <View key={corner} className={`absolute size-8 border-white ${corner}`} />
          ))}
        </View>
      </View>
      <View className="absolute inset-x-0 bottom-2 flex-row justify-center gap-2">
        {ZOOM_LEVELS.map((level) => {
          const selected = level.zoom === zoom;
          return (
            <Pressable
              key={level.label}
              accessibilityRole="button"
              accessibilityLabel={`Zoom ${level.label}`}
              accessibilityState={{ selected }}
              allowDoublePress
              onPress={() => setZoom(level.zoom)}
              className={`size-8 items-center justify-center rounded-full ${
                selected ? "bg-white" : "bg-black/50"
              }`}
            >
              <Text
                className={`text-xs font-display-medium ${selected ? "text-black" : "text-white"}`}
              >
                {level.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
