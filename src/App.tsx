/**
 * App shell: theme, tabs, and the one piece of navigation state the app has (which day you
 * are looking at). No router — four tabs and a modal picker do not need one, and every
 * kilobyte counts inside a WebView.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { AppStoreProvider, useAppStore } from "@/store";
import { todayInRiga } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { TopBar } from "@/ds";
import { TabBar, type Tab } from "./ui/components/TabBar.tsx";
import { ClassPicker } from "./ui/screens/ClassPicker.tsx";
import { OnboardingIntro } from "./ui/screens/OnboardingIntro.tsx";
import { DayView } from "./ui/screens/DayView.tsx";
import { DaySkeleton } from "./ui/components/Skeleton.tsx";
import { useTheme } from "@/ui/theme";
import { useT } from "@/ui/i18n";

// Split off the tabs that aren't on screen at launch — only DayView (the default tab) and
// ClassPicker (onboarding) need to be in the initial bundle.
const WeekView = lazy(() =>
  import("./ui/screens/WeekView.tsx").then((m) => ({ default: m.WeekView })),
);
const SubjectsView = lazy(() =>
  import("./ui/screens/SubjectsView.tsx").then((m) => ({ default: m.SubjectsView })),
);
const SettingsView = lazy(() =>
  import("./ui/screens/SettingsView.tsx").then((m) => ({ default: m.SettingsView })),
);

const Splash = () => (
  <div className="flex h-full items-center justify-center bg-brand">
    <span className="u-wordmark text-white">stundio.</span>
  </div>
);

/**
 * First run: no class chosen yet, so onboarding *is* the app until one is picked.
 *
 * A short feature tour (skippable at every step) runs first, then the DS's onboarding
 * screen — a full-bleed brand flood, the wordmark, and one oversized headline — hands off
 * to the class picker. It is the only place in the app that goes edge-to-edge in blue.
 */
const Onboarding = () => {
  const t = useT();
  const [introDone, setIntroDone] = useState(false);

  if (!introDone) {
    return (
      <div className="flex h-full flex-col">
        <OnboardingIntro onDone={() => setIntroDone(true)} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="bg-card px-gutter pt-[calc(--spacing(8)+var(--app-inset-top))] pb-7 text-brand">
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
  const trackEvent = useAppStore((s) => s.trackEvent);
  const [tab, setTab] = useState<Tab>("day");
  const [date, setDate] = useState<ISODate>(() => todayInRiga());
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    trackEvent(`view_${tab}`);
  }, [tab, trackEvent]);

  if (selectedClassId === null) return <Onboarding />;

  if (picking) {
    return (
      <div className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top">
          <TopBar
            title={t("settings.class")}
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
        <Suspense fallback={<DaySkeleton rows={7} />}>
          <WeekView
            date={date}
            onDateChange={setDate}
            onOpenDay={(next) => {
              setDate(next);
              setTab("day");
            }}
            onPickClass={() => {
              setPicking(true);
            }}
          />
        </Suspense>
      )}
      {tab === "subjects" && (
        <Suspense fallback={<DaySkeleton rows={4} />}>
          <SubjectsView />
        </Suspense>
      )}
      {tab === "settings" && (
        <Suspense fallback={<DaySkeleton rows={3} />}>
          <SettingsView
            onPickClass={() => {
              setPicking(true);
            }}
          />
        </Suspense>
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
