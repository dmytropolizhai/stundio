import type { CSSProperties } from "react";
import { Card, Icon } from "@/ds";
import type { SubjectRef, TeacherRef } from "@/lib/edupage";
import type { SubjectAccent } from "@/ui/theme";
import { subjectCode } from "@/ui/theme";
import { useT } from "@/ui/i18n";

type SubjectCardProps = {
  subject: SubjectRef;
  count: number;
  taughtBy: TeacherRef[];
  hasNote: boolean;
  accent: SubjectAccent;
  onSelect: () => void;
};

/**
 * The tone's fill and ink pair as the two variables `.u-tone-field` and the mark mix from. A fixed
 * tone reads the design-system tokens (its persisted key still names the legacy variable); a
 * custom pick carries its own pair.
 */
const toneVars = (accent: SubjectAccent): CSSProperties =>
  (accent.tone === "custom"
    ? { "--tone": accent.fill, "--tone-ink": accent.ink }
    : {
        "--tone": `var(--accent-${accent.tone})`,
        "--tone-ink": `var(--accent-${accent.tone}-ink)`,
      }) as CSSProperties;

/**
 * A subject's profile card (design system: SubjectCard, banner version): a surface card with a
 * grainy field of the subject's own tone, the subject mark ringed by the surface and overlapping
 * the field, the name with its code and teachers, and a stats row set in Martian Mono. The whole
 * card opens the subject sheet, so nothing inside it is a second button. No "all lessons" CTA:
 * the app has no screen for it to open.
 */
export const SubjectCard = ({
  subject,
  count,
  taughtBy,
  hasNote,
  accent,
  onSelect,
}: SubjectCardProps) => {
  const t = useT();
  const subjectKey = subject.name === "" ? subject.short : subject.name;
  const code = subjectCode(subject);
  const vars = toneVars(accent);

  return (
    <Card
      tone="surface"
      radius="2xl"
      elevation="raised"
      className="min-w-0 p-3 text-left"
      data-testid={`subject-${subject.id}`}
      onClick={onSelect}
    >
      <div
        className="u-tone-field h-[88px] rounded-md"
        style={vars}
        {...(accent.tone === "lime" ? { "data-tone-dark": "" } : {})}
      />
      <div
        aria-hidden="true"
        className="relative z-[2] -mt-9 ml-4 grid size-[84px] place-items-center rounded-full bg-(--tone) font-data text-[24px] leading-none font-semibold tracking-[-0.03em] text-(--tone-ink) ring-[6px] ring-card"
        style={vars}
      >
        {code}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-title font-semibold tracking-display break-words text-strong">
            {subjectKey}
          </h3>
          <div className="mt-0.5 font-text text-caption text-muted">
            {[code, ...taughtBy.map((x) => x.short)].join(" · ")}
          </div>
        </div>
        {hasNote && (
          <span
            aria-label={t("subjects.note.badge")}
            className="size-2 shrink-0 rounded-full bg-lamp-mark"
          />
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 border-t border-hairline px-1 pt-4 pb-1">
        <Stat icon="clock" value={String(count)} label={t("subjects.stat.lessons")} />
        <Stat icon="user-round" value={String(taughtBy.length)} label={t("subjects.teachers")} />
      </div>
    </Card>
  );
};

const Stat = ({
  icon,
  value,
  label,
}: {
  icon: "clock" | "user-round";
  value: string;
  label: string;
}) => (
  <div className="grid justify-items-center gap-1.5">
    <span className="flex items-center gap-2 font-data text-[24px] leading-none font-medium tracking-[-0.03em] tabular-nums text-strong">
      <Icon name={icon} size={18} />
      {value}
    </span>
    <span className="font-text text-caption text-muted">{label}</span>
  </div>
);
