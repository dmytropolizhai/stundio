import type { ResolvedStatus } from "@/lib/edupage";
import { Badge } from "@/ds";
import { STATUS_DOT_CLASS, STATUS_TONE, isChanged } from "@/ui/theme";
import { useT } from "@/ui/i18n";

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

/**
 * The day list's "something changed" mark: a small filled dot, not a word.
 *
 * It carries the status colour and nothing else on the card face — the word (and the diff)
 * is one tap away in the lesson sheet's own `StatusBadge`. The word still reaches anyone who
 * can't see the dot's colour: an `sr-only` copy sits right next to it.
 */
export const StatusDot = ({ status }: { status: ResolvedStatus }) => {
  const t = useT();
  if (!isChanged(status)) return null;
  return (
    <>
      <span className="sr-only">{t(`status.${status}`)}</span>
      <span
        aria-hidden="true"
        data-testid={`status-${status}`}
        className={`block size-2.5 rounded-pill ${STATUS_DOT_CLASS[status]}`}
      />
    </>
  );
};
