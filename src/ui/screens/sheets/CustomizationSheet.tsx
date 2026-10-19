import { useState, type CSSProperties, type ReactNode } from "react";
import { LessonCard } from "@/ds/components/ui/lesson-card.tsx";
import { BottomSheet, Button, ColorWheel, SegmentedTabs, Switch, cn, Slider } from "@/ds";
import { useAppStore, useSettingSetter } from "@/store";
import type { Settings, SubjectColorValue } from "@/db";
import type { ClassRef, SubjectRef } from "@/lib/edupage";
import {
  SUBJECT_TONES,
  SUBJECT_TONE_BG,
  groupToneKey,
  overrideAccent,
  subjectAccent,
  subjectToneKey,
  type SubjectAccent,
} from "@/ui/theme";
import { useT } from "@/ui/i18n";
import { usePersona } from "@/ui/persona";
import { useSubjects } from "../../hooks/useSubjects.ts";
import { Row, Section, SheetDescription, SheetTitle } from "../settings-view";

/** The Card component's own four radius steps, softest to roundest. */
const RADIUS_STEPS = ["md", "lg", "xl", "2xl"] as const;

/**
 * The teacher preview's heading: a group and a room, as `lessonHeading` builds it. School data is
 * never translated (AGENT.md), so this sample stays a literal rather than an i18n key.
 */
const TEACHER_PREVIEW_HEADING = "A1-2 · 214";

/** The default colour the wheel opens to for a subject that has never had a custom pick. */
const DEFAULT_WHEEL_COLOR = "#3d7bf5";

/**
 * One round colour option. Selection is an outer ring offset from the dot rather than an inset
 * ring, so it reads on every fill — including the near-black "default" accent dot, where an inset
 * `ring-strong` would vanish into the fill. The 44px hit area is the button; the dot is 26px.
 */
const Swatch = ({
  label,
  pressed,
  onClick,
  className,
  style,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
}) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={pressed}
    onClick={onClick}
    className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-pill"
  >
    <span
      aria-hidden="true"
      className={cn(
        "block size-6.5 rounded-pill transition-shadow duration-(--dur-fast) ease-(--ease-standard)",
        pressed && "ring-2 ring-strong ring-offset-2 ring-offset-card",
        className,
      )}
      {...(style === undefined ? {} : { style })}
    />
  </button>
);

/**
 * A row of swatches spread across the card's full width. The negative margin pulls the first and
 * last 44px hit areas out by the 9px they pad around their 26px dot, so the dots themselves line
 * up with the row's text edge instead of sitting indented from it.
 */
const SwatchRow = ({ children }: { children: ReactNode }) => (
  <div className="-mx-2.25 flex items-center justify-between">{children}</div>
);

/** The small text action beside a picker's heading — "Auto" / "Default". */
const ResetAction = ({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "-my-3 -mr-2.5 flex h-11 shrink-0 cursor-pointer items-center rounded-pill px-2.5",
      "font-text text-caption font-bold text-strong underline decoration-dotted underline-offset-4",
      "disabled:cursor-default disabled:text-muted disabled:no-underline disabled:opacity-60",
    )}
  >
    {children}
  </button>
);

/**
 * One accent picker: the six DS tones (their own contrast-checked ink pair), a free `ColorWheel`
 * circle for "any RGB colour" — the product decision behind this control — and a reset back to
 * the automatic colour.
 *
 * A wheel pick trades the DS's guaranteed 4.5:1 contrast for the computed-on-the-fly ink in
 * `ui/theme/colors.ts`: every render call site (`Card`, `LessonCard`, `WeekGrid`, the shared week
 * image) already knows how to carry that pair through, so this is the only place a custom colour
 * is actually chosen. `accent` is `null` when the row has no colour of its own yet — a group
 * with no override follows its lessons' subjects, so no swatch reads as selected.
 */
