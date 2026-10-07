# October dependency sweep (2026-10-07)

Lane L1 of the 2a unattended finish, following the `dependency-upgrade` skill. Every minor and
patch taken; every major held. Manifests measured: root (with the `packages/*` workspaces),
`examples/showcase`, `tool/` and its isolated `tool/tools` lint module. `templates/waymark` is
emitted from the showcase and the packages and was re-emitted with `npm run emit:template`.
`packages/cairn-cms-dev` and `packages/create-cairn-site` declare no third-party range that moved
(`@clack/prompts` ^1.8.1 is current).

## Taken

| Package | Manifest | Old | New |
| --- | --- | --- | --- |
| wrangler | root, showcase | 4.144.0 | 4.148.0 |
| vite | root, showcase | 8.3.1 | 8.3.3 |
| svelte | root, showcase | 5.57.1 | 5.57.2 |
| @sveltejs/kit | root, showcase | 3.0.0 | 3.0.1 |
| @cloudflare/workers-types | root, showcase | 5.20260930.1 | 5.20261007.1 |
| @cloudflare/vitest-pool-workers to @cloudflare/vitest-plugin | root | 0.22.0 | 1.3.7 (rename, see below) |
| @anthropic-ai/sdk | root | 0.129.0 | 0.132.0 |
| playwright, @playwright/test | root, showcase | 1.63.0 | 1.64.0 |
| shiki | root | 4.4.3 | 4.5.0 |
| heic-to | root | 1.5.2 | 1.6.5 |
| @codemirror/language | root | 6.12.4 | 6.13.1 |
| @codemirror/view | root | 6.43.13 | 6.43.14 |
| @lucide/svelte | root | 1.49.0 | 1.52.0 |
| mdast-util-directive | root | 3.1.0 | 3.1.1 |
| eslint | root | 10.11.0 | 10.12.0 |
| eslint-plugin-jsdoc | root | 65.0.0 | 65.2.0 |
| typescript-eslint | root | 8.71.0 | 8.71.1 |
| postcss | root | 8.5.28 | 8.5.29 |
| publint | root | 0.3.24 | 0.3.25 |
| @types/node (24 line) | root, showcase | 24.19.0 | 24.19.1 |
| go.yaml.in/yaml/v3 | tool | v3.0.4 | v3.0.5 |
| golangci-lint | tool/tools | v2.13.2 | v2.14.0 |

Caret-satisfied transitive moves, from the lockfile delta (95 root rows, 47 showcase rows):
rolldown and its bindings 1.2.11 to 1.2.13, `@oxc-project/types` 0.151.0 to 0.153.0, workerd
1.20260926.1 to 1.20261006.1, miniflare 5.20260926.1-alpha to 5.20261006.0-alpha, `@shikijs/*` 4.4.3
to 4.5.0, `@lezer/markdown` 1.7.2 to 1.8.0, `@lezer/css`, `@lezer/javascript`, `@lezer/lr` patches,
`mdast-util-from-markdown` 2.0.3 to 2.1.0, `mdast-util-to-markdown` 2.1.3 to 2.2.0, `chai` 6.2.2 to
6.3.0, `acorn` 8.18.0 to 8.19.0, `magic-string` 1.4.2 and 1.4.3 deduped to 1.4.3 under `@sveltejs/kit` and
`@sveltejs/vite-plugin-svelte` (their own ranges choose the 1.x line), `tinyrainbow` 3.1.1 to 3.2.0, `source-map-js` 1.2.1 to 1.2.2
(clears the high-severity advisory GHSA-68fv-2mgg-jv7q the showcase audit named), new
`@codemirror/streamparser` 6.0.0 under `@codemirror/language`, and the `@typescript-eslint/*`
family to 8.71.1. `@emnapi/*`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util`, and `tslib` left the
tree.

Every declared range in the root, showcase, and (through the emit) the template now floors at the
installed version. A bare-major range with no matching newer version (`^3` for `@sveltejs/package`,
`^8` for the adapter, `^6` for `typescript`) keeps its major-only form, because
`docs/reference/supported-toolchain.md` states `^6` as the TypeScript target and
`check:target-stack` reads it.

Go, `tool/`: `go-runewidth` v0.0.24 to v0.0.30, `go-md2man/v2` v2.0.6 to v2.0.7, and
`golang.org/x/sync` v0.22.0 to v0.23.0 (all indirect). Go, `tool/tools`: `golangci-lint` v2.13.2 to
v2.14.0, `gosec` v2.28.0 to v2.29.0, `govulncheck` unchanged at `golang.org/x/vuln` v1.8.0, and the
linters `golangci-lint` v2.14.0 itself requires (`go-critic` v0.15.0, `revive` v1.17.0,
`exhaustive` v0.13.0, `tagliatelle` v0.8.0, and others). This module came in by requesting the two
tool modules at latest and letting their own `go.mod` pin the linters. A blanket `go get -u tool`
was tried first and abandoned: it pulled `gobwas/glob` v1.0.0 and `nishanths/exhaustive` v0.14.0
past the versions `golangci-lint` v2.14.0 was built against, and the lint binary stopped compiling.

## Survey

Nothing in any range is breaking for this repo.

- **wrangler 4.144.0 to 4.148.0, miniflare, workerd.** New: `assets.base_path`, a `--source-namespace`
  flag, `wrangler versions secret delete`, email-protected Quick Tunnels, a `--experimental-mode
  instant` option. No repo use. One generated-output change: `wrangler types` now includes the
  default module rules (#15573), so `worker-configuration.d.ts` gains `declare module "*.txt"`,
  `*.html`, `*.sql`, `*.bin`, `*.wasm`, and `*.wasm?module` blocks. Both the showcase's file and the
  template's were regenerated. Re-test: `check:template`, the showcase `svelte-check`; green.
- **@cloudflare/vitest-pool-workers 0.22.0 to 0.23.0, taken as the successor package.** 0.23.0 is
  published with `deprecated: "has been renamed to @cloudflare/vitest-plugin. This package will not
  receive future updates."` and still pins wrangler 4.124.0 and miniflare 5.20260815. The successor
  `@cloudflare/vitest-plugin` 1.3.7 has the same exports (`.` and `./types`), the same
  `cloudflareTest` and `readD1Migrations`, and pins wrangler 4.148.0 and miniflare
  5.20261006.0-alpha, which npm dedupes with the repo's own Wrangler. The swap touches the import in
  `vitest.config.ts:2`, two references in `src/tests/cloudflare-test.d.ts`, `wrangler.test.jsonc:2`,
  two comments, and one devDependency. The prior sweep's note that the unit tests ran against a
  nested workerd (`2026-09-29-theme-pass-c-dependency-sweep.md`) no longer holds: `npm ls wrangler
  miniflare workerd` shows one of each. Re-test: the whole `integration` project; green.
