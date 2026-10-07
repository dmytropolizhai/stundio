/*
 * Entry for the page's enhancements. Each module is independent and guarded: a throw in one
 * leaves the others (and the complete no-JS page underneath) working (03b section 6: an error
 * in main must not break the page). Analytics goes last and sends nothing before `load`.
 */
import { initAnalytics } from "./analytics.ts";
import { initChangesAnim } from "./changes-anim.ts";
import { initDeviceCta } from "./device-cta.ts";
import { initFaq } from "./faq.ts";
import { initInstallTabs } from "./install-tabs.ts";
import { initLangSwitch } from "./lang-switch.ts";
import { initOptOut } from "./opt-out.ts";
import { initStickyCta } from "./sticky-cta.ts";

const steps = [
  initDeviceCta,
  initInstallTabs,
  initFaq,
  initChangesAnim,
  initStickyCta,
  initLangSwitch,
  initOptOut,
  initAnalytics,
];

for (const step of steps) {
  try {
    step();
  } catch {
    /* an enhancement that fails must not take the page with it */
  }
}