const ColorRow = ({
  label,
  accent,
  isOverridden,
  onPick,
}: {
  label: string;
  accent: SubjectAccent | null;
  isOverridden: boolean;
  onPick: (value: SubjectColorValue | null) => void;
}) => {
  const t = useT();
  const custom = accent?.tone === "custom" ? accent : null;
  const [wheelOpen, setWheelOpen] = useState(false);

  return (
    <div data-color-row="">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="min-w-0 font-text text-body font-bold text-strong">{label}</p>
        <ResetAction
          disabled={!isOverridden}
          onClick={() => {
            setWheelOpen(false);
            onPick(null);
          }}
        >
          {t("customization.subjectColors.reset")}
        </ResetAction>
      </div>
      <SwatchRow>
        {SUBJECT_TONES.map((option) => (
          <Swatch
            key={option}
            label={option}
            pressed={custom === null && accent?.tone === option}
            className={SUBJECT_TONE_BG[option]}
            onClick={() => {
              setWheelOpen(false);
              onPick(option);
            }}
          />
        ))}
        <Swatch
          label={t("customization.subjectColors.custom")}
          pressed={custom !== null}
          style={{
            background:
              custom?.fill ?? "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
          }}
          onClick={() => {
            setWheelOpen((open) => custom === null || !open);
            if (custom === null) onPick(DEFAULT_WHEEL_COLOR);
          }}
        />
      </SwatchRow>

      {wheelOpen && custom !== null && (
        <div className="mt-3 mb-1">
          <ColorWheel
            value={custom.fill}
            onChange={(hex) => {
              onPick(hex);
            }}
            label={t("customization.subjectColors.custom")}
            lightnessLabel={t("customization.subjectColors.lightness")}
          />
        </div>
      )}
    </div>
  );
};

const SubjectColorRow = ({ label, subject }: { label: string; subject: SubjectRef }) => {
  const overrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const setOverride = useAppStore((s) => s.setSubjectColorOverride);
  const tokenKey = subjectToneKey(subject);

  return (
    <ColorRow
      label={label}
      accent={subjectAccent(subject, overrides)}
      isOverridden={overrides[tokenKey] !== undefined}
      onPick={(value) => {
        void setOverride(tokenKey, value);
      }}
    />
  );
};

/**
 * A teacher's group picker. The accent is the group's own override, read through the same
 * `overrideAccent` that `lessonAccent` applies, so the swatch shown is exactly what that group's
 * cards will render in.
 */
const GroupColorRow = ({ group }: { group: ClassRef }) => {
  const overrides = useAppStore((s) => s.settings.groupColorOverrides);
  const setOverride = useAppStore((s) => s.setGroupColorOverride);
  const tokenKey = groupToneKey(group);

  return (
    <ColorRow
      label={group.short || group.name}
      accent={overrideAccent(overrides[tokenKey])}
      isOverridden={overrides[tokenKey] !== undefined}
      onPick={(value) => {
        void setOverride(tokenKey, value);
      }}
    />
  );
};

/**
 * The app-wide accent picker: the same six DS tones as the subject picker, plus `"default"` — the
 * DS's own ink-based emphasis colour, unchanged from before this setting existed — offered as the
 * first swatch rather than a disabled text reset, because it is a choice like the others and
 * should show as selected when it is the one in effect. Lives at `Settings.appAccent`; applied
 * globally by `useCustomization`, never at a call site.
 */
const AppAccentRow = () => {
  const t = useT();
  const appAccent = useAppStore((s) => s.settings.appAccent);
  const setAppAccent = useSettingSetter("appAccent");

  return (
    <Row>
      <div data-color-row="">
        <p className="mb-2 font-text text-caption text-muted">{t("customization.accent.hint")}</p>
        <SwatchRow>
          {/* `bg-strong` is the ink the "default" accent resolves to in either theme. */}
          <Swatch
            label={t("customization.accent.reset")}
            pressed={appAccent === "default"}
            className="bg-strong"
            onClick={() => {
              void setAppAccent("default");
            }}
          />
          {SUBJECT_TONES.map((option) => (
            <Swatch
              key={option}
              label={option}
              pressed={appAccent === option}
              className={SUBJECT_TONE_BG[option]}
              onClick={() => {
                void setAppAccent(option);
              }}
            />
          ))}
        </SwatchRow>
      </div>
    </Row>
  );
};

/**
 * Every segmented control in this sheet spans the card, so their tracks line up row to row. The
 * segments grow from their label width (not an equal `flex-1` split) and never wrap: "Kā sistēmā"
 * is wider than a third of the track at 390px.
 */
