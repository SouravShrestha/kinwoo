"use client";

// Vendored component: the arrival stamps live in refs read during render on purpose (they must not
// trigger renders), and the status effect drives state by design.
/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect */

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/*
 * OTP Input – the verification code field, in a single self-contained file.
 * One real input sits under the boxes, so typing, Backspace, paste and the SMS autofill of
 * iOS and Android all work natively; the boxes only draw what it holds.
 * The focus ring glides from box to box with a soft blinking caret, digits pop in, a pasted code
 * fills the boxes one after another. Verifying shimmers, a wrong code shakes, a right one outlines
 * the boxes green with "Verified" below. The styles are injected below, so no extra files are needed.
 * Kinwoo: colours read the raw @kinwoo/tokens variables (--muted, --card…), not shadcn's --color-*.
 */

export type OtpStatus = "idle" | "verifying" | "error" | "success";

export type OtpInputProps = {
  /** Number of boxes */
  length?: number;
  /** The code (controlled) */
  value: string;
  onChange?: (code: string) => void;
  /** Called once the last box is filled – typed, pasted or autofilled */
  onComplete?: (code: string) => void;
  status?: OtpStatus;
  /** Shown below the boxes while `status` is "error" */
  errorMessage?: ReactNode;
  /** Center the boxes and the lines below them */
  align?: "start" | "center";
  autoFocus?: boolean;
};

const SUCCESS_LABEL = "Verified";

