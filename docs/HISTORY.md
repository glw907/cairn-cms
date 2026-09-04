# cairn-cms history

The per-pass ledger for the cairn-cms engine, newest first. `docs/STATUS.md` holds only the
current state; a finished pass's detail moves here per the ledger rule (`~/.claude/CLAUDE.md`,
"Project ledgers"). Each entry condenses to what a later pass needs: what landed, what a gate
caught, and what would be wrong to rediscover. Read on demand, not at every session start.
Superseded `STATUS-archive-*.md` files under `docs/internal/history/` hold the pre-2026-08
detail this file only summarizes.

## 2026-09-04: internals-B pass complete (audit-remediation slice 6, four monolith splits)

Plan and post-mortem: `docs/superpowers/plans/2026-09-03-internals-b-pass.md` (worktree
`internals-b`, off `main` at `c95ff02d`). All fourteen tasks across five independent chains
landed through the implementer/diff-reviewer/gate chain: `content-routes-core.ts` retired
into five siblings behind the unchanged `content-routes.ts` composition root;
`audit/rendered.ts` became a directory barrel; `CairnMediaLibrary.svelte` shed five dialogs
into their own components; `EditPage.svelte` collapsed its 13 `EditorApi` holders onto one
identity-guarded `editor` grant (`registerEditor` now delivers `null` on destroy) and shed
`ShareLinkPanel`, `DetailsPanel`, and three `.svelte.ts` controllers; `FieldInput`'s
`ownership_invalid_mutation` warning is fixed; and `cairn-media-seed`'s read and write
containment now resolves symlinks and validates before any fetch. Final state: `npm run
check` 0/0, 374 files / 4,927 tests plus 78 files / 1,354 component tests exit 0, every
CI-only gate green by name.

What the gate caught: the five-reviewer fan-out (svelte, daisyui-a11y, cloudflare-workers,
web-auth-security, cleanliness) found no blocking architectural defect, but did find four
blocking a11y items in the extracted media dialogs (a live region mounting together with
its first content instead of present-and-empty, focus dropped on a step flip, a tabbable
invisible file input), a comment-accuracy defect class in the split's own headers (a
re-export block claiming an importer that did not exist, a doc describing the wrong
function, a stale enumeration), and a write-before-validate ordering bug in `media-seed`.
All folded into three fixer commits; a fresh-context Opus `diff-reviewer` re-read all three
against their source findings and accepted every one. The diff review's own non-blocking
list, routed forward rather than fixed in this pass: the reset-coverage test's
declared-state regex misses a generic-comma type annotation, `ShareLinkPanel`'s
`aria-disabled` busy idiom now contradicts `EditPage`'s own native-`disabled` rule, and
`content-routes-entry.ts` is the one sibling still doing two jobs at 1,631 lines.

What a later pass would be wrong to rediscover: a pass-end fix round with more than one
parallel writer needs its own worktree per writer, never one shared worktree between
them; two of this pass's three fixers ran `git stash` in the same worktree and transiently
clobbered each other's uncommitted work before either committed (both recovered).
`content-routes-media.ts` at 1,447 lines is now the one remaining tracked monolith. The
`registerEditor` identity-guarded revocation rests on Svelte memoizing a call expression in
prop position (`register={bindEditorGrant()}` compiles to one `$.derived` per mount, so
`onMount` and `onDestroy` see the same closure); that assumption is now pinned by a re-key
harness test (`MarkdownEditor.test.ts`), not left resting on a comment alone. Budget:
ceiling 8M; spend unrecorded, since the session running the final fixer and gate sweep was
killed mid-ritual by a CLI update before a spend figure was captured. Interaction points:
two (the combined plan-approval question, 2026-09-03 evening; the resume instruction after
the CLI-update kill).

## 2026-09-03: internals pass complete (audit-remediation slice), branch pushed for PR

Plan and post-mortem: `docs/superpowers/plans/2026-09-01-internals-pass.md` (worktree
`internals`, off `main` at `a5352f0b`). All thirteen tasks landed through the
implementer/diff-reviewer/gate chain: the standing gates (`check:self-use`, the F-1
leak-class rider on `check:surface`, the `staleNames` per-subpath rescope, the
`check:editor-quotes` tripwire and vale reconciliation), the `MarkdownEditor` seam
collapse onto one `registerEditor(api)` prop and its `EditorApi`, the `list-role`/
`panel-width` audit-rule re-groundings, the indexed-access reference convention, the
`CAIRN_DEV_BACKEND` refuse-on-set-AND-non-local tripwire, the access-semantics
two-posture documentation, the `SITE_CONFIG_PATH` engine-owned data-file convention,
the six stale module-header fixes, the `previewRevoke` export half, and Task 13's
destroyed-row liveness plus the `formatTimestamp` two-shape contract. Final state:
`npm run check` 0/0, `npm test` exit 0, every CI-only gate green by name, and a
from-scratch showcase install/build/e2e (155 Playwright tests) exit 0. The close also
landed the browser test gate under an 8G MemoryMax systemd scope (`30cf36a3`,
`scripts/test/contained.mjs`, direct-spawn fallback where no user manager exists); the
browser-recycling investigation measured one recycled Chromium across all 78 component
files with summed RSS plateauing near 3.6G, so no vitest config change was needed.

