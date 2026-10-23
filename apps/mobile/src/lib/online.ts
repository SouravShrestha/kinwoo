import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";

type NetworkState = Pick<Network.NetworkState, "isConnected" | "isInternetReachable">;

// Unknown (undefined) counts as online, so a slow first reading never blocks the app.
export const isOnline = (state: NetworkState) =>
  state.isConnected !== false && state.isInternetReachable !== false;

// React Query has no browser online events on native, so it would otherwise assume it is always
// online and never pause queries or block writes.
export function installOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => {
    void Network.getNetworkStateAsync().then((state) => setOnline(isOnline(state)));
    const subscription = Network.addNetworkStateListener((state) => setOnline(isOnline(state)));
    return () => subscription.remove();
  });
}
