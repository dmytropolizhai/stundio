/**
 * App shell: theme, tabs, and the one piece of navigation state the app has (which day you
 * are looking at). No router — four tabs and a modal picker do not need one, and every
 * kilobyte counts inside a WebView.
 */
import { useCallback, useEffect, useState } from "react";
import { AppStoreProvider, useAppStore } from "@/store";
import { todayInRiga } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { TopBar } from "@/ds";
import { TabBar, type Tab } from "./ui/components/TabBar.tsx";
import { ClassPicker } from "./ui/screens/ClassPicker.tsx";
import { OnboardingLanguage } from "./ui/screens/OnboardingLanguage.tsx";
import { OnboardingIntro } from "./ui/screens/OnboardingIntro.tsx";
import { DayView } from "./ui/screens/DayView.tsx";
import { WeekView } from "./ui/screens/WeekView.tsx";
import { SubjectsView } from "./ui/screens/SubjectsView.tsx";
import { SettingsView } from "./ui/screens/SettingsView.tsx";
import { SplashScreen } from "./ui/screens/SplashScreen.tsx";
import { WhatsNewSheet } from "./ui/screens/WhatsNewSheet.tsx";
import { useWhatsNew } from "./ui/hooks/useWhatsNew.ts";
import { IphoneReleaseSheet } from "./ui/screens/IphoneReleaseSheet.tsx";
import { useIphoneAnnouncement } from "./ui/hooks/useIphoneAnnouncement.ts";
import { IphoneInstallSheet } from "./ui/screens/IphoneInstallSheet.tsx";
import { useIphoneInstallPrompt } from "./ui/hooks/useIphoneInstallPrompt.ts";
import { ErrorBoundary } from "./ui/components/ErrorBoundary.tsx";
import { useCustomization, useTheme } from "@/ui/theme";
import { useT } from "@/ui/i18n";
import { nativeApp } from "@/lib/app";
import { handleBackPress, useBackButton } from "./ui/hooks/useBackButton.ts";

/**
 * Renders nothing; its only job is to tell the splash that the store hydrated. It sits inside
 * `AppStoreProvider`'s children, which the provider only mounts once boot resolves — so its
 * first effect *is* "the app is ready", with no extra state threaded through the provider.
 */
const BootSignal = ({ onReady }: { onReady: () => void }) => {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
};

/**
 * First run: no class chosen yet, so onboarding *is* the app until one is picked.
 *
 * A language question comes first — every other screen from here on is translated, so it has
 * to be answered before anything else is worth showing. Then a short feature tour (skippable
 * at every step), then the DS's onboarding screen — a full-bleed brand flood, the wordmark,
 * and one oversized headline — hands off to the class picker. It is the only place in the app
 * that goes edge-to-edge in blue.
 */
const Onboarding = () => {
  const t = useT();
  const [step, setStep] = useState<"language" | "intro" | "picker">("language");

  useBackButton(
    () => {
      if (step === "picker") {
        setStep("intro");
        return true;
      }
      if (step === "intro") {
        setStep("language");
        return true;
      }
      return false;
    },
    { priority: 10 },
  );

  if (step === "language") {
    return (
      <div className="flex h-full flex-col">
        <OnboardingLanguage onDone={() => setStep("intro")} />
      </div>
    );
  }

  if (step === "intro") {
    return (
      <div className="flex h-full flex-col">
        <OnboardingIntro onDone={() => setStep("picker")} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="bg-card px-gutter pt-[calc(--spacing(8)+var(--app-inset-top))] pb-7 text-brand">
        <h1 className="mt-5 font-display text-hero tracking-hero">{t("onboarding.title")}</h1>
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
  useCustomization();

  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const trackEvent = useAppStore((s) => s.trackEvent);
  const pendingNavigation = useAppStore((s) => s.pendingNavigation);
  const clearPendingNavigation = useAppStore((s) => s.clearPendingNavigation);
  const [tab, setTab] = useState<Tab>("day");
  const whatsNew = useWhatsNew();
  const iphoneAnnouncement = useIphoneAnnouncement();
  const iphoneInstall = useIphoneInstallPrompt();
  const [date, setDate] = useState<ISODate>(() => todayInRiga());
  const [picking, setPicking] = useState(false);

  useBackButton(
    () => {
      setPicking(false);
    },
    { enabled: picking, priority: 15 },
  );

  useBackButton(
    () => {
      setTab("day");
    },
    { enabled: !picking && tab !== "day", priority: 5 },
  );

  useEffect(() => {
    trackEvent(`view_${tab}`);
  }, [tab, trackEvent]);

  // A tapped notification (lesson reminder, substitution change, app update) — sent here by
  // `wireNotificationTaps` rather than acted on directly, since only the shell owns tab/date.
  useEffect(() => {
    if (pendingNavigation === null) return;
    if (pendingNavigation.tab === "day") setDate(pendingNavigation.date);
    setTab(pendingNavigation.tab);
    setPicking(false);
    clearPendingNavigation();
  }, [pendingNavigation, clearPendingNavigation]);

  if (selectedClassId === null) {
    return (
      <>
        <Onboarding />
        <IphoneInstallSheet open={iphoneInstall.open} onClose={iphoneInstall.dismiss} />
      </>
    );
  }

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
      <ErrorBoundary
        key={tab}
        title={t("error.title")}
        hint={t("error.hint")}
        actionLabel={t("error.retry")}
        onReset={() => setTab("day")}
      >
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
            onDateChange={setDate}
            onOpenDay={(next) => {
              setDate(next);
              setTab("day");
            }}
            onPickClass={() => {
              setPicking(true);
            }}
          />
        )}
        {tab === "subjects" && <SubjectsView />}
        {tab === "settings" && (
          <SettingsView
            onPickClass={() => {
              setPicking(true);
            }}
            onShowWhatsNew={whatsNew.show}
            onShowIphoneAnnouncement={iphoneAnnouncement.show}
            onShowIphoneInstall={iphoneInstall.show}
          />
        )}
      </ErrorBoundary>
      <TabBar tab={tab} onChange={setTab} />
      {/*
        Outside the tab switch: the sheet auto-opens on the launch after an update, whichever
        tab happens to be showing, and must survive a tab change while it is open.
      */}
      <WhatsNewSheet
        open={whatsNew.open}
        unread={whatsNew.unread}
        history={whatsNew.history}
        onClose={whatsNew.dismiss}
      />
      <IphoneReleaseSheet
        open={iphoneAnnouncement.open && !whatsNew.open}
        onClose={iphoneAnnouncement.dismiss}
      />
      <IphoneInstallSheet open={iphoneInstall.open} onClose={iphoneInstall.dismiss} />
    </div>
  );
};

export default function App() {
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    return nativeApp.addBackButtonListener(() => {
      void handleBackPress();
    });
  }, []);

  return (
    <ErrorBoundary>
      <AppStoreProvider>
        <BootSignal onReady={markReady} />
        <Shell />
      </AppStoreProvider>
      {/*
        Sits *over* the shell rather than in the provider's `fallback` slot: the splash owns its
        own exit (top out, then fade), and a fallback would be torn out the frame boot lands.
        It removes itself once the fade is done, so there is no permanent overlay node.
      */}
      <SplashScreen ready={ready} />
    </ErrorBoundary>
  );
}
