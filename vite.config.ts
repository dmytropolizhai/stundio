/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version: string;
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // shadcn convention: "@/…" is the src root. Mirrored in tsconfig.app.json paths.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Read once at build/test time so `src/` never imports package.json directly.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // Capacitor copies dist/ into the Android assets bundle.
  build: {
    outDir: "dist",
    sourcemap: true,
    // The remaining main chunk is vendor code (react-dom, framer-motion, radix, date-fns)
    // all required by DayView, the tab shown at launch — WeekView/SubjectsView/SettingsView
    // are already code-split via React.lazy in App.tsx. Further chunking reorders bytes
    // without shrinking them, so the default 500 kB warning is just noise here.
    chunkSizeWarningLimit: 600,
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
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
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
