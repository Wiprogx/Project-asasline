/**
 * The import graph, checked instead of described (CODE-5). Copy to the repository root.
 *
 * The first five rules are the same on every repository. The rules under "the boundary map"
 * are the arrows of CLAUDE.md §3 that must not exist, one rule each: edit them to this
 * repository's directories and delete the example. A violation that is there today goes into
 * `.dependency-cruiser-known-violations.json` (`npx depcruise src --baseline`), which the gate
 * passes with `--ignore-known` and which may only shrink - the tool's own per-finding debt,
 * the same principle as the ratchet's `debt`. Regenerating the baseline when a number rose
 * is what `check-direction.mjs` refuses at night.
 *
 * Run: `npx depcruise src --config .dependency-cruiser.cjs --ignore-known --output-type err`
 *      (exit code = number of error-severity violations; the gate treats non-zero as red)
 * Graph: `npx depcruise src --config .dependency-cruiser.cjs --output-type mermaid > docs/graph.mmd`
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "A cycle means neither module can be understood, tested or deleted without the other; " +
        "invert the dependency or move the shared piece below both.",
      from: {},
      to: { circular: true, dependencyTypesNot: ["type-only"] },
    },
    {
      name: "no-orphans",
      severity: "error",
      comment:
        "Nothing imports this module and it is not an entry point: dead (CODE-6), or an entry " +
        "point this config does not know - add it to `pathNot` with the reason.",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)[.][^/]+[.](?:js|cjs|mjs|ts|cts|mts|json)$", // dot files
          "[.]d[.]ts$", // declaration files
          "(^|/)tsconfig[.]json$",
          "(^|/)(?:babel|webpack|vite|vitest|next|playwright|drizzle|eslint|prettier)[.]config[.](?:js|cjs|mjs|ts|cts|mts|json)$",
          "(^|/)(?:app|pages)/.*(?:page|layout|route|loading|error|not-found|template|default|middleware|proxy|instrumentation)[.](?:js|jsx|ts|tsx)$", // framework entry points
          "(^|/)scripts/", // run by name, not imported
          "^src/proxy[.]ts$", // Next.js 16 proxy (was middleware), an entry point outside app/
        ],
      },
      to: {},
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      comment:
        "An import that resolves to nothing fails at runtime or in the build, never in the editor.",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "not-to-dev-dep",
      severity: "error",
      comment:
        "Production code importing a devDependency works on the developer's machine and fails in " +
        "the image; a test helper is the usual culprit.",
      from: {
        path: "^(src|app|server|lib|packages/[^/]+/src)/",
        pathNot:
          "[.](?:spec|test|stories)[.](?:js|mjs|cjs|jsx|ts|tsx)$|(^|/)(?:tests?|e2e|__tests__|fixtures)/",
      },
      to: {
        dependencyTypes: ["npm-dev"],
        dependencyTypesNot: ["type-only"],
        pathNot: ["node_modules/@types/"],
      },
    },
    {
      name: "no-duplicate-dep-types",
      severity: "warn",
      comment:
        "A package listed under two dependency kinds is installed by the wrong one somewhere.",
      from: {},
      to: { moreThanOneDependencyType: true, dependencyTypesNot: ["type-only"] },
    },

    // ---- the boundary map: one rule per arrow that must not exist (CLAUDE.md §3) ---------
    // Direction: domain <- server <- features <- app; components/ui is a leaf; features never
    // import each other. Keep one arrow per rule so a violation names the arrow.
    {
      name: "domain-is-pure",
      severity: "error",
      comment:
        "src/domain is the business rules ported from the legacy engine: no framework, no " +
        "database, no npm package, no clock. It is what the unit tests pin (boundary map, row domain).",
      from: { path: "^src/domain/", pathNot: "[.]test[.]ts$" },
      to: { pathNot: "^src/domain/" },
    },
    {
      name: "server-is-below-the-ui",
      severity: "error",
      comment:
        "The server layer (db, cache, auth, sequences) knows nothing of routes, components or features.",
      from: { path: "^src/server/" },
      to: { path: "^src/(?:app|components|features|hooks|config)/" },
    },
    {
      name: "features-never-import-each-other",
      severity: "error",
      comment:
        "Two features that need each other: the route composes them, or the shared piece moves " +
        "down into domain/ or server/ (boundary map).",
      from: { path: "^src/features/([^/]+)/" },
      to: { path: "^src/features/([^/]+)/", pathNot: "^src/features/$1/" },
    },
    {
      name: "routes-read-through-features",
      severity: "error",
      comment:
        "A page never touches the database client: it calls a feature query, which checks the " +
        "permission first (the DAL). The health probe is the one exception.",
      from: { path: "^src/app/", pathNot: "^src/app/api/health/" },
      to: { path: "^src/server/db/" },
    },
    {
      name: "server-only-never-reaches-shared-ui",
      severity: "error",
      comment:
        "Shared components and hooks run in the browser; the env, secrets and the db stay on the server (SEC-1).",
      from: { path: "^src/(?:components|hooks|lib)/" },
      to: { path: "^src/(?:server/|env[.]ts)" },
    },
    {
      name: "ui-primitives-are-leaves",
      severity: "error",
      comment:
        "components/ui is generated shadcn code: it imports only lib/utils and other primitives.",
      from: { path: "^src/components/ui/" },
      to: { path: "^src/(?:features|server|domain|config|components/(?:shared|layout))/" },
    },
  ],
  options: {
    doNotFollow: { path: ["node_modules"] },
    exclude: { path: ["node_modules", "(^|/)(?:dist|build|coverage|[.]next|[.]turbo)/"] },
    // Pre-compilation dependencies are cruised (faster on TypeScript, and it is what lets an
    // `import type` be recorded as `type-only`, which `no-circular` and `not-to-dev-dep` then
    // exclude: a type cycle is harmless at runtime, a type from a dev dependency is fine).
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
    cache: true,
    reporterOptions: {
      dot: { collapsePattern: "node_modules/(?:@[^/]+/[^/]+|[^/]+)" },
      text: { highlightFocused: true },
    },
  },
};