What the gate caught: `check:snippets` found three problems in the access-model docs,
fixed in the same pass (`7604e2b3`). The five-reviewer fan-out (svelte, daisyui-a11y,
web-auth-security, cloudflare-workers, plus the standing cleanliness lens) produced a
three-round fix fold: round A reworked the `CAIRN_DEV_BACKEND` tripwire against the
security findings (a fail-open cache-latch bug, a dual env-source read, a
`PUBLIC_ORIGIN`-first locality discriminator through a new shared `isDeployedHost`);
round B folded 21 items across the audit rules, gate coherence, and the `EditorApi`
surface; round C answered an independent verifier's escalation, a regression in the
`existsSync` pre-filter that a green gate run had missed, fixed with a source-file
discriminator in both the gate and its test.

What a later pass would be wrong to rediscover: the dev-backend tripwire's threat
model is Host-header spoofability off Cloudflare, which is why `PUBLIC_ORIGIN`-first
locality is the fix, the same shape `csrfSecure` already used; the F-1 leak rider's
`/components` skip rests on the premise that the subpath's exports are structurally
enumerable elsewhere, and that premise now has its own resolution recorded in the
rider's own comments rather than left implicit; a type-only barrel re-export of a
DYNAMIC_ONLY editor module trips `editor-boundary.test.ts` unless the test exempts
`export type`/`import type` forms. Budget: ceiling 6.5M; chunk one's checkpoint
estimated 1.5-2M, chunks two and three ran unmetered, and the close session's
subagent spend alone sums to roughly 2.5M, landing an estimated 5-5.5M total under
ceiling with the metering gap itself recorded as a process defect. Interaction
points: plan approval plus the `CAIRN_DEV_BACKEND` letter-amendment confirmation (one
combined event); a deliberate reboot pause; zero questions during the close session's
fully autonomous review fold.

## 2026-09-02: conformance pass merged (audit-remediation slice 4b), PR #46, CI green

Plan and post-mortem: `docs/superpowers/plans/2026-09-01-conformance-pass.md` (worktree
`conformance`, merged at `12330d71`). All fourteen tasks landed through the
implementer/diff-reviewer/gate chain: the 26 Tier 1 retires, alias prunes, the CairnHistory
reshapes, `TidyClient` narrowed, `previewMint` made safe (Opus), the `ReproContext`
`mediaBase` prop, `ctx.attr()`, the `normalizeAssets` hoist, the OfficeList-onto-PageHeader
collapse, the StatusChip badge tiers, the ten log-event evenness fixes (Opus), the two
audit-rule repairs, the five `rendered.*` renames, and the `variants` retirement on
five-repo sweep evidence. A mid-pass power loss killed the original workflow during Task
11; the fresh session salvaged the warm uncommitted tree by dispatching the same task with
take-over instructions, and the salvage held (the reviewer verified every step of the
partial work). Final state: `npm run check` 0/0, 6075 tests exit 0, every CI-only gate
green by name, PR CI fully green including the from-scratch consumer e2e.

What the reviews caught: Task 12's chroma repair overclaimed (the corpus had two
false-positive mechanisms and the chroma term closes only the hue class; the conductor
ruled the ratified 1.5 floor untouched and every claim scoped to the truth, with the
residual as a failing-test tripwire). The five-reviewer fan-out plus the Opus beauty lens
produced a 25-item fix round: verdict provenance stripped from four reference pages (a new
scar-tissue class this pass almost introduced), the one-chokepoint `preview.token.minted`
emit moved into `previewMint`, auth-before-origin restored at the action, `resolveSalt`
made read-first (no cold-isolate write on teardown), the "expired row leaves no record"
overclaim softened (ruled: no expiry predicate on the DELETEs), and eight missing
migration-notes entries landed. The a11y lens proved `badge-soft` sits under both of
`chip-ground-collision`'s own floors (documented as a deliberate boundary-less exemption)
and that the chroma term is CVD-blind (recorded; the CVD term rides the filed floor
recalibration).

