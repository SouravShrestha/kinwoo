import { useBusyWhile } from "@kinwoo/client/activity";
import { validateDisplayName } from "@kinwoo/core/auth";
import { useProfile } from "@kinwoo/client/profile";
import { useState } from "react";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";

import { BottomSheet } from "./BottomSheet";
import { TextField } from "./TextField";

export function DisplayNameSheet({ open }: { open: boolean }) {
  const { setDisplayName } = useProfile();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useBusyWhile(saving);

  const submit = async () => {
    const result = validateDisplayName(value);
    if (!result.ok) {
      setError("Enter a name we can call you by.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await setDisplayName(result.value);
      // Not closed here: saving clears needsDisplayName and the gate unmounts this sheet.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save that name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      label="Choose a display name"
      dismissable={false}
      showHandle={false}
      scrollable={false}
    >
      <Text className="font-display font-medium text-2xl text-foreground">
        What's your full name?
      </Text>
      <Text className="mt-2 text-muted-foreground">
        Enter your first and last name so others know it’s you.
      </Text>

      <TextField
        kind="name"
        value={value}
        onChangeText={(next) => {
          setValue(next);
          setError(null);
        }}
        disabled={saving}
        className="mt-6"
      />

      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-3 text-sm text-destructive">
          {error}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={saving}
        onPress={submit}
        className={`mt-5 h-14 flex-row items-center justify-center rounded-3xl bg-primary ${saving ? "opacity-50" : "active:opacity-80"}`}
      >
        <Text className="font-semibold text-base text-primary-foreground">
          {saving ? "Saving…" : "Continue"}
        </Text>
      </Pressable>

      <View className="h-2" />
    </BottomSheet>
  );
}
