import { useState } from "react";
import { LessonCard } from "@/ds/components/ui/lesson-card";
import { BottomSheet, Button, ColorWheel, SegmentedTabs, Switch, cn, Slider } from "@/ds";
import { useAppStore } from "@/store";
import type { Settings, SubjectColorTone } from "@/db";
import type { SubjectRef } from "@/lib/edupage";
import { SUBJECT_TONES, subjectAccent, subjectToneKey } from "@/ui/theme";
import { useT } from "@/ui/i18n";
import { useSubjects } from "../hooks/useSubjects.ts";
import { Row, Section } from "./SettingsView.tsx";

/** The Card component's own four radius steps, softest to roundest. */
const RADIUS_STEPS = ["md", "lg", "xl", "2xl"] as const;

const TONE_BG: Record<SubjectColorTone, string> = {
  amber: "bg-amber",
  sky: "bg-sky",
  lilac: "bg-lilac",
  pink: "bg-pink",
  mint: "bg-mint",
  lime: "bg-lime",
};

/** The default colour the wheel opens to for a subject that has never had a custom pick. */
const DEFAULT_WHEEL_COLOR = "#3d7bf5";

/**
 * One subject's accent picker: the six DS tones (their own contrast-checked ink pair), a free
 * `ColorWheel` circle for "any RGB colour" — the product decision behind this control — and a
 * reset back to the auto-assigned tone.
 *
 * A wheel pick trades the DS's guaranteed 4.5:1 contrast for `subjectAccent`'s computed-on-the-fly
 * ink (`ui/theme/colors.ts`): every render call site (`Card`, `LessonCard`, `WeekGrid`, the shared
 * week image) already knows how to carry that pair through, so this is the only place a custom
 * colour is actually chosen.
 */
const SubjectColorRow = ({
  label,
  tokenKey,
  subject,
}: {
  label: string;
  tokenKey: string;
  subject: SubjectRef;
}) => {
  const t = useT();
  const overrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const setOverride = useAppStore((s) => s.setSubjectColorOverride);
  const accent = subjectAccent(subject, overrides);
  const isCustom = accent.tone === "custom";
  const isOverridden = overrides[tokenKey] !== undefined;
  const [wheelOpen, setWheelOpen] = useState(false);

  return (
    <div className="py-1">
      <p className="mb-1 font-text text-caption font-bold text-strong">{label}</p>
      <div className="-ml-2.5 flex items-center">
        {SUBJECT_TONES.map((option) => (
          <button
            key={option}
            type="button"
            aria-label={option}
            aria-pressed={!isCustom && accent.tone === option}
            onClick={() => {
              setWheelOpen(false);
              void setOverride(tokenKey, option);
            }}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center"
          >
            <span
              aria-hidden="true"
              className={cn(
                "block size-6.5 rounded-full",
                TONE_BG[option],
                !isCustom && accent.tone === option && "inset-ring-2 inset-ring-strong",
              )}
            />
          </button>
        ))}
        <button
          type="button"
          aria-label={t("customization.subjectColors.custom")}
          aria-pressed={isCustom}
          onClick={() => {
            setWheelOpen((open) => !isCustom || !open);
            if (!isCustom) void setOverride(tokenKey, DEFAULT_WHEEL_COLOR);
          }}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center"
        >
          <span
            aria-hidden="true"
            className={cn(
              "block size-6.5 rounded-full",
              isCustom && "inset-ring-2 inset-ring-strong",
            )}
            style={{
              background: isCustom
                ? accent.fill
                : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
            }}
          />
        </button>
        <button
          type="button"
          disabled={!isOverridden}
          onClick={() => {
            setWheelOpen(false);
            void setOverride(tokenKey, null);
          }}
          className="ml-1 flex h-11 shrink-0 items-center px-2.5 font-text text-micro font-bold text-muted decoration-dotted disabled:opacity-30 disabled:no-underline"
        >
          {t("customization.subjectColors.reset")}
        </button>
      </div>

      {wheelOpen && isCustom && (
        <div className="mt-3 mb-1">
          <ColorWheel
            value={accent.fill}
            onChange={(hex) => {
              void setOverride(tokenKey, hex);
            }}
            label={t("customization.subjectColors.custom")}
            lightnessLabel={t("customization.subjectColors.lightness")}
          />
        </div>
      )}
    </div>
  );
};

