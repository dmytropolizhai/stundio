import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dmytropolizhai.stundio",
  appName: "Stundio",
  webDir: "dist",
  android: {
    // EduPage is scraped over plain POST from the native layer; no cleartext needed.
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      // Without this, Android falls back to the generic "i" info-mark icon in the status bar.
      smallIcon: "ic_stat_notify",
      iconColor: "#ffffff",
    },
  },
};

export default config;
