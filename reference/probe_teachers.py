# /// script
# requires-python = ">=3.11"
# dependencies = ["requests"]
# ///
"""
Teacher Mode probe / reference oracle for EduPage timetables and substitutions.

Verified against https://pikcrvt.edupage.org and data/ fixtures:
1. Mode "classes" substitutions feed already contains teacher (cover) and teacherFrom (absent).
2. The absent-teacher line lives in <div style="text-align:center">Skolotāji, kuri nepiedalās: ...</div>.
3. 116 of 147 teachers actually have placed teaching cards in tt_num 1175.
4. 75 teachers carry classids (form teachers / klases audzinātāji).
"""
from __future__ import annotations

import json
import re
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

DAY = sys.argv[1] if len(sys.argv) > 1 else "2026-09-09"
SUBDOMAIN = sys.argv[2] if len(sys.argv) > 2 else "pikcrvt"
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"


class AbsentTeachersParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_center_div = False
        self.absent_teachers: list[str] = []
        self._current_text = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        if tag == "div" and "text-align:center" in (attr_map.get("style") or ""):
            self.in_center_div = True
            self._current_text = ""

    def handle_endtag(self, tag: str) -> None:
        if tag == "div" and self.in_center_div:
            self.in_center_div = False
            text = self._current_text.strip()
            prefix = "Skolotāji, kuri nepiedalās:"
            if text.startswith(prefix):
                names_part = text[len(prefix):].strip()
                names = [n.strip() for n in names_part.split(",") if n.strip()]
                self.absent_teachers = names
            self._current_text = ""

    def handle_data(self, data: str) -> None:
        if self.in_center_div:
            self._current_text += data


def parse_absent_teachers(html: str) -> list[str]:
    parser = AbsentTeachersParser()
    parser.feed(html)
    return parser.absent_teachers


def analyze_teachers(day: str = DAY) -> dict:
    html_path = DATA_DIR / f"subst_{day}_classes.html"
    if not html_path.exists():
        raise FileNotFoundError(f"Missing fixture {html_path}")

    html = html_path.read_text(encoding="utf-8")
    absent = parse_absent_teachers(html)

    tt_path = DATA_DIR / "regulartt_1175.json"
    tt_data = json.loads(tt_path.read_text(encoding="utf-8"))

    tables = {t["id"]: t for t in tt_data["r"]["dbiAccessorRes"]["tables"]}
    teachers = tables["teachers"]["data_rows"]
    cards = tables["cards"]["data_rows"]
    lessons = {l["id"]: l for l in tables["lessons"]["data_rows"]}

    placed_cards = [c for c in cards if (c.get("days") or "").find("1") >= 0]

    teaching_teacher_ids = set()
    for c in placed_cards:
        lesson = lessons.get(c["lessonid"])
        if lesson:
            for tid in lesson.get("teacherids") or []:
                teaching_teacher_ids.add(tid)

    teaching_teachers = [t for t in teachers if t["id"] in teaching_teacher_ids]
    form_teachers = [t for t in teaching_teachers if len(t.get("classids") or []) > 0]

    # Substitutions analysis
    subst_path = DATA_DIR / f"subst_{day}_classes.json"
    subst_data = json.loads(subst_path.read_text(encoding="utf-8"))

    covers = []
    for item in subst_data.get("items", []):
        if item.get("kind") == "substitution" and item.get("teacher"):
            covers.append({
                "class": item.get("class_name"),
                "period": item.get("periods"),
                "covering_teacher": item.get("teacher"),
                "absent_teacher": item.get("teacher_from"),
                "subject": item.get("subject"),
                "raw": item.get("raw"),
            })

    return {
        "date": day,
        "total_teachers_in_table": len(teachers),
        "active_teaching_teachers": len(teaching_teachers),
        "form_teachers_with_classes": len(form_teachers),
        "absent_teachers": absent,
        "sample_covers": covers,
    }


def main() -> None:
    result = analyze_teachers(DAY)
    out_file = DATA_DIR / f"probe_teachers_{DAY}.json"
    out_file.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Teacher probe summary for {DAY}:")
    print(f"  Total teachers in table: {result['total_teachers_in_table']}")
    print(f"  Active teaching teachers: {result['active_teaching_teachers']}")
    print(f"  Form teachers with classes: {result['form_teachers_with_classes']}")
    print(f"  Absent teachers found: {result['absent_teachers']}")
    print(f"  Total cover duties in fixture: {len(result['sample_covers'])}")
    print(f"Saved: {out_file}")


if __name__ == "__main__":
    main()
