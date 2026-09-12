/**
 * Latvian is the source dictionary: it is the school's language and the default (`db/types.ts`).
 * Every other locale is typed against `Dict`, so a missing key is a compile error.
 *
 * Dates and weekday names are NOT in here — those come from `Intl` via `format.ts`.
 * Substitution text from EduPage is never translated (CLAUDE.md); it is shown verbatim and
 * labelled with `lesson.fromSchool`.
 */
export const lv = {
  "app.title": "Stundio",

  "nav.day": "Diena",
  "nav.week": "Nedēļa",
  "nav.subjects": "Priekšmeti",
  "nav.settings": "Iestatījumi",

  "onboarding.title": "Izvēlies savu klasi",
  "onboarding.subtitle": "Stundu saraksts un izmaiņas — arī bez interneta.",

  "class.search": "Meklēt klasi…",
  "class.none": "Nav atrasta neviena klase",
  "class.favorites": "Izlase",
  "class.all": "Visas klases",
  "class.loading": "Ielādē klašu sarakstu…",
  "class.favorite.add": "Pievienot izlasei",
  "class.favorite.remove": "Noņemt no izlases",

  "day.today": "Šodien",
  "day.jumpToday": "Uz šodienu",
  "day.openCalendar": "Izvēlēties datumu",
  "day.previousMonth": "Iepriekšējais mēnesis",
  "day.nextMonth": "Nākamais mēnesis",
  "day.pageHint": "Velc pa kreisi vai pa labi, vai izmanto bultiņu taustiņus, lai mainītu dienu",
  "day.empty": "Stundu nav",
  "day.emptyHint": "Brīvdiena vai svētku diena?",
  "day.noClass": "Vispirms izvēlies klasi",
  "day.changeClass": "Mainīt klasi",
  "day.noData": "Nav saglabātu datu",
  "day.noDataHint": "Pievienojies internetam, lai lejupielādētu sarakstu.",
  "day.stale": "Šai nedēļai saraksts vēl nav publicēts — rādām iepriekšējo.",
  "day.notes": "Paziņojumi",
  "day.free": "Brīvstunda",
  "day.finished": "Stundas beigušās",
  "day.now": "Tagad",
  "day.preferences": "Iestatījumi",
  "day.showTime": "Rādīt laiku",

  "week.previousWeek": "Iepriekšējā nedēļa",
  "week.nextWeek": "Nākamā nedēļa",

  "lesson.teacher": "Skolotājs",
  "lesson.room": "Kabinets",
  "lesson.period": "Stunda",
  "lesson.group": "Grupa",
  "lesson.building": "Ēka",
  "lesson.was": "Bija",
  "lesson.fromSchool": "No skolas",
  "lesson.close": "Aizvērt",

  "status.cancelled": "Atcelta",
  "status.moved": "Pārcelta",
  "status.substituted": "Aizvietota",
  "status.room_change": "Cits kabinets",
  "status.added": "Papildu stunda",

  "sync.syncing": "Atjaunina…",
  "sync.offline": "Bezsaistē",
  "sync.error": "Neizdevās atjaunināt",
  "sync.never": "Vēl nav atjaunināts",
  "sync.updated": "Atjaunināts {time}",
  "sync.refresh": "Atjaunināt",
  "sync.pull": "Velc, lai atjauninātu",
  "sync.release": "Atlaid, lai atjauninātu",

  "time.inMinutes": "pēc {n} min",
  "time.minutesLeft": "atlikušas {n} min",
  "time.startsNow": "sākas tūlīt",

  "subjects.title": "Priekšmeti",
  "subjects.perWeek": "{n}× nedēļā",
  "subjects.teachers": "Skolotāji",
  "subjects.empty": "Nav priekšmetu",
  "subjects.emptyHint": "Priekšmeti parādīsies, kad būs lejupielādēts saraksts.",

  "settings.title": "Iestatījumi",
  "settings.class": "Mana klase",
  "settings.change": "Mainīt",
  "settings.building": "Ēka",
  "settings.buildingAuto": "Automātiski",
  "settings.theme": "Noformējums",
  "settings.language": "Valoda",
  "settings.week": "Nedēļas skats",
  "settings.mergeLessons": "Apvienot vienādas stundas",
  "settings.mergeLessonsHint":
    "Pēc kārtas atkārtotu priekšmetu nedēļas skatā rāda kā vienu garāku bloku.",
  "settings.data": "Dati",
  "settings.about": "Par lietotni",
  "settings.aboutText":
    "Neoficiāla lietotne. Dati nāk no publiskā pikcrvt.edupage.org saraksta un pieder skolai.",
  "settings.updateAvailable": "Pieejama jaunāka versija ({version})",
  "settings.updateAction": "Lejupielādēt",

  "theme.system": "Kā sistēmā",
  "theme.light": "Gaišs",
  "theme.dark": "Tumšs",
} as const;

export type Dict = Record<keyof typeof lv, string>;
export type MessageKey = keyof typeof lv;