What a later pass would be wrong to rediscover: the ratified `outcome`-discriminant
grammar is KEBAB-case (snake_case governs log-record `reason`/`scope` fields only; a
conductor ruling to the contrary was refused with evidence and the refusal upheld). A
vitest helper imported from another `*.test.ts` re-executes that file's whole suite under
the importer (extract to a plain module). Deleting archaeology from a component doc block
can silently drop a class from the compiled admin sheet (`gap-0` compiled only via prose;
the sheet-inventory test is the net). The whole-log friction triage (now a standing ritual
step) found twelve queued entries already shipped and one genuinely stranded
(toolkit-seams' `isUniqueViolation` defer was never ledgered). Local Vale 3.19.0 finds 16
real `Google.EmDash` errors CI's 3.15.1 misses; the internals pass fixes the pages and
records CI-as-arbiter. Budget: ceiling 6M; the crashed session's exact ledger is lost
(checkpoints show tasks 1-10 within pace), and the resumed session spent ~3.3M on 4b
chains, ritual, reviews, and fix rounds, so the pass ran at or slightly over ceiling with
the overrun in the five-lens ritual plus crash recovery, not the chains. Interaction
points: zero blocking questions to Geoff; five Geoff-initiated directives folded mid-pass
(the polish slice, the chassis mandate and its two consequences, the pre-merge internals
review, the friction-triage ritual step).

## 2026-09-01: conventions pass merged (audit-remediation slice 4a), PR #43, CI green

Plan and post-mortem: `docs/superpowers/plans/2026-08-30-conventions-pass.md` (worktree
`conventions`, merged at `bc960fec`). All eleven tasks plus two doc residuals landed through
the implementer/diff-reviewer/gate chain in workflow mode, three sequential chunks: the
sitting's rulings written into the ledger, bags and contracts, verb renames, the outcome
idiom, the `ContentFormFailure` flatten, cookie posture, the login nonce and adminAction
authorization (both Opus-implemented), the channel fold, coupled pairs, doctor, and bins.
Final state: `npm run check` 0/0, 6017 tests exit 0, every CI-only gate green by name, and
the from-scratch consumer proof (fresh showcase install, build, 155 Playwright e2e under
CI=1) green. Budget: ~6.9M against the 7M ceiling Geoff raised from 5.5M mid-pass (the
overrun ruled review rigor, not waste); two scope grants, three ratifications, zero
corrections of landed work.

What the reviews caught: per-task Opus diff review found real defects in five of eleven
tasks (doc staleness twice, the dev-double SQL dispatch, a tautological register test, an
unrunnable CI example plus an incomplete exit matrix). The pass-end fresh-context fan-out
caught four findings no earlier layer saw: the absent-cookie short-circuit voiding the
`nonce_hash IS NULL` compat path (a shipping blocker refusing scaffold bootstrap, in-flight
upgrade links, and recovery rows); the rethrow-guard narrowing (a site limiter throwing
redirect/error degraded to open); the throttle/nonce login lockout (attacker rebinding plus
cooldown denies the only sign-in channel), resolved by Geoff as rebind-no-email
(last-requester-wins binding, unbound rows skipped so the hand-seeded recovery escape hatch
survives, `auth.token.rebound` records the rebind); and the pending-cookie TTL coincidence
(ordinary timeout misdiagnosed as wrong-browser, invisible to the Map-jar harness).

What a later pass would be wrong to rediscover: workflow suspend recovery is
verify-not-redo (journal cache makes stop-plus-resume near-free), and a stall guard must
watch the whole transcript dir, not `journal.jsonl` (the journal writes only at agent
boundaries). The integration cookie jar has no expiry semantics, so real-cookie timing
interactions ship green (ROADMAP: test-harness fidelity). `resolveRateLimit` is
kit-agnostic by design: redirect/HttpError rethrow lives at call sites. The
migration-adoption instruction is plain `wrangler d1 migrations apply` (idempotent DDL
makes re-apply the safe path), and an unbound token row is scanner-confirmable by design
(its pre-migration semantics; the scaffold depends on it). Local `check:vale` reports 18
errors in three docs main's CI passes; reconcile before trusting local vale as a gate.
`Outcome`-suffixed result-union names are accepted (results, not failure shapes; the
`Failure`-suffix ruling is not implicated).

## 2026-08-30: retires pass merged (audit-remediation slice 3), PR #42, CI green

Plan and post-mortem: `docs/superpowers/plans/2026-08-30-retires-pass.md` (worktree
`retires`, ten commits, merged at `d2c434ea`). The 56 ratified retires executed: 38
unsanctioned in three family batches plus 18 F-1 sanctioned leaks with the move record
(`docs/internal/record/2026-08-30-retires-move-record.md`), a compile-only fixture proving
every replacement expression, all 7 format-allowlist repairs (40 to 33), the four ledger
annotations, and the `f1-return-position-leak-sanction` standing-rule entry. Surface diff
against the branch point: 58 export rows removed, 0 added, 0 modified (53 names; 3 closes
were process proposals with no symbol). Ledger partition verified 2 + 56 + 36 = 94;
list (c)'s 36 (25/7/1/3 tiers) and `DEFAULT_ROLES` untouched. Budget: ~4.6M subagent spend
against the 4.5M ceiling; zero questions to Geoff mid-pass.

What the reviews caught: two shipped `skills/` pages still teaching deleted components
(the plan's drift-hunt scope omitted `skills/`, which ships in the npm tarball; the scope
now includes it); a repointed test gone tautological (fixed with an aggregate
reverse-containment test); the plan's pre-written `AdvisoryAction` replacement did not
compile (optional member; corrected with `NonNullable<...>`); the plan's "expected 20"
leak count contradicted its own predicate (actual: 17 rendered strict, 18 type graph, 19
and 20 including the un-verdicted `DictionaryAddFailure`/`TidyFailure`); and the
CHANGELOG's `devDelivery` migration snippet shipped ungated, which would have logged
production OTPs to Workers Logs for any site copying it (xcathletes will follow that
line) — replaced with the in-body-refusal form and pinned executable by a new showcase
spec.

What a later pass would be wrong to rediscover: the move record is the internals pass's
rider brief and now states its own limits — the predicate is subpath-blind
(`NavIcon`/`EngineScreenId` carry their own `/sveltekit` export rows and need a
per-subpath clause; only `SlotKind` is absent-everywhere), the
`RemoveIndex`/`ValueOf`/`StandardResult` vs `DictionaryAddFailure`/`TidyFailure` split is
inherited rather than derived, and "retire-verdicted" deliberately narrows F-1's
"retire-or-absent" wording. `buildSurfaceModel()` expands shapes one hop only, so a
rendered-text derivation misses `AdvisoryAction`; the rider must derive against the type
checker. Local `check:vale` red (18 errors, three files untouched since the branch point)
was Vale version drift, not a regression; CI's pinned Vale is the arbiter. Two small
follow-ups: a reference-page convention for naming the indexed-access form beside shapes
that print un-importable members (18 sites), and the per-story `has a matching manifest
entry` assertion in `reproductions-stories.test.ts` is vacuous now that the aggregate
test carries the guarantee.

## 2026-08-30: foundations B pass closed on its worktree (audit-remediation slice 2b), awaiting Geoff's ratification and merge

Plan and post-mortem: `docs/superpowers/plans/2026-08-28-foundations-b-pass.md` (worktree
`.claude/worktrees/foundations-b`, pushed, ten commits `e743f624..014872b2`). T1 narrowed the
public `createContentRoutes` declared return to a 25-member `Pick`-derived `ContentRoutes`
(ten media-janitorial members internal-only; unexported-from-barrels
`createContentRoutesInternal` keeps the wide shape for the composer; compile-only hand-mount
fixture; `audit-sveltekit-contentroutes` closed, no retire consumed). T2 wrote the R4
re-derivation record (`docs/internal/record/2026-08-30-r4-rederivation.md`): partition
0 + 63 + 31 = 94 exact, `DEFAULT_ROLES` the OUT-OF-94 exclusion; one fix cycle on fabricated
type-composition citations. T3 swept the ten names' drift across the reference arms (real
drift found and fixed in three files; the gates structurally cannot see prose drift). All
eleven gates green; branch pushed for the CI consumer-build proof. Budget overrun recorded
honestly: ~2.3M subagent spend against a 1.8M ceiling, the conductor missing the trajectory
at the Task 3 checkpoint.

