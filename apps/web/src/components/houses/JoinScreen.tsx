"use client";

import { useJoinCodeForm } from "@kinwoo/client/houses";
import {
  HOUSE_SCREEN_TITLES,
  JOIN_SCREEN_HEADING,
  JOIN_SCREEN_SUBTITLE,
} from "@kinwoo/core/houses";
import { QrIcon, TextInputIcon } from "@kinwoo/icons";
import { useState } from "react";
import { Button } from "../Button";
import { Field } from "./Field";
import { HouseScreen } from "./HouseScreen";
import { JoinPreviewSheet } from "./JoinPreviewSheet";
import { QrScanner } from "./QrScanner";
import { ErrorText } from "./Rows";

type Confirmation = { code: string; open: boolean; id: number };

export function JoinScreen({
  initialCode,
  confirmInitialCode = false,
}: {
  initialCode?: string;
  confirmInitialCode?: boolean;
}) {
  const [scanning, setScanning] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(
    confirmInitialCode && initialCode ? { code: initialCode, open: true, id: 0 } : null,
  );
  const sheetOpen = confirmation?.open === true;
  const form = useJoinCodeForm(
    (code) => setConfirmation((current) => ({ code, open: true, id: (current?.id ?? 0) + 1 })),
    initialCode,
  );

  return (
    <HouseScreen title={HOUSE_SCREEN_TITLES.join}>
      <h2 className="font-display text-2xl font-medium">{JOIN_SCREEN_HEADING}</h2>
      <p className="mb-6 mt-2 font-display text-sm font-normal text-muted-foreground">
        {JOIN_SCREEN_SUBTITLE}
      </p>
      {scanning ? (
        <div>
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
            icon={<TextInputIcon size={20} className="mr-1.5" />}
            onClick={() => setScanning(false)}
          />
        </div>
      ) : (
        <div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!sheetOpen) form.submit();
            }}
          >
            <Field
              label="Invite code"
              value={form.value}
              onValueChange={form.setValue}
              placeholder="ABC234"
              inputClassName="font-medium tracking-[4px]"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              error={form.error}
              disabled={form.checking}
            />
            <Button
              className="mt-6"
              label="Let me in"
              type="submit"
              loading={form.checking}
              disabled={form.value.trim() === "" || sheetOpen}
            />
          </form>
          <p className="my-5 text-center font-display text-sm font-normal text-muted-foreground">
            or
          </p>
          <Button
            variant="outline"
            label="Scan QR code"
            icon={<QrIcon size={20} />}
            disabled={form.checking}
            onClick={() => setScanning(true)}
          />
        </div>
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
