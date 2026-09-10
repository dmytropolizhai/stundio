/**
 * App shell: theme, tabs, and the one piece of navigation state the app has (which day you
 * are looking at). No router — three tabs and a modal picker do not need one, and every
 * kilobyte counts inside a WebView.
 */
import { useState } from "react";
import { AppStoreProvider, useAppStore } from "./store/index.ts";
import { todayInRiga } from "./sync/index.ts";
import type { ISODate } from "./lib/edupage/index.ts";
import { TabBar, type Tab } from "./ui/components/TabBar.tsx";
import { ClassPicker } from "./ui/screens/ClassPicker.tsx";
import { DayView } from "./ui/screens/DayView.tsx";
import { WeekView } from "./ui/screens/WeekView.tsx";
import { SettingsView } from "./ui/screens/SettingsView.tsx";
import { useTheme } from "./ui/theme/index.ts";
import { useT } from "./ui/i18n/index.ts";

const Splash = () => (
  <div className="flex h-full items-center justify-center bg-white dark:bg-slate-950">
    <span className="text-sm text-slate-400">Studio</span>
  </div>
);

/** First run: no class chosen yet, so the picker *is* the app until one is. */
const Onboarding = () => {
  const t = useT();
  return (
    <div className="flex h-full flex-col bg-white pt-[var(--app-inset-top)] dark:bg-slate-950">
      <header className="px-6 pt-8 pb-2">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t("onboarding.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("onboarding.subtitle")}
        </p>
      </header>
      <ClassPicker />
    </div>
  );
};

const Shell = () => {
  const t = useT();
  useTheme();

  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const [tab, setTab] = useState<Tab>("day");
  const [date, setDate] = useState<ISODate>(() => todayInRiga());
  const [picking, setPicking] = useState(false);

  if (selectedClassId === null) return <Onboarding />;

  if (picking) {
    return (
      <div className="flex h-full flex-col bg-white dark:bg-slate-950">
        <header className="flex items-center gap-2 border-b border-slate-200 px-2 pt-[var(--app-inset-top)] pb-2 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setPicking(false);
            }}
            className="px-2 py-1 text-xl text-slate-400"
            aria-label={t("lesson.close")}
          >
            ‹
          </button>
          <h1 className="font-semibold text-slate-900 dark:text-slate-100">
            {t("settings.class")}
          </h1>
        </header>
        <ClassPicker
          onPicked={() => {
            setPicking(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {tab === "day" && (
        <DayView
          date={date}
          onDateChange={setDate}
          onPickClass={() => {
            setPicking(true);
          }}
        />
      )}
      {tab === "week" && (
        <WeekView
          date={date}
          onOpenDay={(next) => {
            setDate(next);
            setTab("day");
          }}
        />
      )}
      {tab === "settings" && (
        <SettingsView
          onPickClass={() => {
            setPicking(true);
          }}
        />
      )}
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
};

export default function App() {
  return (
    <AppStoreProvider fallback={<Splash />}>
      <Shell />
    </AppStoreProvider>
  );
}
