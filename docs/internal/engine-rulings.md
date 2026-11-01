# Engine rulings ledger

One entry per live ruling. The ledger records a ruling a session could otherwise re-argue, with the
evidence that would reopen it. It holds no executed work and no export a session can read from the
code: the code, `scripts/checks/api-surface.md`, and the reference pages state those. Read an entry
before re-arguing a settled item, never in place of the charter's test (`cairn-judging-scope`).
`grep '^## '` is the index. A slug that code, a gate's data file, or a skill cites with no entry
here was dropped from this ledger as executed or derivable; its full text is in the ledger at the
`pre-agent-first` tag (`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/engine-rulings.md`).

Entry format, gated by `npm run check:rulings-format`:

```markdown
## <slug>: <one-line item>  (verdict, YYYY-MM-DD, source)
- **Verdict:** accept | decline | defer | keep | reshape | retire. One-sentence reason.
- **Reopens on:** the named evidence that would reopen the ruling.
```

A `decline` or `retire` entry with a live reopen condition is a heading and its `Reopens on:` line. A
`keep`, `accept`, or `reshape` entry adds its `Verdict:` reason and any `Shape:`, `Any-site case:`, or
`Record:` line it needs. A `Record:` line cites a reason or a tag URL, never a path that was removed.

## read-from-the-source-rule: a fact with one source is read from that source  (accept, 2026-08-29, foundations A)

- **Verdict:** accept. Ratified as a standing engine rule, in the audit's own words: *a fact with
  one source is read from that source, never copied; an export the engine could use and does not is
  a shape defect until argued otherwise.* The CLI arm already proves it five times with no
  exceptions (`requireOrigin`, `parseSiteConfig`, the installed engine's peer ranges, the plugin's
  own virtual module, `readR2Buckets` shared between two bins), which is what makes it a rule the
  engine discovered rather than one imposed on it. It reads in two directions, and both bind: a
  second copy of a fact is drift waiting to happen, and an engine module hand-rolling what an
  export already computes is a defect in that export's shape, not a matter of taste. The burden
  falls on the copy, never on the read: an argued exception is fine, an unargued one is not.
- **Reopens on:** closed. Ratified and filed by foundations A, Task 2, as the premise the later
  slices read. A concrete instance of a copied fact is that instance's own entry, never a reason to
  reopen the rule.
- **Record:** [coherence-v2](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-26-any-site-audit/coherence-v2.md), R-0, and the C13
  even-surface finding it generalizes.

## convention-parameter-bags: the `*Config` primary parameter-bag convention  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"Parameter bags. R1 applied as written to
  the in-population rows: `*Config` is the primary bag, the primary parameter identifier is
  `config`."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 2 executes across the in-population factory rows (`CairnAdminConfig`, `ContentRoutesConfig`,
  `EditorRoutesConfig`, `PublicRoutesConfig`).
- **Record:** [2026-08-30-conventions-pass.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 1, and Task 1/Task 2.
- **Amendment (2026-09-08, polish-C Task 2):** the bag carries an arity clause the ratified text
  above does not state: `runtime` is a required member of the bag where the factory needs one, and
  positional runtimes go, so `createContentRoutes` and `createCairnAdmin` each take exactly one
  parameter with no default. This closes the "R1 applied as written" text on `runtime`'s place in
  the bag rather than beside it. The source of this clause is
  [2026-09-08-polish-passes-design.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-08-polish-passes-design.md),
  dated 2026-09-08, decision 11, rather than a sitting quotation this pass records as Geoff's own
  words: "One shape for every route factory: a single config bag, with `runtime` a required member
  of the bag where the factory needs one. Positional runtimes go." One amendment covers all four
  factories the decision reaches (`createContentRoutes`, `createContentRoutesInternal`,
  `createCairnAdmin`, `createCairnAdminInternal`); `createNavRoutes` and `createMediaRoute` execute
  the same clause in Task 3 without a second amendment.
- **Amendment (2026-09-08, polish-C Task 4):** the row's populated text scoped itself to four
  `*Config` rows and did not reach a bag a single call takes rather than a factory's own
  construction-time bag. This amendment states the split explicitly: a bag a factory takes at
  construction is `*Config`, with `config` its primary parameter identifier; a bag a single call
  takes is `*Options`. `createSectionAction` already drew the line the engine now states as a
  rule: `SectionActionConfig` is the factory-level bag `createSectionAction` itself takes,
  `SectionActionOptions` is the per-call bag its returned wrapper takes on each invocation. Under
  this clause, `AuthGuardOptions`, `RendererOptions`, and `FieldsetOptions` rename to
  `AuthGuardConfig`, `RendererConfig`, and `FieldsetConfig`; `CairnManifestOptions` is exempt under
  `convention-interop-carve-out`, since it types an interop surface external tooling already
  expects an `Options` bag on, and stays named as it is. Source:
  [2026-09-08-polish-passes-design.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-08-polish-passes-design.md),
  dated 2026-09-08.

## convention-contract-first-returns: every public factory declares a named, authored return type  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"Factory returns, contract-first. Every
  public factory's signature declares a named, deliberately authored return type; the compiler
  enforces the implementation against it. `ReturnType<typeof f>` leaves the public surface. How a
  declaration is composed is free (hand-written members, or `Pick` over an internal wide shape,
  the foundations-B `ContentRoutes` precedent). A host-ecosystem return type (kit `Handle`, kit
  `RequestHandler`) satisfies the rule under the interop clause."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 2 executes (`CairnAdminRoutes`, `AuthRoutes`, `EditorRoutes`, `NavRoutes`, the reopened
  `PublicRoutes` (`audit-delivery-publicroutes`), and `SectionAction<Env, Db>`).
