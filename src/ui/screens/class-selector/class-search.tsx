import { TextField } from "@/ds";
import { useT } from "@/ui/i18n";

type ClassSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export const ClassSearch = ({ value, onChange }: ClassSearchProps) => {
  const t = useT();

  return (
    <div className="px-gutter pb-3">
      <TextField
        type="search"
        value={value}
        onChange={onChange}
        placeholder={t("class.search")}
        aria-label={t("class.search")}
        icon="search"
      />
    </div>
  );
};