/** Full-width (１２３) and Arabic-Indic digits (٤٨٢) count as the digits they are */
const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x6f0));

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  status = "idle",
  errorMessage = "That code didn't work. Try again.",
  align = "start",
  autoFocus = false,
}: OtpInputProps) {
  /** Keeps digits only – spaces and dashes of a pasted "482 913" fall away */
  const clean = (text: string) =>
    normalize(String(text ?? ""))
      .replace(/[^0-9]/g, "")
      .slice(0, length);

  const code = clean(value);
  const [idx, setIdx] = useState(Math.min(code.length, length - 1));
  const [focused, setFocused] = useState(false);
  const [errorShown, setErrorShown] = useState(false);
  const [announce, setAnnounce] = useState("");

  const input = useRef<HTMLInputElement>(null);
  const slots = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const boxes = useRef<(HTMLSpanElement | null)[]>([]);
  const id = useId();

  // Every character remembers when it arrived, so it pops in once; pasted codes arrive one after another
  const prevCode = useRef(code);
  const stamps = useRef<number[]>([]);
  const delays = useRef<number[]>([]);
  const counter = useRef(0);
  if (prevCode.current !== code) {
    const before = prevCode.current;
    const changed = [...code].map((c, i) => c !== before[i]);
    const first = changed.indexOf(true);
    const bulk = changed.filter(Boolean).length > 1;
    changed.forEach((ch, i) => {
      if (!ch) return;
      stamps.current[i] = ++counter.current;
      delays.current[i] = bulk ? (i - first) * 45 : 0;
    });
    prevCode.current = code;
  }

  // An outside change of the value (or a shorter code) keeps the active box in reach
  const active = Math.min(idx, code.length, length - 1);

  const readOnly = status === "verifying" || status === "success";
  const showError = status === "error" && errorShown;
  // The ring shows where the next character goes: while focused, or mid-way through a code
  const showRing = !readOnly && (focused || (code.length > 0 && code.length < length));

  const commit = (next: string, nextIdx: number) => {
    if (next !== code) onChange?.(next);
    setIdx(Math.max(0, Math.min(nextIdx, next.length, length - 1)));
    if (errorShown && next.length) setErrorShown(false);
    if (next.length === length && next !== code) onComplete?.(next);
  };

  /* ---------- Native input ---------- */

  const onInput = (el: HTMLInputElement) => {
    if (readOnly) return;
    const raw = el.value;
    const caretRaw = el.selectionStart ?? raw.length;
    const next = clean(raw);
    // The caret counts the kept characters in front of it
    const caret = clean(raw.slice(0, caretRaw)).length;
    if (next === code) {
      el.value = code;
      syncSelection();
      return;
    }
    commit(next, caret);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (readOnly) return;
    const text = clean(e.clipboardData.getData("text"));
    if (!text) return;
    // A whole code replaces everything; a part is written from the active box on
    if (text.length >= length) return commit(text.slice(0, length), length - 1);
    const next = (code.slice(0, active) + text + code.slice(active + text.length)).slice(0, length);
    commit(next, active + text.length);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const last = Math.min(code.length, length - 1);
    const moves: Record<string, number> = {
      ArrowLeft: active - 1,
      ArrowRight: active + 1,
      Home: 0,
      End: last,
      ArrowUp: 0,
      ArrowDown: last,
    };
    if (e.key in moves && !e.shiftKey && !e.metaKey) {
      e.preventDefault();
      setIdx(Math.max(0, Math.min(moves[e.key], last)));
    }
  };

  /** A tap or click picks the box under the pointer – never beyond the first empty one */
  const pick = (x: number) => {
    let i = boxes.current.findIndex((b) => b && x < b.getBoundingClientRect().right + 4);
    if (i < 0) i = length - 1;
    setIdx(Math.min(i, code.length, length - 1));
    requestAnimationFrame(syncSelection);
  };

  // The real input selects the active character, so typing replaces it and Backspace removes it
  const syncSelection = () => {
    const el = input.current;
    if (!el || document.activeElement !== el) return;
    const i = Math.min(idx, code.length, length - 1);
    if (i < code.length) el.setSelectionRange(i, i + 1);
    else el.setSelectionRange(i, i);
  };
  useLayoutEffect(syncSelection);

  // A layout effect focuses in the same task as the commit: iOS and Android only let a script move
  // focus (and keep the keyboard up) while still inside that task. Also on an error, for the retry.
  useLayoutEffect(() => {
    if (autoFocus || status === "error") input.current?.focus({ preventScroll: true });
  }, [autoFocus, status]);

  /* ---------- The gliding ring ---------- */

  useLayoutEffect(() => {
    const r = ring.current;
    const box = boxes.current[active];
    if (r && box) {
      const first = !r.dataset.ready;
      if (first) r.style.transition = "none";
      r.style.width = `${box.offsetWidth}px`;
      r.style.height = `${box.offsetHeight}px`;
      r.style.transform = `translate(${box.offsetLeft}px, ${box.offsetTop}px)`;
      if (first) {
        r.dataset.ready = "1";
        void r.offsetWidth;
        r.style.transition = "";
      }
    }
  });

  // Phones turning, containers resizing: the ring follows
  useEffect(() => {
    const s = slots.current;
    if (!s) return;
    const ro = new ResizeObserver(() => {
      const r = ring.current;
      const box = boxes.current[active];
      if (r && box) {
        r.style.width = `${box.offsetWidth}px`;
        r.style.height = `${box.offsetHeight}px`;
        r.style.transform = `translate(${box.offsetLeft}px, ${box.offsetTop}px)`;
      }
    });
    ro.observe(s);
    return () => ro.disconnect();
  }, [active]);

  /* ---------- Status ---------- */

  const prevStatus = useRef(status);
  useEffect(() => {
    const before = prevStatus.current;
    prevStatus.current = status;
    if (status === before) return;
    if (status === "verifying") setAnnounce("Verifying code");
    if (status === "success") setAnnounce(SUCCESS_LABEL);
    if (status !== "error") {
      setErrorShown(false);
      return;
    }
    setErrorShown(true);
    setAnnounce(typeof errorMessage === "string" ? errorMessage : "That code didn't work");
    // A calm shake on a rejected code
    if (!reduced()) {
      slots.current?.animate(
        [
          { transform: "none" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(5px)" },
          { transform: "translateX(-3px)" },
          { transform: "translateX(2px)" },
          { transform: "none" },
        ],
        { duration: 420, easing: "ease-out" },
      );
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Render ---------- */

  const cells: ReactNode[] = [];
  for (let i = 0; i < length; i++) {
    const ch = code[i];
    cells.push(
      <span
        key={i}
        ref={(el) => {
          boxes.current[i] = el;
        }}
        className="ui-otp__box"
        data-filled={ch ? "" : undefined}
        style={{ "--i": i } as CSSProperties}
      >
        {ch && (
          <span
            key={stamps.current[i]}
            className="ui-otp__char"
            style={{ animationDelay: `${delays.current[i] ?? 0}ms` }}
          >
            {ch}
          </span>
        )}
      </span>,
    );
  }

  return (
    <div
      className="ui-otp"
      data-status={status}
      data-error={showError || undefined}
      data-align={align}
    >
      {/* React 19 hoists this into <head> once, no matter how many fields render */}
      <style href="ui-otp-input" precedence="default">
        {css}
      </style>

      <div className="ui-otp__field">
        <div
          ref={slots}
          className="ui-otp__slots"
          dir="ltr"
          style={{ "--n": length } as CSSProperties}
        >
          {cells}
          <span
            ref={ring}
            className="ui-otp__ring"
            data-show={showRing || undefined}
            aria-hidden="true"
          >
            <span
              className="ui-otp__caret"
              data-show={(focused && !code[active] && !readOnly) || undefined}
            />
          </span>
          <input
            ref={input}
            className="ui-otp__input"
            type="text"
            value={code}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-label={`Verification code, ${length} digits`}
            aria-invalid={showError || undefined}
            aria-describedby={showError ? `${id}-msg` : undefined}
            onChange={(e) => onInput(e.currentTarget)}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            onFocus={() => {
              setFocused(true);
              requestAnimationFrame(syncSelection);
            }}
            onBlur={() => setFocused(false)}
            onPointerUp={(e) => pick(e.clientX)}
            onSelect={(e) => {
              // A native caret move (long press, mouse drag) snaps back to a single box
              const el = e.currentTarget;
              const want = active < code.length ? [active, active + 1] : [active, active];
              if (el.selectionStart !== want[0] || el.selectionEnd !== want[1]) syncSelection();
            }}
          />
        </div>
      </div>

      {/* The error (or "Verified") slides in below; an error folds away once retyping starts */}
      <div className="ui-otp__msg" data-show={showError || status === "success" || undefined}>
        <div className="ui-otp__msg-inner">
          <p id={`${id}-msg`} className="ui-otp__msg-text">
            {status === "success" ? SUCCESS_LABEL : errorMessage}
          </p>
        </div>
      </div>

      <span className="ui-otp__live" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = /* css */ `
/* Colors, size and motion as variables – override them on .ui-otp */
.ui-otp {
  --ui-otp-box: 48px;
  --ui-otp-gap: 8px;
  /* Colors come from @kinwoo/tokens, with neutral fallbacks when one isn't there */
  --ui-otp-bg: var(--muted, #fafafa);
  --ui-otp-card: var(--card, #ffffff);
  --ui-otp-line: var(--border, #e4e4e7);
  --ui-otp-line-strong: var(--card-border, #cfcfd4);
  --ui-otp-ink: var(--foreground, #171717);
  --ui-otp-text: var(--foreground, #404040);
  --ui-otp-muted: var(--muted-foreground, #8f8f8f);
  --ui-otp-wait: var(--muted, #f2f2f3);
  --ui-otp-shine: color-mix(in oklab, var(--card, #ffffff) 95%, transparent);
  --ui-otp-danger: var(--destructive, #e5484d);
  --ui-otp-success: var(--positive, #2f9e5b);
  --ui-otp-ease: cubic-bezier(0.22, 1, 0.36, 1);
  box-sizing: border-box;
  container-type: inline-size;
  display: grid;
  justify-self: stretch; /* it sizes the boxes from its own width, so it must never shrink to fit them */
  width: 100%;
  font-family: var(--font-inter, "Inter"), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--ui-otp-text);
  -webkit-font-smoothing: antialiased;
}
.ui-otp *, .ui-otp *::before, .ui-otp *::after { box-sizing: border-box; }
.ui-otp[data-align="center"] { justify-items: center; text-align: center; }

.ui-otp__field { display: flex; min-width: 0; }
.ui-otp[data-align="center"] .ui-otp__field { justify-content: center; }

/* The boxes scale down to fit their container (phones at 320px), up to --ui-otp-box */
.ui-otp__slots {
  --size: min(var(--ui-otp-box), calc((100cqi - (var(--n) - 1) * var(--ui-otp-gap)) / var(--n)));
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--ui-otp-gap);
}
.ui-otp__box {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: var(--size);
  height: var(--size);
  overflow: hidden;
  border-radius: calc(var(--size) * 0.24);
  background: var(--ui-otp-bg);
  box-shadow: inset 0 0 0 1px var(--ui-otp-line);
  font-size: calc(var(--size) * 0.46);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--ui-otp-ink);
  transition: box-shadow 220ms ease, background-color 220ms ease, transform 380ms var(--ui-otp-ease), opacity 260ms ease;
}
.ui-otp__box[data-filled] { background: var(--ui-otp-card); box-shadow: inset 0 0 0 1px var(--ui-otp-muted); }

/* Digits pop in – a small lift out of a blur, no bounce */
.ui-otp__char { display: block; animation: ui-otp-pop 280ms var(--ui-otp-ease) both; }

/* One ring glides from box to box; its caret blinks softly in an empty box */
.ui-otp__ring {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  border-radius: calc(var(--size) * 0.24);
  box-shadow: inset 0 0 0 1.5px var(--ui-otp-ink);
  opacity: 0;
  pointer-events: none;
  transition: transform 260ms var(--ui-otp-ease), width 260ms var(--ui-otp-ease), opacity 180ms ease, box-shadow 220ms ease;
}
.ui-otp__ring[data-show] { opacity: 1; }
.ui-otp__caret { width: 1.5px; height: 40%; border-radius: 1px; background: var(--ui-otp-ink); opacity: 0; }
.ui-otp__caret[data-show] { animation: ui-otp-blink 1.1s ease-in-out infinite; }

/* The real input lies over the boxes, invisible – it takes taps, keys, paste and SMS autofill */
.ui-otp__input {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: transparent;
  -webkit-text-fill-color: transparent;
  caret-color: transparent;
  font-size: 16px; /* iOS doesn't zoom into inputs of 16px and up */
  letter-spacing: -1em;
  cursor: text;
  appearance: none;
}
.ui-otp__input::selection { background: transparent; }
.ui-otp__input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px transparent inset; transition: background-color 9999s; }
/* Keyboard focus is shown by the ring – a thin outline joins it for keyboard users */

/* Verifying: a soft light passes over the boxes, one after another */
.ui-otp__box::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 20%, var(--ui-otp-shine) 50%, transparent 80%);
  transform: translateX(-120%);
  opacity: 0;
  pointer-events: none;
}
.ui-otp[data-status="verifying"] .ui-otp__box::after { opacity: 1; animation: ui-otp-shimmer 1.3s ease-in-out infinite; animation-delay: calc(var(--i) * 70ms); }
.ui-otp[data-status="verifying"] .ui-otp__box { background: var(--ui-otp-wait); box-shadow: inset 0 0 0 1px var(--ui-otp-line); color: var(--ui-otp-text); }

/* Error: the ring and caret turn red; empty boxes get the muted outline */
.ui-otp[data-error] .ui-otp__box:not([data-filled]) { box-shadow: inset 0 0 0 1px var(--ui-otp-muted); }
.ui-otp[data-error] .ui-otp__ring { box-shadow: inset 0 0 0 1.5px var(--ui-otp-danger); }
.ui-otp[data-error] .ui-otp__caret { background: var(--ui-otp-danger); }

/* Success: every box takes a green outline, "Verified" shows below (matches mobile) */
.ui-otp[data-status="success"] .ui-otp__box { box-shadow: inset 0 0 0 2px var(--ui-otp-success); }
.ui-otp[data-status="success"] .ui-otp__msg-text { color: var(--ui-otp-success); }

/* The error message grows in below, then folds away */
.ui-otp__msg { display: grid; grid-template-rows: 0fr; width: 100%; transition: grid-template-rows 300ms var(--ui-otp-ease); }
.ui-otp__msg[data-show] { grid-template-rows: 1fr; }
.ui-otp__msg-inner { min-height: 0; overflow: hidden; }
.ui-otp__msg-text {
  margin: 0;
  overflow-wrap: anywhere;
  padding-top: 10px;
  font-size: 13px;
  font-weight: 400;
  text-align: center;
  color: var(--ui-otp-danger);
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 200ms ease, transform 300ms var(--ui-otp-ease);
}
.ui-otp__msg[data-show] .ui-otp__msg-text { opacity: 1; transform: none; transition-delay: 60ms; }

.ui-otp__live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

@keyframes ui-otp-pop { from { opacity: 0; transform: translateY(4px) scale(0.7); filter: blur(3px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes ui-otp-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes ui-otp-shimmer { 0% { transform: translateX(-120%); } 55%, 100% { transform: translateX(120%); } }

/* Narrow containers (phones): tighter gaps */
@container (max-width: 360px) {
  .ui-otp__slots { --ui-otp-gap: 6px; }
}
@media (prefers-reduced-motion: reduce) {
  .ui-otp *, .ui-otp *::before, .ui-otp *::after { animation: none !important; transition: none !important; }
  .ui-otp__caret[data-show] { opacity: 1; }
}
`;
