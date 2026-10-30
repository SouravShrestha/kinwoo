import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.open-next/**",
      "**/.next/**",
      "**/.expo/**",
      "**/.turbo/**",
      "**/next-env.d.ts",
      "**/android/**",
      "**/ios/**",
      "brag-output/**",
      "packages/tokens/generated/**",
      "packages/core/src/database.generated.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals").map((config) => ({
    ...config,
    files: ["apps/web/**/*.{ts,tsx}"],
  })),
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    settings: {
      next: {
        rootDir: "apps/web",
      },
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["apps/mobile/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "window", message: "apps/mobile has no DOM." },
        { name: "document", message: "apps/mobile has no DOM." },
        { name: "localStorage", message: "Use AsyncStorage directly." },
      ],
    },
  },
  {
    files: ["packages/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*", "fs", "path", "zlib", "crypto", "buffer", "stream"],
              message: "core runs on Hermes and Workers. Node built-ins do not belong here.",
            },
            {
              group: ["next", "next/*", "react", "react-dom", "react-native", "react-native/*"],
              message: "core is framework-free.",
            },
            {
              group: ["**/*.server", "**/*.server.*"],
              message: "core must never reach a .server module.",
            },
            {
              group: ["@kinwoo/*"],
              message: "core sits at the bottom of the dependency graph.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "window", message: "core has no DOM." },
        { name: "document", message: "core has no DOM." },
        { name: "localStorage", message: "storage is injected by the app." },
        { name: "sessionStorage", message: "storage is injected by the app." },
        { name: "navigator", message: "core has no DOM." },
        { name: "fetch", message: "core is pure. I/O belongs in packages/client." },
        { name: "Buffer", message: "Node-only. Does not exist in Hermes." },
        { name: "__dirname", message: "Node-only. Does not exist in Hermes." },
        { name: "__filename", message: "Node-only. Does not exist in Hermes." },
        { name: "require", message: "core is ESM-only." },
      ],
    },
  },
  {
    files: ["packages/client/src/**/*.{ts,tsx}"],
    ignores: ["packages/client/src/**/*.test.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "window", message: "Inject platform behaviour instead; this package runs on RN." },
        {
          name: "document",
          message: "Inject platform behaviour instead; this package runs on RN.",
        },
        { name: "localStorage", message: "Storage must be injected." },
        { name: "sessionStorage", message: "Storage must be injected." },
        { name: "navigator", message: "Device facts are not this package's concern." },
      ],
    },
  },
  {
    files: ["packages/tokens/src/**/*.ts"],
    ignores: ["packages/tokens/src/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*", "fs", "path", "next", "next/*", "react", "react-native"],
              message: "the runtime side of @kinwoo/tokens is consumed by Hermes.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "window", message: "tokens has no DOM." },
        { name: "document", message: "tokens has no DOM." },
      ],
    },
  },
  eslintPluginPrettier,
);
