# Scope the Admin CSS Build's Content Detection — Implementation Plan

> **For agentic workers:** Execute test-first as a single `cairn-implementer` dispatch (or main loop); the
> main loop reviews the diff and clears the full gate. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Stop the shipped admin stylesheet (`dist/components/cairn-admin.css`) from compiling foreign
utility rules. The admin CSS build's Tailwind content scan reaches the whole repo, so it pulls candidates
from `examples/showcase` and `docs/` into the sheet cairn ships to consumers. Scope the scan to the admin
components only, and lock it with an invariant test.

**Architecture:** `scripts/build-admin-css.mjs` runs `@tailwindcss/postcss` (`tailwind()`) over
`scripts/admin-css.input.css`. The input already declares an explicit
`@source "../src/lib/components/**/*.{svelte,ts,js}"`, but Tailwind v4's automatic source detection runs
*in addition to* it, walking up from the CSS file to the repo root and scanning everything. Disabling
automatic detection (`source(none)`) leaves only the explicit `@source`, so the sheet compiles exactly the
utilities the admin components use. The `admin-css-build` test gains a no-foreign-token invariant, and the
`admin-visual` baseline proves no real admin utility dropped.

**Tech Stack:** Tailwind v4 `@tailwindcss/postcss`, the `@source` / `source()` directives, Vitest
(`admin-css-build.test.ts`), Playwright (`admin-visual`).

## Global Constraints

- **Drop no real admin utility.** Scoping the scan must not remove a utility the admin genuinely uses. Two
  guards: the `admin-css-build` test's positive assertions (it already asserts the sheet *contains* the
  DaisyUI components and Tailwind utilities the admin uses, plus the role utilities) and the `admin-visual`
  Playwright baseline, which must stay **byte-identical** (a dropped utility would shift a pixel). All admin
  utilities live under `src/lib/components/**`, which the explicit `@source` covers, so scoping should drop
  nothing real.
- **Keep the design-mockup path working.** `buildAdminCss({ extraSources })` appends extra `@source` globs
  so the `design:mockup-css` build can compile mockup classes. `source(none)` disables *automatic*
  detection, not explicit `@source`, so the extra sources still scan. Confirm the mockup build still
  compiles its classes.
- **The showcase build is independent and untouched.** This changes only the admin build
  (`build-admin-css.mjs` / `admin-css.input.css`). The showcase's own Tailwind pipeline is separate.
- **`check:custom-surface` is unaffected.** It scans the *source* partial `cairn-admin.css` and the markup,
  not the compiled sheet, so this change does not move either tree's budget. Run it anyway to confirm.
