/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version: string;
};

/**
 * Fills `public/sw.js`'s `BUILD_ID` / `BUILD_ASSETS` placeholders in the built `dist/sw.js`
 * with every file this build emitted, so the worker precaches lazy chunks and fonts too rather
 * than only what index.html names — an offline launch must never need a file it has not seen.
 * Source maps are left out (never fetched by users), and so is the `.woff` twin of each font:
 * every browser with service workers takes the `.woff2`. `BUILD_ID` hashes the list, so a
 * deploy that changes any asset changes the cache name and the worker reinstalls.
 */
const precacheManifest = (): Plugin => {
  let assets: string[] = [];
  let outDir = "dist";
  return {
    name: "stundio-precache-manifest",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      assets = Object.keys(bundle)
        .filter((file) => file !== "index.html" && !/\.(map|woff)$/.test(file))
        .map((file) => `/${file}`)
        .sort();
    },
    // `closeBundle`, not `writeBundle`: the public dir (and with it sw.js) must already be
    // copied into outDir when this runs.
    closeBundle() {
      const swPath = resolve(outDir, "sw.js");
      const buildId = createHash("sha256").update(assets.join("\n")).digest("hex").slice(0, 12);
      const source = readFileSync(swPath, "utf-8");
      const built = source
        .replace('const BUILD_ID = "dev";', `const BUILD_ID = ${JSON.stringify(buildId)};`)
        .replace("const BUILD_ASSETS = [];", `const BUILD_ASSETS = ${JSON.stringify(assets)};`);
      if (built === source || !built.includes(buildId)) {
        throw new Error("sw.js placeholders not found — the precache manifest was not injected");
      }
      writeFileSync(swPath, built);
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), precacheManifest()],
  // shadcn convention: "@/…" is the src root. Mirrored in tsconfig.app.json paths.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Read once at build/test time so `src/` never imports package.json directly.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // Capacitor copies dist/ into the Android assets bundle.
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into stable, separately-cached chunks.
        // The default 600 kB limit is no longer needed once the main chunk is only app code.
        manualChunks(id) {
          if (id.includes("node_modules/react-dom")) return "react-dom";
          if (id.includes("node_modules/framer-motion")) return "framer-motion";
          if (id.includes("node_modules/lucide-react")) return "lucide";
          if (id.includes("node_modules/@radix-ui")) return "radix";
        },
      },
    },
  },
  server: {
    // `host: true` so a phone on the same Wi-Fi can open the dev server.
    host: true,
    // EduPage sends no CORS headers, so the browser cannot call it directly (CLAUDE.md).
    // On device `CapacitorHttp` has no such limit — this proxy exists only to make
    // `npm run dev` usable against real data. `apiBaseUrl` in client.ts picks the prefix.
    proxy: {
      "/api-edupage": {
        target: "https://pikcrvt.edupage.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-edupage/, ""),
      },
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "functions/**/*.test.ts",
      "landing/**/*.test.ts",
    ],
    coverage: {
      include: [
        "src/lib/edupage/**",
        "src/lib/schedule/**",
        "src/lib/share/**",
        "src/lib/version/**",
        "src/lib/network/**",
        "src/lib/widget/**",
        "src/db/**",
        "src/widget/**",
        "src/sync/**",
        "src/notifications/**",
        "src/store/**",
        "src/ui/**",
      ],
      exclude: ["**/__tests__/**"],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
});
