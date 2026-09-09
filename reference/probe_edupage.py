# /// script
# requires-python = ">=3.11"
# dependencies = ["requests"]
# ///
"""
EduPage timetable probe / minimal scraper.

Verified against https://pikcrvt.edupage.org (Rīgas Valsts tehnikums) on 2026-09-09:
the timetable is fully PUBLIC — no login, gsechash "00000000".

Working API (POST, JSON body, no cookies needed):

  1) list published timetables
     POST /timetable/server/ttviewer.js?__func=getTTViewerData
     body: {"__args": [null, <schoolYear:int>], "__gsh": "00000000"}
     -> r.regular.timetables[] = {tt_num, year, text, datefrom, hidden}
        r.regular.default_num  (current one)

  2) full timetable payload
     POST /timetable/server/regulartt.js?__func=regularttGetData
     body: {"__args": [null, "<tt_num:str>"], "__gsh": "00000000"}
     -> r.dbiAccessorRes.tables[] = [{id, data_rows[]}, ...]
        tables: periods days classes teachers subjects classrooms
                groups lessons cards buildings weeks terms ...

Join model:
  lessons: {id, subjectid, teacherids[], classids[], groupids[], durationperiods, count}
           ~94% carry classids directly; the rest resolve class via groupids -> groups[].classid
  cards:   {id, lessonid, period, days("00100" = Mon..Fri bitmask), weeks, classroomids[]}
           one card per placed slot; multiple cards per lesson

Note: RVT publishes a SEPARATE tt_num per building per week
      ("TIC" = Dārzciems annex, "Galvenā ēka" = main building).

Usage:
  uv run probe_edupage.py                 # default subdomain: pikcrvt
  uv run probe_edupage.py otherschool
  uv run probe_edupage.py pikcrvt 1175    # force a specific tt_num
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import requests

SUBDOMAIN = sys.argv[1] if len(sys.argv) > 1 else "pikcrvt"
FORCE_TT = sys.argv[2] if len(sys.argv) > 2 else None
BASE = f"https://{SUBDOMAIN}.edupage.org"
GSH = "00000000"  # anonymous hash; real one only needed for logged-in scopes
OUT = Path(__file__).resolve().parent.parent / "data"  # repo-root data/, not reference/data/
OUT.mkdir(exist_ok=True)

s = requests.Session()
s.headers.update(
    {
        "User-Agent": "edupage-timetable-probe/0.1 (+personal project)",
        "Content-Type": "application/json",
        "Referer": f"{BASE}/timetable/",
    }
)

DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def save(name: str, obj) -> Path:
    p = OUT / name
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    return p


def section(t: str) -> None:
    print(f"\n{'=' * 72}\n{t}\n{'=' * 72}")


def call(func_path: str, arg) -> dict:
    """POST an EduPage server function. Raises on the {'e': ...} error envelope."""
    url = f"{BASE}/timetable/server/{func_path}"
    r = s.post(url, data=json.dumps({"__args": [None, arg], "__gsh": GSH}), timeout=30)
    r.raise_for_status()
    txt = r.text
    i = txt.find("{")
    if i > 0:  # occasional junk prefix
        txt = txt[i:]
    try:
        data = json.loads(txt)
    except json.JSONDecodeError:
        raise RuntimeError(f"{func_path}: non-JSON response: {r.text[:200]!r}")
    if isinstance(data, dict) and data.get("e"):
        raise RuntimeError(f"{func_path}: server error {data['e']} (args={arg!r})")
    return data


# --------------------------------------------------------------------------- #
def list_timetables() -> tuple[list[dict], str | None]:
    section(f"1. getTTViewerData  ({BASE})")
    year = date.today().year if date.today().month >= 8 else date.today().year - 1
    data = call("ttviewer.js?__func=getTTViewerData", year)
    save("ttviewer.json", data)
    reg = data["r"]["regular"]
    tts = [t for t in reg["timetables"] if not t.get("hidden")]
    for t in tts:
        print(f"  tt_num={t['tt_num']:>5}  {t['datefrom']}  {t['text']}")
    print(f"  default_num = {reg.get('default_num')!r}")
    return tts, reg.get("default_num")


def fetch_regular(tt_num: str) -> dict[str, list[dict]]:
    section(f"2. regularttGetData  (tt_num={tt_num})")
    data = call("regulartt.js?__func=regularttGetData", str(tt_num))
    save(f"regulartt_{tt_num}.json", data)
    tables = {t["id"]: t.get("data_rows", []) for t in data["r"]["dbiAccessorRes"]["tables"]}
    for k in ("periods", "days", "classes", "teachers", "subjects",
              "classrooms", "groups", "lessons", "cards", "buildings"):
        if k in tables:
            print(f"  {k:11} {len(tables[k]):5}")
    return tables


def normalize(tables: dict[str, list[dict]]) -> dict:
    """Flatten to app-friendly shape: one entry per placed lesson slot."""
    subj = {x["id"]: x for x in tables.get("subjects", [])}
    tea = {x["id"]: x for x in tables.get("teachers", [])}
    room = {x["id"]: x for x in tables.get("classrooms", [])}
    cls = {x["id"]: x for x in tables.get("classes", [])}
    grp_class = {g["id"]: g.get("classid") for g in tables.get("groups", [])}
    lessons = {l["id"]: l for l in tables.get("lessons", [])}
    periods = {p["period"]: p for p in tables.get("periods", [])}

    def lesson_class_ids(l: dict) -> list[str]:
        ids = set(l.get("classids") or [])
        for gid in l.get("groupids") or []:
            if grp_class.get(gid):
                ids.add(grp_class[gid])
        return [i for i in ids if i]

    slots = []
    for card in tables.get("cards", []):
        l = lessons.get(card["lessonid"])
        if not l:
            continue
        day_idx = (card.get("days") or "").find("1")
        if day_idx < 0:
            continue
        p = periods.get(card.get("period"), {})
        for cid in lesson_class_ids(l):
            slots.append(
                {
                    "class": (cls.get(cid) or {}).get("short"),
                    "day": DAY_SHORT[day_idx] if day_idx < 7 else day_idx,
                    "period": card.get("period"),
                    "start": p.get("starttime"),
                    "end": p.get("endtime"),
                    "subject": (subj.get(l.get("subjectid")) or {}).get("name"),
                    "subject_short": (subj.get(l.get("subjectid")) or {}).get("short"),
                    "teachers": [
                        (tea.get(t) or {}).get("short") for t in (l.get("teacherids") or [])
                    ],
                    "rooms": [
                        (room.get(rr) or {}).get("short")
                        for rr in (card.get("classroomids") or [])
                    ],
                    "color": (subj.get(l.get("subjectid")) or {}).get("color"),
                    "weeks": card.get("weeks"),
                }
            )
    return {
        "classes": sorted(c["short"] for c in tables.get("classes", []) if c.get("short")),
        "periods": [
            {"period": p["period"], "start": p.get("starttime"), "end": p.get("endtime")}
            for p in tables.get("periods", [])
        ],
        "slots": slots,
    }


def show_class(norm: dict, class_short: str) -> None:
    section(f"3. Reconstructed timetable — class {class_short!r}")
    rows = [x for x in norm["slots"] if x["class"] == class_short]
    if not rows:
        print("  (no slots)")
        return
    by_day: dict[str, list] = {}
    for x in rows:
        by_day.setdefault(x["day"], []).append(x)
    for day in DAY_SHORT:
        if day not in by_day:
            continue
        print(f"  {day}")
        for x in sorted(by_day[day], key=lambda r: int(r["period"])):
            t = ",".join(filter(None, x["teachers"]))
            rm = ",".join(filter(None, x["rooms"]))
            print(f"    {x['start']}-{x['end']}  {x['subject_short']:<45} {t:<20} {rm}")


# --------------------------------------------------------------------------- #
def run() -> None:
    tts, default_num = list_timetables()
    tt_num = FORCE_TT or default_num or (tts[-1]["tt_num"] if tts else None)
    if not tt_num:
        print("\n⛔ No timetable numbers returned.")
        return

    tables = fetch_regular(tt_num)
    norm = normalize(tables)
    p = save(f"normalized_{tt_num}.json", norm)
    print(f"\n  normalized -> {p}  ({len(norm['slots'])} class-slots)")

    sample = norm["classes"][0] if norm["classes"] else None
    if sample:
        show_class(norm, sample)

    section("VERDICT")
    print("  ✅ Public timetable, no auth. Two POST calls give the full week.")
    print(f"  ✅ {len(norm['classes'])} classes, {len(norm['slots'])} placed slots, joins resolve cleanly.")
    print("  -> next: /substitution/ endpoint for daily changes; pick tt_num per building+week.")


if __name__ == "__main__":
    run()