/**
 * The app-wide accent picker: the same six DS tones as the subject picker, plus a reset to
 * `"default"` — the DS's own ink-based emphasis colour, unchanged from before this setting
 * existed. Lives at `Settings.appAccent`; applied globally by `useCustomization`, never at a
 * call site.
 */
const AppAccentRow = () => {
  const t = useT();
  const appAccent = useAppStore((s) => s.settings.appAccent);
  const setAppAccent = useAppStore((s) => s.setAppAccent);

  return (
    <Row>
      <p className="mb-2.5 font-text text-caption text-muted">{t("customization.accent.hint")}</p>
      <div className="-ml-2.5 flex items-center">
        {SUBJECT_TONES.map((option) => (
          <button
            key={option}
            type="button"
            aria-label={option}
            aria-pressed={appAccent === option}
            onClick={() => {
              void setAppAccent(option);
            }}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center"
          >
            <span
              aria-hidden="true"
              className={cn(
                "block size-6.5 rounded-full",
                TONE_BG[option],
                appAccent === option && "inset-ring-2 inset-ring-strong",
              )}
            />
          </button>
        ))}
        <button
          type="button"
          disabled={appAccent === "default"}
          onClick={() => {
            void setAppAccent("default");
          }}
          className="ml-1 flex h-11 shrink-0 items-center px-2.5 font-text text-micro font-bold text-muted decoration-dotted disabled:opacity-30 disabled:no-underline"
        >
          {t("customization.accent.reset")}
        </button>
      </div>
    </Row>
  );
};

/**
 * "Customization" — the sheet opened from Settings.
 *
 * Every option here is one of the Studio DS's own pre-approved values (a token, a documented
 * component variant), never a free color or size picker: the design stays recognizably Stundio
 * whatever combination someone picks (see the design discussion this screen came out of).
 * Theme, radius, and depth apply globally through `useCustomization`/`useTheme`, so the live
 * preview below is just the real components rendered here — no separate preview plumbing needed.
 */
