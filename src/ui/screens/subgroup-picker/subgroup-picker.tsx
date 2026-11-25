import { useAppStore, useSettingSetter } from "@/store";
import { Button } from "@/ds";
import { listSubgroups } from "@/lib/edupage";
import type { ClassOption } from "@/ui/hooks/useClasses.ts";
import { useT } from "@/ui/i18n";
import { SubgroupList } from "./subgroup-list.tsx";

type SubgroupPickerProps = {
  cls: ClassOption;
  onBack?: () => void;
  onDone: () => void;
};

/**
 * Asked once, right after picking a divided class ("pusgrupa"): which half is the user's.
 * Without an answer the app would keep showing both subgroups' lessons merged, which is the
 * bug this whole feature fixes (`resolve.ts`'s `matchesSubgroup`). Skipping is allowed — it
 * just means the merged view stays, same as for a class that isn't split at all.
 */
export const SubgroupPicker = ({ cls, onBack, onDone }: SubgroupPickerProps) => {
  const t = useT();
  const timetables = useAppStore((s) => s.timetables);
  const setClass = useAppStore((s) => s.setClass);
  const setSubgroup = useSettingSetter("subgroup");
  const subgroups = listSubgroups(Object.values(timetables), cls.id);

  // `setClass` resets `subgroup` to null (store/useAppStore.ts), so the subgroup write has to
  // come after it, not before.
  const pick = (label: string) => {
    void setClass(cls.id).then(() => setSubgroup(label));
    onDone();
  };

  const skip = () => {
    void setClass(cls.id);
    onDone();
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-app">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[54%]"
        style={{
          background:
            "radial-gradient(68% 62% at 50% 34%, color-mix(in oklab, var(--lamp) 18%, transparent) 0%, transparent 74%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-screen flex-1 flex-col px-gutter pt-[calc(--spacing(4)+var(--app-inset-top))] pb-[calc(--spacing(6)+var(--app-inset-bottom))] tablet:py-10">
        <header className="flex h-10 shrink-0 items-center justify-between gap-3">
          {onBack !== undefined ? (
            <Button variant="glass" size="sm" icon="arrow-left" onClick={onBack}>
              {t("onboarding.intro.back")}
            </Button>
          ) : (
            <span
              role="img"
              aria-label={t("app.title")}
              className="size-8 shrink-0 bg-strong"
              style={{
                maskImage: "url(/mark.svg)",
                WebkitMaskImage: "url(/mark.svg)",
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskPosition: "center",
                WebkitMaskPosition: "center",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
              }}
            />
          )}

          <span className="u-schedule-glass-chip u-data inline-flex h-8 items-center rounded-pill px-3 text-caption font-bold text-strong">
            {cls.short}
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-6 py-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-display-2 tracking-display text-balance text-strong">
              {t("subgroup.title", { class: cls.short })}
            </h1>
            <p className="font-text text-body text-muted">{t("subgroup.subtitle")}</p>
          </div>

          <SubgroupList subgroups={subgroups} onPick={pick} />
        </div>

        <Button block size="lg" variant="glass" onClick={skip}>
          {t("subgroup.skip")}
        </Button>
      </div>
    </div>
  );
};
