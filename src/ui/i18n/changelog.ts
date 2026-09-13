/**
 * Release notes, in every language the app speaks.
 *
 * Deliberately not keyed into `lv.ts` and its three siblings: a release adds five or six
 * lines, and spreading those across four dictionaries makes each release four separate edits
 * of prose that has to stay consistent. Here one release is one block, with all four
 * languages in view while it is written — and `Record<Lang, …>` still makes TypeScript refuse
 * an entry that forgot a language, which is the guarantee the dictionaries were giving.
 *
 * Notes are user-facing, not commit-facing: "share your week as an image", never
 * "refactor(ui): …". A release with nothing a student would notice gets no entry at all.
 *
 * `version` must match the `package.json` version of the build that shipped it — the sheet
 * never shows notes for a version newer than the installed APK (`entriesSince`).
 */
import type { Lang } from "./format.ts";
import type { ISODate } from "@/lib/edupage";

export type ChangelogEntry = {
  /** The release tag, exactly as it appears in `package.json` and on GitHub. */
  version: string;
  date: ISODate;
  lines: Record<Lang, readonly string[]>;
};

/** Newest first by convention; `sortByVersionDesc` does not rely on it. */
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    version: "v1.0.4-ozols",
    date: "2026-09-13",
    lines: {
      lv: [
        "Kopīgo savu nedēļas sarakstu kā attēlu",
        "Pievieno savas piezīmes katram mācību priekšmetam",
        "Automātiskajā režīmā redzamas visu korpusu stundas",
        "Jauns ielādes ekrāns un ievada ilustrācijas",
        "Nedēļas režģis rāda pēdējās stundas beigu laiku",
      ],
      en: [
        "Share your week as an image",
        "Add your own notes to any subject",
        "Automatic building now shows lessons from every building",
        "New loading screen and onboarding illustrations",
        "The week grid shows the last lesson's end time",
      ],
      ru: [
        "Делись расписанием на неделю картинкой",
        "Добавляй свои заметки к любому предмету",
        "В автоматическом режиме видны занятия всех корпусов",
        "Новый экран загрузки и иллюстрации знакомства",
        "В сетке недели видно время окончания последнего урока",
      ],
      ua: [
        "Ділись розкладом на тиждень картинкою",
        "Додавай власні нотатки до будь-якого предмета",
        "В автоматичному режимі видно заняття всіх корпусів",
        "Новий екран завантаження та ілюстрації знайомства",
        "У сітці тижня видно час завершення останнього уроку",
      ],
    },
  },
  {
    version: "v1.0.3-ozols",
    date: "2026-09-12",
    lines: {
      lv: [
        "Valodas izvēle uzreiz pēc pirmās palaišanas",
        "Ievada slaidus var pāršķirt ar pirkstu",
        "Paziņojumu atļauju var atļaut atkārtoti",
      ],
      en: [
        "Pick your language on first launch",
        "Swipe between the intro slides",
        "Ask for notification permission again after it was denied",
      ],
      ru: [
        "Выбор языка при первом запуске",
        "Слайды знакомства листаются свайпом",
        "Разрешение на уведомления можно выдать позже",
      ],
      ua: [
        "Вибір мови при першому запуску",
        "Слайди знайомства гортаються свайпом",
        "Дозвіл на сповіщення можна надати пізніше",
      ],
    },
  },
  {
    version: "v1.0.1-ozols",
    date: "2026-09-12",
    lines: {
      lv: [
        "Pilnīgi jauns lietotnes izskats",
        "Nedēļas skats ar visu nedēļas sarakstu",
        "Atgādinājumi par stundām un izmaiņām sarakstā",
        "Atjauninājumi tieši lietotnē",
        "Ukraiņu valoda",
        "Poga kļūdu ziņošanai",
      ],
      en: [
        "A completely new look",
        "A week view with the whole week at once",
        "Reminders for lessons and for schedule changes",
        "Updates install inside the app",
        "Ukrainian language",
        "A button for reporting mistakes",
      ],
      ru: [
        "Полностью новый внешний вид",
        "Экран недели — всё расписание сразу",
        "Напоминания об уроках и изменениях в расписании",
        "Обновления устанавливаются прямо в приложении",
        "Украинский язык",
        "Кнопка для сообщения об ошибке",
      ],
      ua: [
        "Цілком новий вигляд",
        "Екран тижня — увесь розклад одразу",
        "Нагадування про уроки та зміни в розкладі",
        "Оновлення встановлюються просто в застосунку",
        "Українська мова",
        "Кнопка для повідомлення про помилку",
      ],
    },
  },
  {
    version: "v1.0.0-ozols",
    date: "2026-09-11",
    lines: {
      lv: ["Pirmā Stundio versija"],
      en: ["The first release of Stundio"],
      ru: ["Первая версия Stundio"],
      ua: ["Перша версія Stundio"],
    },
  },
];
