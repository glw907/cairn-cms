# Pass C plan review: domain risk lens

Target: `docs/superpowers/plans/2026-09-27-theme-identity-pass-c.md` at `1ed7e232`, against the
approved spec `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md`. Lens: what the
pass could break for the four production sites, the template, cairn.pub, and the `0.98.0` cut,
plus proportionality. Line references are to the plan unless named.

Counts: 2 blockers, 4 majors, 10 minors, 2 over-ceremony items (one an owner fork).

## Blockers

**R1 (blocker). The showcase audit config is emitted to the template with roots that exist only in
the repo.** `:885-888` (task 7) sets the showcase's `public.scope` to include `../../src/lib/public`
and `public.themeRoots` to include `../../src/lib/public/cairn-public.css`. Decision 6 (`:296-298`)
makes a configured root the tree lacks throw. `examples/showcase/cairn-audit.config.json` is
emitted verbatim: `templates/waymark/cairn-audit.config.json` is byte-identical to it today. JSON
can carry no `cairn-template:exclude` marker. Every scaffolded site's `npm run check:cairn` would
then exit 2 on a missing configured root. Nothing in the plan catches this:
- `scaffold.yml` runs only `check` and `build` on the emitted site, never `check:cairn`.
- The fixture harness's template arm (`:1057-1058`) builds but never audits.

**Fold:**
- Keep the engine-only roots out of the emitted config. `check-public-scope.mjs` already builds a
  config programmatically for the overlay run, so it can inject `../../src/lib/public` and the
  engine theme root the same way. Task 7's "zero findings, scanned count includes
  `PreviewBanner.svelte`" then runs through the successor script, not the showcase config.
- Add `npm run check:cairn` to `scaffold.yml`'s emitted-site step, and `check:close` needs no
  change because the step is CI-only.
- Add an acceptance line to task 7: the emitted `cairn-audit.config.json` names no path outside
  its own tree, and a fresh emitted site's `check:cairn` exits 0.

**R2 (blocker). `check:surface` goes red from task 6 to the close and masks most of `test.yml`.**
Global constraints (`:454-455`) hold `check:surface` regeneration to the close. Task 6 adds
`previewMarkdown` to the root barrel (`:813`). `check-surface.mjs` fails on any added export, and
`test.yml` runs it at step 67, so the test job stops there on every push from the segment B
boundary on. That skips about 40 later steps: `check:template`, `check:facts`, `check:docs`,
showcase `check:cairn`, and the `check:public-skill` step that task 12 adds after the showcase
install. `check:surface` is not in the expected-red set (`:162-170`). The boundary rule
re-dispatches the owning task on any other red, and task 6 cannot fix it without breaking the
constraint. The result is a certain stall at the segment B boundary, plus three segments of masked
CI.

**Fold:** in task 6, run `npm run check:surface -- --update` and commit `api-surface.md`, which
matches the plan's own "each public export adds its reference entry in the same task" rule. Drop
the "only at the close" clause. The close's step at `:1285` becomes a verification that the file
is current.

## Majors

**R3 (major). Scope precedence lets the advisory public scope take files from error-tier admin
rules.** "The admin static scope skips any file the public scope claims" (`:872`) makes public
claims win. The public default root `src/routes` contains `src/routes/admin`, and only
`public.exclude` keeps admin routes out. Decision 6 (`:296-300`) says a configured `public.scope`
replaces the defaults but does not settle whether a configured `public.exclude` does too. Either
of these configs on a consumer silently removes admin routes from the error-tier admin rules and
hands them to advisory `public-literals`:
- A site sets `"exclude": ["src/routes/api"]`.
- A site broadens `public.scope` to `src`.

No test covers this case.

**Fold:**
- Every admin-scope root, default or configured, is excluded from the public scope, whatever
  `public.exclude` says.
- A configured `exclude` merges with `src/routes/admin` and does not replace it.
- Add a task 7 test: a config with a custom `exclude` and one with `public.scope: ["src"]` both
  leave `src/routes/admin` files under `token-colors`.

