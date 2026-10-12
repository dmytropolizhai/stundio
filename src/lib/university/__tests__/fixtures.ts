/**
 * The RTU / LU fixtures captured 2026-10-12 (MODEL-UNIVERSITY.md), read straight from the
 * repo-root `data/` like the EduPage ones, and a fake server that answers from them.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { HttpClient, HttpRequest } from "@/lib/edupage";

const DATA_DIR = join(import.meta.dirname, "..", "..", "..", "..", "data");

export const readFixture = (name: string): string => readFileSync(join(DATA_DIR, name), "utf8");
export const readJsonFixture = (name: string): unknown => JSON.parse(readFixture(name));

export const RTU = {
  index: "rtu_index.html",
  semester: "rtu_semester_31.json",
  programs: "rtu_programs_31.json",
  courses: "rtu_courses_31_227.json",
  groups: "rtu_groups_31_227_1.json",
  subjects: "rtu_subjects_38532.json",
  events: "rtu_events_38532_2026-10.json",
} as const;

export const LU = {
  index: "lu_index.html",
  chrono: "lu_group_26R-21023-PLK-1_chrono.html",
} as const;

export type FakeUniversity = {
  http: HttpClient;
  requests: HttpRequest[];
  offline: boolean;
  /** Answer every request with this HTTP status. */
  status: number | null;
};

/** RTU answers raw strings, the way CapacitorHttp hands back an unparsed body. */
export const createFakeUniversity = (): FakeUniversity => {
  const fake: FakeUniversity = {
    requests: [],
    offline: false,
    status: null,
    http: (req) => {
      fake.requests.push(req);
      if (fake.offline) return Promise.reject(new TypeError("Failed to fetch"));
      if (fake.status !== null) return Promise.resolve({ status: fake.status, data: "nope" });
      const url = new URL(req.url);
      const answer = (name: string) => Promise.resolve({ status: 200, data: readFixture(name) });
      if (url.host === "nodarbibas.rtu.lv") {
        switch (url.pathname) {
          case "/":
            return answer(RTU.index);
          case "/findProgramsBySemesterId":
            return answer(RTU.programs);
          case "/findCourseByProgramId":
            return Promise.resolve({ status: 200, data: [1] });
          case "/findGroupByCourseId":
            return answer(RTU.groups);
          case "/getSemProgSubjects":
            return answer(RTU.subjects);
          case "/getSemesterProgEventList":
            return req.form?.["month"] === "10"
              ? answer(RTU.events)
              : Promise.resolve({ status: 200, data: "[]" });
        }
      }
      if (url.host === "lekciju-saraksts.lu.lv") {
        if (url.pathname === "/") return answer(LU.index);
        if (url.pathname.endsWith("/hronologiski")) return answer(LU.chrono);
      }
      return Promise.reject(new Error(`unexpected url ${req.url}`));
    },
  };
  return fake;
};
