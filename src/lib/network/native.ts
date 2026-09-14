/**
 * The one file in `lib/network/` allowed to touch Capacitor (mirrors `lib/share/native.ts`).
 *
 * Connectivity is a device capability like the share sheet, so it gets the same one-file
 * isolation: `@capacitor/network` has a web implementation too (backed by `navigator.onLine`),
 * so there is no platform gate here the way `lib/share/native.ts` has one — the point of this
 * file is purely to keep the `@capacitor/*` import out of `sync/` and `store/`, which take a
 * plain `NetworkPort` instead and stay testable without a browser or device.
 */
import { Network } from "@capacitor/network";

export type NetworkPort = {
  /** A one-off read, for the status before the first change event arrives. */
  isOnline: () => Promise<boolean>;
  /** Fires on every connectivity change. Returns a disposer. */
  onChange: (listener: (online: boolean) => void) => () => void;
};

export const nativeNetwork: NetworkPort = {
  isOnline: async () => (await Network.getStatus()).connected,
  onChange: (listener) => {
    const handle = Network.addListener("networkStatusChange", (status) => {
      listener(status.connected);
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  },
};
