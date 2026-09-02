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

## Live findings

- **`fixtureCsrf` is a fixed constant with the same shape `fixtureMediaBase` had** (`contributor`,
  2026-09-01, conformance pass Task 6, SEC-N-11). `ReproContext.svelte` sets
  `setContext(CSRF_CONTEXT_KEY, () => fixtureCsrf)` unconditionally from
  `src/lib/reproductions/fixtures.ts`'s fixed string, with no override prop, the same class of
  hardcode `fixtureMediaBase` was before this task reshaped it into a `mediaBase` prop. Fixture
  scope only (no live token, no auth surface reachable from a reproduction), and predates this
  pass, so it is filed rather than acted on. Candidate fix, if a consuming site ever needs to vary
  it: the same shape, a `csrf?: string` prop on `ReproContext` defaulting to the current fixture
  value. Trigger: a consumer reports needing a non-default CSRF fixture value, or a future audit
  round reaches this constant.

- **The rulings ledger will not scale as one flat read** (`contributor`, 2026-08-26). The
  any-site audit appended 535 entries to `docs/internal/engine-rulings.md` (~3,970 lines),
  and `engine-triage`'s first action reads it in full on every dispatch. Fine for now under
  the thoroughness ruling; when a consultation's triage cost starts being dominated by the
  ledger read, split the audit section into a slug-indexed summary the agent greps plus the
  full entries on demand. Trigger: the first consultation where the triage's ledger read
  visibly dominates its token spend.

