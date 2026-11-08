"use client";

/* Bencho's "One-time code" (MIT, bencho.dev/licence), wired to Kinwoo's sign-in: the code and the
   answer come from the caller instead of the demo's Accept/Reject knob. Each frame is a render
   that reads the clock and the loop's refs on purpose, so the moving parts never cause renders
   of their own, and the status effect drives the drain by design. */
/* eslint-disable react-hooks/refs, react-hooks/purity, react-hooks/set-state-in-effect */

import { CheckIcon } from "@kinwoo/icons";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type ReactNode,
} from "react";

/* One invisible input over drawn cells (paste, SMS autofill, backspace and screen readers stay
   native). The cells sit under a blur-and-threshold "goo" filter, far enough apart that it never
   bridges them; on success they slide together and the filter fuses them into one capsule. */

/* Read once: a preference, not a live input. */
const stillness = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* how long a cell takes to swell and settle when a digit lands */
const POP_MS = 260;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const u = clamp((v - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};

/* the air between two cells. Kinwoo: the cells themselves are
   sized from the row's width so they fill it, keeping Bencho's
   36x44 shape; the gap stays fixed, since it is what keeps the
   goo from bridging them before the merge */
const G = 12;
const ASPECT = 44 / 36;
const CORNER = 12;
/* ── the merge is a SPRING, not a tween ─────────────────
   It was a 560ms ease-in-out, which arrived and stopped. A
   spring a little under critical lets the capsule run past its
   size and come back — stretching long and thin on the way out
   and settling round — which is what makes the fuse read as
   liquid rather than as boxes sliding. Per frame at 60Hz, from
   a stiffness and a damping ratio, as spring.ts does. */
const MERGE = (() => {
  const k = 0.075;
  const zeta = 0.42;
  return { k, d: 1 - 2 * zeta * Math.sqrt(k) };
})();
const SHAKE_MS = 620;

/** Full-width (１２３) and Arabic-Indic digits (٤٨٢) count as the digits they are */
const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x6f0));

type Phase = "type" | "check" | "ok" | "no";
export type OneTimeCodeStatus = "idle" | "verifying" | "error" | "success";

