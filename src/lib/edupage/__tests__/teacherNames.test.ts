import { describe, expect, it } from "vitest";
import {
  indexTeachersByKey,
  lookupTeacher,
  normalizeTimetable,
  parseDaySubstitutions,
  resolveDay,
  teacherKey,
} from "../index.ts";
import { FIXTURES, FIXTURE_DATE, FIXTURE_TT_NUM, readFixture, readJsonFixture } from "./fixtures.ts";
import type { RawTables } from "../normalize.ts";

describe("teacherKey", () => {
  it("normalises and sorts name tokens identically regardless of order", () => {
    expect(teacherKey("Ķere Gene")).toBe(teacherKey("Gene Ķere"));
    expect(teacherKey("Liene Elizabete Čakste")).toBe(teacherKey("Čakste Liene Elizabete"));
    expect(teacherKey("Edgars Geislers")).toBe(teacherKey("Geislers Edgars"));
  });

  it("preserves Latvian diacritics and handles irregular whitespace and casing", () => {
    expect(teacherKey("  ČAKSTE   Liene   Elizabete  ")).toBe("čakste elizabete liene");
    expect(teacherKey("")).toBe("");
  });
});

describe("Teacher Name Matching against Fixtures (Finding 2)", () => {
  const raw = readJsonFixture<{
    r: { dbiAccessorRes: { tables: Array<{ id: string; data_rows?: Record<string, unknown>[] }> } };
  }>(FIXTURES.regulartt);
  const tables: RawTables = Object.fromEntries(
    raw.r.dbiAccessorRes.tables.map((t) => [t.id, t.data_rows ?? []]),
  );
  const { timetable: normalized } = normalizeTimetable(tables, {
    ttNum: FIXTURE_TT_NUM,
    building: "Galvenā ēka",
    validFrom: "2026-09-07",
    validTo: "2026-09-11",
    label: "Galvenā ēka 07.09.2026.",
    schoolYear: 2026,
    fetchedAt: "2026-09-09T00:00:00.000Z",
  });
  const substData = readJsonFixture<{
    items: Array<{ teacher?: string | null; teacher_from?: string | null }>;
  }>(FIXTURES.substJson);

  const teacherMap = indexTeachersByKey(normalized.teachers);

  // Extract all unique teacher names present in the substitutions fixture
  const substTeacherNames = new Set<string>();
  for (const item of substData.items) {
    if (item.teacher) substTeacherNames.add(item.teacher);
    if (item.teacher_from) substTeacherNames.add(item.teacher_from);
  }

  it("finds exactly 18 unique teacher names in 2026-09-09 substitution feed", () => {
    expect(substTeacherNames.size).toBe(18);
  });

  it("resolves all 18 fixture teacher names to real TeacherRefs (0 fallbacks to synthetic)", () => {
    let resolvedCount = 0;
    for (const name of substTeacherNames) {
      const match = lookupTeacher(name, teacherMap);
      expect(match).toBeDefined();
      expect(match?.id).not.toMatch(/^subst:/);
      resolvedCount++;
    }
    expect(resolvedCount).toBe(18);
  });

  it("resolves substitution teacher in resolveDay without falling back to synthTeacher", () => {
    // Class A1-2 on 2026-09-09 period 2 has substitution by Edgars Geislers
    const classA12 = normalized.classes.find((c) => c.short === "A1-2");
    expect(classA12).toBeDefined();

    const parsedSubsts = parseDaySubstitutions(
      readFixture(FIXTURES.substHtml),
      FIXTURE_DATE,
      "2026-09-09T00:00:00.000Z",
    );

    const resolved = resolveDay(normalized, parsedSubsts, classA12!.id, FIXTURE_DATE);
    const p2 = resolved.lessons.find((l) => l.period === "2");
    expect(p2).toBeDefined();
    expect(p2?.teachers[0]?.short).toBe("Geislers Edgars");
    expect(p2?.teachers[0]?.id).not.toMatch(/^subst:/);
  });


  it("has zero key collisions among teachers who actually teach", () => {
    const teachingTeacherIds = new Set<string>();
    for (const l of normalized.lessons) {
      for (const tid of l.teacherIds) teachingTeacherIds.add(tid);
    }

    const seenKeys = new Map<string, string>();
    for (const t of normalized.teachers) {
      if (!teachingTeacherIds.has(t.id)) continue;
      const k = teacherKey(t.short);
      const existing = seenKeys.get(k);
      expect(existing, `Collision for key "${k}": ${t.short} and ${existing}`).toBeUndefined();
      seenKeys.set(k, t.short);
    }
  });
});
