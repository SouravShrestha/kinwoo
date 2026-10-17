import { requireOptionalNativeModule } from "expo";
import * as WebBrowser from "expo-web-browser";

type AppLinksModule = { openInAppAsync(url: string): Promise<boolean> };

// Optional so dev clients built before this module existed still open links in the browser.
const AppLinks = requireOptionalNativeModule<AppLinksModule>("AppLinks");

/** Opens `url` in the installed app that handles it, otherwise in the in-app browser. */
export async function openAppLinkAsync(url: string): Promise<void> {
  const opened = await AppLinks?.openInAppAsync(url).catch(() => false);
  if (!opened) await WebBrowser.openBrowserAsync(url);
}
