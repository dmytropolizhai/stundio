import { useState } from "react";
import { cn, type IconName } from "@/ds";
import type { Settings } from "@/db";
import { useAppStore } from "@/store";
import { useSubjects } from "@/ui/hooks/useSubjects.ts";
import { LANGS, LANG_NAMES, useT } from "@/ui/i18n";
import { SUBJECT_TONES, subjectAccent, type SubjectAccent, type SubjectTone } from "@/ui/theme";
import { Section } from "./settings-section.tsx";
import { SettingsRow } from "./settings-row.tsx";
import { ChoiceSheet } from "./settings-sheet.tsx";

/** The theme row's glyph is the theme itself, so its state reads without the value text. */
const THEME_ICONS: Record<Settings["theme"], IconName> = {
  system: "sun-moon",
  light: "sun",
  dark: "moon",
};

const TONE_BG = {
  amber: "bg-amber",
  sky: "bg-sky",
  lilac: "bg-lilac",
  pink: "bg-pink",
  mint: "bg-mint",
  lime: "bg-lime",
} as const;

const PREVIEW_COUNT = 3;

const subjectAccentFor = (tone: SubjectTone, enabled: boolean): SubjectAccent =>
  enabled ? { tone } : subjectAccent(null, {}, false);

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
        SUBJECT_TONES.slice(0, PREVIEW_COUNT).map((tone) => subjectAccentFor(tone, enabled));

  return (
    <span aria-hidden="true" className="flex">
      {accents.map((accent, i) => (
        <span
          key={i}
          className={cn(
            "block size-3.5 rounded-pill ring-2 ring-card not-first:-ml-1",
            accent.tone !== "custom" && TONE_BG[accent.tone],
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
  const setTheme = useAppStore((s) => s.setTheme);
  const setLang = useAppStore((s) => s.setLang);
  const [sheet, setSheet] = useState<"theme" | "language" | null>(null);

  const themeLabels: Record<Settings["theme"], string> = {
    system: t("theme.system"),
    light: t("theme.light"),
    dark: t("theme.dark"),
  };

  return (
    <Section title={t("settings.group.appearance")}>
      <SettingsRow
        icon={THEME_ICONS[theme]}
        label={t("settings.theme")}
        description={t("settings.themeHint")}
        value={themeLabels[theme]}
        onClick={() => setSheet("theme")}
      />
      <SettingsRow
        icon="globe"
        label={t("settings.language")}
        description={t("settings.languageHint")}
        value={lang.toUpperCase()}
        onClick={() => setSheet("language")}
      />
      <SettingsRow
        icon="palette"
        label={t("settings.customization")}
        description={t("settings.customizationHint")}
        value={<SubjectSwatches />}
        onClick={onOpenCustomization}
      />

      <ChoiceSheet
        open={sheet === "theme"}
        onClose={() => setSheet(null)}
        icon={THEME_ICONS[theme]}
        title={t("settings.theme")}
        description={t("settings.themeHint")}
        options={(["system", "light", "dark"] as const).map((key) => ({
          key,
          label: themeLabels[key],
          icon: THEME_ICONS[key],
        }))}
        value={theme}
        onChange={(value) => void setTheme(value)}
      />
      <ChoiceSheet
        open={sheet === "language"}
        onClose={() => setSheet(null)}
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
