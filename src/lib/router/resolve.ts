/**
 * Resolves a parsed `AppRoute` against cached timetables into a concrete `RouteTarget`.
 *
 * Delegates timetable traversal to `lib/persona`'s `findClass` / `findTeacher` so entity
 * lookup rules stay centralized there (AGENT.md).
 */
import type { Timetable } from "@/lib/edupage";
import { findClass, findTeacher } from "@/lib/persona";
import { teacherSlugKey, toSlug } from "./slug.ts";
import type { AppRoute, RouteTarget } from "./types.ts";

export const resolveRouteTarget = (
  route: AppRoute,
  timetables: Iterable<Timetable>,
): RouteTarget | null => {
  switch (route.kind) {
    case "root":
      return null;

    case "class": {
      const want = toSlug(route.slug);
      if (want === "") return null;
      const cls = findClass(
        timetables,
        (c) =>
          (c.short !== "" && toSlug(c.short) === want) ||
          (c.name !== "" && toSlug(c.name) === want),
      );
      return cls === null ? null : { persona: "student", classId: cls.id };
    }

    case "teacher": {
      const want = teacherSlugKey(route.slug);
      if (want === "") return null;
      const teacher = findTeacher(
        timetables,
        (t) =>
          (t.short !== "" && teacherSlugKey(t.short) === want) ||
          (t.name !== "" && teacherSlugKey(t.name) === want),
      );
      return teacher === null ? null : { persona: "teacher", teacherId: teacher.id };
    }
  }
};
