/**
 * Release tags look like `v0.0.1-alpha` — a leading `v`, then dotted numbers, then an
 * optional `-<word>` suffix (alpha/beta/rc/…) that we don't compare on.
 */
export type Version = readonly number[];

export const parseVersion = (raw: string): Version | null => {
  const numeric = raw.trim().replace(/^v/i, "").split("-")[0];
  if (!numeric) return null;
  const parts = numeric.split(".").map(Number);
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return parts;
};

/** -1 if `a` < `b`, 0 if equal, 1 if `a` > `b`. Missing trailing parts count as 0. */
export const compareVersions = (a: Version, b: Version): number => {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
};
