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
    version: "v2.0.0",
    date: "2026-09-30",
    lines: {
      lv: [
        "Jauns skolotāja režīms: iespēja izvēlēties savu vārdu no pedagogu saraksta un skatīt nodarbību grafiku bez pieteikšanās.",
        "Aizvietošanas stundas tagad tiek īpaši izceltas un skaidri atzīmētas dienas un nedēļas skatos.",
        "Izmaiņu cilnē pievienots paziņojumu bloks ar skolotājiem, kuri šodien nepiedalās.",
        "Atbalsts klases audzinātājiem ar ērtu pārslēgšanos starp personīgajām stundām un savas klases grafiku.",
        "Mērķtiecīgi paziņojumi skolotājiem par piešķirtajām aizvietošanas stundām un saraksta izmaiņām.",
      ],
      en: [
        "Brand new Teacher Mode: select your name from the staff directory and view your teaching schedule with zero login.",
        "Cover duties (substitutions) are prominently highlighted and badged across Day and Week views.",
        "Added an absent colleagues banner in the Changes tab showing staff absent today.",
        "Dual-role support for form teachers with seamless switching between your lessons and your class schedule.",
        "Targeted notifications for educators about assigned cover duties and timetable changes.",
      ],
      ru: [
        "Новый режим преподавателя: выбор имени из списка преподавателей и просмотр своего расписания без входа.",
        "Замещения уроков теперь наглядно выделяются специальными значками в расписании дня и недели.",
        "Во вкладку «Замены» добавлен баннер с коллегами, которые сегодня отсутствуют.",
        "Поддержка классных руководителей с быстрым переключением между своими уроками и расписанием класса.",
        "Целевые уведомления для учителей о назначенных заменах и личных изменениях в расписании.",
      ],
      ua: [
        "Новий режим викладача: вибір імені зі списку вчителів та перегляд власного розкладу занять без входу.",
        "Заміщення уроків відтепер чітко виділяються спеціальними позначками у розкладі дня й тижня.",
        "У вкладку «Зміни» додано блок зі списком колег, які сьогодні відсутні.",
        "Підтримка класних керівників зі швидким перемиканням між власними уроками та розкладом класу.",
        "Персоналізовані сповіщення для вчителів про призначені заміни та зміни у розкладі.",
      ],
    },
  },
  {
    version: "v1.3-elna",
    date: "2026-09-30",
    lines: {
      lv: [
        "Pievienota poga tiešai pārejai uz oficiālo RVT EduPage izmaiņu lapu izmaiņu cilnē.",
        "Skolas paziņojumi tagad tiek sasaistīti un parādīti tieši pie attiecīgajām stundu kartītēm.",
        "Uzlabota grupas izmaiņu atpazīšana, precīzi parādot skolotāju prombūtni un neformatētos paziņojumus.",
        "Precizēts kopējais stundu skaits un pareizs nodarbību beigu laiks nedēļas pārskatā apvienotajām stundām.",
        "Sinhronizēta dienas un nedēļas skatu navigācija un novērsta navigācijas joslas nobīde iOS Safari.",
      ],
      en: [
        "Added a direct link button in the Changes tab to open RVT's official EduPage substitutions page.",
        "School announcements are now linked and shown directly on relevant lesson cards.",
        "Improved class substitutions matching, accurately showing absent teachers and unformatted notes.",
        "Accurate lesson counts and correct ending times in Week view for multi-period and subgroup lessons.",
        "Synchronized Day and Week view navigation and fixed bottom navigation bar behavior on iOS Safari.",
      ],
      ru: [
        "Добавлена кнопка быстрого перехода на официальную страницу замен RVT EduPage во вкладке «Замены».",
        "Школьные объявления теперь привязываются и отображаются прямо на карточках соответствующих уроков.",
        "Улучшено распознавание замен группы, включая отсутствие преподавателей и неразобранные объявления.",
        "Точный подсчет уроков и корректное время окончания в расписании недели для спаренных занятий и подгрупп.",
        "Синхронизирована навигация между днем и неделей и исправлено поведение нижней панели в iOS Safari.",
      ],
      ua: [
        "Додано кнопку швидкого переходу на офіційну сторінку замін RVT EduPage у вкладці «Зміни».",
        "Шкільні оголошення відтепер прив'язуються та відображаються безпосередньо на картках відповідних уроків.",
        "Покращено розпізнавання замін для групи, враховуючи відсутність викладачів та нерозібрані оголошення.",
        "Точний підрахунок уроків і правильний час завершення в розкладі тижня для спарених занять та підгруп.",
        "Синхронізовано навігацію між днем і тижнем та виправлено поведінку нижньої панелі в iOS Safari.",
      ],
    },
  },
  {
    version: "v1.2.5-artemis",
    date: "2026-09-20",
    lines: {
      lv: [
        "Jauna saraksta izmaiņu cilne (Izmaiņas) ar visām skolas un grupas izmaiņām, atceltajām stundām un telpu maiņām.",
        "Iespēja pievienot ekrānuzņēmumus atsauksmju un kļūdu ziņošanas formā.",
        'Pievienotas dienu pārslēgšanas bultiņas un nosaukumi "Vakar" / "Rīt" dienas skata galvenē.',
        'Ieviests pilns Android fiziskās un žestu pogas "Atpakaļ" atbalsts logu aizvēršanai un navigācijai.',
        "Pievienota datu atiestatīšana iestatījumos, uzlabota PWA bezsaistes darbība un atjauninātas iOS ikonas.",
      ],
      en: [
        "Dedicated Changes tab listing all school-wide substitutions, cancellations, and room relocations.",
        "Added screenshot attachments to the in-app feedback and bug report form.",
        'Added quick day navigation arrows and "Yesterday" / "Tomorrow" labels to the Day view header.',
        "Full Android hardware and gesture Back button navigation support for closing sheets and dialogs.",
        "Added data reset in Settings, improved PWA offline navigation, and fixed crisp home-screen icons on iOS.",
      ],
      ru: [
        "Новая вкладка «Замены» со списком всех школьных изменений, отмен занятий и переносов кабинетов.",
        "Добавлена возможность прикреплять скриншоты к форме отправки отзывов и сообщений об ошибках.",
        "Добавлены стрелки быстрого переключения дней и отметки «Вчера» / «Завтра» в заголовке дня.",
        "Полная поддержка аппаратной и жестовой кнопки «Назад» на Android для закрытия панелей и навигации.",
        "Добавлен сброс данных в настройках, улучшена офлайн-работа PWA и исправлены четкие иконки для iOS.",
      ],
      ua: [
        "Нова вкладка «Зміни» зі списком усіх шкільних замін, скасованих занять та переносів кабінетів.",
        "Додано можливість прикріплювати скриншоти до форми відгуків та повідомлень про помилки.",
        "Додано стрілки швидкого перемикання днів і підписи «Вчора» / «Завтра» у заголовку дня.",
        "Повна підтримка апаратної та жестової кнопки «Назад» на Android для закриття панелей і навігації.",
        "Додано скидання даних у налаштуваннях, покращено офлайн-роботу PWA та виправлено чіткі іконки для iOS.",
      ],
    },
  },
  {
    version: "v1.2.0-vaira",
    date: "2026-09-16",
    lines: {
      lv: [
        "Palaista Stundio tīmekļa versija un instalējama PWA lietotne ar bezsaistes atbalstu.",
        "Pievienots iPhone atbalsts ar instalēšanas pamācību un sākuma ekrāna pievienošanas paziņojumu.",
        "Ieviesta Web Push paziņojumu sistēma stundu saraksta izmaiņām Safari (iOS 16.4+) un pārlūkiem.",
        "Pievienoti lietotnē iebūvēti atjauninājumu paziņojumi un viena pieskāriena APK instalēšana Android lietotnē.",
        "Skolas paziņojumi tagad tiek viedi filtrēti pēc izvēlētās grupas un skolotāju vārdiem.",
        "Pievienoti ātrie iestatījumi dienas un nedēļas skatos (stundu apvienošana un laika rādīšana).",
        "Atjauninātas tīmekļa un PWA sākuma ekrāna ikonas ar caurspīdīgu fonu.",
      ],
      en: [
        "Launched Stundio on the web and as an installable Progressive Web App (PWA) with offline support.",
        "Added iPhone support with home screen installation prompts and step-by-step tutorial card.",
        "Added Web Push notifications for timetable changes on iOS Safari (16.4+) and modern desktop/web browsers.",
        "Added in-app update notifications and one-tap APK installation on Android.",
        "Smart filtering for school announcements by your selected group and teacher names.",
        "Added quick view settings directly in Day and Week views (toggle lesson merging and times).",
        "Updated website and PWA home-screen app icons with clean transparent backgrounds.",
      ],
      ru: [
        "Запущена веб-версия Stundio и устанавливаемое PWA-приложение с поддержкой работы офлайн.",
        "Добавлена поддержка iPhone с подсказками по установке на экран «Домой» и карточкой-инструкцией.",
        "Добавлены Web Push уведомления об изменениях в расписании для Safari (iOS 16.4+) и браузеров.",
        "Добавлены уведомления об обновлениях внутри приложения и быстрая установка APK на Android.",
        "Умная фильтрация школьных объявлений по выбранной группе и именам преподавателей.",
        "Добавлены быстрые переключатели объединения уроков и времени прямо в расписании дня и недели.",
        "Обновлены иконки для сайта и PWA с чистым прозрачным фоном.",
      ],
      ua: [
        "Запущено вебверсію Stundio та встановлюваний PWA-додаток із підтримкою роботи офлайн.",
        "Додано підтримку iPhone із підказками щодо додавання на початковий екран та карткою-інструкцією.",
        "Додано Web Push сповіщення про зміни в розкладі для Safari (iOS 16.4+) та браузерів.",
        "Додано сповіщення про оновлення всередині додатка та швидке встановлення APK на Android.",
        "Розумна фільтрація шкільних оголошень за вибраною групою та іменами викладачів.",
        "Додано швидкі перемикачі об'єднання уроків і показу часу безпосередньо у переглядах дня та тижня.",
        "Оновлено іконки для сайту та PWA із прозорим фоном.",
      ],
    },
  },
  {
    version: "v1.1.11-lacplesis",
    date: "2026-09-14",
    lines: {
      lv: [
        "Pievienota lietotnē iebūvēta atsauksmju un ieteikumu iesniegšanas forma.",
        "Pievienots interaktīvs krāsu aplis (Color Wheel) priekšmetu toņu brīvai pielāgošanai.",
        "Izveidota īpaša melnbalta zīmola identitāte tumšajam motīvam.",
        "Pievienoti 3 Android sākuma ekrāna logrīki: Nākamā stunda (2×1), Laika atskaite un Dienas saraksts (4×2).",
        "Pievienota fona sinhronizācija, izmantojot Android WorkManager.",
        "Nedēļas skatā apvienotajām stundām ieviesta šūnu apvienošana (cell spanning).",
        "Veikti veiktspējas uzlabojumi un animāciju optimizācija dienas skatā.",
      ],
      en: [
        "Added an in-app feedback and feature suggestion submission sheet.",
        "Added an interactive Color Wheel for custom subject tone customization.",
        "Introduced a dedicated black-and-white brand identity for dark mode.",
        "Added 3 native Android home-screen widgets: Next Lesson (2×1), Countdown, and All-Day Schedule (4×2).",
        "Added background refresh via Android WorkManager.",
        "Added structural cell spanning for multi-period combined lessons in Week view.",
        "Day view performance and swipe animation optimizations.",
      ],
      ru: [
        "Добавлена встроенная форма отправки отзывов и предложений.",
        "Добавлен интерактивный цветовой круг (Color Wheel) для настройки оттенков предметов.",
        "Создана контрастная черно-белая айдентика для темной темы.",
        "Добавлены 3 виджета для домашнего экрана Android: Следующий урок (2×1), Обратный отсчет и Расписание на день (4×2).",
        "Добавлено фоновое обновление через Android WorkManager.",
        "В недельном расписании спаренные уроки теперь визуально объединяются в одну ячейку.",
        "Оптимизирована производительность и анимация свайпа в дневном просмотре.",
      ],
      ua: [
        "Додано вбудовану форму надсилання відгуків та пропозицій у додатку.",
        "Додано інтерактивне колірне коло (Color Wheel) для налаштування кольорів предметів.",
        "Створено контрастну чорно-білу айдентику для темної теми.",
        "Додано 3 віджети для головного екрана Android: Наступний урок (2×1), Зворотний відлік та Розклад на день (4×2).",
        "Додано фонове оновлення через Android WorkManager.",
        "У тижневому перегляді спарені уроки тепер візуально об'єднуються у спільну комірку.",
        "Оптимізовано продуктивність та анімацію свайпу в перегляді дня.",
      ],
    },
  },
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
