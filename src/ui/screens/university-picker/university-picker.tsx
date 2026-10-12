/**
 * The RTU / LU group picker: university → study program → group → (LU) subgroup.
 *
 * Unlike the class picker it cannot read the cache — the catalogue is fetched live through the
 * store (MODEL-UNIVERSITY.md §5) — so every step has a loading and an offline state. The group
 * is only committed once the subgroup question is answered (or found unnecessary): committing
 * it earlier would identify the user and close onboarding underneath this screen.
 *
 * Search reaches groups as well as programs, so a student who knows their group's name never
 * has to know which program or course it sits under. LU lists every group up front; RTU lists
 * them per program, so its groups are fetched for the few programs a query narrows to.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Icon, SegmentedTabs, TextField } from "@/ds";
import { useAppStore } from "@/store";
import {
  UNIVERSITIES,
  UNIVERSITY_SHORT,
  programTitle,
  type UniversityGroupRef,
  type UniversityNames,
  type UniversityProgramEntry,
} from "@/lib/university";
import { useT, type Translate } from "@/ui/i18n";
import { useBackButton } from "@/ui/hooks/useBackButton.ts";
import { formatUniversityGroup, useUniversityNames } from "@/ui/hooks/useUniversityNames.ts";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { InstitutionLogo } from "@/ui/components/InstitutionLogo.tsx";

type Load<T> = { state: "loading" } | { state: "error" } | { state: "ready"; value: T };

type UniversityPickerProps = {
  onPicked?: () => void;
};

/** RTU groups are fetched for a query once it narrows to this many programs or fewer. */
const RTU_GROUP_LOOKAHEAD = 4;
/** More matching groups than this and the list asks for a sharper query instead. */
const MAX_GROUP_HITS = 30;

const rowClass = (index: number) => (index === 0 ? "" : "border-t border-hairline");
const programKey = (p: UniversityProgramEntry) => `${p.university}:${p.id}:${p.title}`;

/** Every word of the query somewhere in the haystack — "fiz 1. sem" finds "Fizika … 1. sem.". */
const matchesAll = (haystack: string, words: readonly string[]): boolean =>
  words.every((w) => haystack.includes(w));

const programText = (p: UniversityProgramEntry): string =>
  [p.code, p.title, p.titleEn, p.faculty, p.facultyEn, p.level, p.levelEn]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const groupText = (g: UniversityGroupRef, t: Translate): string =>
  [g.id, g.label, formatUniversityGroup(g, t), g.program, g.programEn]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const ProgramRow = ({
  program,
  names,
  index,
  onSelect,
}: {
  program: UniversityProgramEntry;
  names: UniversityNames;
  index: number;
  onSelect: () => void;
}) => {
  const english = names === "en";
  const level = english ? (program.levelEn ?? program.level) : program.level;
  const faculty = english ? (program.facultyEn ?? program.faculty) : program.faculty;
  return (
    <li className={rowClass(index)}>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full cursor-pointer flex-col items-start gap-0.5 border-0 bg-transparent px-4 py-3.5 text-left text-strong"
      >
        <span className="font-text text-body font-bold">{programTitle(program, names)}</span>
        <span className="font-text text-caption text-muted">
          {[program.code, level, faculty].filter(Boolean).join(" · ")}
        </span>
      </button>
    </li>
  );
};

