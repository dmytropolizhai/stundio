/**
 * Phase 2 shell: proves the cache → sync → store pipeline end to end on device.
 * Real screens (ClassPicker, DayView, WeekView, …) land in Phase 3.
 */
import { AppStoreProvider, useAppStore } from "./store/index.ts";
import { todayInRiga } from "./sync/index.ts";

const SyncBadge = () => {
  const status = useAppStore((s) => s.syncStatus);
  const lastSyncAt = useAppStore((s) => s.lastSyncAt);
  return (
    <p className="text-sm text-slate-500 dark:text-slate-400">
      {status}
      {lastSyncAt !== null && ` · updated ${new Date(lastSyncAt).toLocaleTimeString()}`}
    </p>
  );
};

const Today = () => {
  const today = todayInRiga();
  const classes = useAppStore((s) => Object.values(s.timetables)[0]?.classes ?? []);
  const selected = useAppStore((s) => s.settings.selectedClassId);
  const setClass = useAppStore((s) => s.setClass);
  const day = useAppStore((s) => s.resolvedDay(today));

  return (
    <div className="flex w-full max-w-md flex-col gap-3 p-4">
      <select
        className="rounded border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-900"
        value={selected ?? ""}
        onChange={(e) => void setClass(e.target.value || null)}
      >
        <option value="">Izvēlies klasi…</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.short}
          </option>
        ))}
      </select>

      {day === null ? (
        <p className="text-sm text-slate-500">No timetable for {today} yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {day.lessons.map((lesson) => (
            <li
              key={`${lesson.period}-${lesson.subject?.id ?? ""}-${lesson.group ?? ""}`}
              className={lesson.status === "cancelled" ? "line-through opacity-60" : ""}
            >
              <span className="tabular-nums">{lesson.start}</span> {lesson.subject?.short}
              {lesson.status !== "normal" && (
                <span className="ml-2 text-xs text-amber-600">{lesson.status}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function App() {
  return (
    <main className="flex min-h-full flex-col items-center gap-2 bg-white pt-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <h1 className="text-xl font-semibold">RVT Stunda</h1>
      <AppStoreProvider fallback={<p className="text-sm text-slate-500">Ielādē…</p>}>
        <SyncBadge />
        <Today />
      </AppStoreProvider>
    </main>
  );
}
