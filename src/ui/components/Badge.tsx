import type { ResolvedStatus } from "../../lib/edupage/index.ts";
import { STATUS_BADGE, isChanged } from "../theme/index.ts";
import { useT } from "../i18n/index.ts";

/** The one-word "what changed" chip. Renders nothing for an unchanged lesson. */
export const StatusBadge = ({ status }: { status: ResolvedStatus }) => {
  const t = useT();
  if (!isChanged(status)) return null;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[status]}`}
      data-testid={`status-${status}`}
    >
      {t(`status.${status}`)}
    </span>
  );
};
