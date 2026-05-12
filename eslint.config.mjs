// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/.replit-artifact/**",
      ".local/**",
      "lib/api-client-react/src/generated/**",
      "lib/api-zod/src/generated/**",
      "scripts/**",
      "artifacts/dutton-toolkit/ios/**",
      "artifacts/dutton-toolkit/android/**",
      "artifacts/dutton-toolkit/public/**",
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: [
      "artifacts/dutton-toolkit/src/**/*.{ts,tsx}",
      "artifacts/mockup-sandbox/src/**/*.{ts,tsx}",
    ],
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  {
    files: [
      "artifacts/api-server/src/**/*.ts",
      "artifacts/api-server/build.mjs",
      "lib/**/*.ts",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
