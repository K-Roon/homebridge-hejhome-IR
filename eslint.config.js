
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import json from "@eslint/json";

export default [
  /* 1️⃣ ESLint 기본 JS 권장 규칙 */
  js.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,

  { ignores: ["dist/**", "node_modules/**"] },

  /* 4️⃣ JSON 전용 설정 */
  {
    files: ["**/*.json"],
    ignores: ["package-lock.json"],
    plugins: { json },
    languageOptions: { parser: json.parser },
    rules: { "json/no-empty-keys": "warn" },
  },

  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
