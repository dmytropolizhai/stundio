/**
 * The RTU / LU group picker: university → study program → group → (LU) subgroup.
 *
 * Unlike the class picker it cannot read the cache — the catalogue is fetched live through the
 * store (MODEL-UNIVERSITY.md §4) — so every step has a loading and an offline state. The group
 * is only committed once the subgroup question is answered (or found unnecessary): committing
 * it earlier would identify the user and close onboarding underneath this screen.
 */
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Icon, SegmentedTabs, TextField } from "@/ds";
import { useAppStore } from "@/store";
import {
  UNIVERSITIES,
  UNIVERSITY_SHORT,
  type UniversityGroupRef,
  type UniversityProgramEntry,
} from "@/lib/university";
import { useT } from "@/ui/i18n";
import { useBackButton } from "@/ui/hooks/useBackButton.ts";
import { StateMessage } from "@/ui/components/StateMessage.tsx";

type Load<T> = { state: "loading" } | { state: "error" } | { state: "ready"; value: T };

type UniversityPickerProps = {
  onPicked?: () => void;
};

const rowClass = (index: number) => (index === 0 ? "" : "border-t border-hairline");

export const UniversityPicker = ({ onPicked }: UniversityPickerProps) => {
  const t = useT();
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
  const [groups, setGroups] = useState<Load<UniversityGroupRef[]>>({ state: "loading" });
  const [pending, setPending] = useState<UniversityGroupRef | null>(null);
  const [subgroups, setSubgroups] = useState<string[] | null>(null);

  useEffect(() => {
    let live = true;
    setPrograms({ state: "loading" });
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

  useEffect(() => {
    if (program === null) return;
    let live = true;
    setGroups({ state: "loading" });
    loadGroups(program).then(
      (value) => {
        if (live) setGroups({ state: "ready", value });
      },
      () => {
        if (live) setGroups({ state: "error" });
      },
    );
    return () => {
      live = false;
    };
  }, [program, attempt, loadGroups]);

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

  const matches = useMemo(() => {
    if (programs.state !== "ready") return [];
    const needle = query.trim().toLowerCase();
    if (needle === "") return programs.value;
    return programs.value.filter((p) =>
      [p.code, p.title, p.faculty].some((field) => field.toLowerCase().includes(needle)),
    );
  }, [programs, query]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 px-gutter pb-3">
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
          ) : matches.length === 0 ? (
            <StateMessage icon="search" title={t("university.noResults")} />
          ) : (
            <Card radius="lg" className="mb-4 p-0">
              <ul>
                {matches.map((p, index) => (
                  <li key={`${p.id}:${p.title}`} className={rowClass(index)}>
                    <button
                      type="button"
                      onClick={() => setProgram(p)}
                      className="flex w-full cursor-pointer flex-col items-start gap-0.5 border-0 bg-transparent px-4 py-3.5 text-left text-strong"
                    >
                      <span className="font-text text-body font-bold">{p.title}</span>
                      <span className="font-text text-caption text-muted">
                        {[p.code, p.level, p.faculty].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )
        ) : (
          <>
            <button
              type="button"
              onClick={() => setProgram(null)}
              className="u-eyebrow flex cursor-pointer items-center gap-1.5 border-0 bg-transparent pt-2 pb-2 text-left"
            >
              <Icon name="chevron-left" size={14} />
              {program.code} · {program.title}
            </button>
            {groups.state === "loading" || pending !== null ? (
              <StateMessage icon="cloud" title={t("university.groupsLoading")} />
            ) : groups.state === "error" ? (
              <StateMessage
                icon="wifi-off"
                title={t("university.loadError")}
                hint={t("university.loadError.hint")}
                action={retry}
              />
            ) : groups.value.length === 0 ? (
              <StateMessage icon="search" title={t("university.noGroups")} />
            ) : (
              <Card radius="lg" className="mb-4 p-0">
                <ul>
                  {groups.value.map((group, index) => (
                    <li key={group.id} className={rowClass(index)}>
                      <button
                        type="button"
                        onClick={() => pickGroup(group)}
                        aria-pressed={selected?.id === group.id}
                        className={`flex w-full cursor-pointer border-0 bg-transparent px-4 py-3.5 text-left font-text text-body font-bold ${
                          selected?.id === group.id ? "text-brand-strong" : "text-strong"
                        }`}
                      >
                        {group.label}
                      </button>
                    </li>
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
