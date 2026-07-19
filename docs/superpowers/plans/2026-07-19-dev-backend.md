# The dev-backend pass

Scope set by `docs/STATUS.md` (2026-07-19): make the dev backend exercise fragments, fix the
"Image missing" media tiles under `vite dev`, clear the friction log (complete-or-move), and run
three riders (the register-editor repoint, the kit#12533 watch, the cairn.pub token probe).
Executed same-session per Geoff's directive; the design work below replaces a separate spec, since
every task is small and the two build targets were root-caused first-hand before planning.

Branch: `dev-backend` worktree off `main`. Method: dispatch each task to `cairn-implementer`
(Sonnet), test-first, full gate per task; main loop reviews each diff.

## Root causes (verified 2026-07-19, main checkout)

- **Fragments:** `packages/cairn-cms-dev` seeds media and vocabulary but no fragments. The
  in-memory repo has no `src/content/fragments/` files and no fragments manifest rows, so the
  picker filters to `[]` and `fragmentTargets` is empty under `vite dev`. The showcase declares
  the concept (`cairn.config.ts` fragments block) and carries one on-disk fragment
  (`src/content/fragments/trail-safety-notice.md`) that never reaches the fake manifest.
- **Media tiles:** delivery works (`curl` of `/media/mountain-pass.aa00bb11cc22dd33.png` under
  `vite dev` returns 200 `image/png`), but `fake-r2.ts`'s `SEED_PNG` is a 12-byte stub (PNG magic
  plus zero bytes, no IHDR/IDAT/IEND), so the browser cannot decode it and every tile's `onerror`
  falls to the "Image missing" state. The 2026-07-17 friction entry's "key or route mismatch"
  guess was wrong; the doc comment "The bytes are a tiny real PNG" is false.

## Tasks

### T1 — Seed fragments into the dev backend

In `packages/cairn-cms-dev`: a `seedFragments()` beside `seedMediaLibrary()` that writes at least
two published fragment entries onto the in-memory `main` (manifest rows with `concept:
'fragments'` plus matching `src/content/fragments/<id>.md` bodies, one mirroring the showcase's
`trail-safety-notice`), idempotent like the other seeds, called from `devBackendHandle()`.
Acceptance: a new unit test in the dev package proves the seeded manifest rows and bodies read
back through the `Backend` interface; under `vite dev` the fragment picker lists the seeds and an
inserted include chip resolves its human title (optical check at close-out). Existing
`fragments.spec.ts` e2e (which authors its own fragments at runtime) must stay green — seeds must
not collide with names it creates.

### T2 — Decodable seed images

