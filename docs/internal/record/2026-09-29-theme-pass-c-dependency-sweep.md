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

## Taken after the sweep: eslint-plugin-jsdoc 64.5.4 to 65.0.0 (2026-09-29, Geoff approved the major)

Root manifest only (the showcase, templates, and packages do not carry it). Targeted install, so
the lockfile delta is the package plus one transitive floor: `eslint-plugin-jsdoc` 64.5.4 to
65.0.0, its `@typescript-eslint/utils` range `^8.70.0` to `^8.70.1` (already resolved at 8.71.0).
Peers unchanged for this repo: eslint `^7 || ^8 || ^9 || ^10`, engines `^22.22.2 || >=24.15.0`.

Survey of 64.5.4..65.0.0 (one release, 65.0.0, 2026-09-28):

- **Breaking: `check-indentation`** now forbids a missing space between the asterisk prefix and the
  content; the old behavior returns with `allowNoSpaceAfterAsterisk: true`. `eslint.config.js:43`
  (`flat/recommended-typescript-error`) leaves `check-indentation` off, so it does not apply.
  Refactor decision: none needed; the rule is not enabled and cairn's comments are not checked for it.
- **New option: `check-line-alignment` `tags` accepts `-any`.** The rule is not enabled. Decision:
  file nothing; taking it would add a lint rule cairn has not ruled on.
- The rules cairn enables (`jsdoc/no-types`, `informative-docs`, `check-tag-names`,
  `check-param-names`, `require-jsdoc` with `publicOnly`) have no entry in the range.
- Result: `npm run check:comments` is clean, no comment edits needed.

## Audit

`npm audit` at the root reports 7 vulnerabilities (2 low, 1 moderate, 4 high) that predate this
sweep; the only offered fix is `npm audit fix --force`, which installs
`@cloudflare/vitest-pool-workers@0.8.30`, a breaking downgrade, so it is held as a major. The
path runs through `undici` in the dev-only test pool, not the shipped package.

## The shipped audit's dependencies (added 2026-09-29, with the theme-contrast rule)

Three dependency decisions, taken with the `theme-contrast` rule and the `check:audit-pack` smoke
test. No version moved: culori 4.0.2, daisyUI 5.7.46, and Tailwind 4.3.3 were each the newest
release on the registry at the change, so no bumped range needs a release-note read. Engine
version 0.97.0 on the branch.

| Package | Before | After | Why |
| --- | --- | --- | --- |
| culori | devDependency `^4.0.2` | dependency `^4.0.2` | `src/lib/audit/contrast.ts` imports it at runtime: the resolver's premultiplied mix, the OKLCH gamut clamp, and WCAG luminance. |
| daisyui | devDependency `^5.7.46` | also an optional peer, `^5` | `theme-conformance` reads its key list and `theme-contrast` its built-in theme values, both from `daisyui/theme/object` resolved from the audited site. |
| tailwindcss | devDependency `^4.3.2` | also an optional peer, `^4` | `theme-conformance` reads `tailwindcss/theme.css` from the audited site. |

The two peers follow the existing `@anthropic-ai/sdk` pattern: listed in `peerDependencies`, marked
optional in `peerDependenciesMeta`, and kept in `devDependencies` for the repo's own build. npm never
installs an optional peer, and warns only when a site has one installed outside its range.

### Survey

- **culori 4.0.2.** Published 2025-06-27, the newest release. No dependencies of its own, MIT,
  1.1 MB unpacked, ESM. It ships no type declarations, so the repo keeps an ambient one, moved
  from `src/tests/culori.d.ts` to `src/types/culori.d.ts` (included by `tsconfig.json`). The new
  home sits outside `src/lib`, so svelte-package never copies it into `dist`. No exported audit type
  names a culori type, so no emitted `dist/**/*.d.ts` mentions culori, and `check:audit-pack` greps
  the installed declarations for it.
  - Features to leverage: `interpolateWithPremultipliedAlpha`, taken now, because CSS `color-mix()`
    mixes in premultiplied alpha. The resolver matches Chromium 153's computed `color-mix()` to the
    printed digit on eleven pairs (`src/tests/unit/audit/contrast.test.ts`). `wcagContrast` exists,
    but the dual-gamut measure keeps its own clipped luminance, since it measures after an OKLCH
    gamut clamp that `wcagContrast` does not apply. Ruling: file nothing.
  - Practices to change: none.
  - Gate risk: an operand written in sRGB converts into oklab through culori's matrices, which
    differ from Chromium's in the fifth significant digit (Chromium reads white as L 0.999994). The
    contrast test pins that bound at 1e-4, and the reference page states it as a coverage limit.
- **daisyui `^5` (optional peer).** The range admits every 5.x. `daisyui/theme/object` has kept its
  shape (35 themes, 29 keys each) across the 5.7 line this sweep reads. `peers.ts` fails loudly if a
  later 5.x empties the list or drops `--color-base-100` or `--radius-box`, so a shape change never
  passes silently.
- **tailwindcss `^4` (optional peer).** `tailwindcss/theme.css` is read as a stylesheet under the
  `style` export condition. `peers.ts` fails loudly if the file declares no theme variable.

### Consumer-visible effect

A site that installs the engine now also installs culori. A site without daisyUI or Tailwind keeps
its admin-only audit (a `--rule` selection of admin rules loads neither peer). A full run fails with
a message naming the missing peer and its install command, never a module-resolution stack.
`check:audit-pack` proves both in a real install. The pass's changelog entry at the close owes one
line on the new runtime dependency and the two optional peers. No `Consumers must:` line is needed:
a scaffolded site already installs daisyUI 5 and Tailwind 4 (`templates/waymark/package.json`), so
both peers are satisfied without a change.

### Verification

`npm run check:audit-pack` installs the packed tarball with `--omit=peer` and production
dependencies into an empty directory under the OS temp directory. It adds `svelte` explicitly,
because the audit parses components with `svelte/compiler` and every consumer site has svelte.
With culori still in `devDependencies`, the no-peers run crashed with
`ERR_MODULE_NOT_FOUND: Cannot find package 'culori' imported from .../dist/audit/contrast.js`.
After the move, all three runs behave as the check requires.
