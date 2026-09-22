import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ResolvedLesson } from "@/lib/edupage";
import { StoreContext } from "@/store";
import { bootHarness, type Harness } from "./harness.tsx";
import { LessonRow } from "../components/LessonRow.tsx";
import { LessonSheet } from "../screens/lesson-sheet/lesson-sheet.tsx";

const createLesson = (overrides: Partial<ResolvedLesson> = {}): ResolvedLesson => ({
  period: "6",
  start: "13:30",
  end: "14:50",
  span: 2,
  subject: { id: "s1", name: "Informātika", short: "Inf" },
  teachers: [{ id: "t1", name: "Jānis Bērziņš", short: "Bērziņš J." }],
  rooms: [{ id: "r1", name: "101", short: "101" }],
  group: null,
  status: "normal",
  changeNote: null,
  original: null,
  ...overrides,
});

describe("LessonRow and LessonSheet", () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await bootHarness();
  });

  const renderWithStore = (ui: React.ReactNode) =>
    render(<StoreContext.Provider value={harness.store}>{ui}</StoreContext.Provider>);

  describe("LessonRow noteRefs chip", () => {
    it("renders a quiet chip when lesson.noteRefs is non-empty", () => {
      const lesson = createLesson({
        noteRefs: ["L2 grupai 6-7 stunda informāciju un komunikāciju tehnoloģijas - nenotiek."],
      });

      renderWithStore(
        <LessonRow
          lesson={lesson}
          live={false}
          showTime={true}
          subjectColorOverrides={{}}
          colorCodingEnabled={true}
          filled={false}
        />,
      );

      const badge = screen.getByTestId("lesson-note-badge");
      expect(badge).toBeDefined();
      expect(badge.textContent).toBe("Paziņojums");
      // Neutral tone: quiet uses bg-sunken text-muted
      expect(badge.className).toContain("bg-sunken");
      expect(badge.className).toContain("text-muted");
      // Card must not look cancelled: no strike-through or dimmed classes
      const card = screen.getByTestId("lesson-6");
      expect(card.className).not.toContain("line-through");
      expect(card.className).not.toContain("opacity-55");
    });

    it("does not render the quiet chip when lesson.noteRefs is undefined or empty", () => {
      const lesson = createLesson();
      renderWithStore(
        <LessonRow
          lesson={lesson}
          live={false}
          showTime={true}
          subjectColorOverrides={{}}
          colorCodingEnabled={true}
          filled={false}
        />,
      );

      expect(screen.queryByTestId("lesson-note-badge")).toBeNull();
    });

    it("coexists with the live Tagad badge in the badge slot", () => {
      const lesson = createLesson({
        noteRefs: ["L2 grupai 6-7 stunda informāciju un komunikāciju tehnoloģijas - nenotiek."],
      });

      renderWithStore(
        <LessonRow
          lesson={lesson}
          live={true}
          showTime={true}
          subjectColorOverrides={{}}
          colorCodingEnabled={true}
          filled={false}
        />,
      );

      expect(screen.getByTestId("status-now").textContent).toBe("Tagad");
      expect(screen.getByTestId("lesson-note-badge").textContent).toBe("Paziņojums");
    });
  });

  describe("LessonSheet school announcements", () => {
    it("renders noteRefs in a sunken Card under the fromSchool eyebrow", () => {
      const note = "L2 grupai 6-7 stunda informāciju un komunikāciju tehnoloģijas - nenotiek.";
      const lesson = createLesson({ noteRefs: [note] });

      renderWithStore(<LessonSheet lesson={lesson} day={null} onClose={vi.fn()} />);

      expect(screen.getByText("No skolas")).toBeDefined();
      expect(screen.getByText(note)).toBeDefined();
    });

    it("does not duplicate identical text between changeNote and noteRefs", () => {
      const note = "SC2 grupai 6-9 stunda - atcelta.";
      const lesson = createLesson({
        status: "cancelled",
        changeNote: note,
        noteRefs: [note],
      });

      renderWithStore(<LessonSheet lesson={lesson} day={null} onClose={vi.fn()} />);

      const occurrences = screen.getAllByText(note);
      expect(occurrences).toHaveLength(1);
    });

    it("renders both changeNote and noteRefs when they have distinct text", () => {
      const changeNote = "Aizvietošana: (Bērziņš J.) ➔ Kalniņš A.";
      const announcement = "Papildu skolas paziņojums par 6. stundu.";
      const lesson = createLesson({
        status: "substituted",
        changeNote,
        noteRefs: [announcement],
      });

      renderWithStore(<LessonSheet lesson={lesson} day={null} onClose={vi.fn()} />);

      expect(screen.getByText("No skolas")).toBeDefined();
      expect(screen.getByText(changeNote)).toBeDefined();
      expect(screen.getByText(announcement)).toBeDefined();
    });
  });
});
