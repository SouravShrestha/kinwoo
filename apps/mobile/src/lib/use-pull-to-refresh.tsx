import { useBusyWhile } from "@kinwoo/client/activity";
import { toast } from "@kinwoo/client/toast";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { colors } from "@kinwoo/tokens/native";
import { onlineManager } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const [refreshing, setRefreshing] = useState(false);
  useBusyWhile(refreshing);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (onlineManager.isOnline()) {
        await refetch();
      } else {
        // A refetch would wait for a connection indefinitely. The pause lets the spinner show.
        toast.warning(TOAST_MESSAGES.offline);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      tintColor={palette.foreground}
      colors={[palette.foreground]}
      progressBackgroundColor={palette.background}
    />
  );
}
