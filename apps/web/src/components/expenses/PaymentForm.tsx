"use client";

import {
  amountDraftToPaise,
  isPaymentAmountDraft,
  PAYMENT_AMOUNT_WIDEST,
} from "@kinwoo/core/expenses";
import {
  ArrowRightIcon,
  EditIcon,
  GiveMoneyIcon,
  RecordPaymentIcon,
  RupeeIcon,
  TickIcon,
  TrashIcon,
} from "@kinwoo/icons";
import { useEffect, useRef, useState, type AnimationEvent, type ReactNode } from "react";

import { Button } from "@/components/Button";
import { Avatar } from "@/components/houses/Avatar";
import { cn } from "@/lib/utils";

const AVATAR = 72;
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const ICON_BUTTON =
  "flex size-9 items-center justify-center rounded-lg transition-opacity hover:cursor-pointer hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50";

export type PaymentParty = { name: string | null; url: string | null };

export type PaymentFormData = {
  payer: PaymentParty;
  payee: PaymentParty;
  heading: string;
  email: string | null;
  initialAmount: string;
};

function Body({
  data,
  note,
  submitLabel,
  submitting,
  onSubmit,
  requireChange,
  readOnly,
  onDelete,
  closing,
}: {
  data: PaymentFormData;
  note: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (amountPaise: number) => void;
  requireChange: boolean;
  readOnly: boolean;
  onDelete?: () => void;
  closing: boolean;
}) {
  const amountInput = useRef<HTMLInputElement>(null);
  // Null until the user types, so the field follows the starting amount until then.
  const [draft, setDraft] = useState<string | null>(null);
  const amount = draft ?? data.initialAmount;
  const amountPaise = amountDraftToPaise(amount);
  const validAmount = amountPaise > 0;
  const changed = amountPaise !== amountDraftToPaise(data.initialAmount);
  // The amount only counts once confirmed, and nothing can be submitted while editing.
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (editing) amountInput.current?.focus();
  }, [editing]);

  const toggle = () => setEditing((value) => !value);
  const editLabel = editing ? "Confirm amount" : "Edit amount";
  const editIcon = editing ? <TickIcon size={18} /> : <EditIcon size={18} />;

  return (
    <>
      {!readOnly && onDelete ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto flex w-full max-w-md justify-end px-6 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Delete payment"
            disabled={closing || editing}
            onClick={onDelete}
            className={cn(ICON_BUTTON, FOCUS_RING, "pointer-events-auto bg-muted text-foreground")}
          >
            <TrashIcon size={16} />
          </button>
        </div>
      ) : null}

      <div className="mt-16 flex flex-col items-center px-6">
        <div className="flex items-center gap-6">
          <Avatar name={data.payer.name} url={data.payer.url} size={AVATAR} />
          <GiveMoneyIcon size={44} className="text-foreground" />
          <Avatar name={data.payee.name} url={data.payee.url} size={AVATAR} />
        </div>
        <h2 className="mt-6 font-display text-xl font-normal text-foreground">{data.heading}</h2>
        {data.email ? (
          <p className="mt-1 font-display text-xs text-muted-foreground">{data.email}</p>
        ) : null}
        <div className="mt-6 flex items-center gap-3 font-display text-[40px] leading-[56px] text-foreground">
          <RupeeIcon size={30} />
          <label className="relative">
            <span className="sr-only">Amount</span>
            <span aria-hidden className="invisible block min-w-[1ch] whitespace-pre pr-1">
              {amount.length > PAYMENT_AMOUNT_WIDEST.length ? amount : PAYMENT_AMOUNT_WIDEST}
            </span>
            <input
              ref={amountInput}
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              placeholder="0"
              readOnly={!editing}
              onKeyDown={(event) => {
                if (event.key === "Enter" && validAmount) setEditing(false);
              }}
              value={amount}
              onChange={(event) =>
                isPaymentAmountDraft(event.target.value) && setDraft(event.target.value)
              }
              className="absolute inset-0 w-full bg-transparent text-center outline-none placeholder:text-muted-foreground"
            />
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 -bottom-1 h-0.5 rounded-full",
                editing ? "bg-foreground" : "bg-transparent",
              )}
            />
          </label>
          {readOnly ? null : (
            <button
              type="button"
              aria-label={editLabel}
              disabled={editing && !validAmount}
              onClick={toggle}
              className={cn(
                editing
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground",
                "ml-2 flex size-10 items-center justify-center rounded-full border transition-opacity hover:cursor-pointer hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50",
                FOCUS_RING,
              )}
            >
              {editIcon}
            </button>
          )}
        </div>
      </div>
      <div
        inert={editing}
        className={cn(
          "mt-auto flex flex-col gap-4 px-6 pt-10 pb-[calc(1rem+env(safe-area-inset-bottom))]",
          editing && "invisible",
        )}
      >
        <p className="text-center font-display text-sm text-muted-foreground">{note}</p>
        {readOnly ? null : (
          <Button
            label={submitLabel}
            icon={<RecordPaymentIcon size={20} />}
            loading={submitting}
            disabled={!validAmount || (requireChange && !changed)}
            onClick={() => onSubmit(amountPaise)}
          />
        )}
      </div>
    </>
  );
}

// Shared by recording a payment and viewing one. Without `data` only the header shows.
export function PaymentForm({
  data,
  closing,
  onClose,
  onClosed,
  title,
  requireChange = false,
  readOnly = false,
  children,
  ...rest
}: {
  data: PaymentFormData | null;
  closing: boolean;
  onClose: () => void;
  onClosed: () => void;
  title: string;
  note: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (amountPaise: number) => void;
  // The submit button stays off until the amount differs from the one it started with.
  requireChange?: boolean;
  readOnly?: boolean;
  onDelete?: () => void;
  // Rendered inside the sheet, for dialogs.
  children?: ReactNode;
}) {
  // Children fire their own animationend events, which bubble up here.
  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (closing && event.target === event.currentTarget) onClosed();
  };

  return (
    <main
      onAnimationEnd={onAnimationEnd}
      className={cn(
        "relative flex h-dvh flex-col overflow-hidden bg-background",
        closing ? "sheet-panel-out" : "sheet-panel-in",
      )}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto">
        <header className="px-6 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Back"
            disabled={closing}
            onClick={onClose}
            className={cn(
              "flex size-10 items-center justify-start hover:cursor-pointer",
              FOCUS_RING,
            )}
          >
            <ArrowRightIcon size={28} className="rotate-90" />
          </button>
          <h1 className="sr-only">{title}</h1>
        </header>
        {data ? (
          <Body
            data={data}
            requireChange={requireChange}
            readOnly={readOnly}
            closing={closing}
            {...rest}
          />
        ) : null}
      </div>
      {children}
    </main>
  );
}
