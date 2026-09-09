# /// script
# requires-python = ">=3.11"
# dependencies = ["requests"]
# ///
"""
EduPage substitutions ("Aizvietošana") probe / scraper.  Stdlib-only parser.

Verified against https://pikcrvt.edupage.org on 2026-09-09: PUBLIC, no login.

Only one public endpoint exists and it returns RENDERED HTML, not JSON:

  POST /substitution/server/viewer.js?__func=getSubstViewerDayDataHtml
  body: {"__args": [null, {"date": "YYYY-MM-DD", "mode": "classes"}], "__gsh": "00000000"}
  -> {"r": "<html string>"}

  mode: "classes" | "teachers" | "classrooms"

JSON variants (getSubstViewerDayData, getSubstViewerData) and the structured
merged endpoint timetable/server/currenttt.js?__func=curentttGetData all require
a logged-in session (anonymous -> "TypeError: Cannot read ..."). So we parse HTML.

HTML shape:
  div[data-date]
    div.subst_note                 -> free-text announcements for the day
    div.section  (one per class)
      div.header                   -> class name, matches ClassRef.short
      div.row.(change|add|remove)
        div.period > span          -> "1" | "(1)" | "7 - 8" | "(7 - 8)"
                                      parens = the ORIGINAL slot being vacated
        div.info   > span          -> localized natural-language description

.info grammar (Latvian locale — LOCALE-DEPENDENT; .raw is always kept):
  "<Subj> - <Teacher>, Atcelts"                                  cancelled
  "<Subj> - <Teacher>, Moved to period: N"                       moved_out
  "<Subj> - Moved from period: N, Skolotājs: <Teacher>"          moved_in
  "(<Subj>) ➔ <Subj2> - Aizvietošana: (<T1>) ➔ <T2>,
      Kabineta nomaiņa: (<R1>) ➔ <R2>"                           substitution
  "<n>: <Subj> - Added, Skolotājs: <T>, Kabinets: <R>"           added
  leading "<n>: " on the subject                                 -> group = "<n>"

Usage:
  python3 probe_substitution.py                      # today, pikcrvt
  python3 probe_substitution.py 2026-09-09
  python3 probe_substitution.py 2026-09-09 pikcrvt classes
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

import requests

DAY = sys.argv[1] if len(sys.argv) > 1 else date.today().isoformat()
SUBDOMAIN = sys.argv[2] if len(sys.argv) > 2 else "pikcrvt"
MODE = sys.argv[3] if len(sys.argv) > 3 else "classes"
BASE = f"https://{SUBDOMAIN}.edupage.org"
YEAR = int(DAY[:4])
GSH = "00000000"
OUT = Path(__file__).parent / "data"
OUT.mkdir(exist_ok=True)

ARROW = "\u2794"  # ➔


# --------------------------------------------------------------------------- #
@dataclass
class Substitution:
    date: str
    class_name: str
    group: str | None
    periods: list[int]
    is_original_slot: bool
    kind: str  # cancelled|moved_out|moved_in|substitution|room_change|added|other
    subject: str | None = None
    subject_from: str | None = None
    teacher: str | None = None
    teacher_from: str | None = None
    room: str | None = None
    room_from: str | None = None
    moved_from_period: int | None = None
    moved_to_period: int | None = None
    moved_from_date: str | None = None
    moved_to_date: str | None = None
    raw: str = ""


@dataclass
class DaySubstitutions:
    date: str
    mode: str
    notes: list[str] = field(default_factory=list)
    items: list[Substitution] = field(default_factory=list)
    fetched_at: str = ""


# --------------------------------------------------------------------------- #
class SubstHTMLParser(HTMLParser):
    """Pull (note | class header | row{mod, period, info}) tuples out of the blob."""

    def __init__(self) -> None:
        super().__init__()
        self.notes: list[str] = []
        self.rows: list[tuple[str, str, str]] = []  # (mod, period, info)
        self.headers: list[tuple[int, str]] = []    # (row_index_at_time, class_name)
        self._stack: list[set[str]] = []
        self._capture: str | None = None            # 'note' | 'period' | 'info' | 'header'
        self._buf: list[str] = []
        self._cur_mod: str | None = None
        self._cur_period: str = ""

    def handle_starttag(self, tag, attrs):
        classes = set((dict(attrs).get("class") or "").split())
        self._stack.append(classes)
        if "subst_note" in classes:
            self._start("note")
        elif "header" in classes:
            self._start("header")
        elif "row" in classes:
            self._cur_mod = next(
                (c for c in ("change", "add", "remove") if c in classes), "other"
            )
            self._cur_period = ""
        elif "period" in classes:
            self._start("period")
        elif "info" in classes:
            self._start("info")

    def handle_endtag(self, tag):
        classes = self._stack.pop() if self._stack else set()
        if self._capture == "note" and "subst_note" in classes:
            self._flush_note()
        elif self._capture == "header" and "header" in classes:
            self.headers.append((len(self.rows), self._take().strip()))
        elif self._capture == "period" and "period" in classes:
            self._cur_period = self._take().strip()
        elif self._capture == "info" and "info" in classes:
            info = re.sub(r"\s+", " ", self._take()).strip()
            self.rows.append((self._cur_mod or "other", self._cur_period, info))
            self._cur_mod = None

    def handle_data(self, data):
        if self._capture:
            self._buf.append(data)

    # -- helpers
    def _start(self, what: str) -> None:
        self._capture, self._buf = what, []

    def _take(self) -> str:
        txt, self._capture, self._buf = "".join(self._buf), None, []
        return txt

    def _flush_note(self) -> None:
        txt = re.sub(r"\s+", " ", self._take()).strip()
        if txt:
            self.notes.append(txt)


# --------------------------------------------------------------------------- #
def fetch_html(day: str, mode: str) -> str:
    r = requests.post(
        f"{BASE}/substitution/server/viewer.js?__func=getSubstViewerDayDataHtml",
        data=json.dumps({"__args": [None, {"date": day, "mode": mode}], "__gsh": GSH}),
        headers={"Content-Type": "application/json", "Referer": f"{BASE}/substitution/"},
        timeout=30,
    )
    r.raise_for_status()
    body = r.json()
    if isinstance(body, dict) and body.get("e"):
        raise RuntimeError(f"server error: {body['e']}")
    return body["r"]


def parse_periods(text: str) -> tuple[list[int], bool]:
    original = "(" in text
    nums = [int(n) for n in re.findall(r"\d+", text)]
    if len(nums) == 2 and " - " in text.replace("(", "").replace(")", ""):
        nums = list(range(nums[0], nums[1] + 1))
    return nums, original


def _old_new(seg: str) -> tuple[str | None, str | None]:
    if ARROW not in seg:
        return None, seg.strip() or None
    left, right = seg.split(ARROW, 1)
    return left.strip(" ()") or None, right.strip() or None


def parse_info(info: str) -> dict:
    out: dict = {"raw": info}

    m = re.match(r"^\s*(\d+)\s*:\s*(.*)$", info)
    if m:
        out["group"], info = m.group(1), m.group(2)

    head, _, rest = info.partition(" - ")
    if ARROW in head:
        out["subject_from"], out["subject"] = _old_new(head)
    else:
        out["subject"] = head.strip() or None

    kind = "other"
    if re.search(r"\bAtcelts\b", rest):
        kind = "cancelled"
    if m := re.search(r"Moved to period:\s*(\d+)", rest):
        kind, out["moved_to_period"] = "moved_out", int(m.group(1))
    if m := re.search(r"Moved from period:\s*(\d+)", rest):
        kind, out["moved_from_period"] = "moved_in", int(m.group(1))
    # cross-day moves: "Moved to <Weekday> DD. MM." / "Moved from <Weekday> DD. MM."
    if m := re.search(r"Moved to\s+\S+\s+(\d{1,2})\.\s*(\d{1,2})\.", rest):
        kind = "moved_out"
        out["moved_to_date"] = f"{YEAR:04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    if m := re.search(r"Moved from\s+\S+\s+(\d{1,2})\.\s*(\d{1,2})\.", rest):
        kind = "moved_in"
        out["moved_from_date"] = f"{YEAR:04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    if "Added" in rest:
        kind = "added"
    if m := re.search(r"Aizvietošana:\s*(.+?)(?:,\s*Kabineta|,\s*Kabinets|$)", rest):
        out["teacher_from"], out["teacher"] = _old_new(m.group(1))
        kind = "substitution"
    if m := re.search(r"Kabineta nomaiņa:\s*(.+?)(?:,\s|$)", rest):
        out["room_from"], out["room"] = _old_new(m.group(1))
        if kind == "other":
            kind = "room_change"
    if m := re.search(r"Skolotājs:\s*([^,]+)", rest):
        out["teacher"] = m.group(1).strip()
    if m := re.search(r"Kabinets:\s*([^,]+)", rest):
        out["room"] = m.group(1).strip()

    out["kind"] = kind
    return out


def parse_day(html: str, day: str, mode: str) -> DaySubstitutions:
    p = SubstHTMLParser()
    p.feed(html)

    # map each row index -> class name via the header that precedes it
    class_at: list[str] = []
    hi = 0
    for i in range(len(p.rows)):
        while hi < len(p.headers) and p.headers[hi][0] <= i:
            hi += 1
        class_at.append(p.headers[hi - 1][1] if hi else "?")

    items: list[Substitution] = []
    for i, (mod, period_txt, info_txt) in enumerate(p.rows):
        periods, is_original = parse_periods(period_txt)
        d = parse_info(info_txt)
        items.append(
            Substitution(
                date=day,
                class_name=class_at[i],
                group=d.get("group"),
                periods=periods,
                is_original_slot=is_original,
                kind=d.get("kind", "other"),
                subject=d.get("subject"),
                subject_from=d.get("subject_from"),
                teacher=d.get("teacher"),
                teacher_from=d.get("teacher_from"),
                room=d.get("room"),
                room_from=d.get("room_from"),
                moved_from_period=d.get("moved_from_period"),
                moved_to_period=d.get("moved_to_period"),
                moved_from_date=d.get("moved_from_date"),
                moved_to_date=d.get("moved_to_date"),
                raw=d["raw"],
            )
        )

    notes: list[str] = []
    for block in p.notes:
        notes += [
            s.strip()
            for s in re.split(r"(?<=\.)\s+(?=[A-ZŠČĢĶĀĒĪŪŅ0-9])", block)
            if s.strip()
        ]

    return DaySubstitutions(
        date=day, mode=mode, notes=notes, items=items,
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )


# --------------------------------------------------------------------------- #
def main() -> None:
    print(f"{BASE}  date={DAY}  mode={MODE}")
    html = fetch_html(DAY, MODE)
    (OUT / f"subst_{DAY}_{MODE}.html").write_text(html, encoding="utf-8")

    day = parse_day(html, DAY, MODE)
    out_path = OUT / f"subst_{DAY}_{MODE}.json"
    out_path.write_text(json.dumps(asdict(day), ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nnotes ({len(day.notes)}):")
    for n in day.notes:
        print(f"  • {n[:150]}")

    by_kind: dict[str, int] = {}
    for it in day.items:
        by_kind[it.kind] = by_kind.get(it.kind, 0) + 1
    print(f"\nchanges ({len(day.items)})  by kind: {by_kind}\n")

    for it in day.items[:30]:
        loc = it.class_name + (f"/{it.group}" if it.group else "")
        per = "-".join(map(str, it.periods)) or "?"
        who = f"{it.teacher_from} {ARROW} {it.teacher}" if it.teacher_from else (it.teacher or "")
        room = f" @{it.room}" if it.room else ""
        print(f"  [{it.kind:13}] {loc:11} p{per:<7} {(it.subject or '')[:38]:<38} {who}{room}")

    print(f"\nsaved: {out_path}")
    print("VERDICT: ✅ public, HTML-only. Parser -> typed model; .raw kept as fallback.")


if __name__ == "__main__":
    main()
