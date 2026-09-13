export { parseVersion, compareVersions, type Version } from "./parse.ts";
export {
  checkForUpdate,
  fetchLatestRelease,
  type GitHubRelease,
  type UpdateCheckResult,
  type FetchLatestRelease,
} from "./checkUpdate.ts";
export { entriesSince, entriesUpTo, sortByVersionDesc, type VersionedEntry } from "./changelog.ts";
export { canInstallInApp, downloadAndInstall, type ApkDownloadProgress } from "./installer.ts";
