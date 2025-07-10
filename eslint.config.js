// eslint.config.js
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import json from "@eslint/json";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist/**", "node_modules/**", "package.json", "nodemon.json"]),

  js.configs.recommended,

  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "no-unused-vars": "off",
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
        sourceType: "module",
      },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    ...tsPlugin.configs.recommendedTypeChecked,
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.json"],
    ignores: ["config.schema.json", "nodemon.json", "package.json", "package-lock.json"],
    plugins: { json },
    language: "json/json",
    ...json.configs.recommended,
    rules: {
      "no-irregular-whitespace": "off",
    },
  },
]);
