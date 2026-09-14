import { useAppStore } from "../../store/index.ts";
import { Button, Card } from "../../ds/index.ts";
import { listSubgroups } from "../../lib/edupage/index.ts";
import type { ClassOption } from "../hooks/useClasses.ts";
import { useT } from "../i18n/index.ts";

/**
 * Asked once, right after picking a divided class ("pusgrupa"): which half is the user's.
 * Without an answer the app would keep showing both subgroups' lessons merged, which is the
 * bug this whole feature fixes (`resolve.ts`'s `matchesSubgroup`). Skipping is allowed — it
 * just means the merged view stays, same as for a class that isn't split at all.
 */
export const SubgroupPicker = ({ cls, onDone }: { cls: ClassOption; onDone: () => void }) => {
  const t = useT();
  const timetables = useAppStore((s) => s.timetables);
  const setClass = useAppStore((s) => s.setClass);
  const setSubgroup = useAppStore((s) => s.setSubgroup);
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
    <div className="flex min-h-0 flex-1 flex-col px-gutter pb-6">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 text-center">
        <h1 className="font-display text-title tracking-display text-strong">
          {t("subgroup.title", { class: cls.short })}
        </h1>
        <p className="max-w-88 font-text text-body text-muted">{t("subgroup.subtitle")}</p>
        <ul className="flex w-full max-w-88 flex-col gap-2.5">
          {subgroups.map((label) => (
            <li key={label}>
              <Card
                tone="surface"
                radius="lg"
                onClick={() => {
                  pick(label);
                }}
                className="flex items-center justify-center border-2 border-transparent"
              >
                <span className="font-text text-body font-bold text-strong">
                  {t("subgroup.option", { label })}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <Button block size="lg" variant="ghost" onClick={skip}>
        {t("subgroup.skip")}
      </Button>
    </div>
  );
};