What the reviews caught: the Task 2 record quoted a fabricated eight-arm `ContentFormFailure`
composition (the real one is eleven arms at `content-routes.ts:97-99`), caught only because
the diff reviewer re-derived instead of reading; the new fixture wired a `listDelete` action
name no engine component posts (the svelte-reviewer's W1). The pass-end `engine-triage`
dispatch produced F-1: 19 of list (b)'s 63 retires are named inside keep-verdicted exports'
rendered shapes (`EditData`/`AdminData` family), so executing list (b) as written
manufactures 19 closure leaks of the `NavIcon` class; the record now carries the 19-row
keep-parent table and a neutral A/B resolution awaiting Geoff at the ratification gate.

What a later pass would be wrong to rediscover: `check-surface.mjs` renders a callable's
declared NAMED return collapsed to the alias name (`CALLABLE_FLAGS` omits `InTypeAlias`), so
narrowing proofs live on the alias's own snapshot entry, not the factory line. The narrowing
is type-level only: the wrapper returns the wide runtime object, so a spread still mounts all
35 actions and the withdrawn thing is the supported seam, not reachability. Only the
keep-parent formulation (a retire-verdicted name inside a keep-verdicted export's rendered
shape) finds all 19 F-1 rows; fixed points from `createCairnAdmin`'s line miss two
(`ReproInstance`, `AdminActionOptions`, the latter an argument-position leak). No compile in
the repo exercises the hand-mount path against generated `./$types` (carried follow-up).

## 2026-08-29: foundations A pass closed on its worktree (audit-remediation slice 2a), awaiting merge

Plan and post-mortem: `docs/superpowers/plans/2026-08-28-foundations-a-pass.md`. Three tasks on
worktree `.claude/worktrees/foundations-a`, gates green, per-task diffs accepted, pass-end
`engine-triage` verdict "holds" on all three artifacts. T1 repaired 14 truncated ledger shapes
and landed `check:rulings-format` (`632cca35`). T2 ratified R-0 (an unused-but-usable export is
a shape defect until argued otherwise) and executed R-1 (canonical home follows the publishing
barrel), moving 18 duplicate publications and recording 120 R4-justified re-exports under a new
`check:surface` canonical-home rule, including a gated `--update` path and a checked `home`
field (`a7f9510a`). T3 swept for residual moved-name drift (zero hits) and removed 14 stale
rows from `docs/reference/delivery-data.md` (`b065ea51`). Budget: ~1.6M of a 2M ceiling.

What the gates caught: the diff review on T2 found `MediaResolve`'s canonical home mislabeled
as `/media` instead of `.` across three docs (ledger, move-set record, reference page), fixed
in one cycle (`35dea8b0`). `check:consumers` failed in the recovered worktree on the known
worktree showcase symlink collision (`examples/showcase/node_modules` resolving to `main`'s
build), an environmental failure repaired with a from-scratch `npm ci`, not a code defect.

What a later pass would be wrong to rediscover: a green `check:surface` proves a duplicate
publication is RECORDED, never that its `Why it survives` justification still holds; appending
a record entry launders any duplicate green, so a later slice re-deriving the R4 closure must
not read the gate as evidence. The audit's literal R-1 ask (fail on any name published from two
or more subpaths) shipped as fail-unless-recorded, not fail: the surface still carries 122
multi-subpath names after this pass, the same count as before it, with only
publications-per-name falling; this is a deliberate, documented divergence; foundations B's
list (b) is measured against it, not against a false "audit ask satisfied" reading. The
reference-coverage gate's `staleNames` check is union-over-all-subpaths, not per-subpath, so a
reference page can list a name its own subpath does not export as long as some other subpath
exports it anywhere; this is exactly how the 14 dead `delivery-data.md` rows survived
undetected, and B should scope it per-subpath before `/sveltekit` narrows to ~30 leaves.
Crash-recovery pattern: when a session dies mid-pass, triage-assess the warm uncommitted tree
against the gate before re-dispatching from scratch; Task 2 here was substantively complete and
needed only one fix cycle, not a redo.