export const CustomizationSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const setTheme = useAppStore((s) => s.setTheme);
  const setLessonCardStyle = useAppStore((s) => s.setLessonCardStyle);
  const setCardRadius = useAppStore((s) => s.setCardRadius);
  const setCardElevation = useAppStore((s) => s.setCardElevation);
  const setReduceMotion = useAppStore((s) => s.setReduceMotion);
  const setSubjectColorCodingEnabled = useAppStore((s) => s.setSubjectColorCodingEnabled);
  const resetCustomization = useAppStore((s) => s.resetCustomization);
  const { subjects } = useSubjects();

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

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("customization.title")}
      footer={
        <Button
          variant="outline"
          size="sm"
          block
          onClick={() => {
            void resetCustomization();
          }}
        >
          {t("customization.reset")}
        </Button>
      }
    >
      <div className="no-scrollbar max-h-[75vh] overflow-y-auto overscroll-contain">
        <div className="mb-5">
          <LessonCard
            period="3"
            start="10:20"
            end="11:00"
            subject={t("customization.preview.subject")}
            tone="sky"
            filled={settings.lessonCardStyle === "filled"}
          />
        </div>

        <Section title={t("customization.theme")}>
          <Row>
            <SegmentedTabs
              label={t("customization.theme")}
              value={settings.theme}
              items={themes}
              onChange={(value) => {
                void setTheme(value);
              }}
            />
          </Row>
        </Section>

        <Section title={t("customization.accent")}>
          <AppAccentRow />
        </Section>

        <Section title={t("customization.lessonStyle")}>
          <Row>
            <p className="mb-2.5 font-text text-caption text-muted">
              {t("customization.lessonStyle.hint")}
            </p>
            <SegmentedTabs
              label={t("customization.lessonStyle")}
              value={settings.lessonCardStyle}
              items={[
                { key: "outline", label: t("customization.lessonStyle.outline") },
                { key: "filled", label: t("customization.lessonStyle.filled") },
              ]}
              onChange={(value) => {
                void setLessonCardStyle(value);
              }}
            />
          </Row>
        </Section>

        <Section title={t("customization.radius")}>
          <Row>
            <div className="mb-2.5 flex items-center justify-between">
              <p className="font-text text-caption text-muted">{t("customization.radius")}</p>
              <p className="font-text text-caption font-bold text-strong">
                {radiusLabels[settings.cardRadius]}
              </p>
            </div>
            <Slider
              label={t("customization.radius")}
              valueText={radiusLabels[settings.cardRadius]}
              min={0}
              max={RADIUS_STEPS.length - 1}
              value={radiusIndex}
              onChange={(next: number) => {
                const step = RADIUS_STEPS[next];

                if (step !== undefined) {
                  void setCardRadius(step);
                }
              }}
            />
          </Row>
        </Section>

        <Section title={t("customization.elevation")}>
          <Row>
            <SegmentedTabs
              label={t("customization.elevation")}
              value={settings.cardElevation}
              items={[
                { key: "soft", label: t("customization.elevation.soft") },
                { key: "bold", label: t("customization.elevation.bold") },
              ]}
              onChange={(value) => {
                void setCardElevation(value);
              }}
            />
          </Row>
        </Section>

        <Section title={t("customization.reduceMotion")}>
          <Row className="flex items-start justify-between gap-3">
            <div>
              <p className="font-text text-body font-bold text-strong">
                {t("customization.reduceMotion")}
              </p>
              <p className="mt-0.5 font-text text-caption text-muted">
                {t("customization.reduceMotion.hint")}
              </p>
            </div>
            <Switch
              aria-label={t("customization.reduceMotion")}
              checked={settings.reduceMotion}
              onChange={(checked) => {
                void setReduceMotion(checked);
              }}
            />
          </Row>
        </Section>

        <Section title={t("customization.subjectColors")}>
          <Row className="flex items-start justify-between gap-3">
            <div>
              <p className="font-text text-body font-bold text-strong">
                {t("customization.subjectColors.enabled")}
              </p>
              <p className="mt-0.5 font-text text-caption text-muted">
                {t("customization.subjectColors.enabled.hint")}
              </p>
            </div>
            <Switch
              aria-label={t("customization.subjectColors.enabled")}
              checked={settings.subjectColorCodingEnabled}
              onChange={(checked) => {
                void setSubjectColorCodingEnabled(checked);
              }}
            />
          </Row>

          {/*
           * Off, the per-subject list is hidden rather than left visible-but-inert: every one of
           * these picks writes a `subjectColorOverrides` entry that `subjectTone` ignores while
           * colour-coding is off (`ui/theme/colors.ts`), so showing it here would look live and
           * do nothing.
           */}
          {settings.subjectColorCodingEnabled &&
            (subjects.length === 0 ? (
              <Row>
                <p className="font-text text-caption text-muted">
                  {t("customization.subjectColors.empty")}
                </p>
              </Row>
            ) : (
              <>
                <Row>
                  <p className="font-text text-caption text-muted">
                    {t("customization.subjectColors.hint")}
                  </p>
                </Row>
                {subjects.map(({ subject }) => (
                  <Row key={subject.id}>
                    <SubjectColorRow
                      label={subject.name || subject.short}
                      tokenKey={subjectToneKey(subject)}
                      subject={subject}
                    />
                  </Row>
                ))}
              </>
            ))}
        </Section>
      </div>
    </BottomSheet>
  );
};
