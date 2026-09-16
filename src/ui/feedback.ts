/**
 * Feedback service for Stundio.
 * Allows anonymous user suggestions via Web3Forms (no GitHub account required).
 * Also retains GitHub issue links for direct repository issue filing.
 */
export const REPO_URL = "https://github.com/dmytropolizhai/stundio";
const REPORT_ISSUE_BASE = `${REPO_URL}/issues/new`;

export const WEB3FORMS_ACCESS_KEY =
  (import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string | undefined) ||
  "73758571-e790-4910-aab1-a13b7a438e32";

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

export type FeedbackType = "bug" | "suggestion";

export type SubmitFeedbackParams = {
  type?: FeedbackType | undefined;
  message: string;
  email?: string | undefined;
  className?: string | undefined;
  subject?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export type SubmitSuggestionParams = Omit<SubmitFeedbackParams, "type">;
export type SubmitBugReportParams = Omit<SubmitFeedbackParams, "type">;

export async function submitFeedback({
  type = "suggestion",
  message,
  email,
  className,
  subject,
  metadata,
}: SubmitFeedbackParams): Promise<void> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty");
  }

  const defaultSubject =
    type === "bug"
      ? `Stundio bug report (${__APP_VERSION__})`
      : `Stundio suggestion (${__APP_VERSION__})`;

  const payload: Record<string, unknown> = {
    access_key: WEB3FORMS_ACCESS_KEY,
    subject: subject || defaultSubject,
    from_name: "Stundio User",
    feedback_type: type,
    message: trimmed,
    app_version: __APP_VERSION__,
    class: className ?? "none selected",
  };

  if (email && email.trim()) {
    payload.email = email.trim();
  }

  if (metadata && Object.keys(metadata).length > 0) {
    Object.assign(payload, metadata);
  }

  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`);
  }

  const data = (await res.json()) as { success?: boolean; message?: string };
  if (!data.success) {
    throw new Error(data.message || "Submission failed");
  }
}

/** Convenience helper to submit a feature suggestion. */
export async function submitSuggestion(params: SubmitSuggestionParams): Promise<void> {
  return submitFeedback({ ...params, type: "suggestion" });
}

/** Convenience helper to submit a bug report. */
export async function submitBugReport(params: SubmitBugReportParams): Promise<void> {
  return submitFeedback({ ...params, type: "bug" });
}
