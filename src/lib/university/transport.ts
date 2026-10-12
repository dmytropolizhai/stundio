/**
 * Where university requests go, and the one place their responses are checked.
 *
 * Mirrors `lib/edupage/client.ts`: the real origin on device (CapacitorHttp ignores CORS),
 * the `/api-university/{id}` Pages Function in a browser (neither university sends CORS
 * headers — MODEL-UNIVERSITY.md), and the real origin under Vitest, where a fake answers.
 */
import { isNativePlatform, type HttpClient } from "@/lib/edupage";
import type { UniversityId } from "./types.ts";

export const UNIVERSITY_ORIGINS: Record<UniversityId, string> = {
  rtu: "https://nodarbibas.rtu.lv",
  lu: "https://lekciju-saraksts.lu.lv",
};

export const UNIVERSITY_PROXY_PREFIX = "/api-university";

export const universityBaseUrl = (university: UniversityId): string => {
  if (import.meta.env.MODE === "test") return UNIVERSITY_ORIGINS[university];
  return isNativePlatform()
    ? UNIVERSITY_ORIGINS[university]
    : `${UNIVERSITY_PROXY_PREFIX}/${university}`;
};

/** The source answered, but not with what we asked for — an *error*, not *offline*. */
export class UniversityError extends Error {
  readonly detail: unknown;

  constructor(message: string, detail?: unknown) {
    super(message);
    this.name = "UniversityError";
    this.detail = detail;
  }
}

const checkStatus = (what: string, status: number, data: unknown): void => {
  if (status < 200 || status >= 300) {
    throw new UniversityError(`${what}: HTTP ${String(status)}`, data);
  }
};

/** RTU: a form POST answering JSON. Native HTTP may hand back the body unparsed. */
export const postForm = async (
  http: HttpClient,
  university: UniversityId,
  path: string,
  form: Record<string, string>,
): Promise<unknown> => {
  const res = await http({
    url: `${universityBaseUrl(university)}${path}`,
    method: "POST",
    form,
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  checkStatus(path, res.status, res.data);
  if (typeof res.data !== "string") return res.data;
  try {
    return JSON.parse(res.data) as unknown;
  } catch {
    throw new UniversityError(`${path}: response was not JSON`, res.data);
  }
};

/** LU (and RTU's front page): a GET answering HTML. */
export const getHtml = async (
  http: HttpClient,
  university: UniversityId,
  path: string,
  headers?: Record<string, string>,
): Promise<string> => {
  const res = await http({
    url: `${universityBaseUrl(university)}${path}`,
    method: "GET",
    ...(headers === undefined ? {} : { headers }),
  });
  checkStatus(path, res.status, res.data);
  if (typeof res.data !== "string") {
    throw new UniversityError(`${path}: response was not HTML`, res.data);
  }
  return res.data;
};
