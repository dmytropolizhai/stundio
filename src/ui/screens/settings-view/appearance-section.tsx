import { useId, useState } from "react";
import { cn, ThemePicker, type ThemePickerOption } from "@/ds";
import type { Settings } from "@/db";
import { useAppStore, useSettingSetter } from "@/store";
import { useSubjects } from "@/ui/hooks/useSubjects.ts";
import { LANGS, LANG_NAMES, useT } from "@/ui/i18n";
import { SUBJECT_TONES, SUBJECT_TONE_BG, subjectAccent, subjectTone } from "@/ui/theme";
import { Section } from "./settings-section.tsx";
import { usePersona } from "@/ui/persona";
import { SettingsRow } from "./settings-row.tsx";
import { ChoiceSheet } from "./settings-sheet.tsx";

const PREVIEW_COUNT = 3;

/**
 * The customization row's value: the first few subjects in the colour they actually render in.
 * These are subject colours on purpose — the row is where subject colours are chosen — so the
 * Index Rule is kept rather than bent.
 */
const SubjectSwatches = () => {
  const { subjects } = useSubjects();
  const overrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const enabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);

  const accents =
    subjects.length > 0
      ? subjects.slice(0, PREVIEW_COUNT).map((s) => subjectAccent(s.subject, overrides, enabled))
      : // No timetable cached yet: the first tones, collapsed the way `subjectAccent` collapses
        // every subject when colour-coding is off.
        SUBJECT_TONES.slice(0, PREVIEW_COUNT).map((tone) => ({
          tone: enabled ? tone : subjectTone(null, {}, false),
        }));

  return (
    <span aria-hidden="true" className="flex">
      {accents.map((accent, i) => (
        <span
          key={i}
          className={cn(
            "block size-3.5 rounded-pill ring-2 ring-card not-first:-ml-1",
            accent.tone !== "custom" && SUBJECT_TONE_BG[accent.tone],
          )}
          {...(accent.tone === "custom" ? { style: { backgroundColor: accent.fill } } : {})}
        />
      ))}
    </span>
  );
};

type AppearanceSectionProps = {
  onOpenCustomization: () => void;
};

export const AppearanceSection = ({ onOpenCustomization }: AppearanceSectionProps) => {
  const t = useT();
  const theme = useAppStore((s) => s.settings.theme);
  const lang = useAppStore((s) => s.settings.lang);
  const setTheme = useSettingSetter("theme");
  const setLang = useSettingSetter("lang");
  const settings = useAppStore((s) => s.settings);
  const setShowTime = useSettingSetter("showTime");
  const setWeatherEnabled = useAppStore((s) => s.setWeatherEnabled);
  const setShowSubjectsTab = useSettingSetter("showSubjectsTab");
  const setShowTransitTab = useSettingSetter("showTransitTab");
  const { profile } = usePersona();
  // A role whose nav lacks a tab (a teacher has no Subjects) is not offered its switch.
  const hasSubjectsTab = profile.nav.personal.includes("subjects");
  const hasTransitTab = profile.nav.personal.includes("transit");
  const [languageOpen, setLanguageOpen] = useState(false);
  const hintId = useId();

  // Night is the signature theme, but "follow the phone" stays first: it is the default.
  const themeOptions: readonly ThemePickerOption<Settings["theme"]>[] = [
    { key: "system", label: t("theme.system"), preview: "split" },
    { key: "light", label: t("theme.light"), preview: "light" },
    { key: "dark", label: t("theme.dark"), preview: "dark" },
  ];

  return (
    <Section title={t("settings.group.appearance")}>
      <div>
        <p id={hintId} className="sr-only">
          {t("settings.themeHint")}
        </p>
        <ThemePicker
          label={t("settings.theme")}
          aria-describedby={hintId}
          options={themeOptions}
          value={theme}
          onChange={(value) => void setTheme(value)}
          className="pt-3"
        />
      </div>
      <SettingsRow
        icon="globe"
        label={t("settings.language")}
        description={t("settings.languageHint")}
        quiet
        value={lang.toUpperCase()}
        onClick={() => setLanguageOpen(true)}
      />
      <SettingsRow
        icon="palette"
        label={t("settings.customization")}
        description={t("settings.customizationHint")}
        quiet
        value={<SubjectSwatches />}
        onClick={onOpenCustomization}
      />
      <SettingsRow
        icon="clock"
        label={t("settings.showTime")}
        description={t("settings.showTimeHint")}
        quiet
        checked={settings.showTime}
        onCheckedChange={(checked) => void setShowTime(checked)}
      />
      <SettingsRow
        icon="cloud-sun"
        label={t("settings.weather")}
        description={t("settings.weatherHint")}
        quiet
        checked={settings.weatherEnabled}
        onCheckedChange={(checked) => void setWeatherEnabled(checked)}
      />
      {hasSubjectsTab && (
        <SettingsRow
          icon="panel-bottom"
          label={t("settings.showSubjectsTab")}
          description={t("settings.showSubjectsTabHint")}
          quiet
          checked={settings.showSubjectsTab}
          onCheckedChange={(checked) => void setShowSubjectsTab(checked)}
        />
      )}
      {hasTransitTab && (
        <SettingsRow
          icon="bus-front"
          label={t("settings.showTransitTab")}
          description={t("settings.showTransitTabHint")}
          quiet
          checked={settings.showTransitTab}
          onCheckedChange={(checked) => void setShowTransitTab(checked)}
        />
      )}

      <ChoiceSheet
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
        icon="globe"
        title={t("settings.language")}
        description={t("settings.languageHint")}
        options={LANGS.map((key) => ({
          key,
          label: LANG_NAMES[key],
          detail: key.toUpperCase(),
        }))}
        value={lang}
        onChange={(value) => void setLang(value)}
      />
    </Section>
  );
};
