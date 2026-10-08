import { formatDuration } from "@/ui/i18n";

type DayGapProps = {
  minutes: number;
  label: string;
};

export const DayGap = ({ minutes, label }: DayGapProps) => (
  <li className="flex items-center gap-3 px-2 py-1 font-text text-caption text-muted">
    <span className="h-px flex-1 bg-hairline" />
    {label} · {formatDuration(minutes)}
    <span className="h-px flex-1 bg-hairline" />
  </li>
);