The spec's intent is "no file answers to two grammars". Making the error-tier scope win on
overlap keeps that intent and cannot downgrade a guard.

**R4 (major). The `cairn-focus-ring` move changes focus behavior and the plan tests one element.**
Task 2 (`:631-633`) moves `cairn-focus-ring` from `@utility` in `tokens.css:177` into a plain
`@layer components` rule. In Tailwind 4 that changes two behaviors:
- A components-layer class takes no variants, so `md:cairn-focus-ring` stops generating.
- Any utility on the same element that sets `outline-*` now beats it. A daisyUI component's
  `:focus-visible` rule at equal specificity may beat it too, depending on source order within
  the components layer.

The class is on about ten showcase elements (tag filter, pagination, styleguide tabs, the theme
toggle, which also carries a dozen utilities). The equivalence spec checks one focused element
(`:286-288`). The changelog (`:1273-1279`) does not disclose the change. A lost focus ring is a
WCAG 2.4.7 failure and does not show in a screenshot baseline.

**Fold:**
- The equivalence spec focuses every `cairn-focus-ring` element on the pages it loads and records
  `outline-style`, `outline-width`, and `outline-color` for each.
- Add one cascade test, the `paint` mandate's "a utility beats it" case, that states the new
  precedence.
- Add a changelog clause saying the class no longer takes variants and now sits below utilities.

**R5 (major). The dependency sweep runs after the merge, so it can invalidate the pass's pinned
evidence on `main`.** The release (`:1315-1317`) runs the `dependency-upgrade` sweep on `main`
after the merge. daisyUI 5.7.46 is already on the registry (`:531`). A daisyUI or Tailwind patch
can move computed theme values or rendering, and the pass captured three things on 5.7.44:
- the equivalence expectation (task 2);
- the ink measurement and its `N` (task 3);
- the regenerated CI baselines (S1).

A moved value turns `main` red inside the merge-to-cut window. At that point no worktree exists,
and a template on `main` already imports subpaths that `^0.97.0` lacks. The `cairn-release` skill
allows skipping the main sweep "when the window already contains such a sweep and `npm outdated`
at every manifest returns only the held majors".

**Fold:**
- Run the sweep on the pass C branch after task 13 and before S1, so the baselines, probes, and
  sitting run on the release's dependencies.
- At the cut, run `npm outdated` only. If it shows a new minor or patch, stop and take it on a
  branch before cutting, never on `main` mid-close.

This also shortens the merge-to-cut window to the version bump, the re-emit, and the publish.

**R6 (major). The changelog and migration notes miss consumer-visible changes.** The spec routes
copy-on-create fixes to sites "through the migration notes" (spec `:199-202`). The changelog list
(`:1273-1279`) and the migration-notes list (`:1280-1282`) omit these:
- `PreviewBanner`'s new palette, and the editor preview's ground now following the site's
  `base-100`. Every editor on a dark-scheme site sees a changed preview on upgrade.
- The focus-ring class change from R4.
- Where the `cairn-public.css` import goes: after `tailwindcss` and before `prose.css`, since a
  later engine `@theme` would override the site's `--color-muted`.
- `check:cairn` on a consumer now prints advisory public-scope findings, and exits 2 when
  `daisyui` or `tailwindcss` cannot be resolved (see R7).
- The template-only fixes a site must port by hand: the skip link idiom (an accessibility fix),
  the toggle's `color-scheme` resolution, the radius-token corners, and the heading levers.
- A copied `prose.css` that read the missing focus-ring keys gains visible focus outlines once the
  import lands. This is an improvement, but it is a visible change.

**Fold:** add each item to the task 15 changelog and migration-notes bullets. The spec's verbatim
`Consumers must:` line can stay one line. Add the import position to it as a clause, and put the
rest in the entry body and the migration notes.

## Minors

**R7 (minor). A missing optional peer aborts the whole audit, error-tier admin rules included.**
Task 8 (`:930-932`) and decision 20 (`:389-391`) make an unresolvable `daisyui` or `tailwindcss`
fail the run with exit 2. A consumer without them then loses the error-tier admin audit to an
advisory-tier precondition. That is the same case decision 16 already reasons about for the empty
scope.