- **vite 8.3.1 to 8.3.3.** Bug fixes only (HTML `srcset` percent-encoding, `renderBuiltUrl` queries,
  bundled-dev sourcemaps, a file-watcher crash). Re-test: showcase build and `check:package`; green.
- **svelte 5.57.1 to 5.57.2.** Patches only. One new compile error, `{:else}` followed by another
  `{:else}` or `{:else if}` (#18900); the component and svelte-check gates compiled every template.
- **@sveltejs/kit 3.0.0 to 3.0.1.** One patch: generated types use relative imports that resolve
  under `nodenext` (#17351). Re-test: root and showcase `svelte-check`; green.
- **@anthropic-ai/sdk 0.129.0 to 0.132.0.** A 0.x minor. Adds the `claude-haiku-5-5` id, Admin API
  and Managed Agents types, and deprecates Text Completions and Sonnet 4.5. The engine uses only the
  Messages call in `content-routes-tidy.ts:173` and `content-routes-settings.ts:249`; tests mock the
  module. The peer range (`>=0.105.0 <1`) is unchanged. Filed: the tidy model catalog (see the
  refactor table).
- **shiki 4.4.3 to 4.5.0.** New transformers (`transformerRenderLineNumber`, `classActiveCode`),
  an engine-js tokenizing speedup, grammar-injection dedupe, and a rose-pine comment fix. The repo
  highlights with its own theme tokens; no snapshot moved. Re-test: the render and preview tests.
- **heic-to 1.5.2 to 1.6.5.** libheif 1.22.2 to 1.23.5 only. The client-side HEIC conversion in the
  media library is the one call site (`MediaInsertPopover.svelte`); no unit test decodes a real
  HEIC, so this is CI e2e and a manual upload check, not a unit gate.
- **playwright 1.63.0 to 1.64.0.** Bundles Chromium 156 (headless shell v1248) and a new Firefox
  (1555). Gate-risk item, and it fired: see the declared move below.
- **eslint 10.12.0, eslint-plugin-jsdoc 65.2.0, typescript-eslint 8.71.1.** Rule fixes and one new
  option each (`check-alignment` `ignoreEmptyLines`, `check-syntax` `enableFixer`); `check:comments`
  stays clean and no config change is needed.
- **@lucide/svelte 1.52.0, @codemirror/language 6.13.1, @codemirror/view 6.43.14,
  @lezer/markdown 1.8.0, mdast-util-directive 3.1.1, postcss, publint.** Icon additions and patch
  fixes. `@lezer/markdown` 1.8.0 is a minor transitive move under the editor's markdown parser;
  the component suite (editor, preview, directive round-trips) is the re-test, and it is green.
- **Go.** `yaml/v3` v3.0.5 and `go-runewidth` v0.0.30 are the two with a call path (the doctor's
  config read and every rendered table). `internal/render` goldens and `testdata/copy.golden.md`
  are unchanged. `golangci-lint` v2.14.0 reports 0 issues under the committed `.golangci.yml`.

## Declared move

One expectation moved, and it is a computed-value expectation, not an image baseline. Playwright
1.64's Chromium serializes the dark admin scrollbar colour one unit lower in the seventh decimal:
`oklab(0.93 0.00155291 0.00579556 / 0.55)` becomes `oklab(0.93 0.00155291 0.00579555 / 0.55)`
on `dark-wrapper` and `dark-child`, in both `src/tests/fixtures/admin-theme-computed.json` and
`admin-theme-computed-hostile.json` (four lines). The fixtures were regenerated with
`VITE_CAIRN_UPDATE_THEME_EXPECTATIONS=1`, and the diff read: those four lines only. No screenshot
baseline was regenerated locally; the e2e visual baselines run on CI only.

## Gates

`make -C tool check` (tidy-check, fmt-check, vet, lint, vulncheck, vale-comments, check-copy, test)
green. `npm test` and `npm run check:close` green. `check:close` caught one drift: the
`supported-toolchain.md` Wrangler cell (`^4.144.0`), updated to `^4.148.0`.

A fresh `npm ci` in `examples/showcase` leaves `node_modules/$app/tsconfig.json` unwritten until
`svelte-kit sync` runs, and `src/tests/unit/check-public-skill.test.ts` ("passes over the shipped
skill") fails with `Failed to load tsconfig '$app/tsconfig'` when `npm test` runs first. CI orders
`npm run check` before it. This is state, not a version effect; the test passes alone after a sync.

## Refactor decisions

| Capability | Code that hand-rolls it | Ruling |
| --- | --- | --- |
| `@cloudflare/vitest-plugin` pins the repo's own Wrangler and Miniflare | A second nested wrangler 4.124.0 and miniflare under the old pool package | Taken now: the rename above. |
| `wrangler types` emits ambient module declarations | Nothing hand-written; the showcase and template files are generated | Taken: both files regenerated. |
| SDK model ids `claude-haiku-5-5`, `claude-sonnet-5-5` | `EFFORT_TIER_PREFIXES` (`content-routes-tidy.ts:58`), `TIDY_MODEL_LABELS` (`content-routes-settings.ts:130-132`) | Filed in ROADMAP Next; which models the setting offers is a product call. |
| shiki `transformerRenderLineNumber` | None; the engine renders no line numbers | No code to replace. |
| eslint-plugin-jsdoc `ignoreEmptyLines`, `enableFixer` | None; no rule here needs them | No code to replace. |
| wrangler `assets.base_path` | None | No code to replace. |

## Held majors

| Package | Manifest | Held at | Latest | Unblock condition |
| --- | --- | --- | --- | --- |
| devalue | root, showcase, template | 5.9.4 | 6.0.2 | `@sveltejs/kit` declares `devalue` `^6` (3.0.1 declares `^5.9.4`). Cairn parses what SvelteKit stringifies in `src/lib/admin/client-action.ts` and `MediaInsertPopover.svelte`, so the two must agree. 6.0.x also changes the `uneval` replacer API. |
| typescript | root, showcase, template | 6.0.3 | 7.0.2 | `@sveltejs/kit`'s `typescript` peer admits `^7`, and `svelte-check --tsgo` goes green on the repo (ROADMAP Now, "TypeScript 7 is held on the toolchain"). `typescript-eslint` 8.71.1 also still peers `<6.1.0`. |
| vitest, @vitest/browser, @vitest/browser-playwright | root, showcase | 4.1.11 | 5.0.3 | `@cloudflare/vitest-plugin` declares a `vitest` peer that admits `^5` (1.3.7 peers `^4.1.0`). Vitest 5 also clears mocks per test and fails unawaited async assertions. |
| @types/node | root, showcase, template | 24.19.1 | 26.6.4 | Node 26 becomes the engine floor, which `docs/STATUS.md` decides only if Node 26 is Active LTS. |
| github.com/xo/terminfo | tool | v0.0.0-20220910002029-abceb7e1c41e | v1.2.0 | Geoff accepts the module's switch from pseudo-versions to tagged `v1.x`. It also holds `github.com/charmbracelet/ultraviolet` at its August pseudo-version, whose newer revisions require `terminfo` `v1.0.0`. |
| github.com/charmbracelet/x/exp/golden | tool | v0.0.0-20250806222409-83e3a29d542f | v0.1.0 | A test-only module reached through `lipgloss`; moves when a required module's `go.mod` pulls `v0.1.0`. |
| gopkg.in/check.v1 | tool | v0.0.0-20161208181325-20d25e280405 | v1.0.0-20201130134442-10cb98267c6c | A test-only module reached through `go.yaml.in/yaml/v3`; moves when `yaml/v3` requires the newer pseudo-version. |

`tool/tools` is the one place the scheme-jump hold does not apply: `golangci-lint` v2.14.0 requires
`xo/terminfo` `v1.0.0`, `ghostiam/protogetter` `v1.0.1`, and
`alecthomas/go-check-sumtype` `v0.5.1-0.20260828200218-ae6904d28606` itself, so holding them would
hold the linter. That module ships nowhere and stays isolated from the product `go.mod`.
