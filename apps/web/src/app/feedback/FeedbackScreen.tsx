"use client";

import { ApiRequestError, apiRequest } from "@kinwoo/client/api";
import { useAuth } from "@kinwoo/client/auth";
import { toast } from "@kinwoo/client/toast";
import {
  FEEDBACK_COPY,
  FEEDBACK_DESCRIPTION_MAX,
  FEEDBACK_EMAIL_MAX,
  FEEDBACK_HONEYPOT_FIELD,
  FEEDBACK_SUBJECT_MAX,
  FEEDBACK_TYPES,
  type FeedbackTypeId,
} from "@kinwoo/core/app";
import { CaretDownIcon } from "@kinwoo/icons";
import { useId, useState, type FormEvent } from "react";

import { PublicBackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { OptionSheet } from "@/components/grocery/OptionSheet";
import { Field, RequiredMark } from "@/components/houses/Field";

const LABEL = "mb-3 block font-display text-sm font-normal text-foreground";
const CONTROL =
  "w-full rounded-2xl border border-border bg-muted px-4 font-display text-base font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function FeedbackScreen() {
  const { user } = useAuth();
  const descriptionId = useId();
  const [typedEmail, setTypedEmail] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<FeedbackTypeId>(FEEDBACK_TYPES[0].id);
  const [typeOpen, setTypeOpen] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);

  const typeLabel = FEEDBACK_TYPES.find((option) => option.id === type)?.label;
  const email = typedEmail ?? user?.email ?? "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      await apiRequest("/api/feedback", {
        method: "POST",
        body: { email, subject, description, type, [FEEDBACK_HONEYPOT_FIELD]: honeypot },
      });
      toast.success(FEEDBACK_COPY.sent);
      setSubject("");
      setDescription("");
      setType(FEEDBACK_TYPES[0].id);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : FEEDBACK_COPY.failed);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <PublicBackButton />
      <h1 className="mt-6 font-display text-2xl font-medium">{FEEDBACK_COPY.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{FEEDBACK_COPY.intro}</p>

      <form className="relative mt-8 flex flex-col gap-6" onSubmit={submit}>
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Do not fill
            <input
              type="text"
              name={FEEDBACK_HONEYPOT_FIELD}
              tabIndex={-1}
              // Browsers often ignore "off"; an unknown token reliably disables autofill.
              autoComplete="kw-honeypot"
              data-1p-ignore=""
              data-lpignore="true"
              data-bwignore=""
              data-form-type="other"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </label>
        </div>

        <Field
          label={FEEDBACK_COPY.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={FEEDBACK_EMAIL_MAX}
          value={email}
          onValueChange={setTypedEmail}
        />

        <Field
          label={FEEDBACK_COPY.subject}
          required
          maxLength={FEEDBACK_SUBJECT_MAX}
          value={subject}
          onValueChange={setSubject}
        />

        <div>
          <label htmlFor={descriptionId} className={LABEL}>
            {FEEDBACK_COPY.description}
            <RequiredMark />
          </label>
          <textarea
            id={descriptionId}
            required
            rows={6}
            maxLength={FEEDBACK_DESCRIPTION_MAX}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${CONTROL} block resize-none py-3.5`}
          />
        </div>

        <div>
          <span className={LABEL}>
            {FEEDBACK_COPY.type}
            <RequiredMark />
          </span>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`${FEEDBACK_COPY.type}: ${typeLabel}. Change type`}
            onClick={() => setTypeOpen(true)}
            className={`${CONTROL} flex h-[54px] items-center justify-between gap-3 text-left hover:cursor-pointer hover:opacity-80`}
          >
            <span className="truncate">{typeLabel}</span>
            <CaretDownIcon size={9} className="shrink-0" />
          </button>
        </div>

        <Button type="submit" label={FEEDBACK_COPY.submit} loading={sending} className="mt-4" />
      </form>

      <OptionSheet
        open={typeOpen}
        onClose={() => setTypeOpen(false)}
        title={FEEDBACK_COPY.type}
        options={FEEDBACK_TYPES}
        selectedId={type}
        onSelect={(id) => {
          setType(id as FeedbackTypeId);
          setTypeOpen(false);
        }}
      />
    </main>
  );
}
