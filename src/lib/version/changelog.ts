/**
 * "Which release notes has this user not read yet?" — the pure half of the what's-new flow.
 *
 * Content-agnostic on purpose: it only ever looks at an entry's `version`, so the notes
 * themselves (translated, user-facing prose) stay in `ui/i18n/changelog.ts` and `lib/`
 * keeps knowing nothing about languages or screens.
 */
import { compareVersions, parseVersion } from "./parse.ts";

export type VersionedEntry = { version: string };

/** Newest first. Entries whose tag won't parse sort last rather than crashing the sheet. */
export const sortByVersionDesc = <T extends VersionedEntry>(entries: readonly T[]): T[] =>
  [...entries].sort((a, b) => {
    const left = parseVersion(a.version);
    const right = parseVersion(b.version);
    if (left === null || right === null) return left === null ? 1 : -1;
    return -compareVersions(left, right);
  });

/**
 * Everything the installed build has shipped, newest first — the Settings history list.
 * Entries newer than `current` are dropped: notes ship with the build, so a user who hasn't
 * updated yet must not read about features their APK doesn't have.
 */
export const entriesUpTo = <T extends VersionedEntry>(
  entries: readonly T[],
  current: string,
): T[] => {
  const upTo = parseVersion(current);
  if (upTo === null) return [];
  return sortByVersionDesc(entries).filter((entry) => {
    const version = parseVersion(entry.version);
    return version !== null && compareVersions(version, upTo) <= 0;
  });
};

/**
 * The entries released after `lastSeen` and no later than `current`, newest first.
 *
 * `lastSeen === null` means this install has never been marked — a fresh install, or the
 * first launch after the release that introduced this feature. Both return `[]`: a first-time
 * user gets onboarding, not a history dump. The caller still records `current` as seen, so
 * the *next* update has a baseline to compare against.
 *
 * Capping at `current` matters because the file ships with the build: a user who skipped a
 * release must not read notes for a version their APK doesn't contain.
 */
export const entriesSince = <T extends VersionedEntry>(
  entries: readonly T[],
  lastSeen: string | null,
  current: string,
): T[] => {
  if (lastSeen === null) return [];
  const since = parseVersion(lastSeen);
  if (since === null || parseVersion(current) === null) return [];

  return entriesUpTo(entries, current).filter((entry) => {
    const version = parseVersion(entry.version);
    return version !== null && compareVersions(version, since) > 0;
  });
};
