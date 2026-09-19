import { Card } from "@/ds";
import { useT } from "@/ui/i18n";

type ChangesSchoolNotesProps = {
  notes: readonly string[] | undefined;
  className?: string | undefined;
};

export const ChangesSchoolNotes = ({ notes, className }: ChangesSchoolNotesProps) => {
  const t = useT();

  if (notes === undefined || notes.length === 0) return null;

  return (
    <Card
      tone="sunken"
      radius="lg"
      elevation="none"
      {...(className === undefined ? {} : { className })}
    >
      <h3 className="u-eyebrow mb-1.5">{t("changes.notesFromSchool")}</h3>
      <ul className="flex flex-col gap-1 font-text text-caption text-fg">
        {notes.map((note, idx) => (
          <li key={idx}>• {note}</li>
        ))}
      </ul>
    </Card>
  );
};
