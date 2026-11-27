/**
 * App shell: theme, tabs, and the one piece of navigation state the app has (which day you
 * are looking at). No router — five tabs and a modal picker do not need one, and every
 * kilobyte counts inside a WebView.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { AppStoreProvider, useAppStore, useSettingSetter } from "@/store";
import { Button, TopBar, TooltipProvider } from "@/ds";
import { dayGlance } from "@/lib/schedule";
import type { ResolvedLesson } from "@/lib/edupage";
import { TabBar, type Tab } from "./ui/components/TabBar.tsx";
import { DateDock, type DateDockNowToggle } from "./ui/components/DateDock.tsx";
import { NowDock } from "./ui/components/NowDock.tsx";
import { StatusBar } from "./ui/components/StatusBar.tsx";
import { SideNav } from "./ui/components/SideNav.tsx";
import { useLayout } from "./ui/hooks/useLayout.ts";
import { useNow } from "./ui/hooks/useNow.ts";
import { LessonSheet } from "./ui/screens/lesson-sheet";
import { ClassSelector } from "./ui/screens/class-selector";
import { TeacherPicker } from "./ui/screens/teacher-picker";
import { OnboardingIntro } from "./ui/screens/onboarding-intro";
import { OnboardingPersona } from "./ui/screens/onboarding-persona";
import { HomeView } from "./ui/screens/home-view";
import { WeekView } from "./ui/screens/week-view";
import { ChangesView } from "./ui/screens/changes-view";
import { SubjectsView } from "./ui/screens/subjects-view";
import { TransitView } from "./ui/screens/transit-view";
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
import { lessonAccent, useCustomization, useTheme } from "@/ui/theme";
import { formatDuration, translate, useT } from "@/ui/i18n";
import { PERSONA_PROFILES, usePersona } from "@/ui/persona";
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
 * at every step), then the DS's onboarding screen — a full-bleed brand flood, the wordmark,
 * and one oversized headline — hands off to the class picker. It is the only place in the app
 * that goes edge-to-edge in blue.
 *
 * Switching role in Settings lands here too (the new role has no pick yet). That user has
 * already been through the tour, so it opens straight on the new role's picker.
 */
