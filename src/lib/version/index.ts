export { parseVersion, compareVersions, type Version } from "./parse.ts";
export {
  checkForUpdate,
  fetchLatestRelease,
  type GitHubRelease,
  type UpdateCheckResult,
  type FetchLatestRelease,
} from "./checkUpdate.ts";
