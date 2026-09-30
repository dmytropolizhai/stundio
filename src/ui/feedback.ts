/**
 * Feedback service for Stundio.
 * Allows anonymous user suggestions via Web3Forms (no GitHub account required).
 * Also retains GitHub issue links for direct repository issue filing.
 *
 * Every report carries whose timetable the sender was looking at — a class for a student, a
 * teacher for a teacher — since that is what a maintainer needs to reproduce it.
 */
import type { Persona } from "@/lib/persona";

/** The active role and its display label; `label` is `undefined` while nothing is picked. */
export type FeedbackIdentity = { persona: Persona; label: string | undefined };

/** Per role: the payload field and the issue-body prefix. `Record` keeps it exhaustive. */
const IDENTITY_FIELD: Record<Persona, { field: string; line: string }> = {
  student: { field: "class", line: "Class" },
  teacher: { field: "teacher", line: "Teacher" },
};

const NONE = "none selected";
const STUDENT_UNPICKED: FeedbackIdentity = { persona: "student", label: undefined };

/** "Class: 12.a" / "Teacher: Alksne Santa" — the context line of a report. */
const identityLine = ({ persona, label }: FeedbackIdentity): string =>
  `${IDENTITY_FIELD[persona].line}: ${label ?? NONE}`;

/** The same context as payload fields: `role`, plus `class` or `teacher`. */
const identityFields = ({ persona, label }: FeedbackIdentity): Record<string, string> => ({
  role: persona,
  [IDENTITY_FIELD[persona].field]: label ?? NONE,
});

export const REPO_URL = "https://github.com/dmytropolizhai/stundio";
const REPORT_ISSUE_BASE = `${REPO_URL}/issues/new`;

export const WEB3FORMS_ACCESS_KEY =
  (import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string | undefined) ||
  "73758571-e790-4910-aab1-a13b7a438e32";

/** Prefills a GitHub issue with the details a bug report needs but a user won't think to add. */
export const reportIssueUrl = (identity: FeedbackIdentity = STUDENT_UNPICKED): string => {
  const body = [
    "**What happened:**",
    "",
    "",
    "---",
    `App version: ${__APP_VERSION__}`,
    identityLine(identity),
  ].join("\n");
  return `${REPORT_ISSUE_BASE}?${new URLSearchParams({ labels: "bug", body }).toString()}`;
};

/** Same shape as `reportIssueUrl`, filed under "enhancement" instead of "bug". */
export const suggestFeatureUrl = (identity: FeedbackIdentity = STUDENT_UNPICKED): string => {
  const body = [
    "**What should Stundio add or change:**",
    "",
    "",
    "---",
    `App version: ${__APP_VERSION__}`,
    identityLine(identity),
  ].join("\n");
  return `${REPORT_ISSUE_BASE}?${new URLSearchParams({ labels: "enhancement", body }).toString()}`;
};

export type FeedbackType = "bug" | "suggestion";

export type SubmitFeedbackParams = {
  type?: FeedbackType | undefined;
  message: string;
  email?: string | undefined;
  identity?: FeedbackIdentity | undefined;
  subject?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  attachment?: File | Blob | undefined;
  attachmentName?: string | undefined;
};

export type SubmitSuggestionParams = Omit<SubmitFeedbackParams, "type">;
export type SubmitBugReportParams = Omit<SubmitFeedbackParams, "type">;

/**
 * Web3Forms' multipart "attachment" field only works on their paid plan; on the free key this
 * app uses it silently fails the whole submission. Screenshots are inlined as a base64 data URL
 * in an ordinary JSON field instead, which the free plan accepts like any other text field.
 */
const attachmentToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read screenshot"));
    reader.readAsDataURL(blob);
  });

export async function submitFeedback({
  type = "suggestion",
  message,
  email,
  identity = STUDENT_UNPICKED,
  subject,
  metadata,
  attachment,
  attachmentName,
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
    ...identityFields(identity),
  };

  if (email && email.trim()) {
    payload.email = email.trim();
  }

  if (metadata && Object.keys(metadata).length > 0) {
    Object.assign(payload, metadata);
  }

  if (attachment) {
    payload.attachment_filename =
      attachmentName ?? (attachment instanceof File ? attachment.name : "screenshot.png");
    payload.attachment_base64 = await attachmentToDataUrl(attachment);
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
