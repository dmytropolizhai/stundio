import { useEffect, useState } from "react";
import type { SubjectRef } from "@/lib/edupage";
import { Button } from "@/ds";
import { Sheet } from "../components/Sheet.tsx";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";

/**
 * Freeform note for one subject, keyed the same way `useSubjects.ts` keys its catalogue
 * (`name || short`) so it survives a weekly republish and spans buildings.
 */
export const SubjectNoteSheet = ({
  subject,
  onClose,
}: {
  subject: SubjectRef | null;
  onClose: () => void;
}) => {
  const t = useT();
  const notes = useAppStore((s) => s.notes);
  const setNote = useAppStore((s) => s.setNote);
  const subjectKey = subject === null ? null : subject.name === "" ? subject.short : subject.name;
  const [text, setText] = useState("");

  useEffect(() => {
    setText(subjectKey === null ? "" : (notes[subjectKey]?.text ?? ""));
  }, [subjectKey, notes]);

  const open = subject !== null;
  const title = subject === null ? "" : subject.name === "" ? subject.short : subject.name;

  const save = () => {
    if (subjectKey !== null) void setNote(subjectKey, text);
    onClose();
  };

  return (
    <Sheet open={open} onClose={save} title={title === "" ? "—" : title}>
      {subject !== null && (
        <div className="pb-2">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
            placeholder={t("subjects.note.placeholder")}
            rows={6}
            className="w-full resize-none rounded-2xl bg-card p-4 font-text text-body text-strong shadow-hairline outline-none"
          />
          <Button variant="inverse" block onClick={save} className="mt-5">
            {t("subjects.note.save")}
          </Button>
        </div>
      )}
    </Sheet>
  );
};
