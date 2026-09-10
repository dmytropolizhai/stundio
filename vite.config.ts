/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Capacitor copies dist/ into the Android assets bundle.
  build: { outDir: "dist", sourcemap: true },
  server: { host: true },
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
