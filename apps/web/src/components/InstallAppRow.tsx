"use client";

import { APP_NAME, PLAY_STORE_URL } from "@kinwoo/core/app";
import { InstallIcon } from "@kinwoo/icons";
import { useState } from "react";

import { BottomSheet } from "./BottomSheet";
import { InstallSteps } from "./InstallSteps";
import { SettingsButtonRow, SettingsLinkRow } from "./Settings";
import { promptInstall, useInstallKind } from "@/lib/install-prompt";

export function InstallAppRow() {
  const kind = useInstallKind();
  const [stepsOpen, setStepsOpen] = useState(false);

  if (kind === "none") return null;

  if (kind === "android") {
    return (
      <SettingsLinkRow href={PLAY_STORE_URL} icon={<InstallIcon size={20} />} label="Install app" />
    );
  }

  return (
    <>
      <SettingsButtonRow
        onClick={() => (kind === "native" ? void promptInstall() : setStepsOpen(true))}
        icon={<InstallIcon size={20} />}
        label="Install app"
      />
      <BottomSheet
        open={stepsOpen}
        onClose={() => setStepsOpen(false)}
        label="Install app"
        showClose
      >
        <h2 className="pr-10 font-display text-xl font-medium">Install {APP_NAME}</h2>
        <InstallSteps />
      </BottomSheet>
    </>
  );
}