Replace `SEED_PNG` with bytes a browser actually decodes. Constraint: no new dependency; a small
hand-assembled valid PNG (magic + IHDR + IDAT + IEND, any solid color) is enough, and distinct
colors per seeded asset are preferred so the Library reads as a real grid (a map from key to
bytes, defaulting sensibly, keeps `seedObject(key)`'s signature workable). Fix the false "tiny
real PNG" doc comment. Acceptance: a unit test asserts structural validity of every seeded
object's bytes (magic, IHDR, IEND present); the close-out optical check shows real thumbnails on
`/admin/media`.

### T3 — The `getPlatformProxy` media-delivery smoke (ROADMAP Now item)

One integration test that drives the composed media route against a `wrangler`
`getPlatformProxy` env with a seeded local R2 object: one GET asserting 200 and the right
Content-Type. Purpose: the 0.84.x miniflare serialization class (two bugs shipped past a green
suite) fails in CI rather than on a consumer's first `vite dev`. Keep it minimal — one route,
one object, no fixture sprawl. If `getPlatformProxy` cannot run under the existing test harness
without disproportionate machinery, stop and report back rather than forcing it (the item then
returns to ROADMAP with the findings).

### T4 — Wire the two CI-dark gates

Add `check:custom-surface` and `check:chassis-boundary` to `.github/workflows/test.yml` beside
the other `check:*` steps. Both must pass on the branch; if `check:chassis-boundary` is red
(it has been CI-dark and unenforced), fix the drift or report why it cannot join yet.

### T5 — Close the media-chip fence gap and anchor `figureRoleAtLine`

`editor-media.ts` gains the same `fenceScan` `inCode` gate `editor-include.ts` already has (a
`media:` token inside a fenced code block must not chip). `figureRoleAtLine` in
`markdown-directives.ts` stops reading the first `{...}` group anywhere on the line and anchors
the way `openerTitleAttr` was fixed. Tests first for both (the existing include-side tests are
the model).

### T6 — Mermaid fence passthrough in the highlighter

`rehypeCairnHighlight` currently rewrites every fence and discards the `language-mermaid` class,
so nothing survives to identify a mermaid block client-side and cairn-pub ships a site-side
marker plugin as a workaround. Change: mermaid fences pass through untouched with their language
class intact. Lean form first (a hardcoded mermaid skip); a configurable passthrough list only
if the diff is equally small. Non-breaking behavior change: CHANGELOG entry under `## Unreleased`
(no `Consumers must:`), and check whether the render/highlight reference page documents fence
handling (update if so; `check:reference:signatures` guards the signature).

### T7 — Docs batch

- `docs/guides/make-waymark-your-own.md` and `examples/cairn-theme/README.md`: keep the
  documented two-import form and add the why — a trailing `@import` appended inside `theme.css`
  (what the early ports did) is spec-invalid CSS that only works because Vite inlines it; the
  documented form is the correct one. (Port alignment itself rides each site's next pass.)
- `docs/internal/admin-design-system.md`: note that the admin editor's preview iframe loads the
  public `theme.css` (`preview-doc.ts`), so the public stylesheet has a second, separately-hashed
  consumer inside the admin; anyone pruning or splitting public CSS needs to know.
- Doc gates (`check:docs`, `check:reference`) green.

### T8 — Friction-log clearing and ROADMAP update

Rewrite `docs/internal/docs-friction-log.md` down to zero open findings, and update `ROADMAP.md`
in the same change. Dispositions (each verified against code this session):

- SHIPPED this pass (prune): fragments seed (T1); media tiles (T2); CI-dark gates (T4);
  media-chip fence gap + `figureRoleAtLine` (T5); mermaid passthrough (T6); theme-import docs
  (T7); preview-iframe CSS note (T7).
- RESOLVED already (prune): the arm-index drift specifics (the register sweep fixed both claims;
  the index-count gate idea moves to ROADMAP Later); the 2026-07-19 status-flattening entry (the
  guide caveat and ROADMAP watch already exist; the kit#12533 rider is this pass; the D1 CHECK
  breadcrumb is covered by the guides).
- MOVED to ROADMAP with trigger:
  - Next: **raw-URL parity** — one grouped item for `remark-figure` caption promotion and the
    `heroImage` projection, both of which currently serve `media:` tokens only; the decision
    whether raw external URLs get parity is one product call, taken when either surface next
    opens.
  - Next: **wire the showcase nav to the engine's menus** — the `menus:` key is engine-owned
    (`site-config.ts` `extractMenu`; `createNavRoutes` ships and is documented) but the showcase
    neither mounts `/admin/nav` nor reads the parsed menu, so the header hardcodes what the
    config declares. Decision recorded: wire it at template scope (do not remove the key); the
    friction entry closes on that decision.
  - Next (grouped with existing icon work): **glyph rendering is fill-only** — a line-shaped
    subpath paints nothing; close subpaths in the engine set or paint stroke+fill. Deferred
    because a stroke change sweeps all 27 icons just after the icon vocabulary shipped.
  - Later: **`sizes` breakpoints are generic constants** (seam candidate when a theme with a very
    different measure appears); **index-vs-directory count gate** for the docs arm indexes.
- ROADMAP prunes for shipped work: the "seed fragments into the dev backend" item (Next) and the
  `getPlatformProxy` smoke item (Now).

### Riders (main loop, not implementer work)

- R1: repoint `~/.claude/agents/cairn-register-editor.md`'s "load the living contract" list at
  `docs/internal/docs-register.md` (ratified 2026-07-18) as the canonical standard, demoting the
  two 2026-07-01/02 plan files to history.
- R2: extend the scheduled "Watch: SvelteKit checkOrigin removal" routine to also track
  sveltejs/kit#12533 (alert when a fix merges into a released @sveltejs/kit; cairn then adopts
  and deletes the access-map guide caveat).
- R3: re-probe the cairn.pub workers-routes endpoint once Geoff widens the token; record the
  outcome in STATUS either way.

## Close-out

Simplifier over changed code; `npm run check` 0/0, `npm test` exit 0, `npm run check:comments`;
doc gates (`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`);
`check:surface` if any public surface moved; reviewer fan-out (`svelte-reviewer`,
`cloudflare-workers-reviewer`); the optical smoke under `vite dev` from the worktree showcase
after a from-scratch install (the symlink gotcha), reading `/admin/media` thumbnails and the
fragment picker with my own eyes; CHANGELOG under `## Unreleased`; no version bump, no publish;
post-mortem appended here; STATUS updated on `main` at merge.
