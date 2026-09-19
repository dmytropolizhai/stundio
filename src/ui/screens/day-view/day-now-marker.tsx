type DayNowMarkerProps = {
  label: string;
};

export const DayNowMarker = ({ label }: DayNowMarkerProps) => (
  <li className="flex items-center gap-2 px-2" data-testid="now-marker">
    <span className="size-2 rounded-pill bg-brand" />
    <span className="h-px flex-1 bg-brand/60" />
    <span className="font-text text-micro font-bold tracking-label text-brand-strong uppercase">
      {label}
    </span>
  </li>
);
