import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  reportIssueUrl,
  suggestFeatureUrl,
  submitFeedback,
  submitSuggestion,
  submitBugReport,
  WEB3FORMS_ACCESS_KEY,
} from "../feedback.ts";

describe("feedback URLs", () => {
  it("builds a bug report URL with class and version", () => {
    const url = reportIssueUrl("12.a");
    expect(url).toContain("labels=bug");
    expect(url).toContain("Class%3A+12.a");
  });

  it("builds a feature suggestion URL with default fallback if no class", () => {
    const url = suggestFeatureUrl(undefined);
    expect(url).toContain("labels=enhancement");
    expect(url).toContain("none+selected");
  });
});

describe("submitFeedback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws if message is empty or whitespace", async () => {
    await expect(submitFeedback({ message: "   " })).rejects.toThrow(
      "Message cannot be empty",
    );
  });

  it("submits suggestion successfully with default type", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await submitFeedback({
      message: "Add dark mode toggle to widget",
      email: "test@example.com",
      className: "10.b",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.web3forms.com/submit");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body as string) as { access_key: string; feedback_type: string; subject: string; message: string; email: string; class: string };
    expect(body.access_key).toBe(WEB3FORMS_ACCESS_KEY);
    expect(body.feedback_type).toBe("suggestion");
    expect(body.subject).toContain("Stundio suggestion");
    expect(body.message).toBe("Add dark mode toggle to widget");
    expect(body.email).toBe("test@example.com");
    expect(body.class).toBe("10.b");
  });

  it("submits bug report with correct subject and type", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await submitBugReport({
      message: "Widget crashes on rotation",
      email: "bug@example.com",
      className: "12.a",
      metadata: { error_code: "CRASH_123" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { access_key: string; feedback_type: string; subject: string; message: string; email: string; class: string; error_code?: string }
    expect(body.access_key).toBe(WEB3FORMS_ACCESS_KEY);
    expect(body.feedback_type).toBe("bug");
    expect(body.subject).toContain("Stundio bug report");
    expect(body.message).toBe("Widget crashes on rotation");
    expect(body.email).toBe("bug@example.com");
    expect(body.class).toBe("12.a");
    expect(body.error_code).toBe("CRASH_123");
  });

  it("allows custom subject", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await submitFeedback({
      type: "bug",
      subject: "Custom urgent issue",
      message: "Something broke",
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { access_key: string; feedback_type: string; subject: string; message: string }
    expect(body.subject).toBe("Custom urgent issue");
  });

  it("throws when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    await expect(
      submitFeedback({ message: "Something cool" }),
    ).rejects.toThrow("HTTP error 500");
  });

  it("throws when api returns success: false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => ({ success: false, message: "Invalid key" }),
      }),
    );

    await expect(
      submitFeedback({ message: "Something cool" }),
    ).rejects.toThrow("Invalid key");
  });

  it("submitSuggestion delegates to submitFeedback", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await submitSuggestion({ message: "Idea here" });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { feedback_type: string; message: string };
    expect(body.feedback_type).toBe("suggestion");
    expect(body.message).toBe("Idea here");
  });
});
