/**
 * Dual-lens liquid-glass sheet for switching between Student (Group) and Teacher roles.
 *
 * Shows both remembered identities simultaneously with live cached schedule context for today
 * (lessons count, time span, substitutions, subgroup / form-class badges) so switching never
 * feels blind. Tapping a card stages the role with a spring-gliding glass lens; tapping Confirm
 * commits it (opening the picker automatically if that role has no selection yet), and each
 * card's inline Change action jumps straight to that role's picker.
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BottomSheet, Button, Icon, cn } from "@/ds";
import {
  PERSONAS,
  dayFor,
  isIdentified,
  matchPersona,
  resolveIdentity,
  resolveSubject,
  subjectLabel,
  type Identity,
  type Persona,
} from "@/lib/persona";
import { rigaClock } from "@/lib/schedule";
import { useAppStore, useSettingSetter } from "@/store";
import { formatRange, useT } from "@/ui/i18n";
import { PERSONA_PROFILES, useIdentity } from "@/ui/persona";

type IdentitySheetProps = {
  open: boolean;
  onClose: () => void;
  onPickClass: () => void;
  onPickTeacher: () => void;
};

type RoleVisual = {
  /** CSS color expression feeding `--role-tone` (card rim + ambient caustic). */
  tone: string;
  /** Backlit header jewel fill & ink classes. */
  jewelClass: string;
  /** Compact emblem chip inside each card. */
  emblemClass: string;
};

const ROLE_VISUALS: Record<Persona, RoleVisual> = {
  student: {
    tone: "var(--accent-sky)",
    jewelClass: "bg-sky text-sky-ink",
    emblemClass: "bg-sky/20 text-strong",
  },
  teacher: {
    tone: "var(--lamp)",
    jewelClass: "bg-amber text-amber-ink",
    emblemClass: "bg-lamp/18 text-strong",
  },
};

const LENS_SPRING = { type: "spring" as const, stiffness: 420, damping: 32 };

type RoleSummary = {
  persona: Persona;
  identity: Identity;
  identified: boolean;
  label: string | null;
  /** Subgroup label (student) or form-class label (teacher), when present. */
  badge: { icon: "users" | "layers"; text: string } | null;
  /** Form teacher's name for a student's class, when known. */
  formTeacher: string | null;
  /** Today's cached lesson pulse, null when no timetable is cached yet. */
  today: {
    lessonCount: number;
    timeSpan: string | null;
    changesCount: number;
  } | null;
};

