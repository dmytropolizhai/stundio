/**
 * First-run question between the tour and the role: which school's timetable is this?
 * RVT continues to the student/teacher split; RTU and LU go straight to the group picker,
 * since a university student is the only role there (MODEL-UNIVERSITY.md).
 */
import { Card, Icon } from "@/ds";
import { UNIVERSITY_NAMES } from "@/lib/university";
import { useT, type MessageKey } from "@/ui/i18n";
import { InstitutionLogo, type Institution } from "@/ui/components/InstitutionLogo.tsx";

export type { Institution };

const OPTIONS: { key: Institution; name: string; short: string; desc: MessageKey }[] = [
  { key: "rvt", name: "Rīgas Valsts tehnikums", short: "RVT", desc: "institution.rvt.desc" },
  { key: "rtu", name: UNIVERSITY_NAMES.rtu, short: "RTU", desc: "institution.rtu.desc" },
  { key: "lu", name: UNIVERSITY_NAMES.lu, short: "LU", desc: "institution.lu.desc" },
];

export const OnboardingInstitution = ({ onSelect }: { onSelect: (key: Institution) => void }) => {
  const t = useT();
  return (
    <div className="flex h-full flex-col">
      <div className="bg-card px-gutter pt-[calc(--spacing(8)+var(--app-inset-top))] pb-7 text-brand">
        <h1 className="mt-5 font-display text-hero tracking-hero">
          {t("onboarding.institution.title")}
        </h1>
        <p className="mt-3 font-text text-body-lg text-muted">
          {t("onboarding.institution.subtitle")}
        </p>
      </div>
      <ul className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-gutter pt-5 pb-8">
        {OPTIONS.map((option) => (
          <li key={option.key}>
            <Card
              tone="surface"
              radius="lg"
              onClick={() => {
                onSelect(option.key);
              }}
              aria-label={`${option.name} — ${t(option.desc)}`}
              className="flex items-center gap-4"
            >
              <InstitutionLogo institution={option.key} size={52} />
              <span className="flex min-w-0 flex-col">
                <span className="font-text text-body font-bold text-strong">
                  {option.short} · {option.name}
                </span>
                <span className="font-text text-caption text-muted">{t(option.desc)}</span>
              </span>
              <Icon name="chevron-right" size={18} className="ml-auto shrink-0 text-muted" />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
};
