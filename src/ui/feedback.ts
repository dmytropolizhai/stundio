/**
 * The one place that knows how to build a prefilled GitHub issue URL — shared by the Settings
 * "report a bug" / "suggest a feature" rows and the home-screen feedback prompt, so the two
 * surfaces can't drift into different issue templates.
 */
export const REPO_URL = "https://github.com/dmytropolizhai/stundio";
const REPORT_ISSUE_BASE = `${REPO_URL}/issues/new`;

/** Prefills a GitHub issue with the details a bug report needs but a user won't think to add. */
export const reportIssueUrl = (className: string | undefined): string => {
  const body = [
    "**What happened:**",
    "",
    "",
    "---",
    `App version: ${__APP_VERSION__}`,
    `Class: ${className ?? "none selected"}`,
  ].join("\n");
  return `${REPORT_ISSUE_BASE}?${new URLSearchParams({ labels: "bug", body }).toString()}`;
};

/** Same shape as `reportIssueUrl`, filed under "enhancement" instead of "bug". */
export const suggestFeatureUrl = (className: string | undefined): string => {
  const body = [
    "**What should Stundio add or change:**",
    "",
    "",
    "---",
    `App version: ${__APP_VERSION__}`,
    `Class: ${className ?? "none selected"}`,
  ].join("\n");
  return `${REPORT_ISSUE_BASE}?${new URLSearchParams({ labels: "enhancement", body }).toString()}`;
};
