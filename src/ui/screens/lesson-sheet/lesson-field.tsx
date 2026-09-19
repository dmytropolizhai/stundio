type LessonFieldProps = {
  label: string;
  value: string;
};

export const LessonField = ({ label, value }: LessonFieldProps) => {
  if (value === "") return null;

  return (
    <div className="flex justify-between gap-4 border-t border-hairline py-2.5">
      <dt className="font-text text-caption text-muted">{label}</dt>
      <dd className="text-right font-text text-caption font-bold text-strong">{value}</dd>
    </div>
  );
};
