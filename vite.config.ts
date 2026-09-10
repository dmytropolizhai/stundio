/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Capacitor copies dist/ into the Android assets bundle.
  build: { outDir: "dist", sourcemap: true },
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
        "src/db/**",
        "src/sync/**",
        "src/store/**",
        "src/ui/**",
      ],
      exclude: ["**/__tests__/**"],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
});
