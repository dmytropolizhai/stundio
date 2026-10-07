# 02b. Копи лендинга (LV, RU, EN, UA)

Подзадача 2.2. Дата: 2026-10-06. Вход: `02a-ia.md` (структура, CTA), `01c-claims-and-voice.md` (claims, дисклеймеры, словарь), `01a`, `01b`, `01-audience.md`, `02c-assets.md`, `src/ui/i18n/*.ts` (только чтение).

## 0. Как пользоваться

- Ключи (`hero.title`, `install.android.step1`) можно класть в словарь страницы как есть. Структура: `<секция>.<элемент>`.
- Источник — LV; RU, EN и UA сделаны от него. UA и RU нужна проверка носителем (01c §3, риск «UA/RU чувствительная пара»).
- Тон: «ты» / «tu» / «ти» / «you». Короткие глаголы, без восклицаний, без эмодзи, без символов-иконок (стрелок, галочек, звёзд). В тексте нет `→`, `✓`, `★`.
- RVT названо ровно в двух местах: `hero.source` и дисклеймер `footer.disclaimer` (плюс `footer.source`). Больше нигде, включая мета. EduPage — нейтральный источник (`hero.source`, `footer.source`, `faq.data`).
- Плейсхолдеры в фигурных скобках не используются. Ссылки и адреса вынесены в раздел 12 (не переводятся).
- Кавычки: «…» во всех языках, как в приложении. Вложенные в RU — „…“.
- Названия пунктов системных меню взяты из `iphoneInstall.*` приложения: LV «Pievienot sākuma ekrānam», RU «На экран „Домой“», EN «Add to Home Screen», UA «На початковий екран». На iPhone с другим языком системы пункт называется иначе, это отражено в `install.ios.note`.
- Картинки: копи ссылается только на реальный ассет `week-view.png` (alt-ключ `hero.image.alt`, используется только если 3.x ставит скриншот). На виджеты, замену, Teacher Mode, шаринг недели, диалоги Android и меню Safari копи **не ссылается**: ассетов нет (02c). Подписей типа «на скриншоте» в тексте нет.
- «Длины»: заголовки ≤ 6 слов; подзаголовки ≤ 2 строки на 360 px (≈ 38 знаков на строку, ≤ ~75 знаков в LV/RU). Проверять на LV и RU.

---

## 1. Мета (`meta`)

Без RVT и без слова «официальное» (вопрос 1 в разделе «Вопросы и сомнения»).

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `meta.title` | Stundio — stundu saraksts bez interneta | Stundio — расписание без сети и логина | Stundio — timetable without login or signal | Stundio — розклад без мережі та логіну |
| `meta.description` | Neoficiāla stundu saraksta lietotne: stunda, kabinets un izmaiņas uz ekrāna arī bez interneta. Bez pieteikšanās. Android, iPhone, pārlūks. | Неофициальное приложение с расписанием: урок, кабинет и замены на экране, даже без сети. Без логина. Android, iPhone, браузер. | Unofficial timetable app: lesson, room and changes on screen, even offline. No login. Android, iPhone, browser. | Неофіційний застосунок із розкладом: урок, кабінет і заміни на екрані, навіть без мережі. Без логіну. Android, iPhone, браузер. |
| `meta.og.title` | Stundio — stundu saraksts un izmaiņas | Stundio — расписание и замены | Stundio — timetable and changes | Stundio — розклад і заміни |
| `meta.og.description` | Kas ir tagad un kas tālāk. Arī bez interneta, bez pieteikšanās. Neoficiāls projekts. | Что сейчас и что дальше. Даже без сети, без логина. Неофициальный проект. | What is on now and what is next. Even offline, no login. Unofficial project. | Що зараз і що далі. Навіть без мережі, без логіну. Неофіційний проєкт. |
| `meta.og.siteName` | Stundio | Stundio | Stundio | Stundio |
| `meta.og.imageAlt` | (нет картинки, см. вопрос 6) | (нет картинки) | (нет картинки) | (нет картинки) |

Заметка: `github-banner-1200x400.png` для OG не годится (имена преподавателей, 02a §0). Пока нет безымянной картинки, `og:image` не задаём; `meta.og.imageAlt` не заполнять.

---

## 2. Шапка и служебное (`header`, `a11y`)

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `header.logoLabel` | Stundio, uz sākumu | Stundio, наверх | Stundio, back to top | Stundio, угору |
| `header.langLabel` | Valoda | Язык | Language | Мова |
| `header.lang.lv` | LV | LV | LV | LV |
| `header.lang.ru` | RU | RU | RU | RU |
| `header.lang.en` | EN | EN | EN | EN |
| `header.lang.ua` | UA | UA | UA | UA |
| `a11y.skip` | Uz saturu | К содержимому | Skip to content | До вмісту |

Полные имена языков (одинаковы во всех версиях, в футере и как доступное имя ссылок шапки): Latviešu, Русский, English, Українська. Не «Солов'їна» (баг приложения, 01c D11).

---

## 3. Hero (`hero`, якорь `#top`)

Ключевое сообщение 1. RVT — только в `hero.source`.

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `hero.title` | Stundu saraksts: tagad un tālāk | Расписание: сейчас и дальше | Timetable: now and next | Розклад: зараз і далі |
| `hero.subtitle` | Stunda, kabinets un ēka uz ekrāna, arī bez interneta. Bez pieteikšanās. | Урок, кабинет и корпус на экране, даже без сети. Без логина. | Lesson, room and building on screen, even offline. No login. | Урок, кабінет і корпус на екрані, навіть без мережі. Без логіну. |
| `hero.source` | Tavas grupas saraksts no publiskā RVT saraksta (EduPage). Neoficiāli. | Расписание твоей группы из публичного расписания RVT (EduPage). Неофициально. | Your group's timetable from the public RVT timetable (EduPage). Unofficial. | Розклад твоєї групи з публічного розкладу RVT (EduPage). Неофіційно. |
| `hero.trust` | Stundio jau lieto 200+ cilvēku, tostarp skolotāji. | Им уже пользуются 200+ человек, включая учителей. | 200+ people already use it, teachers included. | Ним уже користуються 200+ людей, зокрема вчителі. |
| `hero.young` | Lietotne vēl jauna, iespējamas nepilnības. | Приложение ещё молодое, возможны шероховатости. | The app is still young. There may be rough edges. | Застосунок ще молодий, можливі шорсткості. |
| `hero.image.alt` | Stundio nedēļas skats: stundu saraksts pa dienām | Недельный вид в Stundio: расписание по дням | Stundio week view: the timetable by day | Тижневий вигляд у Stundio: розклад по днях |

