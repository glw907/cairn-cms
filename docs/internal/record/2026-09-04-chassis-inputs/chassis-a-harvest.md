# Chassis-A harvest (2026-09-08)

What chassis-A's twelve tasks learned about the emitter, the bake, and the gates, banked for
chassis-B1, chassis-B2, and polish so those passes do not rediscover it. Plan:
`docs/superpowers/plans/2026-09-04-chassis-a-pass.md`.

## 1. The gate ceiling missed the CLI suite until Task 1's fix round

The Task 1 reformat rewrote every showcase source file, including the one-line
`githubApp({...})` literal that `packages/create-cairn-site/src/github/finalize.mjs` matches
byte-for-byte. Neither the plan's per-task gate nor the dispatched gate ran
`packages/create-cairn-site`'s own test suite, so the break went undetected until Geoff's
review caught it; the remedy pinned the literal with a `// prettier-ignore` line
(`examples/showcase/src/theme/cairn.config.ts`) rather than teaching the finalizer a looser
match, since the finalizer's byte match is itself a deliberate simplicity choice. Every later
task's gate carries `npm --prefix packages/create-cairn-site run prepack && npm --prefix
packages/create-cairn-site test`. **Carry forward:** a pass touching any showcase file the CLI
bakes verbatim (`finalize.mjs`'s match list) needs the CLI suite in its gate from the first
task, not discovered mid-pass; the suite needs its `prepack` bake run first in a fresh
checkout, since `test` reads the built `dist/`.

## 2. Inlining an engine helper's class literal moves it into the site's Tailwind scan

Task 8 re-homed the render trio (`cardShell`, `headRow`, `iconSpan`) per the audit's retire
rulings. Inlining `cardShell`'s body at its single call site moved the literals `card-body` and
`card-title` out of the npm package, which a consumer's Tailwind build never scans, and into
`examples/showcase/src/theme/markdown-components.ts`, which the showcase's own Tailwind build
does scan. DaisyUI's `card` component reads any matching class name in scanned source, not only
markup a `.card`-typed element wraps, so the showcase's compiled `theme.css` started generating
DaisyUI's `.card-body`/`.card-title` rules once the literals landed there, growing every alert
directive by about 26px (the HTML itself stayed byte-identical; only the compiled CSS changed).
The fix renamed the alert's two inner classes to `cairn-alert-body` and `cairn-head-title`,
proven by every committed baseline staying unchanged. **Ruling this pass produced:** a generic
chassis helper stamps generic classes, and a chassis-owned emitted class is documented in the
chassis's own README (`examples/showcase/src/chassis/README.md`), never in the engine's
emitted-class registry (`docs/reference/render.md`), since the engine no longer emits it.

## 3. CLAUDE.md's Authoring section was stale after Task 3

Task 3 wired the comment gate over `examples/showcase`'s `.ts`, `e2e`, and `.svelte` sources,
but CLAUDE.md's Authoring section still said `check:comments` ran over `src/lib` only and that
"ESLint does not parse `.svelte` yet." Task 12 rewrote both sentences: the gate line now names
the showcase's `.ts`/`e2e`/`.svelte` sources alongside `src/lib`, and the Svelte paragraph says
ESLint's `svelte-eslint-parser` block reaches the showcase while the engine's own
`src/lib/components/*.svelte` stays unwired, filed to polish (ROADMAP.md). CLAUDE.md carries a
hard token budget, so the rewrite also had to trim the surrounding prose to stay under it.

## 4. main's ROADMAP already carries the identity-seam pass between B2 and polish

`main` gained an identity-seam item (Geoff, 2026-09-07) sequenced between chassis-B2 and
polish while chassis-A ran on its own worktree. This harvest does not re-derive it; the
sequencing on `main` is: chassis-A, chassis-B1, chassis-B2, identity-seam, polish, one release
cut.

## 5. ROADMAP's rehype-dispatch card-body item is closed

`ROADMAP.md`'s "Decide whether the chassis safelists the classes the engine's rendered markdown
emits" item pointed at `src/lib/render/rehype-dispatch.ts` writing `card-body`/`card-title`
into runtime HTML. Task 8 deleted that file's three helper definitions entirely, so the item is
restated as CLOSED with a pointer to `engine-rulings.md`'s retire rows and the seam-fit
addendum recording finding 2 above. No engine-emitted class remains for a consumer to
safelist.

## 6. `hastscript` resolved only by hoisting

The re-homed `examples/showcase/src/chassis/render.ts` and its co-located `render.test.ts`
(Task 8, Task 9) import `hastscript` directly, but neither `examples/showcase/package.json` nor
`templates/waymark/package.json` declared it; it resolved only because npm hoisted the root
package's own `hastscript` dependency into the showcase's `node_modules`. Task 12 declared
`hastscript: ^9.0.1` in `dependencies` in both manifests (matching the root's pin), ran
`npm --prefix examples/showcase install` so the showcase lockfile follows, and re-emitted
`templates/waymark`. **Carry forward:** a re-homed helper that imports a package the chassis
did not previously depend on needs its own `dependencies` entry in the same task that adds the
import, not a later sweep; hoisting hides the gap until an isolated install (CI, a fresh
scaffold) breaks.

## 7. Task 11 closed after a second fix round

Task 11's register purge of shipped exemplar comments needed two fix rounds: the first
(`c88e18d3`, `91f65e77`) left two history-narration comments in place, and the second
(`6eb07602`) dropped the last of them. Recorded here since the plan's "Register purge" task
looked done after the first commit but was not; a fresh grep for the pass vocabulary
(`docs/internal/record/2026-09-04-chassis-inputs/showcase-review-at-the-exemplar-bar.md`
sections 3.1-3.6) after the first fix round would have caught the remainder before the second
dispatch.

## Pass-end review harvest

Filed observations from the four-reviewer pass-end fold, not fixes; each is a candidate for a
later pass or a ROADMAP item, not acted on here.

- `create-site.yml`'s content walk (the `siteLayoutSentinel` leak check) is the workflow's only
  always-green sentinel: nothing in the job ever exercises the failure path, so a regression in
  the walk itself (a broken skip set, a silently-swallowed exception) would pass unnoticed.
- `finalize.mjs` interpolates the owner and repo strings directly into generated TypeScript
  (the rewritten `githubApp(...)` call). Safe today because GitHub logins and repo names are
  constrained by GitHub's own charset, but `JSON.stringify` per field would close the gap
  structurally rather than leaning on that constraint.
- `createSiteIndexes`'s eager parse of the whole content corpus runs at module scope on the
  runtime preview route (`previewLoad`), against the Workers startup budget. The ROADMAP's
  manifest-backed resolver is the real fix; a lazy getter is the interim mitigation if the
  budget bites before that lands.
- `scaffold.yml` carries none of `create-site.yml`'s assertions (the personalization check, the
  leftover check, the content walk, the scripts-dir check), so a regression covered only by
  `create-site.yml` could still pass whatever `scaffold.yml` gates.
- `e2e/` still carries the process register that `src` was purged of in Task 11's fix rounds; the
  purge only reached `src`.
- The CSS comment surface (`.css` files) has no em-dash or process-citation gate; `check:comments`
  reaches only `.ts`/`.svelte` under ESLint.
- `cairn.config.ts` sits at 230 lines with the media wiring as the next natural split if it grows
  further.
- `(site)/[...path]/+page.svelte` lacks an `@component` doc block.
- The banner-expiry test's timezone safety was verified under four zones by hand, not asserted by
  the suite itself; a future timezone regression has no test catching it directly.
- `.dev.vars.example` is both tracked in git and matched by `.dev.vars.*` in `.gitignore`; it
  stays tracked only because it was already committed before the gitignore pattern existed.
- The styleguide tab strip lacks Home/End keyboard navigation (it has arrow-key roving focus but
  no jump-to-first/jump-to-last).
- `headRow`'s `level` parameter is typed as a bare `number` rather than the narrower `1 | 2 | 3`
  (or similar) a heading level actually takes.
- The `handleUnseenRoutes` waiver is permanently active until a later pass (B2) sets the
  manifest's page size; B2's ruling fixed that page size at 13, not 8.
