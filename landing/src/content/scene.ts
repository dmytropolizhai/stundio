/*
 * The fixed example the two HTML scenes show, and the list of screenshots allowed on the page.
 *
 * The scene is an illustration, never data: the same lessons on every visit, in every language,
 * unrelated to the visitor's clock. Subject names are real Latvian names from the public
 * timetable (school-written text, so they are not translated); rooms are made up; there are no
 * teacher names anywhere (01c section 2).
 */
export type SceneLesson = {
  readonly subject: string;
  readonly room: string;
  readonly building: string;
  readonly start: string;
  readonly end: string;
};

/** "Now" row of the hero scene: 21 of 40 minutes gone, 19 left. */
export const SCENE_NOW: SceneLesson & { readonly progress: number } = {
  subject: "Programmēšana",
  room: "214",
  building: "Galvenā ēka",
  start: "10:10",
  end: "10:50",
  progress: 21 / 40,
};

export const SCENE_NEXT: SceneLesson = {
  subject: "Angļu valoda",
  room: "3",
  building: "TIC",
  start: "10:55",
  end: "11:35",
};

/** Three lessons in a row; the middle one is cancelled. `accent` indexes the subject colour. */
export const SCENE_CHANGES: readonly (SceneLesson & {
  readonly n: number;
  readonly accent: "a" | "b" | "c";
  readonly cancelled: boolean;
})[] = [
  {
    n: 1,
    accent: "a",
    subject: "Angļu valoda",
    room: "3",
    building: "TIC",
    start: "08:30",
    end: "09:10",
    cancelled: false,
  },
  {
    n: 2,
    accent: "b",
    subject: "Matemātika",
    room: "208",
    building: "Galvenā ēka",
    start: "09:15",
    end: "09:55",
    cancelled: true,
  },
  {
    n: 3,
    accent: "c",
    subject: "Programmēšana",
    room: "214",
    building: "Galvenā ēka",
    start: "10:10",
    end: "10:50",
    cancelled: false,
  },
];

/**
 * Screenshots that may appear on the page. `day-view`, `subjects-view` and the GitHub banner show
 * real teachers' names, so they are refused at build time, not by review (02a section 0).
 */
export const ALLOWED_SHOTS = ["week-view"] as const;
export type ShotName = (typeof ALLOWED_SHOTS)[number];

export const SHOT_SIZE: Record<ShotName, { readonly width: number; readonly height: number }> = {
  "week-view": { width: 241, height: 510 },
};
