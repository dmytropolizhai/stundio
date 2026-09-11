/**
 * App shell: theme, tabs, and the one piece of navigation state the app has (which day you
 * are looking at). No router — four tabs and a modal picker do not need one, and every
 * kilobyte counts inside a WebView.
 */
import { useState } from "react";
import { AppStoreProvider, useAppStore } from "./store/index.ts";
import { todayInRiga } from "./sync/index.ts";
import type { ISODate } from "./lib/edupage/index.ts";
import { TopBar } from "./ds/index.ts";
import { TabBar, type Tab } from "./ui/components/TabBar.tsx";
import { ClassPicker } from "./ui/screens/ClassPicker.tsx";
import { DayView } from "./ui/screens/DayView.tsx";
import { WeekView } from "./ui/screens/WeekView.tsx";
import { SubjectsView } from "./ui/screens/SubjectsView.tsx";
import { SettingsView } from "./ui/screens/SettingsView.tsx";
import { useTheme } from "./ui/theme/index.ts";
import { useT } from "./ui/i18n/index.ts";

const Splash = () => (
  <div className="flex h-full items-center justify-center bg-brand">
    <span className="u-wordmark text-white">studio.</span>
  </div>
);

/**
 * First run: no class chosen yet, so the picker *is* the app until one is.
 *
 * This is the DS's onboarding screen — a full-bleed brand flood, the wordmark, and one
 * oversized headline. It is the only place in the app that goes edge-to-edge in blue.
 */
const Onboarding = () => {
  const t = useT();
  return (
    <div className="flex h-full flex-col">
      <div className="bg-brand px-gutter pt-[calc(--spacing(8)+var(--app-inset-top))] pb-7 text-white">
        <span className="u-wordmark block text-[34px] leading-none">studio.</span>
        <h1 className="mt-5 font-display text-hero tracking-hero text-white">
          {t("onboarding.title")}
        </h1>
        <p className="mt-3 font-text text-body-lg text-white/72">{t("onboarding.subtitle")}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col pt-5">
        <ClassPicker />
      </div>
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
      <div className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top">
          <TopBar
            title={t("settings.class")}
            backLabel={t("nav.back")}
            onBack={() => {
              setPicking(false);
            }}
          />
        </div>
        <ClassPicker
          onPicked={() => {
            setPicking(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
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
      {tab === "subjects" && <SubjectsView />}
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