## 2026-08-30: csrf-hardening pass merged (remediation slice 1)

Plan and post-mortem: `docs/superpowers/plans/2026-08-27-csrf-hardening-pass.md`. Merged via
PR #40, all checks green, holding unpublished. Four tasks (Lax cookie with re-anchored
Max-Age and one `csrfSecure` derivation; the unreadable failure paths; the
detail/witness/hasSession rejection discriminator; ledger hygiene) plus a pass-end security
review that caught a blocking defect no per-task review could see. Budget: ~2.1M against a
1.8M ceiling, the overrun accepted to land that fix.

What a later pass would be wrong to rediscover: `csrfSecure` must stay MONOTONIC (an https
request always mints Secure/`__Host-`; `PUBLIC_ORIGIN` can only raise, never lower) because a
leftover dev `http://localhost:8788` in `PUBLIC_ORIGIN` passes `requireOrigin` and would
otherwise strip the prefix that is the sole sibling-subdomain defense under Lax. The CSRF
token rotates once at successful login, a ruled deviation from the plan's no-rotate line: the
no-rotation posture made the token permanent per browser, and the one honest cost (an
already-signed-in browser re-authenticating 403s another tab's form once, self-healing) is
stated in the code comment and security-model.md. SvelteKit's `cookies.delete` defaults
Secure over non-localhost http, so a delete must pass its setter's `secure` flag or the
browser discards it. `platform` is required-but-nullable on the CSRF helpers so omission is a
compile error; `CookieJar.delete` widened publicly to carry `secure` (bivariant, non-breaking,
changelog carries it). The live smoke's stale-cookie check works and is the template for
diagnosing consumer 403s: `guard.rejected` with `detail`/`witness`/`hasSession` and never
token material.

## 2026-08-29: harvest-detection pass merged; main's CI red healed

Plan and post-mortem: `docs/superpowers/plans/2026-08-26-harvest-detection-pass.md`. Merged as
`445e350f` (PR #39), holding unpublished. Six tasks: the `config.no-referrer-blanket` doctor
check, `sheet` as a source list, four audit rules (stripe/trim parity, unlayered font clobber,
`list-role` with in-tree `role="list"` adoption, `panel-width` with the new `row-expanded`
rendered state), showcase smooth-scroll with router-scroll exclusion, and the two admin
recipes. The pass-end domain reviews drove four fix rounds; the deflake of the scaffolder
grace-window tests and the healing of main's inherited CI red (stale visual baselines and
norms manifest from the toolkit-seams merge, regenerated at `3a5e2f3b`/`268c315e`) rode the
same close.

What a later pass would be wrong to rediscover: `no-referrer` scoped onto an
`originMatches`-guarded route 403s its own POSTs (`Origin: null`), so the remedy for
origin-guarded routes is `same-origin`; only the admin's double-submit routes tolerate
`no-referrer` (ledger: `originmatches-strict-guard`). `panel-width` measures nothing at rest
for panels (the `row-expanded` state exists for exactly this) and cannot see a closed
`<select>`'s clipped value (`scrollWidth` never grows; painted-width follow-up filed).
`list-role` covers own-class triggers only; DaisyUI's descendant-selector styling
(`.menu :where(li)`) leaves nine engine lists outside it (inventory in the friction log,
routed to the remediation initiative). `html { scroll-behavior: smooth }` animates Kit's own
`scrollTo` after every navigation; the chassis excludes router scrolls via a
`beforeNavigate`/`afterNavigate` class toggle, with `navigation.complete.catch` covering
cancelled navigations (`onNavigate` cleanup never fires on an aborted nav). Node `setTimeout`
can fire sub-millisecond early at small scales, so wall-clock grace-window assertions flake on
CI; the deflaked tests use `node:test` mock timers. A stale local showcase install (the npm
`file:`-dep cache trap) masks norms drift: regenerate the manifest only from a clean
`npm ci --prefix examples/showcase`. Baselines regenerate via
`gh workflow run e2e.yml --ref main -f update_snapshots=true`, which commits the result.

## 2026-08-27: toolkit-seams pass merged

Plan and post-mortem: `docs/superpowers/plans/2026-08-26-toolkit-seams-pass.md`. Six ASC-harvest
behavior absorptions (media picker seam, ExpandableRow inert-cell escape, ToolbarDisclosure,
CsrfField hardening, StatusChip three-register grammar with tone/dot retired, admin sheet
contrast fixes), holding unpublished. What a later pass would be wrong to rediscover: the
CsrfField "reset blanks the token" defect is spec-impossible for hidden inputs (value setter IS
the default-value setter); daisyUI `.list` does NOT suppress list markers (its baggage is
flex-column plus forced .875rem type); daisyUI `.menu`'s display rule beats the UA `[hidden]`
rule, so hiding needs an explicit scoped rule; the e2e visual suite renders no chip-bearing
surface (blind to chip changes, friction-logged); the facet-chrome contrast deferral's real
numbers are 1.192/1.203 (earlier 1.50/1.75 figures were measured without the Svelte scope
class); and the strongest CSRF-403 candidate is the confirm-load `SameSite=Strict` re-mint,
not the header path. `isUniqueViolation` deferred with reopen triggers in the ledger.

## 2026-08-26: engine-consultation pass closed

Plan and post-mortem: `docs/superpowers/plans/2026-08-26-engine-consultation-pass.md`; spec
`docs/superpowers/specs/2026-08-26-engine-consultation-design.md`. Landed on `main` directly
(docs and Claude infrastructure only). Shipped the consultation protocol: the
`engine-consult` skill, the `engine-triage` agent, both pass-skill hooks (cold-start tested
with a negative control), the rulings ledger, the consultations arm, and both CLAUDE.md
edits. Ran both audits under Geoff's thoroughness ruling: the whole-surface any-site audit
(535 items, 384 keep / 57 reshape / 94 retire, trustworthy on run 2 after its own auditor
condemned run 1 for a conductor script bug) and the mid-pass-directed internals+chassis
audit (175 findings, 10 rewrite-tier, trustworthy; the FieldDescriptor exhaustiveness gap
proven by a live mutation experiment). Re-reviewed both held absorption plans against the
rulings; verdicts appended in each plan file.

What a later pass would be wrong to rediscover: the five conductor adjudications over
recorded verification dissent are in the audit record's "merge repair" section, argued, not
just tallied; the R4 export closure is over-applied and its re-derivation (with the
`ContentRoutes` narrowing) re-tests adapter's ~22 C2_READDED keeps; the admin-toolkit field
tier retired because the shipped sheet's class inventory is a de facto public API
(`admin-css-safelist.ts:104`), the same ground that keeps `FieldLabel`; workflow subagent
file writes with `/`-carrying names create nested directories (four verify files landed
under mangled paths and were normalized into the record dir); and a condemned workflow run
resumes from cache, so fix-and-resume costs only the re-run agents, never the fleet.

## 2026-08-22: newest-toolchain pass merged

Plan and post-mortem: `docs/superpowers/plans/2026-08-21-newest-toolchain-before-beta.md`.
Worktree `newest-toolchain` off `main` at `13726d57`, merged as `d2972d11`. Pushed every floor
to current: Node `>=24`, `@sveltejs/kit ^2.70`, `svelte ^5.56.10`, DaisyUI 5.7.20, Tailwind
4.3.3, Wrangler 4.125.0, Vite 8.2.2, ESLint 10, `@anthropic-ai/sdk` 0.120 (peer widened to
`>=0.105.0 <1`), `actions/checkout`/`setup-node` v7, `compatibility_date` `2026-08-21`. Shipped
the admin upgrade map (`docs/admin/what-to-run-and-when.md` + `check:target-stack`), an advisory
weekly `check:tsgo` job, Cloudflare Images' `aspect-crop`/`scale-up`/`upscale` fit modes, and
moved Tidy's default model to `claude-sonnet-5` at `effort: low`.

Scope grew from 7 planned tasks to 16 plus roughly a dozen pass-end folds (~7.5M subagent
tokens against a 1.5M ceiling raised twice, to 3M then 4.5M); every addition traced to a real
Geoff ruling, but the lesson banked is to split at the chain-2 boundary next time a ruling adds
genuinely new surface mid-pass. `secrets.required` for the GitHub App key was tried and
withdrawn at review (wrangler 4.125 filters `.dev.vars` once a `secrets` block exists, and a
first deploy of a not-yet-existing Worker throws on an unset required secret); the redesign
brief is in `ROADMAP.md` Next, "Declare required Worker secrets without breaking local dev."
`check:transcripts` and `check:symbols` both caught locally-green work; the `cairn-pass`
ritual's CI-only gate list grew from four to six. A weekly rate-limit outage cost roughly 8
hours of wall clock and one duplicated dispatch; a stall guard now runs on every large single
dispatch, not only workflow-mode runs. Full evidence, every falsifiability proof, and the
decisions locked in are in the plan's own post-mortem section.

## 2026-08-21: dependency upgrade landed, e2e baselines regenerated

Three commits (`9b30e756`, `d633ad5f`, `8c9de10f`) took DaisyUI 5.7.20, Tailwind 4.3.3,
SvelteKit 2.70.3, Svelte 5.56.10, Vite 8.2.2, Wrangler 4.125, ESLint 10,
`@cloudflare/workers-types` 5, and `@cloudflare/vitest-pool-workers` 0.22. All local gates and
the `test`/`scaffold`/`design`/`create-site` workflows went green; `e2e` was red only on visual
baselines, an upstream DaisyUI `.alert` grid improvement rather than a regression. The
regeneration dispatch lost a push race to a STATUS handoff commit; the re-dispatch landed
baselines as `25dae7ad`, and `e2e.yml` now rebases before its bot push so the race cannot
recur. A `tsgo`-flagged implicit `any` in `check-snippets.mjs` was a JSDoc comment whose triple
backticks hid the `@param` from the Go compiler; reworded, not a real type gap.

## 2026-08-20: release `0.95.0` cut and published

`0.95.0` published on npm for both `@glw907/cairn-cms` and `@glw907/cairn-cms-dev`; GitHub
release `v0.95.0` cut against `main` at `e0033063`. All five CI workflows were green before the
tag.

Three things the cut decided, one it could not. **`create-cairn-site` held, never shipped**
(`npm view` still 404s): the GitHub App's "Only select repositories" mode strands a first run,
and recovery needs a `delete_repo` permission a reader may not have; its cost-narrative plan is
drafted, not approved. **The dev backend's first OIDC publish 422'd** because
`packages/cairn-cms-dev/package.json` carried no `repository` field; fixed in `48961469`, now
asserted by `check:dev-package`, and the publish job gained an already-published guard so a
recovery run no longer dies on the half that already landed. **The `--strip-dev-backend` watch
fired and is discharged** (`ae839697`): `0.95.0` published the dev backend unstripped through
the release path, so the weekly drift compare stopped stripping. **What the cut could not do:**
the public template repo sync failed (`glw907/cairn-waymark-template` never existed,
`TEMPLATE_REPO_TOKEN` unset); Geoff ruled the fix instead of chasing the credential: the
template moved in-repo to `templates/waymark/`, emitted by `emit-template-dir.mjs` and gated by
`check:template`, and `sync-template.yml`, its `publish.yml` job, and `sync-template-repo.mjs`
are deleted.

What consumers owe on this window: five compile-time breaks (`SiteConfig` lost its index
signature; `AdminShellData.mediaBase` and `EditData.singular` are new required fields;
`DeleteDialog`/`RenameDialog` renamed `label` to `singular`) plus one operational fact, stated
plainly per Geoff's 2026-08-19 ruling: a cairn site runs on Cloudflare Workers Paid ($5/month)
from its first deploy.

Watches from this window: the SvelteKit `checkOrigin` deprecation FIRED in a real build
(`ROADMAP.md` Now); `check:surface` proved blind to a removed index signature (`ROADMAP.md`
Now, both still open); TypeScript 7 and `vitest-browser-svelte` 3 were both held with named
triggers (both later resolved, see 2026-08-21 and 2026-08-22 above); `@cloudflare/workers-types`
5's `Buffer: any` scar is marked with a `WATCH` comment on `scripts/build/emit-template.mjs`.

## 2026-08-20: Go `cairn` tool, sub-project 1 opened (parallel track)

Design approved by Geoff in a Fable brainstorm, written to
`docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md`, then revised after a
five-vantage adversarial review and a 24-agent verify pass (chapter spine as Go types, a
read-only health HUD, poplar's root-model-plus-registry shape, a split credential model,
`tool/` in-repo). Plan: `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`, three
passes (A foundation, B checks and CLI, C the HUD), 29 tasks. Runs independently of the engine
window; does not block site updates or the editors rewrite.

## 2026-08-19: live-reproduction seam built, both halves

Plan and five post-mortems: `docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md`.
The delivery half shipped in `cairn-pub` on `pass-d-docs-tracks` (`8bef4f0`..`e182f36`); two
load-bearing engine commits landed here alongside it: `42b9d105` lets a prerendered route mount
`EditPage` (four of 25 story pages emitted no HTML at all without it), and `a5a069a8` binds a
story's chip numbers rather than only its marker keys.

Two of three pre-embed obligations closed engine-side. `ReproStory.pose` now receives the
mounted component's own exports as a required second argument (`media/insert-panel` no longer
pictures a control the real admin never renders; the handoff runs synchronously inside the
mount, not from an effect). `tags/screen`'s declared column height grew from 700 to 940, proven
by a new geometric gate, `src/tests/component/reproductions-marker-crop.test.ts` (its blind spot:
a `column` story is proven at the docs measure only, filed `ROADMAP.md` Now). The third
obligation, a longer accessible-name standard for the three locate-many-controls screens, is
filed to `ROADMAP.md` Now and belongs to the editors rewrite, not the engine.