`hero.young` показывается рядом с CTA как короткая строка, не как извинение (01c дисклеймер 5). `hero.trust` — дословная формула из 01c#20 (без округления, без «более», без слова «ученики»); LV/UA: «cilvēku» / «людей» вместо «учеников», как в README.

### 3.1 Кнопки и микротекст по платформам (`hero.cta`)

Матрица 02a §2.2. Основная кнопка одна; остальное — текстовые ссылки.

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `hero.cta.android` | Lejupielādēt APK | Скачать APK | Download APK | Завантажити APK |
| `hero.cta.android.micro` | Nav Google Play. Android brīdinās par avotu, un tas ir normāli. | Нет в Google Play. Android предупредит про источник, это нормально. | Not on Google Play. Android will warn about the source. That is normal. | Немає в Google Play. Android попередить про джерело, це нормально. |
| `hero.cta.android.how` | Kā uzstādīt, 4 soļi | Как установить, 4 шага | How to install, 4 steps | Як встановити, 4 кроки |
| `hero.cta.android.web` | Vispirms izmēģināt pārlūkā | Сначала попробовать в браузере | Try it in the browser first | Спершу спробувати в браузері |
| `hero.cta.ios` | Atvērt Stundio | Открыть Stundio | Open Stundio | Відкрити Stundio |
| `hero.cta.ios.micro` | Caur Safari, bez App Store. iPhone nav logrīku. | Через Safari, без App Store. Виджетов на iPhone нет. | Through Safari, no App Store. No widgets on iPhone. | Через Safari, без App Store. Віджетів на iPhone немає. |
| `hero.cta.ios.how` | Kā uzstādīt | Как установить | How to install | Як встановити |
| `hero.cta.desktop` | Atvērt pārlūkā | Открыть в браузере | Open in browser | Відкрити в браузері |
| `hero.cta.desktop.micro` | Darbojas pārlūkā. Uz tālruni: noskenē QR kodu. | Работает в браузере. На телефон: наведи камеру на QR-код. | Works in the browser. For your phone, scan the QR code. | Працює в браузері. На телефон: скануй QR-код. |
| `hero.cta.switch.ios` | Man ir iPhone | У меня iPhone | I have an iPhone | У мене iPhone |
| `hero.cta.switch.android` | Man ir Android | У меня Android | I have an Android phone | У мене Android |
| `hero.cta.openWeb` | Atvērt pārlūkā | Открыть в браузере | Open in browser | Відкрити в браузері |

Нейтральное состояние (нет JS, платформа не распознана):

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `hero.cta.neutral.android` | Lejupielādēt Android | Скачать для Android | Download for Android | Завантажити для Android |
| `hero.cta.neutral.ios` | Priekš iPhone | Для iPhone | For iPhone | Для iPhone |

### 3.2 Панель «Что дальше» после клика на APK (`hero.next`)

Только с JS; шаги берутся из `install.android.step*` (без дублирования, 02a §2.3). Здесь только рамка.

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `hero.next.title` | Ko darīt tālāk | Что дальше | What happens next | Що далі |
| `hero.next.fail` | Lejupielāde nesākās? Atver šo lapu tālruņa pārlūkā. | Загрузка не началась? Открой страницу в браузере телефона. | Download did not start? Open this page in your phone's browser. | Завантаження не почалося? Відкрий сторінку в браузері телефона. |

---

## 4. «Сейчас» (`now`, якорь `#now`)

