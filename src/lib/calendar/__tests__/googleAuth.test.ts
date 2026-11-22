/**
 * Google Identity Services wrapper: the script is loaded lazily and once, and the popup's
 * outcomes map to a token, a cancellation or a failure. The real script is never fetched.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleSignInCancelled, requestGoogleToken } from "../googleAuth.ts";

type Config = {
  callback: (r: { access_token?: string; error?: string }) => void;
  error_callback?: (e: { type?: string }) => void;
};

const install = (act: (config: Config) => void) => {
  const requestAccessToken = vi.fn();
  (window as unknown as { google: unknown }).google = {
    accounts: {
      oauth2: {
        initTokenClient: (config: Config) => ({
          requestAccessToken: () => {
            requestAccessToken();
            act(config);
          },
        }),
      },
    },
  };
  return requestAccessToken;
};

afterEach(() => {
  delete (window as unknown as { google?: unknown }).google;
});

describe("requestGoogleToken", () => {
  it("resolves with the access token", async () => {
    const ask = install((c) => c.callback({ access_token: "abc" }));
    await expect(requestGoogleToken("client", "scope")).resolves.toBe("abc");
    expect(ask).toHaveBeenCalledOnce();
  });

  it("treats a declined consent as a cancellation", async () => {
    install((c) => c.callback({ error: "access_denied" }));
    await expect(requestGoogleToken("client", "scope")).rejects.toBeInstanceOf(
      GoogleSignInCancelled,
    );
  });

  it("treats a closed popup as a cancellation", async () => {
    install((c) => c.error_callback?.({ type: "popup_closed" }));
    await expect(requestGoogleToken("client", "scope")).rejects.toBeInstanceOf(
      GoogleSignInCancelled,
    );
  });

  it("fails on any other error", async () => {
    install((c) => c.callback({ error: "server_error" }));
    await expect(requestGoogleToken("client", "scope")).rejects.toThrow("server_error");
    install((c) => c.error_callback?.({ type: "popup_failed_to_open" }));
    await expect(requestGoogleToken("client", "scope")).rejects.toThrow("popup_failed_to_open");
  });

  it("refuses to run before the script is loaded", async () => {
    await expect(requestGoogleToken("client", "scope")).rejects.toThrow("not loaded");
  });
});

describe("loadGoogleIdentity", () => {
  /** A fresh module per test (the loader remembers an in-flight load) with the script captured, not run. */
  const fresh = async () => {
    vi.resetModules();
    const scripts: HTMLScriptElement[] = [];
    vi.spyOn(document.head, "append").mockImplementation((...nodes) => {
      for (const node of nodes) scripts.push(node as HTMLScriptElement);
    });
    return { ...(await import("../googleAuth.ts")), scripts };
  };

  afterEach(() => vi.restoreAllMocks());

  it("resolves at once when the script is already there", async () => {
    const { loadGoogleIdentity: load, googleIdentity: current, scripts } = await fresh();
    install(() => undefined);
    await expect(load()).resolves.toBe(current());
    expect(scripts).toHaveLength(0);
  });

  it("adds Google's script once and resolves when it loads", async () => {
    const { loadGoogleIdentity: load, scripts } = await fresh();
    const first = load();
    const second = load();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.src).toBe("https://accounts.google.com/gsi/client");
    install(() => undefined);
    scripts[0]?.onload?.(new Event("load"));
    await expect(first).resolves.toBeDefined();
    await expect(second).resolves.toBeDefined();
  });

  it("rejects when the script runs but defines nothing", async () => {
    const { loadGoogleIdentity: load, scripts } = await fresh();
    const pending = load();
    scripts[0]?.onload?.(new Event("load"));
    await expect(pending).rejects.toThrow("did not load");
  });

  it("rejects, and can retry later, when the script fails to load", async () => {
    const { loadGoogleIdentity: load, scripts } = await fresh();
    const failed = load();
    scripts[0]?.onerror?.(new Event("error"));
    await expect(failed).rejects.toThrow("could not be loaded");
    void load();
    expect(scripts).toHaveLength(2);
  });
});
