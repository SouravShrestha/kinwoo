"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { ArrowRightIcon } from "@kinwoo/icons";
import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm text-muted-foreground">{title}</h2>
      <ul className="mt-2">{children}</ul>
    </section>
  );
}

function RowBody({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) {
  return (
    <>
      <span className="w-9 shrink-0">{icon}</span>
      <span className="flex-1 text-base">{label}</span>
      {value ? <span className="mr-2 text-sm text-muted-foreground">{value}</span> : null}
      <ArrowRightIcon size={16} className="text-muted-foreground" />
    </>
  );
}

// Routes without a loading.tsx (legal, feedback) give no feedback until they land, so the row
// drives the top bar while its navigation is pending.
function PendingLinkBusy() {
  useBusyWhile(useLinkStatus().pending);
  return null;
}

const ROW =
  "flex h-14 w-full items-center text-left hover:cursor-pointer hover:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground";

export function SettingsInfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="mt-2 flex h-14 items-center">
      <span className="w-9 shrink-0">{icon}</span>
      <span className="flex-1 text-base">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </li>
  );
}

export function SettingsLinkRow({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <li className="mt-2">
      <Link href={href} className={ROW} aria-label={value ? `${label}, ${value}` : label}>
        <RowBody icon={icon} label={label} value={value} />
        <PendingLinkBusy />
      </Link>
    </li>
  );
}

export function SettingsButtonRow({
  onClick,
  icon,
  label,
  value,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <li className="mt-2">
      <button
        type="button"
        onClick={onClick}
        className={ROW}
        aria-label={value ? `${label}, ${value}` : label}
      >
        <RowBody icon={icon} label={label} value={value} />
      </button>
    </li>
  );
}
