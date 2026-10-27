import { useBusyWhile } from "@kinwoo/client/activity";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";

// Shows the top bar while the in-app browser opens. iOS resolves only once the browser is
// dismissed, so there the bar runs under the sheet and finishes on return.
export function useOpenInAppBrowser(): (url: string) => void {
  const [opening, setOpening] = useState(false);
  useBusyWhile(opening);
  return useCallback((url: string) => {
    setOpening(true);
    void WebBrowser.openBrowserAsync(url)
      .catch(() => undefined)
      .finally(() => setOpening(false));
  }, []);
}