export function OneTimeCode({
  length = 6,
  value,
  onChange,
  onComplete,
  status = "idle",
  errorMessage,
  autoFocus = false,
}: {
  /** how many digits */
  length?: number;
  /** the code (controlled) */
  value: string;
  onChange?: (code: string) => void;
  /** called once the last cell is filled – typed, pasted or autofilled */
  onComplete?: (code: string) => void;
  /** the caller's answer: verifying breathes, success fuses, error shivers and drains */
  status?: OneTimeCodeStatus;
  /** shown below the row while `status` is "error" */
  errorMessage?: ReactNode;
  autoFocus?: boolean;
}) {
  const n = length;
  const root = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(36);
  const H = Math.round(W * ASPECT);
  /* the capsule a right code becomes. Kinwoo: a pill hugging "✓ Verified" with padding round
     it, instead of Bencho's fixed 128; the cells shrink to its height as they close in, or they
     would stand out of it */
  const label = useRef<HTMLSpanElement | null>(null);
  const [labelW, setLabelW] = useState(0);
  const fs = H * 0.24;
  const capH = fs * 2.2;
  const CAP = labelW + fs * 2.4;
  const capScale = capH / H;
  useLayoutEffect(() => {
    if (label.current) setLabelW(label.current.offsetWidth);
  }, [H]);
  const r = Math.min(CORNER, H / 2);
  const rowW = n * W + (n - 1) * G;
  const still = stillness();
  const msgId = useId();

  const clean = (text: string) => normalize(text).replace(/\D/g, "").slice(0, n);
  const code = clean(value);

  /* the caller clears a rejected code at once; the row keeps
     showing it while it drains */
  const lastFull = useRef("");
  if (code.length === n) lastFull.current = code;
  const [draining, setDraining] = useState(false);
  const phase: Phase =
    status === "success" ? "ok" : status === "verifying" ? "check" : draining ? "no" : "type";
  const shown = phase === "no" ? lastFull.current : code;

  const [focus, setFocus] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  /* moving parts, read by the loop */
  const caret = useRef({ x: W / 2, v: 0 });
  /* when each cell last took a digit — for the little swell */
  const popAt = useRef<number[]>([]);
  const merge = useRef({ m: 0, v: 0, to: 0 });
  const shook = useRef(0);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const [, setTick] = useState(0);
  const live = useRef({ code: shown, n, W });
  live.current = { code: shown, n, W };

  /* measured before paint, and again when the sheet resizes */
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const fit = () => {
      const w = Math.max(24, (el.clientWidth - (n - 1) * G) / n);
      setW(w);
      const { code: c } = live.current;
      caret.current = { x: Math.min(c.length, n - 1) * (w + G) + w / 2, v: 0 };
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /* ── the one loop ────────────────────────────────────────
     Runs while something moves and stops itself after, so a
     row nobody is typing into costs nothing. */
  const wake = () => {
    if (raf.current) return;
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      let busy = false;
      const { code: c, n: count, W } = live.current;

      /* the caret, on a spring with a little give */
      const target = Math.min(c.length, count - 1) * (W + G) + W / 2;
      const k = caret.current;
      if (still) {
        k.x = target;
        k.v = 0;
      } else {
        k.v += (target - k.x) * 0.2 * dt;
        k.v *= Math.pow(0.62, dt);
        k.x += k.v * dt;
        if (Math.abs(target - k.x) < 0.05 && Math.abs(k.v) < 0.05) {
          k.x = target;
          k.v = 0;
        } else busy = true;
      }

      /* the merge, sprung */
      const mg = merge.current;
      if (mg.m !== mg.to || mg.v !== 0) {
        if (still) {
          mg.m = mg.to;
          mg.v = 0;
        } else {
          mg.v += (mg.to - mg.m) * MERGE.k * dt;
          mg.v *= Math.pow(MERGE.d, dt);
          mg.m += mg.v * dt;
          if (Math.abs(mg.to - mg.m) < 0.0008 && Math.abs(mg.v) < 0.0008) {
            mg.m = mg.to;
            mg.v = 0;
          } else busy = true;
        }
      }

      if (t - shook.current < SHAKE_MS + 200) busy = true;

      setTick((x) => x + 1);
      /* a cell still swelling from a digit keeps the loop alive */
      if (popAt.current.some((at) => t - at < POP_MS)) busy = true;
      raf.current = busy ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      timers.current.forEach(window.clearTimeout);
    },
    [],
  );
  useEffect(() => {
    wake();
  }, [shown, n, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const fuse = (to: 0 | 1) => {
    merge.current = { ...merge.current, to };
    wake();
  };

  /* the caller's answer: a right code fuses the row, a wrong
     one sends the shiver and drains what it held */
  const prevStatus = useRef(status);
  useLayoutEffect(() => {
    const before = prevStatus.current;
    prevStatus.current = status;
    if (status === before) return;
    fuse(status === "success" ? 1 : 0);
    /* a right code is done with the keyboard: drop it while the capsule fuses */
    if (status === "success") input.current?.blur();
    if (status !== "error" || still) return;
    shook.current = performance.now();
    setDraining(true);
    later(() => setDraining(false), SHAKE_MS + n * 45 + 160);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // A layout effect focuses in the same task as the commit: iOS and Android only let a script move
  // focus (and keep the keyboard up) while still inside that task. Also on an error, for the retry.
  useLayoutEffect(() => {
    if (autoFocus || status === "error") input.current?.focus({ preventScroll: true });
  }, [autoFocus, status]);

  const onInput = (raw: string) => {
    if (phase === "check" || phase === "ok") return;
    /* typing over a draining row ends the drain */
    if (draining) setDraining(false);
    const next = clean(raw);
    /* each new digit swells its cell — a paste runs along the row */
    if (!still && next.length > code.length) {
      const t0 = performance.now();
      for (let i = code.length; i < next.length; i++)
        popAt.current[i] = t0 + (i - code.length) * 45;
      wake();
    }
    if (next === code) return;
    onChange?.(next);
    if (next.length === n) onComplete?.(next);
  };

  /* a whole pasted code replaces what is there, rather than
     landing after the digits already typed */
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = clean(e.clipboardData.getData("text"));
    if (text.length < n) return;
    e.preventDefault();
    onInput(text);
  };

  /* ── where everything is this frame ──────────────────────── */
  const now = performance.now();
  /* the raw spring runs past 0 and 1; the cells' travel is
     clamped to it, and only the capsule is allowed to take the
     overshoot, as a stretch */
  const raw = merge.current.m;
  const m = clamp(raw, 0, 1);
  const home = (i: number) => i * (W + G);
  const mid = (rowW - W) / 2;
  const since = now - shook.current;
  const shaking = phase === "no" && since < SHAKE_MS && !still;
  const shake = (i: number) =>
    shaking
      ? 5 * Math.exp(-since / 190) * Math.sin((since / 1000) * Math.PI * 2 * 10 + i * 0.55)
      : 0;
  const cellX = (i: number) => mix(home(i), mid, m) + shake(i);
  /* ── a digit arriving ─────────────────────────────────────
     The cell that takes it swells a touch and settles: up and
     back on one half-sine, four per cent at the top. Small on
     purpose — it is an acknowledgement, not an event. */
  const pop = (i: number) => {
    const at = popAt.current[i];
    if (at === undefined) return 1;
    const u = (now - at) / POP_MS;
    return u > 0 && u < 1 ? 1 + 0.04 * Math.sin(Math.PI * u) : 1;
  };
  /* checking: a soft wave of breath through the cells */
  const breath = (i: number) => {
    if (phase !== "check" || still) return pop(i);
    const u = ((now % 900) / 900) * (n + 2) - i;
    return 1 - 0.07 * (u > 0 && u < 2 ? Math.sin((u / 2) * Math.PI) : 0);
  };
  const over = raw - 1;
  /* long and thin past its size, round again as it settles:
     width and height trade, so it reads as one soft thing */
  const capW = CAP * smooth(0.3, 1, m) * (1 + Math.max(-0.12, over) * 0.9);
  const capSy = 1 - Math.max(-0.12, over) * 0.55;
  /* cells round off into the capsule's pill as they close in,
     so the two shapes agree by the time the goo joins them */
  const cellR = mix(r, H / 2, smooth(0.15, 0.7, m));
  const typing = phase === "type" && focus;
  const showError = status === "error" && !!errorMessage;

  /* useId yields ":r0:", which a url(#…) reference can't hold */
  const gooId = `goo-${useId().replace(/:/g, "")}`;

  return (
    <div
      ref={root}
      className="otp"
      data-phase={phase}
      style={{ "--otp-h": `${H}px` } as CSSProperties}
    >
      <div className="otp-row" style={{ width: rowW, height: H }}>
        {/* the cells and the capsule: one colour, under the filter */}
        <div
          className="otp-goo"
          aria-hidden="true"
          style={{ filter: still ? undefined : `url(#${gooId})` }}
        >
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              className="otp-cell"
              style={{
                width: W,
                borderRadius: cellR,
                transform: `translateX(${cellX(i).toFixed(2)}px) scale(${(breath(i) * mix(1, capScale, m)).toFixed(3)})`,
              }}
            />
          ))}
          {capW > 0.5 && (
            <span
              className="otp-cell"
              /* always a full pill — the capsule is a result, not
                 a cell, and wears the rounded shape whatever the
                 Corner knob says the cells are */
              style={{
                width: capW,
                height: capH,
                top: (H - capH) / 2,
                borderRadius: capH / 2,
                transform: `translateX(${((rowW - capW) / 2).toFixed(2)}px) scaleY(${capSy.toFixed(3)})`,
              }}
            />
          )}
        </div>

        {/* the digits — an empty cell is just the cell */}
        {Array.from({ length: n }, (_, i) => {
          const d = shown[i];
          const x = cellX(i);
          /* a wrong code fades out right to left, in place */
          const out =
            phase === "no" && !still ? smooth(0, 1, (since - 300 - (n - 1 - i) * 45) / 220) : 0;
          return (
            <span
              key={i}
              className="otp-slot"
              style={{
                width: W,
                transform: `translateX(${x.toFixed(2)}px)`,
                opacity: 1 - smooth(0, 0.45, m),
              }}
            >
              {d && (
                <span key={`${i}-${d}`} className="otp-digit" style={{ opacity: 1 - out }}>
                  {d}
                </span>
              )}
            </span>
          );
        })}

        {/* the caret, stretched by its own speed */}
        <i
          className="otp-caret"
          /* not until the cells have come apart again, or it
             stands in an empty slot the capsule is still on */
          data-on={typing && shown.length < n && m < 0.08}
          style={{
            transform: `translateX(${(caret.current.x - 1).toFixed(2)}px) scaleX(${(1 + Math.min(5, Math.abs(caret.current.v) * 0.9)).toFixed(3)})`,
          }}
        />

        {/* what the capsule says */}
        <span
          className="otp-ok"
          style={{
            opacity: smooth(0.72, 1, m),
            scale: `${mix(0.92, 1, smooth(0.72, 1, m))}`,
          }}
        >
          <span ref={label} className="otp-ok-label">
            <CheckIcon size={Math.round(fs)} />
            Verified
          </span>
        </span>

        <input
          ref={input}
          className="otp-field"
          value={code}
          /* readOnly while checking, so nothing typed lands mid-verify */
          readOnly={phase === "check" || phase === "ok"}
          onChange={(e) => onInput(e.target.value)}
          onPaste={onPaste}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          autoCapitalize="off"
          autoCorrect="off"
          enterKeyHint="done"
          /* a code box is not a login: keep the password managers'
             badges out of it, the way each of them asks */
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          data-form-type="other"
          /* no maxLength: it would cut a pasted "482 913" to "482 91"
             before the spaces are cleaned out */
          aria-label={phase === "ok" ? "Verified" : `Verification code, ${n} digits`}
          aria-invalid={status === "error" || undefined}
          aria-describedby={showError ? msgId : undefined}
          spellCheck={false}
        />
      </div>
      {showError ? (
        <p
          id={msgId}
          role="alert"
          className="mt-3 text-center text-sm font-normal text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}
      <svg className="liq-defs" aria-hidden="true" focusable="false">
        <filter
          id={gooId}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation={3} result="smear" />
          {/* alpha x24 - 12: a hard edge at 0.5 that fuses nearby shapes; never put text under it */}
          <feColorMatrix
            in="smear"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12"
          />
        </filter>
      </svg>
    </div>
  );
}
