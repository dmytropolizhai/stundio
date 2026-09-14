/**
 * Onboarding Customization — a guided, step-by-step walkthrough to customize the app and
 * discover all of Stundio's special features (themes, custom DS accents, card styling,
 * exact schedule times, smart notifications, offline-first cache, home-screen widget, sharing,
 * and direct messaging to the developer in Settings).
 *
 * Every control writes directly through the store to the cache, so preferences are active
 * immediately across the app shell. Skippable at any step so students in a rush can jump straight
 * to picking their class.
 */
import { useRef, useState, type TouchEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Badge,
  Button,
  Card,
  Icon,
  IconButton,
  LessonCard,
  SegmentedTabs,
  Slider,
  Switch,
  SyncStatus,
  cn,
} from "@/ds";
import { useAppStore } from "@/store";
import type { Settings, SubjectColorTone } from "@/db";
import { SUBJECT_TONES } from "@/ui/theme";
import { ensureNotificationPermission } from "@/notifications";
import { useT, type MessageKey } from "@/ui/i18n";

const TOTAL_STEPS = 5;
const SWIPE_THRESHOLD_PX = 56;
const RADIUS_STEPS = ["md", "lg", "xl", "2xl"] as const;

const TONE_BG: Record<SubjectColorTone, string> = {
  amber: "bg-amber",
  sky: "bg-sky",
  lilac: "bg-lilac",
  pink: "bg-pink",
  mint: "bg-mint",
  lime: "bg-lime",
};

type StepMeta = {
  badge: MessageKey;
  title: MessageKey;
  body: MessageKey;
};

const STEP_METAS: StepMeta[] = [
  {
    badge: "onboarding.customization.step1.badge",
    title: "onboarding.customization.step1.title",
    body: "onboarding.customization.step1.body",
  },
  {
    badge: "onboarding.customization.step2.badge",
    title: "onboarding.customization.step2.title",
    body: "onboarding.customization.step2.body",
  },
  {
    badge: "onboarding.customization.step3.badge",
    title: "onboarding.customization.step3.title",
    body: "onboarding.customization.step3.body",
  },
  {
    badge: "onboarding.customization.step4.badge",
    title: "onboarding.customization.step4.title",
    body: "onboarding.customization.step4.body",
  },
  {
    badge: "onboarding.customization.step5.badge",
    title: "onboarding.customization.step5.title",
    body: "onboarding.customization.step5.body",
  },
];

