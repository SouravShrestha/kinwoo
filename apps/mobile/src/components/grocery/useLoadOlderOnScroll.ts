import type { ListItemsWithHistory } from "@kinwoo/client/grocery";
import { useCallback, useEffect, useRef } from "react";
import type { ScrollViewProps } from "react-native";

const LOAD_MORE_DISTANCE = 400;

// Loads older purchases when the scroll position nears the end, or when the content does not
// yet fill the viewport. The effect re-checks after each page, which may add nothing visible.
export function useLoadOlderOnScroll(
  {
    hasOlder,
    loadingOlder,
    loadOlder,
  }: Pick<ListItemsWithHistory, "hasOlder" | "loadingOlder" | "loadOlder">,
  enabled: boolean,
): Pick<ScrollViewProps, "onScroll" | "onLayout" | "onContentSizeChange" | "scrollEventThrottle"> {
  const metrics = useRef({ offset: 0, content: 0, viewport: 0 });

  const check = useCallback(() => {
    const { offset, content, viewport } = metrics.current;
    if (!enabled || !hasOlder || loadingOlder || viewport === 0) return;
    if (content - offset - viewport < LOAD_MORE_DISTANCE) loadOlder();
  }, [enabled, hasOlder, loadingOlder, loadOlder]);

  useEffect(check, [check]);

  return {
    scrollEventThrottle: 100,
    onScroll: (event) => {
      metrics.current.offset = event.nativeEvent.contentOffset.y;
      check();
    },
    onLayout: (event) => {
      metrics.current.viewport = event.nativeEvent.layout.height;
      check();
    },
    onContentSizeChange: (_width, height) => {
      metrics.current.content = height;
      check();
    },
  };
}