- **Record:** [2026-08-30-conventions-pass.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 2, and Task 1/Task 2.

## convention-verb-rules: the engine's verb vocabulary (`verify`/`validate`/`read`/`parse`/`build`/`create`)  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"Verb rules. `verify*` = engine-owned
  integrity check that throws; `validate*` = check returning issues; `check*` retires as a verb
  (its members fall to the outcome idiom). `read*` = read a committed artifact or declaration
  into typed shape, retiring `extract*`; `parse*` reserved for string-to-structure codecs (paired
  with `format*`). `build*` = derives pure data; function factories belong to `create*`, so the
  resolver trio renames."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 3 executes (the resolver trio, `readMenu`/`readVocabulary`, `buildSiteDescriptors`,
  `diffNewlyPublished`, `buildSitemapView`, `formatMediaToken`/`parseMediaToken`).
- **Record:** [2026-08-30-conventions-pass.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 3, and Task 1/Task 3.
- **Note (polish-C, Task 5):** the three residuals this ruled vocabulary already covered executed:
  `serializeManifest` to `formatManifest` (`parse*`'s codec partner), `deriveExcerpt` to
  `buildExcerpt`, and `diffNewlyPublished` to `buildNewlyPublished` (both `build*`'s "derives pure
  data"). Per `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-08-polish-passes-design.md`, 2026-09-08.

## convention-bare-noun-functions: an exported function's name begins with a verb, an exported value's does not  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"Bare nouns. An exported function's name
  begins with a verb; an exported value's does not; bin names and host-ecosystem plugin factories
  are out of scope."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 3 executes (`renderGlyph`, `defineFieldset`, `resolveOwnerLevelRoles`, `renderJsonLdScript`).
- **Record:** [2026-08-30-conventions-pass.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 4, and Task 1/Task 3.
- **Progress note (polish-C, Tasks 6 and 7):** the ruling's population is now executed across the
  public surface, seven names: `cookieName` to `buildCookieName`, `githubApp` to `createGithubApp`,
  and `adminAction` to `createAdminAction` (Task 6); `previewMint` to `mintPreview`,
  `previewRevoke` to `revokePreview`, `previewLoad` to `loadPreview`, and `healthLoad` to
  `loadHealth` (Task 7). Two exemptions argued rather than assumed: the doctor's `githubApp`
  `DoctorCheck` value, which stays bare because it is an exported value rather than a function; and
  `cairnManifest`, a host-ecosystem plugin factory, out of the ruling's scope by its own text.

## convention-outcome-idiom: a more-than-two-outcome operation returns a discriminated result on one `outcome` grammar  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"Outcome idiom. An operation with more
  than two distinguishable outcomes returns a discriminated result, never a boolean;
  `verifyTurnstile`'s fail-closed boolean is the stated exception. **One grammar:** the
  discriminant key is `outcome`, a string literal union; every discriminated result this pass
  introduces uses it. **`Failure` is the family suffix; `Refusal` and `Skip` retire as TYPE-NAME
  suffixes** (a discriminant VALUE like `'last-owner'` or a field name is not a suffix and is
  unaffected)."* Carries both the one-grammar `outcome`-discriminant clause and the suffix-scope
  clarification; the suffix clause itself is also filed as its own entry,
  `convention-failure-suffix`, since later tasks cite it separately from the discriminant grammar.
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 4 executes (`resolveRateLimit`'s four-arm result, the owner-guard discriminated results)
  and Task 7 extends (`authorizeAdminTarget`'s `outcome`-grammar return).
- **Record:** [2026-08-30-conventions-pass.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 5, and Task 1/Task 4/Task 7.
- **Widening clause (polish-C, Task 8, 2026-09-08):** this row's own scoping phrase, "every
  discriminated result this pass introduces", is superseded by decision 6 of
  [2026-09-08-polish-passes-design.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-08-polish-passes-design.md),
  Geoff's own words: *"no grandfathered exceptions on a surface heading for a 1.0 promise, in the
  one window where every rename is free."* The `outcome`-discriminant grammar now governs the
  WHOLE public surface, not only what a later pass introduces, and polish-C's Task 8 reads four
  existing types into scope under it: `RequestOutcome` (`/sveltekit`, formerly `RequestResult`),
  `ChannelRequestOutcome` and `ChannelConfirmOutcome` (`/auth-channel`, formerly
  `ChannelRequestResult` and `ChannelConfirmResult`), and `RevertOutcome` (`/sveltekit`, formerly
  `RevertFailure`; see `convention-failure-suffix`'s own dated supersession for the name). No
  ledger row rules discriminant VALUE casing before this clause; the kebab-case string a reader
  sees on every existing `*Outcome` type (`PreviewMintOutcome`, `PreviewRevokeOutcome`, and the
  rest) is this pass's own uniformity, not a prior ruling, so this clause states it as the rule
  going forward: an `outcome` value is a kebab-case string literal (`'send-error'`, not
  `'send_error'` or `'sendError'`). The snake_case rule at `src/lib/log/events.ts:5-7`, which
  governs a log record's `reason` and `scope` fields, is a different surface and stays untouched.

## convention-failure-suffix: `Failure` is the family suffix; `Refusal` and `Skip` retire as TYPE-NAME suffixes  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting, the suffix-scope clause of the outcome-idiom
  ruling: *"`Failure` is the family suffix; `Refusal` and `Skip` retire as TYPE-NAME suffixes (a
  discriminant VALUE like `'last-owner'` or a field name is not a suffix and is unaffected)."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 4 (`DeleteRefusal`) and Task 5 (`ContentFormFailure`'s flatten, `SaveFailure`,
  `DeleteRefusal`, `RenameFailure`, `CreateFailure`, `PreviewMintFailure`) execute against.
- **Record:** [2026-08-30-conventions-pass.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 5, and Task 1/Task 4/Task 5.
- **Note (polish-11a, Task 3):** `DeleteRefusal` renamed to `DeleteFailure`, matching this ruling's
  own suffix-scope clause; it now declares in `content-routes-entry-destructive.ts`. Verdict
  unchanged.
- **Note (polish-11a, Task 5):** the media delete refusal carrier is now `MediaDeleteFailure`,
  the media-delete half of the same suffix-scope clause; it declares in
  `content-routes-media-delete.ts`. Verdict unchanged.
- **Progress note (polish-11a, Task 6):** `BulkDeleteSkip` renamed to `BulkDeleteSkippedAsset`,
  the last member of the F1 rename set; it declares in `media/bulk-delete-plan.ts`. Every rename
  this ruling names is now executed. Verdict unchanged.
- **Dated supersession (polish-C, Task 8, 2026-09-08):** citing
  [2026-09-08-polish-passes-design.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-08-polish-passes-design.md),
  line 7, which names the `*Outcome` target for the one type this row's own family-suffix rule
  would otherwise have kept on `*Failure`. `RevertFailure` (`/sveltekit`) is that type: every arm
  is a refusal and it is only ever the payload of `ActionFailure<RevertFailure>`, the row's own
  case rather than an edge of it. Surviving scope: `*Failure` remains the family suffix for a
  payload whose arms are all refusals; `RevertOutcome` is the one ruled exception, on the ground
  that `convention-outcome-idiom` governs the discriminated SHAPE and the four types this pass
  reads onto that grammar (`RequestOutcome`, `ChannelRequestOutcome`, `ChannelConfirmOutcome`,
  `RevertOutcome`) should look alike. `RevertFailure` is renamed to `RevertOutcome`, re-keyed from
  `reason` to `outcome`, and declares in `src/lib/sveltekit/types.ts`. No other type this row
  names is affected.

## convention-internal-sibling-comment: an internal sibling of a public export gets one barrel sentence naming why  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"Two preventive clauses (R-10). An internal
  sibling of a public export gets one barrel sentence naming why it stays internal (gated where
  reachability-shaped)."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 8 executes (`revokeSessions`'s event-free signature, kept as a recorded, doc-commented
  exception against its siblings, per `audit-auth-authchannel`'s annotation).
- **Record:** [2026-08-30-conventions-pass.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 7, and Task 1/Task 8.
- **Note (polish-C, Task 9):** applied to `createMediaRoute`, a public export with an unmatched
  singular name against the family's other route factories: the `/sveltekit` barrel now carries
  one sentence above the export naming why it stays singular, per this ruled shape.

## convention-identifier-grammar: a public-observable identifier is dot-namespaced by area, never prefix-substituted  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"A public-observable identifier is
  dot-namespaced by area; a prefix is never a substitute for a namespace."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1; execution routes to
  slice 4b (the four `rendered-*` harness failure ids conforming to this clause, per the plan's
  "What this pass unblocks and hands to 4b" section).
- **Record:** [2026-08-30-conventions-pass.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 7, and Task 1.
- **Amendment (2026-09-01, conformance-pass Task 13):** the closure above names "the four
  `rendered-*` harness failure ids," but `rendered.ts` defines five, a discrepancy the 4b
  planning docket's §6 flagged as unresolved
  (`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-09-01-4b-planning-inputs/docket.md`, "The four `rendered-*`
  harness failure ids"). Sitting ruling 3 of the 2026-09-01 sitting settled the real set at five
  and named the renamed form for each: `rendered-allowlist-stale` to
  `rendered.allowlist-stale`, `rendered-allowlist-unprobeable` to
  `rendered.allowlist-unprobeable`, `rendered-allowlist-dead` to `rendered.allowlist-dead`,
  `rendered-page-identity-mismatch` to `rendered.page-identity-mismatch`, and
  `rendered-state-unreachable` to `rendered.state-unreachable`. All five renamed in Task 13,
  closing the docket's §6 open item. Two refinements were considered and declined so a later
  reader does not re-file them: the `page-identity-mismatch` noun leaf stays (the audit-id
  vocabulary already carries defect nouns, `chip-ground-collision` among them, and C16 counsels
  restraint beyond the namespace fix), and the `allowlist-` sub-prefix stays (`rendered` is the
  area; the clause namespaces by area, not by sub-mechanism).
- **Note (polish-C, Task 11):** the events header (`src/lib/log/events.ts`) widens its own
  grammar clause on the same reasoning as the amendment above: the subject segment of
  `area[.subject].verb_phrase` may itself be dotted, so `auth.channel.session.created` conforms
  as written rather than standing as the grammar's one four-segment outlier. The clause is
  widened, not the name flattened, matching this ruling's own declined-tidy precedent.

## copy-to-clipboard-control: public-side copy-to-clipboard widget  (decline, 2026-08-26, ASC harvest triage)
- **Reopens on:** Evidence it is an admin-surface mechanic, not a public widget.

## site-today-export: `siteToday(timeZone)` date helper export  (decline, 2026-08-26, ASC harvest triage)
- **Reopens on:** Evidence an export fixes discoverability better than the chassis copy.

## mediaherofield-export: `MediaHeroField` as a public export  (decline, 2026-08-26, toolkit-seams pass)
- **Reopens on:** A second consumer needing the whole save-path field.

## mediainsertpopover-export: `MediaInsertPopover` as a public export  (decline, 2026-08-26, toolkit-seams pass)
- **Reopens on:** A second consumer needing the whole popover composition.

## dead-body-declaration: per-entry dead-body declaration  (decline, 2026-08-26, ASC harvest triage)
- **Reopens on:** A second entry or a second site needing it.

## d1-test-tier: SQLite-backed D1 test tier  (decline, 2026-08-26, ASC harvest triage)
- **Reopens on:** Evidence the shared site-side harness module fails across sites.

## expandablerow-colspan: ExpandableRow `colspan` incident-row variant  (defer, 2026-08-26, ASC harvest triage)

- **Verdict:** defer. One consumer, and structurally a different widget from the shipped
  ExpandableRow.
- **Reopens on:** a second consumer.
- **Record:** [2026-08-26 ASC harvest triage](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-26-asc-harvest-triage.md), Ruled out (email-announce 25).

## warning-button-tier: warning button tier in the admin palette  (defer, 2026-08-26, ASC harvest triage)

- **Verdict:** defer. A family-register design question held for Geoff; neither the site
  nor the engine invents it unilaterally.
- **Reopens on:** Geoff's ruling on the family register.
- **Record:** [2026-08-26 ASC harvest triage](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-26-asc-harvest-triage.md), Ruled out (email-announce 2).

## public-origin-only-origin-source: `PUBLIC_ORIGIN` as the only origin source  (decline, 2026-08-26, ASC harvest triage)
- **Reopens on:** Wrong-origin production metadata despite the note, or a fixed-env seam landing.

## originmatches-strict-guard: `originMatches` stays a strict Origin compare  (keep, 2026-08-26, ASC harvest triage)

- **Verdict:** keep. `originMatches` (`src/lib/sveltekit/csrf.ts`) rejects a request carrying
  `Origin: null`, which is correct per the OWASP-recommended origin-check pattern: some consumer
  routes have no second CSRF layer besides this compare, so loosening it removes their only
  protection. A site-wide `Referrer-Policy: no-referrer` is what strips `Origin` from a plain
  same-origin POST in the first place; the fix is scoping or replacing that referrer policy on
  the site side (`config.no-referrer-blanket`, a doctor check), never loosening the guard.
- **Reopens on:** an evidenced same-origin flow where a compliant browser sends `Origin: null`
  that the doctor's `config.no-referrer-blanket` check cannot catch.
- **Record:** [2026-08-26 ASC harvest triage](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-26-asc-harvest-triage.md), Survivor
  11 (`asc-harvest-triage.md:93-100`); executed by the harvest-detection pass, Task 1.
- **Note (doctor-retirement, retire-2b, 2026-09-21):** `config.no-referrer-blanket` survives under
  `cairn doctor` (`tool/v1.1.0`), one of the eight file-only checks; only the actor's name changed,
  so the reopening condition above stands unaltered.
- **Note (SvelteKit 3 upgrade, 2026-10-06):** verdict unchanged. SvelteKit 3's origin check now runs on every route before any `handle` hook, so the guard no longer calls `originMatches`: its non-admin Origin rule is deleted. `createAuthChannel`'s first-step origin check in `assertOriginAndScheme` is the remaining caller, which keeps a member action's own CSRF floor under `vite dev` (where SvelteKit skips its check) and under a widened `csrf.trustedOrigins`. The "no second CSRF layer" premise above now rests on SvelteKit's check for those routes.

## ical-builder: iCal feed builder  (decline, 2026-08-05, ASC consumer-brief scope check)
- **Reopens on:** Deliberate reopening of the fixed-concepts model by an events-content decision.

## xcathletes-multi-team-isolation: per-team scoping of content visibility  (defer, 2026-08-05, xcathletes requirements)

- **Verdict:** defer. Deferred at the site's own request: Gate 3 of the requirements'
  governance model is "direction, not v1", and "a third team is its own future initiative".
- **Reopens on:** a third team, or the site reopening Gate 3.
- **Record:** [engine-harvest-candidates.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/engine-harvest-candidates.md) section 3
  (xcathletes multi-team isolation).

---

# Retroactive any-site audit entries (2026-08-26)

One entry per audited item, generated from the adjudicated audit run. The full
per-item arguments live in
[record/2026-08-26-any-site-audit.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-26-any-site-audit.md) and its
artifact directory; each entry links its subsystem's ranking file. Reshape and retire
verdicts are pending execution via the ROADMAP remediation entry; their entries close
when the remediation pass lands.

## audit-auth-createauthchannel: `createAuthChannel`  (reshape, 2026-08-26, any-site audit; REOPENED 2026-08-30, conventions-pass sitting)

- **Verdict:** reshape, KEPT. The 2026-08-26 shrink-to-recipe shape is overturned, in Geoff's own
  ruling at the 2026-08-30 conventions-pass sitting: *"`/auth-channel` is KEPT, reopened on
  evidence (Geoff, 2026-08-30). The 2026-08-26 shrink-to-recipe shape is overturned:
  xcathletes-org now runs its member login on `createAuthChannel`
  (`xcathletes-org/src/lib/server/auth/channel.ts`, tests included, citing
  `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/extend/add-a-second-audience.md` Path B), so the 'no consumer anywhere has built against
  it' premise no longer holds. Ground for keeping: adoption evidence plus the
  high-consequence-hand-roll argument (enumeration oracle, unbounded guessing, identity-keyed
  throttle), NOT any-site breadth; the leanness boundary is held by the opt-in subpath. The
  factory folds onto the engine's one auth grammar (Task 8)."*
- **Overturned premise, with evidence:** the original 2026-08-26 verdict's own provenance line
  read *"no consumer anywhere has built against it"* and its right-form argument was to "shrink to
  what both filed asks actually requested": drop the factory to `/auth-crypto`'s primitives plus a
  documented recipe (`rank-auth-family.md`, item 15). The interim `verify-auth-family.md` pass
  already refuted the narrower claim that "the requesting site cannot adopt it unchanged" (item
  15: "stands; premise refuted"), citing xcathletes having built the factory with Turnstile plus
  Twilio/Cloudflare Email, but that pass still left the shrink-vs-fold shape question open,
  leaning toward parameterizing the engine's own magic-link login by audience. The 2026-08-30
  sitting closes that remaining question on stronger evidence than "built": xcathletes now RUNS
  its member login on `createAuthChannel` in production, with tests, following the documented
  `add-a-second-audience.md` Path B seam. The overturning evidence is this adoption fact, not a
  reargued premise.
- **Shape:** Folds onto the engine's one auth grammar (Task 8 of the conventions pass, which
  re-authors this shape and closes all eight open `/auth-channel` family entries against it):
  `CHANNEL_SCHEMA_SQL` retires as an export in favor of a packaged `migrations-channel/0000_channel.sql`
  (idempotent DDL, a sibling directory never under `migrations/`); the channel's three cookie
  deletes gain their setter's `secure` flag; `AuthChannelEvent` retires in favor of `CairnEvent`
  (a breaking rename for xcathletes, stated honestly rather than claimed structurally compatible);
  `revokeSessions(db, subject)` keeps its event-free signature as a recorded, doc-commented
  exception (the one member callable outside a request, per `convention-internal-sibling-comment`);
  `AuthChannelConfig`'s nine-knob `ttl` bag re-derives by what a site actually tunes together, and
  `lookup`/`verify` gain a narrow `{ env }` context rather than the full event (the no-roster-leak
  and session-integrity properties depend on neither callback reading request-shaped data);
  `DeliverContext`, `ChannelRequestResult`, `ChannelConfirmResult` keep with the factory, shapes
  per their own entries.
- **Reopens on:** closed. The 2026-08-30 sitting's adoption-evidence ruling stands unless a later
  round shows the xcathletes usage itself retired, and the fold shape above is executed by Task 8 of
  the conventions pass, which closed all eight open `/auth-channel` family entries against it. Two
  places the execution went beyond the shape as written, both recorded at their own entries:
  `logout` and `resolveSubject` take the bare `CairnEvent` (no `getClientAddress`), since neither
  derives a requester bucket and the narrower parameter is what lets a consumer's session helper
  declare `(event: CairnEvent<Env>)`; and `AuthChannelConfig`'s `kind?: 'code'` sub-objection is
  explicitly NOT executed, left as the one residual on `audit-auth-authchannelconfig`.
- **Record:** [rank-auth-family.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-26-any-site-audit/rank-auth-family.md), rank 15;
  [verify-auth-family.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-26-any-site-audit/verify-auth-family.md), item 15;
  [2026-08-30-conventions-pass.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/plans/2026-08-30-conventions-pass.md), ratified
  ruling 8, Task 1, and Task 8.
- **Verified:** [verify-auth-family.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-26-any-site-audit/verify-auth-family.md)
  (premise refuted there, verdict stands; shape further reopened by the 2026-08-30 sitting above).

## guidance-layer: the `cairn-guidance` bin, the packaged `claude/` tree, and the trust boundary that gates it  (accept, 2026-09-20, extend-2)
- **Reopens on:** Claude Code change to CLAUDE.md @-import documentation reopens fragment install shape.

## audit-cli-create-cairn-site-cloudflare-chapters-deploy-domain-and-emai: `create-cairn-site Cloudflare chapters (deploy, domain and email, Builds)`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The charter question is settled by a recorded ruling, not open: 'create-cairn-site is setup tooling a developer runs deliberately, so it may provision. The runtime library still must never reach for provisioning credentials.' The merge argument is entirely anonymous-consumer: 'a scaffolder that cannot provision has to emit a wrangler.jsonc with blank D1 and R2 identifiers for the developer to fill in by hand, while one tool writes the real ids it just created.' The honesty about what it cannot do (API token, Email Sending onboarding, App creation, nameserver delegation) is the strongest evidence of good shape.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 24.
- **Any-site case:** The charter question is settled by a recorded ruling, not open: 'create-cairn-site is setup tooling a developer runs deliberately, so it may provision. The runtime library still must never reach for provisioning credentials.' The merge argument is entirely anonymous-consumer: 'a scaffolder that cannot provision has to emit a wrangler.jsonc with blank D1 and R2 identifiers for the developer to fill in by hand, while one tool writes the real ids it just created.' The honesty about what it cannot do (API token, Email Sending onboarding, App creation, nameserver delegation) is the strongest evidence of good shape.

## audit-rule-advisory-first-tier: a new consumer-facing audit rule and finding enters at advisory tier for one minor  (accept, 2026-09-19, extend-1)

- **Verdict:** accept. Ratified as the standing rule for every new `cairn-audit` static or
  rendered rule reaching a consumer's own tree: it registers at `advisory` tier for one minor and
  its message names the promotion version, so a consumer upgrading across that minor sees the
  finding printed before it can fail their build, and gets one release to act on it. The class
  it retires (`stock-default-hazards`'s `cairn-btn-guarded` arm) is the same shape read backward:
  advisory until the promotion, error after, the class itself compiled until a later release
  removes it.
- **Reopens on:** a consumer-facing rule shipping straight at error tier with no advisory window,
  or a promotion version landing without every advisory message it promotes being updated in the
  same release.
- **Record:** `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-12-extend-design.md`, the ruled inputs this plan's
  "Ruled inputs" section carries forward; `src/lib/audit/rules/static/log-event-grammar.ts`,
  `log-secret-field.ts`, and `stock-default-hazards.ts`.

## identity-seam-access-verifier: the Cloudflare Access JWT verifier stays a recipe, not an export  (decline, 2026-09-07, identity-seam pass)
- **Reopens on:** A second consumer hand-rolls the verifier, or an engine-internal consumer needs it.

## motion-conform-to-daisyui-conventions: DaisyUI conform-to-conventions, decision 4  (accept, 2026-09-15, admin motion)

- **Verdict:** accept. Decision 4, quoted: "**Conform to conventions:** DaisyUI's component
  timings stay the vendor's own vocabulary. No unlayered override of the four components
  (`.modal`, `.drawer`, `.collapse`, `.btn`). cairn's rules enforce authored code. The audit
  treats a DaisyUI component class as a vendor contribution, checked for the properties it
  animates rather than its durations."
  (`https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-13-admin-motion-language-design.md`, "Decisions (Geoff,
  2026-09-13)", decision 4, 2026-09-13.)
- **Reopens on:** the admin adopting `modal-bottom` at narrow widths, which makes the declined
  `.modal-box` scale override warranted (the travel becomes the viewport rather than roughly
  10px); or a DaisyUI major that changes which classes carry the eleven recorded disagreements.
- **Shape:** no admin rule authors an unlayered override of `.modal`, `.drawer`, `.collapse`, or
  `.btn`. `motion-property` and `motion-vocabulary` exempt DaisyUI's own component classes and
  Tailwind's `transition*` utilities on their class-join half, checked instead for the properties
  they animate; the eleven vendor disagreements are recorded in
  `.claude/skills/cairn-following-admin-design/references/admin-design-system.md`'s Motion section rather than fixed.
- **Record:** `.claude/skills/cairn-following-admin-design/references/admin-design-system.md`, "The DaisyUI decision: eleven vendor
  disagreements"; `src/lib/audit/rules/static/motion-property.ts` and
  `src/lib/audit/rules/static/motion-vocabulary.ts`, both carrying the DaisyUI class-name
  exemption.
- **Verified:** the vendor-exemption fixtures in `motion-property` and `motion-vocabulary`'s own
  test suites, asserting a DaisyUI component class produces no finding while the same property on
  a cairn-authored class still does.
- **Note (theme identity pass A, 2026-09-28):** decision 4 reads as timing-scoped. It bars an
  unlayered override of the four components' motion (durations, easings, delays, and the
  properties they animate), not every unlayered declaration on those classes. On that reading the
  guarded-button rule (`.btn.cairn-btn-guarded[aria-disabled='true']`, a pinned unlayered rule in
  `src/lib/components/cairn-admin.css`) stands, since it sets `pointer-events` and a background,
  not a timing. The theme identity pass moved every other override of a DaisyUI declaration into
  the `utilities.cairn-idiom` sublayer, so this rule is the one unlayered `.btn` override left.
  Record: `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-26-theme-identity-design.md`, the paragraph on retiring
  rules 10 to 12 (review finding CS-B1).

## tooltip-primitive: `Tooltip` in `/admin-toolkit`, replacing native `title` on an action control  (accept, 2026-09-19, extend-1)

- **Verdict:** accept, on ASC's evidence: native `title` on action controls across ten admin
  route files in a production site's own admin, never shown on keyboard focus or a touch tap. Those
  two are the real failures; `title` itself is exempt from WCAG 1.4.13 (Content on Hover or Focus),
  which excludes user-agent presentation an author does not control. Authoring the bubble is what
  brings all three of 1.4.13's bullets into scope, and all three are now the component's own:
  dismissible (a `document`-level Escape listener, non-capturing and propagating, so an enclosing
  dialog still closes on the same press), hoverable (the bubble takes pointer events and a
  `::before` hit area bridges the gap to the trigger), and persistent (nothing hides it on a
  timer). `Tooltip` wraps the given trigger unchanged, shows on hover
  and `:focus-visible`, hides on Escape without moving focus off the trigger, and shows on a
  coarse-pointer tap and hides on the next tap outside; its styles are scoped in the component
  with literal fallbacks, per `StatusChip.svelte`'s own precedent. Every native `title` on an
  engine action control now routes through it. `cairn-btn-guarded` stays compiled and stays on
  its four sites; its rule restores `pointer-events` on an `aria-disabled` control and supplies
  the ghost button's resting fill, which `Tooltip` does not replace, so `stock-default-hazards`
  names the class retired rather than removing it.
- **Why not DaisyUI's own `.tooltip`:** two reasons, verified against
  `node_modules/daisyui/components/tooltip.css`, each independent. Its content, whether painted
  through the `data-tip` pseudo-element or rendered in the real `.tooltip-content` child element,
  carries `pointer-events: none`, so a pointer travelling from the trigger into the bubble to read
  it dismisses it instead, failing WCAG 1.4.13's hoverable bullet. And its visibility is driven
  only by `:hover` and `:has(:focus-visible)` (plus the manual `.tooltip-open` class), with no key
  or timeout that dismisses an open bubble, failing the dismissible bullet outright. Its own touch
  defect is already filed: a long press opens the bubble and strands it (row
  `motion-tooltip-menu-hover-guards-dropped`).
- **Reopens on:** a later pass removing `cairn-btn-guarded` from the sheet (its own budget edit),
  or the placement mechanism (a popover anchored by CSS anchor positioning, with the trigger's
  own anchor name appended rather than replaced when a trigger already anchors its own popover
  menu) failing to hold across a DaisyUI major.
- **Shape:** `src/lib/admin-toolkit/Tooltip.svelte`; the sweep across
  `src/lib/components/*.svelte`, re-grepped and swept at dispatch rather than trusting the
  authoring-time count; `stock-default-hazards`'s new advisory arm naming the retired class.
- **Record:** `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-12-extend-design.md`, "Batch actions on `AdminTable`
  is engine work riding along, not an atom" (the paragraph carrying ASC's evidence);
  `.claude/skills/cairn-following-admin-design/references/admin-design-system.md`, the tooltip recipe.
- **Verified:** `src/tests/component/Tooltip.test.ts` (hover, `:focus-visible`, Escape, coarse
  pointer, `aria-describedby`); `stock-default-hazards`'s own fixture for the new arm.

## doctor-drop-github-app: `github.app` check dropped, not ported, from `cairn doctor`  (retire, 2026-09-21, doctor-retirement spec)
- **Reopens on:** A recorded incident where the missing check cost an operator real time.

## doctor-drop-config-tidy-key: `config.tidy-key` check dropped, not ported, from `cairn doctor`  (retire, 2026-09-21, doctor-retirement spec)
- **Reopens on:** A recorded incident where the absent check cost an operator real time.

## doctor-drop-login-envelope-probe: the `--probe` login-envelope arm dropped, not ported, from `cairn doctor`  (retire, 2026-09-21, doctor-retirement spec)
- **Reopens on:** A recorded incident where the absent check cost an operator real time.

## admin-toolkit-shell-only: the admin toolkit renders only inside the admin shell  (decline, 2026-10-09, engine pass before stage 2b, pass A)
- **Reopens on:** A second site hand-builds a non-admin surface from the toolkit.

## refusal-channels-per-call-site: the three refusal channels match their call sites  (decline, 2026-10-09, engine pass before stage 2b, pass A)
- **Reopens on:** A site needs a uniform audit trail across the three.

## csrf-no-rotation-under-identity: no CSRF rotation runs under `identity`  (decline, 2026-10-09, engine pass before stage 2b, pass A)
- **Reopens on:** A gate switches identities within one browser session in production.

## admin-headers-scope: the 303 to the login and public routes carry no admin headers  (decline, 2026-10-09, engine pass before stage 2b, pass A)
- **Reopens on:** A header-scanner finding on the redirect with a real consequence.

## dev-flag-strict-read: `isDevBackendFlagSet` accepts exactly `'1'` or `true`  (decline, 2026-10-09, engine pass before stage 2b, pass A)
- **Reopens on:** A scaffold path delivers the flag through a shell.

## token-cache-no-401-eviction: a 401 does not evict the shared installation-token cache  (decline, 2026-10-09, engine pass before stage 2b, pass A)
- **Reopens on:** A recorded publish failure from a cached token after a completed rotation.

## point-of-typing-writing-coach: a per-keystroke formatting coach in the editor  (decline, 2026-06-26, help-shell adversarial review)
- **Reopens on:** A reviewed design that is not a per-keystroke formatting coach (the review discarded it as the Clippy pattern).

## runtime-publicmediaresolver: a `runtime.publicMediaResolver` member  (decline, 2026-06-24, adversarial review)
- **Reopens on:** A measured need the `media.resolver_absent` warn event at `createPublicRoutes` construction does not cover (the member inverts the prerender and Worker boundary).

## media-library-type-facet: a hidden Images/Documents filter in `CairnMediaLibrary`  (decline, 2026-07-20, admin-toolkit review-fixes round)
- **Reopens on:** A second stored asset type ships; `ListToolbarFilter`'s `promoted: false` seam covers the hidden-until-needed shape.
