# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(see the Archives section at the end of this file),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.

## Immediate next action (2026-07-28: Pass 2 is closed; Pass 3 planning is next)

**Design-infrastructure Pass 2 (enforcement) is COMPLETE and merged to `main` at `446c33d7`.**
All eighteen tasks landed. The plan, with every step ticked and the post-mortem appended, is
`docs/superpowers/plans/2026-07-27-design-infrastructure-pass-2-enforcement.md`. **Nothing is
published**; the window holds under `## Unreleased` with its `<!-- release-size: minor -->` marker.
`main` is NOT pushed.

**Next: plan Pass 3 (capture).** Then ONE release at the initiative boundary (spec section 10),
then the ASC Assets trial. The principle-pages pass queues behind the initiative. Pass 3 also owes
the `skills/` directory the sixth design principle's page depends on (below).

**What Pass 2 shipped.** `cairn-audit` is a packaged bin (`"cairn-audit": "./dist/audit/bin.js"`)
with nine static rules and eleven rendered ones, a counted suppression idiom, the four graduated
repo gates, and a norms manifest with provenance and a CLI query. The substrates are
`svelte/compiler` markup parsing and built-sheet resolution for static mode, and real Chromium
against a running preview for rendered mode. Never a regex.

**The calibration verdict (Task 17), the pass's real product.** None of the five compositional rules
can be promoted from advisory to error. The spec's bar names both corpora and sets no numeric
threshold; every rule fails on any reading of it, so the missing number never became the deciding
question. Evidence base:
`docs/internal/2026-07-design-infrastructure-audit-calibration.md`.

**The finding worth carrying into every later rule: five rules fire in only one direction.**
`viewport-overflow` and `chip-ground-collision` fire only on cairn's own admin and are clean on a
consumer, which is a healthy rule catching real debt in its own house. `interactive-contrast`,
`relational-spacing`, and `norms-bands` fire only on the consumer and are silent on the code they
were written against, each for a mechanism traced to its cause. A rule silent on the codebase it was
written against and loud on the first outside codebase it meets was never calibrated; it was fitted.

**Corpus B and its limit.** ASC (`~/Projects/asc-site`, on `0.90.1` from the registry) ran entirely
locally, on Geoff's call. The plan's stated method does not work: the `asc-staging` worker serving
both `dev.` and `staging.aksailingclub.org` binds no `AUTH_DB`, so the Access service token reaches
the outer door and cairn's guard then bounces every `/admin` route with nothing to authenticate
against. The session tables live in `cairn-asc-auth`, bound only by the production `asc-site` worker,
and auditing production admin is not read-only (the rendered rules click to capture an open-menu
state). ASC ships no dev-auth backend by deliberate design, so **its authenticated admin, including
31 custom admin routes, is uncovered.** That is the richest evidence the promotion question could
have had. Anyone reopening promotion should close this gap first.

**The accessibility review's corrections matter more than any code in the pass.** A fresh-context
gate found the engine misstating standards, and a wrong citation in an enforcement engine propagates
into every consumer that trusts it. Four rules called WCAG 1.4.11 a legibility standard; legibility
is 1.4.3, which no rule here measures. `border-contrast` asserted 1.4.11 over every rendered border
including decorative ones, when the criterion reaches UI components and graphical objects; it now
states a house bar that borrows the number. `touch-targets` presented as SC 2.5.8 while enforcing a
strict superset with four of five exceptions unimplemented; it now reads as a house floor derived
from the criterion. `weight-budget` cited 4.1.2 for a typographic axis it draws no line about. The
reference page gained a section naming what the rules do not cover, so nobody reads `cairn-audit` as
an accessibility conformance tool.

**Both carried risks are CLOSED.** The norms freshness check moved into its own reusable workflow
(`.github/workflows/norms.yml`, `workflow_call` plus `workflow_dispatch`), so `publish.yml` still
gates on one definition while the check can finally be rehearsed against any branch without
attempting a real publish. **Rehearse it once with `gh workflow run norms.yml --ref main` before the
next release**; it has still never run on CI. The `## Unreleased` window now carries its
`<!-- release-size: minor -->` marker; `check-version.mjs` matches only `## X.Y.Z` headings, so the
marker is inert until the cut and reads correctly then.

**The measured state of cairn's own admin**, rendered mode, six routes in both themes:
`20 errors, 214 advisories, 130 suppressed`, exit 1. Static mode: `1 error, 0 advisories, 5
suppressed`, the one error being the `badge-ghost` design call below.

**OPEN FOR GEOFF, two items, both design calls rather than defects:**