const FULL_WIDTH_TABS = "flex w-full [&>button]:grow [&>button]:whitespace-nowrap";

/**
 * "Customization" — the sheet opened from Settings.
 *
 * Every option here is one of the Studio DS's own pre-approved values (a token, a documented
 * component variant), never a free color or size picker: the design stays recognizably Stundio
 * whatever combination someone picks (see the design discussion this screen came out of).
 * Theme, radius, and depth apply globally through `useCustomization`/`useTheme`, so the live
 * preview below is just the real components rendered here — no separate preview plumbing needed.
 *
 * The role shapes the sheet through `PERSONA_PROFILES[…].customization`: a teacher's preview card
 * leads with the group and room like their day list does, and the subject-colour copy talks about
 * the subjects they teach rather than a class's. A teacher also gets per-group colours: several
 * groups taking the same subject would otherwise all look alike on their day.
 */
export const CustomizationSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const setTheme = useSettingSetter("theme");
  const setLessonCardStyle = useSettingSetter("lessonCardStyle");
  const setCardRadius = useSettingSetter("cardRadius");
  const setCardElevation = useSettingSetter("cardElevation");
  const setReduceMotion = useSettingSetter("reduceMotion");
  const setSubjectColorCodingEnabled = useSettingSetter("subjectColorCodingEnabled");
  const resetCustomization = useAppStore((s) => s.resetCustomization);
  const { subjects, groups } = useSubjects();
  const { customization } = usePersona().profile;

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
      title={<SheetTitle icon="palette">{t("customization.title")}</SheetTitle>}
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
      <SheetDescription>{t("settings.customizationHint")}</SheetDescription>

      <Section title={t("customization.theme")}>
        <Row>
          <SegmentedTabs
            label={t("customization.theme")}
            value={settings.theme}
            items={themes}
            onChange={(value) => {
              void setTheme(value);
            }}
            className={FULL_WIDTH_TABS}
          />
        </Row>
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

      <Section title={t("customization.accent")}>
        <AppAccentRow />
      </Section>

      <Section title={t("customization.lessonStyle")}>
        <Row>
          <p className="mb-2.5 font-text text-caption text-muted">
            {t("customization.lessonStyle.hint")}
          </p>
          <div className="mb-5">
            <LessonCard
              period="3"
              start="10:20"
              end="11:00"
              {...(customization.previewLeadsWith === "group"
                ? { subject: TEACHER_PREVIEW_HEADING, subtitle: t("customization.preview.subject") }
                : { subject: t("customization.preview.subject") })}
              tone="sky"
              filled={settings.lessonCardStyle === "filled"}
            />
          </div>
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
            className={FULL_WIDTH_TABS}
          />
        </Row>
      </Section>

      <Section title={t("customization.radius")}>
        <Row>
          {/* The section heading already names the setting; the row only states its value. */}
          <p className="mb-1 font-text text-body font-bold text-strong">
            {radiusLabels[settings.cardRadius]}
          </p>
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
            className={FULL_WIDTH_TABS}
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
                {t(customization.subjectColorsEmpty)}
              </p>
            </Row>
          ) : (
            <>
              <Row>
                <p className="font-text text-caption text-muted">
                  {t(customization.subjectColorsHint)}
                </p>
              </Row>
              {subjects.map(({ subject }) => (
                <Row key={subject.id}>
                  <SubjectColorRow label={subject.name || subject.short} subject={subject} />
                </Row>
              ))}
            </>
          ))}
      </Section>

      {/* Hidden while colour-coding is off for the same reason as the subject list above. */}
      {customization.groupColors && settings.subjectColorCodingEnabled && (
        <Section title={t("customization.groupColors")}>
          {groups.length === 0 ? (
            <Row>
              <p className="font-text text-caption text-muted">
                {t("customization.groupColors.empty")}
              </p>
            </Row>
          ) : (
            <>
              <Row>
                <p className="font-text text-caption text-muted">
                  {t("customization.groupColors.hint")}
                </p>
              </Row>
              {groups.map((group) => (
                <Row key={groupToneKey(group)}>
                  <GroupColorRow group={group} />
                </Row>
              ))}
            </>
          )}
        </Section>
      )}
    </BottomSheet>
  );
};
