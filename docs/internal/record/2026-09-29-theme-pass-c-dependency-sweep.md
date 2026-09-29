# Theme identity pass C: pre-pass dependency sweep (2026-09-29)

Task 0, item 3 (plan decision 28). Every minor and patch taken; every major held. Refactor
decision for each new capability is "file" for this sweep, and no code refactor landed: nothing
unreviewed lands before the pass's equivalence capture. Manifests measured: root (with the
`packages/*` workspaces), `examples/showcase`. `templates/waymark` is emitted from the showcase
and the packages, never npm-managed by hand; it was re-emitted with `npm run emit:template`.
`tool/go.mod` is out of scope: the `dependency-upgrade` skill covers npm manifests only, and the
sweep did not touch Go.

Installed after the sweep, at root and in the showcase: daisyui 5.7.46, tailwindcss 4.3.3
(tailwindcss did not move). `daisyui/theme/object` still exports 35 themes with 29 keys each.

## Taken

| Package | Manifest | Old | New |
| --- | --- | --- | --- |
| daisyui | root, showcase | 5.7.44 | 5.7.46 |
| @anthropic-ai/sdk | root | 0.128.0 | 0.129.0 |
| wrangler | root, showcase | 4.137.0 | 4.143.0 |
| @cloudflare/workers-types | root, showcase | 5.20260923.1 | 5.20260929.1 |
| vite | root, showcase | 8.3.0 | 8.3.1 |
| @lezer/common | root | 1.5.2 | 1.5.3 |
| @lezer/highlight | root | 1.2.3 | 1.2.5 |
| @lucide/svelte | root | 1.47.0 | 1.48.0 |
| @types/node (24 line) | root, showcase | 24.13.6 | 24.19.0 |
| typescript-eslint | root | 8.70.1 | 8.71.0 |

Caret-satisfied transitive moves, from the lockfile delta: workerd 1.20260921.1 to 1.20260926.1,
miniflare 5.20260921.0-alpha to 5.20260926.0-alpha, rolldown and its bindings 1.2.10 to 1.2.11,
esrap 2.3.10 to 2.4.0, enhanced-resolve 5.25.1 to 5.26.0, micromark-factory-space 2.0.1 to
2.1.0, micromark 4.0.2 to 4.0.3 (with core-commonmark, util-types, gfm-strikethrough,
to-markdown patches, and new micromark-util-edit-map 1.0.0), ws 8.21.3 to 8.22.0, std-env 4.2.0
to 4.3.0, ansi-regex 6.3.0 to 6.4.0, undici-types 7.18.2 to 7.24.6, and the
`@typescript-eslint/*` family to 8.71.0.

## Survey

Nothing in any range is breaking for this repo. New capabilities: none, so nothing to file except
the notes marked below.

- **daisyui 5.7.44 to 5.7.46.** GitHub release bodies are boilerplate; the survey diffed the npm
  tarballs. Theme object shape unchanged (35 themes, 29 keys each, identical values). CSS changes:
  `.range` gains `container-type:inline-size`; `.tooltip` gains `--tt-radius`, `--tt-overlap` and
  new `.tooltip-left`/`.tooltip-right` tail rules. No new components or themes. The repo uses no
  DaisyUI `.tooltip` or `.range` (its tooltip is `cairn-tooltip`, `src/lib/admin-toolkit/Tooltip.svelte`).
  Re-test: `src/tests/unit/admin-theme-completeness.test.ts:9` and
  `src/tests/unit/audit/rules/rendered/motion-reduced-delay.test.ts:100`.
- **@anthropic-ai/sdk 0.128.0 to 0.129.0.** A 0.x minor; no breaking change in the notes. Adds the
  `claude-sonnet-5-5` id, `between_tools` thinking, faster streamed-tool-input parsing; removes
  client-side compaction from the beta tool-runner helpers only. Optional server-side peer,
  used in `src/lib/sveltekit/content-routes-tidy.ts:173`, `content-routes-settings.ts:249`;
  tests mock the module. Filed note, no action: the model label map
  (`content-routes-settings.ts:130-132`) and `DEFAULT_TIDY_MODEL` (`src/lib/nav/site-config.ts:133`)
  do not list `claude-sonnet-5-5`; that is a product call, not a bump issue.
- **wrangler 4.137.0 to 4.143.0, workerd, miniflare.** Container, Durable Object code-update and
  Workflows-in-local-dev additions; 4.143 breaks only the experimental `cloudflare.config.ts`
  import path. No repo use. Practice note: `@cloudflare/vitest-pool-workers@0.22.0` (latest)
  nests wrangler 4.124.0, miniflare and ws 8.21.0, so the unit tests run against that nested
  workerd, not the new one.
- **@cloudflare/workers-types.** Generated from workerd (streams, Workers AI reasoning types,
  `MessageEventInit`). Gate risk only if those types are used; `npm run check` is clean.
- **vite 8.3.1 and rolldown 1.2.11.** Patch fixes (`mergeConfig`, sourcemaps, watcher). Rolldown
  1.2.10 fixes re-exported namespace imports in code-splitting, which can move chunk output; watch
  `check:package`.
- **@lezer/common, @lezer/highlight.** No published notes found; patch releases; repo use is
  trivial (`src/lib/admin/editor-highlight.ts:5`, `src/lib/admin/spellcheck.ts:12`).
- **@lucide/svelte 1.48.0.** New icons; a shared-type-import fix that could shift dist `.d.ts`.
- **@types/node 24.19.0.** Type additions on the 24 line; no changelog.
- **typescript-eslint 8.71.0.** New rule `no-unsafe-enum-assignment` (not in `recommended`) and
  fixes to four type-aware rules that could nudge lint counts.
- **Transitives** (esrap, enhanced-resolve, micromark, ws, std-env): no repo call sites; nothing
  to leverage.

## Held majors

| Package | Latest | Trigger to take |
| --- | --- | --- |
| devalue 5.9.4 | 6.0.2 | `@sveltejs/kit` pins devalue; the tests must round-trip Kit's own wire format. Take when a Kit release takes devalue 6. |
| typescript 6.0.3 | 7.0.2 | typescript-eslint (peer `<6.1.0`), svelte-check (peer `^5 \|\| ^6`) and Kit (peer `^5.3.3 \|\| ^6`) all admit TS 7. |
| vitest, @vitest/browser, @vitest/browser-playwright 4.1.11 | 5.0.2 | `@cloudflare/vitest-pool-workers` (latest 0.22.0, peers vitest `^4.1.0`) releases vitest 5 support. Vitest 5 also clears mocks per test and fails unawaited async assertions. |
| @types/node 24 line | 26.6.3 | The engine floor (`engines.node >=24`) moves to Node 26; until then the 24 line is correct. |
| eslint-plugin-jsdoc 64.5.4 | 65.0.0 | New since the last sweep (released 2026-09-28). Breaking change is in `check-indentation`, which `eslint.config.js:43` (`flat/recommended-typescript-error`) leaves off, so the survey expects a clean take; held for Geoff's ruling because it is a major. |

## Audit

`npm audit` at the root reports 7 vulnerabilities (2 low, 1 moderate, 4 high) that predate this
sweep; the only offered fix is `npm audit fix --force`, which installs
`@cloudflare/vitest-pool-workers@0.8.30`, a breaking downgrade, so it is held as a major. The
path runs through `undici` in the dev-only test pool, not the shipped package.
