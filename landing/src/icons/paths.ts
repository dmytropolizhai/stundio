/*
 * Lucide icon geometry (ISC licence, https://lucide.dev), copied from the `lucide-react` package
 * already in the app so the landing needs no icon dependency at runtime. Each entry is the list
 * of SVG child elements for a 24x24, 2px-stroke icon; `icons/index.ts` wraps them in an <svg>.
 * Generated once — to add an icon, copy its node list from lucide-react's `dist/esm/icons`.
 */
export type IconNode = readonly (readonly [string, Readonly<Record<string, string>>])[];

export const ICON_PATHS = {
  clock: [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["path", { d: "M12 6v6l4 2" }],
  ],
  "circle-x": [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["path", { d: "m15 9-6 6" }],
    ["path", { d: "m9 9 6 6" }],
  ],
  list: [
    ["path", { d: "M3 5h.01" }],
    ["path", { d: "M3 12h.01" }],
    ["path", { d: "M3 19h.01" }],
    ["path", { d: "M8 5h13" }],
    ["path", { d: "M8 12h13" }],
    ["path", { d: "M8 19h13" }],
  ],
  download: [
    ["path", { d: "M12 15V3" }],
    ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
    ["path", { d: "m7 10 5 5 5-5" }],
  ],
  smartphone: [
    ["rect", { width: "14", height: "20", x: "5", y: "2", rx: "2", ry: "2" }],
    ["path", { d: "M12 18h.01" }],
  ],
  monitor: [
    ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }],
    ["line", { x1: "8", x2: "16", y1: "21", y2: "21" }],
    ["line", { x1: "12", x2: "12", y1: "17", y2: "21" }],
  ],
  "arrow-down": [
    ["path", { d: "M12 5v14" }],
    ["path", { d: "m19 12-7 7-7-7" }],
  ],
  "map-pin": [
    [
      "path",
      {
        d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
      },
    ],
    ["circle", { cx: "12", cy: "10", r: "3" }],
  ],
  "building-2": [
    ["path", { d: "M10 12h4" }],
    ["path", { d: "M10 8h4" }],
    ["path", { d: "M14 21v-3a2 2 0 0 0-4 0v3" }],
    ["path", { d: "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" }],
    ["path", { d: "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" }],
  ],
  "wifi-off": [
    ["path", { d: "M12 20h.01" }],
    ["path", { d: "M8.5 16.429a5 5 0 0 1 7 0" }],
    ["path", { d: "M5 12.859a10 10 0 0 1 5.17-2.69" }],
    ["path", { d: "M19 12.859a10 10 0 0 0-2.007-1.523" }],
    ["path", { d: "M2 8.82a15 15 0 0 1 4.177-2.643" }],
    ["path", { d: "M22 8.82a15 15 0 0 0-11.288-3.764" }],
    ["path", { d: "m2 2 20 20" }],
  ],
  "user-round": [
    ["circle", { cx: "12", cy: "8", r: "5" }],
    ["path", { d: "M20 21a8 8 0 0 0-16 0" }],
  ],
  "user-round-x": [
    ["path", { d: "m16.5 16.5 5 5" }],
    ["path", { d: "M2 21a8 8 0 0 1 11.531-7.18" }],
    ["path", { d: "m21.5 16.5-5 5" }],
    ["circle", { cx: "10", cy: "8", r: "5" }],
  ],
  "shield-check": [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      },
    ],
    ["path", { d: "m9 12 2 2 4-4" }],
  ],
  info: [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["path", { d: "M12 16v-4" }],
    ["path", { d: "M12 8h.01" }],
  ],
  image: [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
    ["circle", { cx: "9", cy: "9", r: "2" }],
    ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }],
  ],
  "image-off": [
    ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }],
    ["path", { d: "M10.41 10.41a2 2 0 1 1-2.83-2.83" }],
    ["line", { x1: "13.5", x2: "6", y1: "13.5", y2: "21" }],
    ["line", { x1: "18", x2: "21", y1: "12", y2: "15" }],
    ["path", { d: "M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59" }],
    ["path", { d: "M21 15V5a2 2 0 0 0-2-2H9" }],
  ],
  database: [
    ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }],
    ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5" }],
    ["path", { d: "M3 12A9 3 0 0 0 21 12" }],
  ],
  quote: [
    [
      "path",
      {
        d: "M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",
      },
    ],
    [
      "path",
      {
        d: "M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",
      },
    ],
  ],
  "share-2": [
    ["circle", { cx: "18", cy: "5", r: "3" }],
    ["circle", { cx: "6", cy: "12", r: "3" }],
    ["circle", { cx: "18", cy: "19", r: "3" }],
    ["line", { x1: "8.59", x2: "15.42", y1: "13.51", y2: "17.49" }],
    ["line", { x1: "15.41", x2: "8.59", y1: "6.51", y2: "10.49" }],
  ],
  split: [
    ["path", { d: "M16 3h5v5" }],
    ["path", { d: "M8 3H3v5" }],
    ["path", { d: "M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" }],
    ["path", { d: "m15 9 6-6" }],
  ],
  languages: [
    ["path", { d: "m5 8 6 6" }],
    ["path", { d: "m4 14 6-6 2-3" }],
    ["path", { d: "M2 5h12" }],
    ["path", { d: "M7 2h1" }],
    ["path", { d: "m22 22-5-10-5 10" }],
    ["path", { d: "M14 18h6" }],
  ],
  "sun-moon": [
    ["path", { d: "M12 2v2" }],
    [
      "path",
      {
        d: "M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715",
      },
    ],
    ["path", { d: "M16 12a4 4 0 0 0-4-4" }],
    ["path", { d: "m19 5-1.256 1.256" }],
    ["path", { d: "M20 12h2" }],
  ],
  star: [
    [
      "path",
      {
        d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      },
    ],
  ],
  bell: [
    ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0" }],
    [
      "path",
      {
        d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
      },
    ],
  ],
  users: [
    ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
    ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744" }],
    ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }],
    ["circle", { cx: "9", cy: "7", r: "4" }],
  ],
  repeat: [
    ["path", { d: "m17 2 4 4-4 4" }],
    ["path", { d: "M3 11v-1a4 4 0 0 1 4-4h14" }],
    ["path", { d: "m7 22-4-4 4-4" }],
    ["path", { d: "M21 13v1a4 4 0 0 1-4 4H3" }],
  ],
  copy: [
    ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
    ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }],
  ],
  "chevron-down": [["path", { d: "m6 9 6 6 6-6" }]],
} as const satisfies Record<string, IconNode>;
