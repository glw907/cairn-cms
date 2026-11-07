# Dependency sweep, 2026-11-07 (0.99.0-rc.4 cut)

The pre-cut sweep after PR #189 (the 2026-11-02 sweep). Every minor and patch at every manifest is taken, every major is held. The earlier survey's majors table is carried forward below. No earlier record file exists under `docs/internal/record/`; #189's body held that survey.

## Release notes: where they could not be read

No web fetch was available, and none of the installed packages ships a `CHANGELOG`. The notes below come from the version delta, the installed packages, and a diff of the used lucide icons between the 1.66.0 tarball and 1.70.0. Where a package's in-range notes could not be read, the row says so, and the gate (lane, `check:close`, showcase build) is the only evidence.

## Before and after (lockfile delta, direct dependencies)

| Package | Before | After | Manifest |
|---|---|---|---|
| @cloudflare/vitest-plugin | 1.5.0 | 1.6.0 | root |
| @cloudflare/workers-types | 5.20261102.1 | 5.20261107.1 | root, showcase, waymark range |
| @lucide/svelte | 1.66.0 | 1.70.0 | root |
| eslint-plugin-jsdoc | 65.4.2 | 65.4.5 | root |
| playwright / @playwright/test | 1.64.1 | 1.65.0 | root, showcase |
| svelte-eslint-parser | 1.10.0 | 1.10.1 | root |
| vite | 8.3.5 | 8.3.6 | root, showcase, waymark range |
| wrangler | 4.156.2 | 4.158.0 | root, showcase, waymark range |
| tailwindcss, @tailwindcss/* | 4.3.3 | 4.3.3 (held) | root, showcase, waymark |
| pflag (Go) | v1.0.10 | v1.0.10 (held, #358) | `tool/` |
| xo/terminfo (Go) | v1.3.0 | v1.3.1 | `tool/` |

`packages/create-cairn-site` had nothing outdated. `templates/waymark` has no lockfile; its ranges mirror the showcase. Left in `go list -m -u all`: `bits-and-blooms/bitset` (v1.24.6, offered v1.29.0), which `go mod why -m` says the main module does not need, and the test-graph pseudo-version modules (`objx`, `x/exp`, `exp/golden`, `check.v1`) that no build uses. The lint-toolchain module `tool/tools/go.mod` is not part of this sweep.

Among the caret-satisfied transitive moves in the root lockfile, `hast-util-raw` 9.2.0 and `hast-util-from-html` 2.1.0 now pull `parse5` 8.1.0 (was 7.3.0), and `entities` moved 6.0.1 to 9.0.0. `rehype-raw` sits in the render pipeline (`src/lib/render/pipeline.ts:10`), so this is a render risk the lane and the e2e run cover. A consumer resolves the same versions through its caret ranges, so it carries no `Consumers must:` line.

## Survey by package

| Package | Features to leverage | Practices to change | Gate risks |
|---|---|---|---|
| @lucide/svelte 1.66 to 1.70 | None. | `triangle-alert` is renamed `triangle-exclamation-point` and kept as an alias (`alert-triangle` and `circle-alert` families renamed the same way). The repo imports `@lucide/svelte/icons/triangle-alert` at `admin-icons.ts:24`, `TidyReview.svelte:24`, and `CairnTidySettings.svelte:49`; the alias resolves to the identical glyph (same three paths). | The icon drift test (`src/tests/unit/reproductions-icon-drift.test.ts`) reads `iconData` and `__iconData`. Of the 74 imported icons, none changed its path data; the one rename is above. No visual baseline is declared as an intended move. |
| tailwindcss, @tailwindcss/postcss 4.3.5 (not taken) | None. | None. | 4.3.5 still fails `npm run package` with lightningcss `EmptySelector` on daisyUI 5.7.50's `.join` rule, so the 4.3.3 pin stays (#324). The showcase build was run on 4.3.3 only. |
| vite 8.3.5 to 8.3.6 | Notes not readable. | None known. | Showcase `vite build` and the lane cover it. |
| wrangler 4.156.2 to 4.158.0, @cloudflare/vitest-plugin 1.5.0 to 1.6.0 | Notes not readable. | None known. | The vitest pool tests in the lane cover the plugin; the plugin still peers on vitest 4.1 or 5. |
| playwright 1.64.1 to 1.65.0 | Notes not readable. | A browser build bump can move a rendered pixel; CI baselines are the judge. | No baseline is declared as an intended move; any move CI reports is undeclared and a stop. |
| eslint-plugin-jsdoc 65.4.5, svelte-eslint-parser 1.10.1, workers-types | Notes not readable. | None known. | `check:comments` and `svelte-check` in the lane. |
| pflag v1.1.0 (not taken), terminfo v1.3.1 | None the repo hand-rolls. | pflag v1.1.0 changes man-page flag rendering (bools no longer print `[=false]`). | `TestGeneratedPageCarriesEachFlagsOwnType` failed on v1.1.0, so pflag is held at v1.0.10 and filed as #358. |

## Refactor decisions

| Item | Code | Ruling |
|---|---|---|
| lucide alias rename of `triangle-alert` | Three import sites above | Not changed. The alias is supported and the glyph is identical; renaming the imports would churn three files for no gain. Revisit when lucide drops the alias. |
| Anything else | | Nothing in range that the repo hand-rolls. No take-now, no file, no refactoring pass. |

## Held majors

| Package | Current | Latest | Unblock trigger |
|---|---|---|---|
| typescript | 6.0.3 | 7.0.2 | `tsgo.yml` green, `@sveltejs/kit` peer admits `^7`, typescript-eslint (or a tsdoc replacement) admits `^7`. Unchanged. |
| @types/node | 24.19.2 | 26.6.6 | Geoff raises the Node floor (`docs/STATUS.md`); bump with CI. Unchanged. |
| devalue | 5.9.4 | 6.0.3 | `@sveltejs/kit` and `svelte` admit `^6`. Unchanged. |
| @anthropic-ai/sdk | 0.132.1 | 1.6.0 | Migration notes confirm the fields at `content-routes-context.ts` (messages.create call), the peer widens to `<2`, a test passes on 1.x. Latest moved 1.4.0 to 1.6.0; trigger unchanged. |
| tailwindcss family (pin, not a major) | 4.3.3 | 4.3.5 | A release whose `npm run package` and showcase build pass, or a daisyUI change to the `.join` rule (#324). 4.3.5 fails. |

## Audit

`npm audit` still reports only dev-only findings whose fixes need `--force` (downgrades), so they wait as majors.

## Tooling friction

- `npm update --save --ignore-scripts` again rewrote `packages/cairn-cms-dev` peers (`"*"` to `file:../..`, `^3` to `^3.1.1`); restored by checkout (#327).
- The worktree guard refused compound git commands; commits go one command at a time.
- playwright 1.65.0 wants a new browser build: five browser-launching unit tests failed with "Executable doesn't exist" until `npx playwright install chromium` ran. CI installs its own; a local checkout needs the install after the bump.

## vitest 5

Taken as #331 (Geoff approved the major, 2026-11-07): `vitest`, `@vitest/browser`, and `@vitest/browser-playwright` at `^5.1.0` in the root, the showcase, and `templates/waymark`. vitest 5's own migration notes were not readable (no web fetch; the installed package ships no guide), so each break below was found by running the suites and reading the matcher source in `node_modules/@vitest/browser`.

`npm install` with only the three ranges edited fails ERESOLVE against the lockfile (the old exact `@vitest/browser` peer pins). The fix was to drop the `vitest` and `@vitest/*` entries from `package-lock.json` and rerun `npm install --ignore-scripts`. `packages/cairn-cms-dev` peers did not move. The reinstall pruned the showcase's generated `node_modules/$app`; `npx svelte-kit sync` restores it.

| What broke | Fix |
|---|---|
| Browser `locators.exact` now defaults to true: ten `getByText` and `getByRole` calls whose name is a prefix or part of the accessible name failed (`CairnAdmin`, `CairnAdminShell`, `CairnHistory`, `ManageEditors`, `reproductions-stories`). | Per-call `{ exact: false }`, with a one-line why where the reason is not evident. No config switch. |
| `toHaveTextContent` now matches the whole text and takes no regex: `ComponentInsertDialog` (`/1 block/i` against "1 block matches") and `ConceptList` (`'5'` against "All5") failed. | `toMatchTextContent`, the partial and regex matcher vitest 5 names for this. The other eleven uses are whole-text and stay. |
| Mock factories run in an `AsyncLocalStorage` that vitest calls `disable()` on; workerd does not implement `disable()`. The `content-routes-tidy` truncation test, whose `vi.doMock('@anthropic-ai/sdk')` factory returns a module in the integration project, fell through to the real SDK and answered `sdk_missing`. The sibling tests passed because their factory throws. | A `beforeEach` no-op for `AsyncLocalStorage.prototype.disable` in that one describe, restored in `afterEach`. Test-local; upstream vitest or the Cloudflare plugin should make it unnecessary. |
| Inline `projects` now extend the root config, which made the comment at `vitest.config.ts:71` false. | Comment corrected. The per-project `unstubGlobals` lines are redundant now and kept. |
| Report and attachment directories moved to `.vitest/`. | `.gitignore` entry `.vitest-attachments/` becomes `.vitest/`. No workflow uploads vitest reports or attachments (`.github/workflows` checked), so no runner path changed. |

No mock-clearing failure and no un-awaited-assertion failure appeared. No compatibility option is kept.