const GroupRow = ({
  group,
  names,
  index,
  selected,
  showProgram,
  onSelect,
}: {
  group: UniversityGroupRef;
  names: UniversityNames;
  index: number;
  selected: boolean;
  showProgram: boolean;
  onSelect: () => void;
}) => {
  const t = useT();
  const program = names === "en" ? (group.programEn ?? group.program) : group.program;
  return (
    <li className={rowClass(index)}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex w-full cursor-pointer flex-col items-start gap-0.5 border-0 bg-transparent px-4 py-3.5 text-left ${
          selected ? "text-brand-strong" : "text-strong"
        }`}
      >
        <span className="font-text text-body font-bold">{formatUniversityGroup(group, t)}</span>
        {showProgram && <span className="font-text text-caption text-muted">{program}</span>}
      </button>
    </li>
  );
};

export const UniversityPicker = ({ onPicked }: UniversityPickerProps) => {
  const t = useT();
  const names = useUniversityNames();
  const university = useAppStore((s) => s.settings.university);
  const selected = useAppStore((s) => s.settings.universityGroup);
  const setUniversity = useAppStore((s) => s.setUniversity);
  const setUniversityGroup = useAppStore((s) => s.setUniversityGroup);
  const loadPrograms = useAppStore((s) => s.loadUniversityPrograms);
  const loadGroups = useAppStore((s) => s.loadUniversityGroups);
  const previewGroup = useAppStore((s) => s.previewUniversityGroup);
  const refresh = useAppStore((s) => s.refresh);

  const [programs, setPrograms] = useState<Load<UniversityProgramEntry[]>>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [program, setProgram] = useState<UniversityProgramEntry | null>(null);
  /* Groups per program, loaded on demand — the open program's, or RTU search lookahead. */
  const [groupsByProgram, setGroupsByProgram] = useState<
    Record<string, Load<UniversityGroupRef[]>>
  >({});
  const [pending, setPending] = useState<UniversityGroupRef | null>(null);
  const [subgroups, setSubgroups] = useState<string[] | null>(null);
  /* Which programs' groups were asked for, and for which catalogue load — a reply that lands
     after the university changed must not fill the new list. */
  const requested = useRef(new Set<string>());
  /* Bumped by a retry: a failed request is forgotten, so the effect below asks again. */
  const [groupAttempt, setGroupAttempt] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    let live = true;
    generation.current += 1;
    requested.current = new Set();
    setPrograms({ state: "loading" });
    setGroupsByProgram({});
    loadPrograms(university).then(
      (value) => {
        if (live) setPrograms({ state: "ready", value });
      },
      () => {
        if (live) setPrograms({ state: "error" });
      },
    );
    return () => {
      live = false;
    };
  }, [university, attempt, loadPrograms]);

  const words = useMemo(
    () =>
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w !== ""),
    [query],
  );

  const matchingPrograms = useMemo(() => {
    if (programs.state !== "ready") return [];
    if (words.length === 0) return programs.value;
    return programs.value.filter((p) => matchesAll(programText(p), words));
  }, [programs, words]);

  /**
   * Programs whose groups must be fetched: the open one, or the few an RTU query narrows to.
   * LU's catalogue already carries every group, so it never needs this.
   */
  const wanted = useMemo(() => {
    const candidates =
      program !== null
        ? [program]
        : words.length > 0 && matchingPrograms.length <= RTU_GROUP_LOOKAHEAD
          ? matchingPrograms
          : [];
    return candidates.filter((p) => p.groups === undefined);
  }, [program, words, matchingPrograms]);

  useEffect(() => {
    const at = generation.current;
    for (const p of wanted) {
      const key = programKey(p);
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      setGroupsByProgram((prev) => ({ ...prev, [key]: { state: "loading" } }));
      const settle = (value: Load<UniversityGroupRef[]>) => {
        if (generation.current === at) setGroupsByProgram((prev) => ({ ...prev, [key]: value }));
      };
      loadGroups(p).then(
        (value) => {
          settle({ state: "ready", value });
        },
        () => {
          // Forget the request, so opening the program (or retrying) asks again.
          requested.current.delete(key);
          settle({ state: "error" });
        },
      );
    }
  }, [wanted, loadGroups, groupAttempt]);

  /** Every group the query reaches, across all programs and courses. */
  const matchingGroups = useMemo(() => {
    if (words.length === 0 || programs.state !== "ready") return [];
    const known = programs.value.flatMap((p) => {
      if (p.groups !== undefined) return p.groups;
      const loaded = groupsByProgram[programKey(p)];
      return loaded?.state === "ready" ? loaded.value : [];
    });
    // A query naming the program alone ("fizika") lists its groups too.
    return known.filter((g) => matchesAll(groupText(g, t), words));
  }, [words, programs, groupsByProgram, t]);

  const commit = (group: UniversityGroupRef, subgroup: string | null) => {
    void setUniversityGroup(group, subgroup).then(() => refresh());
    onPicked?.();
  };

  const pickGroup = (group: UniversityGroupRef) => {
    setPending(group);
    previewGroup(group).then(
      (found) => {
        if (found.length > 1) setSubgroups(found);
        else commit(group, null);
      },
      // Offline mid-pick: the group still saves; the subgroup can be set later in Settings.
      () => {
        commit(group, null);
      },
    );
  };

  useBackButton(
    () => {
      if (subgroups !== null) {
        setSubgroups(null);
        setPending(null);
      } else {
        setProgram(null);
      }
    },
    { enabled: program !== null || subgroups !== null, priority: 20 },
  );

  const retry = (
    <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
      {t("error.retry")}
    </Button>
  );

  if (pending !== null && subgroups !== null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-gutter pb-6">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 text-center">
          <h1 className="font-display text-title tracking-display text-strong">
            {t("university.subgroup.title")}
          </h1>
          <p className="max-w-88 font-text text-body text-muted">{t("university.subgroup.hint")}</p>
          <ul className="flex w-full max-w-88 flex-col gap-2.5">
            {subgroups.map((label) => (
              <li key={label}>
                <Card
                  tone="surface"
                  radius="lg"
                  onClick={() => {
                    commit(pending, label);
                  }}
                  className="flex items-center justify-center border-2 border-transparent"
                >
                  <span className="font-text text-body font-bold text-strong">{label}</span>
                </Card>
              </li>
            ))}
          </ul>
        </div>
        <Button block size="lg" variant="ghost" onClick={() => commit(pending, null)}>
          {t("university.subgroup.all")}
        </Button>
      </div>
    );
  }

  const openGroups: Load<UniversityGroupRef[]> | undefined =
    program === null
      ? undefined
      : program.groups === undefined
        ? groupsByProgram[programKey(program)]
        : { state: "ready", value: program.groups };
  const lookingUp = wanted.some((p) => groupsByProgram[programKey(p)]?.state === "loading");

  const programList = (
    <Card radius="lg" className="mb-4 p-0">
      <ul>
        {matchingPrograms.map((p, index) => (
          <ProgramRow
            key={programKey(p)}
            program={p}
            names={names}
            index={index}
            onSelect={() => {
              setProgram(p);
            }}
          />
        ))}
      </ul>
    </Card>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 px-gutter pb-3">
        <div className="flex items-center gap-3">
          <InstitutionLogo institution={university} size={40} />
          <SegmentedTabs
            label={t("university.institution")}
            items={UNIVERSITIES.map((key) => ({ key, label: UNIVERSITY_SHORT[key] }))}
            value={university}
            onChange={(next) => {
              setProgram(null);
              setQuery("");
              void setUniversity(next);
            }}
          />
        </div>
        {program === null && (
          <TextField
            type="search"
            value={query}
            onChange={setQuery}
            placeholder={t("university.search")}
            aria-label={t("university.search")}
            icon="search"
          />
        )}
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-gutter pb-26">
        {program === null ? (
          programs.state === "loading" ? (
            <StateMessage icon="cloud" title={t("university.loading")} />
          ) : programs.state === "error" ? (
            <StateMessage
              icon="wifi-off"
              title={t("university.loadError")}
              hint={t("university.loadError.hint")}
              action={retry}
            />
          ) : pending !== null ? (
            <StateMessage icon="cloud" title={t("university.groupsLoading")} />
          ) : matchingPrograms.length === 0 && matchingGroups.length === 0 ? (
            lookingUp ? (
              <StateMessage icon="cloud" title={t("university.groupsLoading")} />
            ) : (
              <StateMessage icon="search" title={t("university.noResults")} />
            )
          ) : (
            <>
              {matchingGroups.length > 0 && matchingGroups.length <= MAX_GROUP_HITS && (
                <section>
                  <h2 className="u-eyebrow pt-2 pb-2">{t("university.groups")}</h2>
                  <Card radius="lg" className="mb-4 p-0">
                    <ul>
                      {matchingGroups.map((group, index) => (
                        <GroupRow
                          key={`${group.university}:${group.id}`}
                          group={group}
                          names={names}
                          index={index}
                          selected={selected?.id === group.id}
                          showProgram
                          onSelect={() => {
                            pickGroup(group);
                          }}
                        />
                      ))}
                    </ul>
                  </Card>
                </section>
              )}
              {matchingPrograms.length > 0 && (
                <section>
                  {matchingGroups.length > 0 && matchingGroups.length <= MAX_GROUP_HITS && (
                    <h2 className="u-eyebrow pt-2 pb-2">{t("university.programs")}</h2>
                  )}
                  {programList}
                </section>
              )}
            </>
          )
        ) : (
          <>
            <button
              type="button"
              onClick={() => setProgram(null)}
              className="u-eyebrow flex cursor-pointer items-center gap-1.5 border-0 bg-transparent pt-2 pb-2 text-left"
            >
              <Icon name="chevron-left" size={14} />
              {program.code} · {programTitle(program, names)}
            </button>
            {openGroups === undefined || openGroups.state === "loading" || pending !== null ? (
              <StateMessage icon="cloud" title={t("university.groupsLoading")} />
            ) : openGroups.state === "error" ? (
              <StateMessage
                icon="wifi-off"
                title={t("university.loadError")}
                hint={t("university.loadError.hint")}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setGroupAttempt((n) => n + 1);
                    }}
                  >
                    {t("error.retry")}
                  </Button>
                }
              />
            ) : openGroups.value.length === 0 ? (
              <StateMessage icon="search" title={t("university.noGroups")} />
            ) : (
              <Card radius="lg" className="mb-4 p-0">
                <ul>
                  {openGroups.value.map((group, index) => (
                    <GroupRow
                      key={group.id}
                      group={group}
                      names={names}
                      index={index}
                      selected={selected?.id === group.id}
                      showProgram={false}
                      onSelect={() => {
                        pickGroup(group);
                      }}
                    />
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};
