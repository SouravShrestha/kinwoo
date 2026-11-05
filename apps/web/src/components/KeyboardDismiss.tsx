"use client";

import { useEffect } from "react";

import { isIOS } from "@/lib/install-prompt";

const TEXT_ENTRY =
  "input:not([type=checkbox],[type=radio],[type=button],[type=submit],[type=range],[type=file]), textarea, [contenteditable='true']";
const EXIT = ["sheet-panel-out", "sheet-backdrop-out", "form-screen-out"];
// iOS has no reliable "keyboard closed" event; stop waiting after this.
const KEYBOARD_CLOSE_TIMEOUT_MS = 600;

function focusedTextEntry() {
  const active = document.activeElement;
  return active instanceof HTMLElement && active.matches(TEXT_ENTRY) ? active : null;
}

// iOS keeps innerHeight fixed and shrinks only the visual viewport for the keyboard. offsetTop
// is left out: iOS scrolls the visual viewport to the field, which would cancel the difference.
// ponytail: 100px threshold ignores Safari toolbar changes; tune if a short keyboard is missed.
function keyboardOpen() {
  const viewport = window.visualViewport;
  return !!viewport && window.innerHeight - viewport.height > 100;
}

function whenKeyboardClosed(done: () => void) {
  const viewport = window.visualViewport;
  if (!viewport || !keyboardOpen()) return done();
  const finish = () => {
    viewport.removeEventListener("resize", check);
    clearTimeout(timer);
    done();
  };
  const check = () => {
    if (!keyboardOpen()) finish();
  };
  viewport.addEventListener("resize", check);
  const timer = window.setTimeout(finish, KEYBOARD_CLOSE_TIMEOUT_MS);
}

// iOS only drops the keyboard reliably when focus leaves inside the user's gesture, so it closes
// on Return/Go and on submit, valid or not. Return still counts when a disabled submit button
// blocks the form from submitting. Fields that turn aria-invalid later (the OTP code) also blur.
// Exit animations (a save closing the screen, or back) wait until the keyboard has slid away.
export function KeyboardDismiss() {
  useEffect(() => {
    // Android resizes the viewport for the keyboard and closes it on its own; this is iOS-only.
    if (!isIOS()) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.isComposing) return;
      const field = focusedTextEntry();
      if (field && !(field instanceof HTMLTextAreaElement) && field.closest("form")) field.blur();
    };
    const onSubmit = () => focusedTextEntry()?.blur();
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("submit", onSubmit, true);
    const observer = new MutationObserver((records) => {
      const exiting: HTMLElement[] = [];
      let invalid = false;
      for (const { target, attributeName } of records) {
        if (!(target instanceof HTMLElement)) continue;
        if (attributeName === "aria-invalid") {
          invalid ||= target.getAttribute("aria-invalid") === "true";
        } else if (EXIT.some((name) => target.classList.contains(name))) {
          exiting.push(target);
        }
      }
      if (!invalid && !exiting.length) return;
      // A field disabled while saving loses focus but iOS can leave the keyboard up, so
      // keyboardOpen() is checked too.
      const field = focusedTextEntry();
      if (!field && !keyboardOpen()) return;
      field?.blur();
      if (!exiting.length) return;
      // Observer callbacks run before the next paint, so no exit frame shows early.
      for (const el of exiting) el.style.animationPlayState = "paused";
      whenKeyboardClosed(() => {
        for (const el of exiting) el.style.animationPlayState = "";
      });
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-invalid", "class"],
    });
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return null;
}