1. **`badge-ghost` on EditPage's Published pill** (`EditPage.svelte:989`), carried since Phase 2.
   cairn's tree patched around its own refuted alternative with a PINNED unlayered CSS rule to stop
   the pill vanishing in dark, while `StatusChip.svelte:15` records `badge-ghost` as refuted. A naive
   swap to `badge-outline` is wrong on its own, moves pixels, and leaves the pinned rule dead. This
   is why `npx cairn-audit` honestly exits 1 on cairn's own tree.
2. **`screen-anatomy`'s affirmative half** is deliberately NOT implemented, the fifth ruling and the
   only one still open. "The primary action sits in the header slot" is mechanically unfalsifiable
   without knowing whether a screen HAS a primary action, so implementing it would fire on every
   screen legitimately without one. The rule checks only the negative half. Ruling needed on whether
   that half is dropped, made config-declared, or left to the grader.

**A SIXTH DESIGN PRINCIPLE, ruled 2026-07-28 (Geoff).** The front-page ledger goes from five to six.
The claim is that cairn's design language is ENFORCED, not merely documented (the grammar tokens, the
toolkit primitives, `cairn-audit`, the norms manifest, the standard shipped as a loadable skill), and
the payoff is that a developer spends their effort on their own business logic rather than on building
an admin interface. The honest form is LESS burdened, not free. "Build for agentic coding" was
considered and rejected as the phrasing: it is an imperative where the other five are flat
declaratives, and it keys the principle to a vocabulary that will move. The principle-pages plan is
AMENDED in place (six pages, `T1a` through `T1f`), and Pass 3 owns the README and front-page
positioning that lands it. **The blocking dependency: the page will want to say cairn ships a Claude
skill, and that is not true today.** There is no `skills/` directory and the package `files` array does
not carry one; Pass 3 ships it. Do not publish the skills claim before it lands. The copy itself is
unwritten by design, since front-page voice is a brainstorm sitting with Geoff.

**Method lessons from this pass, all three earned the hard way:**

- **Build-then-refute is now proven over eleven rendered rules and four rulings, and every single one
  was refuted on first build.** Each refuter had to demonstrate a miss with a runnable input against
  real Chromium, and the demonstrations became the fixtures. A rendered rule proved only by a
  `page.evaluate` test double is not proved: two rules once shipped throwing `ReferenceError` on
  every real page while their suites were green.
- **A count delta, not a gate, catches the worst regressions.** Task 16's dark-theme half-blinding and
  Task 16b's `.btn` transition blindness were both found by diffing measured output per rule per
  theme and refusing to accept an unexplained movement. Every gate was green through both.
- **Two source files carried a raw NUL byte as a composite-key separator**, which made them binary to
  `grep` and to `file`, so any grep-based gate over `src/lib` silently skipped them. Found from a
  simplifier's passing aside, not from a gate. Both now spell it as a unicode escape, and a gate to
  stop a third is filed in ROADMAP.

**Carry-forwards (live):** eight confirmed-but-deferred rule repairs, each filed in ROADMAP with its
cost (widening a gating rule's net at a gate stage, with no adversarial pass behind it, is how a
calibrated baseline stops meaning anything); the 20 error-tier findings against cairn's own admin,
which are real defects the engine correctly caught and which nothing has fixed; the ASC admin corpus
gap above; admin error statuses flattening to HTTP 200 under the shell's streamed pending count
(upstream sveltejs/kit#12533, scheduled routine watches it); mermaid diagrams near-illegible at
320/390 (candidate: tap-to-expand in the Topo pass); section-index breadcrumbs duplicating the arm
name; the cairn.pub live admin smoke (Geoff's magic link plus publish round-trip) is owed; the
`/admin/help` first-steps card overlap.

**THEN, after Pass 3 and the release: the Topo design pass.** Open with
`docs/internal/2026-07-18-topo-inspiration-review.md` (four-system synthesis, devices table, Starlight
anatomy checklist, section 5's open questions for Geoff; mockup candidates go to Geoff BEFORE any
build); the cairn.pub design arc ratified seed vocabulary for it: the four-door landing, the docs rail
on /help, the step-down doc heading scale, and the micro-cta device. After Topo: the scaffolder.

**Published state:** `0.90.1` is `latest` (2026-07-24). Passes 1 and 2 are both unpublished on `main`.
When the cut comes it is a MINOR: Pass 1 added the grammar layer as public surface and Pass 2 adds a
bin. Verify the next number is free with `npm view @glw907/cairn-cms versions --json` before promising
it, and cut with the `cairn-release` skill.

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`,
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries), `STATUS-archive-2026-07-19-to-2026-07-20.md` (the chassis-nav pass and the
v0.88.3 safelist publish), and `STATUS-archive-2026-07-21-to-2026-07-28.md` (design-infrastructure
Passes 1 and 2 phase by phase, the `0.89.x` and `0.90.x` publishes, and the admin-toolkit
organization pass).
