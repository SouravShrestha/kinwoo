import { useEffect, useRef, type RefObject } from "react";

const CLOSE_DRAG_PX = 100;
// A tap drifts a few pixels. Dragging from the first pixel moves the sheet under the finger and
// preventDefault then swallows the tap.
const DRAG_START_PX = 10;

// Native listeners: React's touchmove is passive, so it could not preventDefault, which is what
// stops the browser's pull-to-refresh from claiming the downward drag.
export function useSwipeToClose(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onClose: () => void,
  // For screens that scroll the document itself rather than an inner container.
  respectPageScroll = false,
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    let offset = 0;
    let tracking = false;
    let dragging = false;

    const scrolledAncestor = (target: EventTarget | null) => {
      if (respectPageScroll && window.scrollY > 0) return true;
      for (let node = target as HTMLElement | null; node; node = node.parentElement) {
        if (node.scrollTop > 0) return true;
        if (node === el) break;
      }
      return false;
    };

    const onStart = (event: TouchEvent) => {
      const blocked = (event.target as HTMLElement).closest("[data-no-swipe]");
      tracking = !blocked && !scrolledAncestor(event.target);
      dragging = false;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking) return;
      const dx = event.touches[0].clientX - startX;
      const dy = event.touches[0].clientY - startY;
      if (!dragging && (dy <= DRAG_START_PX || dy < Math.abs(dx))) {
        // Upward or sideways first: leave it to native scrolling.
        if (Math.abs(dx) > 4 || dy < -4) tracking = false;
        return;
      }
      if (!dragging) {
        dragging = true;
        // Not on touchstart: touching the style there makes iOS Safari drop plain taps.
        el.style.transition = "none";
      }
      offset = Math.max(0, dy);
      if (event.cancelable) event.preventDefault();
      // `translate`, not `transform`, so the enter animation's fill does not override it.
      el.style.translate = `0 ${offset}px`;
    };

    const onEnd = () => {
      tracking = false;
      if (!dragging) return;
      dragging = false;
      if (offset > CLOSE_DRAG_PX) {
        onCloseRef.current();
        return;
      }
      el.style.transition = "translate 200ms ease-out";
      el.style.translate = "0 0";
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref, enabled, respectPageScroll]);
}
