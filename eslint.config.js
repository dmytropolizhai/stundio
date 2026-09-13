import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "android", "coverage", ".venv", "reference"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
  {
    // Nothing under lib/edupage may reach for Capacitor except http.ts (CLAUDE.md).
    files: ["src/lib/edupage/**/*.ts"],
    ignores: ["src/lib/edupage/http.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@capacitor/*"],
              message: "Only src/lib/edupage/http.ts may import Capacitor.",
            },
          ],
        },
      ],
    },
  },
  {
    // Same rule, mirrored for lib/analytics.
    files: ["src/lib/analytics/**/*.ts"],
    ignores: ["src/lib/analytics/http.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@capacitor/*"],
              message: "Only src/lib/analytics/http.ts may import Capacitor.",
            },
          ],
        },
      ],
    },
  },
  {
    // And for lib/share, where only the OS hand-off is native — the painter stays portable.
    files: ["src/lib/share/**/*.ts"],
    ignores: ["src/lib/share/native.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@capacitor/*"],
              message: "Only src/lib/share/native.ts may import Capacitor.",
            },
          ],
        },
      ],
    },
  },
);
