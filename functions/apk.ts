/**
 * Cloudflare Pages Function to redirect /apk to the latest GitHub release APK.
 */
export type EventContext<Env = Record<string, unknown>> = {
  request: Request;
  params: Record<string, string | string[]>;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
};

export const GITHUB_REPO = "dmytropolizhai/stundio";
export const FALLBACK_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/stundio.apk`;

export const resolveApkDownloadUrl = async (fetchFn: typeof fetch = fetch): Promise<string> => {
  try {
    const res = await fetchFn(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        "User-Agent": "Stundio-PWA",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (res.ok) {
      const release = (await res.json()) as {
        assets?: Array<{ name: string; browser_download_url: string }>;
      };
      const assets = release.assets ?? [];
      const apkAsset =
        assets.find((a) => a.name === "stundio.apk") ??
        assets.find((a) => a.name.toLowerCase().endsWith(".apk"));

      if (apkAsset?.browser_download_url) {
        return apkAsset.browser_download_url;
      }
    }
  } catch {
    // Fall back if fetch fails or network error occurs
  }

  return FALLBACK_DOWNLOAD_URL;
};

export const onRequestGet = async (): Promise<Response> => {
  const downloadUrl = await resolveApkDownloadUrl();
  return new Response(null, {
    status: 302,
    headers: {
      Location: downloadUrl,
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
};

export const onRequest = onRequestGet;
