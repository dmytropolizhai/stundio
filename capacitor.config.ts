import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "site.polizhai.rvtstunda",
  appName: "Studio",
  webDir: "dist",
  android: {
    // EduPage is scraped over plain POST from the native layer; no cleartext needed.
    allowMixedContent: false,
  },
};

export default config;