`cairn-pub`'s next engine install must thread the instance through
`repro-story-lifecycle.ts` and the `[...story]` route's `ReproContext` mount, since widening
`pose` is a compile-time break. A four-lens review found 54 findings; five folded here, the rest
filed as `cairn-pub` Pass 7.

## 2026-08-15 to 2026-08-19: visual layer, diagram pages, capture pass, `cairn-pub` prepared

Geoff ruled 2026-08-15 that release one waits for the visual layer: no hurry to release, docs go
out at best quality with the beta release. The editors-track read was deferred, not skipped,
after a first-contact question about missing images and diagrams; prose written to stand alone
without a picture needs rewriting, not illustrating. Research banked at
`docs/internal/record/2026-08-15-docs-visual-practice-research.md`; the rulings at
`docs/internal/record/2026-08-15-docs-visual-layer-rulings.md`.

The diagram-pages pass merged 2026-08-16 (`817d155a`): eleven mermaid diagrams across ten
pages, nine page rewrites, and the `check:visuals` gate, reviewed by eleven register-editor
fan-outs. The capture pass ran 2026-08-17 (plan and post-mortems:
`docs/superpowers/plans/2026-08-16-capture-pass.md`); transcript fixtures now exist and both
admin pages quote them. The admin-screen reference capture (2026-08-15) banked 44 captures under
`docs/internal/reference-captures/2026-08-15-admin-screens/`, internal-only and excluded from
the npm `files` whitelist.

