/*
 * InstallTabs — folds the three install panels into ARIA tabs on phones (< 960px). Without JS,
 * and on wide screens, all three panels simply stack. Follows the ARIA APG tabs pattern: arrows
 * wrap, Home/End jump, activation follows focus, only the selected tab is in the tab order. The
 * URL hash (`#install-ios`) both selects a tab on load and is kept in step with it, so a link
 * from a chat lands on the right path.
 */
import { track } from "./analytics.ts";

const PANELS = ["android", "ios", "desktop"] as const;
type PanelId = (typeof PANELS)[number];

const isPanel = (value: string): value is PanelId => PANELS.some((p) => p === value);

const panelFromHash = (): PanelId | null => {
  const id = location.hash.replace(/^#install-/, "");
  return location.hash.startsWith("#install-") && isPanel(id) ? id : null;
};

export const initInstallTabs = (): void => {
  const root = document.querySelector<HTMLElement>("[data-install-tabs]");
  const list = root?.querySelector<HTMLElement>('[role="tablist"]');
  if (!root || !list) return;
  const tabs = PANELS.map((id) => list.querySelector<HTMLElement>(`#tab-${id}`));
  const panels = PANELS.map((id) => root.querySelector<HTMLElement>(`#install-${id}`));
  if (tabs.some((t) => !t) || panels.some((p) => !p)) return;

  const query = window.matchMedia("(max-width: 959px)");
  let active = false;

  const select = (id: PanelId, focus = false): void => {
    PANELS.forEach((panelId, i) => {
      const on = panelId === id;
      const tab = tabs[i];
      const panel = panels[i];
      tab?.setAttribute("aria-selected", on ? "true" : "false");
      tab?.setAttribute("tabindex", on ? "0" : "-1");
      if (panel) panel.hidden = !on;
      if (on && focus) tab?.focus();
    });
  };

  const enable = (): void => {
    if (active) return;
    active = true;
    list.hidden = false;
    PANELS.forEach((id, i) => {
      const panel = panels[i];
      panel?.setAttribute("role", "tabpanel");
      panel?.setAttribute("aria-labelledby", `tab-${id}`);
      panel?.querySelector("h3")?.classList.add("l-sr");
    });
    const platform = document.documentElement.dataset["platform"] ?? "";
    select(panelFromHash() ?? (isPanel(platform) ? platform : "android"));
  };

  const disable = (): void => {
    if (!active) return;
    active = false;
    list.hidden = true;
    PANELS.forEach((id, i) => {
      const panel = panels[i];
      if (!panel) return;
      panel.hidden = false;
      panel.removeAttribute("role");
      panel.setAttribute("aria-labelledby", `install-${id}-h`);
      panel.querySelector("h3")?.classList.remove("l-sr");
    });
  };

  // A hash that names a panel hidden at the time of the jump scrolls nowhere (the browser cannot
  // scroll to a `hidden` element), so after selecting we bring the tab group into view ourselves.
  const reveal = (smooth: boolean): void => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.scrollIntoView({ behavior: smooth && !reduce ? "smooth" : "auto", block: "start" });
  };

  const sync = (): void => (query.matches ? enable() : disable());
  query.addEventListener("change", sync);
  sync();
  // Arrived with `#install-ios` already in the URL: the native jump missed, so do it here.
  if (active && panelFromHash()) window.requestAnimationFrame(() => reveal(false));

  tabs.forEach((tab, index) => {
    tab?.addEventListener("click", () => {
      const id = PANELS[index];
      if (!id) return;
      select(id);
      history.replaceState(null, "", `#install-${id}`);
      track("Install Tab", { tab: id });
    });
    tab?.addEventListener("keydown", (event) => {
      const last = PANELS.length - 1;
      const next =
        event.key === "ArrowRight"
          ? index === last
            ? 0
            : index + 1
          : event.key === "ArrowLeft"
            ? index === 0
              ? last
              : index - 1
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? last
                : null;
      const id = next === null ? undefined : PANELS[next];
      if (next === null || !id) return;
      event.preventDefault();
      select(id, true);
      history.replaceState(null, "", `#install-${id}`);
      track("Install Tab", { tab: id });
    });
  });

  // A link to `#install-ios` anywhere on the page (or typed into the bar) selects that tab.
  const follow = (): void => {
    const id = panelFromHash();
    if (!active || !id) return;
    select(id);
    reveal(true);
  };
  window.addEventListener("hashchange", follow);
};
