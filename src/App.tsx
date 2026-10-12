/**
 * App shell: theme, tabs, and the one piece of navigation state the app has (which day you
 * are looking at). No router — five tabs and a modal picker do not need one, and every
 * kilobyte counts inside a WebView.
 */
import { useCallback, useEffect, useState } from "react";
import { AppStoreProvider, useAppStore } from "@/store";
import { Button, TopBar, TooltipProvider } from "@/ds";
import { TabBar, type Tab } from "./ui/components/TabBar.tsx";
import { ClassSelector } from "./ui/screens/class-selector";
import { TeacherPicker } from "./ui/screens/teacher-picker";
import { OnboardingLanguage } from "./ui/screens/onboarding-language";
import { OnboardingIntro } from "./ui/screens/onboarding-intro";
import { OnboardingPersona } from "./ui/screens/onboarding-persona";
import { OnboardingInstitution } from "./ui/screens/onboarding-institution";
import { UniversityPicker } from "./ui/screens/university-picker";
import { HomeView } from "./ui/screens/home-view";
import { WeekView } from "./ui/screens/week-view";
import { ChangesView } from "./ui/screens/changes-view";
import { SubjectsView } from "./ui/screens/subjects-view";
import { SettingsView } from "./ui/screens/settings-view";
import { SplashScreen } from "./ui/screens/splash-screen";
import { WhatsNewSheet } from "./ui/screens/sheets/WhatsNewSheet.tsx";
import { useWhatsNew } from "./ui/hooks/useWhatsNew.ts";
import { TeacherAnnouncementSheet } from "./ui/screens/sheets/TeacherAnnouncementSheet.tsx";
import { useTeacherAnnouncement } from "./ui/hooks/useTeacherAnnouncement.ts";
import { IphoneInstallSheet } from "./ui/screens/sheets/IphoneInstallSheet.tsx";
import { useIphoneInstallPrompt } from "./ui/hooks/useIphoneInstallPrompt.ts";
import { useScheduleNavigation } from "./ui/hooks/useScheduleNavigation.ts";
import { RefreshToast } from "./ui/components/RefreshToast.tsx";
import { ErrorBoundary } from "./ui/components/ErrorBoundary.tsx";
import { StateMessage } from "./ui/components/StateMessage.tsx";
import { useCustomization, useTheme } from "@/ui/theme";
import { translate, useT, type MessageKey } from "@/ui/i18n";
import { PERSONA_PROFILES, usePersona, type PersonaProfile } from "@/ui/persona";
import { fallbackPersona } from "@/lib/persona";
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
 * What shows when boot rejects (the cache cannot be opened, a chunk failed to load offline).
 * Without it the provider renders nothing and the splash — waiting on `BootSignal` — would
 * ripple forever, which is exactly how a failed offline launch used to look. It signals ready
 * too, so the splash leaves and uncovers the error. Latvian, like `ErrorBoundary`'s default:
 * the language setting lives in the store that just failed to load.
 */
const BootFailed = ({ onReady }: { onReady: () => void }) => (
  <>
    <BootSignal onReady={onReady} />
    <div className="flex h-full flex-1 items-center justify-center p-4">
      <StateMessage
        icon="triangle-alert"
        title={translate("lv", "error.title")}
        hint={translate("lv", "error.hint")}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.reload();
            }}
          >
            {translate("lv", "error.retry")}
          </Button>
        }
      />
    </div>
  </>
);

/**
 * First run: no class chosen yet, so onboarding *is* the app until one is picked.
 *
 * A language question comes first — every other screen from here on is translated, so it has
 * to be answered before anything else is worth showing. Then a short feature tour (skippable
 * at every step), then which school: RVT goes on to the student/teacher split and the DS's
 * onboarding screen — a full-bleed brand flood, the wordmark, and one oversized headline —
 * hands off to the class picker; RTU and LU go straight to the university group picker.
 */