**Fold:** raise the named failure only when a selected rule needs the peer, as decision 16 does.
Alternatively, have `theme-conformance` and `theme-contrast` report one advisory "skipped:
`daisyui` not installed" finding, and keep the named exit for `--rule theme-*` runs. Update
decision 20's pack smoke expectation to match.

**R8 (minor). `PreviewBanner` degrades badly on a site that upgrades without the import.** Task 4
(`:723-727`) allows literals only as `var()` fallbacks but does not require them. The spec makes
the import required, but a site that bumps the range before following `Consumers must:` shows the
banner on the live preview route. Without fallbacks, a token the site lacks leaves the draft and
published states indistinguishable. The banner's contrast is also tested only under Waymark
(`:736-739`).

**Fold:**
- Every token read in the banner carries a fallback.
- `PreviewBanner.test.ts`, which renders with no site CSS, asserts the two states differ.
- Add a banner contrast assertion to the harness's fixture arm, which is dark-first.

**R9 (minor, a planning miss). The ink selection rule does not constrain the cases tasks 9 and 10
require to pass.** Decision 1 (`:256-260`) picks `N` by stock-theme pass count and chroma. Task 9
(`:1003-1005`) requires Waymark with its inks stripped to pass `theme-contrast` in both schemes.
Task 10 requires the fixture to pass. Decision 18 treats a fixture failure as "a finding about
`N`", which stalls Opus task 9 mid-segment and reopens task 3.

**Fold:** make "Waymark stripped and the fixture pass on all three grounds" a hard constraint of
the selection rule, applied before the pass-count maximization. If no `N` meets it, task 3
reports and stops.

**R10 (minor). The toggle's resolution table has no row for a `color-scheme` other than `light` or
`dark`.** Task 5 (`:779-781`) covers only those two values. A theme block that omits
`color-scheme` computes to `normal`, and a theme may write `light dark`. For both, the toggle's
label and `aria-pressed` state are undefined.

**Fold:** add the rows. Anything other than exactly `light` or `dark` falls back to today's
`matchMedia` behavior.

**R11 (minor). The five-site audit count at the cut has no defined invocation.** `:1323-1324` and
the new `cairn-release` step run the public scope over each site, but each site has `0.97.x`
installed, whose audit has no public scope.

**Fold:** name the invocation, for example `npm exec --package=@glw907/cairn-cms@0.98.0 --
cairn-audit` in each site's checkout, with no `package.json` or lockfile write. In the same run,
record each site's `daisyui` and `tailwindcss` versions against the new `^5` and `^4` peer
ranges. npm raises ERESOLVE on a present-but-mismatched optional peer.

**R12 (minor). The release does not wait for CI and has no failure branch.** `:1321-1323` goes
from the fast-forward straight to `gh release create`. The acceptance at `:1331` checks CI after
the fact.

**Fold:**
- Wait for green `test` and `scaffold` runs on the release commit before `gh release create`.
- If the post-merge gate on `main` is red, stop. STATUS then records `main` as merged but
  unreleased, and the fix goes on a branch. The skill's OIDC re-run rule covers a publish-job
  failure.

**R13 (minor). The charter keeps a line this pass makes inaccurate.** Decision 25 (`:418-424`) and
task 13 (`:1174`) amend only the rule count. `what-cairn-is-and-is-not.md:43` still says "Public
output stays design-agnostic". After this pass the engine ships public role defaults, built-in
public components assume daisyUI's variables, and the package declares `daisyui` and
`tailwindcss` as peers.

**Fold:** task 13 qualifies that line to say the engine ships design-free public defaults and the
design stays site-owned, and cites the `public-css-export` ruling.

**R14 (minor). cairn.pub publishes these docs only after it takes the B and C migration.** The docs
version selector is cairn.pub's engine pin, so the new `public-css.md` page and pass B's
`components.md` to `admin.md` rename go public only when cairn.pub crosses both passes'
`Consumers must:` lists. cairn.pub's own links to the old page name would break at that bump.