export const IdentitySheet = ({
  open,
  onClose,
  onPickClass,
  onPickTeacher,
}: IdentitySheetProps) => {
  const t = useT();
  const prefersReducedMotion = useReducedMotion() === true;
  const activeIdentity = useIdentity();
  const setPersona = useSettingSetter("persona");

  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const subgroup = useAppStore((s) => s.settings.subgroup);
  const selectedTeacherId = useAppStore((s) => s.settings.selectedTeacherId);
  const teacherView = useAppStore((s) => s.settings.teacherView);
  const building = useAppStore((s) => s.settings.building);
  const showMovedOnTargetDay = useAppStore((s) => s.settings.showMovedOnTargetDay);
  const metas = useAppStore((s) => s.metas);
  const timetables = useAppStore((s) => s.timetables);
  const substitutions = useAppStore((s) => s.substitutions);

  const [draftPersona, setDraftPersona] = useState<Persona>(activeIdentity.persona);
  const radioRefs = useRef<Record<Persona, HTMLButtonElement | null>>({
    student: null,
    teacher: null,
  });

  useEffect(() => {
    if (open) {
      setDraftPersona(activeIdentity.persona);
    }
  }, [open, activeIdentity.persona]);

  const summaries = useMemo<Record<Persona, RoleSummary>>(() => {
    const timetableList = Object.values(timetables);
    const todayDate = rigaClock().date;

    const build = (persona: Persona): RoleSummary => {
      const candidate = resolveIdentity({
        persona,
        selectedClassId,
        subgroup,
        selectedTeacherId,
        teacherView,
      });
      const identified = isIdentified(candidate);
      const subject = resolveSubject(candidate, timetableList);
      const label = subjectLabel(subject);

      const { badge, formTeacher } = matchPersona<{
        badge: RoleSummary["badge"];
        formTeacher: string | null;
      }>(candidate, {
        student: ({ subgroup: sub }) => ({
          badge:
            sub !== null
              ? { icon: "users" as const, text: `${t("settings.subgroup")} ${sub}` }
              : null,
          formTeacher:
            subject?.persona === "student"
              ? subject.class.formTeacher?.short || subject.class.formTeacher?.name || null
              : null,
        }),
        teacher: () => ({
          badge:
            subject?.persona === "teacher" &&
            subject.formClass?.label !== undefined &&
            subject.formClass.label !== null
              ? {
                  icon: "layers" as const,
                  text: `${t("teacher.formClass")} · ${subject.formClass.label}`,
                }
              : null,
          formTeacher: null,
        }),
      });

      const resolvedDay = identified
        ? dayFor(
            {
              identity: candidate,
              metas,
              timetables,
              substitutions,
              building,
              showMovedOnTargetDay,
            },
            todayDate,
          )
        : null;

      let today: RoleSummary["today"] = null;
      if (resolvedDay !== null) {
        const activeLessons = resolvedDay.lessons.filter((l) => l.status !== "cancelled");
        const first = activeLessons[0];
        const last = activeLessons[activeLessons.length - 1];
        today = {
          lessonCount: activeLessons.length,
          timeSpan:
            first !== undefined && last !== undefined ? formatRange(first.start, last.end) : null,
          changesCount: resolvedDay.lessons.filter((l) => l.status !== "normal").length,
        };
      }

      return {
        persona,
        identity: candidate,
        identified,
        label,
        badge,
        formTeacher,
        today,
      };
    };

    return {
      student: build("student"),
      teacher: build("teacher"),
    };
  }, [
    building,
    metas,
    selectedClassId,
    selectedTeacherId,
    showMovedOnTargetDay,
    subgroup,
    substitutions,
    t,
    teacherView,
    timetables,
  ]);

  const pickerFor = (identity: Identity): (() => void) =>
    matchPersona(identity, {
      student: () => onPickClass,
      teacher: () => onPickTeacher,
    });

  const handleConfirm = () => {
    const staged = summaries[draftPersona];
    void setPersona(draftPersona);
    onClose();
    if (!staged.identified) {
      pickerFor(staged.identity)();
    }
  };

  const handleChangeRole = (persona: Persona) => {
    void setPersona(persona);
    onClose();
    pickerFor(summaries[persona].identity)();
  };

  const handleRadioKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: Persona) => {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight"
    ) {
      return;
    }
    event.preventDefault();
    const index = PERSONAS.indexOf(current);
    const delta = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const next = PERSONAS[(index + delta + PERSONAS.length) % PERSONAS.length];
    if (next !== undefined) {
      setDraftPersona(next);
      radioRefs.current[next]?.focus();
    }
  };

  const stagedProfile = PERSONA_PROFILES[draftPersona];
  const stagedVisual = ROLE_VISUALS[draftPersona];
  const sheetStyle = { "--row-tone": stagedVisual.tone } as CSSProperties;

  const headerJewel = (
    <div className="relative flex items-center justify-center">
      <span
        aria-hidden="true"
        className="u-schedule-orb-halo pointer-events-none absolute -inset-2.5 rounded-full opacity-75 transition-colors duration-(--dur-slow)"
      />
      <span
        data-testid="identity-sheet-jewel"
        className={cn(
          "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-(--dur-base)",
          "shadow-[inset_0_1px_1px_rgba(255,255,255,0.48),0_1px_2px_rgba(18,20,25,0.12)]",
          stagedVisual.jewelClass,
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={draftPersona}
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.72, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.72, rotate: 10 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.16 }}
            className="flex items-center justify-center"
          >
            <Icon name={stagedProfile.icon} size={20} strokeWidth={2.2} />
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      closeLabel={t("lesson.close")}
      className="u-sheet-glass u-sheet-glass-caustic"
      style={sheetStyle}
      leading={headerJewel}
      title={t("settings.identity.sheetTitle")}
      subtitle={t("settings.identityHint")}
      footer={
        <Button variant="primary" size="lg" block onClick={handleConfirm}>
          {t("settings.identity.confirm")}
        </Button>
      }
    >
      <div
        role="radiogroup"
        aria-label={t("settings.identity.sheetTitle")}
        className="flex flex-col gap-3 pb-1"
      >
        {PERSONAS.map((role) => {
          const profile = PERSONA_PROFILES[role];
          const visual = ROLE_VISUALS[role];
          const summary = summaries[role];
          const selected = draftPersona === role;
          const displayName = summary.label ?? t(profile.noneSelected);
          const hasContext =
            summary.identified &&
            (summary.today !== null || summary.badge !== null || summary.formTeacher !== null);

          return (
            <div
              key={role}
              data-testid={`identity-role-card-${role}`}
              data-selected={selected ? "true" : "false"}
              style={{ "--role-tone": visual.tone } as CSSProperties}
              className={cn(
                "relative isolate overflow-hidden rounded-xl transition-transform duration-(--dur-fast) ease-(--ease-out)",
                !selected && "u-sheet-slab",
              )}
            >
              {selected && (
                <motion.div
                  layoutId="identity-role-lens"
                  aria-hidden="true"
                  transition={prefersReducedMotion ? { duration: 0 } : LENS_SPRING}
                  className="u-identity-active-lens"
                />
              )}

              {/*
               * Overlay radio button covers the card as one accessible tab stop so the inline
               * Change pill stays a sibling control rather than nesting a button inside a button.
               */}
              <button
                ref={(el) => {
                  radioRefs.current[role] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${t(profile.roleLabel)}: ${displayName}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setDraftPersona(role)}
                onKeyDown={(e) => handleRadioKeyDown(e, role)}
                className="absolute inset-0 z-10 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-(--focus-ring)"
              />

              <div className="pointer-events-none relative z-20 flex flex-col gap-3 p-4">
                {/* Top row: role emblem + role name + selection check orb */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-(--dur-fast)",
                        selected ? visual.emblemClass : "bg-sunken/70 text-muted",
                      )}
                    >
                      <Icon name={profile.icon} size={16} strokeWidth={2.1} />
                    </span>
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "font-text text-caption leading-tight font-semibold transition-colors duration-(--dur-fast)",
                          selected ? "text-strong" : "text-muted",
                        )}
                      >
                        {t(profile.roleLabel)}
                      </span>
                      <span className="font-text text-micro leading-tight text-muted">
                        {t(profile.subjectLabel)}
                      </span>
                    </div>
                  </div>

                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full transition-all duration-(--dur-fast)",
                      selected
                        ? "scale-100 bg-inverse text-on-inverse shadow-card"
                        : "scale-95 inset-ring-1 inset-ring-(--border-strong)/45",
                    )}
                  >
                    {selected && <Icon name="check" size={14} strokeWidth={2.75} />}
                  </span>
                </div>

                {/* Middle row: bold identity name + inline Change pill */}
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={cn(
                      "min-w-0 flex-1 truncate transition-colors duration-(--dur-fast)",
                      summary.label !== null
                        ? selected
                          ? "font-display text-display-2 tracking-display text-strong"
                          : "font-display text-title tracking-display text-fg"
                        : "font-text text-body font-medium text-muted",
                    )}
                  >
                    {displayName}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleChangeRole(role)}
                    aria-label={
                      selected ? undefined : `${t("settings.change")} · ${t(profile.roleLabel)}`
                    }
                    className={cn(
                      "pointer-events-auto relative z-30 inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-pill px-3",
                      "font-text text-caption leading-none font-semibold transition-all duration-(--dur-fast) ease-(--ease-out)",
                      "before:absolute before:-inset-y-1.5 before:-inset-x-1 before:content-['']",
                      "active:scale-(--press-scale)",
                      selected
                        ? "u-schedule-glass-chip text-strong"
                        : "bg-sunken/70 text-muted hover:text-strong",
                    )}
                  >
                    <Icon name="repeat" size={13} strokeWidth={2.2} />
                    <span>{t("settings.change")}</span>
                  </button>
                </div>

                {/* Live context pills: today's lesson pulse, changes, subgroup / form class */}
                {hasContext && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {summary.today !== null && (
                      <span
                        data-testid={`identity-role-today-${role}`}
                        className="u-schedule-glass-chip inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-text text-micro leading-none font-medium text-fg"
                      >
                        <Icon name="clock" size={12} className="shrink-0 text-muted" />
                        <span>
                          {summary.today.lessonCount > 0
                            ? t("week.overview.lessons", { n: summary.today.lessonCount })
                            : t("day.empty")}
                        </span>
                        {summary.today.timeSpan !== null && (
                          <span className="font-data text-micro tabular-nums text-muted">
                            · {summary.today.timeSpan}
                          </span>
                        )}
                      </span>
                    )}

                    {summary.today !== null && summary.today.changesCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-caution-fill/22 px-2.5 py-1 font-text text-micro leading-none font-semibold text-caution">
                        <span
                          aria-hidden="true"
                          className="size-1.5 shrink-0 rounded-full bg-caution-fill"
                        />
                        {t("day.changesBadge", { n: summary.today.changesCount })}
                      </span>
                    )}

                    {summary.badge !== null && (
                      <span className="u-schedule-glass-chip inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-text text-micro leading-none font-medium text-muted">
                        <Icon name={summary.badge.icon} size={12} className="shrink-0" />
                        <span>{summary.badge.text}</span>
                      </span>
                    )}

                    {summary.formTeacher !== null && (
                      <span className="u-schedule-glass-chip inline-flex max-w-full items-center gap-1.5 truncate rounded-pill px-2.5 py-1 font-text text-micro leading-none font-medium text-muted">
                        <Icon name="user-round" size={12} className="shrink-0" />
                        <span className="truncate">{summary.formTeacher}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
};