- **Verify the mechanism against the real toolchain.** `source(none)` on a granular
  `@import "tailwindcss/utilities.css"` may or may not be the exact working form; resolve it empirically
  (the test drives it red to green), per the "verify locked build assumptions" discipline. If `source(none)`
  on the granular import does not take, fall back to the form that does (e.g. `@source none` plus the
  explicit `@source`, or configuring the plugin's content), and record what worked.
- **Date:** 2026-06-30. **Branch/worktree:** a fresh worktree off `main` after `starter-template-1` merges,
  or continue on `starter-template-1`. Docs-and-tooling; hold unpublished (the shipped sheet only shrinks,
  no consumer action).

## File structure

- Modify: `scripts/admin-css.input.css` — disable automatic source detection, keep the explicit `@source`.
- Modify: `src/tests/unit/admin-css-build.test.ts` — add the no-foreign-token invariant.
- (No change to `build-admin-css.mjs` expected; the fix is in the input CSS. If the mechanism needs a plugin
  option, modify it there and note why.)

---

## Task 1: Scope the admin build's content and lock it with an invariant test

**Files:**
- Test: `src/tests/unit/admin-css-build.test.ts`
- Modify: `scripts/admin-css.input.css`

- [ ] **Step 1: Write the failing invariant test.** Add to the `describe('admin css build')` block. The
  foreign tokens are showcase/doc-only and never appear in the admin theme, so their presence in the built
  sheet is unambiguous pollution:

```ts
// The admin build must scan ONLY the admin components, never the whole repo. These tokens exist only in
// examples/showcase and in docs that discuss the showcase rename; if the sheet carries them, Tailwind's
// automatic source detection is scanning outside src/lib/components and compiling foreign candidates into
// the shipped artifact. Do not weaken this: a hit means the content scope regressed.
it('compiles no foreign token from outside the admin components', () => {
  for (const foreign of ['--text-step', '--container-measure', '--cairn-step', '--cairn-space', '--cairn-measure']) {
    expect(css, `foreign token ${foreign} leaked into the shipped admin sheet`).not.toContain(foreign);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm run test:unit -- admin-css-build`
Expected: the new test FAILS (the current sheet carries `--cairn-space` / `--cairn-step` / `--cairn-measure`
from the repo-wide scan); the existing assertions still pass.

- [ ] **Step 3: Disable automatic source detection in the admin input.** In
  `scripts/admin-css.input.css`, scope the scan to the explicit `@source` only. Try `source(none)` on the
  utilities import first:

```css
@import "tailwindcss/utilities.css" layer(utilities) source(none);
```

  Keep the existing `@source "../src/lib/components/**/*.{svelte,ts,js}"` line (it is now the sole source).
  If `source(none)` on the granular import does not take (the foreign tokens remain), use the form that
  works against `@tailwindcss/postcss` and note it in a comment (the mechanism is the point, not the exact
  spelling). Add a short comment explaining why automatic detection is off (it scanned the whole repo and
  polluted the shipped sheet).

- [ ] **Step 4: Run the test to verify it passes, and the whole suite.**

Run: `npm run test:unit -- admin-css-build`
Expected: PASS, including the existing positive assertions (the sheet still contains the DaisyUI components,
the Tailwind utilities the admin uses, `text-muted` / `text-subtle`, the fonts, the unlayered rules). If a
positive assertion now fails, a real utility was in a scanned-but-now-excluded location; widen the `@source`
to cover it (do not re-enable the whole-repo scan).

- [ ] **Step 5: Prove no real admin utility dropped (the byte-identical baseline).**

Run: `npm run package` then `cd examples/showcase && CI=1 npx playwright test admin-visual`
Expected: the admin-visual snapshots pass **byte-identical** (the sheet lost only foreign rules, so the
rendered admin is unchanged). If a snapshot shifts, a real utility dropped: investigate, widen the `@source`,
do not update the baseline.

- [ ] **Step 6: Confirm the mockup path and the pollution removal.**

Run: `npm run design:mockup-css` (the `extraSources` path still compiles) and
`grep -c 'cairn-step\|cairn-space\|cairn-measure\|text-step\|container-measure' dist/components/cairn-admin.css`
Expected: the mockup build succeeds; the grep returns `0` (the foreign rules are gone). Note the sheet's
byte size before/after (it shrinks).

- [ ] **Step 7: Full gate and commit.**

Run: `npm run check` (0/0), `npm test` (exit 0), `npm run check:custom-surface` (both trees PASS,
unchanged), `npm run check:comments` (OK).

```bash
git add scripts/admin-css.input.css src/tests/unit/admin-css-build.test.ts
git commit -m "fix(admin-css): scope the build's content to the components, no repo-wide scan

Tailwind's automatic source detection scanned the whole repo and compiled foreign utility candidates
from examples/showcase and docs into the shipped admin sheet. Disable automatic detection so only the
explicit @source applies, and lock it with a no-foreign-token invariant in admin-css-build.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Pass-end ritual

- [ ] **Simplify** (`code-simplifier:code-simplifier`) over the change (small).
- [ ] **Gate:** the full suite above, plus prove the consumer build (`examples/showcase` e2e under `CI=1`)
  since the shipped admin sheet changed.
- [ ] **Review:** `daisyui-a11y-reviewer` (the admin sheet is what it reviews) over the diff; the change is
  a build-scope narrowing, so the review is a sanity check that no component class was lost.
- [ ] **Docs:** this resolves the "scope the admin build's content" item — mark it done and remove it from
  `ROADMAP.md` "Next", prune its friction-log entry (or mark resolved), and note in the
  `tailwind-scans-docs-bad-candidate` memory that the scan no longer reaches docs/scripts (the
  bare-token-in-docs workaround is no longer load-bearing, though it stays good hygiene). No `CHANGELOG`
  entry (the shipped sheet only shrinks; no consumer action).
- [ ] **Post-mortem + STATUS + memory:** append the post-mortem here; update STATUS; refresh the memory.
  Hold unpublished.

## Related follow-up: the deferred live admin smoke (NOT a standalone plan)

The other carried follow-up, the live admin smoke against a real Worker, is **not** an engine pass and gets
no implementation plan. It is a verification run of the already-documented procedure
(`docs/internal/admin-smoke-test.md`: mint a session by inserting a D1 row, then exercise `/admin` under
`wrangler dev`), and it is **triggered by a site cutover** onto `0.78.x` (ecxc-ski or 907-life), not by any
cairn-cms code condition. It belongs to that site's pass when the cutover happens. The action here is only
to keep it visible: it stays in STATUS's carried follow-ups and rides the site-cutover checklist, pointing
at the smoke doc. Nothing to build.

## Self-review notes

- **The test is the durable guard** (a watch converted to a failing test, the gold standard): the pollution
  cannot silently return.
- **Two independent proofs no real utility dropped:** the `admin-css-build` positive assertions and the
  byte-identical `admin-visual` baseline.
- **Scope is narrow:** the admin build only; the showcase build and `check:custom-surface` are untouched.
