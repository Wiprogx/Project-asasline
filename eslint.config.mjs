import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Coverage reports written by the gate's own coverage step.
    "coverage/**",
    // Generated tooling: the Abatty harness is owned and tested by the package.
    ".abatty/**",
    ".claude/**",
    // Read-only reference: the legacy single-file app.
    "legacy/**",
  ]),
]);

export default eslintConfig;