`cairn-pub` branch `pass-d-docs-tracks` pushed 2026-08-15: 81 prerendered pages, zero broken
links, a clean rebuild against a packed tarball. It was deliberately left unmerged until release
one shipped the docs-restructure payload its build depends on (now satisfied, see the
2026-08-20 release entry above). Its own open item, not yet resolved: the `cairn-cms` GitHub App
installation does not cover `glw907/cairn-pub`, needing Geoff in a browser at the App's own
installation settings.

The `.gitignore` scaffold defect (npm's packlist strips any file literally named `.gitignore`
from a tarball, wherever it sits) was fixed 2026-08-15: `bakeForPacking()` stores it dot-free,
`scaffold.mjs` renames it back in the scaffolded site, proven red-then-green plus an end-to-end
`npm pack`.

## 2026-08-20: nine hand-credential chores, six done or ruled closed

A standing operational list, independent of any pass. Closed by Geoff's ruling rather than
action: the Advanced Certificate Manager line item (copy hedges instead, with a test pinning
the hedge) and the estate Cloudflare token exposure (screen was secured, nobody reached it).
Torn down and verified by listing: the capture-pass scratch estate (repo, worker, two D1
databases, R2 bucket, local state, wrangler session), all 2026-08-17. `TEMPLATE_REPO_TOKEN` is
no longer owed, since the 2026-08-20 template move deleted the sync that needed it. Still open
as of this date, none urgent: delete GitHub Apps `cairn-t4b-live-03cd31`, `cairn-t5-scratch`
(id `4585219`), and `cairn-cairn-capture-scratch` (three Apps total); revoke the T4c spike API
token `d07b2a25f05151591830c45053186979` and remove its local config files; revoke three
Cloudflare API tokens named for `create-cairn-site` at dash.cloudflare.com/profile/api-tokens;
confirm the Workers Paid opt-in taken at T5 run 2; 907-life's push-to-deploy has been broken
since 2026-07-14 (`ROADMAP.md` line on the build-token risk).

