/**
 * Fixture access for the parser tests.
 *
 * Fixtures are NOT copied into src/ — they are read straight from the repo-root `data/`
 * directory that `reference/probe_*.py` regenerates, so there is exactly one copy and no
 * chance of the tests drifting from the probe output. See CLAUDE.md.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(import.meta.dirname, "..", "..", "..", "..", "data");

export const readFixture = (name: string): string => readFileSync(join(DATA_DIR, name), "utf8");

export const readJsonFixture = <T = unknown>(name: string): T => JSON.parse(readFixture(name)) as T;

/** The fixture set captured on 2026-09-09 (see MODEL.md). */
export const FIXTURES = {
  ttviewer: "ttviewer.json",
  regulartt: "regulartt_1175.json",
  normalized: "normalized_1175.json",
  substHtml: "subst_2026-09-09_classes.html",
  substJson: "subst_2026-09-09_classes.json",
  timetablePage: "timetable_page.html",
} as const;

export const FIXTURE_TT_NUM = "1175";
export const FIXTURE_DATE = "2026-09-09";