Сообщение 1 целиком + два корпуса (01c#25) + виджеты (01c#2, #3, #4). Ассетов виджетов нет: секция текстовая. Виджеты описаны функцией; размеры 2x1 и 4x2 текстом.

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `now.title` | Stunda, kabinets, ēka | Урок, кабинет, корпус | Lesson, room, building | Урок, кабінет, корпус |
| `now.lead` | Atver lietotni un uzreiz redzi pašreizējo vai nākamo stundu. | Открой приложение и сразу видишь идущий или следующий урок. | Open the app and see the current or next lesson right away. | Відкрий застосунок і одразу бачиш поточний або наступний урок. |
| `now.fact1` | Katrai stundai ir kabinets un ēka: Galvenā ēka vai TIC. | У каждого урока есть кабинет и корпус: Galvenā ēka или TIC. | Every lesson shows its room and building: Galvenā ēka or TIC. | У кожного уроку є кабінет і корпус: Galvenā ēka або TIC. |
| `now.fact2` | Pašreizējai stundai ir progresa josla: redzi, cik palicis. | У идущего урока есть полоса прогресса: видно, сколько осталось. | The current lesson has a progress bar, so you see how long is left. | У поточного уроку є смуга прогресу: видно, скільки лишилось. |
| `now.fact3` | Brīvstundas redzamas kā atstarpes dienā. | Свободные уроки видны как промежутки в дне. | Free periods show as gaps in the day. | Вільні уроки видно як проміжки в дні. |
| `now.widgets.title` | Android: logrīki | На Android: виджеты | On Android: widgets | На Android: віджети |
| `now.widgets.next.name` | Nākamā stunda, 2x1 | Следующий урок, 2x1 | Next lesson, 2x1 | Наступний урок, 2x1 |
| `now.widgets.next.body` | Pašreizējā vai tuvākā stunda ar kabinetu, skolotāju un laiku. | Идущий или ближайший урок: кабинет, преподаватель, время. | The current or upcoming lesson with room, teacher and times. | Поточний або найближчий урок: кабінет, викладач, час. |
| `now.widgets.countdown.name` | Atpakaļskaitīšana | Отсчёт | Countdown | Відлік |
| `now.widgets.countdown.body` | Cik laika palicis līdz zvanam, ar progresa joslu. | Сколько осталось до звонка, с полосой прогресса. | Time left until the next bell, with a progress bar. | Скільки лишилось до дзвінка, зі смугою прогресу. |
| `now.widgets.allday.name` | Visa diena, 4x2 | Весь день, 4x2 | Whole day, 4x2 | Увесь день, 4x2 |
| `now.widgets.allday.body` | Šodienas stundu saraksts ar kabinetiem. | Список уроков на сегодня с кабинетами. | Today's lessons with rooms, as a list. | Список уроків на сьогодні з кабінетами. |
| `now.widgets.note` | Logrīki atjaunojas dienas gaitā. Tikai Android: iPhone un datorā to nav. | Виджеты обновляются по ходу дня. Только на Android: на iPhone и компьютере их нет. | Widgets update through the day. Android only: there are none on iPhone or computer. | Віджети оновлюються протягом дня. Лише на Android: на iPhone і комп'ютері їх немає. |
| `now.link` | Uzstādīt | Установить | Install | Встановити |

Заметки: «Next lesson», «Countdown», «All-Day» не переводились как имена продукта, а описаны функцией (01c §4.2). Слово «teacher» в виджете — из README. `now.widgets.note` видна всем, не только Android (02a).

---

## 5. Замены (`changes`, якорь `#changes`)

Сообщение 2 + честная оговорка про уведомления (01c#13, #14, D9). Без скриншота; без сравнения с EduPage и без слова «лучше».

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `changes.title` | Izmaiņas stundas vietā | Замены на месте урока | Changes in the lesson's place | Заміни на місці уроку |
| `changes.lead` | Nav atsevišķa saraksta, kur jāmeklē. Izmaiņa ir pie stundas. | Не нужно искать в отдельном списке. Замена видна у самого урока. | No separate list to dig through. The change sits on the lesson. | Не треба шукати в окремому списку. Заміна видна біля самого уроку. |
| `changes.fact1` | Atcelta stunda paliek savā vietā, pārsvītrota. | Отменённый урок остаётся на своём месте, зачёркнутый. | A cancelled lesson stays in its place, struck through. | Скасований урок лишається на своєму місці, закреслений. |
| `changes.fact2` | Cits kabinets vai cits skolotājs redzams uz pašas stundas. | Другой кабинет или другой преподаватель видны на самом уроке. | A different room or teacher shows on the lesson itself. | Інший кабінет або інший викладач видно на самому уроці. |
| `changes.fact3` | Skolas teksts parādās burtiski, ar atzīmi «No skolas». | Текст школы показан дословно, с пометкой «От школы». | The school's text is shown word for word, marked «From school». | Текст школи показано дослівно, з позначкою «Від школи». |
| `changes.notify` | Paziņojumi par izmaiņām. Android: kad lietotne fonā atjauno datus, ne uzreiz. iPhone: tikai pēc pievienošanas sākuma ekrānam. | Уведомления об изменениях. Android: когда приложение обновляет данные в фоне, не мгновенно. iPhone: только после добавления на экран «Домой». | Change notifications. Android: when the app refreshes in the background, not instantly. iPhone: only after adding it to the Home Screen. | Сповіщення про зміни. Android: коли застосунок оновлює дані у фоні, не миттєво. iPhone: лише після додавання на початковий екран. |
| `changes.caveat` | Stundio rāda to, ko skola ir publicējusi. | Stundio показывает то, что опубликовала школа. | Stundio shows what the school has published. | Stundio показує те, що опублікувала школа. |

---

## 6. Без сети и без логина (`offline`, якорь `#offline`)

Сообщение 3 + оговорка про первую загрузку (01c#1) + приватность формулой README (01c#15, #16, D7). Без иллюстраций.

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `offline.title` | Bez interneta, bez konta | Без сети и без логина | No signal, no login | Без мережі та без логіну |
| `offline.net.title` | Darbojas bez interneta | Работает без сети | Works offline | Працює без мережі |
| `offline.net.body` | Saraksts glabājas tavā tālrunī un atveras bez interneta. Pirmajai ielādei un jaunām izmaiņām tīkls ir vajadzīgs. | Расписание хранится на телефоне и открывается без интернета. Для первой загрузки и свежих замен нужна сеть. | The timetable is stored on your phone and opens without internet. The first load and fresh changes need a connection. | Розклад зберігається на телефоні й відкривається без інтернету. Для першого завантаження та свіжих замін потрібна мережа. |
| `offline.account.title` | Bez konta | Без аккаунта | No account | Без акаунта |
| `offline.account.body` | Izvēlies grupu, un viss. Nav kontu un profilu, iestatījumi ir tālrunī. | Выбери группу, и всё. Нет аккаунтов и профилей, настройки лежат на телефоне. | Pick your group and that is it. No accounts or profiles; settings stay on your phone. | Обери групу, і все. Немає акаунтів і профілів, налаштування лежать на телефоні. |
| `offline.stats` | Anonīmā ekrānu statistika (bez sīkdatnēm) izslēdzama iestatījumos. | Анонимную статистику экранов (без cookies) можно отключить в настройках. | Anonymous screen statistics (no cookies) can be turned off in settings. | Анонімну статистику екранів (без cookies) можна вимкнути в налаштуваннях. |
| `offline.link` | Sīkāk par privātumu | Подробнее о приватности | More on privacy | Докладніше про приватність |

`offline.link` ведёт на `#privacy`.

---

## 7. Установка (`install`, якорь `#install`)

Три вкладки. Без JS все три идут подряд (Android первым). Порядок внутри Android — по 02a §1.5.

### 7.1 Общие

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `install.title` | Kā uzstādīt | Как установить | How to install | Як встановити |
| `install.tablist` | Ierīce | Устройство | Device | Пристрій |
| `install.tab.android` | Android | Android | Android | Android |
| `install.tab.ios` | iPhone | iPhone | iPhone | iPhone |
| `install.tab.desktop` | Dators | Компьютер | Computer | Комп'ютер |

### 7.2 Android (`install.android`, якорь `#install-android`)

Дисклеймер 3 (01c) идёт **до** кнопки, не мелким шрифтом (`install.android.warn`). Слов «скоро» и «в магазине» нет.

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `install.android.title` | Android: lejupielādē APK | Android: скачай APK | Android: download the APK | Android: завантаж APK |
| `install.android.why` | Stundio ir neoficiāls, nekomerciāls projekts. Google Play to neizdos: neoficiālai lietotnei tas ir juridisks risks. | Stundio — неофициальный некоммерческий проект. В Google Play его не будет: для неофициального приложения это юридический риск. | Stundio is an unofficial, non-commercial project. It will not be on Google Play: for an unofficial app that is a legal risk. | Stundio — неофіційний некомерційний проєкт. У Google Play його не буде: для неофіційного застосунку це юридичний ризик. |
| `install.android.warn` | Lietotnes nav Google Play. APK tiek lejupielādēts no GitHub Releases, un Android brīdinās, ka avots nav zināms. Tas ir paredzēts. Uzstādi tikai failu no stundio.pages.dev/download vai no repozitorija Releases lapas. | Приложения нет в Google Play. APK скачивается с GitHub Releases, и Android предупредит, что источник неизвестен. Это ожидаемо. Устанавливай только файл со stundio.pages.dev/download или со страницы Releases репозитория. | The app is not on Google Play. The APK is downloaded from GitHub Releases, and Android will warn that the source is unknown. That is expected. Install only the file from stundio.pages.dev/download or from the repository's Releases page. | Застосунку немає в Google Play. APK завантажується з GitHub Releases, і Android попередить, що джерело невідоме. Це очікувано. Встановлюй лише файл зі stundio.pages.dev/download або зі сторінки Releases репозиторію. |
| `install.android.cta` | Lejupielādēt APK | Скачать APK | Download APK | Завантажити APK |
| `install.android.fallback` | Nelejupielādējas? Atver šo lapu tālruņa pārlūkā. | Не скачивается? Открой эту страницу в браузере телефона. | Not downloading? Open this page in your phone's browser. | Не завантажується? Відкрий цю сторінку в браузері телефона. |
| `install.android.copy` | Kopēt adresi | Скопировать адрес | Copy address | Скопіювати адресу |
| `install.android.copied` | Adrese nokopēta | Адрес скопирован | Address copied | Адресу скопійовано |
| `install.android.step1` | Nospied «Lejupielādēt APK» un gaidi, kamēr fails ielādējas. | Нажми «Скачать APK» и дождись загрузки файла. | Tap «Download APK» and wait for the file to finish. | Натисни «Завантажити APK» і дочекайся завантаження файлу. |
| `install.android.step2` | Atver lejupielādēto failu no paziņojuma vai mapes «Lejupielādes». | Открой скачанный файл из уведомления или из «Загрузок». | Open the downloaded file from the notification or from Downloads. | Відкрий завантажений файл зі сповіщення або з «Завантажень». |
| `install.android.step3` | Android brīdinās par nezināmu avotu. Tas ir normāli. | Android предупредит про неизвестный источник. Это нормально. | Android will warn about an unknown source. That is normal. | Android попередить про невідоме джерело. Це нормально. |
| `install.android.step4` | Atļauj uzstādīšanu lietotnei, ar kuru atvēri failu. | Разреши установку для приложения, через которое открыл файл. | Allow installs from the app you used to open the file. | Дозволь встановлення для застосунку, через який відкрив файл. |
| `install.android.update` | Vēlāk lietotne pati atrod jaunu versiju un piedāvā to uzstādīt. | Дальше приложение само находит новую версию и предлагает её установить. | After that, the app finds new versions itself and offers to install them. | Далі застосунок сам знаходить нову версію і пропонує її встановити. |
| `install.android.source` | Atvērtais kods (MIT) | Открытый код (MIT) | Open source (MIT) | Відкритий код (MIT) |
| `install.android.releases` | Visas versijas | Все версии | All versions | Усі версії |
| `install.android.young` | Lietotne vēl jauna, iespējamas nepilnības. | Приложение ещё молодое, возможны шероховатости. | The app is still young. There may be rough edges. | Застосунок ще молодий, можливі шорсткості. |
| `install.android.web` | Vispirms izmēģināt pārlūkā | Сначала попробовать в браузере | Try it in the browser first | Спершу спробувати в браузері |

Шаги 1–4 = README «Option A». Шаг про предупреждение не содержит скриншота и не описывает конкретный диалог (у производителей он разный, 02a). `install.android.update`: «находит и предлагает», не «автоматически» (01c#17); работает только в APK, поэтому в iOS-блоке этой строки нет.

### 7.3 iPhone (`install.ios`, якорь `#install-ios`)

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `install.ios.title` | iPhone: pievieno sākuma ekrānam | iPhone: добавь на экран «Домой» | iPhone: add it to the Home Screen | iPhone: додай на початковий екран |
| `install.ios.lead` | Nav App Store, uzstādīšana caur Safari. | Нет в App Store, установка через Safari. | Not on the App Store; you install it through Safari. | Немає в App Store, встановлення через Safari. |
| `install.ios.safari` | Soļi darbojas Safari. | Шаги работают в Safari. | These steps work in Safari. | Кроки працюють у Safari. |
| `install.ios.cta` | Atvērt Stundio | Открыть Stundio | Open Stundio | Відкрити Stundio |
| `install.ios.step1` | Atver Stundio pārlūkā Safari. | Открой Stundio в Safari. | Open Stundio in Safari. | Відкрий Stundio в Safari. |
| `install.ios.step2` | Nospied pogu «Kopīgot». | Нажми кнопку «Поделиться». | Tap the Share button. | Натисни кнопку «Поділитися». |
| `install.ios.step3` | Izvēlnē izvēlies «Pievienot sākuma ekrānam». | В меню выбери «На экран „Домой“». | In the menu, choose «Add to Home Screen». | У меню вибери «На початковий екран». |
| `install.ios.step4` | Atver Stundio no sākuma ekrāna. | Открывай Stundio с экрана «Домой». | Open Stundio from your Home Screen. | Відкривай Stundio з початкового екрана. |
| `install.ios.hint` | Lietotne pati parādīs šos soļus, kad pirmo reizi atvērsi to iPhone. | Приложение само покажет эти шаги, когда ты впервые откроешь его на iPhone. | The app shows these steps itself the first time you open it on an iPhone. | Застосунок сам покаже ці кроки, коли ти вперше відкриєш його на iPhone. |
| `install.ios.widgets` | Logrīku iPhone nav. | Виджетов на iPhone нет. | There are no widgets on iPhone. | Віджетів на iPhone немає. |
| `install.ios.push` | Paziņojumi darbojas tikai pēc pievienošanas sākuma ekrānam. Safari cilnē ar to nepietiek. | Уведомления работают только после добавления на экран «Домой». Вкладки Safari для этого мало. | Notifications work only after you add it to the Home Screen. A Safari tab is not enough. | Сповіщення працюють лише після додавання на початковий екран. Вкладки Safari для цього замало. |
| `install.ios.note` | Ja iPhone valoda ir cita, izvēlnes punkts var saukties citādi. | Если iPhone на другом языке, пункт меню может называться иначе. | If your iPhone uses another language, the menu item may be named differently. | Якщо iPhone іншою мовою, пункт меню може називатися інакше. |

`install.ios.step1` и `install.ios.step2` нарочно короче, чем `iphoneInstall.step1` в приложении (там шаг 1 = «нажми кнопку ниже или Поделиться»): на лендинге кнопки приложения нет. Расхождение лендинга и приложения: «ты» против «Вы» (вопрос 5 из 02a §8).

### 7.4 Компьютер (`install.desktop`, якорь `#install-desktop`)

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `install.desktop.title` | Dators: atver pārlūkā | Компьютер: открой в браузере | Computer: open in the browser | Комп'ютер: відкрий у браузері |
| `install.desktop.lead` | Stundio darbojas pārlūkā, nekas nav jāuzstāda. | Stundio работает в браузере, ничего ставить не нужно. | Stundio runs in the browser, so there is nothing to install. | Stundio працює в браузері, нічого встановлювати не треба. |
| `install.desktop.cta` | Atvērt pārlūkā | Открыть в браузере | Open in browser | Відкрити в браузері |
| `install.desktop.qr` | Lai uzstādītu tālrunī, noskenē QR kodu ar kameru. | Чтобы поставить на телефон, наведи на QR-код камеру. | To install on your phone, point its camera at the QR code. | Щоб встановити на телефон, наведи на QR-код камеру. |
| `install.desktop.qr.alt` | QR kods uz šo lapu | QR-код на эту страницу | QR code for this page | QR-код на цю сторінку |
| `install.desktop.addr` | Vai atver adresi tālrunī: | Или открой адрес на телефоне: | Or open this address on your phone: | Або відкрий адресу на телефоні: |

QR показывается только на desktop (02a). Если адрес лендинга не утверждён, показывается только `install.desktop.addr` с адресом (вопрос 2).

---

## 8. Для преподавателей (`teachers`, якорь `#teachers`)

Teacher Mode (01c#11). Терминология: RU «преподаватель», UA «викладач», LV «skolotājs», EN «teacher» (01c §4.2; вопрос 4). В тексте UI режим называется так же, как кнопка в онбординге.

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `teachers.title` | Arī skolotājiem | И для преподавателей | For teachers too | І для викладачів |
| `teachers.lead` | Lietotnē ir skolotāja režīms. Pieejams tāpat kā skolēniem. | В приложении есть режим для преподавателей. Ставится так же, как для студентов. | The app has a Teacher Mode. You install it the same way as students do. | У застосунку є режим для викладачів. Встановлюється так само, як для студентів. |
| `teachers.item1` | Izvēlies savu vārdu no saraksta. Bez pieteikšanās. | Выбери своё имя из списка. Без логина. | Pick your name from the staff list. No login. | Обери своє ім'я зі списку. Без логіну. |
| `teachers.item2` | Dienā un nedēļā redzi grupu, kabinetu un ēku katrai stundai. | В дне и неделе видишь группу, кабинет и корпус каждого урока. | Day and week show the group, room and building for each lesson. | У дні й тижні бачиш групу, кабінет і корпус кожного уроку. |
| `teachers.item3` | Aizvietošanas stundas ir atzīmētas atsevišķi. | Замены, которые ты ведёшь, отмечены отдельно. | Lessons you cover are marked separately. | Заміни, які ти ведеш, позначено окремо. |
| `teachers.item4` | Izmaiņu sadaļā redzi kolēģus, kuri šodien nepiedalās. | В разделе замен видны коллеги, которых сегодня нет. | The changes tab shows colleagues who are absent today. | У розділі замін видно колег, яких сьогодні немає. |
| `teachers.item5` | Klases audzinātājs var pārslēgties starp savu dienu un savas grupas sarakstu. | Классный руководитель переключается между своим днём и расписанием группы. | A form teacher can switch between their own day and their group's timetable. | Класний керівник перемикається між своїм днем і розкладом групи. |
| `teachers.item6` | Paziņojumi par izmaiņām un aizvietošanām. | Уведомления о заменах и изменениях. | Notifications about changes and cover lessons. | Сповіщення про заміни та зміни. |
| `teachers.note` | Vārda izvēle nav pieteikšanās: sarakstu veido skolas publiskie dati. Neoficiāli. Skolas teksts parādās burtiski. | Выбор имени не вход в систему: список берётся из публичных данных школы. Неофициально. Текст школы показан дословно. | Choosing a name is not signing in: the list comes from the school's public data. Unofficial. The school's text is shown word for word. | Вибір імені не є входом: список береться з публічних даних школи. Неофіційно. Текст школи показано дослівно. |
| `teachers.install` | Uzstādīšana tāda pati. Pirmajā startā izvēlies «Skolotājs». | Установка та же. При первом запуске выбери «Преподаватель». | Install is the same. On first launch choose «Teacher». | Встановлення те саме. Під час першого запуску вибери «Викладач». |
| `teachers.link` | Kā uzstādīt | Как установить | How to install | Як встановити |

Заметки: пункт 3 по README: «cover duties badged»; «которые ты ведёшь» уточняет, что речь о заменах самого преподавателя (в EN «lessons you cover»). Без скриншота (съёмка D не сделана). Нет слов «личный кабинет», «авторизация».

---

## 9. Ещё в приложении (`more`, якорь `#more`)

Строки, не блок. Без картинки (02c B нет).

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `more.title` | Vēl lietotnē | Ещё в приложении | Also in the app | Ще в застосунку |
| `more.share` | Kopīgo nedēļu kā attēlu: tas tiek uzzīmēts tālrunī, beigās ir QR kods, nekas netiek augšupielādēts. | Поделись неделей как картинкой: она рисуется на телефоне, в конце QR-код, ничего не загружается. | Share your week as an image: it is drawn on your phone, ends with a QR code, and nothing is uploaded. | Поділись тижнем як картинкою: вона малюється на телефоні, у кінці QR-код, нічого не завантажується. |
| `more.subgroups` | Pusgrupas: rādi tikai savas grupas stundas (1. grupa, 2. grupa). | Подгруппы: показывай только уроки своей подгруппы (1. grupa, 2. grupa). | Subgroups: show only your own subgroup's lessons (1. grupa, 2. grupa). | Підгрупи: показуй лише уроки своєї підгрупи (1. grupa, 2. grupa). |
| `more.langs` | Četras interfeisa valodas: latviešu, krievu, angļu, ukraiņu. Skolas teksts paliek latviski. | Четыре языка интерфейса: латышский, русский, английский, украинский. Текст школы остаётся на латышском. | Four interface languages: Latvian, Russian, English, Ukrainian. The school's text stays in Latvian. | Чотири мови інтерфейсу: латиська, російська, англійська, українська. Текст школи лишається латиською. |
| `more.themes` | Gaišā, tumšā vai sistēmas tēma. Krāsas var mainīt katram priekšmetam. | Светлая, тёмная или системная тема. Цвет можно задать для каждого предмета. | Light, dark or system theme. You can set a colour for each subject. | Світла, темна або системна тема. Колір можна задати для кожного предмета. |

Отдельно: «избранные группы» из 02a §1.7 не вошли, т. к. в 01c нет инвентарной строки с доказательством (вопрос 8).

---

## 10. FAQ (`faq`, якорь `#faq`)

8 вопросов, `<details>`, ответы ≤ 3 строк. Ключ `faq.<id>.q` и `faq.<id>.a`; `id` = якорь `#faq-<id>`. Возражения из 01a: безопасность APK, почему не в Play Store, приватность, неофициальность, бесплатно ли, откуда данные, что с подменами.

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `faq.title` | Jautājumi | Вопросы | Questions | Питання |
| `faq.official.q` | Vai tā ir skolas oficiālā lietotne? | Это официальное приложение школы? | Is this the school's official app? | Це офіційний застосунок школи? |
| `faq.official.a` | Nē. Stundio ir neoficiāls, nekomerciāls skolēna projekts, tas nav saistīts ar skolu, EduPage un aSc. | Нет. Stundio — неофициальный некоммерческий студенческий проект, не связан со школой, EduPage и aSc. | No. Stundio is an unofficial, non-commercial student project, not affiliated with the school, EduPage or aSc. | Ні. Stundio — неофіційний некомерційний студентський проєкт, не пов'язаний зі школою, EduPage і aSc. |
| `faq.play.q` | Kāpēc nav Google Play? | Почему нет в Google Play? | Why is it not on Google Play? | Чому немає в Google Play? |
| `faq.play.a` | Neoficiālai stundu saraksta lietotnei veikali ir juridisks risks, tāpēc APK iznāk GitHub Releases. Android lejupielādei: skat. «Kā uzstādīt». | Для неофициального приложения расписания магазины — юридический риск, поэтому APK выходят на GitHub Releases. Как поставить на Android: «Как установить». | For an unofficial timetable app, app stores are a legal risk, so APKs are published on GitHub Releases. For Android steps, see «How to install». | Для неофіційного застосунку з розкладом магазини — юридичний ризик, тому APK виходять на GitHub Releases. Як поставити на Android: «Як встановити». |
| `faq.apk.q` | Android raksta «nezināms avots». Vai tas ir droši? | Android пишет «неизвестный источник». Это безопасно? | Android says «unknown source». Is that safe? | Android пише «невідоме джерело». Це безпечно? |
| `faq.apk.a` | Brīdinājums rodas, jo lietotnes nav Google Play. Kods ir atvērts (MIT), faili ir GitHub Releases. Neatkarīga audita nav. Lejupielādē tikai no stundio.pages.dev/download vai Releases lapas. | Предупреждение появляется потому, что приложения нет в Google Play. Код открыт (MIT), файлы лежат на GitHub Releases. Независимого аудита нет. Качай только со stundio.pages.dev/download или со страницы Releases. | The warning appears because the app is not on Google Play. The code is open (MIT) and the files are on GitHub Releases. There has been no independent audit. Download only from stundio.pages.dev/download or the Releases page. | Попередження з'являється, бо застосунку немає в Google Play. Код відкритий (MIT), файли лежать на GitHub Releases. Незалежного аудиту немає. Завантажуй лише зі stundio.pages.dev/download або зі сторінки Releases. |
| `faq.free.q` | Vai tas maksā? | Это бесплатно? | Is it free? | Це безкоштовно? |
| `faq.free.a` | Nē. Tas ir nekomerciāls skolēna projekts, bez maksas un bez reklāmas. | Да, бесплатно. Это некоммерческий студенческий проект, без оплаты и без рекламы. | Yes, it is free. It is a non-commercial student project, with no payments and no ads. | Так, безкоштовно. Це некомерційний студентський проєкт, без оплати та реклами. |
| `faq.privacy.q` | Ko Stundio par mani zina? | Что Stundio обо мне знает? | What does Stundio know about me? | Що Stundio про мене знає? |
| `faq.privacy.a` | Nav kontu un profilu, saraksts un iestatījumi ir tālrunī. Anonīma ekrānu statistika (Plausible, bez sīkdatnēm) izslēdzama. Paziņojumi pārlūkā glabā ierīces abonementu un grupas atzīmi. Atsauksme iet uz ārēju pakalpojumu kopā ar versiju un grupu. | Нет аккаунтов и профилей, расписание и настройки лежат на телефоне. Анонимную статистику экранов (Plausible, без cookies) можно отключить. Уведомления в браузере хранят подписку устройства и метку группы. Отзыв уходит во внешний сервис вместе с версией приложения и группой. | No accounts or profiles; the timetable and settings live on your phone. Anonymous screen statistics (Plausible, no cookies) can be turned off. Browser notifications store the device subscription and a group label. Feedback goes to an outside service with the app version and group. | Немає акаунтів і профілів, розклад і налаштування лежать на телефоні. Анонімну статистику екранів (Plausible, без cookies) можна вимкнути. Сповіщення в браузері зберігають підписку пристрою та мітку групи. Відгук іде до зовнішнього сервісу разом із версією застосунку та групою. |
| `faq.data.q` | No kurienes ņem sarakstu? | Откуда берётся расписание? | Where does the timetable come from? | Звідки береться розклад? |
| `faq.data.a` | No publiskās lapas pikcrvt.edupage.org. Dati pieder skolai. Izmaiņu teksts tiek rādīts, kā to publicējusi skola. | Из публичной страницы pikcrvt.edupage.org. Данные принадлежат школе. Текст замен показан так, как его опубликовала школа. | From the public page pikcrvt.edupage.org. The data belongs to the school. Text of changes is shown as the school published it. | З публічної сторінки pikcrvt.edupage.org. Дані належать школі. Текст замін показано так, як його опублікувала школа. |
| `faq.wrong.q` | Saraksts rāda nepareizi. Ko darīt? | Расписание показало не то. Что делать? | The timetable looks wrong. What now? | Розклад показав не те. Що робити? |
| `faq.wrong.a` | Stundio rāda to, ko skola ir publicējusi, un neapsola precizitāti. Pavelc, lai atjaunotu. Ja kļūda paliek, ziņo lietotnes atsauksmju formā. | Stundio показывает то, что опубликовала школа, и не обещает точности. Потяни экран, чтобы обновить. Если ошибка осталась, сообщи через форму обратной связи в приложении. | Stundio shows what the school published and does not promise accuracy. Pull down to refresh. If the error stays, report it through the feedback form in the app. | Stundio показує те, що опублікувала школа, і не обіцяє точності. Потягни екран, щоб оновити. Якщо помилка лишилась, повідом через форму зворотного зв'язку в застосунку. |
| `faq.updates.q` | Kā atjaunināt lietotni? | Как обновлять приложение? | How do I update the app? | Як оновлювати застосунок? |
| `faq.updates.a` | Android: lietotne pati atrod jaunu versiju un piedāvā to uzstādīt. iPhone un pārlūks: atver kā parasti. | Android: приложение само находит новую версию и предлагает установить. iPhone и браузер: просто открывай как обычно. | Android: the app finds a new version itself and offers to install it. iPhone and browser: just open it as usual. | Android: застосунок сам знаходить нову версію і пропонує встановити. iPhone і браузер: просто відкривай як зазвичай. |

Заметки по FAQ:
- `faq.free.a` LV: первая фраза «Nē» отвечает на «Vai tas maksā?» (Это стоит денег?) — «Нет». RU/EN/UA формулируют вопрос как «бесплатно?», ответ «Да». Если нужна единая форма, LV переписать «Vai tas ir bez maksas?» / «Jā».
- `faq.official.a`: в ответе RVT не названо, «со школой» нейтрально; дословный дисклеймер с RVT стоит в футере.
- `faq.apk.a`: слов «безопасно», «проверено», «сертифицировано» нет (01c §2); честное «независимого аудита нет».
- `faq.privacy.a`: не «ничего не уходит с устройства» (D7), метка группы вместо «ничего, кроме» (D8), внешний сервис для отзывов (D6).
- `faq.wrong.a`: «потяни, чтобы обновить» — pull-to-refresh есть в README (Offline-first). Это не обещание, что ошибка уйдёт.
- Ссылки в ответах 2–4 на `#install-android` ставятся вёрсткой в `faq.play.a`, `faq.apk.a` (текст ссылки = слова «Как установить» / «Kā uzstādīt» из `install.title`).
- «Нет e-klase / оценок» (необязательный вопрос из 02a) не включён: вопрос не относится к возражениям из 01a.
- «Будет ли виджет на iPhone?» не вынесен в FAQ: ответ уже дан трижды (`now.widgets.note`, `install.ios.widgets`, `hero.cta.ios.micro`).

---

## 11. Футер и приватность (`footer`, `privacy`)

Дисклеймеры 1 и 2 — полностью; 4 — в блоке `#privacy`. Дословные адаптации из 01c §2.

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `footer.disclaimer` | Stundio ir neoficiāls, nekomerciāls skolēna projekts. Tas nav saistīts ar Rīgas Valsts tehnikumu, EduPage vai aSc, un tie to neatbalsta. | Stundio — неофициальный некоммерческий студенческий проект. Не связан с Rīgas Valsts tehnikums, EduPage и aSc и не одобрен ими. | Stundio is an unofficial, non-commercial student project. It is not affiliated with, endorsed by, or supported by Rīgas Valsts tehnikums, EduPage, or aSc. | Stundio — неофіційний некомерційний студентський проєкт. Не пов'язаний із Rīgas Valsts tehnikums, EduPage та aSc і не схвалений ними. |
| `footer.source` | Saraksts tiek ņemts no publiskās lapas pikcrvt.edupage.org un pieder skolai. Izmaiņu teksti tiek rādīti, kā tos publicējusi skola. | Расписание берётся из публичной страницы pikcrvt.edupage.org и принадлежит школе. Тексты замен показываются как опубликованы школой. | The timetable is taken from the public page pikcrvt.edupage.org and belongs to the school. Texts of changes are shown as published by the school. | Розклад береться з публічної сторінки pikcrvt.edupage.org і належить школі. Тексти замін показуються так, як їх опублікувала школа. |
| `privacy.title` | Privātums | Приватность | Privacy | Приватність |
| `privacy.body` | Nav kontu un profilu. Saraksts un iestatījumi atrodas tavā ierīcē. Anonīmā ekrānu statistika (Plausible, bez sīkdatnēm) izslēdzama iestatījumos. Paziņojumi pārlūkā glabā tikai ierīces abonementu un grupas atzīmi. | Нет аккаунтов и профилей. Расписание и настройки лежат на твоём устройстве. Анонимная статистика экранов (Plausible, без cookies) отключается в настройках. Уведомления в браузере хранят только подписку устройства и метку группы. | There are no accounts or profiles. Your timetable and settings live on your device. Anonymous screen statistics (Plausible, no cookies) can be turned off in settings. Browser notifications store only the device subscription and a group label. | Немає акаунтів і профілів. Розклад і налаштування лежать на твоєму пристрої. Анонімна статистика екранів (Plausible, без cookies) вимикається в налаштуваннях. Сповіщення в браузері зберігають лише підписку пристрою та мітку групи. |
| `privacy.feedback` | Atsauksmi, ko pats nosūti lietotnē, saņem ārējs pakalpojums kopā ar versiju un grupu. | Отзыв, который ты сам отправляешь из приложения, получает внешний сервис вместе с версией и группой. | A message you send from the app yourself goes to an outside service, with the app version and group. | Відгук, який ти сам надсилаєш із застосунку, отримує зовнішній сервіс разом із версією та групою. |
| `privacy.link` | Pilns apraksts README | Полное описание в README | Full description in the README | Повний опис у README |
| `privacy.page` | Šī lapa: anonīma statistika, bez sīkdatnēm. | Эта страница: анонимная статистика, без cookies. | This page: anonymous statistics, no cookies. | Ця сторінка: анонімна статистика, без cookies. |
| `privacy.optout` | Neskaitīt manus apmeklējumus | Не учитывать мои визиты | Do not count my visits | Не враховувати мої візити |
| `privacy.optout.done` | Gatavs. Tavi apmeklējumi netiek skaitīti. | Готово. Твои визиты не учитываются. | Done. Your visits are not counted. | Готово. Твої візити не враховуються. |
| `footer.github` | Pirmkods GitHub | Исходный код на GitHub | Source code on GitHub | Вихідний код на GitHub |
| `footer.releases` | Releases | Releases | Releases | Releases |
| `footer.license` | MIT licence | Лицензия MIT | MIT licence | Ліцензія MIT |
| `footer.open` | Atvērt Stundio | Открыть Stundio | Open Stundio | Відкрити Stundio |
| `footer.langs` | Valoda | Язык | Language | Мова |

Заметки:
- `privacy.page` описывает **лендинг**, а не приложение. Верно только если лендинг действительно шлёт события Plausible без cookies (02a §7; вопрос 7). Если автор решит без аналитики, ключи `privacy.page`, `privacy.optout`, `privacy.optout.done` удаляются.
- `privacy.body` оставляет формулу «только подписку устройства и метку группы» — формулировка README/01c (дисклеймер 4); 01c D8 требует уточнить: для учителей метка = хеш имени. Это в `faq.privacy.a` не расшифровано (место и так занято); вопрос 3.
- `footer.disclaimer` RU: «Не связан с Rīgas Valsts tehnikums» — название школы оставлено в оригинале и не склоняется (как в 01c).
- Англ. форма в `footer.disclaimer` — дословно из README License.

---

## 12. Sticky-плашка (`sticky`)

Появляется только на мобильном, после ухода hero; ведёт к `#install` с выбранной вкладкой, не качает APK (02a §2.4). Высота ≤ 56 px, поэтому одна короткая строка.

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `sticky.android` | Uzstādīt Android | Установить на Android | Install on Android | Встановити на Android |
| `sticky.ios` | Uzstādīt iPhone | Установить на iPhone | Install on iPhone | Встановити на iPhone |
| `sticky.neutral` | Kā uzstādīt | Как установить | How to install | Як встановити |

---

## 13. Нетранслируемые строки (константы)

| Ключ | Значение |
| --- | --- |
| `url.download` | https://stundio.pages.dev/download |
| `url.web` | https://stundio.pages.dev (зависит от вопроса 2: где живёт лендинг) |
| `url.github` | https://github.com/dmytropolizhai/stundio |
| `url.releases` | https://github.com/dmytropolizhai/stundio/releases |
| `url.readmePrivacy` | раздел Privacy в README репозитория (точный якорь проверить при сборке) |

---

## 14. Сверка с требованиями

| Требование | Где проверено |
| --- | --- |
| Только claims «можно»/«осторожно» из 01c | Каждая строка: офлайн (01c#1 с оговоркой), виджеты (#2, #3, #4 «по ходу дня»), без логина (#5), замены (#6, #7), 4 языка (#8), учителя (#11 с оговоркой), шаринг (#12; QR упомянут без bit.ly), уведомления (#13, #14), приватность (#15, #16), автообновление (#17), 200+ (#20 дословно), установка (#22), iPhone (#27) |
| Нет «нельзя» | Нет Google Play/App Store как места установки, нет отзывов, нет «100% офлайн», «без трекинга», «быстрее», «реального времени», «лучше EduPage», e-klase, виджетов на iPhone |
| RVT только в источнике и дисклеймере | `hero.source`, `footer.disclaimer` |
| Нет эмодзи и символов-иконок | проверено |
| Нет ссылок на отсутствующие картинки | см. раздел 0 |
| Дисклеймеры: 1 (`footer.disclaimer`), 2 (`footer.source`), 3 (`install.android.warn`, до кнопки), 4 (`privacy.body`), 5 (`hero.young`, `install.android.young`), 6 (`install.ios.widgets`, `install.ios.push`, `hero.cta.ios.micro`) | |

Известные риски длины: `hero.source` в LV (≈ 70 знаков), `changes.notify` (≈ 3 строки на 360 px, это не заголовок, но проверить), `install.android.warn` (длинный по замыслу, должен быть виден). Заголовки не длиннее 5 слов.

---

## Вопросы и сомнения

1. **RVT в мета и заголовках (юридика).** Название школы стоит только в `hero.source` и дисклеймере. `meta.title`, `meta.description` и `og.*` нарочно без RVT, но без него превью в чате не говорит, **чья** это расписание. Для получателя из школьного чата это слабее, чем «расписание RVT». Если автор (или школа) разрешат, нейтральный вариант: RU `meta.description` — «Неофициальное расписание для учеников RVT: ...», LV — «Neoficiāls RVT stundu saraksts ...». Решение нужно до 3.x: влияет на превью и SEO. Тот же вопрос про `hero.source` без слова «неофициально» (оно сейчас стоит там обязательно).
2. **Адрес лендинга и веб-приложения.** `url.web` и QR на desktop зависят от того, займёт ли лендинг корень `stundio.pages.dev`. Пока адрес не утверждён, `install.desktop.qr` и `install.desktop.addr` не публикуются.
3. **Метка «группа» и хеш учителя.** `faq.privacy.a` и `privacy.body` сообщают «метка группы». По коду (01c D8) для учителей это хеш имени. Нужно ли это указать явно (длиннее, но точнее)? Рекомендация: добавить одну фразу «у преподавателей вместо группы хеш имени» в `teachers.note` либо в README Privacy. Отзывы через Web3Forms (D6) названы «внешний сервис»; README нужно поправить (он пишет «без сторонних форм»), иначе лендинг и README противоречат друг другу.
4. **«Преподаватель» против «учитель», «викладач» против «вчитель».** Лендинг использует RU «преподаватель» (и «учителей» только в формуле 01c#20 «включая учителей», дословно), UA «викладач» (и «вчителі» в `hero.trust`). Внутри одного языка это два слова. Нужно решение автора: оставить, как в приложении (кнопка онбординга), или унифицировать. `hero.trust` в UA/RU дословно держит «учителей»/«вчителі»: формула 01c.
5. **bit.ly и «Better EduPage experience».** Копи лендинга **не** упоминает bit.ly и фразу из `share.message` (01c D12). В `more.share` написано «в конце QR-код» без указания, куда он ведёт. Пока QR ведёт на bit.ly (внешний сервис), честнее не называть адрес. Если автор переведёт bit.ly на лендинг (02a §8 вопрос 1) или поменяет текст на картинке, `more.share` можно дополнить. Подпись «Better EduPage experience» читается как связь с EduPage и позиционирование против бренда: на лендинг не перенесена, EduPage упоминается только как источник.
6. **OG-картинка.** `meta.og.imageAlt` пуст: безымянной картинки нет (02a §8 вопрос 8). Превью будет текстовым.
7. **Аналитика на лендинге.** `privacy.page`, `privacy.optout`, `privacy.optout.done` предполагают Plausible с opt-out ссылкой (02a §7). Если автор выберет «без аналитики», эти три ключа убрать.
8. **«Избранные группы».** В 02a §1.7 упомянуты, в инвентаре 01c доказательства нет. В `more.*` не включены; вернуть после подтверждения кодом.
9. **«Юридический риск» в `install.android.why` и `faq.play.a`.** Формулировка взята из README («legal risk»). Она честная, но может насторожить. Проверить с автором: не лучше ли «неофициальному приложению магазины не подходят» без слова «юридический».
10. **Тон «ты» против приложения («Вы»).** `iphoneInstall.*` в RU/UA на «Вы» («Добавьте», «Додайте»), лендинг на «ты». Один и тот же шаг звучит по-разному на лендинге и в приложении (02a §8 вопрос 5).
11. **Названия пунктов меню iPhone.** Использованы строки из приложения (`iphoneInstall.step2`). Реальное название зависит от версии iOS и языка системы; проверить на устройстве (съёмка C не сделана). До проверки в `install.ios.note` оговорка.
12. **UA и RU требуют носителя.** Переводы сделаны от LV и сверены с глоссарием 01c §4.2, но не вычитаны человеком. Отдельно проверить: UA «шорсткості» (в `hero.young`, дословно «rough edges»), RU «замены, которые ты ведёшь» (`teachers.item3`), LV «aizvietošanas stundas».
13. **`faq.free` в LV** отвечает «Nē» на «Vai tas maksā?», остальные языки — «Да, бесплатно». Это правильная локализация вопроса, но при сборке ключей стоит проверить, что вопрос не перепутан (см. заметку в разделе 10).
