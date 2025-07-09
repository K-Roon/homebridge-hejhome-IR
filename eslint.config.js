
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import json from "@eslint/json";

export default [
  /* 1️⃣ ESLint 기본 JS 권장 규칙 */
  js.configs.recommended,

  ...tseslint.configs.recommended,

  { ignores: ["dist/**", "node_modules/**"] },

  /* 4️⃣ JSON 전용 설정 */
  {
    files: ["**/*.json"],
    ignores: ["package-lock.json"],
    plugins: { json },
    language: "json/json",
    ...json.configs.recommended,
    rules: { "json/no-empty-keys": "warn", "no-irregular-whitespace": "off" },
  },

  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
