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
    version: "v1.1.0-dzintars",
    date: "2026-09-13",
    lines: {
      lv: [
        'Pievienots pielāgošanas panelis ar ierobežotiem izskata iestatījumiem (stūru noapaļošanas slīdnis, priekšmeta krāsas izvēle) un opciju "Atiestatīt uz noklusējumu".',
        "Pievienots lietotnes izmaiņu žurnāls, kas parāda lietotājiem jaunumus pēc atjaunināšanas.",
        "Uzlaboti paziņojumi ar pieskāriena navigācijas apstrādi, pielāgotu ikonu un spraudņa plānošanas konfigurāciju.",
        "Uzlabots kopīgošanas panelis, pievienojot valodas izvēli un sinhronizācijas opcijas, kopīgojot stundu sarakstu.",
        'Novērsta problēma, kurā teksta fragments "tic" parādījās nodarbību izvēles logā.',
        "Pēdējā stundu saraksta karte tagad ir sasniedzama virs peldošās navigācijas joslas.",
        "Funkcija `useClasses` turpmāk izlaiž nodarbības ar tukšiem nosaukumiem vai īsajiem kodiem.",
        "Pārstrādāta EduPage kopīgošanas un lietotnes saišu apstrāde pareizai darbībai.",
        "Veikta apakšējās navigācijas joslas koda formatēšana ar Prettier.",
        "Uzlabots pielāgošanas paneļa priekšmetu krāsu rindas vizuālais noformējums.",
      ],
      en: [
        'Added a customization sheet with bounded appearance settings (corner-radius slider, subject colour picker) and a "Reset to defaults" option.',
        "Added an in-app changelog that shows users what changed after an update.",
        "Improved push notifications with tap-to-navigate handling, a custom notification icon, and plugin scheduling configuration.",
        "Improved the share sheet by adding language selection when sharing a timetable, plus sync options.",
        'Fixed an issue where the text fragment "tic" leaked into the class picker.',
        "Fixed a scroll bug so the last timetable card is now reachable above the floating navigation bar.",
        "Updated `useClasses` to skip classes with empty names or short codes.",
        "Refactored EduPage share and app-link handling for correctness.",
        "Applied a Prettier formatting pass to the BottomNav component.",
        "Polished the visual style of the subject-colour row in the customization sheet.",
      ],
      ru: [
        'Добавлена панель настройки с ограниченными параметрами внешнего вида (ползунок радиуса скругления углов, выбор цвета предмета) и кнопкой "Сбросить по умолчанию".',
        "Добавлен журнал изменений внутри приложения, который показывает список нововведений после обновления.",
        "Улучшены push-уведомления: добавлена обработка перехода по нажатию, кастомная иконка и конфигурация планирования через плагин.",
        "Улучшено меню шеринга: добавлена возможность выбора языка и параметры синхронизации при отправке расписания.",
        'Исправлена ошибка, из-за которой отрывок текста "tic" попадал в окно выбора занятий.',
        "Последняя карточка расписания теперь доступна для прокрутки и не перекрывается плавающей панелью навигации.",
        "Функция `useClasses` теперь пропускает занятия с пустыми названиями или короткими кодами.",
        "Переработана обработка EduPage-ссылок и шеринга для корректной работы.",
        "Выполнено форматирование кода нижней панели навигации с помощью Prettier.",
        "Обновлен визуальный стиль строки выбора цвета предмета в панели настройки.",
      ],
      ua: [
        'Додано панель налаштувань із обмеженими параметрами зовнішнього вигляду (повзунок радіуса заокруглення кутів, вибір кольору предмета) та кнопкою "Скинути до початкових".',
        "Додано журнал змін у додатку, який показує користувачам список нововведень після оновлення.",
        "Покращено push-сповіщення: додано обробку переходу за натисканням, власну іконку та конфігурацію планування через плагін.",
        "Покращено меню поширення: додано вибір мови та параметри синхронізації під час надсилання розкладу.",
        'Виправлено помилку, через яку фрагмент тексту "tic" потрапляв у вікно вибору занять.',
        "Останню картку розкладу тепер можна прокрутити, і вона більше не перекривається плаваючою панеллю навігації.",
        "Функція `useClasses` відтепер пропускає заняття з порожніми назвами або короткими кодами.",
        "Перероблено обробку посилань та поширення EduPage для коректної роботи.",
        "Проведено форматування коду нижньої панелі навігації за допомогою Prettier.",
        "Оновлено візуальний стиль рядка вибору кольору предмета в панелі налаштувань.",
      ],
    },
  },
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
