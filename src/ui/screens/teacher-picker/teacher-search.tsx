import { TextField } from "@/ds";
import { useT } from "@/ui/i18n";

type TeacherSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export const TeacherSearch = ({ value, onChange }: TeacherSearchProps) => {
  const t = useT();

  return (
    <div className="px-gutter pb-3">
      <TextField
        type="search"
        value={value}
        onChange={onChange}
        placeholder={t("teacher.search")}
        aria-label={t("teacher.search")}
        icon="search"
      />
    </div>
  );
};