- **The ASC CSRF 403 incidents: the named mechanisms are closed, residue is now diagnosable**
  (`extender`, 2026-08-27; re-triaged 2026-08-27, fix round; mechanisms closed, watch open,
  2026-08-29, csrf-hardening pass). The toolkit-seams pass's `CsrfField` reset-blanking theory did not hold (verified in
  Chromium: a hidden `<input>`'s `value` setter IS its own `defaultValue` setter, so nothing
  desyncs the two). The csrf-hardening pass closed every named mechanism the strongest
  candidate and its siblings pointed at: the CSRF cookie now sets `SameSite=Lax` explicitly
  instead of `Strict`, so a magic-link confirm-load top-level navigation no longer withholds
  the cookie and re-mints it, invalidating every other open admin tab's already-rendered form;
  the cookie's `Max-Age` now matches the session's lifetime and re-anchors on every issue
  instead of expiring on its own shorter timer; `secure` and the cookie name now derive from
  one `PUBLIC_ORIGIN`-aware `csrfSecure(event)` helper (falling back to the request protocol
  for a local-host request or an absent/unparseable `PUBLIC_ORIGIN`) instead of the bare
  per-request `event.url.protocol`, closing the two-names-blind-to-each-other class;
  `content-routes-core.ts`'s empty-token fallback (`csrf: event.cookies ? issueCsrfToken(...) :
  ''`) is deleted, so a form can no longer render permanently unable to pass the guard with no
  readable cause.

  Any residue is now diagnosable: the guard's `reason: 'csrf'` record and
  `admin.action.csrf_rejected` both carry `detail: 'no-cookie' | 'no-witness' | 'mismatch' |
  'unparseable-body'` and `witness: 'header' | 'field'`, so a real incident's own logs
  distinguish "the cookie never arrived" from "the submitted token is stale" from "the field
  was silently swapped for the header witness" instead of one undifferentiated 403, with no
  token material, prefix, or length ever logged.

  Known post-fix behavior, not a defect: a browser holding an old `Strict` cookie from before
  the deploy re-mints exactly once as it ages out, then behaves as any freshly-issued cookie
  does. The other known residual is concurrent first loads: two cookie-less admin loads racing
  in one browser each mint their own token, the later `Set-Cookie` wins, and the tab holding the
  losing value 403s once as `detail: 'mismatch'`, `witness: 'field'`. A post-deploy record of
  exactly that shape is this residual, not a new mechanism; only a record that does not fit it
  reopens the entry. WATCH posture: this entry leaves the log when a post-deploy consumer incident either
  stops recurring, or produces a discriminated record that names a mechanism this pass did not
  already close.

- **`presetUrl` and `BUILT_IN_PRESETS` have zero production callers after the conformance pass's
  Task 14 variants retirement** (`contributor`, 2026-09-01, the 4b close). `presetUrl`
  (`src/lib/media/transform-url.ts`) and `BUILT_IN_PRESETS` (`src/lib/media/config.ts`) are
  unreferenced anywhere in `src/lib` outside their own declaration and the test suite;
  `presetUrl` is still on the public surface, so pruning it is a surface change and a ruling
  matter, not a plain dead-code deletion. Filed to `ROADMAP.md` rather than acted on here.
  Trigger: the next surface-ruling sitting, or the internals-B slice of the any-site audit
  remediation initiative.

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

- **contributor:** the bolded copy quotes in `docs/editors/when-something-goes-wrong.md`
  duplicate component strings with no gate comparing them: `check:prose` scans components,
  `check:docs` scans links, and neither notices when a copy edit in `LoginPage.svelte` strands
  the quote (the conventions-pass close caught one only via an Opus diff-review). A cheap
  tripwire: extract the page's bolded quoted sentences and grep them against the shipped
  component strings. Candidate for the internals slice's gate additions.

- **contributor:** `ROADMAP.md`'s "Platform watch: Cloudflare" heading text is a machine key, not
  just a title: the `cairn Cloudflare capability review (monthly)` cloud routine (created
  2026-08-22) reads the list by that exact heading, so renaming the heading requires updating the
  routine in the same change.

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
| 2026-08-22 | the aksailingclub-org 0.95.0 adoption fix pass (`15a2c979`) | five `extender` findings from a real production adoption of 0.95.0, all shipped: `previewLoad`'s static `$app/environment` import broke a raw, non-Vite Wrangler bundle of the `/sveltekit` barrel (now a dynamic import, gated by a new static-import-graph walker test over the built barrel); `previewLoad` now strips `canonical`/`og:url`/`jsonLd.url` from its `seo` instead of leaving every adopter to rediscover the strip; `PreviewBanner`'s four `--cairn-preview-*` custom properties are now documented as the site-override seam; `PreviewBanner` renders the expiry as a fixed UTC `<time>` string instead of `Intl.DateTimeFormat(undefined, ...)`, closing a possible hydration mismatch, with an optional `formatExpiry` prop; `@cloudflare/workers-types` is now a `peerDependency` at `^5`, so a `wrangler types`-only consumer's install now surfaces the requirement instead of silently losing every cairn-typed binding signature to `any` |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | toolkit-seams T1–T6, all verified shipped against the code: T1 `MediaPicker`/`MediaLibraryEntry` now export from `/admin-toolkit` (and `MediaLibraryEntry` from `/sveltekit`); T2 `StatusChip`'s tone dot retired and the `quiet`/`warning`/`outline` registers ship (`docs/internal/probes/2026-08-26-chip-registers-v2`); T3 `ExpandableRow`'s trigger measured inside the engine's own 24x24 floor (no fix needed) and the documented `data-cairn-inert-cell` escape ships; T4 `ToolbarDisclosure` ships and exports; T5 `CsrfField` sets `defaultValue` explicitly (the reset-blanking theory itself did not hold, per the csrf-hardening entry above, but the component still carries the fix); T6 the checkbox/select/radio edge-contrast fix, the `cairn-text-warning`/`cairn-text-success` utilities, and the `.toolkit-list` padding-only opt-in all ship in `cairn-admin.css` |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | toolkit-seams T7 (`isUniqueViolation` in `/cloudflare`) verified NOT shipped: the plan deferred it at review (membership did not clear the gate) with recorded reopen triggers, but the plan's own commitment to record that defer in `docs/internal/engine-rulings.md` was never carried out (no ledger entry found). Promoted to `ROADMAP.md`'s Next tier with its reopen triggers rather than re-queued here |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | harvest-detection T1–T7, all verified against the code: T1 the blanket-`no-referrer` doctor check ships (`checks-local.ts`); T2 `sheet` became a list of compiled-class sources (`b82f06b5`); T3 `stripe-trim-parity` and `unlayered-font-clobber` ship as static rules; the "bare-tag hover parity" sub-item was dropped at the pre-approval review as a falsified premise (`focus-parity.ts` already catches it) and the "DaisyUI dead class" sub-item was dropped as unbuildable on its own motivating case (both recorded in the plan's "second-round review record", not silently missed); `list-role` ships and is explicitly routed to the any-site audit remediation initiative for its own known descendant-selector gap; T4 `panel-width` ships as a rendered rule; T5 (oklch falsification) was cut at the same pre-approval review as a proven no-op, since `border-contrast` already carries an extensive real-Chromium oklch red-path suite (`rulings.border-contrast.test.ts`) and the other two contrast rules already route through the shared canvas normalizer; T6 (chassis+docs) ships the smooth-scroll halves and the dialog-form-failure/load-when-the-panel-opens recipes |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | `StatusChip`'s `outline`-register border-contrast gap verified already covered: the general `border-contrast` rendered rule (pre-existing, `border-contrast.ts`) geometrically resolves any rendered border's real computed color, `currentColor` inheritance included, against its true surroundings, so it already catches the "outline chip inside a muted-ink ancestor" case the finding asked for a new rule to build |
| 2026-09-01 | the 4b conformance pass's whole-log sweep | the showcase chip-blindness finding folded into the existing "showcase visual suite... corpus gap" entry in `ROADMAP.md`'s Now tier as a second instance of the same gap; `cairn-text-error` and `MediaPicker`'s empty-state `<li>` findings, having no other home, promoted whole to `ROADMAP.md`'s Next tier; `list-role`'s and `panel-width`'s own already-recorded routing to the any-site audit remediation initiative (confirmed by the harvest-detection pass's post-mortem) is why those two entries are deleted rather than re-filed; `AdminTable`'s scroll-wrapper finding folded as a refinement into the pre-existing "Three admin-toolkit accessibility gaps" `ROADMAP.md` entry (filed 2026-08-18, predating this finding) |

**Three carry-forwards were audited 2026-08-18 and judged not worth filing**, recorded here so they
are not re-mined: `packages/create-cairn-site` having neither a comment nor a type gate (the package
is plain JS by design and its own suite is the real gate, and no pass has reported a defect slipping
through), the `paid-plan-missing` mapping keyed on entitlement wording (the call site's docstring and
its test name both already state the risk and the reason), and the root `CLAUDE.md` context-headroom
note (housekeeping, outside this log's charter). STATUS shed all three at the B0 close.
