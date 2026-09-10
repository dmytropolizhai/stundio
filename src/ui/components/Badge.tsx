import type { ResolvedStatus } from "../../lib/edupage/index.ts";
import { Badge } from "../../ds/index.ts";
import { STATUS_TONE, isChanged } from "../theme/index.ts";
import { useT } from "../i18n/index.ts";

/** The one-word "what changed" chip. Renders nothing for an unchanged lesson. */
export const StatusBadge = ({ status }: { status: ResolvedStatus }) => {
  const t = useT();
  if (!isChanged(status)) return null;
  return (
    <Badge tone={STATUS_TONE[status]} data-testid={`status-${status}`}>
      {t(`status.${status}`)}
    </Badge>
  );
};
