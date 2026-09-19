import { Card } from "@/ds";
import { useT } from "@/ui/i18n";

type SubgroupListProps = {
  subgroups: string[];
  onPick: (label: string) => void;
};

export const SubgroupList = ({ subgroups, onPick }: SubgroupListProps) => {
  const t = useT();

  return (
    <ul className="flex w-full max-w-88 flex-col gap-2.5">
      {subgroups.map((label) => (
        <li key={label}>
          <Card
            tone="surface"
            radius="lg"
            onClick={() => {
              onPick(label);
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
  );
};
