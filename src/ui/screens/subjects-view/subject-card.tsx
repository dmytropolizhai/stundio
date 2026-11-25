import { Card, Icon } from "@/ds";
import type { SubjectRef, TeacherRef } from "@/lib/edupage";
import { isDarkTone, subjectCode, toneFieldVars, type SubjectAccent } from "@/ui/theme";
import { useT } from "@/ui/i18n";

type SubjectCardProps = {
  subject: SubjectRef;
  count: number;
  taughtBy: TeacherRef[];
  hasNote: boolean;
  accent: SubjectAccent;
  /** The subject on now: the whole card becomes its darkened field. One per screen. */
  featured?: boolean;
  onSelect: () => void;
};

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
  featured = false,
  onSelect,
}: SubjectCardProps) => {
  const t = useT();
  const subjectKey = subject.name === "" ? subject.short : subject.name;
  const code = subjectCode(subject);
  const vars = toneFieldVars(accent);
  const darkTone = isDarkTone(accent);

  return (
    <Card
      tone={featured ? "custom" : "surface"}
      radius="2xl"
      elevation="raised"
      className={
        featured
          ? "u-tone-field u-tone-field-deep min-w-0 p-3 text-left text-on-deep"
          : "min-w-0 p-3 text-left"
      }
      style={featured ? vars : undefined}
      {...(featured && darkTone ? { "data-tone-dark": "" } : {})}
      data-testid={`subject-${subject.id}`}
      data-featured={featured ? "" : undefined}
      onClick={onSelect}
    >
      {!featured && (
        <div
          className="u-tone-field h-[88px] rounded-md"
          style={vars}
          {...(darkTone ? { "data-tone-dark": "" } : {})}
        />
      )}
      <div
        aria-hidden="true"
        className={`relative z-[2] ${featured ? "mt-10 ml-1 ring-on-deep/30" : "-mt-9 ml-4 ring-card"} grid size-[84px] place-items-center rounded-full bg-(--tone) font-data text-[24px] leading-none font-semibold tracking-[-0.03em] text-(--tone-ink) ring-[6px]`}
        style={vars}
      >
        {code}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3
            className={`m-0 font-display text-title font-semibold tracking-display break-words ${featured ? "text-on-deep" : "text-strong"}`}
          >
            {subjectKey}
          </h3>
          <div
            className={`mt-0.5 font-text text-caption ${featured ? "text-on-deep" : "text-muted"}`}
          >
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

      <div
        className={`mt-4 grid grid-cols-2 px-1 pt-4 pb-1 ${featured ? "text-on-deep" : "border-t border-hairline"}`}
      >
        <Stat
          icon="clock"
          value={String(count)}
          label={t("subjects.stat.lessons")}
          featured={featured}
        />
        <Stat
          icon="user-round"
          value={String(taughtBy.length)}
          label={t("subjects.teachers")}
          featured={featured}
        />
      </div>
    </Card>
  );
};

const Stat = ({
  icon,
  value,
  label,
  featured,
}: {
  icon: "clock" | "user-round";
  value: string;
  label: string;
  featured: boolean;
}) => (
  <div className="grid justify-items-center gap-1.5">
    <span
      className={`flex items-center gap-2 font-data text-[24px] leading-none font-medium tracking-[-0.03em] tabular-nums ${featured ? "text-on-deep" : "text-strong"}`}
    >
      <Icon name={icon} size={18} />
      {value}
    </span>
    <span className={`font-text text-caption ${featured ? "text-on-deep" : "text-muted"}`}>
      {label}
    </span>
  </div>
);
