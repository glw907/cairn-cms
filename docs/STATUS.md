# cairn-cms status

**SESSION CLOSED (2026-07-06, ~11pm AK — the Fable window's end).** The five-day arc is
fully landed; docs/superpowers/2026-07-07-fresh-session-brief.md carries the OPUS
OPENING PROTOCOL (read it first, follow it in order). Two machines ran past the close
in the old terminal: the ASC completion pass (manifest-driven, guarded) and the Part C
engine pass (branch admin-extension-seams). Their outcomes are in git regardless.


**THE FINALE ADDENDUM (2026-07-06, post-handoff-brief): the ASC repos RENAMED
(aksailingclub-org = the new cairn site, ex-asc-site, with its own Claude project +
seeded memory; aksailingclub-legacy = the live Hugo site + ops; a compat symlink bridges
the overnight machines). The security reference implementations, the migration pattern,
and the theme-tutorial skeleton landed under specs/assets + docs/tutorial. The family
lessons propagated to every project CLAUDE.md (907 + aksailingclub-org done; ecxc via
its in-flight sweep). The gap-closing sweeps (ecxc infra, legacy succession, the
cairn CLAUDE.md audit) run overnight with the rest.**


**SESSION HANDOFF (2026-07-06 ~11pm): the five-day Fable arc lands. The successor's
brief: docs/superpowers/2026-07-07-fresh-session-brief.md (READ FIRST). Five machines
left running overnight (the ASC completion pass vs its ORIGINAL-MANIFEST; the ecxc
design pass; three port-manifest enumerations) — results land in the repos. The Fable
deliverables all committed: the phase-2 design suite, the beta-readiness review, the
Topo brief, the arc post-mortem, the post-cutoff Fable system. The manifest doctrine is
the arc's principal legacy.**


**THE RUNWAY TO BETA IS SET (Geoff, 2026-07-06): the ASC effort is the final pre-beta
proof — phase 1 building now (the ratified club-grounds design, the committed north star),
then the three-layer harvest review, then phase-2's admin build-out (the extending-
developer seam's first production test; rich harvest expected, breaking window open).
The remaining pre-beta queue holds its order: Topo, cairn.pub, the consolidating release.**


**THE ASC WORK SESSION COMPLETE (2026-07-06): the show-and-tell ratified the narrowed
diagnosis (chrome stacking on home; per-SECTION prose walls; the MembershipWorks clash =
a known constraint resolving via ops absorption); the calibration locked the recipes —
A1 (bands mark sections, cards mark objects, nothing gets both; one spacing scale) and
B1 (editorial pacing: at-a-glance table + subheads, "a significant improvement over the
original"). The spec awaits Geoff's ratification read, then writing-plans. Artifacts:
the show-and-tell and calibration pages (claude.ai, session record).**


**0.81.0 SHIPPED AND DEPLOYED END-TO-END (2026-07-06): the chassis release — one chassis,
N themes, Waymark the flagship theme, three verified example theme ports (AstroPaper r4,
Foxi r2, gallery r3 — all fresh-context PASS), the renderer plugin seam, tableScroll
default, sitemap extraRoutes, titleTemplate, the themed-404 chassis pattern. ZERO
Consumers-must lines: the whole window additive. Both sites live on it: 907.life (27/27
crawl, themed 404 serving) and ecxc.ski (15/15 crawl, the three trial fixes verified
live: meter bar, inline FAQ, archives chips), both render-read post-deploy. In flight:
the themed-404 propagation to both sites (their chassis copies predate the pattern).
NEXT: the aksailingclub brainstorm (reference capture of dev.aksailingclub.org running);
the ecxc design pass runs parallel; Topo after.**


The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to
`docs/internal/history/STATUS-archive-2026-05-to-2026-07.md` (and successors), never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.


## Immediate next action (2026-07-14: the save-500 pass MERGED; release + rollout executing, then the ROLES initiative)

**THE SAVE-500 PASS IS MERGED TO MAIN (7ac6d58c; plan + post-mortem:
docs/superpowers/plans/2026-07-13-save-500-honest-errors.md).** The window under
`## Unreleased`: the three-layer P0 fix (create-dialog date seeded through the redirect;
date-token permalinks structurally require their date field; save-time bounce), the
admin-action raw-500 guard (`admin.action.failed` event; script-posted actions fail inline),
FieldInput required attributes, tidy error voice (`tidy.error` reason field), tidy key
truthful visibility (per-isolate health cache; bounded TTL-cached probes in settings +
doctor), and the showcase preview `containerClass: 'site-main prose'` fix. Full gate green at
merge (check 0/0, 3273 tests exit 0, all seven named gates); the adversarial review workflow
(16 agents) confirmed and folded 2 real defects, refuted 6. NOW EXECUTING (Geoff-authorized):
`cairn-release` cut, then rollout ecxc → 907.life → aksailingclub-org main. Each site's deploy
also fixes its own preview containerClass (ecxc :108, 907 :94, ASC :196 — same chassis defect
as the showcase) and gets a live save verification; Geoff's magic-link click stays the human
smoke step.

**THEN (fresh session): the EXTENSIBLE ROLES initiative, FULL SCOPE, Fable-conducted (Geoff,
2026-07-13/14: "we can do the deeper work... while I have Fable available"; needed for ongoing
ASC work).** Entry point: a full-scope brainstorm (the human gate) covering the open role
vocabulary, the capability mapping, the read-side typed contract, the ManageEditors surface,
migration + bootstrap-owner mechanics, auditable role changes, and email normalization. The
grounding inputs, all committed: the ROADMAP Now entry, the ASC consumer brief
(aksailingclub-org/docs/2026-07-13-cairn-editor-roles-consumer-brief.md, e6bbe02,
Geoff-verified), and the charter (cairn is not an auth platform; ASC is the first consumer,
not the ceiling). Resume prompt: "Run the extensible-roles full-scope brainstorm; read the
ROADMAP Now entry and the ASC consumer brief first."

## Prior next action (2026-07-13, night: the save-500 pass EXECUTING)

**THE P0 IS DIAGNOSED AND THE PASS IS RUNNING** (plan:
docs/superpowers/plans/2026-07-13-save-500-honest-errors.md, on worktree
`save-500-hardening` off main; cairn-implementer per task, test-first, full gate). The 500:
ecxc's date-token permalink (`/:year/:month/:slug`) + a dateless new entry — createAction
collects the date for the id then drops it, the form opens with an empty non-required Date,
validation passes, and `resolvePermalink` throws unhandled inside saveToBranch's manifest
upsert (Workers Logs ray a1ad4af02a3277a3). Tasks: the date seed + structural requiredness
(T1), the no-raw-500 action chokepoint (T2), the missing `required` attributes (T3), tidy
error voice (T4), tidy key truthful visibility (T5), preview-formatting diagnosis (T6).
Geoff authorized (mid-session, 2026-07-13): workflow for the review gate; when fixes are
verified, cut a release and update all sites, ecxc first. Still queued behind the pass:
the fluid-address design (awaiting Geoff's approval) and the tidy key mint (Geoff's one
step; everything else in tidy's path is verified good).

## Prior next action (2026-07-13, late: 0.84.3 SHIPPED to all three sites; three editor follow-ups queued)

**0.84.3 IS PUBLISHED AND LIVE EVERYWHERE** (plan + post-mortem:
docs/superpowers/plans/2026-07-13-editor-publish-visibility.md). The window: the
always-visible guarded Publish (nine-agent CMS survey grounding), the contraction
dictionary + curly-apostrophe normalization, the create-title seed, and the New status
badge. Full gate + CI e2e green at the cut; the two edit-page visual baselines
regenerated on CI and render-read; OIDC publish verified (`npm view` serves 0.84.3).
Rollout: ecxc.ski (also: tidy ENABLED, ANTHROPIC_API_KEY routed via sync.sh; the posts
`description` field made optional, relabeled Summary with help), 907.life, and
aksailingclub-org MAIN (main was on ^0.84.1; the design/education-round-4 arc branch was
left untouched, restored via npm ci after a wrong-branch commit was reset). All three
deploys green. Geoff's own magic-link click on each admin remains the human smoke step.

**NEXT (a fresh session; the queue, in order):**
1. **P0: SAVING A POST ON LIVE ECXC RETURNS A BARE 500 (Geoff, live report, UNDIAGNOSED;
   an editor cannot save).** Logs first: ecxc has `observability.enabled = true`, so the
   exception is in Workers Logs; query around Geoff's attempt (2026-07-13 ~19:30 AK) for
   the unhandled error and any `commit.failed`, or `npx wrangler tail ecxc` while
   reproducing. Diagnostic frame: earlier today the required-description validation
   blocked his saves BEFORE the commit path, so this 500 may be a pre-existing failure
   the ecxc Summary-field fix (now optional) newly exposes, not necessarily an 0.84.3
   regression; but treat the window's `createAction`/`editLoad` title-seed change as a
   suspect too (a new-entry save via `?new=1&title=...`). The GitHub commit path
   (ensure-branch, manifest upsert) is the other suspect family. Reproduce on the
   showcase first if possible.
2. **Engine hardening rider on #1: a save must never surface SvelteKit's raw 500 page to
   an editor.** Wrap the save/publish action's unexpected-exception path into the
   editor-visible error strip with honest, calm copy (the admin voice), and log the
   event. Geoff's words: "that's a useless error for an end user."
3. **Tidy on ecxc BLOCKED on a fresh ANTHROPIC_API_KEY (diagnosed, one Geoff step).**
   The workstation store's key answers 401 from the API (revoked upstream); it was the
   only Anthropic credential in any store. Geoff mints a new key at
   console.anthropic.com/settings/keys, then:
   `~/.dotfiles/scripts/secrets/secret-set.sh ANTHROPIC_API_KEY --value '<key>'`, then
   `sync.sh --worker ecxc`, update the registry rotation note. No redeploy needed.
   Everything else in tidy's path is verified good (config gate, key plumbing, the
   default model id `claude-sonnet-4-6` is valid and active).
   **Engine rider (Geoff): tidy's error handling must speak to the editor.** Today every
   model-call failure maps to one retryable "Tidy could not finish. Try again."
   (`content-routes-tidy.ts:134`), which is wrong for an auth/config failure: a 401/403
   from the API is not retryable and needs the developer, not the editor. Branch on the
   Anthropic error class: auth/permission errors get a calm editor-voiced non-retry
   message ("Tidy isn't available right now. Your site's AI access needs attention;
   let your site developer know.") as a distinct fail (503) plus a `tidy.error` log with
   a reason field; rate limits/overloads/timeouts keep the try-again framing. Same
   honest-error philosophy as queue item 2's raw-500 rider; consider one small pass
   covering both.
   **Second rider (Geoff): verify the key WORKS before showing the Tidy button.** Today
   the button gates on `tidy.enabled` alone; the settings screen and doctor check key
   PRESENCE, but a present-and-revoked key (exactly today's case) still shows a button
   that can only fail. Design call for the pass: a cheap cached health probe (a minimal
   API call, cached per isolate or in KV with a TTL) consulted at edit load, so a dead
   key makes the button absent (the tidy-settings truthful-visibility principle:
   absent, not disabled) and the settings screen and doctor report the key as invalid
   rather than merely present. Weigh probe cost and latency against a lazy
   degrade-after-first-failure; either way, presence checks alone are no longer the
   bar.
4. **Preview shows no formatting on ecxc (Geoff, live report, UNDIAGNOSED).** Reproduce
   first on the showcase preview tab, then ecxc (its `preview` knob looks correct:
   `stylesheets: [themeCss?url, siteCss?url]`, `containerClass: 'site-main'`). Decide
   engine vs site; suspects: the srcdoc iframe's stylesheet resolution, the
   containerClass wrap, or a longstanding ecxc-only gap.
5. **Required textarea skips native validation (engine bug, DIAGNOSED).**
   `FieldInput.svelte:117` omits `required` on the textarea; every other field type
   carries it. So a required textarea never trips the capture-phase invalid handler that
   opens the Details panel, and the save fails server-side with a bare error (exactly
   Geoff's "Description is required" with no visible field). One-attribute fix + test.
6. **Fluid address until first save (design ruled by the slug survey; awaiting Geoff's
   approval).** Pre-first-save the Details Address is editable and auto-follows the
   title (detach on manual edit); first Save commits it with the create-time collision
   guards; after save/publish today's rename flow stands. Survey grounding is in the
   2026-07-13 plan's post-mortem.

## Prior next action (2026-07-13: 0.84.2 SHIPPED — the admin login hang fixed and verified live)

**THE ADMIN HANG AFTER LOGIN IS FIXED, PUBLISHED, AND VERIFIED ON BOTH PRODUCTION SITES.** The
ecxc live diagnosis (docs/internal/2026-07-13-admin-token-cache-poisoning.md) traced the hang to
the installation-token cache serving a workerd-canceled, never-settling mint promise to every
request in the isolate for the 55-minute TTL; the trigger shipped with the shared shell load
(~0.77+), and the "content-list hangs in this sandbox" note was this bug, not the sandbox.
**0.84.2** (patch, `3ce8c08` + `f7e4cad`) stores only a resolved token; the regression test pins
the never-settling-mint case. Full gate + CI e2e green at the cut, OIDC publish verified.
Rollout (Geoff-authorized workflow): ecxc.ski and 907.life bumped to `^0.84.2`, site gates green,
deployed, lockfile commits pushed, then each probed live in the exact poisoning order with a
smoke D1 session (authed `/admin` 307, then the formerly-hanging list request 200 in ~1s, repeat
200, homepage 200, smoke rows deleted). ecxc BACKLOG #36 closed with the evidence; Geoff's own
magic-link click remains that checklist's human step. **HELD: aksailingclub-org** — its tree
carries live class-schedule WIP (7 modified tracked files, the design-iteration arc), so the
bump + dev.aksailingclub.org deploy waits for that arc's settle; it is a two-file drop-in
(`npm install @glw907/cairn-cms@^0.84.2`, deploy) when the WIP lands. NEXT: unchanged from the
0.84.1 entry (Geoff tests the design-iteration loop in a fresh session); the ASC bump rides the
arc's settle.

## Prior next action (2026-07-08, late: 0.84.0 + 0.84.1 SHIPPED — the design-iteration window)

**THE MACHINE-LOCAL DESIGN-ITERATION LOOP IS BUILT AND SHIPPED.** The spec
(docs/superpowers/specs/2026-07-08-design-iteration-loop-design.md, Geoff-approved) encoded his
ASC round-3 rulings: main-loop edits against `vite dev`, notes are probes, ceremony once at
settle, deploy only at finalize. Landed across two cuts: **0.84.0** (minor) the
`cairn-media-seed` bin (seeds local R2 from a deployed site; `--from`/`--header`/`--bucket`),
the media-route plain `onlyIf`/`range` derivation (+ my suffix Content-Range review catch), the
showcase design-probe harvest, the reference page + the iterate-your-design-locally guide (the
Waymark make-it-your-own worked example, per Geoff's audience ruling). **0.84.1** (patch) the
SECOND serialization site 0.84.0 missed: `writeHttpMetadata` on the returned R2 stub also
cannot marshal a `Headers` under `getPlatformProxy`; the route now reads plain `httpMetadata`
fields (the seam drops the method so the class cannot recur), and the bin stores content types.
**Lesson banked:** 0.84.0 released on a green gate without driving the real `vite dev` flow;
the ASC dispatch's end-to-end verification caught it in minutes. ROADMAP "Now" gains the
`getPlatformProxy` media smoke that would catch the whole class in CI. Also: publish.yml is
PINNED to npm 11 (npm 12.0.0, released 2026-07-08, ships without its sigstore module and
breaks every publish; WATCH comment in the workflow). The design-refinement skill gained its
EXPLORATORY-ARC mode (dotfiles 4ae276e, two fresh-context scenario tests green). ASC retired
`devMediaFallback` + its site-local sync script for `npm run media:seed` (final verification
landing). NEXT: Geoff tests the new system in a fresh session (prompt pre-baked in this entry's
closing report).

## Prior next action (2026-07-08: 0.82.1 AND 0.83.0 SHIPPED; the ASC consumes both)

**TWO CUTS IN ONE NIGHT, both OIDC-verified on the registry.** 0.82.1 (patch): the admin-shell
sidebar fixes (scroll bleed via position:fixed; deep custom-nav routes keep the persistent
sidebar) plus the pass-2.1 harvest window. 0.83.0 (minor): the PUBLISH-ACTIONS SEAM (data-only
`publishActions` on the editor group, the adminNav grammar at the publish-success moment; ASC's
announce deep-link is the worked example and first consumer) plus the EMAIL binding type widening
(cc/bcc/attachments/single-replyTo, live-probed). Also landed: the self-committing e2e baseline
regen, the green-suite-exit-1 flake fix (nine shellPayload tests fired REAL GitHub calls), the
sidebar persist-vs-recede contract documented in the components reference. ROADMAP holds one new
item (wire AuthBranding.replyTo into buildMagicLinkMessage). Release hygiene lesson banked: the
0.83.0 cut initially targeted a mid-merge main because a piped `git merge | tail -1` swallowed a
CONFLICT — the npm immutability guard caught it; see the shell-gate-hygiene memory. NEXT: no held
window; the ASC effort continues in its own repo (docs/STATUS.md there).

## Prior next action (2026-07-07, evening: the pass-2.1 harvest window LANDED on main)

**THE PASS-2.1 HARVEST PASS MERGED (c7b472f), holds unpublished under `## Unreleased`.** The
window: `adminAction` exempts `ActionFailure` returns from the required-audit check (security
review confirmed sound; the reject-before-mutate caveat is stated in the TSDoc, changelog,
reference, and guide), the esm-env `DEV` swap in both engine reads (the ROADMAP item consumed;
svelte-package's warning gone), `/ambient` gains `App.Locals.auditSink`, `deriveExcerpt` edge
tests, and the add-a-custom-admin-screen guide rewritten around the ASC club-admin section (the
harvest doc's items 1-4 all consumed). Gate at close: check 0/0 (1345 files), 3107 tests exit 0,
all four doc gates plus snippets and comments green, web-auth-security-reviewer clean, simplifier
no-changes. Recovery note: this pass began as a crashed-session agent; the recovery session
finished the snippet-gate failures the crash preempted and added the ambient/auditSink gap the
gate surfaced. No plan file existed (dispatched mid-ASC-session); this entry is the post-mortem.
NEXT: hold unpublished per the release doctrine; the ASC design-polish round consumes nothing new.
Watch: an ~80-minute suite hang under heavy parallel-agent load (browser project, chrome child at
16s CPU) cleared on a quiet rerun (106s green) — if it recurs, file a vitest browser-pool watch.

## Prior next action (2026-07-07: 0.82.0 SHIPPED; the ASC phase-2 build consumes it)

**0.82.0 PUBLISHED (2026-07-07, OIDC verified on the registry): the admin extension seams
window** — the `admin-fields` subpath, `OfficeList`, `adminAction` (+ the
`admin.action.audited`/`unaudited` log events), `adminNav` sections, and the per-request
`navFilter` dep (reachable through `CairnAdminDeps`). One minor, zero Consumers-must lines
(the whole window additive, the ports/chassis window having shipped in 0.81.0). The cut
surfaced and fixed two real CI defects (the cold-cache spellchecker-wasm mid-run reload;
the async-shellPayload teardown race in the navFilter tests) plus the drifted api-surface
snapshot. The consumer-needs-it trigger: the aksailingclub-org club-admin scaffold swaps
its stand-ins onto this surface (pass 2.1 Task 3, executing). Filed: the esm-env swap for
adminAction's dev flag (ROADMAP Later). The extended Fable day conducts; the ASC pass 2.1
plan and state live in aksailingclub-org (docs/plans/2026-07-07-pass-2-1-events-classes.md).

## Immediate next action (2026-07-06, updated: ports closeout consolidated, release next)

**THEME PORTS 1-3 COMPLETE AND VERIFIED (2026-07-06): AstroPaper (VERIFIED-PASS, 4
verifier-fix rounds), Foxi (VERIFIED-PASS, 2 rounds), and hugo-theme-gallery (VERIFIED-PASS,
3 rounds) all built, harvested, and gated on `main`, per
`docs/superpowers/plans/2026-07-05-theme-ports-1-3.md`.** Each port's own capability-test
verdict is written to `docs/internal/pre-beta-harvest.md`'s site-contract section with its
evidence: AstroPaper's pure theme-seam proof holds (empty component registry, every raw-HTML
device through existing seams, zero engine change); Foxi's composed-page/marketing-section
stress needed zero engine changes (every marketing route is a hard-coded page over the
chassis's own composition primitives, evidence against a first-class composed-page content
type for this shape of composition, though the ecxc directive-driven angle keeps the overall
question CANDIDATE); hugo-theme-gallery's media stress (justified grid + PhotoSwipe) and its
album-vs-Pages question both resolve with zero engine changes, at a real visible cost (no
field marks which of a page's three shapes it takes; a separate nested-URL gap and the
`ImageValue` intrinsic-dimensions gap both stay CANDIDATE, one port's evidence not being
grounds to promote). The chassis harvested four real, verified fixes across the three ports
(the sticky-footer flex cross-axis recipe, the `max-w-*`/`--spacing-*` Tailwind v4 collision
documented, the unlayered-margin cascade-layers bug fixed in all four chassis roots, and the
**themed-404 pattern — LANDED, `d8aa0f3`**: a root-level `+error.svelte` plus
`assets.not_found_handling: "none"`, now documented in the chassis README and adopted by the
showcase itself, its second proof point after Foxi), plus the remaining QUEUED-not-promoted
candidates (the code-card device, the sidebar-layout reverse order, the `.prose a` link-device
default pending a shape decision) held for a second theme's proof point. Full harvest detail:
`docs/internal/pre-beta-harvest.md`. Final gate, all bare exit codes: `npm run check` (0
errors, 0 warnings, 1335 files), `npm test` (288 files, 3075 tests, exit 0),
`check:chassis-boundary` (PASS, 9 documented seams, 4 chassis roots, no reach-ins),
`check:reference` (OK, all 11 subpaths), `check:reference:signatures` (OK, all 11 subpaths),
`check:docs` (OK, 105 files), `check:snippets` (OK, 137 blocks typechecked), `check:package`
(all subpaths green under node10/node16/bundler). Holds unpublished under `## Unreleased`.
**NEXT: the ports work is done; the release is next** (a deliberate, separate act per the
release-process doctrine, cutting the held `## Unreleased` window). The ontology restructure's
remaining vocabulary sweep (template->theme), the theme-building tutorial, and Starlight (the
Topo prototype) remain queued behind it.

**DOCS REWRITE: COMPLETE AND MERGED TO MAIN (2026-07-04).** The full tree per the IA, the
four-gate method proven at fleet scale, the gate lattice live (check:snippets new; the three
suspended gates re-enabled; monthly drift routine trig_015UPQostYVisXuExTHTH2vu), post-mortem
in the Stage-2 plan. Holds unpublished under ## Unreleased.

**PRE-BETA ENGINE PASS: COMPLETE AND MERGED (2026-07-04, bb30112).** All nine tasks: the
Address/Library vocabulary, the visible issue count (a11y-fixed at review), cheat-sheet undo
rows, fold-by-default, the showcase csrf fix, the log-field reconciliation, and rich-text
paste conversion (rehype-remark based, Google-Docs-span-aware). Docs riders applied
throughout; CHANGELOG under ## Unreleased; holds unpublished. NEXT: the template effort.

**NAMING RULING (Geoff, 2026-07-04, supersedes older names below): the template is WAYMARK
(the name Wayfinder is retired everywhere); the identity theme formerly called Waymark is
renamed THE CAIRN THEME (lowercase cairn, matching the project's casing). Inventory: cairn the
engine, Waymark the template, the cairn theme, Topo the docs shell. The rename sweep (docs,
the make-wayfinder-your-own.md filename, the theme dir, design docs, README, memory) runs as
the FIRST fold after the in-flight responsive workflow lands, to avoid racing its edits.
Published history stays as written.**

**THE WAYFINDER RULING (Geoff, 2026-07-04, locked): Wayfinder becomes the NEUTRAL scaffold;
the Waymark identity (Fraunces, warm stone, cairn-glyph rules, hanging pull-quotes, diamond
bullets) extracts into a THEME LAYER applied at cairn.pub — the living demo of making
Wayfinder your own, and the restyle recipe's worked example.** The craft stays in Wayfinder
(rhythm, tokens, the dark system, the reading surface); the persona moves. Design-review
fold order: (1) the five confirmed bugs (giant icon, light-CTA collapse, image aspect,
token clipping, banner props), (2) the neutral/Waymark split + cairn.pub theming, (3) the
should-fix craft items (column alignment, eyebrow dosage, the extensible cluster, home
composition — designed against the NEUTRAL default), (4) the cheap considers ride along.
Full findings in the design-review workflow journal (wf_003a12ef-bf3).

**cairn.pub NAV FINAL (Geoff, 2026-07-04): Waymark · Docs · Help · Blog + GitHub icon.
About is DISSOLVED: home IS the about page (the narrative); administrivia (maintainer, MIT,
production sites, security reporting, contact) lives in the footer
— the template is the get-started door, its page = neutral viewports, the one-CSS-file
reveal, guide + tutorial exits, scaffolder when it ships; AND a Waymark section in the home
narrative with the link (both, per Geoff). "Templates" catalogue item =
trigger-based, when a second template exists.**

**FAMILY-WIDE RESPONSIVE STANDARD (Geoff, 2026-07-05): the five-viewport bar
(320/390/768/1440/2560; composed at the extremes; the CI width matrix as the gate) binds
EVERY cairn-family artifact — Waymark, the cairn theme, all four ported themes, both site
rebuilds, cairn.pub, Topo. Each theme port's acceptance includes the five-viewport check
plus width-matrix baselines; the bar for a port is beating its ORIGINAL at 320 and 2560.
The standard's doc home: public-design-system.md gains its family-wide section as a rider
on the harvest pass.**

**THEME SLATE ADOPTED (Geoff, 2026-07-05): AstroPaper (blogging/minimal, port FIRST —
token-seam-only proof), Foxi (small business/card — the composed-page seam question),
hugo-theme-gallery (portfolio — media stress + the album-vs-Pages question feeding the
deferred gallery enabler), Starlight (docs — the port IS the Topo prototype: sidebar,
Pagefind, prev/next, TOC). All MIT, re-verified at port time as a hard acceptance item;
attribution headers + a credits note are part of each port's definition of done. Blowfish
verdict: plateauing; AstroWind carries the card language as blogging runner-up. Queued
behind the harvest pass; the homepage themes section lands with them.**

**THEME-PORT SLATE RESHAPED (Geoff, 2026-07-05): research round RUNNING for newly-popular
2025/26 themes — maximal contemporaneity over canon. Four category slots (gallery/portfolio,
small business, blogging, dedicated docs) x a design-language spread (card-heavy a la
Blowfish through minimal/typography-forward). MIT-or-compatible is a hard gate. Each port
tests a named capability (media, card composition, docs-shell/Topo overlap, minimal mode).
ARCHITECTURE CONSEQUENCE: the cairn.pub HOMEPAGE gains a THEMES SECTION when the ports land
(amends the committed architecture). Geoff picks from the researched slate.**

**THEME PORTS 1-3 AUTHORIZED (Geoff, 2026-07-05: "continue with a workflow"): AstroPaper
-> Foxi -> hugo-theme-gallery, SERIAL (each port's chassis harvest lands before the next
opens), per docs/superpowers/plans/2026-07-05-theme-ports-1-3.md. LAUNCHES when the
chassis restructure lands. Starlight stays a separate later effort (the Topo prototype).**

**ECXC DESIGN PASS QUEUED (Geoff, 2026-07-05): the four re-expression items get a
better-than-original design pass (not a revert) — per-device candidates, Geoff picks from
crops, verifier-gated, after the chassis restructure lands. The three plain losses ride
the restructure itself.**

**ONTOLOGY RATIFIED (Geoff, 2026-07-05): one core, N themes — Waymark becomes the
flagship blog theme over the extractable core; a theme = structure + skin; the
theme-building tutorial (building Waymark from the core) is the restructure's acceptance
test. Executes as one pass at the ports harvest. Detail: pre-beta-harvest.md + the
template-effort memory.**

**ECXC.SKI DEPLOYED AND VERIFIED (2026-07-05, the second attempt, done right): the chrome
repair rebuilt the club's design on the salvaged scaffold (audit-from-references -> build ->
11 parallel page verifiers -> the passage/callout card-chrome fix -> typo + sticky-footer
fixes), I read all eleven page renders MYSELF against the references before the deploy, the
merge took the rebuild tree with proper ancestry (no force), the deploy was watched on its
exact sha (a stale "green" nearly fooled the watcher minutes earlier), and production was
crawl-verified + RENDER-READ after. Both sites now live on the rebuild architecture.
CARRIED: Geoff's CrewLAB placeholder sentence; his own look at both sites; the live
magic-link admin smokes; the wrangler-dev Rolldown crash (ledger). Research running on
better UI/visual processes + Fable-specific levers (Geoff's ask after the two visual
misses).**

**HARVEST PASS 1 COMPLETE (2026-07-05): all six tasks green, and everything landed
ADDITIVE — the rehype/remark plugin seam on createRenderer, tableScroll default-on with
opt-out, sitemap extraRoutes + the unlistedRoutes check, CairnHead titleTemplate, the
prose-flow computed-margin regression test. The Consumers-must list is EMPTY. 907's
migration verified (one real defect found+fixed: route-module export rule fails only at
build). ecxc's migration folds into the chrome repair instead. Ledger entries flipped to
LANDED with hashes. Pushed silent; CI baseline regen running; contract beat 2 waits on the
ports' evidence, then the release Geoff ordered before aksailingclub.**

**ECXC PRODUCTION FAILURE + ROLLBACK (2026-07-05): Geoff's verdict on the deployed rebuild
— "so far off the mark I'm not even sure where to begin." The old site is RESTORED and
verified live (8c77bbc; the first revert left 22 leftover rebuild files, purged; tree
byte-identical to pre-rebuild, built and screenshot-read before push). Root causes, in
order: (1) the rebuild plan was authored from a VERBAL inventory without ever looking at
the site — ecxc is a card-based photo-forward club landing page, not a blog, and no theme
layer over the blog scaffold could reach it; (2) the "flexibility test" framing rewarded
zero chrome edits, inverting the fidelity bar, and "no template findings" was the failure
signature misread as success; (3) ZERO visual review before "deploy both" — crawls and
greps, no rendered page read by anyone with judgment. THE ONE-CHECK RULE is now doctrine in
CLAUDE.md: nothing deploys without a full-page render read by the main loop, member-facing
sites get Geoff's before/after, and no design plan is authored without looking at the real
site. The ledger's "flexibility PROVEN" claim is corrected (tokens transfer color/faces,
NOT structure). 907.life re-verified by eye post-hoc: passes. The ecxc rebuild returns to
the shop: structure-level design comparison first, the club's chrome rebuilt on the
scaffold, before/after to Geoff before any redeploy. rebuild-waymark-2 holds the salvage
(adapter, content, components, redirects all sound — the chrome is what's missing).**

**HANDBOOK.AKSAILINGCLUB.ORG QUEUED (Geoff, 2026-07-05): the club's handbook site moves
to cairn — filed adjacent to the aksailingclub effort. A handbook is docs-shaped, so it
naturally consumes the Starlight-port/Topo learning; sequencing detail settles at the
aksailingclub brainstorm. (Fitting: this handbook's prose IS the voice corpus's
instructional exemplar.)**

**907 TYPOGRAPHY RULING (Geoff, 2026-07-05): RESTORE the Spectral + Karla pairing
(Spectral body, Karla display, Monaspace Neon mono; et-book retired). The polish pass
executes on it: the wordmark split per the audit's exact spec, article meta chrome (date/
tags/back-link) restored, link underline treatment, uppercase-letterspaced date stamps with
the long format, nav idiom, tag pills + hash prefixes, italic descriptions, footer labels,
the epoll flow-spacing bug diagnosed and fixed, blockquote dialed back to the old modest
scale, inline code at the old smaller ratio in Monaspace. Verification: side-by-side CROPS
per device (the polish standard), permalinks still exact, then ONE redeploy.**

**AKSAILINGCLUB.ORG PORT QUEUED (Geoff, 2026-07-05): the FINAL site effort before
go-live — the most complex, the highest bar (a real member base). Fidelity tier: GENTLE
REDESIGN — preserve basic layout, color, and fonts; the Blowfish card language is too heavy
for Geoff's taste and gets dialed down. The current site is the Blowfish-based prototype at
dev.aksailingclub.org (the reference to study). BEGINS WITH A BRAINSTORM (named human gate,
superpowers:brainstorming) when its turn arrives — after the ecxc redo, the 907 polish
pass, the harvest engine pass, and the theme ports. Note: this is Geoff's own club; the
voice corpus and editor handbook came from it — the editor experience will be judged by
the people the editor-first thesis was written for. PHASE 2 (separate effort, after the redesign):
the club's admin functions move into cairn — the first real production test of the
extending-developer seam at member scale.**

**907.LIFE DEPLOYED TO PRODUCTION (Geoff's go, 2026-07-05): the rebuild is live — 27/27
URLs verified at exact paths, toggle + archive composition rendering. Remaining human step:
the live admin smoke's magic-link click at 907.life/admin (Geoff, any time). ecxc deploy
still held pending the redo.**

**QUEUED BEHIND THE HARVEST PASS (Geoff, 2026-07-05): the THEME-PORT PROOF SET — two or
three famous themes re-expressed as cairn theme layers over Waymark (candidates: Casper the
image-led magazine, PaperMod the dense utility blog, a Bear-Blog-class radical minimum; MIT
license verified before any port, attribution preserved). Purpose: continue the flexibility
proof against foreign design philosophies on the upgraded seams; each port doubles as a
cairn.pub blog post and seeds the theme gallery (the Templates nav trigger).**

**QUEUED (Geoff, 2026-07-05): the REBUILD-HARVEST ENGINE PASS fires when the ecxc redo
lands — 907's findings 1-3 plus whatever the flexibility verdict top-ranks. Shape: (a) the
rehype seam on createRenderer (optional plugins param; two independent friction data
points), (b) table-scroll as a built-in default riding that seam with an opt-out (kills the
silent two-part contract), (c) the sitemap's extra-routes parameter + the unlisted-route
build check. Public surface -> reference riders; one pass folds both sites' lessons.**

**BOTH REBUILDS COMPLETE (2026-07-05, overnight). ecxc.ski: five tasks green on its
rebuild-waymark branch — crawl diff exact plus the two sanctioned redirects, 18 legacy
directives rationalized to 13 v2 components, the waiver's pre-existing 320px overflow found
and fixed (beat-live bar), 37/37 tests, deploy HELD. ONE DEVIATION FOR GEOFF'S RULING: the
workflow executed ecxc as an IN-PLACE v2 migration keeping its bespoke chrome, not the
plan's fresh-Waymark-scaffold + theme-layer architecture — the exit bars are met but the
theme-proof and scaffold-fidelity halves of the rebuild's purpose were skipped; accept, or
redo T1/T4 as true re-derivation. The consolidated template+component findings live in
ecxc-ski's docs/STATUS.md, ranked and tagged.**

**907.LIFE REBUILT (2026-07-05, overnight): all five tasks green on the rebuild-waymark
branch — permalink crawl diff exact on all 26 paths (and the rebuild fixes a live-site
tag-page self-redirect bug), responsive check caught and fixed a real 320px table blowout,
17/17 tests, the deploy HELD for Geoff. Template improvements landed at cairn-cms: the
manual theme toggle (note: the masthead now stacks at desktop as a side effect — flagged
for Geoff's eyes) and the table-scroll wiring lesson. ecxc.ski inventory running.**

**0.80.0 PUBLISHED (2026-07-05, OIDC verified on the registry): the docs tree, the engine
pass, the neutral Waymark split + cairn theme, the responsive hardening, the rename sweep —
one minor, no Consumers-must lines. CI all-green at the cut. NOW EXECUTING: the 907.life
rebuild (inventory -> plan -> build; production deploy HELD for Geoff's morning go).**

**OVERNIGHT RUN (2026-07-05, Geoff asleep ~8-9h, workflows authorized for all of it):
recovery push + CI baseline regen -> rename sweep -> release cut -> 907.life rebuild
(workflow: permalink inventory -> plan -> build, component-friction dimension standing) ->
ecxc.ski as far as the night allows. HELD GATE: production deploys of the two live sites
wait for Geoff's morning go; everything else runs. Ping on block or milestone.**

**LADDER RESEQUENCED (Geoff, 2026-07-05): the ecxc.ski and 907.life REBUILDS from the
Waymark template come BEFORE cairn.pub finalizes. Each rebuild iterates the template against
real-site challenges; the end state = two good sites + a substantially improved template;
cairn.pub Phase 1's build tasks (2-6) defer until after. Task 1 (the release cut) still runs
early — the sites consume from the registry too. Claude's interpretive read (correctable):
the rebuilds start HAND-COPIED from the template (the scaffolder doesn't ship yet), and the
hand-copy friction becomes the scaffolder's requirements — rebuilds inform the scaffolder,
not the reverse. Permalinks exact; live smokes per the ladder. Order (Claude's call): 907.life first,
then ecxc.ski — easy to hard, each inheriting the prior's template fixes. The improvement
loop explicitly includes the DEFAULT COMPONENT SET (Geoff): schemas, insert forms, and
renders hardened by real content; fixes land in the defaults, not per-site forks.**

**PHASE 1 IS AUTHORIZED TO RUN (Geoff, 2026-07-05: "start the cairn.pub Phase 1 build").
The chain executes unattended: table-semantics fix -> rename sweep -> Phase 1 tasks 1-6 per
the plan, including the Task-1 release cut (the consumer-needs-it trigger; OIDC publish).
Two human touchpoints remain, neither blocking launch: the live smoke's magic-link CLICK at
Task 6 (Geoff's inbox), and the editor walkthrough video URL whenever it exists.**

**cairn.pub ARCHITECTURE COMMITTED (spec 2026-07-04, adversarially reviewed, amendments
folded) and the PHASE-1 PLAN AUTHORED (plans/2026-07-04-cairn-pub-phase-1.md): release cut
-> repo reset -> routes -> engine item -> content (main-loop prose, all gated) -> deploy +
the owed live admin smoke. Executes after the responsive pass folds + the rename sweep.
Note: Task 1 IS the pre-beta-window release cut (the consumer-needs-it trigger).**

THE QUEUE (Geoff-approved 2026-07-04, both workflow opt-ins given): docs close (e2e fix
green + post-mortem + merge decision) -> the pre-beta engine pass (workflow) -> THE TEMPLATE
EFFORT (workflow): the five-lens Waymark design review with the banked evidence, findings
gate to Geoff, fold, then the reviewed Waymark deploys to cairn.pub as the living demo.
Topo out of scope until the docs need their hosted home.

QUEUED BEHIND THE DOCS CLOSE: the pre-beta engine pass
(`docs/superpowers/plans/2026-07-03-pre-beta-engine-pass.md`), Geoff-approved to run AS A
WORKFLOW as soon as the docs tree is polish-complete (tutorial gated, snippet gate green,
Task 7 ritual done). Nine tasks: editor vocabulary (Address, Library), the visible issue
count, cheat-sheet undo rows, fold-by-default, showcase csrf, the log code field, rich-text
paste conversion, pass close. Every task carries its docs rider. Fresh worktree off main;
serial through the gate; reviewer fan-out at close.

## Prior next action (2026-07-03)

The docs rewrite Stage 2 fan-out is executing on `docs-rewrite-1` (the proven four-gate
per-page pipeline; the editor arm is done and ratified). Task 1 (snippet gate) is dispatched;
Tasks 3-7 (tutorial, guides, explanation, reference, repo health) follow per
`docs/superpowers/plans/2026-07-01-docs-rewrite-stage-2.md`. Resume prompt: "Continue the
docs Stage 2 fan-out on the docs-rewrite-1 worktree; read the plan and the
cairn-docs-rewrite-initiative memory."

## Immediate next action (2026-07-02, LATEST): cairn.pub LIVE (vanilla Wayfinder); README polish loop with Geoff underway

**cairn.pub serves the vanilla Wayfinder scaffold** (repo `glw907/cairn-pub`, worker
`cairn-pub`, D1 `cairn-pub-auth`/`-app`, R2 `cairn-pub-media`, sender enabled, owner row
seeded, first standalone registry consumer of 0.79.0). Geoff's two actions: add `cairn-pub`
to the GitHub App installation (owner-only; save/publish blocked until then) and a live
sign-in test. The reviewed Waymark replaces this at ladder step 5. Scaffolder findings
(dev-wiring strip; self-documenting placeholder) filed in ROADMAP.

**The code polish pass is merged to `main`** (merge `0d72870`; plan + post-mortem at
`docs/superpowers/plans/2026-07-01-code-polish-pass.md`). The window: the idiom charter
(`docs/internal/code-idioms.md`, a standing pass dimension), the 61-agent adversarially-verified
sweep (content-routes 3,435→128 lines; knip 61→15; jscpd 86→64), the `check:consumers` root gate,
the admin-css content scope (shipped sheet −31%), the form-renderer merge's revert-and-record
(ROADMAP Later entry corrected; 23 guard tests banked), the two ruled surface changes (action
renames + editor-mutation log events), and the security review + simplifier backstop, all green.
Holds unpublished under `## Unreleased` with the pruning window.

**The pre-beta ladder (ROADMAP `## Now`) is the plan; steps 1-2 done.** `v0.79.0` is on the
registry as `latest` (release `f6523ee`; the pruning + polish window, two `Consumers must:`
sections; the rebuilds consume it at step 7). Step 3 runs in parallel: the docs rewrite Stage 2 (plan written; twelve outlines drafted,
adversarially reviewed, thirteen findings folded — `2026-07-02-docs-rewrite-outlines.md`; gate:
Geoff reads the front-door drafts) and the Waymark starter component set (list DECIDED by Geoff:
figure, gallery, video embed, pull quote, CTA, FAQ/details + existing callout/alert; converter
island replaced by a useful exemplar; the aksailingclub/Blowfish survey informing the plan is
in flight).

**Front-loaded and settled (2026-07-02):** the beta gate is DECIDED (all four rulings in ROADMAP);
cairn.pub REGISTERED (zone active); the rebuild-from-Waymark program supersedes the cutovers;
the retheme-lab evidence and the stress-fixture harness (`wayfinder-review-fixtures` branch) are
banked for the design review.

**Carried follow-ups (churn):**
- npm placeholder publish for unscoped `cairn-cms` — Geoff's interactive act, remind before beta.
- `CairnMediaLibrary` html self-duplication + component split (ROADMAP, deliberate deferrals).
- Awareness note: a no-op accepted editor mutation emits a success-shaped log event (matches
  action semantics; matters only if the log is read as a mutation counter).
- The `code-polish-1` worktree/branch pruned at this roll.
