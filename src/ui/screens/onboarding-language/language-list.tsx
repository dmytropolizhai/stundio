import { Card } from "@/ds";
import { LANGS, LANG_NAMES, type Lang } from "@/ui/i18n";

type LanguageListProps = {
  selectedLang: Lang;
  onSelect: (lang: Lang) => void;
};

export const LanguageList = ({ selectedLang, onSelect }: LanguageListProps) => {
  return (
    <ul className="flex w-full max-w-88 flex-col gap-2.5">
      {LANGS.map((key: Lang) => {
        const active = key === selectedLang;
        return (
          <li key={key}>
            <Card
              tone="surface"
              radius="lg"
              onClick={() => {
                onSelect(key);
              }}
              className={`flex items-center justify-center border-2 ${
                active ? "border-brand-strong" : "border-transparent"
              }`}
            >
              <span
                className={`font-text text-body font-bold ${
                  active ? "text-brand-strong" : "text-strong"
                }`}
              >
                {LANG_NAMES[key]}
              </span>
            </Card>
          </li>
        );
      })}
    </ul>
  );
};
