import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StoreContext } from "@/store";
import { listTeachers } from "@/lib/edupage";
import { DayView } from "../screens/day-view";
import { WeekView } from "../screens/week-view";
import { ClassBadge } from "../components/ClassBadge.tsx";
import { LessonRow } from "../components/LessonRow.tsx";
import { GeneralSection } from "../screens/settings-view/general-section.tsx";
import { bootHarness, clickAndSettle, FIXTURE_DATE, type Harness } from "./harness.tsx";

const wrap = (harness: Harness, node: React.ReactNode) =>
  render(<StoreContext.Provider value={harness.store}>{node}</StoreContext.Provider>);

describe("Teacher Day and Week Views", () => {
  it("ClassBadge renders briefcase icon and teacher name in teacher persona", async () => {
    const harness = await bootHarness();
    const teachers = listTeachers(Object.values(harness.store.getState().timetables));
    const teacher = teachers[0]!;

    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(teacher.id);
    });

    const onClick = vi.fn();
    wrap(harness, <ClassBadge onClick={onClick} />);

    const badge = screen.getByTestId("class-badge");
    expect(badge.textContent).toContain(teacher.short);

    fireEvent.click(badge);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("DayView shows empty state when teacher persona is selected but no teacher is picked", async () => {
    const harness = await bootHarness();
    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(null);
    });

    wrap(harness, <DayView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    expect(screen.getByText("Nav atrasts neviens skolotājs")).toBeDefined();
  });

  it("DayView renders teacher schedule with class and room on card off real fixtures", async () => {
    const harness = await bootHarness();
    const teachers = listTeachers(Object.values(harness.store.getState().timetables));

    let activeTeacher = teachers[0]!;
    for (const t of teachers) {
      await clickAndSettle(() => {
        void harness.store.getState().setTeacher(t.id);
      });
      const resolved = harness.store.getState().resolvedTeacherDay(FIXTURE_DATE);
      if (resolved && resolved.lessons.length > 0) {
        activeTeacher = t;
        break;
      }
    }

    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(activeTeacher.id);
    });

    wrap(harness, <DayView date={FIXTURE_DATE} onDateChange={vi.fn()} onPickClass={vi.fn()} />);

    const resolved = harness.store.getState().resolvedTeacherDay(FIXTURE_DATE)!;
    expect(resolved.lessons.length).toBeGreaterThan(0);

    const firstLesson = resolved.lessons[0]!;
    const lessonCard = screen.getByTestId(`lesson-${firstLesson.period}`);
    expect(lessonCard).toBeDefined();

    // In teacher mode, class names should be in the card's heading
    const firstClass = firstLesson.classes[0]!;
    expect(lessonCard.textContent).toContain(firstClass.short);
  });

  it("LessonRow renders teacher cover badge and subtitle", async () => {
    const harness = await bootHarness();
    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
    });

    const mockCoverLesson = {
      period: "3",
      start: "10:00",
      end: "10:40",
      span: 1,
      subject: { id: "math", name: "Matemātika", short: "Mat" },
      teachers: [],
      rooms: [{ id: "r1", name: "101", short: "101" }],
      classes: [{ id: "c1", name: "10a", short: "10a" }],
      group: null,
      status: "substituted" as const,
      role: "cover" as const,
      coverFor: { id: "t2", name: "Bērziņš Jānis", short: "J. Bērziņš" },
      isCover: true,
      changeNote: "Aizvieto Bērziņš Jānis",
      original: null,
    };

    wrap(
      harness,
      <ul>
        <LessonRow
          lesson={mockCoverLesson}
          live={false}
          showTime={true}
          subjectColorOverrides={{}}
          colorCodingEnabled={true}
          filled={false}
        />
      </ul>,
    );

    const coverBadge = screen.getByTestId("status-cover");
    expect(coverBadge).toBeDefined();
    expect(coverBadge.textContent).toContain("Aizvieto: Bērziņš Jānis");

    // Subtitle contains subject
    expect(screen.getByText("Matemātika")).toBeDefined();
    // Time is revealed separately in LessonCard when showTime=true
    expect(screen.getByText("10:00")).toBeDefined();
    expect(screen.getByText("10:40")).toBeDefined();
    // Primary title contains class and room
    expect(screen.getByText("10a · 101")).toBeDefined();
  });

  it("WeekView renders teacher schedule and overview statistics", async () => {
    const harness = await bootHarness();
    const teachers = listTeachers(Object.values(harness.store.getState().timetables));

    let activeTeacher = teachers[0]!;
    for (const t of teachers) {
      await clickAndSettle(() => {
        void harness.store.getState().setTeacher(t.id);
      });
      const resolved = harness.store.getState().resolvedTeacherDay(FIXTURE_DATE);
      if (resolved && resolved.lessons.length > 0) {
        activeTeacher = t;
        break;
      }
    }

    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
      void harness.store.getState().setTeacher(activeTeacher.id);
    });

    wrap(
      harness,
      <WeekView
        date={FIXTURE_DATE}
        onDateChange={vi.fn()}
        onOpenDay={vi.fn()}
        onPickClass={vi.fn()}
      />,
    );

    // WeekView renders week overview ("Pārskats") and grid
    expect(screen.getByText("Pārskats")).toBeDefined();
  });

  it("LessonSheet displays class name and cover info in teacher mode", async () => {
    const harness = await bootHarness();
    const mockCoverLesson = {
      period: "3",
      start: "10:00",
      end: "10:40",
      span: 1,
      subject: { id: "math", name: "Matemātika", short: "Mat" },
      teachers: [],
      rooms: [{ id: "r1", name: "101", short: "101" }],
      classes: [{ id: "c1", name: "10a", short: "10a" }],
      group: null,
      status: "substituted" as const,
      role: "cover" as const,
      coverFor: { id: "t2", name: "Bērziņš Jānis", short: "J. Bērziņš" },
      isCover: true,
      changeNote: "Aizvieto Bērziņš Jānis",
      original: null,
    };

    const { LessonSheet } = await import("../screens/lesson-sheet");
    wrap(harness, <LessonSheet lesson={mockCoverLesson} day={null} onClose={vi.fn()} />);

    expect(screen.getByText("10a")).toBeDefined();
    expect(screen.getByText("Bērziņš Jānis")).toBeDefined();
    // Student group field should be absent
    expect(screen.queryByText("Pusgrupa")).toBeNull();
  });

  it("hides subgroup selector in GeneralSection when persona is teacher", async () => {
    const harness = await bootHarness();
    await clickAndSettle(() => {
      void harness.store.getState().setPersona("teacher");
    });

    wrap(harness, <GeneralSection buildings={[]} subgroups={["1", "2"]} />);

    expect(screen.queryByText("Pusgrupa")).toBeNull();
  });
});
