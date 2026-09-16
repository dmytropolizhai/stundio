import { Button } from "../../ds/index.ts";
import { Sheet } from "../components/Sheet.tsx";
import { formatReleaseDate, useLang, useT, type ChangelogEntry } from "../i18n/index.ts";

/**
 * What changed in the update the user just installed, and — below it — everything the build
 * shipped before that, for anyone who skipped a release or wants to look back.
 *
 * The new entries sit above a hairline under their own heading; older ones read with a muted
 * version label so the eye lands on what is actually new. Opened from Settings there is
 * nothing unread, so the newest release takes that top slot instead of an empty one.
 */
const Entry = ({ entry, dimmed }: { entry: ChangelogEntry; dimmed: boolean }) => {
  const lang = useLang();
  const t = useT();

  return (
    <li className="not-first:mt-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`font-text text-caption font-bold ${dimmed ? "text-muted" : "text-strong"}`}
        >
          {t("whatsNew.eyebrow", { version: entry.version })}
        </span>
        <span className="font-text text-micro text-muted">
          {formatReleaseDate(entry.date, lang)}
        </span>
      </div>
      <ul className="mt-1.5 space-y-1">
        {entry.lines[lang].map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-link" />
            <span className="font-text text-caption text-strong leading-snug">{line}</span>
          </li>
        ))}
      </ul>
    </li>
  );
};

export const WhatsNewSheet = ({
  open,
  unread,
  history,
  onClose,
}: {
  open: boolean;
  unread: ChangelogEntry[];
  history: ChangelogEntry[];
  onClose: () => void;
}) => {
  const t = useT();
  const headline = unread.length > 0 ? unread : history.slice(0, 1);
  const headlineVersions = new Set(headline.map((entry) => entry.version));
  const earlier = history.filter((entry) => !headlineVersions.has(entry.version));

  return (
    <Sheet open={open} onClose={onClose} title={t("whatsNew.title")}>
      <div className="pb-2">
        <div>
          {history.length === 0 ? (
            <p className="font-text text-caption text-muted">{t("whatsNew.empty")}</p>
          ) : (
            <>
              <ul>
                {headline.map((entry) => (
                  <Entry key={entry.version} entry={entry} dimmed={false} />
                ))}
              </ul>
              {earlier.length > 0 && (
                <details className="mt-4 border-t border-hairline pt-2 group">
                  <summary className="u-eyebrow flex cursor-pointer list-none items-center justify-between py-1.5 select-none text-muted hover:text-strong">
                    <span>{t("whatsNew.history")}</span>
                    <span className="font-text text-micro text-muted">+{earlier.length}</span>
                  </summary>
                  <ul className="pt-2">
                    {earlier.map((entry) => (
                      <Entry key={entry.version} entry={entry} dimmed />
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
        <Button variant="inverse" block onClick={onClose} className="mt-4">
          {t("whatsNew.done")}
        </Button>
      </div>
    </Sheet>
  );
};
