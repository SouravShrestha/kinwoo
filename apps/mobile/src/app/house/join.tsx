import { useHouseLimit, useJoinCodeForm } from "@kinwoo/client/houses";
import {
  HOUSE_SCREEN_TITLES,
  JOIN_BLOCKED_TITLE,
  JOIN_SCREEN_HEADING,
  JOIN_SCREEN_SUBTITLE,
} from "@kinwoo/core/houses";
import { QrIcon, TextInputIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Field } from "@/components/houses/Field";
import { HouseLimitNotice } from "@/components/houses/HouseLimitNotice";
import { HouseScreen } from "@/components/houses/HouseScreen";
import { JoinPreviewSheet } from "@/components/houses/JoinPreviewSheet";
import { QrScanner } from "@/components/houses/QrScanner";
import { ErrorText } from "@/components/houses/Rows";
import { useTheme } from "@/theme/ThemeProvider";

type Confirmation = { code: string; open: boolean; id: number };

export default function JoinHouseScreen() {
  const limit = useHouseLimit();

  if (limit.checking || limit.blocked) {
    return (
      <HouseScreen
        title={limit.blocked ? JOIN_BLOCKED_TITLE : HOUSE_SCREEN_TITLES.join}
        noBack={limit.blocked}
      >
        {limit.blocked ? <HouseLimitNotice message={limit.message} /> : null}
      </HouseScreen>
    );
  }

  return <JoinForm />;
}

function JoinForm() {
  const { code, confirm } = useLocalSearchParams<{ code?: string; confirm?: string }>();
  const { resolvedTheme } = useTheme();
  const [scanning, setScanning] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(
    confirm === "1" && code ? { code, open: true, id: 0 } : null,
  );
  const sheetOpen = confirmation?.open === true;
  const form = useJoinCodeForm(
    (parsed) =>
      setConfirmation((current) => ({ code: parsed, open: true, id: (current?.id ?? 0) + 1 })),
    code,
  );

  const startScanning = () => {
    Keyboard.dismiss();
    setScanning(true);
  };

  return (
    <HouseScreen title={HOUSE_SCREEN_TITLES.join} scrollOnlyWithKeyboard>
      <Text accessibilityRole="header" className="font-display-medium text-2xl text-foreground">
        {JOIN_SCREEN_HEADING}
      </Text>
      <Text className="mb-6 mt-2 text-sm text-muted-foreground font-display-normal">
        {JOIN_SCREEN_SUBTITLE}
      </Text>
      {scanning ? (
        <View>
          <QrScanner
            onScan={(value) => {
              if (form.scan(value)) setScanning(false);
            }}
          />
          <ErrorText message={form.error} />
          <Button
            className="mt-6"
            variant="outline"
            label="Enter code instead"
            icon={<TextInputIcon size={20} color={colors[resolvedTheme].foreground} />}
            iconClassName="mr-4"
            onPress={() => setScanning(false)}
          />
        </View>
      ) : (
        <View>
          <Field
            label="Invite code"
            value={form.value}
            onChangeText={form.setValue}
            placeholder="ABC234"
            inputClassName="font-display-medium"
            letterSpacing={4}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => {
              if (!sheetOpen) form.submit();
            }}
            error={form.error}
            disabled={form.checking}
          />
          <Button
            className="mt-6"
            label="Let me in"
            loading={form.checking}
            disabled={form.value.trim() === "" || sheetOpen}
            onPress={form.submit}
          />
          <Text className="my-5 text-center text-sm text-muted-foreground font-display-normal">
            or
          </Text>
          <Button
            variant="outline"
            label="Scan QR code"
            icon={<QrIcon size={20} color={colors[resolvedTheme].foreground} />}
            disabled={form.checking}
            onPress={startScanning}
          />
        </View>
      )}
      {confirmation ? (
        <JoinPreviewSheet
          key={confirmation.id}
          code={confirmation.code}
          open={confirmation.open}
          onClose={() => setConfirmation((current) => current && { ...current, open: false })}
        />
      ) : null}
    </HouseScreen>
  );
}
