import { compareVersions, parseVersion } from "./parse.ts";

export type GitHubRelease = {
  tag_name: string;
  html_url: string;
};

export type UpdateCheckResult = {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  url: string;
};

export type FetchLatestRelease = (owner: string, repo: string) => Promise<GitHubRelease>;

/** The public, unauthenticated GitHub REST API — no token needed, CORS-friendly. */
export const fetchLatestRelease: FetchLatestRelease = async (owner, repo) => {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub releases request failed: ${res.status}`);
  return (await res.json()) as GitHubRelease;
};

/**
 * Never throws — offline, rate-limited, or no releases yet all just mean "nothing to
 * report", not an error the user needs to see (same spirit as the substitution parser).
 */
export const checkForUpdate = async (
  currentVersion: string,
  owner: string,
  repo: string,
  fetchRelease: FetchLatestRelease = fetchLatestRelease,
): Promise<UpdateCheckResult | null> => {
  try {
    const release = await fetchRelease(owner, repo);
    const latest = parseVersion(release.tag_name);
    const current = parseVersion(currentVersion);
    if (latest === null || current === null) return null;
    return {
      hasUpdate: compareVersions(latest, current) > 0,
      currentVersion,
      latestVersion: release.tag_name,
      url: release.html_url,
    };
  } catch {
    return null;
  }
};
