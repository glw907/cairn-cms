# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it. A hole in `docs/internal/facts/` (something a
pass needed and didn't find, found wrong, or found only as an unverified `[candidate]`) is filed
here too, the same as any other finding.

Record each finding with its perspective and a short note. The perspective is one of the five
audience profiles ([`2026-08-14-audience-profiles.md`](./record/2026-08-14-audience-profiles.md)): `editor`
(the non-technical author working in `/admin`), `admin` (the technical non-developer who sets up
and runs the default site; `operator` retired into this tag 2026-08-14), `extender` (the
Svelte-fluent developer building on cairn's seams; formerly tagged `developer`), `contributor`
(the engine contributor working on cairn itself; formerly tagged `maintainer`), or `scripter`
(anyone automating against `cairn`, a person writing a script or an agent; the profile the
2026-08-14 record's dated note added for the three tool contract pages under
`docs/reference/`).

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

New findings start below this line, one per finding, with its perspective and a short note.

- **`tooling`.** A fresh pass worktree fails the full gate on setup alone: `check-public-skill.test.ts`
  needs `npx svelte-kit sync` in `examples/showcase` (`$app/tsconfig` not found), and the
  `create-cairn-site` resume tests need the template baked, which `.github/workflows/test.yml`
  does after `npm run package`. A `setup-worktree` script (or a gate-tier prep step) would carry
  CI's preparation. Found by the conductor at pass A's Task 0 (engine pass before stage 2b),
  2026-10-08.
- **`tooling`.** The local full gate goes red on 20 `site-visual.spec.ts` tests (home and archive
  page 2, five widths, two schemes): the CI-canonical baselines `durable-gotchas.md` names. Pass A
  excluded them with `--grep-invert "site home|archive page 2"`, by hand in its plan. A local
  variant of the `full` tier in `gate-tier.mjs` would make that standing. Found by the conductor at
  pass A's Task 0, 2026-10-08.

Draft docs stage 2a's close (2026-10-07, the 2a unattended run's R7) triaged the whole log and
found 187 open entries, verified against the tree at `b38ef6b3` (each group's cited lines read or
grepped there; the entries filed on 2026-10-07 were verified at filing the same day), after reconciling every `frictionFiled` entry in the R4, R5, and R6
stage records against the log (all present). It applied the engine-pass boundary test (Geoff,
2026-10-07; `ROADMAP.md`'s standing rule) and emptied the log: 76 entries went to the Now tier's
"Engine pass before stage 2b" entry, whose fixes change an extend page's content; 30 to the Next
tier's batched engine friction entry; 21 to the Now tier's "Docs tooling before stage 2b" entry,
two of them workstation-tool findings filed there for the dotfiles; 17 to the Next tier's
reference-arm corrections; 23 to the Next tier's "Docs content the extend rebuild owes"; and 3 to
the Next tier's cairn-audit and public theme contract entry. 17 were fixed and deleted or deleted
as overtaken: three facts the architecture page inputs flagged (`f:pzbmhq`, `f:70mf58`, `f:hk24xs`)
and `f:68h31z`'s type name were corrected at this close, `CLAUDE.md`'s log-safety sentence was
narrowed, and the rest had already been fixed on their pages or in the container. Items meeting
only the test's third class went to `ROADMAP.md`, not back into this log, since the log holds only
live findings and its triage is complete-or-move. Several duplicates merged on the way (the
stale-manifest error, the `check:public-tokens` comment, the indented-fence snippet gap, and the
disclosure-tag provenance gap). `git show b38ef6b3:docs/internal/docs-friction-log.md` holds
every entry in full. See Clearings.

The draft docs harvest's close (2026-09-30) triaged the whole log and found four open entries,
all filed by the harvest itself, each verified against the tree first. The stale `/components`
subpath in `src/lib/islands/index.ts`'s header comment was fixed on the spot (it now names
`/admin`) and deleted. `cli-cairn-media-seed.md`'s `vite dev` claim against the scaffold's dev
backend and `requiredDocsPaths`'s on-disk filter over the kept pages were promoted whole to
`ROADMAP.md`'s Next tier, and the `tool/internal/health` package debt to Later, each with its
trigger. No open entry named a deleted page's prose. The harvest's class X residue, the
non-link mentions of deleted pages in `ROADMAP.md` and this log, was triaged in the same step:
this log's mentions are all dated triage history and stay, and `ROADMAP.md`'s were retired or
reworded there. See Clearings.