const Onboarding = () => {
  const t = useT();
  const persona = useAppStore((s) => s.settings.persona);
  // Someone who already picked a class or a teacher is not new: they got here by switching
  // role in Settings to one with no selection yet, so skip the tour and open that role's list.
  const returning = useAppStore(
    (s) => s.settings.selectedClassId !== null || s.settings.selectedTeacherId !== null,
  );
  const [step, setStep] = useState<"intro" | "persona" | "classPicker" | "teacherPicker">(() =>
    returning
      ? PERSONA_PROFILES[persona].picker === "teacher"
        ? "teacherPicker"
        : "classPicker"
      : "intro",
  );
  const setPersona = useSettingSetter("persona");

  useBackButton(
    () => {
      if (step === "classPicker" || step === "teacherPicker") {
        setStep("persona");
        return true;
      }
      if (step === "persona") {
        setStep("intro");
        return true;
      }
      return false;
    },
    { priority: 10 },
  );

  if (step === "intro") {
    return (
      <div className="flex h-full flex-col">
        <OnboardingIntro onDone={() => setStep("persona")} />
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
          <p className="mt-3 font-text text-body-lg text-muted">
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
      <ClassSelector
        mode="onboarding"
        onBack={() => {
          setStep("persona");
        }}
      />
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
  const layout = useLayout();
  const reduceMotion = useReducedMotion() ?? false;
  const now = useNow();
  const today = useAppStore((s) => s.resolvedDay(now.date));
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const groupColorOverrides = useAppStore((s) => s.settings.groupColorOverrides);
  const colorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);
  const [picking, setPicking] = useState<"class" | "teacher" | null>(null);
  const [dockOverride, setDockOverride] = useState<"now" | "date" | null>(null);
  const [dockMorph, setDockMorph] = useState<"to-date" | "to-now" | null>(null);
  const [prevNavDate, setPrevNavDate] = useState(scheduleNav.date);
  const [dockLesson, setDockLesson] = useState<ResolvedLesson | null>(null);

  if (prevNavDate !== scheduleNav.date) {
    setPrevNavDate(scheduleNav.date);
    setDockOverride(null);
    setDockMorph(scheduleNav.isToday ? "to-now" : "to-date");
  }

  const glance = useMemo(() => dayGlance(today, now), [today, now]);
  const activeGlance =
    glance !== null && glance.kind !== "finished" && today !== null ? glance : null;
  const nowDocked = layout === "phone" && activeGlance !== null;

  useBackButton(
    () => {
      setPicking(null);
    },
    { enabled: picking !== null, priority: 15 },
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

  useEffect(() => {
    if (![...profile.nav.schedule, ...profile.nav.personal].includes(tab)) setTab("home");
  }, [profile, tab]);

  // A tapped notification (lesson reminder, substitution change, app update) — sent here by
  // `wireNotificationTaps` rather than acted on directly, since only the shell owns tab/date.
  useEffect(() => {
    if (pendingNavigation === null) return;
    if (
      (pendingNavigation.tab === "home" ||
        pendingNavigation.tab === "changes" ||
        pendingNavigation.tab === "week") &&
      pendingNavigation.date !== undefined
    ) {
      scheduleNav.setDate(pendingNavigation.date);
    }
    setTab(pendingNavigation.tab);
    setPicking(null);
    clearPendingNavigation();
  }, [pendingNavigation, clearPendingNavigation, scheduleNav]);

  if (!isOnboarded) {
    return (
      <>
        <Onboarding />
        <IphoneInstallSheet open={iphoneInstall.open} onClose={iphoneInstall.dismiss} />
      </>
    );
  }

  if (picking === "class") {
    return (
      <div className="flex h-full flex-col">
        <ClassSelector
          mode="switch"
          onBack={() => {
            setPicking(null);
          }}
          onPicked={() => {
            setPicking(null);
          }}
        />
      </div>
    );
  }

  if (picking === "teacher") {
    return (
      <div className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-screen px-gutter pt-(--app-inset-top)">
          <TopBar
            title={t("onboarding.teacher.title")}
            onBack={() => {
              setPicking(null);
            }}
          />
        </div>
        <TeacherPicker
          onPicked={() => {
            setPicking(null);
          }}
        />
      </div>
    );
  }

  const screen = (
    <>
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
            dockedGlance={nowDocked}
            onPickClass={() => {
              setPicking(profile.picker);
            }}
            onOpenChanges={(nextDate) => {
              scheduleNav.setDate(nextDate);
              setTab("changes");
            }}
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
        {tab === "transit" && <TransitView />}
        {tab === "settings" && (
          <SettingsView
            onPickClass={() => {
              setPicking("class");
            }}
            onPickTeacher={() => {
              setPicking("teacher");
            }}
            onShowWhatsNew={whatsNew.show}
            onShowTeacherAnnouncement={teacherAnnouncement.show}
            onShowIphoneInstall={iphoneInstall.show}
          />
        )}
      </ErrorBoundary>
      <RefreshToast />
    </>
  );

  const sheets = (
    <>
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
      <LessonSheet
        lesson={dockLesson}
        day={today}
        onClose={() => {
          setDockLesson(null);
        }}
      />
    </>
  );

  // The phone layout is the reference: fixed read-only status strip at the top, and one fixed
  // bottom stack holding the contextual dock (`NowDock` or `DateDock`) above the single-surface
  // nav bar. Wide windows put the nav in a rail beside the screen instead.
  if (layout === "phone") {
    const dockMode = tab === "home" ? "day" : tab === "week" ? "week" : null;
    const onCurrent = dockMode === "day" ? scheduleNav.isToday : scheduleNav.isThisWeek;
    const showNowDock =
      activeGlance !== null &&
      (dockMode === null || dockOverride === "now" || (dockOverride === null && onCurrent));
    const showDateDock = dockMode !== null && !showNowDock;
    const hasDock = showNowDock || showDateDock;

    const nowToggle: DateDockNowToggle | undefined =
      activeGlance === null
        ? undefined
        : {
            accent: lessonAccent(
              activeGlance.lesson,
              subjectColorOverrides,
              groupColorOverrides,
              colorCodingEnabled,
            ),
            countdown: formatDuration(
              activeGlance.kind === "live" ? activeGlance.minutesLeft : activeGlance.minutesUntil,
            ),
            label: t("day.now"),
            live: activeGlance.kind === "live",
            onShowNow: () => {
              setDockOverride("now");
              setDockMorph("to-now");
            },
          };

    return (
      <div
        className="relative flex h-full flex-col overflow-hidden"
        data-dock={hasDock ? "true" : undefined}
      >
        {tab !== "week" && <StatusBar />}
        {screen}
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-nav-inset pb-[calc(var(--space-5)+var(--app-inset-bottom))]"
          style={{ transform: "translateZ(0)" }}
        >
          <div className="flex w-full max-w-screen flex-col gap-2">
            {hasDock && (
              <div className="relative h-[52px] w-full">
                <AnimatePresence initial={false}>
                  {showNowDock && activeGlance !== null && today !== null && (
                    <m.div
                      key="now-dock"
                      className="absolute inset-0 flex items-center"
                      style={{ transformOrigin: "65% 50%" }}
                      initial={reduceMotion ? { opacity: 0 } : { scaleX: 0.22, scaleY: 0.86 }}
                      animate={reduceMotion ? { opacity: 1 } : { scaleX: 1, scaleY: 1 }}
                      exit={
                        reduceMotion
                          ? { opacity: 0 }
                          : {
                              opacity: 0,
                              scaleX: 0.22,
                              scaleY: 0.86,
                              transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
                            }
                      }
                      transition={
                        reduceMotion
                          ? { duration: 0.12 }
                          : { type: "spring", stiffness: 460, damping: 24, mass: 0.82 }
                      }
                    >
                      <NowDock
                        day={today}
                        glance={activeGlance}
                        onOpenLesson={setDockLesson}
                        {...(dockMorph === "to-now" ? { animateFrom: "chip" as const } : {})}
                        {...(dockMode !== null
                          ? {
                              onShowDateDock: () => {
                                setDockOverride("date");
                                setDockMorph("to-date");
                              },
                            }
                          : {})}
                      />
                    </m.div>
                  )}
                  {showDateDock && (
                    <m.div
                      key="date-dock"
                      className="absolute inset-0 flex items-center"
                      style={{ transformOrigin: "calc(100% - 72px) 50%" }}
                      initial={
                        reduceMotion ? { opacity: 0 } : { x: -16, scaleX: 0.22, scaleY: 0.86 }
                      }
                      animate={reduceMotion ? { opacity: 1 } : { x: 0, scaleX: 1, scaleY: 1 }}
                      exit={
                        reduceMotion
                          ? { opacity: 0 }
                          : {
                              opacity: 0,
                              x: -10,
                              scaleX: 0.22,
                              scaleY: 0.86,
                              transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
                            }
                      }
                      transition={
                        reduceMotion
                          ? { duration: 0.12 }
                          : { type: "spring", stiffness: 460, damping: 24, mass: 0.82 }
                      }
                    >
                      <DateDock
                        mode={dockMode}
                        nav={scheduleNav}
                        {...(dockMorph === "to-date" ? { animateFrom: "right" as const } : {})}
                        {...(nowToggle !== undefined ? { nowToggle } : {})}
                      />
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <TabBar
              tab={tab}
              onChange={setTab}
              onPickIdentity={() => {
                setPicking(profile.picker);
              }}
            />
          </div>
        </div>
        {sheets}
      </div>
    );
  }

  return (
    <div className="relative flex h-full overflow-hidden">
      <SideNav tab={tab} onChange={setTab} expanded={layout === "desktop"} />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">{screen}</div>
      {sheets}
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
    // `domAnimation` is bundled synchronously (not the async-loaded form): a lazy feature chunk
    // would be one more file an offline cold start has to find. `strict` makes a stray
    // `motion.*` fail loudly instead of quietly pulling the full feature set back in.
    <LazyMotion features={domAnimation} strict>
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
    </LazyMotion>
  );
}
