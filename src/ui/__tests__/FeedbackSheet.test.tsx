import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StoreContext } from "@/store";
import { FeedbackSheet } from "../components/FeedbackSheet.tsx";
import { FeedbackPrompt } from "../components/FeedbackPrompt.tsx";
import { bootHarness, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

describe("FeedbackSheet", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when open is false", async () => {
    const harness = await bootHarness();
    wrap(harness, <FeedbackSheet open={false} onClose={() => {}} />);
    expect(screen.queryByText("Ieteikt funkciju")).toBeNull();
  });

  it("submits message and renders success state", async () => {
    const harness = await bootHarness();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const onClose = vi.fn();
    const onSubmitted = vi.fn();

    wrap(
      harness,
      <FeedbackSheet open={true} onClose={onClose} className="10.a" onSubmitted={onSubmitted} />,
    );

    expect(screen.getByText("Ieteikt funkciju")).toBeDefined();

    const textarea = screen.getByPlaceholderText("Ko Stundio vajadzētu pievienot vai uzlabot?");
    fireEvent.change(textarea, { target: { value: "Make widget resizable" } });

    const emailInput = screen.getByPlaceholderText("Ja vēlies saņemt atbildi");
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });

    const submitBtn = screen.getByRole("button", { name: "Nosūtīt ieteikumu" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Paldies par ieteikumu!")).toBeDefined();
    });

    expect(onSubmitted).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole("button", { name: "Aizvērt" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("displays error message when network request fails", async () => {
    const harness = await bootHarness();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network connection lost")));

    wrap(harness, <FeedbackSheet open={true} onClose={() => {}} />);

    const textarea = screen.getByPlaceholderText("Ko Stundio vajadzētu pievienot vai uzlabot?");
    fireEvent.change(textarea, { target: { value: "Need offline sync" } });

    const submitBtn = screen.getByRole("button", { name: "Nosūtīt ieteikumu" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Neizdevās nosūtīt. Pārbaudi interneta savienojumu.")).toBeDefined();
    });
  });

  it("renders in bug report mode and submits bug report", async () => {
    const harness = await bootHarness();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const onSubmitted = vi.fn();

    wrap(
      harness,
      <FeedbackSheet
        open={true}
        type="bug"
        onClose={() => {}}
        className="11.c"
        onSubmitted={onSubmitted}
      />,
    );

    expect(screen.getByText("Ziņot par kļūdu")).toBeDefined();
    expect(screen.getByText("Kas notika?")).toBeDefined();

    const textarea = screen.getByPlaceholderText("Apraksti, kas nogāja greizi un ko tu gaidīji…");
    fireEvent.change(textarea, { target: { value: "Schedule fails to load on Friday" } });

    const submitBtn = screen.getByRole("button", { name: "Nosūtīt ziņojumu" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Ziņojums nosūtīts!")).toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      feedback_type: string;
      subject: string;
      message: string;
      class: string;
      error_code?: string;
    };
    expect(body.feedback_type).toBe("bug");
    expect(body.subject).toContain("Stundio bug report");
    expect(body.class).toBe("11.c");
    expect(body.message).toBe("Schedule fails to load on Friday");
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it("respects custom title and label overrides", async () => {
    const harness = await bootHarness();
    wrap(
      harness,
      <FeedbackSheet
        open={true}
        type="bug"
        title="Custom Error Report"
        messageLabel="What broke?"
        messagePlaceholder="Tell us everything"
        submitLabel="Report Now"
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Custom Error Report")).toBeDefined();
    expect(screen.getByText("What broke?")).toBeDefined();
    expect(screen.getByPlaceholderText("Tell us everything")).toBeDefined();
    expect(screen.getByRole("button", { name: "Report Now" })).toBeDefined();
  });

  it("attaches a screenshot, displays preview, and allows removing it", async () => {
    const harness = await bootHarness();
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-screenshot-url");
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    wrap(harness, <FeedbackSheet open={true} onClose={() => {}} />);

    expect(screen.getByText("Pievienot ekrānuzņēmumu")).toBeDefined();

    const fileInput = screen.getByTestId("screenshot-input");
    const file = new File(["dummy-content"], "bug.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText("bug.png")).toBeDefined();
    const removeBtn = screen.getByRole("button", { name: "Noņemt ekrānuzņēmumu" });
    expect(removeBtn).toBeDefined();

    fireEvent.click(removeBtn);
    expect(screen.queryByText("bug.png")).toBeNull();
    expect(screen.getByText("Pievienot ekrānuzņēmumu")).toBeDefined();
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });

  it("shows error when attached screenshot exceeds 5 MB", async () => {
    const harness = await bootHarness();
    wrap(harness, <FeedbackSheet open={true} onClose={() => {}} />);

    const fileInput = screen.getByTestId("screenshot-input");
    const largeFile = new File(["x"], "too-large.png", { type: "image/png" });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(screen.getByText("Attēls ir pārāk liels (maks. 5 MB)")).toBeDefined();
    expect(screen.queryByText("too-large.png")).toBeNull();
  });

  it("submits feedback with attachment via FormData", async () => {
    const harness = await bootHarness();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-screenshot-url");
    globalThis.URL.revokeObjectURL = vi.fn();
    const onSubmitted = vi.fn();

    wrap(
      harness,
      <FeedbackSheet
        open={true}
        type="bug"
        className="12.a"
        onClose={() => {}}
        onSubmitted={onSubmitted}
      />,
    );

    const textarea = screen.getByPlaceholderText("Apraksti, kas nogāja greizi un ko tu gaidīji…");
    fireEvent.change(textarea, { target: { value: "Broken UI when rotating screen" } });

    const fileInput = screen.getByTestId("screenshot-input");
    const file = new File(["image-bytes"], "rotation_bug.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByText("rotation_bug.jpg")).toBeDefined();

    const submitBtn = screen.getByRole("button", { name: "Nosūtīt ziņojumu" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Ziņojums nosūtīts!")).toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBeInstanceOf(FormData);
    const formData = options.body as FormData;
    expect(formData.get("message")).toBe("Broken UI when rotating screen");
    expect(formData.get("feedback_type")).toBe("bug");
    expect(formData.get("class")).toBe("12.a");
    const attachedFile = formData.get("attachment") as File;
    expect(attachedFile).toBeDefined();
    expect(attachedFile.name).toBe("rotation_bug.jpg");
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });
});

describe("FeedbackPrompt", () => {
  it("renders when appOpenCount > 3 and not dismissed", async () => {
    const harness = await bootHarness();
    harness.store.setState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        appOpenCount: 4,
        feedbackPromptDismissed: false,
      },
    }));

    wrap(harness, <FeedbackPrompt />);
    expect(screen.getByTestId("feedback-prompt")).toBeDefined();

    // Clicking suggest button opens the sheet
    const suggestBtn = screen.getByRole("button", { name: "Ieteikt" });
    fireEvent.click(suggestBtn);

    expect(screen.getByText("Ieteikt funkciju")).toBeDefined();
  });

  it("does not render when appOpenCount <= 3 or dismissed", async () => {
    const harness = await bootHarness();
    harness.store.setState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        appOpenCount: 2,
        feedbackPromptDismissed: false,
      },
    }));

    const { rerender } = wrap(harness, <FeedbackPrompt />);
    expect(screen.queryByTestId("feedback-prompt")).toBeNull();

    harness.store.setState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        appOpenCount: 5,
        feedbackPromptDismissed: true,
      },
    }));
    rerender(
      <StoreContext.Provider value={harness.store}>
        <FeedbackPrompt />
      </StoreContext.Provider>,
    );
    expect(screen.queryByTestId("feedback-prompt")).toBeNull();
  });
});