## Earlier (2026-05 through 2026-08-14): the rebuild, `create-cairn-site`, and the pre-visual window

The numbered rebuild plans (00 through 08) landed and merged to `main`; stable `0.6.0` shipped
and both original sites ran it. The whole `create-cairn-site` initiative (T1 through T5)
shipped as history, each pass's post-mortem holding the detail; the T4c live spike record
(`docs/internal/record/2026-08-12-t4c-builds-spike.md`) is the fixture source for every Builds
fake body and carries its teardown table. Pass D, the release-debt engine pass, closed
2026-08-14.

By this point every carry-forward defect STATUS had tracked by hand (admin error statuses
flattening to HTTP 200 under the streamed pending count, upstream `sveltejs/kit#12987`; the
SvelteKit `checkOrigin` deprecation; engine-rendered markup depending on classes Tailwind may
never emit; the `/admin/help` first-steps card overlap; the `sideEffects` coverage gate) had
already been filed into `ROADMAP.md` with its own entry and trigger, so this ledger does not
duplicate them; `ROADMAP.md` is their live home.

Superseded `STATUS-archive-*.md` files, oldest first, all still live under
`docs/internal/history/`:

- `STATUS-archive-2026-05-to-2026-07.md`: pre-standalone-repo history.
- `STATUS-archive-2026-07-02-to-2026-07-16.md`
- `STATUS-archive-2026-07-17-to-2026-07-18.md`: the `cairn.pub` step-5 launch and the Waymark
  final-review entries.
- `STATUS-archive-2026-07-19-to-2026-07-20.md`: the chassis-nav pass and the `0.88.3` safelist
  publish.
- `STATUS-archive-2026-07-21-to-2026-07-28.md`: design-infrastructure Passes 1 and 2, the
  `0.89.x` and `0.90.x` publishes, the admin-toolkit organization pass.
- `STATUS-archive-2026-07-29-to-2026-08-01.md`: the `0.91.0` publish, the `0.91.1` hotfix and
  ASC harvest fold, the `0.92.0` design-ratchet minor, the xcathletes seams pass.
- `STATUS-archive-2026-08-02-to-2026-08-03.md`: the C1 seam-shape pass, the refusal-channel
  convergence, the C2 window before merging.
- `STATUS-archive-2026-08-04-to-2026-08-05.md`: the auth-channel window, the AI-posture pass, up
  to the `0.94.0-rc.1` cut.
- `STATUS-archive-2026-08-06-to-2026-08-07.md`: the rc.2 cut, the ASC end-to-end verification,
  the RC window to the stable `0.94.0` cut.
- `STATUS-archive-2026-08-08.md`: the stable `0.94.0` window, ASC's adoption, the
  vertical-alignment pass.
- `STATUS-archive-2026-08-09-to-2026-08-11.md`: the T1 completion, the docs-refactor pass-start,
  the T3-built entries.
- `STATUS-archive-2026-08-12-t4b1-close.md`, `STATUS-archive-2026-08-12-t4c-planned.md`: the
  T4b.1 close; the state T4c's execution session started from.
- `STATUS-archive-2026-08-13-t5-task8-close.md`, `STATUS-archive-2026-08-13-t4d-close.md`: the
  T5 Task 8 live-e2e close and the T5a split; the T4d close with the live-proof and teardown
  record.
- `STATUS-archive-2026-08-14-pass-d.md`: Pass D's planning entry, its Phase 1 close, its
  Phase 3 start, and the production-gate failure that blocked Phase 3 until its fold landed.

## Registry housekeeping, not yet acted on

A stale `rc` dist-tag still points at `0.6.0-rc.1` from the pre-rebuild era, so
`npm install @glw907/cairn-cms@rc` serves something ancient. The scheme uses `next`, so `rc`
should be removed (`npm dist-tag rm @glw907/cairn-cms rc`). Left alone as an outward-facing
registry change nobody asked for.
