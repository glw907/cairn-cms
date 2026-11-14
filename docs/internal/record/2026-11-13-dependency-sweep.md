# Dependency sweep, 2026-11-13 (setup-tooling pass 3 candidate)

The sweep before the pass 3 candidate, the first since the 0.99.0-rc.4 cut (`2026-11-07-dependency-sweep.md`). Every minor and patch at every manifest is taken, and every major is held. The tailwindcss pin (#324) is lifted, because daisyUI 5.8.0 rewrote the `.join` rule that broke 4.3.4 and later.

The survey read GitHub releases, changelogs, the daisyUI changelog page, and npm tarballs for exactly each bumped range. `@cloudflare/workers-types` publishes no notes, and its row says so.

## Before and after (direct dependencies)

| Package | Before | After | Manifest |
|---|---|---|---|
| @cloudflare/vitest-plugin | 1.6.0 | 1.8.2 | root |
| @cloudflare/workers-types | 5.20261107.1 | 5.20261114.1 | root, showcase, waymark |
| @codemirror/lint | 6.9.7 | 6.9.8 | root (runtime) |
| @lucide/svelte | 1.70.0 | 1.72.0 | root (runtime) |
| @sveltejs/kit | 3.1.1 | 3.2.0 | root, showcase, waymark |
| daisyui | 5.7.50 | 5.8.0 | root, showcase, waymark |
| eslint | 10.14.0 | 10.15.0 | root |
| eslint-plugin-jsdoc | 65.4.5 | 65.4.6 | root |
| playwright, @playwright/test | 1.65.0 | 1.65.1 | root, showcase |
| postcss | 8.5.32 | 8.5.33 | root |
| prettier | 3.9.10 | 3.10.1 | showcase, waymark |
| tailwindcss, @tailwindcss/* | 4.3.3 (pinned) | 4.3.5 (pinned) | root, showcase, waymark |
| typescript-eslint | 8.72.1 | 8.72.2 | root |
| vite | 8.3.6 | 8.3.8 | root, showcase, waymark |
| wrangler | 4.158.0 | 4.162.0 | root, showcase, waymark |
| charm.land/lipgloss/v2 (Go) | v2.0.6 | v2.1.0 | `tool/` |
| golang.org/x/crypto, x/sys, x/term (Go) | v0.58.0, v0.49.0, v0.47.0 | v0.59.0, v0.50.0, v0.48.0 | `tool/` |
| `go` directive | 1.26.0 | 1.26.7 | `tool/` |
| spf13/pflag (Go) | v1.0.10 | v1.0.10 (held, #358) | `tool/` |

`packages/create-cairn-site` had nothing outdated, and `tool/tools/go.mod` had nothing outdated. `templates/waymark` has no lockfile, and its ranges mirror the showcase. `go mod tidy` raised the `go` directive to 1.26.7 because a bumped module requires it, so `tool/README.md` now names that floor. CI's `1.26.x` and `go-version-file` setups already satisfy it.

Against the pre-sweep lockfiles, the root changes 81 resolved versions, adds 17 entries, and drops 15; the showcase changes 83, adds 12, and drops 25. svelte didn't move. The render pipeline moved by patches only (`hast-util-to-mdast` 10.1.3, `mdast-util-to-hast` 13.2.2, `parse5` 8.1.1), and `rehype`, `unified`, and `micromark` didn't move. Elsewhere, rolldown went to 1.2.19, lightningcss deduped to 1.33.0, miniflare and workerd went to 20261113, and minimatch 11.0.8 now sits beside 10.2.6. The wasm-runtime packages (`@emnapi` 2.0.0-beta.2, `@napi-rs/wasm-runtime`, `@tybys/wasm-util`) came in through `@tailwindcss/oxide` 4.3.5. Indirect Go modules moved too: catppuccin v0.3.0, charmtone v0.1.1, `charmbracelet/x/exp/strings` v0.1.0 (from a pseudo-version), go-humanize v1.1.0, mango v0.2.0, mango-cobra v1.3.0, mango-pflag v0.2.0, x/sync v0.25.0, and x/text v0.44.0.

## Survey by package

| Package | Features to leverage | Practices to change | Gate risks |
|---|---|---|---|
| daisyui 5.7.50 to 5.8.0 | No new components. `--join-r` sets a join's radius from the main element (#4786), which `EditorToolbar.svelte:278` hand-rolls. The alert layout with no icon is fixed (#4785), which `ConceptList.svelte:382` overrides by hand. | `.join` children now sit under `:where(:scope>…)`. Forced-colors fixes land across btn, menu, tab, modal, and tooltip. A checked toggle's knob is `currentColor` even when disabled. | `npm run package`, the `.join-item` seam rule at `cairn-admin.css:669-678`, and the width-matrix baselines. |
| tailwindcss family 4.3.3 to 4.3.5 | None. | 4.3.4 changed how `@scope` is emitted (#20369). | `npm run package` and the showcase build, the #324 hold. |
| @cloudflare/vitest-plugin 1.6.0 to 1.8.2 | 1.6.1 fixes `vi.mock()` factories under Vitest 5.1 ("asyncLocalStorage.disable() is not implemented"), the bug behind the test-local no-op in `content-routes-tidy.test.ts`. | 1.7.0 and 1.8.0 run Containers for Durable Objects, which the repo doesn't use. | The `content-routes-tidy` truncation test with the no-op deleted. |
| @sveltejs/kit 3.1.1 to 3.2.0 | None the repo hand-rolls. | Peers unchanged (`typescript ^6`, `devalue ^5.9.4`). | Showcase e2e. |
| wrangler 4.158.0 to 4.162.0 | None. | Artifacts and Workflow defaults changed; no config here uses either. Miniflare needs Node 22.12 or later, below the repo's 24. | `wrangler deploy --dry-run` in the showcase. |
| vite 8.3.6 to 8.3.8 | None. | Rolldown 1.2.18. | Showcase build, and the dist `.svelte` TypeScript gotcha. |
| @lucide/svelte 1.70.0 to 1.72.0 | None. | 1.71.0 renamed the `circle-arrow-*` and `square-arrow-*` icons, which the repo doesn't import. | The 74 imported icons' path data is identical across the range. |
| eslint 10.15.0, typescript-eslint 8.72.2, eslint-plugin-jsdoc 65.4.6 | None. | Rule fixes (`no-shadow`, `no-invalid-this`, `no-deprecated`, `prefer-nullish-coalescing`). typescript-eslint still peers `typescript <6.1.0`. | Lint. |
| playwright 1.65.1, postcss 8.5.33, prettier 3.10.1, @codemirror/lint 6.9.8 | None. | Bug fixes only. Chromium goes to 159.0.8154.6. | Local `npx playwright install chromium`; CI baselines judge a pixel move. |
| @cloudflare/workers-types | Notes not readable. | None known. | `svelte-check`. |
| lipgloss v2.0.6 to v2.1.0 | `table.FitContent()`, for `internal/render/body_many.go:12`. | Dark detection uses CIELAB lightness, `RGBColor` is 16-bit, and `compat` honors `NO_COLOR`. | The render goldens and the newview screen tests. |
| x/crypto, x/sys, x/term, catppuccin, mango family | None. | mango-pflag v0.2.0 bumps pflag only to v1.0.10, so #358 is unaffected. | The Go gate. |

## Refactor decisions

| Capability | Code | Ruling |
|---|---|---|
| vitest-plugin 1.6.1's `vi.mock()` fix | The `AsyncLocalStorage.prototype.disable` no-op in `src/tests/integration/content-routes-tidy.test.ts` | Taken now. The no-op and its imports are gone, and 27 of 27 tests pass, the truncation test among them. |
| daisyUI 5.8.0's `.join` rewrite | The tailwindcss 4.3.3 pin (#324) | Taken now. The pin moves to 4.3.5 in the root, the showcase, and the template, and #324 is done. |
| daisyUI `--join-r` | `EditorToolbar.svelte:278` squares corners by hand | Not changed. The toolbar works and a swap could move its radii; the next admin pass that touches the toolbar weighs it. |
| daisyUI icon-less alert fix (#4785) | `ConceptList.svelte:382` overrides the narrow layout by hand | Not changed. The override still renders correctly, and a removal is a visible change for an admin pass to judge at 320 and 390. |
| lipgloss `table.FitContent()` | `tool/internal/render/body_many.go:12` | Not changed. The table renders correctly today, and no golden asks for it. |
| daisyUI disabled checked toggle | `src/tests/component/cairn-idiom-controls.test.ts` asserts stock | The test now expects the stock `currentColor` knob. cairn matches stock and adds no override. |

## Verification

- `npm run package` exits 0 with daisyUI 5.8.0 and tailwindcss 4.3.5 (admin stylesheet 622219 bytes), and the showcase `npm run build` exits 0.
- daisyUI 5.8.0 still sets only the leading-edge margin on `.join-item`, so the seam rule at `cairn-admin.css:669-678` still holds and is emitted.
- `reproductions-icon-drift.test.ts` passes, 2 of 2.
- `make -C tool check` exits 0. The render goldens and the newview screen tests pass with lipgloss 2.1.0, so nothing shifted. `GOTOOLCHAIN=go1.27.4 make -C tool vulncheck` finds no vulnerabilities.
- `npm run lane:fast -- --range c950a3f6e..HEAD` exits 0 (5719 unit and 1906 component tests). Its first run failed only the disabled-switch test above. `npm run check:close` exits 0.
- No visual baseline is declared as an intended move. The disabled checked switch is the one known visible change, so a CI baseline that moves anywhere else is a stop.

## Held majors

| Package | Current | Latest | Unblock trigger |
|---|---|---|---|
| typescript | 6.0.3 | 7.0.2 | `tsgo.yml` green, `@sveltejs/kit` admits `^7` (3.2.0 peers `^6`), and typescript-eslint admits `^7` (8.72.2 peers `<6.1.0`). Unchanged. |
| @types/node | 24.19.2 | 26.6.6 | Workers Builds makes Node 26 its default; then the Node floor, the CI pins, and the template's `check.yml` move with it (#333, Geoff's hold). |
| devalue | 5.9.4 | 6.0.3 | `@sveltejs/kit` (3.2.0 needs `^5.9.4`) and `svelte` (5.57.3 needs `^5.9.2`) admit `^6`. Unchanged. |
| @anthropic-ai/sdk | 0.132.1 | 1.8.0 | The 1.x notes confirm the fields at the `content-routes-context.ts` `messages.create` call, the peer widens to `<2`, and a test passes on 1.x. The 1.7.0 and 1.8.0 notes add Claude Tag and Admin API fields only. |
| spf13/pflag (Go) | v1.0.10 | v1.1.0 | `TestGeneratedPageCarriesEachFlagsOwnType` passes on v1.1.0, or the man-page form is ruled (#358). |

## Audit

`npm audit --omit=dev` reports 0 vulnerabilities at the root. The dev-only moderate findings (deepmerge through `@sveltejs/vite-plugin-svelte`, minimatch through `@eslint/config-array` and `typescript-estree`) need `--force` downgrades, so they wait as majors. The showcase reports 4 low findings.

## Tooling friction

- `npm update --save --ignore-scripts` again rewrote `packages/cairn-cms-dev` peers, restored by checkout (#327). It also reformatted the `test:emit` script line, reverted by hand.
- `npm update --save` moved root `wrangler` in the lockfile but not in `package.json`; the range was set to `^4.162.0` by hand.
- `make -C tool tidy-check` fails before the commit because it diffs `go.mod` and `go.sum` against git; it passes once they're committed.
- playwright 1.65.1 wants a new browser build, so a local checkout runs `npx playwright install chromium` after the bump.