const Onboarding = () => {
  const t = useT();
  const [step, setStep] = useState<
    | "language"
    | "intro"
    | "institution"
    | "persona"
    | "classPicker"
    | "teacherPicker"
    | "universityPicker"
  >("language");
  const setPersona = useAppStore((s) => s.setPersona);
  const setUniversity = useAppStore((s) => s.setUniversity);

  useBackButton(
    () => {
      if (step === "classPicker" || step === "teacherPicker") {
        setStep("persona");
        return true;
      }
      if (step === "persona" || step === "universityPicker") {
        setStep("institution");
        return true;
      }
      if (step === "institution") {
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
        <OnboardingIntro onDone={() => setStep("institution")} />
      </div>
    );
  }

  if (step === "institution") {
    return (
      <div className="flex h-full flex-col">
        <OnboardingInstitution
          onSelect={(institution) => {
            if (institution === "rvt") {
              setStep("persona");
              return;
            }
            void setUniversity(institution);
            setStep("universityPicker");
          }}
        />
      </div>
    );
  }

  if (step === "universityPicker") {
    return (
      <div className="flex h-full flex-col">
        <div className="bg-card px-gutter pt-[calc(--spacing(8)+var(--app-inset-top))] pb-7 text-brand">
          <h1 className="mt-5 font-display text-hero tracking-hero">
            {t("university.picker.title")}
          </h1>
          <p className="mt-3 font-text text-body-lg text-muted">
            {t("university.picker.subtitle")}
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col pt-5">
          <UniversityPicker />
        </div>
      </div>
    );
  }

  if (step === "persona") {
    return (
      <div className="flex h-full flex-col">
        <OnboardingPersona
          onSelectPersona={(persona) => {
            void setPersona(persona);
            setStep(
              PERSONA_PROFILES[persona].picker === "teacher" ? "teacherPicker" : "classPicker",
            );
          }}
        />
      </div>
    );
  }

  if (step === "teacherPicker") {
    return (
      <div className="flex h-full flex-col">
        <div className="bg-card px-gutter pt-[calc(--spacing(8)+var(--app-inset-top))] pb-7 text-brand">
          <h1 className="mt-5 font-display text-hero tracking-hero">
            {t("onboarding.teacher.title")}
          </h1>
          <p className="mt-3 font-text text-body-lg text-white/72">
            {t("onboarding.teacher.subtitle")}
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col pt-5">
          <TeacherPicker />
        </div>
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
        <ClassSelector />
      </div>
    </div>
  );
};

type Picker = PersonaProfile["picker"];

const PICKER_TITLES: Record<Picker, MessageKey> = {
  class: "settings.class",
  teacher: "onboarding.teacher.title",
  university: "settings.group",
};

/** A role's picker as a full screen, with a back arrow — from Settings, or a role switch. */
const PickerScreen = ({
  picker,
  onBack,
  onPicked,
}: {
  picker: Picker;
  onBack: () => void;
  onPicked?: () => void;
}) => {
  const t = useT();
  const props = onPicked === undefined ? {} : { onPicked };
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top">
        <TopBar title={t(PICKER_TITLES[picker])} onBack={onBack} />
      </div>
      {picker === "class" && <ClassSelector {...props} />}
      {picker === "teacher" && <TeacherPicker {...props} />}
      {picker === "university" && <UniversityPicker {...props} />}
    </div>
  );
};

const Shell = () => {
  const t = useT();
  useTheme();
  useCustomization();

  const { identified: isOnboarded, profile } = usePersona();

  const trackEvent = useAppStore((s) => s.trackEvent);
  const pendingNavigation = useAppStore((s) => s.pendingNavigation);
  const clearPendingNavigation = useAppStore((s) => s.clearPendingNavigation);
  const [tab, setTab] = useState<Tab>("home");
  const whatsNew = useWhatsNew();
  const teacherAnnouncement = useTeacherAnnouncement();
  const iphoneInstall = useIphoneInstallPrompt();
  const scheduleNav = useScheduleNavigation();
  const [picking, setPicking] = useState<Picker | null>(null);
  const returnTo = useAppStore((s) => fallbackPersona(s.settings));
  const setPersona = useAppStore((s) => s.setPersona);

  useBackButton(
    () => {
      setPicking(null);
    },
    { enabled: picking !== null, priority: 15 },
  );

  useBackButton(
    () => {
      if (returnTo !== null) void setPersona(returnTo);
    },
    { enabled: !isOnboarded && returnTo !== null, priority: 15 },
  );

  useBackButton(
    () => {
      setTab("home");
    },
    { enabled: picking === null && tab !== "home", priority: 5 },
  );

  useEffect(() => {
    trackEvent(`view_${tab}`);
  }, [tab, trackEvent]);

  // Switching role can take away the tab on screen (a university has no Changes tab).
  const tabAvailable = profile.nav.schedule.includes(tab) || profile.nav.personal.includes(tab);
  useEffect(() => {
    if (!tabAvailable) setTab("home");
  }, [tabAvailable]);

  // A tapped notification (lesson reminder, substitution change, app update) — sent here by
  // `wireNotificationTaps` rather than acted on directly, since only the shell owns tab/date.
  useEffect(() => {
    if (pendingNavigation === null) return;
    if (pendingNavigation.tab === "home" || pendingNavigation.tab === "changes") {
      scheduleNav.setDate(pendingNavigation.date);
    }
    setTab(pendingNavigation.tab);
    setPicking(null);
    clearPendingNavigation();
  }, [pendingNavigation, clearPendingNavigation, scheduleNav]);

  /*
   * Switching to a role with nothing picked yet (Settings → role) un-identifies the app. A user
   * who already set up another role goes straight to the new role's picker — never back to
   * the language question — and backing out returns them to the role they came from.
   */
  if (!isOnboarded && returnTo !== null) {
    return (
      <PickerScreen
        picker={profile.picker}
        onBack={() => {
          void setPersona(returnTo);
        }}
      />
    );
  }

  if (!isOnboarded) {
    return (
      <>
        <Onboarding />
        <IphoneInstallSheet open={iphoneInstall.open} onClose={iphoneInstall.dismiss} />
      </>
    );
  }

  if (picking !== null) {
    return (
      <PickerScreen
        picker={picking}
        onBack={() => {
          setPicking(null);
        }}
        onPicked={() => {
          setPicking(null);
        }}
      />
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <ErrorBoundary
        key={tab}
        title={t("error.title")}
        hint={t("error.hint")}
        actionLabel={t("error.retry")}
        onReset={() => setTab("home")}
      >
        {tab === "home" && (
          <HomeView
            date={scheduleNav.date}
            onDateChange={scheduleNav.setDate}
            onPickClass={() => {
              setPicking(profile.picker);
            }}
            onOpenChanges={
              profile.hasChangeFeed
                ? (nextDate) => {
                    scheduleNav.setDate(nextDate);
                    setTab("changes");
                  }
                : undefined
            }
          />
        )}
        {tab === "week" && (
          <WeekView
            date={scheduleNav.date}
            onDateChange={scheduleNav.setDate}
            onOpenDay={(next) => {
              scheduleNav.setDate(next);
              setTab("home");
            }}
            onPickClass={() => {
              setPicking(profile.picker);
            }}
          />
        )}
        {tab === "changes" && (
          <ChangesView
            date={scheduleNav.date}
            onDateChange={scheduleNav.setDate}
            onPickClass={() => {
              setPicking(profile.picker);
            }}
          />
        )}
        {tab === "subjects" && <SubjectsView />}
        {tab === "settings" && (
          <SettingsView
            onPickClass={() => {
              setPicking("class");
            }}
            onPickTeacher={() => {
              setPicking("teacher");
            }}
            onPickUniversityGroup={() => {
              setPicking("university");
            }}
            onShowWhatsNew={whatsNew.show}
            onShowTeacherAnnouncement={teacherAnnouncement.show}
            onShowIphoneInstall={iphoneInstall.show}
          />
        )}
      </ErrorBoundary>
      <TabBar tab={tab} onChange={setTab} />
      <RefreshToast />
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
      <TeacherAnnouncementSheet
        open={teacherAnnouncement.open && !whatsNew.open}
        onClose={teacherAnnouncement.dismiss}
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
    <TooltipProvider>
      <ErrorBoundary>
        <AppStoreProvider errorFallback={() => <BootFailed onReady={markReady} />}>
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
    </TooltipProvider>
  );
}