export const OnboardingCustomization = ({
  onDone,
  onBack,
}: {
  onDone: () => void;
  onBack?: () => void;
}) => {
  const t = useT();
  const [step, setStep] = useState(0);

  const settings = useAppStore((s) => s.settings);
  const setTheme = useAppStore((s) => s.setTheme);
  const setAppAccent = useAppStore((s) => s.setAppAccent);
  const setLessonCardStyle = useAppStore((s) => s.setLessonCardStyle);
  const setCardRadius = useAppStore((s) => s.setCardRadius);
  const setCardElevation = useAppStore((s) => s.setCardElevation);
  const setShowTime = useAppStore((s) => s.setShowTime);
  const setMergeConsecutiveLessons = useAppStore((s) => s.setMergeConsecutiveLessons);
  const setSubjectColorCodingEnabled = useAppStore((s) => s.setSubjectColorCodingEnabled);
  const setNotifyLessonReminderMinutes = useAppStore((s) => s.setNotifyLessonReminderMinutes);
  const setNotifySubstitutionChanges = useAppStore((s) => s.setNotifySubstitutionChanges);

  const reduceMotion = useReducedMotion() ?? false;
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const enterDir = useRef<1 | -1>(1);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const currentMeta = STEP_METAS[step] ?? STEP_METAS[0]!;
  const isLast = step === TOTAL_STEPS - 1;

  const advance = () => {
    if (isLast) {
      if (settings.notifyLessonReminderMinutes > 0 || settings.notifySubstitutionChanges) {
        void ensureNotificationPermission();
      }
      onDone();
    } else {
      enterDir.current = 1;
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step === 0) {
      onBack?.();
      return;
    }
    enterDir.current = -1;
    setStep((s) => s - 1);
  };

  const onSwipeStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (touch === undefined) return;
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    setDragging(true);
  };

  const onSwipeMove = (e: TouchEvent) => {
    const start = touchStart.current;
    const touch = e.touches[0];
    if (start === null || touch === undefined) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx)) return;
    setDragX(dx);
  };

  const onSwipeEnd = () => {
    const started = touchStart.current !== null;
    touchStart.current = null;
    setDragging(false);
    if (started) {
      if (dragX <= -SWIPE_THRESHOLD_PX) {
        advance();
      } else if (dragX >= SWIPE_THRESHOLD_PX) {
        goBack();
      }
    }
    setDragX(0);
  };

  const themes: { key: Settings["theme"]; label: string }[] = [
    { key: "system", label: t("theme.system") },
    { key: "light", label: t("theme.light") },
    { key: "dark", label: t("theme.dark") },
  ];

  const radiusLabels: Record<Settings["cardRadius"], string> = {
    md: t("customization.radius.compact"),
    lg: t("customization.radius.balanced"),
    xl: t("customization.radius.standard"),
    "2xl": t("customization.radius.rounder"),
  };
  const radiusIndex = RADIUS_STEPS.indexOf(settings.cardRadius);

  const reminderOptions: { key: string; label: string }[] = [
    { key: "0", label: t("settings.notifyLessonReminderOff") },
    { key: "5", label: "5m" },
    { key: "10", label: "10m" },
    { key: "15", label: "15m" },
    { key: "30", label: "30m" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col px-gutter pb-6 pt-(--app-inset-top)">
      {/* Top navigation: back, progress, skip */}
      <header className="flex items-center justify-between pt-3 pb-2">
        <div className="w-10">
          {(step > 0 || onBack !== undefined) && (
            <IconButton
              icon="chevron-left"
              variant="bare"
              size="sm"
              label={t("onboarding.customization.back")}
              onClick={goBack}
            />
          )}
        </div>
        <span className="font-text text-micro font-bold tracking-label text-muted uppercase">
          {t("onboarding.customization.progress", { step: step + 1, total: TOTAL_STEPS })}
        </span>
        <div className="flex w-10 justify-end">
          <Button variant="ghost" size="sm" onClick={onDone}>
            {t("onboarding.customization.skip")}
          </Button>
        </div>
      </header>

      {/* Main step container with swipe & keyboard navigation */}
      <motion.div
        key={step}
        role="group"
        tabIndex={0}
        aria-label={t("onboarding.customization.progress", { step: step + 1, total: TOTAL_STEPS })}
        initial={{ opacity: 0, x: reduceMotion ? 0 : enterDir.current * 20 }}
        animate={{ opacity: 1, x: dragging ? dragX : 0 }}
        transition={{
          duration: dragging ? 0 : reduceMotion ? 0.001 : 0.24,
          ease: [0.2, 0.8, 0.2, 1],
        }}
        style={{ touchAction: "pan-y" }}
        onTouchStart={onSwipeStart}
        onTouchMove={onSwipeMove}
        onTouchEnd={onSwipeEnd}
        onTouchCancel={onSwipeEnd}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "ArrowRight") advance();
          else if (e.key === "ArrowLeft") goBack();
        }}
        className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-brand"
      >
        {/* Step header */}
        <div className="pt-2 pb-4 text-center">
          <span className="inline-block rounded-pill bg-brand-surface px-2.5 py-1 font-text text-micro font-bold tracking-label text-brand-strong uppercase">
            {t(currentMeta.badge)}
          </span>
          <h1 className="mt-2.5 font-display text-title tracking-display text-strong">
            {t(currentMeta.title)}
          </h1>
          <p className="mx-auto mt-1.5 max-w-72 font-text text-body text-muted">
            {t(currentMeta.body)}
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Step 1: Appearance & Themes (Dark/Light/System + 6 DS Accents)     */}
        {/* ------------------------------------------------------------------ */}
        {step === 0 && (
          <div className="flex flex-col gap-5 pb-4">
            {/* Live preview banner */}
            <div
              aria-hidden="true"
              className="flex flex-col gap-2 rounded-xl border border-hairline bg-card p-4 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-body font-bold text-strong">Stundio</span>
                  <Badge tone="brand">
                    {settings.appAccent === "default" ? "Classic" : settings.appAccent}
                  </Badge>
                </div>
                <SyncStatus state="synced" label="10:20" />
              </div>
              <p className="font-text text-caption text-muted">{t("customization.accent.hint")}</p>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block font-text text-caption font-bold text-strong">
                  {t("onboarding.customization.step1.themeLabel")}
                </label>
                <SegmentedTabs
                  label={t("onboarding.customization.step1.themeLabel")}
                  value={settings.theme}
                  items={themes}
                  onChange={(v) => {
                    void setTheme(v);
                  }}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-text text-caption font-bold text-strong">
                    {t("onboarding.customization.step1.accentLabel")}
                  </label>
                  {settings.appAccent !== "default" && (
                    <button
                      type="button"
                      onClick={() => {
                        void setAppAccent("default");
                      }}
                      className="cursor-pointer font-text text-micro font-bold text-link"
                    >
                      {t("customization.accent.reset")}
                    </button>
                  )}
                </div>
                <div className="-ml-2 flex items-center gap-1">
                  {SUBJECT_TONES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-label={option}
                      aria-pressed={settings.appAccent === option}
                      onClick={() => {
                        void setAppAccent(option);
                      }}
                      className="flex size-11 shrink-0 cursor-pointer items-center justify-center"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "block size-7 rounded-full transition-transform active:scale-90",
                          TONE_BG[option],
                          settings.appAccent === option && "inset-ring-2 inset-ring-strong",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Step 2: Lesson Card Design (Outline vs Filled, Radius, Elevation)   */}
        {/* ------------------------------------------------------------------ */}
        {step === 1 && (
          <div className="flex flex-col gap-5 pb-4">
            {/* Live lesson card preview */}
            <div aria-hidden="true">
              <LessonCard
                period="2"
                start="09:10"
                end="09:50"
                subject="Programmatūras izstrāde"
                tone="sky"
                status="substitute"
                room="314"
                teacher="A. Būmanis"
                filled={settings.lessonCardStyle === "filled"}
              />
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block font-text text-caption font-bold text-strong">
                  {t("onboarding.customization.step2.styleLabel")}
                </label>
                <SegmentedTabs
                  label={t("onboarding.customization.step2.styleLabel")}
                  value={settings.lessonCardStyle}
                  items={[
                    { key: "outline", label: t("customization.lessonStyle.outline") },
                    { key: "filled", label: t("customization.lessonStyle.filled") },
                  ]}
                  onChange={(v) => {
                    void setLessonCardStyle(v);
                  }}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-text text-caption font-bold text-strong">
                    {t("onboarding.customization.step2.radiusLabel")}
                  </label>
                  <span className="font-text text-caption font-bold text-muted">
                    {radiusLabels[settings.cardRadius]}
                  </span>
                </div>
                <Slider
                  label={t("onboarding.customization.step2.radiusLabel")}
                  valueText={radiusLabels[settings.cardRadius]}
                  min={0}
                  max={RADIUS_STEPS.length - 1}
                  value={radiusIndex}
                  onChange={(next: number) => {
                    const r = RADIUS_STEPS[next];
                    if (r !== undefined) void setCardRadius(r);
                  }}
                />
              </div>

              <div>
                <label className="mb-2 block font-text text-caption font-bold text-strong">
                  {t("onboarding.customization.step2.elevationLabel")}
                </label>
                <SegmentedTabs
                  label={t("onboarding.customization.step2.elevationLabel")}
                  value={settings.cardElevation}
                  items={[
                    { key: "soft", label: t("customization.elevation.soft") },
                    { key: "bold", label: t("customization.elevation.bold") },
                  ]}
                  onChange={(v) => {
                    void setCardElevation(v);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Step 3: Schedule View & Display Details (Times, Merging, Colors)    */}
        {/* ------------------------------------------------------------------ */}
        {step === 2 && (
          <div className="flex flex-col gap-4 pb-4">
            {/* Live preview */}
            <div
              aria-hidden="true"
              className="flex flex-col gap-2 rounded-xl border border-hairline bg-card p-3.5 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-md bg-brand-surface font-text text-caption font-bold text-brand-strong">
                    3
                  </span>
                  <div>
                    <span className="font-text text-body font-bold text-strong">Matemātika I</span>
                    {settings.showTime && (
                      <span className="ml-2 font-mono text-micro text-muted">10:00 – 10:40</span>
                    )}
                  </div>
                </div>
                {settings.subjectColorCodingEnabled && (
                  <span className="size-3 rounded-full bg-amber" />
                )}
              </div>
            </div>

            {/* Toggle settings */}
            <Card radius="lg" className="flex flex-col divide-y divide-hairline p-0">
              <div className="flex items-center justify-between p-3.5">
                <div className="pr-3">
                  <p className="font-text text-body font-bold text-strong">
                    {t("onboarding.customization.step3.showTime")}
                  </p>
                  <p className="mt-0.5 font-text text-caption text-muted">
                    {t("settings.showTimeHint")}
                  </p>
                </div>
                <Switch
                  aria-label={t("onboarding.customization.step3.showTime")}
                  checked={settings.showTime}
                  onChange={(checked) => {
                    void setShowTime(checked);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div className="pr-3">
                  <p className="font-text text-body font-bold text-strong">
                    {t("onboarding.customization.step3.mergeLessons")}
                  </p>
                  <p className="mt-0.5 font-text text-caption text-muted">
                    {t("settings.mergeLessonsHint")}
                  </p>
                </div>
                <Switch
                  aria-label={t("onboarding.customization.step3.mergeLessons")}
                  checked={settings.mergeConsecutiveLessons}
                  onChange={(checked) => {
                    void setMergeConsecutiveLessons(checked);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div className="pr-3">
                  <p className="font-text text-body font-bold text-strong">
                    {t("onboarding.customization.step3.colorCoding")}
                  </p>
                  <p className="mt-0.5 font-text text-caption text-muted">
                    {t("customization.subjectColors.enabled.hint")}
                  </p>
                </div>
                <Switch
                  aria-label={t("onboarding.customization.step3.colorCoding")}
                  checked={settings.subjectColorCodingEnabled}
                  onChange={(checked) => {
                    void setSubjectColorCodingEnabled(checked);
                  }}
                />
              </div>
            </Card>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Step 4: Smart Notifications & Special Superpowers                   */}
        {/* ------------------------------------------------------------------ */}
        {step === 3 && (
          <div className="flex flex-col gap-4 pb-4">
            {/* Notification controls */}
            <div>
              <label className="mb-2 block font-text text-caption font-bold text-strong">
                {t("onboarding.customization.step4.reminderLabel")}
              </label>
              <SegmentedTabs
                label={t("onboarding.customization.step4.reminderLabel")}
                value={String(settings.notifyLessonReminderMinutes)}
                items={reminderOptions}
                onChange={(val) => {
                  const mins = Number(val);
                  void setNotifyLessonReminderMinutes(mins);
                  if (mins > 0) void ensureNotificationPermission();
                }}
              />
            </div>

            <Card radius="lg" className="flex items-center justify-between p-3.5">
              <div className="pr-3">
                <p className="font-text text-body font-bold text-strong">
                  {t("onboarding.customization.step4.substitutionLabel")}
                </p>
                <p className="mt-0.5 font-text text-caption text-muted">
                  {t("settings.notifySubstitutionChangesHint")}
                </p>
              </div>
              <Switch
                aria-label={t("onboarding.customization.step4.substitutionLabel")}
                checked={settings.notifySubstitutionChanges}
                onChange={(checked) => {
                  void setNotifySubstitutionChanges(checked);
                  if (checked) void ensureNotificationPermission();
                }}
              />
            </Card>

            {/* Special features showcase list */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start gap-3 rounded-lg border border-hairline bg-card p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-surface text-brand-strong">
                  <Icon name="wifi-off" size={18} />
                </div>
                <div>
                  <p className="font-text text-body font-bold text-strong">
                    {t("onboarding.customization.step4.offlineTitle")}
                  </p>
                  <p className="font-text text-caption text-muted">
                    {t("onboarding.customization.step4.offlineBody")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-hairline bg-card p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-surface text-brand-strong">
                  <Icon name="layout-grid" size={18} />
                </div>
                <div>
                  <p className="font-text text-body font-bold text-strong">
                    {t("onboarding.customization.step4.widgetTitle")}
                  </p>
                  <p className="font-text text-caption text-muted">
                    {t("onboarding.customization.step4.widgetBody")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-hairline bg-card p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-surface text-brand-strong">
                  <Icon name="share-2" size={18} />
                </div>
                <div>
                  <p className="font-text text-body font-bold text-strong">
                    {t("onboarding.customization.step4.shareTitle")}
                  </p>
                  <p className="font-text text-caption text-muted">
                    {t("onboarding.customization.step4.shareBody")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Step 5: Direct Messaging & Feedback to Developer in Settings       */}
        {/* ------------------------------------------------------------------ */}
        {step === 4 && (
          <div className="flex flex-col gap-4 pb-4">
            {/* Feedback and Bug Report Cards */}
            <Card radius="lg" className="flex flex-col divide-y divide-hairline p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-surface text-brand-strong">
                    <Icon name="triangle-alert" size={16} />
                  </div>
                  <div>
                    <p className="font-text text-body font-bold text-strong">
                      {t("onboarding.customization.step5.reportTitle")}
                    </p>
                    <p className="mt-0.5 font-text text-caption text-muted">
                      {t("onboarding.customization.step5.reportBody")}
                    </p>
                  </div>
                </div>
                <Button size="sm" icon="triangle-alert" asChild disabled>
                  <a target="_blank" rel="noreferrer">
                    {t("settings.reportIssueAction")}
                  </a>
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-surface text-brand-strong">
                    <Icon name="plus" size={16} />
                  </div>
                  <div>
                    <p className="font-text text-body font-bold text-strong">
                      {t("onboarding.customization.step5.suggestTitle")}
                    </p>
                    <p className="mt-0.5 font-text text-caption text-muted">
                      {t("onboarding.customization.step5.suggestBody")}
                    </p>
                  </div>
                </div>
                <Button size="sm" icon="plus" asChild disabled>
                  <a
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("settings.suggestFeatureAction")}
                  </a>
                </Button>
              </div>
            </Card>

            {/* Location in settings hint banner */}
            <div className="flex items-center gap-3 rounded-lg border border-hairline bg-card p-3 shadow-card">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-surface text-brand-strong">
                <Icon name="settings" size={18} />
              </div>
              <p className="font-text text-caption text-strong">
                {t("onboarding.customization.step5.settingsHint")}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Step progress pills */}
      <div
        className="flex items-center justify-center gap-2 py-4"
        role="tablist"
        aria-label={t("onboarding.customization.progress", { step: step + 1, total: TOTAL_STEPS })}
      >
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === step}
            aria-label={t("onboarding.customization.progress", { step: i + 1, total: TOTAL_STEPS })}
            onClick={() => {
              enterDir.current = i > step ? 1 : -1;
              setStep(i);
            }}
            className={`h-2 cursor-pointer rounded-pill transition-[width] duration-(--dur-fast) ${
              i === step ? "w-6 bg-strong" : "w-2 bg-strong-border"
            }`}
          />
        ))}
      </div>

      {/* Action button */}
      <Button block size="lg" onClick={advance}>
        {isLast ? t("onboarding.customization.finish") : t("onboarding.customization.next")}
      </Button>
    </div>
  );
};
