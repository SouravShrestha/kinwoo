"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { isStandalone } from "@/lib/install-prompt";

const REFRESH_DRAG_PX = 64;
const MAX_DRAG_PX = 96;
const HOLD_PX = 56;

// Installed PWAs have no browser chrome, so iOS and Android drop the native pull-to-refresh.
// Native listeners so touchmove can preventDefault, and so drags inside portaled sheets never reach here.
export function PullToRefresh({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [loader, setLoader] = useState<"hidden" | "pulling" | "spinning">("hidden");
  const [refreshing, setRefreshing] = useState(false);
  useBusyWhile(refreshing);

  useEffect(() => {
    const el = ref.current;
    const root = rootRef.current;
    if (!el || !root || !isStandalone()) return;

    let startX = 0;
    let startY = 0;
    let offset = 0;
    let tracking = false;
    let dragging = false;
    let holding = false;

    const scrolled = (target: EventTarget | null) => {
      if (window.scrollY > 0) return true;
      for (
        let node = target as HTMLElement | null;
        node && node !== el;
        node = node.parentElement
      ) {
        if (node.scrollTop > 0) return true;
      }
      return false;
    };

    const settle = () => {
      el.style.transition = "translate 200ms ease-out";
      el.style.translate = "0 0";
    };

    const onStart = (event: TouchEvent) => {
      if (holding) {
        tracking = false;
        return;
      }
      tracking = event.touches.length === 1 && !scrolled(event.target);
      dragging = false;
      offset = 0;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      el.style.transition = "none";
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking) return;
      const dx = event.touches[0].clientX - startX;
      const dy = event.touches[0].clientY - startY;
      if (!dragging && (dy <= 0 || dy < Math.abs(dx))) {
        // Upward or sideways first: leave it to native scrolling and tab swipes.
        if (Math.abs(dx) > 4 || dy < -4) tracking = false;
        return;
      }
      if (!dragging) setLoader("pulling");
      dragging = true;
      offset = Math.min(MAX_DRAG_PX, Math.max(0, dy) / 2);
      if (event.cancelable) event.preventDefault();
      el.style.translate = `0 ${offset}px`;
      root.style.setProperty("--pull", String(Math.min(1, offset / REFRESH_DRAG_PX)));
    };

    const onEnd = () => {
      tracking = false;
      if (!dragging) return;
      dragging = false;
      if (offset < REFRESH_DRAG_PX) return settle();
      holding = true;
      setRefreshing(true);
      setLoader("spinning");
      el.style.transition = "translate 200ms ease-out";
      el.style.translate = `0 ${HOLD_PX}px`;
      void queryClient.refetchQueries({ type: "active" }).finally(() => {
        holding = false;
        setRefreshing(false);
        settle();
      });
    };

    // Clearing translate afterwards stops the wrapper being a containing block for fixed children.
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== el || dragging || holding) return;
      el.style.translate = "";
      setLoader("hidden");
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    el.addEventListener("transitionend", onTransitionEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      el.removeEventListener("transitionend", onTransitionEnd);
    };
  }, [queryClient]);

  return (
    <div ref={rootRef} className="relative">
      {loader !== "hidden" ? (
        <div aria-hidden className="absolute inset-x-0 top-0 flex h-14 items-center justify-center">
          <div className={loader === "spinning" ? "pull-loader pull-loader-spin" : "pull-loader"} />
        </div>
      ) : null}
      <div ref={ref} className="relative bg-background">
        {children}
      </div>
    </div>
  );
}
