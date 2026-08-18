# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it.

Record each finding with its perspective and a short note. The perspective is one of the four
audience tracks ([`2026-08-14-audience-profiles.md`](./record/2026-08-14-audience-profiles.md)): `editor`
(the non-technical author working in `/admin`), `admin` (the technical non-developer who sets up
and runs the default site; `operator` retired into this tag 2026-08-14), `extender` (the
Svelte-fluent developer building on cairn's seams; formerly tagged `developer`), or `contributor`
(the engine contributor working on cairn itself; formerly tagged `maintainer`).

This log holds only live findings and the tombstones below. Resolved findings are pruned here once
shipped; their detail lives in the per-plan post-mortems and `docs/STATUS.md`, the homes for shipped
history. The append-only prose that accumulated through 2026-06-26 was pruned on 2026-06-28
(extensibility Plan 1), and the full backlog was cleared on 2026-07-16 by the friction-triage pass:
every open finding was verified against the code and then either shipped, filed into `ROADMAP.md`
with its trigger, or found already resolved and pruned. Git history holds the full record of both
clearings.

## Tombstones (decided, do not resurface)

- **Point-of-typing writing coach.** KILLED 2026-06-26. The help-shell adversarial review discarded it
  as the Clippy pattern. Do not re-propose a per-keystroke formatting coach.
- **`runtime.publicMediaResolver`.** DROPPED 2026-06-24. An adversarial review, verified first-hand,
  found it inverts the prerender/Worker boundary and that the "three wire-points" was a miscount of two,
  both prerender-side and already sharing one `cairn.config` export. The real wart (silently broken
  public images) is fixed instead by the `media.resolver_absent` warn event at `createPublicRoutes`
  construction. Do not re-propose the runtime member.
- **`CairnMediaLibrary`'s dormant "type facet" (a hidden Images/Documents filter).** RESOLVED
  2026-07-20, admin-toolkit review-fixes round. The pass's T8 drift-hunt had filed this as a live
  open finding, attributing the facet's absence to T6's `ListToolbar` re-expression; `git log`/`git
  show` on `CairnMediaLibrary.svelte` instead confirm the facet was removed three weeks earlier, in
  the 2026-06-28 charter-adherence pass (`23abe438`, "the speculative Media Library type-facet is
  removed"), as inert scaffolding for a second stored asset type that has never existed. T6 never
  carried it forward because it was already gone at the branch point. The delivery route is still
  image-only today, so the charter's "we don't accommodate that universe" stands: do not re-add it
  speculatively. `ListToolbarFilter`'s `promoted: false` seam covers the same hidden-until-needed
  shape if a real second asset type ever ships.

## Open findings

The log was cleared 2026-07-16, 2026-07-19 (the dev-backend pass), and 2026-07-29 (the
post-0.91.0 clearing): every open finding was verified against the code and then either
shipped, filed into `ROADMAP.md` with its trigger, or found already resolved and pruned.
The 2026-07-29 clearing shipped four gate tightenings the Pass 2 entries had proposed (the
safelist count assertion, `norms:check` riding the e2e workflow after the 0.91.0 cut proved
the staleness window bites, `check:version` reading the `## Unreleased` window, and the
upgrade-guide/CHANGELOG Unreleased-heading parity check), moved the field-label weight
question (cairn 500 vs the consumer ruling's 600) into ROADMAP as a future design ruling,
and pruned the rest as filed, closed in-pass, shipped (the rendered-allowlist `rule` field;
the own-tree error tier cleared by Pass 3), or resolved by the 24x24 ruling (the 43.78px
tag-filter chip clears the ratified floor; the gate's own header documents it as inert).
Git history holds the full record of all three clearings. The 2026-07-29 ASC Assets-trial
harvest (ten findings across two batches, staged in the consumer repo while a cairn worktree
held live workerd) was folded at the 0.91.1 hotfix pass under the same complete-or-move rule:
finding 1, the 0.91.0 shipped-sheet regression, shipped as the hotfix itself; the
status-flattening finding folded into ROADMAP's standing kit entry with the upstream issue
repointed from the closed kit#12533 to the open kit#12987; and the other eight were verified
and filed into `ROADMAP.md` (the reachable-vocabulary contract, the audit's missing path
filter, the `.ts`-module scan blind spot, the 12px role gap, the doctor's bare-403 zone
reads, the identity-guard/non-2xx hole, the mismatched rendered-summary totals, and the
CodeMirror decoration throw on a consumer edit desk). The same harvest disproved the ASC
edit-desk hydration defect the STATUS carry-forwards had held (corpus C had configured
cairn's internal route shape, which 404s on ASC's single-mount admin; the real desks proved
hydration-clean across 24 runs). The 2026-07-30 Assets-trial BUILD harvest (six findings from
the pass that rebuilt `/admin/club/assets` and `/admin/club/asset-requests` under the
design-capture trial's control conditions, a different staging file from the 2026-07-29
harvest above) was folded at the design-ratchet pass under the same rule. Findings 1 and 6 (the
packaged admin sheet ships no user-agent reset, so a bare `textarea` rendered the browser's
monospace default and daisyUI's `.list` kept the UA's 40px bullet gutter) shipped as the pass's
`base` cascade layer (Task 1). Finding 2 (`form-anatomy.md`'s own worked example prescribed
`gap-x-6 gap-y-4`, which never compiled) shipped as a standing compile gate over the skill's own
reference exemplars, plus a labeled safelist addition (Task 2). Finding 3 (the stacked field
register that already worked inside the package was never exported) shipped as
`register: 'inline' | 'stacked'` on `FieldLabel`/`TextField`/`SelectField`, `'stacked'` now the
default (Task 3, a deliberate breaking change, ratified by Geoff 2026-07-30). Finding 4
(`one-filled-action` and the grader prompt disagreed about what one surface is) was ruled and
shipped: the partition narrows to `nav`/`aside` plus the topmost open dialog layer, and the dark
theme's `.btn-active` selected state gains a visible lightness step (Task 4). Finding 5 (daisyUI
pins every `.list-row` child to `grid-row-start: 1`, so overriding the container's
`grid-template-columns` alone does nothing) is the one finding this pass deliberately did not
repair; it files as a live entry in `ROADMAP.md`'s Next tier with the harvest's own measurement,
since site-side overrides exist and the engine-side repair needs its own design. The pass also
lands the grammar-ladder doctrine the harvest's pattern argued for, in
`docs/explanation/enforced-design.md`: every composition claim gets either a component or a
check, prose alone being the demonstrated failure mode. New findings start fresh below this
line.

CLOSED 2026-08-14 by Pass D. The setup-walk entry (five blind vantages, four classes of gap:
prerequisites arriving late, the tutorial's toolchain drift, troubleshooting scoped only to live
sites, the front door burying the first command) is what the docs rebuild's admin track,
front-door task, and Task 13 production gate were built to answer. The baseline record stays at
[`2026-08-unagented-setup-baseline.md`](./record/2026-08-unagented-setup-baseline.md) as the
evidence trail; the shipped disposition is `docs/superpowers/plans/2026-08-14-pass-d-docs-reset.md`'s
post-mortem and `docs/internal/record/2026-08-14-pass-d-task-13-production-gate.md`'s
dispositions. One item from the smaller list is code, not docs, and was already tracked
separately before this closure: `.dev.vars` missing from the scaffold's `.gitignore` is the
missing-`.gitignore` defect `docs/STATUS.md` holds as owed before release one.

CLOSED 2026-08-17 by the capture pass. The three findings the live `create-cairn-site` run
produced (a first run cannot succeed with the App installed on "Only select repositories"; resume
is not idempotent across repository creation; every scaffold ships the placeholder from-address
`cms@showcase.test`) are all tool defects rather than docs bugs, so they moved whole to
`ROADMAP.md`'s Now tier as one entry, owed before release one publishes the tool. A fourth
joined them there at the pass's register gate: the scaffold hand-over still tells a reader the
GitHub and Cloudflare steps arrive in a later release, in a run that then performs both. The committed
fixtures under `packages/create-cairn-site/test/fixtures/transcripts/` are the evidence, and the
pass post-mortem in `docs/superpowers/plans/2026-08-16-capture-pass.md` carries the run's own
account. New findings start fresh below this line.

### The live-reproduction seam's harvest (Pass 1 and 1b, 2026-08-17 to 2026-08-18)

Building reproductions is a harder DX probe than writing a doc about the same screen, because it
mounts every admin surface from outside a real admin session. That is the same position a site
extending the admin stands in. These findings come from the seam build; each names the evidence
that produced it.

- **Nothing in the admin could be mounted outside a real session without changing the engine
  first.** `extender`. Three injectability fixes had to land before a single story rendered: a
  media-base context key, `CairnAdminShell.themeOverride`, and `EditPage.spellcheckOverride`. Each
  component resolved a piece of its environment itself, from a hardcoded default, a cookie, or
  `localStorage`, with no way for a host to supply it. A site composing a custom admin screen meets
  the same walls in the same order, and the documented `CairnAdminShell` seam is the surface that
  invites it to. The fixes are shipped and narrow; the pattern behind them is the finding, and the
  question worth asking before the next component lands is which of its inputs a host can reach.

- **The shell decides which chrome to render by parsing a pathname string, and is silently wrong
  off the shape it expects.** `extender`. `isDeskRoute` wants exactly three segments with a
  declared concept in the second. Off that path it renders office chrome instead: the sidebar
  breakpoint moves, the narrow band compaction stops applying, and the theme toggle stops folding
  away. Nothing warns. The seam had to freeze a fixture pathname to keep three stories from
  quietly picturing the wrong layout, and a site adding a screen at a path of its own choosing gets
  whatever the parse happens to yield. A custom screen has no way to state which chrome it wants.

- **No gate catches a new prop on an exported component.** `contributor`. `check:reference` and
  `check:reference:signatures` both read `.d.ts` exports, so a Svelte prop interface can grow
  without the reference page noticing. It already happened twice in one pass: `CairnAdminShell` and
  `EditPage` each gained a public prop while `docs/reference/components.md` kept printing the older,
  shorter signature. This is the strongest gate candidate the pass produced, since the condition is
  mechanically detectable and the failure is silent. A watch note in a backlog would not catch it a
  third time.

- **The delete-refusal banner uses the plural concept label in a singular sentence.** `editor`.
  `ConceptList.svelte:316` renders `This {data.label.toLowerCase()} could not be deleted`, so a
  reader sees "This posts could not be deleted." `:255` composes the same sentence for the polite
  live region, so an assistive-tech user hears it too. `:211` in the same file already reaches for
  `data.singular ?? data.label`, so the component carries the right noun and these two strings take
  the wrong one. Trigger: fix it before any docs page embeds `publish/refusal-banner`, which
  reproduces that sentence at full size.

- **Two components seize the page in ways an embedding host cannot undo.** `extender`. `TidyReview`
  calls `showModal()` at mount, which pulls the host page's focus into the reproduction before the
  route's own `inert` step can run. Separately, the command palette binds its shortcut through
  `svelte:window`, and `inert` does not remove a window listener, so an inert reproduction still
  answers Ctrl+K. Both are fine for a component that owns its page and hostile to one that does
  not. Pass 2 carries them as constraints; the engine question is whether a host can ask a
  component not to grab focus or global keys.

- **State a host can only reach by calling an instance method is state a host cannot pose.**
  `extender`. `MediaInsertPopover` mounts headless and opens through an instance export, with no
  prop that drives the open state, so a declarative host has to synthesize a click instead of
  describing what it wants. Related in shape: `spellcheckOverride` does two jobs at once, forcing
  the value and hiding the control, because the one prop means both "start it off" and "the site
  owns this now". Neither is urgent. Together they are the reason the seam leans on poses where
  props would have been steadier.

### Backfill of the 2026-08-04 to 08-16 window (mined 2026-08-18)

The log's last full clearing was 2026-07-29, and only two passes have been closed into it since (Pass D,
the capture pass). That left roughly two weeks of shipped work unmined, including the nine-plan
`create-cairn-site` initiative. A six-reader sweep over those post-mortems, each candidate then checked
against the current tree by a fresh skeptic whose default was to kill, produced twenty-three candidates
of which twelve were killed as already filed, already fixed, or speculative. The eleven below survived.
Every one carries a quote from the tree as it stands, not from the post-mortem that first noticed it.
Triage runs at this pass's Task A8 under the complete-or-move rule.

- **Two published extend pages assert a commit-attribution fact a live commit disproves.** `extender`.
  `docs/extend/architecture.md` tells a reader the committer is `cairn-cms[bot]` in three places, its
  prose at `:114`, the sequence arrow at `:102`, and the diagram's `accDescr` at `:93`, so the claim
  reaches a screen-reader user too; `docs/extend/add-cairn-to-a-sveltekit-app.md:19` repeats it. The Git
  Data API falls back to the author when `committer` is omitted, so both fields read the editor, which
  two independent live runs recorded (T3's `/admin` save, and every tool-made commit in T5's Task 8
  e2e). `src/lib/github/repo.ts:261` still tells the next contributor the opposite. STATUS carry-forward
  (2) covers only that source comment and says nothing about the published pages. Triage: the docs half
  is a correction owed before release one publishes these pages; the engine half is a separate decision
  about which behavior is wanted, since `CLAUDE.md` states the bot-as-committer promise as design.

- **The scaffolder cannot run on Windows, which it otherwise treats as supported.** `admin`.
  `packages/create-cairn-site/src/cloudflare/exec.mjs:120` returns `${defaultBin}.cmd` on win32 while
  `runCommand` at `:72` passes `shell: false` unconditionally, and Node's CVE-2024-27980 fix makes a bare
  `.cmd` spawn throw `EINVAL` on every release the package's `engines` field admits. The chapter's first
  call is `runNpm(['install'])`, which does not catch spawn rejections, so the CLI dies on an unhandled
  error before wrangler is reached. Where wrangler is reached, the bare catch at `:156` maps the failure
  to `wrangler-unavailable`, telling the admin to install something already installed. Windows is a
  claimed target: `preflight.mjs:131` carries a win32-only finding and `github/open.mjs:26` a win32
  browser branch. Trigger: before release one publishes the tool.

- **The default deployable bundle is over the Workers Free script limit, and no gate can catch it.**
  `admin`. The showcase bundle measured about 3.17 MiB gzipped against Cloudflare's 3 MiB free-tier
  script limit, and the scaffolded site inherits that bundle directly through the emitted template. The
  only tripwire, `.github/workflows/e2e.yml:74`, budgets 5 MiB, so it cannot fail until well past the
  point a free-plan deploy already has. `src/lib/doctor/` has no size check. Meanwhile the admin track
  tells a reader the default path runs on the free plan (`create-your-site.md:85`, `own-your-domain.md:25`),
  framing Workers Paid as needed only for a second editor's sign-in email. The measurement reached no
  tracked list; its only home was an auth-channel post-mortem's residuals, whose own words are "filed
  here rather than fixed". The narrow ask is a free-tier-calibrated warning, not the ROADMAP resolver
  rewrite that entry designates this assertion as the tripwire for.

- **Two sites whose names slug alike silently adopt each other's Worker, databases, and bucket.**
  `admin`. `packages/create-cairn-site/src/cloudflare/config.mjs:55` derives the worker name as a pure
  function of the typed display name, with no site id and no account lookup, and `deploy.mjs` then runs
  `wrangler deploy` and `d1 migrations apply` against id-less by-name bindings with no existence or
  ownership probe. The consent copy does print the derived names, and frames reuse as reassurance
  ("deploying again later updates it") rather than warning that an existing resource belonging to a
  different site will be taken over. T3's review named this and proposed three fixes; none landed, and
  it left the plan file for no tracking surface.

- **Every scaffolded site's own build prints an unexplained refusal into its owner's build log.**
  `admin`. The baked template's footer links `/admin` on every page, the prerender crawler follows it,
  and `src/lib/sveltekit/guard.ts:114` answers with `guard.rejected` (`reason: 'https'`) and a branded
  400. So a new owner's first build output carries a security-shaped refusal and a `400 /admin (linked
  from /)` that no doc explains and nothing suppresses. The sibling finding from the same live runs, the
  kit deprecation spam, was promoted to ROADMAP; this half was left behind.

- **`cairn-doctor` has no check for the one failure mode the Builds chapter was built around.** `admin`.
  The tool's own README documents that revoking or rolling the build token breaks push-to-deploy
  silently, and says plainly that this is not hypothetical because a production cairn site was found in
  exactly that state. That site is still in it: STATUS hand step (4) records 907-life's deploys as broken
  since 2026-07-14. None of the doctor's twenty-one checks reads Builds or build-token health, although
  the analogous email silent failure already got `email.sender-onboarded`. STATUS tracks the incident;
  nothing tracks the engine gap that leaves an admin no way to discover it short of noticing the site
  went stale.

- **The tool's prose does not know the run's own state, in two more places.** `admin`. On any chapter-2
  park, `bin.mjs:258` calls `printLiveInfo` unconditionally, which prints "Connect your own domain any
  time by re-running…" directly after the park message that just said the connection is in progress, so
  the right instruction and the stale one appear back to back. Separately, `chapter3.mjs:975` titles a
  step "Get a fresh Cloudflare API token" before `collectBuildsToken` has had the chance to revalidate a
  saved one with no prompt and no browser trip. ROADMAP already names this root for the scaffold
  hand-over defect, that no gate reads the tool's own prose against its own behavior, so these belong
  with that entry rather than as unrelated copy bugs.

- **The cost preamble ships the inference its own research refused to ship.** `admin`.
  `packages/create-cairn-site/src/money.mjs:41` states "All in, a small site on its own domain runs about
  $6 a month" with no hedge. The T4b cost research left the Advanced Certificate Manager line item open
  and wrote, of that exact number, "I will not put an inference in owner-facing money copy", pricing the
  downside at $10/month if the question resolved against us. The copy shipped anyway and the question
  appears in no live tracking doc, including STATUS's hand steps, where comparable one-glance checks do
  live. Two cheap dispositions close it: take the glance, or hedge the line until someone does.

- **The bootstrap sign-in hand-copies the engine's token contract, and its test is a closed loop.**
  `contributor`. `packages/create-cairn-site/src/cloudflare/bootstrap.mjs:19` redeclares `TOKEN_TTL_MS`
  as a literal and `:95` re-implements the token hash, each pointing at `src/lib/auth/crypto.ts` in a
  prose comment. The round-trip test hashes the CLI's token with the CLI's algorithm and compares it to
  the CLI's own SQL, so it stays green if the engine changes either. T3 named the fix it wanted, a
  cross-package contract test, and called it this repo's own gold standard for a watch item. It is the
  clearest gate candidate in this batch.

- **A revert refusal blames the editor's own entry for someone else's publish, and nothing counts how
  often it happens.** `editor`, `contributor`. The staleness comparand's breadth is ratified spec and
  stands; do not reopen it. Two things it did not settle remain. `CairnHistory.svelte`'s refusal reads
  "The history changed since this page loaded. Reload and try again.", written as though the editor's own
  entry moved, when on this design the ordinary cause is an unrelated entry being published. And the
  deferral's condition, a future refinement if editors hit it, has no detector: `history_stale` is not in
  the log event vocabulary, so the trigger can only ever arrive as a verbal report, in a repo whose own
  doctrine converts a conditional watch into a machine-detectable one.

- **No live run has ever taken an externally registered domain through zone creation.** `admin`.
  `zone.mjs:30` still records that no such domain was observed going through `POST /zones`, so the
  branches that path reaches are unproven. Carried as STATUS carry-forward (1) and worth a real trigger
  rather than a standing note.

**Three carry-forwards were audited and judged not worth filing**, recorded here so they are not
re-mined: `packages/create-cairn-site` having neither a comment nor a type gate (the package is plain JS
by design and its own suite is the real gate, and no pass has reported a defect slipping through), the
`paid-plan-missing` mapping keyed on entitlement wording (the call site's docstring and its test name
both already state the risk and the reason), and the root `CLAUDE.md` context-headroom note (housekeeping,
outside this log's charter). STATUS should shed all three at the next update rather than carry them
further.
