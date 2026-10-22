import { useBusyWhile } from "@kinwoo/client/activity";
import { colors } from "@kinwoo/tokens/native";
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
      await refetch();
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
