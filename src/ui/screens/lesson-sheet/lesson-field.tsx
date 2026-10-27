import { ARROW } from "@/ui/screens/changes-view/subst-status.ts";

type LessonFieldProps = {
  label: string;
  value: string;
  was?: string | undefined;
};

export const LessonField = ({ label, value, was }: LessonFieldProps) => {
  const hasWas = was !== undefined && was !== "" && was !== value;
  if (value === "" && !hasWas) return null;

  return (
    <div className="flex justify-between gap-4 border-t border-hairline py-2.5">
      <dt className="font-text text-caption text-muted">{label}</dt>
      <dd className="text-right font-text text-caption font-bold text-strong">
        {hasWas ? (
          <>
            <span className="font-normal text-muted line-through opacity-75">{was}</span>
            {value !== "" && (
              <>
                {" "}
                {ARROW} {value}
              </>
            )}
          </>
        ) : (
          value
        )}
      </dd>
    </div>
  );
};