Theme identity pass B's close (2026-09-29) triaged the whole log and found one open entry, the
`contributor` finding that the showcase's `wrangler.jsonc:61` hardcodes `PUBLIC_ORIGIN` to
`http://localhost:4173`. It was verified against the tree (still present) and promoted whole to
`ROADMAP.md`'s Next tier beside the `rendered.test.ts` half, which draft docs pass 0+1 had already
promoted. The pass routed its own findings straight to `ROADMAP.md` in the same step: the
`viewport-overflow` timing defect to Now, and the dev backend's `APP_DB` overwrite, the promotion
at `0.99.0`, `transformSelection`'s whole-document dispatch, and the imperative internal-doc
pointer in `cairn-extend` to Next, and the `rounded-t-full` gap to Later. The probe's emitter
trap went to `docs/internal/durable-gotchas.md`. See Clearings.

Theme identity pass C's close (2026-09-29) triaged the whole log and found one open entry, the
`admin` finding on the media library's orphan purge. Geoff ruled on it and it was promoted whole to
`ROADMAP.md`'s Later tier (an owner-restrictable purge). The two chores the pass
fixed on the spot (the scaffold's Node 22 CI pin, now Node 24, and the signups page's stale
Tailwind comment) are already gone from the log. The pass routed its own findings straight to `ROADMAP.md` in the same step:
four `theme-contrast` and public-scope edge cases to Next, the
promotion of the two theme rules to error tier to Toward 1.0, and the docs standing order to Next.
See Clearings.

The style-guide sync's close (2026-09-29) triaged the whole log and found two open entries, both
its own, each verified against the tree first. Tidy's pinned default model
(`DEFAULT_TIDY_MODEL = 'claude-sonnet-5'`, still at `src/lib/nav/site-config.ts:133`) was promoted
whole to `ROADMAP.md`'s Next tier with Geoff's ruling that Tidy track the latest Sonnet. The
entry on the stale Vale suppression comment in `docs/editors/when-something-goes-wrong.md` (the
comment still sits at lines 43-55, naming a 3.15.1 pin and a 3.19.0 false fire) was deleted as
overtaken: the harvest-then-delete program deletes that page, so no fix is owed. See Clearings.

Theme identity pass A's close (2026-09-28) triaged the whole log and found no open entry. The
pass routed its own findings straight to `ROADMAP.md` in the same step: its carried cosmetics,
review minors, batched coverage notes, and the showcase `theme.css` scoping leak to one Now entry beside the theme identity initiative, and the pinned-rule
ratchet shrink and the `ADMIN_CSS_SAFELIST` retirement to Later. The Waymark citation entry in
Next was narrowed to the `site.css` and `prose.css` cites the pass did not touch. See Clearings.

