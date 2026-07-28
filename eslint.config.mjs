import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off"
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "process_assets.js",
    "process_logo.js",
    "process_packaging.js",
    "scratch_remove_wood_bg.mjs",
    "scratch_remove_white_bg.mjs",
    "scratch_remove_green_bg.mjs",
    "scratch_remove_bg.mjs",
    "scratch_crop_all_ingredients.mjs",
    "scratch_crop_custom_ingredients.mjs",
    "scratch_crop_images.mjs",
    "scratch/**"
  ]),
]);

export default eslintConfig;
