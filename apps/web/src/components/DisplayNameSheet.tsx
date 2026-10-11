"use client";

import { useProfile } from "@kinwoo/client/profile";
import { validateDisplayName } from "@kinwoo/core/auth";
import { useState } from "react";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { TextField } from "./TextField";

export function DisplayNameSheet({ open }: { open: boolean }) {
  const { setDisplayName } = useProfile();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      // Not closed here: saving clears needsDisplayName and the gate unmounts
      // this sheet.
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
      zClassName="z-105"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 className="font-display text-2xl font-medium">What&apos;s your full name?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your first and last name so others know it&apos;s you.
        </p>

        <TextField
          kind="name"
          value={value}
          onChange={(next) => {
            setValue(next);
            setError(null);
          }}
          disabled={saving}
          errorId={error ? "display-name-error" : undefined}
          className="mt-6"
        />

        {error ? (
          <p id="display-name-error" role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          label={saving ? "Saving…" : "Continue"}
          loading={saving}
          className="mt-5 rounded-3xl font-sans font-semibold"
        />
      </form>
    </BottomSheet>
  );
}