**Fold:** the STATUS written at `:1326-1328` gains one carry-forward for cairn-pub's pin bump:
check links to the renamed and new reference pages, and do the migration first.

**R15 (minor). The equivalence expectation can be regenerated mid-pass.** Task 2 has an update mode
behind an environment flag (`:625-627`). A later fix round that regenerates the expectation would
void the pass's primary proof, and only reviewer attention guards against it.

**Fold:** add a criterion to tasks 3 to 13: `git diff <task 2 expectation commit> --
examples/showcase/e2e/fixtures/public-theme-computed.json` is empty. Make the spec refuse update
mode when `CI` is set.

**R16 (minor). The `paint` class's mid-pass owner glance is missing.** The pass-core table's
`paint` settle includes "an async owner glance at captures mid-pass". The plan has only S3
(`:413-417`, `:1242-1252`). The one real taste item is `PreviewBanner`'s new palette, which every
editor sees, and today it surfaces only after both probes.

**Fold:** the segment B boundary posts `PreviewBanner`'s before and after captures, in both schemes,
for an async glance that blocks nothing. S3 still carries them.

## Over-ceremony

**R17 (minor, over-ceremony). The close runs two heavy gates back to back.** `code-simplifier`'s
commit takes an engine gate (`:83-87`), and the close then runs the full gate on the same head
(`:1258-1264`). `check:close` plus `test:node-projects` and `test:component` is a superset of the
engine string, so the first gate adds nothing.

**Fold:** drop the separate engine gate, and let the full gate run on the simplifier's commit. This
saves one serialized heavy gate and about 0.2M tokens.

**R18 (OWNER FORK, minor). The projection sits at 98% of the ceiling, and the release comes last.**
The plan projects 23.5M against a 24M ceiling (`:102-133`). One extra fix round would cross the
ceiling during the merge or the cut, the worst point to stop.

Options:
- (a) Raise the ceiling to about 27M at approval.
- (b) Keep 24M, and have S3's budget question pre-authorize the close and release to finish past
  it.
- (c) Keep 24M and trim: R17, and fold S1's `visual-verifier` read of the fixture captures into S3,
  where Geoff sees the same renders.

Recommendation: (a) with R17. The rule the plan needs in every option is that the cut never halts
on budget once the merge lands.

## Where the plan is sound

- **`main` stays releasable.** Pass C runs on a branch, and `main` moves only at the close, so an
  urgent consumer release during the pass cuts from pass A alone. The expected-red set is scoped
  to the branch.
- **The merge-to-cut window is low-exposure.** The template is still pre-release: its README keeps
  the Deploy button unpublished, and `create-cairn-site` is held. The window affects only direct
  C3 `--template` users. R5's fold shortens it further.
- **Moving culori into `dependencies` does not reach a Worker bundle.** The audit ships only as
  the `cairn-audit` bin, with no `./audit` export, and task 9 guards the shipped `.d.ts`.
  Decision 20's real-install pack test is the right proof. A symlinked install would hide the
  failure it guards.
- **The stale-copy upgrade path is guarded where it matters.** The layered roles lose to a site's
  unlayered copy, and `theme-conformance`'s "a chassis file redeclares an engine default" finding
  is tested on exactly that fixture (Review focus 1). Decision 26 keeps `check:public-tokens`
  honest through the segment where the definitions move.
- **Browser support degrades gracefully.** A browser without `color-mix` treats the derived ink
  and muted values as invalid, so the text inherits `base-content`, which stays legible.
  daisyUI 5 already depends on `color-mix`.
- **The pass classes fit.** The engine-gate tasks are the ones that change audit TypeScript. Task
  5's toggle logic sits under `paint`, but its test-first resolution table compensates. The
  single sitting before the merge is the right place for Geoff's time.
- **The charter scope holds.** `previewMarkdown` is a thin read of the engine's own grammar.
  `public-literals` stays advisory on consumers, per Geoff's tier ruling. No task adds an actor, a
  subsystem, or site-domain logic.