Draft docs pass 0+1's close (2026-09-28) triaged the whole log and found two open entries, both
verified against the code and promoted whole to `ROADMAP.md`'s Next tier: the `admin-toolkit.md`
outline-chip contrast ratios needing re-measurement, and the page-chain claim inventory's missing
disposition for a claim a redraft relocates to a linked reference entry. The close's own two
findings, carried from the segment A ledger boundary and re-verified against the current tree in
the same step (`check:symbols`'s attached-redirect and dropped-continuation gaps, still present
after the 2026-09-26 hardening; `rendered.test.ts`'s hardcoded `localhost:4173` assumption), were
also filed straight to the Next tier rather than opened here first, per the pattern earlier closes
use for a finding discovered and routed in the same step. The segment A boundary's third carried
item, the duplicate-shipped-anchor gap, was re-checked and found already fixed by the same
2026-09-26 hardening commit (`2d960720`) and needed no filing.

Docs reset pass 1's close (2026-09-24) triaged the whole log and found no open entry. The pass
routed its own findings straight to `ROADMAP.md` in the same step, so none opens here. The docs
reset itself went to the Now tier, with pass 1b next. The pass's deferred chain and harness items,
the Waymark template's `contributor` finding (theme comments citing cairn-internal documents), and
the real page defects its readers found went to the Next tier, each with a trigger. Its candidate
triage covered every page-only bullet (retained, rejected, or excluded), so the Next-tier entry
"Re-source the page-only `[candidate]` bullets" was reworded to the 25 excluded bullets that still
carry verification debt. See Clearings.

retire-2b's close (2026-09-22) triaged the whole log and found no open entry. It routed the five
findings retire-2a's post-mortem carried forward, each re-verified against the tree first, to
`ROADMAP.md`'s Next tier: `cairn doctor`'s PASS lines titled with the failure condition joined the
"Go tool 1.1 items" entry, and the other four (`contributor` and `admin` findings: the unpinned
install literal in the scaffolder's tests, `cairn-guidance`'s realpath-less containment,
`is-it-working.md`'s contributor-register symlink paragraph, and both lockfiles' stale
`cairn-doctor` bin mapping) went into one new entry beside the doctor-retirement items, each with
its trigger. The close's own `contributor` finding, that no CI workflow runs retire-2a's
`check:tool-heuristics`, joined the same entry. See Clearings.

Draft docs pass A's close (2026-09-22) triaged the whole log and found one open finding, its own
`scripter` entry from the json-output page's task, already overtaken by the branch that filed it:
the `logs` golden's `publish.commit.failed` event now has an allowlist entry in
`scripts/checks/check-symbols-allowlist.mjs`, beside three `CAIRN_*` variables the same page
cites, and `check:symbols` is green, so the page ships with no known gate red and the entry is
deleted rather than re-filed. The pass surfaced no finding of its own. Every other entry below was
re-read against the code and each was already cleared by the pass named beside it.

The rest of this section is triage history. retire-1's close (2026-09-22) triaged the whole log and
routed the one entry it carried, the Names one (filed 2026-09-21), to `ROADMAP.md`'s Next tier
with its trigger, since the draft-docs pass that writes those strings is the one that pays for it.
retire-1's own `contributor` finding was filed in the same step, also to Next: `link:consumer`
cannot measure a consumer site against unreleased engine work, because every site is pinned to a
released version and calls the released export names. See Clearings.

The doctor-retirement pre-task's close (2026-09-21) triaged the whole log again and found no
finding left open by an earlier pass: every entry below was re-read against the code and each was
already cleared by the pass named beside it. The pre-task's own three `contributor` findings were
surfaced and routed in the same step, all to `ROADMAP.md`'s Next tier,
since the next pass to change the public surface or read the facts container is the one that pays
for each: `npm run check:surface -- --update` forwards the flag to `check-surface-leaks.mjs` only,
so a surface regen takes `node scripts/checks/check-surface.mjs --update` by hand;
`check:facts` range-checks a `Source:` pointer and matches an anchor within ten lines, so an
off-by-one pointer stays green, which is how two stale pointers survived into this pass; and
`cairn-run-gate` has no silence watchdog, so a browser-lane gate that stops making progress holds
the heavy lock until someone kills it. See Clearings.

The Go tool's Pass B2 close (2026-09-21) surfaced three `admin` findings
and routed all three in the same step, to `ROADMAP.md`'s "Three docs items for the draft-docs
pass" entry, since that pass is the one that leans on them: the tool's four public pages moving
from `tool/docs/` under `docs/`; the drafts needing to avoid a hard-wired scaffold-first order,
because 2.0's provisioning makes installing `cairn` the first step; and the admin track gaining
the tool inside its existing "is my site working" job rather than as a page of its own. The
whole log was triaged at the same close: the sections below carry no open finding, each earlier
entry having been verified cleared by the pass named beside it. See Clearings.

The extend-2 pass's close (2026-09-20) surfaced and cleared two findings
in the same step: (`contributor`) `docs/reference` has no dedicated page for the
`./admin-sources.css` subpath export, only a section inside `cairn-audit.md`, promoted whole to
`ROADMAP.md`'s Later tier; (`contributor`) the facts container is sectioned one file per docs
page, and `docs/reference/guidance.md` had no section in `docs/internal/facts/reference.md`, so
the `cairn-guidance install` symlink-containment bullet sat under `docs/extend/what-the-scaffold-wrote.md`
instead, fixed by moving the bullet to a new `## docs/reference/guidance.md` section in
`facts/reference.md`. See Clearings.

The extend-1 pass's whole-log triage (2026-09-20) cleared every open
finding: the three 2026-09-15 facts-harvest verification-debt entries folded into `ROADMAP.md`'s
existing "Re-source the page-only `[candidate]` bullets" entry, which already carries their trigger,
and extend-1's own three findings filed into the `ROADMAP.md` tiers where each bites. See Clearings.

The identity-seam pass's own two findings, discovered and shipped in the same pass
(the locals hand-off pattern from Task 2, the doctor probe's missing `redirect: 'manual'` from
Task 4), are cleared already; the internals-C whole-log triage (2026-09-05) cleared the two
entries this section previously carried: the `check:snippets` stub finding promoted whole to
`ROADMAP.md`'s Later tier with its trigger, and the `ctx.logCommitFailed` call-style contradiction
folded into `ROADMAP.md`'s existing polish-slice bullet. The 2026-09-07 charter audit's five
findings (record `docs/internal/record/2026-09-04-cairn-case/27-charter-gap-audit.md`) cleared the
same day (Geoff accepted the routing): the two charter sentences rewritten
(`what-cairn-is-and-is-not.md`, `CLAUDE.md`: the concept SET is the site's and the seams are
disclosed, not enforced, until 1.0); the email-sender and backend "bring your own" doors and the
auth-store widening promoted whole to `ROADMAP.md`'s identity-seam entry; the upgrade contract
left on the 1.0 path where it already sits. The internals-pass whole-log triage (2026-09-03)
cleared four earlier entries: the ASC CSRF 403 entry deleted (every named mechanism verified
shipped; the residual WATCH now lives in `docs/STATUS.md`'s active watches, not here);
`fixtureCsrf`, the rulings-ledger flat-read scaling note, and `presetUrl`/`BUILT_IN_PRESETS` all
promoted whole to `ROADMAP.md`'s Later tier with their triggers. See Clearings below.

- **`contributor`.** `npm run check` (the `check` script, `svelte-check --tsconfig ./tsconfig.json && tsc ...` in
  `package.json`) runs svelte-check out of heap at Node's default limit in a worktree; it passes with
  `NODE_OPTIONS=--max-old-space-size=6144`. Neither `docs/internal/durable-gotchas.md` nor `CLAUDE.md` names the
  trap. Found by the 2a close-finish run (F1/F2 agents), 2026-10-07.
- **`contributor`.** No gate checks a `docs/internal/...` path cited in a comment under `src/lib`. The design-arc log
  moved to `docs/internal/record/` and nothing flagged the stale citations in `EditorToolbar.svelte` and
  `EditPage.svelte` (fixed on `draft-docs-2a`). A gate that requires every cited path to exist would catch the
  next move. Found by the 2a close-finish run (F1/F2 agents), 2026-10-07.
- **`contributor`.** The sample outputs in `docs/reference/cairn-audit.md` (the border-contrast exemption near line
  236 and the `norms card` output near line 598) are hand-copied from emitter strings in `src/lib/audit/norms.ts`
  (line 280) and `src/lib/audit/border-contrast.ts`. Nothing ties the two together; they drifted once and
  conflicted textually in a merge. Found by the 2a close-finish run (F1/F2 agents), 2026-10-07.
- **`contributor`.** The admin CSS `@source` scan reads comments as well as code
  (`src/lib/admin/admin-css-safelist.ts`, around lines 62-70, which says so), so a class-like token in a comment
  can change the built CSS. Found by the 2a close-finish run (F1/F2 agents), 2026-10-07.
- **`tooling`.** The comment on the `golden` target in `tool/Makefile` (line 94) says it recuts the "render
  frame"; `go test ./internal/render -run TestGolden -update` also regenerates `testdata/json`. Found by the 2a
  close-finish run (F1/F2 agents), 2026-10-07.
- **`docs-gate`.** `scripts/checks/check-arm-indexes.mjs` walks the filesystem, not tracked files, so a gitignored
  local page such as the untracked `docs/internal/credentials.md` fails it locally and passes in CI. Branch
  `draft-docs-2a` added an allowlist entry (line 59) for that page. Found by the 2a close-finish run (F1/F2
  agents), 2026-10-07.
- **`docs-gate`.** The header comment in `scripts/checks/docs-gate.mjs` (lines 3 and 17) counts its checks in
  words ("nineteen" on `draft-docs-2a`), so the count goes stale each time a check is added. Drop the count.
  Found by the 2a close-finish run (F1/F2 agents), 2026-10-07.
- **`engine`.** The project `CLAUDE.md` (line 92) names the Cloudflare account id in plaintext, while `check:leaks`
  on `draft-docs-2a` stores that id only as a SHA-256 digest and `CLAUDE.md` falls outside every check:leaks tier.
  Separately, `docs/internal/credentials.md`'s identifiers (GitHub App id, installation id, D1 UUIDs) remain in git
  history after the untrack. They are identifiers, not keys. Found by the 2a close-finish run (F1/F2 agents),
  2026-10-07.

- **`docs-gate`.** `packages/create-cairn-site/` is not in `check:leaks`' scan roots (`SCAN_ROOTS` in `scripts/checks/check-leaks.mjs`). Its `src` ships in that package's `files`, so it needs coverage before the package's first publish. Found by the 2a close-finish run, 2026-10-07.
- **`contributor`.** `packages/create-cairn-site/test/fixtures/transcripts/01d-resume.txt` (lines 52, 69, 678, 825, 945) still holds the maintainer's home path and a `glw907.workers.dev` URL. Fixing them needs a transcript regeneration that `check:transcripts` replays. Found by the 2a close-finish run, 2026-10-07.
- **`docs-gate`.** `scripts/checks/check-symbols.mjs` (`extractFilePaths`) reads the inline import specifier `#theme/cairn.config.js` as the file path `theme/cairn.config.js`, so prose cannot name the scaffold's real import. Fenced blocks strip import specifiers; inline spans do not. Found by the 2a close-finish run, 2026-10-07.
- **`engine`.** The tutorial puts the adapter at `src/lib/cairn.config.ts` (`#lib`, `docs/extend/add-cairn-to-a-sveltekit-app.md:294,411`) and the scaffold puts it at `src/theme/cairn.config.ts` (`#theme`, `docs/extend/choose-an-ai-posture.md:29,62`), so every extend page that touches the adapter names two paths. Found by the 2a close-finish run, 2026-10-07.
- **`docs-gate`.** `docs/internal/facts/front-door.md:67` (`f:u705t5`) asserts a forward-looking "Topo is planned"; a fact should state only what ships. Found by the 2a close-finish run, 2026-10-07.
- **`contributor`.** The task 8 page plans now disagree with their pages after the rulings: `docs/internal/briefs/extend/debug-your-site.plan.md:64,263` (`cairn help agents`) and `docs/internal/briefs/extend/scaffolded-site-files.plan.md:226,252` (the `CLAUDE.md` subsection). Found by the 2a close-finish run, 2026-10-07.
- **`contributor`.** `npm test` takes about 11 minutes, longer than the 600-second foreground limit, and a re-attached run does not print `gate exit:`. (Reported by the run; the 7-to-11-minute range is also in `pass-gate-economy.md`.) Found by the 2a close-finish run, 2026-10-07.
- **`contributor`.** `packages/create-cairn-site/scripts/bake-template.mjs` requires `--to <dir>` (its usage line says so), and a bare invocation fails. The "create-cairn-site needs baked template" recipe the run followed omitted it; `scaffold.mjs`'s own error names `npm run prepack`, which passes it. Found by the 2a close-finish run, 2026-10-07.

## Clearings

The detail of a cleared finding lives in the pass post-mortem that cleared it and in
`docs/STATUS.md`, never here; this ledger exists only so a reader can find which pass to open. Git
history holds every pruned entry in full.

| Cleared | By | What went where |
| --- | --- | --- |
| 2026-06-28 | extensibility Plan 1 | the append-only prose accumulated through 2026-06-26, pruned |
| 2026-07-16 | the friction-triage pass | every open finding verified against the code, then shipped, filed to `ROADMAP.md` with a trigger, or pruned as already resolved |
| 2026-07-19 | the dev-backend pass | same rule |
| 2026-07-29 | the post-0.91.0 clearing | four gate tightenings shipped; the field-label weight question moved to `ROADMAP.md` |
| 2026-07-29 | the 0.91.1 hotfix pass | the ASC Assets-trial harvest, ten findings: one shipped as the hotfix, one folded into a ROADMAP entry, eight filed |
| 2026-07-30 | the design-ratchet pass | the Assets-trial BUILD harvest, six findings: five shipped (the `base` cascade layer, the exemplar compile gate, `register` on the field components, the one-filled-action ruling), one filed to Next |
| 2026-08-14 | Pass D | the setup-walk entry, five blind vantages and four classes of gap, answered by the docs rebuild's admin track and front-door task |
| 2026-08-17 | the capture pass | three live-run `create-cairn-site` defects plus one register-gate finding, all moved whole to `ROADMAP.md`'s Now tier |
| 2026-08-18 | seam Pass 1b (A8b) | six live-reproduction seam findings: one folded into the extending-developer lens, five filed across all three ROADMAP tiers |
| 2026-08-18 | seam Pass 1b (A8b) | eleven backfill findings from the unharvested 2026-08-04 to 08-16 window, filed across all three tiers; the Windows finding ruled and disclosed rather than fixed |
| 2026-08-18 | seam Pass 2 Task B0 | the cost-preamble finding, the last live one. Geoff ruled the copy hedges rather than waiting on a browser glance; `money.mjs` and two admin pages now scope the total to the confirmed figures, with a test pinning the hedge |
| 2026-08-19 | the release-debt pass | **supersedes the B0 cost ruling above.** A measured build put the deployable bundle at 3,246,163 bytes gzipped, over Cloudflare's 3 MiB Workers Free script limit, so "free, and stays free" was not a hedge to tune but a false claim. Geoff ruled Workers Paid is the expectation, stated plainly and without apology. `money.mjs`, its transcript fixture, and three admin pages now say so; the CLI's own consent prompt still does not, and is filed to `ROADMAP.md` as its own pass |
| 2026-08-22 | the aksailingclub-org 0.95.0 adoption fix pass (`15a2c979`) | five `extender` findings from a real adoption of 0.95.0, all shipped: `previewLoad`'s static `$app/environment` import broke a raw, non-Vite Wrangler bundle of the `/sveltekit` barrel (now a dynamic import, gated by a new static-import-graph walker test over the built barrel); `previewLoad` now strips `canonical`/`og:url`/`jsonLd.url` from its `seo` instead of leaving every adopter to rediscover the strip; `PreviewBanner`'s four `--cairn-preview-*` custom properties are now documented as the site-override seam; `PreviewBanner` renders the expiry as a fixed UTC `<time>` string instead of `Intl.DateTimeFormat(undefined, ...)`, closing a possible hydration mismatch, with an optional `formatExpiry` prop; `@cloudflare/workers-types` is now a `peerDependency` at `^5`, so a `wrangler types`-only consumer's install now surfaces the requirement instead of silently losing every cairn-typed binding signature to `any` |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | toolkit-seams T1–T6, all verified shipped against the code: T1 `MediaPicker`/`MediaLibraryEntry` now export from `/admin-toolkit` (and `MediaLibraryEntry` from `/sveltekit`); T2 `StatusChip`'s tone dot retired and the `quiet`/`warning`/`outline` registers ship (`docs/internal/probes/2026-08-26-chip-registers-v2`); T3 `ExpandableRow`'s trigger measured inside the engine's own 24x24 floor (no fix needed) and the documented `data-cairn-inert-cell` escape ships; T4 `ToolbarDisclosure` ships and exports; T5 `CsrfField` sets `defaultValue` explicitly (the reset-blanking theory itself did not hold, per the csrf-hardening entry above, but the component still carries the fix); T6 the checkbox/select/radio edge-contrast fix, the `cairn-text-warning`/`cairn-text-success` utilities, and the `.toolkit-list` padding-only opt-in all ship in `cairn-admin.css` |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | toolkit-seams T7 (`isUniqueViolation` in `/cloudflare`) verified NOT shipped: the plan deferred it at review (membership did not clear the gate) with recorded reopen triggers, but the plan's own commitment to record that defer in `docs/internal/engine-rulings.md` was never carried out (no ledger entry found). Promoted to `ROADMAP.md`'s Next tier with its reopen triggers rather than re-queued here |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | harvest-detection T1–T7, all verified against the code: T1 the blanket-`no-referrer` doctor check ships (`checks-local.ts`); T2 `sheet` became a list of compiled-class sources (`b82f06b5`); T3 `stripe-trim-parity` and `unlayered-font-clobber` ship as static rules; the "bare-tag hover parity" sub-item was dropped at the pre-approval review as a falsified premise (`focus-parity.ts` already catches it) and the "DaisyUI dead class" sub-item was dropped as unbuildable on its own motivating case (both recorded in the plan's "second-round review record", not silently missed); `list-role` ships and is explicitly routed to the any-site audit remediation initiative for its own known descendant-selector gap; T4 `panel-width` ships as a rendered rule; T5 (oklch falsification) was cut at the same pre-approval review as a proven no-op, since `border-contrast` already carries an extensive real-Chromium oklch red-path suite (`rulings.border-contrast.test.ts`) and the other two contrast rules already route through the shared canvas normalizer; T6 (chassis+docs) ships the smooth-scroll halves and the dialog-form-failure/load-when-the-panel-opens recipes |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | `StatusChip`'s `outline`-register border-contrast gap verified already covered: the general `border-contrast` rendered rule (pre-existing, `border-contrast.ts`) geometrically resolves any rendered border's real computed color, `currentColor` inheritance included, against its true surroundings, so it already catches the "outline chip inside a muted-ink ancestor" case the finding asked for a new rule to build |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | the showcase chip-blindness finding folded into the existing "showcase visual suite... corpus gap" entry in `ROADMAP.md`'s Now tier as a second instance of the same gap; `cairn-text-error` and `MediaPicker`'s empty-state `<li>` findings, having no other home, promoted whole to `ROADMAP.md`'s Next tier; `list-role`'s and `panel-width`'s own already-recorded routing to the any-site audit remediation initiative (confirmed by the harvest-detection pass's post-mortem) is why those two entries are deleted rather than re-filed; `AdminTable`'s scroll-wrapper finding folded as a refinement into the pre-existing "Three admin-toolkit accessibility gaps" `ROADMAP.md` entry (filed 2026-08-18, predating this finding) |
| 2026-09-02 | the internals pass Task 4 | the editors-page quote-drift finding shipped: `check:editor-quotes` extracts every bolded double-quoted sentence from `docs/editors/when-something-goes-wrong.md` and fails when no shipped `src/lib` string grounds it, wired into `npm test` and CI |
| 2026-09-03 | the internals pass's whole-log sweep | the ASC CSRF entry deleted (every named mechanism verified shipped; the residual WATCH moved to `docs/STATUS.md`'s active watches); the Platform-watch-heading entry deleted as a duplicate of `ROADMAP.md`'s own inline trigger; `fixtureCsrf`, the rulings-ledger flat-read scaling note, and `presetUrl`/`BUILT_IN_PRESETS` promoted whole to `ROADMAP.md`'s Later tier with their triggers |
| 2026-09-05 | the internals-C pass's whole-log triage | the `check:snippets` stub finding promoted whole to `ROADMAP.md`'s Later tier with its trigger; the `ctx.logCommitFailed` call-style contradiction (filed at internals-C's Task 10 close, 2026-09-04) folded into `ROADMAP.md`'s existing polish-slice bullet |
| 2026-09-08 | chassis-A's whole-log triage (Task 12) | the `contributor` finding (2026-09-04, the cairn-case round-2 review) fixed: `what-cairn-is-and-is-not.md:48` said "all 23 registered rules" against the tree's actual 28; the sentence now reads 28 |
| 2026-09-08 | the identity-seam pass, Task 6 | its own two findings, both shipped in the pass that found them and recorded in `docs/internal/record/2026-09-07-identity-seam/harvest.md`: the locals hand-off pattern (Task 2) and the doctor probe's `redirect: 'manual'` fix (Task 4) |
| 2026-09-09 | chassis-B2's whole-log triage (Task 8) | its own Task 7 finding (the two `showcase`-flavored strings surviving in a scaffolded site's shipped content), never open here since it was found and routed in the same pass, promoted whole to `ROADMAP.md`'s Next tier with its trigger; the second-menu editing question (Task 4) filed to `ROADMAP.md`'s Later tier as a consultation candidate |
| 2026-09-20 | the extend-1 pass's whole-log triage | the three 2026-09-15 facts-harvest entries (the untraced `sveltekit.md` sections, the `migrate-existing-content.md` validation workflow, and the candidate-tagged `sveltekit.md`/`delivery.md`/`delivery-data.md` group) folded whole into `ROADMAP.md`'s Next-tier `[candidate]` re-sourcing entry; extend-1's own three findings filed to `ROADMAP.md`, two in Next (the line-pinned container anchors a pass's own edits invalidate, the showcase `dev` script compiling the admin sheet without watching it) and one in Later (the showcase's public route map, which extend-1's seam proof assumed wrongly) |
| 2026-09-21 | the Go tool Pass B2 close | its own three `admin` findings, all promoted whole to `ROADMAP.md`'s "Three docs items for the draft-docs pass" entry: the tool's public pages moving under `docs/`, the drafts' scaffold-first order against 2.0's provisioning, and the admin track carrying the tool inside "is my site working". The whole-log sweep found no other open finding to resolve |
| 2026-09-20 | the extend-2 pass's close | its own two findings, discovered and cleared in the same step: the `./admin-sources.css` subpath's missing dedicated reference page promoted whole to `ROADMAP.md`'s Later tier; the misplaced `cairn-guidance install` symlink-containment fact bullet moved from `docs/internal/facts/extend.md` into a new `## docs/reference/guidance.md` section in `facts/reference.md` |
| 2026-09-21 | the doctor-retirement pre-task's close | its own three `contributor` findings, all promoted whole to `ROADMAP.md`'s Next tier with their triggers: the `check:surface -- --update` argument-forwarding quirk, `check:facts`'s blindness to an off-by-one `Source:` pointer, and the missing `cairn-run-gate` silence watchdog (a dotfiles chore, filed in the roadmap because cairn passes are what hit it). The whole-log sweep found no open finding left by an earlier pass |
| 2026-09-22 | draft docs pass A's close | its own `scripter` finding (the `logs` golden's `publish.commit.failed` event failing `check:symbols`'s log-event class) deleted as overtaken: the branch added the allowlist entry, and three `CAIRN_*` entries beside it, and `check:symbols` is green. The whole-log sweep found no other open finding |
| 2026-09-22 | retire-1's close | the Names finding (mermaid `accDescr:`/`accTitle:` text, image alt text, and nav labels carrying no code font for Vale to read) promoted whole to `ROADMAP.md`'s Next tier with its trigger; retire-1's own `contributor` finding, the pinned-site limit on `link:consumer` plus `cairn-manifest`, filed beside it. The whole-log sweep found no other open finding |
| 2026-09-22 | retire-2b's close | retire-2a's five carried findings, all promoted to `ROADMAP.md`'s Next tier: the `cairn doctor` PASS-line title into the "Go tool 1.1 items" entry; the scaffolder install-literal test gap, `cairn-guidance`'s containment, the `is-it-working.md` register slip, and the stale lockfile bin mapping into one new entry with a trigger each, beside the close's own finding that CI never runs `check:tool-heuristics`. The whole-log sweep found no other open finding |
| 2026-09-24 | docs reset pass 1's close | no open finding in the log; the pass's own findings routed to `ROADMAP.md` (the docs reset to Now; the deferred chain and harness items, the Waymark theme comments, and the readers' real page defects to Next); the page-only `[candidate]` re-sourcing entry in Next reworded to the 25 bullets the triage excluded |
| 2026-09-28 | theme identity pass A's close | no open finding in the log; the pass's own findings routed to `ROADMAP.md` (the carried items to Now, the pinned-rule shrink and the safelist retirement to Later); the Waymark citation entry in Next narrowed |
| 2026-09-28 | draft docs pass 0+1's close | two open entries, both verified and promoted whole to `ROADMAP.md`'s Next tier: the `admin-toolkit.md` outline-chip contrast ratios needing re-measurement, and the page-chain claim inventory's missing disposition for a relocated claim; the close's own two carried findings (`check:symbols`'s attached-redirect and dropped-continuation gaps, `rendered.test.ts`'s hardcoded port 4173) filed straight to the same tier; the segment A boundary's third carried item, the duplicate-shipped-anchor gap, verified already fixed by the 2026-09-26 hardening commit and needed no filing |
| 2026-09-29 | theme identity pass B's close | one open entry, the showcase's hardcoded `PUBLIC_ORIGIN` on port 4173 (found again by pass B's task 1), verified and promoted whole to `ROADMAP.md`'s Next tier; the pass's own findings filed straight to Now, Next, and Later, and the probe emitter trap to `durable-gotchas.md` |
| 2026-09-29 | the style-guide sync's close | two open entries, both its own: Tidy's pinned default model promoted whole to `ROADMAP.md`'s Next tier; the entry on the stale `Microsoft.Quotes` suppression comment in `docs/editors/when-something-goes-wrong.md` deleted as overtaken, since the harvest-then-delete program deletes the page. The whole-log sweep found no other open finding |
| 2026-09-29 | theme identity pass C's close | one open entry, the media library's orphan purge open to every editor, verified against the tree, then ruled on by Geoff and promoted to `ROADMAP.md` Later (an owner-restrictable purge); the pass's own findings routed to `ROADMAP.md` (the four edge cases to Next, the rule promotion to Toward 1.0, the docs standing order to Next) |
| 2026-09-30 | the draft docs harvest's close | four open entries, all its own: the `src/lib/islands/index.ts` `/components` comment fixed and deleted; `cli-cairn-media-seed.md`'s `vite dev` claim and `requiredDocsPaths`'s kept-page existence filter promoted whole to `ROADMAP.md`'s Next tier; the `tool/internal/health` package debt promoted whole to Later. The whole-log sweep found no other open finding |
| 2026-10-07 | draft docs stage 2a's close (R7) | all 187 open entries, under the engine-pass boundary test: 76 to the Now tier's engine pass before stage 2b, 21 to Now's docs tooling before stage 2b, 30 to Next's batched engine friction, 17 to Next's reference-arm corrections, 23 to Next's docs content the extend rebuild owes, 3 to Next's cairn-audit and theme contract entry, 17 fixed and deleted or deleted as overtaken |

**Three carry-forwards were audited 2026-08-18 and judged not worth filing**, recorded here so they
are not re-mined: `packages/create-cairn-site` having neither a comment nor a type gate (the package
is plain JS by design and its own suite is the real gate, and no pass has reported a defect slipping
through), the `paid-plan-missing` mapping keyed on entitlement wording (the call site's docstring and
its test name both already state the risk and the reason), and the root `CLAUDE.md` context-headroom
note (housekeeping, outside this log's charter). STATUS shed all three at the B0 close.
