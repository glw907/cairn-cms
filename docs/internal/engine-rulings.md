# Engine rulings ledger

One entry per ruled item. This ledger records rulings the charter has produced and the
evidence that would reopen each. Read it before re-arguing a settled item, never in place
of the charter's own test: the charter adjudicates, the ledger records. An entry here is
evidence for an argument, never a substitute for one.

Entry format: a heading plus labeled lines.

```markdown
## <slug>: <one-line item>  (verdict, YYYY-MM-DD, source)
- **Verdict:** accept | decline | defer | keep | reshape | retire. One-sentence reason.
- **Reopens on:** the named evidence that would qualify (or "closed" for executed accepts).
- **Shape:** (reshape and retire entries naming a concrete target shape) one or more complete
  sentences naming the shape a remediation pass executes. Its own labeled line, never a
  parenthetical folded into `Reopens on:`; `check:rulings-format` gates the format.
- **Record:** link to the consultation, triage, or audit document holding the full argument.
- **Any-site case:** (audit entries; required on every keep) the concrete anonymous-consumer scenario.
- **Verified:** (audit entries; required on every family-originated export and every non-keep) the verifier pass that checked it.
```

**Truncated-shape repair assignment (foundations A, 2026-08-29):** an earlier authoring pass
truncated 54 of this ledger's `(shape: ...)` parentheticals to exactly 160 characters mid-thought.
Foundations A repaired 14 (the `/sveltekit` and `/admin-toolkit` audit entries feeding the next two
remediation slices) by re-authoring the shape from its rank-source discussion and migrating it to
the `- **Shape:**` line above. The remaining 40 stay truncated and allowlisted in
`scripts/checks/check-rulings-format-allowlist.json`; each is repaired by the initiative slice that
executes it (cli and log entries by their owning slices, auth by the conventions pass, the tail by
whichever slice touches each). No later slice may assume the repair is already done for a slug it
finds on that allowlist.

One entry needs care when it is repaired: `audit-cli-cairn-audit-config-json-contract-scope-cssfiles-palettefiles`
(`Reopens on:` line, ~line 4021) closes its truncated parenthetical mid-clause and then continues
straight into `Progress: ...` prose with no boundary between the two. Its repairer must not swallow
the `Progress:` prose into the migrated `- **Shape:**` line; that prose is a status update on the
open edits, not part of the shape itself.

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
- **Record:** [coherence-v2](record/2026-08-26-any-site-audit/coherence-v2.md), R-0, and the C13
  even-surface finding it generalizes.

## canonical-home-rule: every exported name has exactly one declaring subpath  (accept, 2026-08-29, foundations A)

- **Verdict:** accept. Ratified as an R1-tier clause: **every exported name has exactly one
  canonical home, the subpath whose barrel declares it; another barrel that needs the name
  documents where it comes from rather than opening a second home.** The grounds are the audit's
  C1: multi-publication is invisible at per-item altitude, so five auditors each found one instance
  and each correctly declined to charge it, while at whole-surface altitude it is one problem with
  122 instances. A developer holding `NavLayoutEntry` had four import statements and no way to
  learn which was intended, and because each barrel rendered the type through its own expansion,
  two files in one repo could import the same type from two subpaths and produce a diff that looked
  like version skew. The cause is not the R4 export-rule closure, which is right, but its scoping
  unit: R4 was executed independently per barrel, so a type named in four barrels' signatures
  published four times. The engine already had the fix and quoted it in one place only, inside
  `audit-sveltekit-medialibraryentry`'s verdict, which is a rule wearing a single item's clothes;
  this entry is that rule with its own clothes. **The dissent, cited and overruled:**
  `verify-route-factories.md:143-149` (rank 99, `SlotDef`) flipped reshape to keep, arguing a strict
  one-home rule "would leave a site importing only from `/sveltekit` unable to name a member of a
  type it holds", and endorsed a deliberate closure re-export with the reason written down each
  time. The dissent is overruled as an objection to ratification and absorbed as the rule's
  mechanism, on the `MediaLibraryEntry` mold: *a re-export from the stated canonical home is not a
  second home.* `SlotDef` keeps its `/sveltekit` availability, now as a recorded re-export naming
  its home and the signature that requires it, which is exactly what the dissent asked for and what
  four undifferentiated publications never gave a reader.
- **Reopens on:** closed. Executed and enforced by foundations A, Task 2. Seam fit: 18 names lost a
  publication the closure never justified (`/delivery/data` dropped all 18, `/delivery` 15 of
  them), 114 surviving non-home publications (recounted at 4b close against
  `check-surface-reexports.json`'s `reexports.length`) are recorded with their home and the
  signature that requires each, `/delivery` over `/delivery/data` is recorded as one home rather
  than two, and
  `check:surface` fails an unrecorded duplicate, a record entry the surface has outlived, and a
  record entry whose stated home the surface does not declare, on the plain run and on the
  `--update` regeneration alike.
  No consumer import in the four arms, `examples/showcase`, or `templates/waymark` moved. A future
  narrowing that makes a recorded re-export unjustified is that re-export's own removal, not a
  reopening of this rule.
- **Record:** [coherence-v2](record/2026-08-26-any-site-audit/coherence-v2.md), C1 and R-1;
  [the move-set record](record/2026-08-29-foundations-a-move-set.md), which foundations B diffs
  against.

## f1-return-position-leak-sanction: a return-position closure leak is an accepted trade, argument position is not  (accept, 2026-08-30, foundations B pass-end checkpoint / retires plan review)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own hybrid ruling at the
  foundations B pass-end checkpoint: *"Neither (A) nor (B) whole. The split follows the position of the
  leak, which is where the consumer cost actually differs... The 18 return-position rows stay in list
  (b), sanctioned. Each survives retirement as an unnamed structural member of its keep parent, read
  via indexed access (`ListData['entries'][number]`, `EditData['publishActions'][number]`, and so
  on)... `AdminActionOptions` moves to list (c) as Tier 3, one row. It is the sole argument-position
  leak: a consumer passes a value of this type INTO `adminAction`..., and constructing a value of an
  un-nameable type is materially worse ergonomics than reading one... The sanction arrives with an
  owner. Accepting 18 new leaks quadruples the class (5 today, 23 after), so the ruling couples it to a
  gate rider, routed to the internals pass..., a `check:surface` rider that derives the leak set (a
  retire-or-absent name inside a rendered public shape) and fails on any UNRECORDED leak, the same
  fail-unless-recorded form the canonical-home rule uses. Until that rider lands, the retires pass's
  move record is the manual ledger of the 18."* Three addendum rulings, after the adversarial
  pre-dispatch review of the retires plan, refine the sanction's edges: *"`ReproFenceValidation` moves
  to list (c) Tier 2 (reshape-blocked). It is named in the return of `validateReproFence`..., an open
  reshape..., so deleting it now manufactures an unrecorded leak this record's own F-1 test missed by
  construction... It retires with or after that reshape in the conventions pass."*; *"The render trio
  (`cardShell` `headRow` `iconSpan`) defers to the chassis pass as list (c) Tier 4 (chassis-coupled).
  All three are value-imported by the showcase theme/chassis and the baked `templates/waymark` twins and
  taught as `docs/extend/configure-rendering.md`'s worked example; deleting them requires the chassis
  re-homing, `emit:template` re-bake, and guide rewrite in one change..."*; *"`ReproInstance` stays
  sanctioned. It appears only as a callback parameter..., which the return-position rationale does not
  literally cover, but a consumer only ever RECEIVES one (inference covers the inline callback;
  `Parameters<NonNullable<ReproStory['pose']>>[1]` covers the extracted helper), so the
  `AdminActionOptions` construction-ergonomics rationale does not transfer."*
- **Shape:** The permanent `check:surface` rider derives the leak set (a retire-verdicted or otherwise
  absent name that still appears inside a surviving rendered public shape) and fails on any leak that
  is not recorded, the same fail-unless-recorded form the canonical-home rule already enforces; it
  supersedes the retires pass's manual move record as the leak ledger once it lands.
- **Reopens on:** open until the leak-class `check:surface` rider lands in the internals pass; until
  then, the retires pass's move record is the manual ledger of the 18 accepted leaks.
- **Record:** [r4-rederivation](record/2026-08-30-r4-rederivation.md), section 7 (the RULED subsection
  and its ADDENDUM RULINGS); [retires-move-record](record/2026-08-30-retires-move-record.md).

## convention-parameter-bags: the `*Config` primary parameter-bag convention  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"Parameter bags. R1 applied as written to
  the in-population rows: `*Config` is the primary bag, the primary parameter identifier is
  `config`."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 2 executes across the in-population factory rows (`CairnAdminConfig`, `ContentRoutesConfig`,
  `EditorRoutesConfig`, `PublicRoutesConfig`).
- **Record:** [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 1, and Task 1/Task 2.

## convention-interop-carve-out: a host ecosystem's convention wins over cairn's grammar on an interop surface  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"Plus the **interop carve-out clause**: on
  an interop surface, the host ecosystem's convention wins over cairn's grammar, and the barrel
  records why (`/vite` is the standing example; kit's `RequestHandler`/`Handle` returns are the
  same clause)."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 2 executes (`src/lib/vite/index.ts`'s interop barrel comment; `createAuthGuard`'s kit
  `Handle` annotation; `createMediaRoute`'s kit `RequestHandler` return).
- **Record:** [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 1, and Task 1/Task 2.

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
- **Record:** [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md),
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
- **Record:** [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 3, and Task 1/Task 3.

## convention-bare-noun-functions: an exported function's name begins with a verb, an exported value's does not  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"Bare nouns. An exported function's name
  begins with a verb; an exported value's does not; bin names and host-ecosystem plugin factories
  are out of scope."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 3 executes (`renderGlyph`, `defineFieldset`, `resolveOwnerLevelRoles`, `renderJsonLdScript`).
- **Record:** [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 4, and Task 1/Task 3.

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
- **Record:** [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 5, and Task 1/Task 4/Task 7.

## convention-failure-suffix: `Failure` is the family suffix; `Refusal` and `Skip` retire as TYPE-NAME suffixes  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting, the suffix-scope clause of the outcome-idiom
  ruling: *"`Failure` is the family suffix; `Refusal` and `Skip` retire as TYPE-NAME suffixes (a
  discriminant VALUE like `'last-owner'` or a field name is not a suffix and is unaffected)."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 4 (`DeleteRefusal`) and Task 5 (`ContentFormFailure`'s flatten, `SaveFailure`,
  `DeleteRefusal`, `RenameFailure`, `CreateFailure`, `PreviewMintFailure`) execute against.
- **Record:** [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 5, and Task 1/Task 4/Task 5.

## convention-auth-loud-postures: a missing cookie jar from an untyped caller fails loudly, never a soft `fail(403)`  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"Auth postures. A missing cookie jar from
  an untyped caller fails LOUDLY (throw), never a soft `fail(403)`. `adminAction` gains the
  authorization sequence `createSectionAction` carries, with the zero-config default preserved
  (see Task 7's Interfaces block). The `platform` required-but-nullable convention applies
  uniformly across the CSRF/auth helpers."*
- **Friction (moved from `docs-friction-log.md`, 2026-08-29, csrf-hardening close):** the engine
  argued both postures on an untyped caller's missing cookie jar: `content-routes-core.ts` failed
  loudly (its empty-token fallback removed), while five sibling call sites
  (`content-routes-dictionary.ts:95`, `content-routes-media.ts:494`/`:1065`/`:1265`,
  `content-routes-tidy.ts:111`) still guarded with `if (!event.cookies || ...)` and returned a
  soft `fail(403)`. Not a defect, since typed callers cannot hit either branch; filed as a
  candidate for the conventions pass's auth family alongside the platform-required carry-forward.
  The ruling above resolves it in favor of the loud posture.
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 6 executes (the `requireCookieJar` internal helper converting the five soft guards) and
  Task 7 extends. Task 7's execution note: the "gains the authorization sequence" clause landed as
  an OPT-IN `access` member on `AdminActionOptions`, not as default-on enforcement, which is the
  only reading that preserves the ruling's own zero-config proviso. The guard attaches an EMPTY
  access map on a zero-config site, and `hasAccessRule({}, target)` is false for every target, so
  default-on would have refused every action on the documented database-less default. One shared
  internal `authorizeAdminTarget` now runs the three checks for both wrappers, returning an
  `outcome`-grammar result (`convention-outcome-idiom`), and each wrapper keeps its own refusal
  channel: `createSectionAction` audits and returns `fail(403)` byte-identically to before,
  `adminAction` audits and throws `error(403)` so its return type never widens.
- **Record:** [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 6, and Task 1/Task 6/Task 7.

## convention-internal-sibling-comment: an internal sibling of a public export gets one barrel sentence naming why  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"Two preventive clauses (R-10). An internal
  sibling of a public export gets one barrel sentence naming why it stays internal (gated where
  reachability-shaped)."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1, as the premise
  Task 8 executes (`revokeSessions`'s event-free signature, kept as a recorded, doc-commented
  exception against its siblings, per `audit-auth-authchannel`'s annotation).
- **Record:** [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 7, and Task 1/Task 8.

## convention-identifier-grammar: a public-observable identifier is dot-namespaced by area, never prefix-substituted  (accept, 2026-08-30, conventions-pass plan-authoring sitting)

- **Verdict:** accept. Ratified as a standing engine rule, in Geoff's own ruling at the
  2026-08-30 conventions-pass plan-authoring sitting: *"A public-observable identifier is
  dot-namespaced by area; a prefix is never a substitute for a namespace."*
- **Reopens on:** closed. Ratified and filed by the conventions pass, Task 1; execution routes to
  slice 4b (the four `rendered-*` harness failure ids conforming to this clause, per the plan's
  "What this pass unblocks and hands to 4b" section).
- **Record:** [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md),
  "The ratified rulings (Geoff, 2026-08-30 sitting)" ruling 7, and Task 1.
- **Amendment (2026-09-01, conformance-pass Task 13):** the closure above names "the four
  `rendered-*` harness failure ids," but `rendered.ts` defines five, a discrepancy the 4b
  planning docket's §6 flagged as unresolved
  (`docs/internal/record/2026-09-01-4b-planning-inputs/docket.md`, "The four `rendered-*`
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

## login-csrf-no-same-browser-binding: magic-link confirm has no same-browser binding  (defer, 2026-08-27, csrf-hardening pass)

- **Verdict:** defer. `confirmLoad`/`confirmAction` (`auth-routes.ts:170,185`) accept any
  correctly-shaped token, minted for whichever browser requested it, with nothing binding the
  confirming browser to the requesting one. An attacker who requests a magic link for THEIR OWN
  email and then delivers that link to the victim (embedded, forwarded, or otherwise put in
  front of the victim's browser) gets the victim's browser to confirm it, landing the victim in
  the ATTACKER's session (a login-CSRF, distinct from the double-submit CSRF this pass
  hardens). The newer `createAuthChannel` seam (`auth-channel/factory.ts:644-650,859`)
  already carries the fix pattern: a `_pending` cookie holding a nonce, minted on request and
  read back on confirm, so a confirm without the matching cookie fails. Ruled (Geoff,
  2026-08-27): file, not fix, in this slice.
- **Reopens on:** closed. Executed by Task 7 of the conventions pass, value-bound rather than
  presence-only: `loginLoad` and `requestAction` both mint or reuse a `cairn_login_pending` nonce
  cookie, so a browser holds one from the moment the sign-in form renders rather than only after
  it POSTs; `requestAction` stores that nonce's hash on the token row
  (`migrations/0004_login_nonce.sql`), and `consumeToken` compares the
  two inside its own atomic `DELETE`, so no `===` runs against a secret and a browser holding its
  own pending login still cannot confirm another's token. Three properties the execution pins,
  each with its own test: the mint is unconditional and byte-identical on all four `requestAction`
  exits (an editor-only cookie would be an allowlist oracle in the response headers), the cookie
  is reused while unexpired rather than rotated (rotation on a throttled resend would strand the
  link already in the inbox), and the binding lives inside the consume's own predicate rather than
  short-circuiting ahead of it (a cross-browser click must not burn the requester's own link, and a
  cookie-less confirm must still pass `null` so an unbound row keeps its pre-migration semantics).
  Two semantics the review fold ratified on top of the execution (Geoff, 2026-08-31). **The binding
  is last-requester-wins:** a throttled re-request whose nonce differs from the live row's rebinds
  that row (`rebindToken`, one conditional `UPDATE`, no new token, no email, cooldown untouched,
  response byte-identical), which closes the lockout the binding otherwise creates, where an
  attacker posting the request form once a minute holds the row against its own nonce while the
  cooldown throttles the editor's recovery. It costs nothing an attacker did not have, since the
  link only ever reaches the editor's inbox, and the rebind skips an expired row and an unbound
  one. **An unbound row stays confirmable from any browser:** a pre-migration row,
  `create-cairn-site`'s bootstrap INSERT, and a hand-seeded recovery row all carry
  `nonce_hash IS NULL`, and that is the single-owner lockout escape hatch, documented as
  scanner-confirmable rather than quietly relied on. The deliberate trade recorded here: cross-device
  sign-in (request on a desktop, click on a phone; a mail app's WebView with its own cookie jar)
  now refuses, availability given up for integrity, with re-requesting from the clicking browser
  as the escape hatch and its own `?error=no-pending-request` code and copy so the instruction
  points there rather than at "request a new one". The alternative that would preserve
  cross-device, a request-time verifier code shown on the login page, is filed to the roadmap, not
  built. Rollout is hard and guided rather than a silent degrade, since an un-migrated `AUTH_DB` is
  a total login outage with no second channel: the CHANGELOG carries an apply-0004-first
  `Consumers must:` line and the `auth.store` doctor probe now asserts the column.
- **Record:** [2026-08-27 csrf-hardening-pass](../superpowers/plans/2026-08-27-csrf-hardening-pass.md), Task 4;
  executed by [2026-08-30-conventions-pass](../superpowers/plans/2026-08-30-conventions-pass.md), Task 7,
  with the last-requester-wins rebind and the unbound-row semantics ratified in that pass's
  review fold.

## session-cookie-derivation-out-of-csrf-slice: session cookie's secure/name derivation stays on `event.url.protocol`  (defer, 2026-08-29, csrf-hardening pass)

- **Verdict:** defer. The CSRF cookie pair now derives its Secure bit and name from
  `csrfSecure(event)` (`PUBLIC_ORIGIN`-aware), but the session cookie's own three call sites
  (`guard.ts:150`, `auth-routes.ts:199-200`'s `confirmAction`, `auth-routes.ts:225`'s
  `logoutAction`) still derive `secure` from the bare `event.url.protocol`, unchanged by this
  pass. `crypto.ts:20`'s `csrfCookieName` docstring ("mirroring `sessionCookieName`") is true
  only for the shape of the derivation, not for the `PUBLIC_ORIGIN` source now feeding the CSRF
  half; this entry is that docstring's listener. Deliberately out of scope here: the session
  cookie belongs to the conventions pass's auth family, not this CSRF-hardening slice.
- **Reopens on:** closed. Executed by Task 6 of the conventions pass: the FOUR call sites
  (`guard.ts`'s two session-cookie reads, `auth-routes.ts`'s `confirmAction` and `logoutAction`)
  now derive `secure` through `csrfSecure({ url, platform })`, the same call the CSRF pair already
  used (no new wrapper; `csrfSecure` already took that shape), so the session and CSRF cookies can
  no longer diverge on one request. On a guarded `/admin` path this is a COHERENCE change, not a
  security fix: the guard already refuses an `http`, non-local admin request before any route
  runs, so the one row the two derivations used to disagree on was unreachable there.
  Belt-and-braces (security round N1): `logoutAction` now deletes BOTH cookie-name forms for both
  cookies (`cairn_session`/`__Host-cairn_session`, `cairn_csrf`/`__Host-cairn_csrf`), each with
  its matching `secure`, so a `PUBLIC_ORIGIN` change between login and logout cannot strand a
  browser cookie under the name the current derivation no longer produces. `crypto.ts`'s
  `csrfCookieName` docstring is corrected in the same task. One residual, NOT closed by this task:
  an auth route a site mounts OUTSIDE `/admin` over `http` on a non-local host still mints a
  discarded `__Host-` cookie; `security-model.md`'s mount-under-`/admin` instruction ("Mount every
  load that issues a CSRF token under `/admin/**`") is the guard against it.

  `check-probe.ts:49`, this entry's carried sibling, closes here too, deliberately NOT folded: the
  doctor probe keeps deriving its expected cookie name from the PROBED origin, now by calling
  `csrfSecure({ url: origin, platform: undefined })` directly (`csrfSecure`'s own body,
  origin-parameterized through its `url` argument) rather than a hand-duplicated
  `origin.protocol === 'https:'` copy, provably the same answer on every branch since feeding no
  `platform` means the CSRF-side `PUBLIC_ORIGIN` consultation never fires. This is a cross-check
  on the deployed runtime, not configuration the probe should trust: it must never read a
  separately-resolved `PUBLIC_ORIGIN` for its own expectation, or a `--url` override diverging
  from the wrangler config's own value would go undetected. One body, two deliberate inputs, not a
  silenced disagreement.
- **Record:** [2026-08-27 csrf-hardening-pass](../superpowers/plans/2026-08-27-csrf-hardening-pass.md), Task 1; executed by [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), Task 6.

## copy-to-clipboard-control: public-side copy-to-clipboard widget  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. A generic web widget on the design-agnostic public side; a chassis
  recipe at most, never an engine export.
- **Reopens on:** evidence it is an admin-surface mechanic rather than a public-side widget.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (events-redesign 4).

## site-today-export: `siteToday(timeZone)` date helper export  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. A few lines of `Intl`; the same repo failed to reuse its own first
  copy, so the failure is discoverability, which an npm export solves no better than the
  chassis carrying it once.
- **Reopens on:** evidence an export fixes the discoverability failure better than the
  chassis copy does.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (events-redesign 5).

## mediaherofield-export: `MediaHeroField` as a public export  (decline, 2026-08-26, toolkit-seams pass)

- **Verdict:** decline. It is `EditPage` save-path wiring, not a selection surface: four hidden
  inputs the decode arm reads, `$app/forms` `deserialize` over cairn's own upload endpoint, and the
  CSRF context key. That is the same objection sustained against `MediaInsertPopover` (see
  `mediainsertpopover-export`), which also stays internal, deferred until the `MarkdownEditor` seam
  collapse. The evidenced ASC need was selection and display, which the newly exported
  `MediaPicker` serves.
- **Progress (internals pass, Task 7, 2026-09-02):** `MediaHeroField` names no `register*` prop
  itself (its own upload/save-path wiring is untouched by the collapse), so the collapse landing
  changes nothing about this component's shape or its export case. Re-examined against the
  executed `EditorApi` shape: no new evidence surfaced.
- **Reopens on:** a second consumer needing the whole save-path field rather than selection alone.
- **Record:** [2026-08-26 toolkit-seams pass](../superpowers/plans/2026-08-26-toolkit-seams-pass.md), Task 1; the need is evidenced in [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Survivors 1.

## mediainsertpopover-export: `MediaInsertPopover` as a public export  (decline, 2026-08-26, toolkit-seams pass)

- **Verdict:** decline, internal, deferred. Filed as its own entry (foundations A, 2026-08-29); the
  ruling previously lived only as a sub-clause of `mediaherofield-export`. Same objection sustained
  against `MediaHeroField`: it is `MarkdownEditor`/`EditPage` save-path wiring, not a selection
  surface, so publishing it advertises internal composition rather than a seam a consumer needs.
- **Progress (internals pass, Task 7, 2026-09-02): the reopen trigger fired, re-examined, verdict
  stands.** The collapse landed: `MarkdownEditor`'s `registerEditor` now hands `EditPage` the full,
  exported `EditorApi` (13 members). `MediaInsertPopover`'s own `editor` prop still narrows that
  down to the four members it drives (`caretCoords`, `focusEditor`, `placeholders`,
  `insertImage`) through `EditPage`'s local wrapper, unchanged by the collapse: the component's
  composition role is identical, and nothing about the collapse evidences a consumer that needs
  `MediaInsertPopover` itself rather than the seams it composes. The decline stands.
- **Reopens on:** a second consumer needing the whole popover composition (not just the seams it
  drives), evidenced the way `mediaherofield-export`'s condition requires. The earlier "the
  `MarkdownEditor` seam collapse" trigger is spent: that collapse has now executed and produced no
  new evidence, so it cannot reopen this row a second time.
- **Record:** [2026-08-26 toolkit-seams pass](../superpowers/plans/2026-08-26-toolkit-seams-pass.md), Task 1; originally recorded as a sub-clause of `mediaherofield-export` above.

## isuniqueviolation-cloudflare: `isUniqueViolation` in `/cloudflare`  (defer, 2026-08-26, toolkit-seams pass; recorded 2026-09-01, promoted from the friction log at the 4b conformance pass close since the plan's own intent to record this defer here at pass close was not actually carried out)

- **Verdict:** defer, not dropped. Four divergent site copies of a D1 unique-violation matcher
  motivated the proposal (former Task 7), but the membership case did not clear the gate at the
  plan's second review: the Cloudflare-specific content is the workerd cause-chain nesting alone,
  four divergent copies in ONE consumer is the `site-today-export` decline's own shape, and the
  engine itself never handles `UNIQUE constraint failed` today (`grep -rn` across the tree returns
  nothing), so shipping it would have been a fifth C13 engine-unused export. The shape is right if
  it reopens: a type predicate, `is`-prefixed, structure rather than vocabulary.
- **Reopens on:** a second unrelated consumer hitting the cause-chain nesting, or the cheaper
  decisive check: an engine-side D1 path that can raise a UNIQUE violation and mishandles it today
  (candidates: the `AUTH_DB` editor/invite inserts, `createD1AuditSink`); if one qualifies, the
  engine becomes its own first consumer and the item clears both the gate and C13 in one move.
- **Record:** [2026-08-26 toolkit-seams pass](../superpowers/plans/2026-08-26-toolkit-seams-pass.md), "Deferred: `isUniqueViolation` in `/cloudflare` (former Task 7)"; tracked forward in [ROADMAP.md](../../ROADMAP.md), the Next tier's `isUniqueViolation` in `/cloudflare` entry.

## dead-body-declaration: per-entry dead-body declaration  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. One entry on one site; the proper site fix is deleting the husk
  page and holding the title in site config.
- **Reopens on:** recurrence (a second entry, or a second site needing it).
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (events-redesign 3).

## d1-test-tier: SQLite-backed D1 test tier  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. Real family pain, but a second test harness is large surface for a
  lean package; "out of scope" is the charter's sanctioned answer, and the sites can share
  a harness module.
- **Reopens on:** evidence the shared site-side harness module fails across sites.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (events-admin 8).

## expandablerow-colspan: ExpandableRow `colspan` incident-row variant  (defer, 2026-08-26, ASC harvest triage)

- **Verdict:** defer. One consumer, and structurally a different widget from the shipped
  ExpandableRow.
- **Reopens on:** a second consumer.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (email-announce 25).

## warning-button-tier: warning button tier in the admin palette  (defer, 2026-08-26, ASC harvest triage)

- **Verdict:** defer. A family-register design question held for Geoff; neither the site
  nor the engine invents it unilaterally.
- **Reopens on:** Geoff's ruling on the family register.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (email-announce 2).

## blanket-admin-list-reset: blanket admin list-style reset  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. As filed it fails the standing a11y ruling at `cairn-admin.css:468`;
  superseded by the scoped form (triage survivor 8).
- **Reopens on:** nothing; the scoped form supersedes it.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (email-announce 35).

## below-bar-toolkit-idioms: labeled-group switcher and static count-line idioms  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. Two small toolkit idiom notes below the absorption bar (a
  labeled-group switcher idiom and a static variant of the `computeCountLine` live-region
  idiom); they ride along only if a task already touches those surfaces.
- **Reopens on:** an engine task already touching those surfaces, as ride-alongs, never as
  standalone items.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (email-announce 32 and 33).

## public-origin-only-origin-source: `PUBLIC_ORIGIN` as the only origin source  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. Canonical/og/feed URL generation already reads one origin source
  (`examples/showcase/src/chassis/content.ts:29`, a committed literal); sourcing it from an
  environment variable instead would make it vary per environment, and a visual-regression suite
  that renders a page and diffs it against a committed baseline needs the identical origin on
  every run, in CI and locally alike. Env-sourcing that value collides with deterministic visual
  baselines. [Wire the delivery surface](../extend/wire-the-delivery-surface.md) carries the note.
- **Reopens on:** a consumer shipping wrong-origin production metadata despite the note, or a
  fixed-env seam landing that reconciles env-sourcing with pinned baselines.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Survivor 15
  (`asc-harvest-triage.md:115-117`); executed by the harvest-detection pass, Task 6.

## originmatches-strict-guard: `originMatches` stays a strict Origin compare  (keep, 2026-08-26, ASC harvest triage)

- **Verdict:** keep. `originMatches` (`src/lib/sveltekit/csrf.ts`) rejects a request carrying
  `Origin: null`, which is correct per the OWASP-recommended origin-check pattern: some consumer
  routes have no second CSRF layer besides this compare, so loosening it removes their only
  protection. A site-wide `Referrer-Policy: no-referrer` is what strips `Origin` from a plain
  same-origin POST in the first place; the fix is scoping or replacing that referrer policy on
  the site side (`config.no-referrer-blanket`, a doctor check), never loosening the guard.
- **Reopens on:** an evidenced same-origin flow where a compliant browser sends `Origin: null`
  that the doctor's `config.no-referrer-blanket` check cannot catch.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Survivor
  11 (`asc-harvest-triage.md:93-100`); executed by the harvest-detection pass, Task 1.

## ical-builder: iCal feed builder  (decline, 2026-08-05, ASC consumer-brief scope check)

- **Verdict:** decline. Events are site domain, and the engine has no events concept.
- **Reopens on:** a deliberate reopening only: the ASC events-redesign decision making any
  part of events content-shaped, pressing the fixed-concepts model and date-aware public
  listing ("that standing ruling should be reopened deliberately or not at all").
- **Record:** [engine-harvest-candidates.md](engine-harvest-candidates.md) section 3
  (events-redesign), recording the ASC consumer-brief scope check.

## xcathletes-multi-team-isolation: per-team scoping of content visibility  (defer, 2026-08-05, xcathletes requirements)

- **Verdict:** defer. Deferred at the site's own request: Gate 3 of the requirements'
  governance model is "direction, not v1", and "a third team is its own future initiative".
- **Reopens on:** a third team, or the site reopening Gate 3.
- **Record:** [engine-harvest-candidates.md](engine-harvest-candidates.md) section 3
  (xcathletes multi-team isolation).

---

# Retroactive any-site audit entries (2026-08-26)

One entry per audited item, generated from the adjudicated audit run. The full
per-item arguments live in
[record/2026-08-26-any-site-audit.md](record/2026-08-26-any-site-audit.md) and its
artifact directory; each entry links its subsystem's ranking file. Reshape and retire
verdicts are pending execution via the ROADMAP remediation entry; their entries close
when the remediation pass lands.

## audit-adapter-standardschemav1: `StandardSchemaV1`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Conformance is structural, so a Fieldset already satisfies Standard-Schema-aware libraries; a consumer needing the interface takes it from @standard-schema/spec, not from cairn's vendored copy.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: unexported from the root barrel; stays exported from `content/standard-schema.ts`, since `content/fieldset.ts` still names it internally.
- **Shape:** Unexport from '.'; keep internal. Its own StandardResult member is already unexported, so the rule never closed over it anyway.
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 1; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-default-roles: `DEFAULT_ROLES`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Originally kept because `defineAccess` required a concrete vocabulary and
  `docs/extend/restrict-admin-access.md:14` instructed importing the constant to satisfy it; the
  keep verdict named its own reopening condition verbatim, "retire becomes correct only with a
  defineAccess reshape to accept undefined." Task 9 of the conventions pass executes exactly that
  condition, pre-authorized by the keep verdict itself: `defineAccess`'s first parameter widens to
  `RolesDeclaration | undefined`, defaulting to the same implicit vocabulary `resolveCapability`
  already falls back to, so a site with no declared roles no longer needs the constant to satisfy
  `defineAccess`.
- **Reopens on:** closed. Executed by the conventions pass, Task 9: `DEFAULT_ROLES` drops from the
  root barrel (`src/lib/index.ts`) and the `.` surface (verified: zero hits in the regenerated
  `api-surface.md`); it survives as a module-internal constant in `src/lib/auth/roles.ts`, since
  `resolveCapability`, `roleHome`, `resolveOwnerLevelRoles`, `defineAccess`, and several other
  in-tree engine modules (the doctor checks, the editors/guard/content-routes-context server
  modules) still import it directly for their own `undefined`-vocabulary fallback. Leak-free:
  rendered as a literal value, named inside no surviving public shape.
  `docs/extend/restrict-admin-access.md`'s instructed import is rewritten to pass `undefined` to
  `defineAccess` instead of importing the constant.
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 2; conductor adjudication over recorded dissent, see the audit record; executed by
  [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), Task 9.
- **Any-site case:** None demonstrated. core.md:940: resolveCapability already treats 'an undefined vocabulary as DEFAULT_ROLES', so a site gets the behavior without the constant; the literal is two keys.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-authbranding: `AuthBranding`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Real on /sveltekit (AuthRoutesConfig.branding types a hand-mounted route's argument). None on '.': nothing root-public names it, and buildMagicLinkMessage was itself demoted in 2026-07-01.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 2: the root barrel's
  re-export drops, `/sveltekit` is now the sole publication, and the settled-home comment at
  `sveltekit/index.ts` states the flip explicitly.
- **Shape:** Export from /sveltekit only; drop the root re-export, following the ResolvedReference
  precedent (the root re-export is a straight duplicate with no closure justification of its own).
  Executed as ruled.
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 3.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-publishactionsconfig: `PublishActionsConfig`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The seam has one; the alias does not. A site declaring editor.publishActions writes an array literal, and one annotating it writes PublishActionEntry[] just as clearly.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 2, per the sitting's ruling 2:
  `PublishActionsConfig`'s rows drop everywhere (root, `/delivery/data`) and
  `CairnAdapter.editor.publishActions`, `CairnRuntime.publishActions`,
  `normalizePublishActions`, and `resolvePublishActions` all retype to `PublishActionEntry[]`
  directly. `ResolvedPublishAction`, the sibling alias the sitting rode onto this verdict, also
  retires: it was never published from any barrel (only the module-local
  `ContentRoutesContext` named it), so its drop is a source-level rename with no surface row.
- **Shape:** Retire the `X[]` alias; keep `PublishActionEntry` and type `editor.publishActions`
  as `PublishActionEntry[]`. Contrast `NavLayout`, whose alias compresses a real three-arm
  union rather than a bare array. Executed as ruled.
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 4.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-dateprefix: `DatePrefix`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site factoring a shared concept builder across concepts annotates function dated(prefix: DatePrefix). Marginal: the literal union is three tokens and no family site names it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 5.
- **Any-site case:** A site factoring a shared concept builder across concepts annotates function dated(prefix: DatePrefix). Marginal: the literal union is three tokens and no family site names it.

## audit-adapter-behaviortable: `BehaviorTable`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site that builds behavior tables in a module separate from its fieldsets, the natural shape once cross-field rules grow, must annotate that module's export.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 6.
- **Any-site case:** A site that builds behavior tables in a module separate from its fieldsets, the natural shape once cross-field rules grow, must annotate that module's export.

## audit-adapter-fieldbehavior: `FieldBehavior`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. BehaviorTable's element. core.md:1099 names the engine constraint it encodes: 'function-valued behavior a field descriptor cannot carry as plain data', invisible without the type.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 7.
- **Any-site case:** BehaviorTable's element. core.md:1099 names the engine constraint it encodes: 'function-valued behavior a field descriptor cannot carry as plain data', invisible without the type.

## audit-adapter-standardinput: `StandardInput`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The validator takes {frontmatter, body}, not a bare object, and fieldset.ts:478 swallows a wrong shape into empty defaults rather than throwing. The type is how a compiler catches that.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 8.
- **Any-site case:** The validator takes {frontmatter, body}, not a bare object, and fieldset.ts:478 swallows a wrong shape into empty defaults rather than throwing. The type is how a compiler catches that.

## audit-adapter-routingrule: `RoutingRule`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. CairnRuntime.concepts is root-public; a delivery route partitioning concepts by routing.inFeeds or routing.dated annotates the value it reads. Every family site builds feed routes.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 9.
- **Any-site case:** CairnRuntime.concepts is root-public; a delivery route partitioning concepts by routing.inFeeds or routing.dated annotates the value it reads. Every family site builds feed routes.

## audit-adapter-slotdef: `SlotDef`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site sharing slot definitions across a component family (a reused title/body pair) annotates the shared array. Showcase and ASC both declare multi-slot components.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 10.
- **Any-site case:** A site sharing slot definitions across a component family (a reused title/body pair) annotates the shared array. Showcase and ASC both declare multi-slot components.

## audit-adapter-referenceedge: `ReferenceEdge`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site writing a manifest-inspection script walks entry.references and annotates the row; no resolved form exists for that reader. ASC already imports Manifest and ManifestEntry.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 11.
- **Any-site case:** A site writing a manifest-inspection script walks entry.references and annotates the row; no resolved form exists for that reader. ASC already imports Manifest and ManifestEntry.

## audit-adapter-aiposture: `AiPosture`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The value drives engine-rendered robots.txt, which a site cannot patch without replacing the route. The type itself is a two-token union a site writes inline.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 12.
- **Any-site case:** The value drives engine-rendered robots.txt, which a site cannot patch without replacing the route. The type itself is a two-token union a site writes inline.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-tidyconventions: `TidyConventions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. core.md:1108 distinguishes it usefully: the resolved convention set, every field concrete, derived from a site's partial YAML. A site with a house style guide checks against the resolved shape.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 13.
- **Any-site case:** core.md:1108 distinguishes it usefully: the resolved convention set, every field concrete, derived from a site's partial YAML. A site with a house style guide checks against the resolved shape.

## audit-adapter-tidyconfig: `TidyConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site reading siteConfig.tidy?.enabled to show its own tidy affordance annotates the value. One hop closer to a consumer than TidyConventions.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 14.
- **Any-site case:** A site reading siteConfig.tidy?.enabled to show its own tidy affordance annotates the value. One hop closer to a consumer than TidyConventions.

## audit-adapter-composeinput: `ComposeInput`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site with more than one composed runtime (a multi-tenant or preview build) factors the input into a builder and annotates its return. xcathletes is the plausible first case.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 15.
- **Any-site case:** A site with more than one composed runtime (a multi-tenant or preview build) factors the input into a builder and annotates its return. xcathletes is the plausible first case.

## audit-adapter-emailattachment: `EmailAttachment`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site supplying a custom SendMagicLink (ecxc-ski does) that forwards or inspects attachments annotates them. cairn itself never emits one, so the case is the site's own mail.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 16.
- **Any-site case:** A site supplying a custom SendMagicLink (ecxc-ski does) that forwards or inspects attachments annotates them. cairn itself never emits one, so the case is the site's own mail.

## audit-adapter-navlayoutsection: `NavLayoutSection`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The admin sidebar is engine-rendered chrome a site cannot patch. A site grouping its own admin screens under a heading declares a section; annotation matters once sections are built by a helper.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 17.
- **Any-site case:** The admin sidebar is engine-rendered chrome a site cannot patch. A site grouping its own admin screens under a heading declares a section; annotation matters once sections are built by a helper.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-navlayoutengineref: `NavLayoutEngineRef`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Placing or hiding an engine screen (media, settings, editors) in a site's own sidebar order has no other seam: the screens are engine routes and the sidebar is engine markup.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 18.
- **Any-site case:** Placing or hiding an engine screen (media, settings, editors) in a site's own sidebar order has no other seam: the screens are engine routes and the sidebar is engine markup.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-navlayoutentry: `NavLayoutEntry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Its icon field is a closed 27-value union of engine-shipped glyph names. A site building entries in a helper cannot infer that list; the type is how the compiler supplies it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 19.
- **Any-site case:** Its icon field is a closed 27-value union of engine-shipped glyph names. A site building entries in a helper cannot infer that list; the type is how the compiler supplies it.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-navlayout: `NavLayout`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. CairnAdapter.editor.navLayout's own type, and the one alias here that compresses something real: a three-arm union array. ASC exports its sidebar from a dedicated module and annotates it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 20.
- **Any-site case:** CairnAdapter.editor.navLayout's own type, and the one alias here that compresses something real: a three-arm union array. ASC exports its sidebar from a dedicated module and annotates it.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-rolehome: `roleHome`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Decisive reason is false: ('owner').home is undefined in JS, not a crash. roles.ts:94-102 is one ternary, and content-routes-core.ts:721-735 shows roleHome is only the first of three branches in the landing policy, so a site copying it gets no policy. Zero importers; same class as DEFAULT_ROLES.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: unexported from the root barrel (`src/lib/index.ts`); `roleHome` stays exported from `auth/roles.ts`, since `content-routes-core.ts` still calls it internally for the `/admin` landing policy.
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 21; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md) (verdict overturned there).

## audit-adapter-backendcommit: `BackendCommit`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site implementing an alternative BackendProvider types listCommits's return. core.md:1041 names the trap: author is the git trailer, 'never the matched GitHub account, which is null for a magic-link editor'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 22.
- **Any-site case:** A site implementing an alternative BackendProvider types listCommits's return. core.md:1041 names the trap: author is the git trailer, 'never the matched GitHub account, which is null for a magic-link editor'.

## audit-adapter-hasaccessrule: `hasAccessRule`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site's own guard wanting requireAccess's fail-closed posture. An object lookup gets the href form wrong: matching is deepest path-segment-prefix, and /admin/moneyx must never match /admin/money.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 23.
- **Any-site case:** A site's own guard wanting requireAccess's fail-closed posture. An object lookup gets the href form wrong: matching is deepest path-segment-prefix, and /admin/moneyx must never match /admin/money.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-iconfield: `IconField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Weakest arm: it declares no constraint of its own ('none; the stored value is the picked glyph's name', core.md:404), so an annotation buys nothing beyond the type tag.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 24.
- **Any-site case:** Weakest arm: it declares no constraint of its own ('none; the stored value is the picked glyph's name', core.md:404), so an annotation buys nothing beyond the type tag.

## audit-adapter-booleanfield: `BooleanField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Thin: the only thing worth naming is the normalization rule ('an absent or non-true value normalizes to unset'), which a site reading raw frontmatter must not read as a stored false.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 25.
- **Any-site case:** Thin: the only thing worth naming is the normalization rule ('an absent or non-true value normalizes to unset'), which a site reading raw frontmatter must not read as a stored false.

## audit-adapter-datetimefield: `DatetimeField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. It carries a live gap a site must know: 'accepted as a plain string today; the descriptor's min/max are not yet enforced by the validator' (core.md:402). Declared bounds ship unvalidated.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 26.
- **Any-site case:** It carries a live gap a site must know: 'accepted as a plain string today; the descriptor's min/max are not yet enforced by the validator' (core.md:402). Declared bounds ship unvalidated.

## audit-adapter-emailfield: `EmailField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A shared field helper across a family of sites, typed at the module boundary. Nothing arm-specific beyond the format check the validator already applies.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 27.
- **Any-site case:** A shared field helper across a family of sites, typed at the module boundary. Nothing arm-specific beyond the format check the validator already applies.

## audit-adapter-urlfield: `UrlField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Same shared-helper scenario as EmailField, marginally stronger because URL fields most often get wrapped with site conventions (required protocol, allowed hosts via refine) in a helper module.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 28.
- **Any-site case:** Same shared-helper scenario as EmailField, marginally stronger because URL fields most often get wrapped with site conventions (required protocol, allowed hosts via refine) in a helper module.

## audit-adapter-numberfield: `NumberField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Three constraints (min, max, integer) a shared helper would take as parameters and pass through; integer:true rejecting a fraction is engine behavior a site cannot cheaply restate.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 29.
- **Any-site case:** Three constraints (min, max, integer) a shared helper would take as parameters and pass through; integer:true rejecting a fraction is engine behavior a site cannot cheaply restate.

## audit-adapter-textareafield: `TextareaField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Carries rows plus TextField's length and pattern constraints, so a site factoring a cross-concept 'description' convention (three family sites declare one) annotates the helper's parameter.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 30.
- **Any-site case:** Carries rows plus TextField's length and pattern constraints, so a site factoring a cross-concept 'description' convention (three family sites declare one) annotates the helper's parameter.

## audit-adapter-datefield: `DateField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A dated concept's permalink requires a date field of this type, which defineConcept normalizes to required:true 'since the permalink can't resolve without it'. A concept generator names the arm.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 31.
- **Any-site case:** A dated concept's permalink requires a date field of this type, which defineConcept normalizes to required:true 'since the permalink can't resolve without it'. A concept generator names the arm.

## audit-adapter-multiselectfield: `MultiselectField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. taxonomy:true binds the field to the site's tag vocabulary and the manifest's tags; creatable changes the control; the two interact with vocabulary enforcement. A shared taxonomy helper names it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 32.
- **Any-site case:** taxonomy:true binds the field to the site's tag vocabulary and the manifest's tags; creatable changes the control; the two interact with vocabulary enforcement. A shared taxonomy helper names it.

## audit-adapter-selectfield: `SelectField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Its readonly options literal drives inference: 'a select preserves its literal option list so the inferred type narrows to that union'. A helper mapping options onto a filter UI must keep the literal.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 33.
- **Any-site case:** Its readonly options literal drives inference: 'a select preserves its literal option list so the inferred type narrows to that union'. A helper mapping options onto a filter UI must keep the literal.

## audit-adapter-objectfield: `ObjectField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Container arm carrying a rule enforced at the fieldset() call: 'Holds only leaves, no nested container'. A site generating grouped fields from a schema table gets that checked at authoring time.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 34.
- **Any-site case:** Container arm carrying a rule enforced at the fieldset() call: 'Holds only leaves, no nested container'. A site generating grouped fields from a schema table gets that checked at authoring time.

## audit-adapter-arrayfield: `ArrayField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Its item is itself a FieldDescriptor and nesting is one level only. The gallery port's photo rows (fields.array(fields.object({...})) with four leaves) is the measured shape a row builder would type.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 35.
- **Any-site case:** Its item is itself a FieldDescriptor and nesting is one level only. The gallery port's photo rows (fields.array(fields.object({...})) with four leaves) is the measured shape a row builder would type.

## audit-adapter-referencefield: `ReferenceField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The only arm with a cross-concept coupling: its concept names the target whose entries the picker lists, whose deletion the guard refuses, and which verifyReferences checks at build.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 36.
- **Any-site case:** The only arm with a cross-concept coupling: its concept names the target whose entries the picker lists, whose deletion the guard refuses, and which verifyReferences checks at build.

## audit-adapter-imagefield: `ImageField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Carries the seo marker designating the social-card image, a site-wide singleton concern. Its stored value is ImageValue, which ASC already imports, so this arm sits one hop from measured demand.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 37.
- **Any-site case:** Carries the seo marker designating the social-card image, a site-wide singleton concern. Its stored value is ImageValue, which ASC already imports, so this arm sits one hop from measured demand.

## audit-adapter-textfield: `TextField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The arm a multi-site developer factors out first, since a title field appears in every concept. Sharpest failure mode too: 'A malformed pattern throws at the fieldset() call, not on a later save'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 38.
- **Any-site case:** The arm a multi-site developer factors out first, since a title field appears in every concept. Sharpest failure mode too: 'A malformed pattern throws at the fieldset() call, not on a later save'.

## audit-adapter-namedfield: `NamedField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site rendering a field checklist or completeness report over runtime.concepts iterates this array. The key-to-name re-attachment happens inside normalizeConcepts, which is demoted, so a site cannot rebuild it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 39.
- **Any-site case:** A site rendering a field checklist or completeness report over runtime.concepts iterates this array. The key-to-name re-attachment happens inside normalizeConcepts, which is demoted, so a site cannot rebuild it.

## audit-adapter-publishactionentry: `PublishActionEntry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The publish-success moment is engine-rendered markup inside the engine's edit page; a site wanting a next-step link there has no other seam, and the {concept}/{id} href templating is engine-owned.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 40.
- **Any-site case:** The publish-success moment is engine-rendered markup inside the engine's edit page; a site wanting a next-step link there has no other seam, and the {concept}/{id} href templating is engine-owned.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-variantspec: `VariantSpec`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site defining named Images presets in a shared module annotates them; the fit and upscale unions are the vocabulary cairn accepts, and a typo otherwise becomes a dead /cdn-cgi/image URL at request time.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 14, per sitting ruling 4
  (2026-09-01, the `variants` evidence sweep): the recorded any-site case never materialized.
  Sweep evidence, repo/file/hit-or-no-hit: `ecxc-ski/src/theme/cairn.config.ts`,
  `907-life/src/theme/cairn.config.ts`, `aksailingclub-org/src/theme/cairn.config.ts`,
  `xcathletes-org/src/theme/cairn.config.ts`, and `cairn-pub/src/theme/cairn.config.ts` each
  declare `media: { bucketBinding: 'MEDIA_BUCKET' }` and nothing else, no-hit; a full-tree grep
  of each of those five repos for `variants:`/`VariantSpec`/`variantUrl`/`presetUrl`, no-hit; and
  the remaining Step 1 scope, `examples/showcase/src/theme/cairn.config.ts`, `templates/waymark`,
  and `docs/` (grepped before this task's own doc edits), no-hit. `presetUrl`, `VariantSpec`'s
  only reader, has no non-test caller either, since the conventions pass (Task 3) dropped
  `createMediaResolver`'s own preset parameter. `VariantSpec` drops from every barrel (root,
  `/sveltekit`, `/media`); it rode only on `AssetConfig.variants` and
  `ResolvedAssetConfig.variants` naming it, both retired in the same task (see
  `audit-adapter-assetconfig`, amended, and `audit-media-resolvedassetconfig`, re-tested, both of
  which cross-reference this entry's sweep evidence rather than restate it). Seam fit: none lost.
  No site held the seam this closes.
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 41.
- **Any-site case:** A site defining named Images presets in a shared module annotates them; the fit and upscale unions are the vocabulary cairn accepts, and a typo otherwise becomes a dead /cdn-cgi/image URL at request time.

## audit-adapter-islandregistry: `IslandRegistry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site exporting its island map from a components module annotates it, and the alias is how Svelte's Component generic reaches that annotation. defineAdapter fails closed at declaration on a mismatched pairing.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 42.
- **Any-site case:** A site exporting its island map from a components module annotates it, and the alias is how Svelte's Component generic reaches that annotation. defineAdapter fails closed at declaration on a mismatched pairing.

## audit-adapter-fieldsetoptions: `FieldsetOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. fieldset's options parameter, carrying refine. A site writing a shared refine-builder types the options object, and core.md:507 states the constraint it must design around: refine is deliberately synchronous.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 43.
- **Any-site case:** fieldset's options parameter, carrying refine. A site writing a shared refine-builder types the options object, and core.md:507 states the constraint it must design around: refine is deliberately synchronous.

## audit-adapter-validationissue: `ValidationIssue`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site building a bulk importer or CSV upload screen over its own fieldsets reports from the issues array, whose multi-segment path encoding (row index, leaf sub-key) is engine-defined.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 44.
- **Any-site case:** A site building a bulk importer or CSV upload screen over its own fieldsets reports from the issues array, whose multi-segment path encoding (row index, leaf sub-key) is engine-defined.

## audit-adapter-renderer: `Renderer`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site composing its renderer once and passing it around, the exact shape three family chassis modules already have in src/chassis/render.ts, annotates the parameter.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 45.
- **Any-site case:** A site composing its renderer once and passing it around, the exact shape three family chassis modules already have in src/chassis/render.ts, annotates the parameter.

## audit-adapter-resolveoptions: `ResolveOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site threading its resolvers through a wrapper, function renderEntry(md, opts: ResolveOptions), names it. Every family site builds such a wrapper in theme/render.ts, none yet needing the annotation.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 46.
- **Any-site case:** A site threading its resolvers through a wrapper, function renderEntry(md, opts: ResolveOptions), names it. Every family site builds such a wrapper in theme/render.ts, none yet needing the annotation.

## audit-adapter-fragmentresolve: `FragmentResolve`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site with a custom SiteRender receives resolveFragment and must type it to forward or wrap it. core.md:1057 carries the two-mode contract: undefined is a preview miss, a throw is the build backstop.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 47.
- **Any-site case:** A site with a custom SiteRender receives resolveFragment and must type it to forward or wrap it. core.md:1057 carries the two-mode contract: undefined is a preview miss, a throw is the build backstop.

## audit-adapter-mediaref: `MediaRef`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site writing a custom media resolver receives it and must not key on slug: 'The hash is the content identity and the slug is cosmetic, so a rename never breaks a reference' (core.md:300).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 48.
- **Any-site case:** A site writing a custom media resolver receives it and must not key on slug: 'The hash is the content identity and the slug is cosmetic, so a rename never breaks a reference' (core.md:300).

## audit-adapter-mediaresolve: `MediaResolve`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site serving media from its own domain or a signed URL authors a function of exactly this type, under the same undefined-is-a-miss / throw-is-the-backstop convention.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 49.
- **Any-site case:** A site serving media from its own domain or a signed URL authors a function of exactly this type, under the same undefined-is-a-miss / throw-is-the-backstop convention.

## audit-adapter-componentcontext: `ComponentContext`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site past a handful of components factors shared build helpers, function shell(ctx: ComponentContext). ASC's set is already eight named components; the hast contract is entirely engine-owned.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 50.
- **Any-site case:** A site past a handful of components factors shared build helpers, function shell(ctx: ComponentContext). ASC's set is already eight named components; the hast contract is entirely engine-owned.

## audit-adapter-capability: `Capability`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. resolveCapability returns it, and ASC calls that in its own test helper. core.md:908 states the asymmetry it holds: role names are open strings, capability is the one genuinely fixed closed union.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 51.
- **Any-site case:** resolveCapability returns it, and ASC calls that in its own test helper. core.md:908 states the asymmetry it holds: role names are open strings, capability is the one genuinely fixed closed union.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-roledeclaration: `RoleDeclaration`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site building its vocabulary programmatically, mapping a permissions table onto roles, annotates each value and gets the two-arm union (bare Capability, or an object with home) checked.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 52.
- **Any-site case:** A site building its vocabulary programmatically, mapping a permissions table onto roles, annotates each value and gets the two-arm union (bare Capability, or an object with home) checked.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-ownerlevelroles: `ownerLevelRoles`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site provisioning admins from its own screen must know which of its role names carry owner capability, since the last-owner guard counts across that set, not the literal 'owner'. Getting it wrong locks the site out.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 53.
- **Any-site case:** A site provisioning admins from its own screen must know which of its role names carry owner capability, since the last-owner guard counts across that set, not the literal 'owner'. Getting it wrong locks the site out.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).
- **Annotation (conventions pass, Task 3):** renamed `ownerLevelRoles` → `resolveOwnerLevelRoles`
  (`convention-bare-noun-functions`: an exported function's name begins with a verb, and
  `ownerLevelRoles` named only its return, not the operation). Names only; the signature and
  behavior are unchanged.

## audit-adapter-siteconfigerror: `SiteConfigError`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. parseSiteConfig runs at module load in every family site. A build script validating several configs catches by instanceof, reliable only because 'they are defined in the package' (core.md:852).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 54.
- **Any-site case:** parseSiteConfig runs at module load in every family site. A build script validating several configs catches by instanceof, reliable only because 'they are defined in the package' (core.md:852).

## audit-adapter-branchexistserror: `BranchExistsError`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Load-bearing in both directions: a custom Backend must throw it from createBranch, and a site's own revert or draft route catches it 'as a typed refusal instead of a raw 500' (core.md:873).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 55.
- **Any-site case:** Load-bearing in both directions: a custom Backend must throw it from createBranch, and a site's own revert or draft route catches it 'as a typed refusal instead of a raw 500' (core.md:873).

## audit-adapter-commitconflicterror: `CommitConflictError`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A lost-SHA race is the one save failure whose correct response is reload-and-retry, not report-a-bug. A site cannot detect it by message text without coupling to prose.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 56.
- **Any-site case:** A lost-SHA race is the one save failure whose correct response is reload-and-retry, not report-a-bug. A site cannot detect it by message text without coupling to prose.

## audit-adapter-docheading: `DocHeading`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site with a table of contents. Headings are collected after rehypeSlug and after a site's own rehype plugins, 'so a site rewrite of a heading's id is the id collected'; regexing the HTML gets ids that disagree.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 57.
- **Any-site case:** Any site with a table of contents. Headings are collected after rehypeSlug and after a site's own rehype plugins, 'so a site rewrite of a heading's id is the id collected'; regexing the HTML gets ids that disagree.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-manifestentry: `ManifestEntry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site diffing the committed manifest for announce-on-publish annotates the rows. publishedAt lives only here: 'no content file carries it', so a site cannot derive it from its corpus.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 58.
- **Any-site case:** A site diffing the committed manifest for announce-on-publish annotates the rows. publishedAt lives only here: 'no content file carries it', so a site cannot derive it from its corpus.

## audit-adapter-manifest: `Manifest`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Exactly the annotation the 2026-07-01 defense predicted and ASC now writes: 'const m: Manifest = buildSiteManifest(...)' for a custom regenerate or inspect script.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 59.
- **Any-site case:** Exactly the annotation the 2026-07-01 defense predicted and ASC now writes: 'const m: Manifest = buildSiteManifest(...)' for a custom regenerate or inspect script.

## audit-adapter-serializemanifest: `serializeManifest`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site using the cairnManifest Vite plugin resolves it from the root barrel at build time. Demoting it breaks the build of every consumer that has never heard of the function.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 60.
- **Any-site case:** Any site using the cairnManifest Vite plugin resolves it from the root barrel at build time. Demoting it breaks the build of every consumer that has never heard of the function.

## audit-adapter-verifyreferences: `verifyReferences`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Same structural necessity through the vite plugin, plus a correctness one: 'references have no prerender backstop, so this is their only build-time integrity gate'. Without it a site ships broken reference edges.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 61.
- **Any-site case:** Same structural necessity through the vite plugin, plus a correctness one: 'references have no prerender backstop, so this is their only build-time integrity gate'. Without it a site ships broken reference edges.

## audit-adapter-verifymanifest: `verifyManifest`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The drift detector between committed manifest and corpus, so 'a raw-git edit fails the build loudly'. Every site whose authors sometimes edit markdown outside the admin needs it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 62.
- **Any-site case:** The drift detector between committed manifest and corpus, so 'a raw-git edit fails the build loudly'. Every site whose authors sometimes edit markdown outside the admin needs it.

## audit-adapter-conceptdescriptor: `ConceptDescriptor`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. CairnRuntime.concepts is how a site enumerates its content model at runtime, and the descriptor carries the resolved values (singular, permalink, datePrefix, routing) a ConceptConfig deliberately leaves unset.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 63.
- **Any-site case:** CairnRuntime.concepts is how a site enumerates its content model at runtime, and the descriptor carries the resolved values (singular, permalink, datePrefix, routing) a ConceptConfig deliberately leaves unset.

## audit-adapter-navmenuconfig: `NavMenuConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Declaring editor.nav is what turns /admin/nav from a 404 into a working screen, an engine route a site cannot otherwise reach; configPath and menuName bind it to YAML the site also reads with extractMenu.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 64.
- **Any-site case:** Declaring editor.nav is what turns /admin/nav from a 404 into a working screen, an engine route a site cannot otherwise reach; configPath and menuName bind it to YAML the site also reads with extractMenu.

## audit-adapter-previewconfig: `PreviewConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. There is no other route to a styled preview: 'the admin deliberately never loads the site's CSS, so a design-accurate preview needs the site to name its compiled stylesheets here' (core.md:165).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 65.
- **Any-site case:** There is no other route to a styled preview: 'the admin deliberately never loads the site's CSS, so a design-accurate preview needs the site to name its compiled stylesheets here' (core.md:165).
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-assetconfig: `AssetConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The switch that turns R2 media on at all, carrying zone facts a Worker cannot detect: transformations 'is a per-zone setting that the dashboard or API turns on, not something a Worker can flip'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 66.
- **Any-site case:** The switch that turns R2 media on at all, carrying zone facts a Worker cannot detect: transformations 'is a per-zone setting that the dashboard or API turns on, not something a Worker can flip'.
- **Amendment (4b conformance pass, Task 14):** this ratified keep loses its `variants` member,
  per sitting ruling 4 (2026-09-01, the `variants` evidence sweep), not a silent overturn of the
  keep verdict above. Sweep evidence (repo, file, hit-or-no-hit) is recorded once, at
  `audit-adapter-variantspec` (closed), and not restated here. `AssetConfig` itself stays kept on
  the any-site case recorded above, which names `transformations`, not `variants`; see
  `audit-media-resolvedassetconfig` (re-tested) for the rest of this same amendment.

## audit-adapter-senderconfig: `SenderConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every cairn site sets email: { from }, one of four required adapter members. A site building its adapter in pieces (a shared base across sites, a test fixture) annotates it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 67.
- **Any-site case:** Every cairn site sets email: { from }, one of four required adapter members. A site building its adapter in pieces (a shared base across sites, a test fixture) annotates it.

## audit-adapter-vocabularyentry: `VocabularyEntry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The pre-beta harvest records the failure without it: two ports 'independently reimplemented a one-word capitalize transform', collapsing the frozen slug value and the editable display label into one.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 68.
- **Any-site case:** The pre-beta harvest records the failure without it: two ports 'independently reimplemented a one-word capitalize transform', collapsing the frozen slug value and the editable display label into one.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-navnode: `NavNode`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. extractMenu returns NavNode[] and a site's header component takes it as a prop. Typing a Svelte prop requires the name; inference does not cross a component boundary.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 69.
- **Any-site case:** extractMenu returns NavNode[] and a site's header component takes it as a prop. Typing a Svelte prop requires the name; inference does not cross a component boundary.

## audit-adapter-siteconfig: `SiteConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. parseSiteConfig's return, feeding extractMenu, extractVocabulary, and composeRuntime. Every family repo exports the parsed config from one module and consumes it in several, requiring the annotation.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 70.
- **Any-site case:** parseSiteConfig's return, feeding extractMenu, extractVocabulary, and composeRuntime. Every family repo exports the parsed config from one module and consumes it in several, requiring the annotation.

## audit-adapter-glyph: `glyph`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The bridge from a site's own IconSet to the hast Element a component's build must return. Hand-rolling h('svg') lets the fields.icon picker's values and the rendered glyphs drift apart.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 71.
- **Any-site case:** The bridge from a site's own IconSet to the hast Element a component's build must return. Hand-rolling h('svg') lets the fields.icon picker's values and the rendered glyphs drift apart.
- **Annotation (conventions pass, Task 3):** renamed `glyph` → `renderGlyph`
  (`convention-bare-noun-functions`: an exported function's name begins with a verb, and `glyph`
  named only its return). Names only; the signature and behavior are unchanged.

## audit-adapter-iconset: `IconSet`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site exports its icon map from a components module and hands it to glyph and to rendering.icons. The type keeps the map's keys lined up with what fields.icon stores, 'the picked glyph's name'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 72.
- **Any-site case:** A site exports its icon map from a components module and hands it to glyph and to rendering.icons. The type keeps the map's keys lined up with what fields.icon stores, 'the picked glyph's name'.

## audit-adapter-imagevalue: `ImageValue`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The stored shape of an image field a delivery route reads out of frontmatter to build a card or an OG tag. The engine writes it, the site reads it, the site cannot define it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 73.
- **Any-site case:** The stored shape of an image field a delivery route reads out of frontmatter to build a card or an OG tag. The engine writes it, the site reads it, the site cannot define it.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-validationresult: `ValidationResult`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The return of Fieldset.validate. A site validating content outside the admin (a bulk importer, a migration script, a pre-commit corpus check) branches on ok and must annotate the discriminated union.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 74.
- **Any-site case:** The return of Fieldset.validate. A site validating content outside the admin (a bulk importer, a migration script, a pre-commit corpus check) branches on ok and must annotate the discriminated union.

## audit-adapter-inferfieldset: `InferFieldset`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A typed delivery route gets its frontmatter type from InferFieldset<typeof postFields> instead of a hand-maintained parallel interface that silently drifts from the schema. The engine can prevent that drift; a site cannot.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 75.
- **Any-site case:** A typed delivery route gets its frontmatter type from InferFieldset<typeof postFields> instead of a hand-maintained parallel interface that silently drifts from the schema. The engine can prevent that drift; a site cannot.

## audit-adapter-cairnref: `CairnRef`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. LinkResolve's parameter. Any site supplying its own link resolver writes (ref: CairnRef) => string | undefined, and the {concept, id} pair is the permanent-id model a slug-keyed hand-roll breaks on rename.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 76.
- **Any-site case:** LinkResolve's parameter. Any site supplying its own link resolver writes (ref: CairnRef) => string | undefined, and the {concept, id} pair is the permanent-id model a slug-keyed hand-roll breaks on rename.

## audit-adapter-linkresolve: `LinkResolve`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The function a site's delivery layer supplies so cairn: tokens become live URLs, under a two-mode contract with real consequences: 'undefined is a preview miss; a resolver that throws is the build backstop'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 77.
- **Any-site case:** The function a site's delivery layer supplies so cairn: tokens become live URLs, under a two-mode contract with real consequences: 'undefined is a preview miss; a resolver that throws is the build backstop'.

## audit-adapter-parsemarkdown: `parseMarkdown`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A build script or migration reading committed markdown must split frontmatter and body the way the engine's writer joined them. A hand-rolled --- regex diverges on a body rule, an empty block, CRLF.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 78.
- **Any-site case:** A build script or migration reading committed markdown must split frontmatter and body the way the engine's writer joined them. A hand-rolled --- regex diverges on a body rule, an empty block, CRLF.

## audit-adapter-filechange: `FileChange`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Backend.commit's changes parameter. Its null convention is the trap: 'write content, or delete the path when content is null'. A custom backend treating null as an empty file silently stops deletions working.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 79.
- **Any-site case:** Backend.commit's changes parameter. Its null convention is the trap: 'write content, or delete the path when content is null'. A custom backend treating null as an empty file silently stops deletions working.

## audit-adapter-repofile: `RepoFile`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site backing cairn with GitLab, Gitea, or plain git implements readEntries and cannot type its return without the name.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 80.
- **Any-site case:** A site backing cairn with GitLab, Gitea, or plain git implements readEntries and cannot type its return without the name.

## audit-adapter-commitauthor: `CommitAuthor`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Same custom-backend need as RepoFile, plus a product invariant: author is the signed-in editor while committer is cairn-cms[bot], and a backend collapsing the two destroys the attribution model.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 81.
- **Any-site case:** Same custom-backend need as RepoFile, plus a product invariant: author is the signed-in editor while committer is cairn-cms[bot], and a backend collapsing the two destroys the attribution model.

## audit-adapter-githubappprovider: `GithubAppProvider`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site reading cairn.backend.owner/.repo to build a view-on-GitHub link or deploy badge. The pre-beta harvest records a port hand-rolling a REPO constant for exactly this, then proving it unnecessary.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 82.
- **Any-site case:** A site reading cairn.backend.owner/.repo to build a view-on-GitHub link or deploy badge. The pre-beta harvest records a port hand-rolling a REPO constant for exactly this, then proving it unnecessary.

## audit-adapter-backendprovider: `BackendProvider`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The adapter's backend member type and the seam that makes cairn GitHub-defaulted rather than GitHub-required: 'GitLab, Gitea, or plain git can supply its own provider later without the engine changing'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 83.
- **Any-site case:** The adapter's backend member type and the seam that makes cairn GitHub-defaulted rather than GitHub-required: 'GitLab, Gitea, or plain git can supply its own provider later without the engine changing'.

## audit-adapter-backend: `Backend`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Two cases, the second measured: a custom store implements it, and every site running the dev-backend package has it flowing through locals.cairnBackend on every local request.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 84.
- **Any-site case:** Two cases, the second measured: a custom store implements it, and every site running the dev-backend package has it flowing through locals.cairnBackend on every local request.

## audit-adapter-githubapp: `githubApp`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The required backend member of every adapter, with a security-shaped contract: the private key 'stays the Worker secret ... read at request time and never from the adapter source'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 85.
- **Any-site case:** The required backend member of every adapter, with a security-shaped contract: the private key 'stays the Worker secret ... read at request time and never from the adapter source'.

## audit-adapter-emailrecipient: `EmailRecipient`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site with a custom SendMagicLink must handle cc/bcc in both forms, and the reference records a platform asymmetry it would otherwise learn from a 400: 'replyTo takes a single address only'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 86.
- **Any-site case:** A site with a custom SendMagicLink must handle cc/bcc in both forms, and the reference records a platform asymmetry it would otherwise learn from a 400: 'replyTo takes a single address only'.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-magiclinkmessage: `MagicLinkMessage`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The entire contract between engine and site on the custom-sender seam, since buildMagicLinkMessage was demoted: 'A consumer supplying a custom SendMagicLink receives an already-built MagicLinkMessage rather than building one.'
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 87.
- **Any-site case:** The entire contract between engine and site on the custom-sender seam, since buildMagicLinkMessage was demoted: 'A consumer supplying a custom SendMagicLink receives an already-built MagicLinkMessage rather than building one.'

## audit-adapter-sendmagiclink: `SendMagicLink`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The injection point for any site not on Cloudflare Email Sending, carrying a rule with no other home: 'a custom sender must not embed the message body or the magic link in what it throws'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 88.
- **Any-site case:** The injection point for any site not on Cloudflare Email Sending, carrying a rule with no other home: 'a custom sender must not embed the message body or the magic link in what it throws'.

## audit-adapter-emailsender: `EmailSender`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. CairnEnv['EMAIL']'s type, whose deliberate Promise<unknown> is what lets a real Cloudflare binding satisfy it with no cast in a site's app.d.ts. Without the widening every site writes a cast.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 89.
- **Any-site case:** CairnEnv['EMAIL']'s type, whose deliberate Promise<unknown> is what lets a real Cloudflare binding satisfy it with no cast in a site's app.d.ts. Without the widening every site writes a cast.

## audit-adapter-accessmap: `AccessMap`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site declares the map once and imports it twice, into createAuthGuard and the adapter, so the shared module's export needs annotating; the keys are a composition-validated vocabulary, not free strings.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 90.
- **Any-site case:** A site declares the map once and imports it twice, into createAuthGuard and the adapter, so the shared module's export needs annotating; the keys are a composition-validated vocabulary, not free strings.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-rolesdeclaration: `RolesDeclaration`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Same declare-once-import-twice shape as AccessMap, and it is defineAccess's first parameter, so a site's access module must name it to accept the vocabulary it validates against.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 91.
- **Any-site case:** Same declare-once-import-twice shape as AccessMap, and it is defineAccess's first parameter, so a site's access module must name it to accept the vocabulary it validates against.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-resolvecapability: `resolveCapability`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A custom admin route gating itself against a site vocabulary. Its fail-closed default is policy a hand-roll inverts: an absent role name returns 'none' rather than locking the person out of sign-in.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 92.
- **Any-site case:** A custom admin route gating itself against a site vocabulary. Its fail-closed default is policy a hand-roll inverts: an absent role name returns 'none' rather than locking the person out of sign-in.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-canreach: `canReach`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The single authority every enforcement and visibility point reads, so a site's guard and the engine's sidebar agree. Its owner and editors carve-outs and deepest-prefix href matching are engine policy.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 93.
- **Any-site case:** The single authority every enforcement and visibility point reads, so a site's guard and the engine's sidebar agree. Its owner and editors carve-outs and deepest-prefix href matching are engine policy.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-defineaccess: `defineAccess`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Construction-time validation of a declaration that would otherwise fail in production as a wrong grant, including the rule that stops an empty list reading as everyone: owner-only must be written ['owner'].
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 94.
- **Any-site case:** Construction-time validation of a declaration that would otherwise fail in production as a wrong grant, including the rule that stops an empty list reading as everyone: owner-only must be written ['owner'].
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).
- **Annotation (conventions pass, Task 9):** the keep stands; the first parameter widens to
  `roles: RolesDeclaration | undefined`, defaulting to the same implicit vocabulary
  `resolveCapability`/`roleHome`/`resolveOwnerLevelRoles` already fall back to, which is what let
  `audit-adapter-default-roles` execute its own pre-authorized retire in the same task. The const
  generic and return type are unchanged (round-2 F-5: dropping the generic would widen every
  consumer's inferred literal to `AccessMap`, a type regression). Every other validated rule,
  including the owner-only-must-be-written-`['owner']` empty-list check this entry names, is
  unchanged.

## audit-adapter-defineroles: `defineRoles`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site whose people are not called editor: a club with instructors, a team with coaches. The owner reservation is engine-enforced 'since the last-owner guard and the bootstrap owner both anchor on it'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 95.
- **Any-site case:** Any site whose people are not called editor: a club with instructors, a team with coaches. The owner reservation is engine-enforced 'since the last-owner guard and the bootstrap owner both anchor on it'.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-editor: `Editor`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every custom admin route reads locals.cairnEditor and every helper taking the signed-in identity types its parameter. A re-declared shape drifts the moment the engine adds a field.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 96.
- **Any-site case:** Every custom admin route reads locals.cairnEditor and every helper taking the signed-in identity types its parameter. A re-declared shape drifts the moment the engine adds a field.

## audit-adapter-cairnenv: `CairnEnv`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every factory touching platform bindings takes it, and its structural acceptance lets a site's wrangler-generated Env satisfy cairn with no cast, a divergence the engine fixed engine-side.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 97.
- **Any-site case:** Every factory touching platform bindings takes it, and its structural acceptance lets a site's wrangler-generated Env satisfy cairn with no cast, a divergence the engine fixed engine-side.

## audit-adapter-app-locals: `App.Locals`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The engine writes four keys onto event.locals that a site's routes read. The alternative is a hand-written declare global block tracking engine-owned fields that C2 already renamed once.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 98.
- **Any-site case:** The engine writes four keys onto event.locals that a site's routes read. The alternative is a hand-written declare global block tracking engine-owned fields that C2 already renamed once.

## audit-adapter-extractmenu: `extractMenu`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The site's public nav comes from the same YAML the engine's nav editor writes; reading it by hand means reimplementing the depth bound and validation, so editor and render can disagree.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 99.
- **Any-site case:** The site's public nav comes from the same YAML the engine's nav editor writes; reading it by hand means reimplementing the depth bound and validation, so editor and render can disagree.
- **Annotation (conventions pass, Task 3):** renamed `extractMenu` → `readMenu` (`convention-verb-rules`:
  `read*` reads a committed artifact or declaration into typed shape, retiring `extract*`). Names
  only; the signature and behavior are unchanged.

## audit-adapter-extractvocabulary: `extractVocabulary`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The read half of the tag vocabulary the admin writes. The harvest records two themes hand-rolling capitalization around it, unaware 'a theme can commit a static vocabulary list ... purely for display labels'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 100.
- **Any-site case:** The read half of the tag vocabulary the admin writes. The harvest records two themes hand-rolling capitalization around it, unaware 'a theme can commit a static vocabulary list ... purely for display labels'.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).
- **Annotation (conventions pass, Task 3):** renamed `extractVocabulary` → `readVocabulary`
  (`convention-verb-rules`: `read*` reads a committed artifact or declaration into typed shape,
  retiring `extract*`). Names only; the signature and behavior are unchanged.

## audit-adapter-parsesiteconfig: `parseSiteConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The typed entry to the YAML half of cairn's two-file config and the enforcer of the boundary between them; a site parsing the YAML itself discovers the split at runtime instead of at startup.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 101.
- **Any-site case:** The typed entry to the YAML half of cairn's two-file config and the enforcer of the boundary between them; a site parsing the YAML itself discovers the split at runtime instead of at startup.

## audit-adapter-componentregistry: `ComponentRegistry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. 'The single source the render pipeline and the editor palette both read.' A site exports its registry from one module and passes it to createRenderer from another, the shape three family chassis modules have.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 102.
- **Any-site case:** 'The single source the render pipeline and the editor palette both read.' A site exports its registry from one module and passes it to createRenderer from another, the shape three family chassis modules have.

## audit-adapter-componentdef: `ComponentDef`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site declaring components in one module and registering them in another types the array crossing that boundary; the definition also carries engine-only constraints, like build being deliberately synchronous.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 103.
- **Any-site case:** A site declaring components in one module and registering them in another types the array crossing that boundary; the definition also carries engine-only constraints, like build being deliberately synchronous.

## audit-adapter-defineregistry: `defineRegistry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Turns a list of definitions into the one object both the render pipeline and the editor palette read. Hand-building its get/defaultIcon/iconField lookups goes wrong the moment the engine adds one.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 104.
- **Any-site case:** Turns a list of definitions into the one object both the render pipeline and the editor palette read. Hand-building its get/defaultIcon/iconField lookups goes wrong the moment the engine adds one.

## audit-adapter-definecomponent: `defineComponent`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. It builds the attribute validator from fields.* so 'a component attribute and a concept field validate through identical code', and throws at module load on an attribute type directives cannot carry.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 105.
- **Any-site case:** It builds the attribute validator from fields.* so 'a component attribute and a concept field validate through identical code', and throws at module load on an attribute type directives cannot carry.

## audit-adapter-rendereroptions: `RendererOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The archetype of an absorbed divergence: before the plugin seam a site re-parsed cairn's HTML into a second unified pipeline; after it, the site's plugin composes over the same hast tree.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 106.
- **Any-site case:** The archetype of an absorbed divergence: before the plugin seam a site re-parsed cairn's HTML into a second unified pipeline; after it, the site's plugin composes over the same hast tree.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-siterender: `SiteRender`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Types rendering.render, a required adapter member, and holds the product's load-bearing invariant: 'the one renderer the editor preview and every public page call'. Two renderers would make WYSIWYG a lie.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 107.
- **Any-site case:** Types rendering.render, a required adapter member, and holds the product's load-bearing invariant: 'the one renderer the editor preview and every public page call'. Two renderers would make WYSIWYG a lie.

## audit-adapter-createrenderer: `createRenderer`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The whole markdown pipeline. The barrel is explicit that safe ordering is the only public path: a site assembling its own order puts the sanitize floor in the wrong place, a security defect.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 108.
- **Any-site case:** The whole markdown pipeline. The barrel is explicit that safe ordering is the only public path: a site assembling its own order puts the sanitize floor in the wrong place, a security defect.

## audit-adapter-cairnruntime: `CairnRuntime`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The object every site's server module exports and every admin mount consumes, carrying derivations a site must not redo: 'the runtime and delivery permalinks cannot diverge' because both read the site-config.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 109.
- **Any-site case:** The object every site's server module exports and every admin mount consumes, carrying derivations a site must not redo: 'the runtime and delivery permalinks cannot diverge' because both read the site-config.

## audit-adapter-composeruntime: `composeRuntime`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. There is no cairn site without it: the fold from declaration to running engine, which also applies defaults a site relies on silently (supportContact, the vocabulary snapshot, the URL policy).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 110.
- **Any-site case:** There is no cairn site without it: the fold from declaration to running engine, which also applies defaults a site relies on silently (supportContact, the vocabulary snapshot, the URL policy).

## audit-adapter-conceptconfig: `ConceptConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. defineConcept's parameter and the shape of every content declaration. A multi-site developer factoring shared concept defaults annotates the helper; the URL-policy fields carry declaration-time enforcement.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 111.
- **Any-site case:** defineConcept's parameter and the shape of every content declaration. A multi-site developer factoring shared concept defaults annotates the helper; the URL-policy fields carry declaration-time enforcement.

## audit-adapter-defineconcept: `defineConcept`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Two engine-only jobs: preserving the fieldset's concrete type for typed reads, and throwing at module load on a bad permalink, datePrefix, or routing 'rather than defaulting or resolving silently'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 112.
- **Any-site case:** Two engine-only jobs: preserving the fieldset's concrete type for typed reads, and throwing at module load on a bad permalink, datePrefix, or routing 'rather than defaulting or resolving silently'.

## audit-adapter-fielddescriptor: `FieldDescriptor`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. 'The plain-data descriptor union the form, validator, and inference all read.' A site writing a generic renderer over its own schema switches on it, and exhaustiveness tells it when the engine adds a type.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 113.
- **Any-site case:** 'The plain-data descriptor union the form, validator, and inference all read.' A site writing a generic renderer over its own schema switches on it, and exhaustiveness tells it when the engine adds a type.

## audit-adapter-fieldset: `Fieldset`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. fieldset's return and every ConceptConfig's fields member. It carries descriptors, behavior table, validator, and Standard Schema property at once, none assemblable consistently by hand.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 114.
- **Any-site case:** fieldset's return and every ConceptConfig's fields member. It carries descriptors, behavior table, validator, and Standard Schema property at once, none assemblable consistently by hand.

## audit-adapter-fields: `fields`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The constructor namespace for the whole vocabulary, and the reason the fifteen arms rarely need naming. Its literal preservation is what makes InferFieldset produce a narrowed union rather than string.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 115.
- **Any-site case:** The constructor namespace for the whole vocabulary, and the reason the fifteen arms rarely need naming. Its literal preservation is what makes InferFieldset produce a narrowed union rather than string.

## audit-adapter-fieldset: `fieldset`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. One source of truth for editor form, server validator, and inferred type, with declaration-time enforcement a hand-roll cannot buy: 'A malformed pattern throws at the fieldset() call, not on a later save'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 116.
- **Any-site case:** One source of truth for editor form, server validator, and inferred type, with declaration-time enforcement a hand-roll cannot buy: 'A malformed pattern throws at the fieldset() call, not on a later save'.
- **Annotation (conventions pass, Task 3):** renamed the FUNCTION `fieldset` → `defineFieldset`
  (`convention-bare-noun-functions`: an exported function's name begins with a verb; `define*` is the
  established prefix `defineAdapter`/`defineConcept`/`defineComponent`/`defineRegistry` already use
  for a declaration-time constructor). Names only; the signature and behavior are unchanged. This
  entry is the FUNCTION, disambiguated from the `Fieldset` TYPE entry immediately above (same slug,
  different subject); the type is untouched by this rename.

## audit-adapter-cairnadapter: `CairnAdapter`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. 'The one seam the engine consumes.' A site building its adapter across modules, or shipping a shared base across several sites, annotates it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 117.
- **Any-site case:** 'The one seam the engine consumes.' A site building its adapter across modules, or shipping a shared base across several sites, annotates it.

## audit-adapter-defineadapter: `defineAdapter`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Three engine-only jobs: const-capturing each fieldset so typed reads work at all, failing closed on a mismatched islands pairing, and checking the nine-member contract before any request arrives.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 118.
- **Any-site case:** Three engine-only jobs: const-capturing each fieldset so typed reads work at all, failing closed on a mismatched islands pairing, and checking the nine-member contract before any request arrives.

## audit-sveltekit-orphanbyterow: `OrphanByteRow`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. An R2 key/hash row inside the orphan scan's result, reachable only as result.orphanedBytes[i]; no site drives the janitorial action.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: the interface lost its `export` (no cross-module consumer) and stays module-internal in `media/orphan-scan.ts`. Survives structurally inside `MediaOrphanScanResult.orphanedBytes`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 1.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-brokenrefrow: `BrokenRefRow`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A row of the orphan scan's referenced-but-absent half, reached only by property access from an engine-only action.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: the interface lost its `export` (no cross-module consumer) and stays module-internal in `media/orphan-scan.ts`. Survives structurally inside `MediaOrphanScanResult.brokenRefs`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 2.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-bulkdeleteskip: `BulkDeleteSkip`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Its reason literals ('still-referenced','uncommitted') are the engine's own bulk-delete refusal vocabulary for its own dialog.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes-media.ts`, `content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `media/bulk-delete-plan.ts`, the retires pass's three-case rule: `CairnMediaLibrary.svelte` imports it directly for its own typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 3.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-repointplacement: `RepointPlacement`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A before/after diff row rendered inside the engine's media replace-preview modal.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes-media.ts`, `content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content/media-rewrite.ts`, the retires pass's three-case rule: `content-routes-media.ts` imports it directly for `MediaReplacePreviewEntry.placements` and the replace action's own plan typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 4.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-altplacement: `AltPlacement`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Its three bucket literals are copy decisions in one engine modal; near-identical to RepointPlacement.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes-media.ts`, `content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content/media-rewrite.ts`, the retires pass's three-case rule: both `content-routes-media.ts` and `CairnMediaLibrary.svelte` import it directly for their own typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 5.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-branchref: `BranchRef`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None, and it leaks the cairn/<concept>/<id> pending-branch layout into the public surface.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes-media.ts`, `content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `media/rewrite-plan.ts`, the retires pass's three-case rule: `content-routes-media.ts` imports it directly for `MediaReplacePreviewPlan.branchDelta` and `MediaAltPreviewPlan.branchDelta`.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 6.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaorphanscanresult: `MediaOrphanScanResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Returned by an owner-only maintenance action inside the engine's Media Library.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes-media.ts`, `content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `media/orphan-scan.ts`, the retires pass's three-case rule: both `content-routes-media.ts` and `CairnMediaLibrary.svelte` import it directly for their own typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 7.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaorphanpurgeresult: `MediaOrphanPurgeResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The purge modal's result bag, consumed in-process by the engine's own component.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-media.ts`, the retires pass's three-case rule: `CairnMediaLibrary.svelte` imports it directly for its own typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 8.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaaltpreviewentry: `MediaAltPreviewEntry`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A row inside MediaAltPreviewPlan, itself an engine two-step modal's intermediate state.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: the interface lost its `export` (no cross-module consumer) and stays module-internal in `content-routes-media.ts`. Survives structurally inside `MediaAltPreviewPlan.entries`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 9.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaaltpreviewplan: `MediaAltPreviewPlan`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The preview half of a preview-then-apply flow entirely inside the engine's Media Library.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-media.ts`, the retires pass's three-case rule: `CairnMediaLibrary.svelte` imports it directly for its own typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 10.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediareplacepreviewentry: `MediaReplacePreviewEntry`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A row inside the replace-preview plan; no site drives mediaReplacePreviewAction.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-media.ts`, the retires pass's three-case rule: `CairnMediaLibrary.svelte` imports it directly for its own typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 11.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediareplacepreviewplan: `MediaReplacePreviewPlan`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None, and its branchDelta member drags the pending-branch model public with it.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-media.ts`, the retires pass's three-case rule: `CairnMediaLibrary.svelte` imports it directly for its own typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 12.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediabulkdeleteresult: `MediaBulkDeleteResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The bulk-delete action's result bag, rendered by the engine's own library screen.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-media.ts`, the retires pass's three-case rule: `CairnMediaLibrary.svelte` imports it directly for its own typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 13.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-dictionaryaddresult: `DictionaryAddResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A single-field wrapper over string[], echoed back to the editor component in the same process.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-dictionary.ts`, the retires pass's three-case rule: `content-routes-dictionary.test.ts` imports it directly.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 14.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-tidykeyproberesult: `TidyKeyProbeResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A literal union describing an Anthropic key probe the engine runs for its own settings screen; inferred from data.keyStatus.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `tidy-key-health.ts`, and its re-export through `tidy-key-probe.ts` stays too (`content-routes-settings.ts` imports it from there); only its barrel line in `sveltekit/index.ts` is dropped. Survives structurally inside `SettingsData` (`Exclude<SettingsData['keyStatus'], 'missing'>`); accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 15.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-tidyresult: `TidyResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. It also pins Anthropic SDK field naming (input_tokens/output_tokens) into cairn's public surface.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-tidy.ts`, since `tidyAction`'s return type composes into `createContentRoutesInternal` (`content-routes.ts`, a different module), which the `.d.ts` emitter must be able to name.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 16.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaaltpropagatefailure: `MediaAltPropagateFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None directly. components.md shows the union ContentFormFailure as the form prop, never this arm.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-media.ts`, the retires pass's three-case rule: `CairnMediaLibrary.svelte` imports it directly for its own typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 17.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediabulkfailure: `MediaBulkFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Structurally identical to five siblings; six exported names for { error: string } is itself an evenness defect.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-media.ts`, the retires pass's three-case rule: `CairnMediaLibrary.svelte` imports it directly for its own typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 18.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaupdatefailure: `MediaUpdateFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A site mounting CairnMediaLibrary types form as ContentFormFailure, the union, not this arm.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-media.ts`, since `mediaUpdateAction`'s return type composes into `createContentRoutesInternal` (`content-routes.ts`, a different module), which the `.d.ts` emitter must be able to name.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 19.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediareplacefailure: `MediaReplaceFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None; same union-not-arm reasoning as MediaUpdateFailure.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-media.ts`, the retires pass's three-case rule: `CairnMediaLibrary.svelte` imports it directly for its own typing.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 20.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediadeleterefusal: `MediaDeleteRefusal`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The engine's own still-referenced refusal, rendered by the engine's own delete dialog.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-media.ts`, since `mediaDeleteAction`'s return type composes into `createContentRoutesInternal` (`content-routes.ts`, a different module), which the `.d.ts` emitter must be able to name.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 21.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediauploadfailure: `MediaUploadFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string } again, delivered through the ContentFormFailure union.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-media.ts`, since `uploadAction`'s and `mediaLibraryUploadAction`'s return type composes into `createContentRoutesInternal` (`content-routes.ts`, a different module), which the `.d.ts` emitter must be able to name.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 22.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-vocabularysavefailure: `VocabularySaveFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string } from an engine settings action; kit's generated ActionData types the form.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-settings.ts`, since `vocabularySaveAction`'s return type composes into `createContentRoutesInternal` (`content-routes.ts`, a different module), which the `.d.ts` emitter must be able to name.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 23.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-settingssavefailure: `SettingsSaveFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string }; nothing in the docs asks a site to write this name.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: its barrel and subpath re-exports drop (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export` in `content-routes-settings.ts`, since `settingsSaveAction`'s return type composes into `createContentRoutesInternal` (`content-routes.ts`, a different module), which the `.d.ts` emitter must be able to name.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 24.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-navsavefailure: `NavSaveFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The doc's own nav-editor example passes data: NavLoadData and lets kit's ActionData type the form.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1: the interface lost its `export` (no cross-module consumer) and stays module-internal in `nav-routes.ts`. Survives structurally inside `NavRoutes.navSaveAction`'s return type; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 25.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-renamefailure: `RenameFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string }, delivered to the engine's own dialog through ContentFormFailure.
- **Reopens on:** closed. Executed by the conventions pass, Task 5: `renameAction` re-typed to
  `ActionFailure<ContentFormFailure>`; the interface lost its `export` (no cross-module consumer)
  and stays module-internal in `content-routes-core.ts`, used only by its own `satisfies`
  validation clauses. Its one field folds into `ContentFormFailure.error`.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 26.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-createfailure: `CreateFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string }; identical in shape to four siblings.
- **Reopens on:** closed. Executed by the conventions pass, Task 5: `createAction` re-typed to
  `ActionFailure<ContentFormFailure>`; the interface lost its `export` (no cross-module consumer)
  and stays module-internal in `content-routes-core.ts`, used only by its own `satisfies`
  validation clauses. Its one field folds into `ContentFormFailure.error`.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 27.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-previewmintfailure: `PreviewMintFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string } from the Share-link action, surfaced through the union.
- **Reopens on:** closed. Executed by the conventions pass, Task 5: `previewMintAction`,
  `previewRevokeAction`, and the `missingPreviewTableFailure` internal helper all re-typed to
  `ActionFailure<ContentFormFailure>`; the interface lost its `export` (no cross-module consumer)
  and stays module-internal in `content-routes-core.ts`, used only by its own `satisfies`
  validation clauses. Its one field folds into `ContentFormFailure.error`.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 28.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-deleterefusal: `DeleteRefusal`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None by name. Richer than its siblings, but still delivered to the engine's delete dialog as ContentFormFailure.
- **Reopens on:** closed. Executed by the conventions pass, Task 5: `deleteAction`,
  `listDeleteAction`, and the `deleteEntry` internal helper all re-typed to
  `ActionFailure<ContentFormFailure>`; the barrel and subpath re-exports drop
  (`content-routes.ts`, `sveltekit/index.ts`), but the interface KEEPS its module-level `export`
  in `content-routes-core.ts` (`convention-internal-sibling-comment`), the retires pass's
  three-case rule: `reproductions/stories/publish.ts` imports it directly for the
  `publish/refusal-banner` fixture. Its fields fold into `ContentFormFailure.inboundLinks`,
  `.inboundKind`, and `.id`.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 29.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-savefailure: `SaveFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Weakest-plausible: a site might care that body round-trips on a broken-link refusal. It still reads that through the union.
- **Reopens on:** closed. Executed by the conventions pass, Task 5: `saveAction`, `publishAction`,
  and the `saveToBranch` internal helper all re-typed to `ActionFailure<ContentFormFailure>`; the
  interface lost its `export` (no cross-module consumer) and stays module-internal in
  `content-routes-core.ts`, used only by its own `satisfies` validation clauses. Its fields fold
  into `ContentFormFailure.brokenLinks` and `.body`.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 30.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-contentformfailure: `ContentFormFailure`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site mounting CairnMediaLibrary or the entry editor on its own /admin route must annotate the form prop; components.md line 204 writes this name.
- **Reopens on:** closed. Executed by the conventions pass, Task 5, exactly per the shape below:
  `ContentFormFailure` is now one flat, all-optional interface in `content-routes-core.ts`
  (re-exported from `content-routes.ts` at its same public name), replacing the `Partial<>`
  eleven-way intersection. The five core carriers (`SaveFailure`, `DeleteRefusal`,
  `RenameFailure`, `CreateFailure`, `PreviewMintFailure`) retired leak-free: every carrying
  action (eight members plus three internal helpers) re-typed to
  `ActionFailure<ContentFormFailure>` before the retire, verified with `check:surface`'s
  regenerated `api-surface.md` carrying zero hits for any of the five names. The six media/tidy
  arms are untouched, per the audit's own record of what carries which fields.
- **Shape:** Declare it as one flat interface with every field optional, each documented against the action that sets it, and keep the eleven arms module-internal. Today it is a `Partial<>` over an eleven-way intersection of the retiring arm types, which cannot survive their retirement as written and whose meaning, whichever action last failed, is not readable from the intersection.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 31.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-revertfailure: `RevertFailure`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site rendering its own history screen branches on the reason discriminant to distinguish a blocking draft from a stale head.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 3, with one correction the docket's phrasing collapsed: `HistoryData.draft.startedAt` and `RevertFailure`'s `draft_exists.draftStartedAt` are two different types, not one field renamed twice, so each takes its own name rather than a shared `lastSavedAt` — `HistoryData.draft.startedAt` becomes the bare `lastSavedAt` (the container already says "draft"), and `draftStartedAt` becomes the qualified `draftLastSavedAt`, matching its sibling `draftEditor` (an unqualified `lastSavedAt` beside `draftEditor` would unbalance the pair). Both compensating "keeps its name for API stability" doc comments are deleted.
- **Shape:** Rename draftStartedAt and HistoryData's startedAt to lastSavedAt, dropping the compensating doc-comment prose. The comment admits both are wrong and keeps them 'for API stability', but churn is free until beta, so the stability plea does not license the wrong name.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 32.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-tidyclient: `TidyClient`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site pointing tidy at its own gateway or proxy supplies a client. Rare, but real, and no other seam serves it.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 4: `TidyClient` narrows to
  `tidy(request, options)`, taking `{ model, system, text, effort? }` and returning
  `{ corrected, refused, tokens: { input, output } }`, plus the unchanged optional `models.list`
  probe. `max_tokens`, `output_config.effort`, `stop_reason`, and `usage.*` all leave the public
  contract; the Anthropic wire shape (`AnthropicWireClient`) is a module-internal type inside
  `lazyAnthropicClient` in `content-routes-context.ts`, the one adapter that still speaks it. Seam
  fit: the narrow interface keeps both load-bearing members the wire shape carried (the
  model-listing probe `probeTidyKey` degrades without, and the cancellation signal
  `tidyTimeoutMs` pairs with), re-expressed in engine-owned terms, so a site's hand-rolled gateway
  client still only needs to implement one small method.
- **Shape:** Replace the transcribed Anthropic wire shape (max_tokens, output_config.effort, stop_reason, usage.*) with a narrow engine-owned interface taking a prompt and a system string and returning corrected text plus a coarse usage record, with the SDK adapter kept internal.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 33.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-fragmenttarget: `FragmentTarget`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { id; title; body } feeds the editor's fragment picker; a site mounting CairnEntryEditor passes data whole.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `content-routes-core.ts` (`FragmentPicker.svelte` imports it directly); its re-export dropped from `content-routes.ts` and its barrel line from `sveltekit/index.ts`. Survives structurally inside `EditData`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 34.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-medialibraryentry: `MediaLibraryEntry`  (keep, 2026-08-26, any-site audit; supersedes the audit's retire)

- **Verdict:** keep, superseding the audit's retire on prop-signature necessity. The toolkit-seams pass publishes `MediaPicker` from `/admin-toolkit`, and this type sits in its `entries` prop signature, so the `audit-admin-itemlabel` test applies verbatim: a consumer writing the prop needs the name. Canonical home is `/admin-toolkit`, beside the component, exactly as `ItemLabel` publishes beside `Pagination` and `ListToolbar`. `/sveltekit` keeps its own re-export as R4 closure over `MediaLibraryData.assets`, which stays public; dropping it would recreate the closure leak R4 exists to remove. A re-export from the stated canonical home is not a second home, so C1 holds.
- **Reopens on:** closed. Executed by the toolkit-seams pass, Task 1.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 35; superseded in [2026-08-26 toolkit-seams pass](../superpowers/plans/2026-08-26-toolkit-seams-pass.md), Task 1.
- **Any-site case:** Any site composing `MediaPicker` into an admin screen it builds itself annotates the entries it passes, which is the loader's own `MediaLibraryData.assets` array.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-usageentry: `UsageEntry`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None by name; reached through usage[hash].entries. Its origin member also publishes the pending-branch model.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1, per the 2026-08-31 sitting's
  ruling on the carried decision below: every export row drops from `content-routes-media.ts`,
  `content-routes.ts`, and `sveltekit/index.ts`, and the interface keeps its module-level `export`
  in `media/usage.ts` (the retires pass's three-case rule): the type has eight-plus in-engine
  namers (`content-routes-media.ts`, `media/orphan-scan.ts`, `media/bulk-delete-plan.ts`,
  `content-routes-core.ts`, `CairnMediaLibrary.svelte`), so inlining it at one remaining use site
  is not viable, the docket's premise for that branch being false at HEAD. `ContentFormFailure`'s
  surviving `usage?: UsageEntry[]` field is the public recovery: a consumer indexes
  `NonNullable<ContentFormFailure['usage']>[number]`.
- **Progress note (conventions pass, Task 5, 2026-08-31):** does NOT retire in this task. The
  flattened `ContentFormFailure` itself carries `usage?: UsageEntry[]` (set by a blocked media
  delete or replace), so the flat keep is its own surviving carrier; retiring the name here would
  leave `ContentFormFailure.usage`'s element type unnameable. `UsageEntry` stays exported. The
  retire decision routes to 4b, beside Tier 1 (where `UsageEntry`'s other carriers,
  `MediaDeleteRefusal`/`MediaReplaceFailure`, retire), which must decide inline-vs-keep for the
  whole family together rather than splitting `ContentFormFailure`'s carrier from its siblings'.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 36.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediausageinfo: `MediaUsageInfo`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A per-hash overlay the engine's own library renders; no seam takes or returns it, so its Extension tier is unearned.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `content-routes-media.ts` (`reproductions/fixtures.ts` imports it directly); its re-export dropped from `content-routes.ts` and its barrel line from `sveltekit/index.ts`. Survives structurally inside `MediaLibraryData`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 37.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-uploadresult: `UploadResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. The proposed home is wrong: media/index.ts's header restricts /media to node-safe projection and excludes admin/ingest internals, and createMediaRoute sets the opposite precedent. Membership alone cannot carry it: Unstable, no worked example, consumed by components/media-upload-outcome.ts like the retired result bags.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 1, per the verify-wins
  resolution (the conductor default, stated and unobjected at the 2026-08-31 sitting): the
  VERIFIED flat retire runs, not the ranked reshape-and-relocate below (`verify-route-factories.md`
  line 126 overturns the rank file's `/media` relocate, since `media/index.ts`'s own header
  restricts that subpath to node-safe pure projection and explicitly excludes the manifest CRUD
  and ingest internals this type belongs to). Its barrel and subpath re-exports drop
  (`content-routes.ts`, `sveltekit/index.ts`), but the interface keeps its module-level `export`
  in `content-routes-media.ts`, the retires pass's three-case rule: `media-upload-outcome.ts`
  imports it directly, and `uploadAction`'s/`mediaLibraryUploadAction`'s return type also composes
  into `createContentRoutesInternal` (`content-routes.ts`, a different module), which the `.d.ts`
  emitter must be able to name.
- **Shape:** Move it to /media beside MediaEntry, whose type its own body names, so a developer finds cairn's media vocabulary in one subpath instead of split between /media and /sveltekit. Declined at execution: the verify-wins resolution above runs the flat retire instead.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 38.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-navpageoption: `NavPageOption`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. nav-routes.ts calls it 'one page option for the URL picker datalist' — a widget detail, not a contract.
- **Reopens on:** closed. Executed by the retires pass, Task 2: dropped the `export` keyword in `nav-routes.ts` (consumed only inside its declaring module, by `NavLoadData.pages`); its barrel line dropped from `sveltekit/index.ts`. Survives structurally inside `NavLoadData`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 39.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-navconcept: `NavConcept`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { id; label } reached through AdminShellData.concepts; a site with nav ambitions uses the navLayout seam instead.
- **Reopens on:** closed. Executed by the retires pass, Task 2: dropped the `export` keyword in `content-routes-core.ts` (consumed only inside its declaring module, by `AdminShellData.concepts`); its re-export dropped from `content-routes.ts` and its barrel line from `sveltekit/index.ts`. Survives structurally inside `AdminShellData` (`Extract<AdminShellData, { public: false }>['concepts'][number]`) and, transitively, `ReproStory`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 40.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-gettingstarted: `GettingStarted`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A hard-coded total: 3 in the type is the tell that this is cairn's own onboarding copy, not a contract.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `content/getting-started.ts` (`content-routes-core.ts` imports it directly); its barrel line dropped from `sveltekit/index.ts`. Survives structurally inside `HelpData`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 41.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-markdownreferencerow: `MarkdownReferenceRow`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A markdown cheat-sheet row the engine authors and renders; reached as data.reference[i].
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `components/markdown-reference.ts` (`HelpHome.svelte` and `content-routes-core.ts` import it directly); its barrel line dropped from `sveltekit/index.ts`. Survives structurally inside `HelpData`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 42.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-historyentry: `HistoryEntry`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None by name; reached as data.entries[i] when a site mounts the history component.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `types.ts` (`content-routes-core.ts` imports it directly); its barrel line dropped from `sveltekit/index.ts`. Survives structurally inside `HistoryData`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 43.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-entrysummary: `EntrySummary`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Plausible but not demanding: a helper like badge(e: EntrySummary). Satisfied by ListData['entries'][number].
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `content-routes-core.ts`, and its re-export through `content-routes.ts` stays too (`ConceptList.svelte` and `reproductions/fixtures.ts` both import it from there); only its barrel line in `sveltekit/index.ts` is dropped. Survives structurally inside `ListData`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 44.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-advisoryaction: `AdvisoryAction`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { label; href? } inside an advisory the engine both produces and renders.
- **Reopens on:** closed. Executed by the retires pass, Task 2: dropped the `export` keyword in `content/advisories.ts` (consumed only inside its declaring module, by `AdvisoryNotice.actions`); every barrel line dropped. Survives structurally inside `EditData` (via `AdvisoryNotice`); accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 45.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-advisorynotice: `AdvisoryNotice`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. There is no seam for a site to contribute an advisory, so exporting the shape advertises an extension point that does not exist.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `content/advisories.ts` (`content-routes-core.ts` imports it directly for `EditData.advisories`); every barrel/re-export line dropped (`content-routes-core.ts`, `content-routes.ts`, `sveltekit/index.ts`). Survives structurally inside `EditData`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 46.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-inboundlink: `InboundLink`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. DeleteDialog IS in the /components barrel and its documented prop is inboundLinks: InboundLink[] (components.md:690), for the audience components.md names: a site building its own per-route admin surface. No other public subpath exports it, so retiring makes a public prop unnameable.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 47.
- **Any-site case:** None at this subpath. Its home is the content/manifest vocabulary, not the route-factory barrel.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-linktarget: `LinkTarget`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None at this subpath; same closure re-export as InboundLink.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `content/manifest.ts` (six admin components and `content-routes-core.ts` import it directly); its barrel line dropped from `sveltekit/index.ts`. Survives structurally inside `EditData`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 48.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-resolvedpreview: `ResolvedPreview`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A site names its own preview config; this is what the engine resolved from it, reached as data.preview.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `content/types.ts` (`ComponentInsertDialog.svelte`, `preview-doc.ts`, and `content-routes-core.ts` all import it directly); its barrel line dropped from `sveltekit/index.ts`. Survives structurally inside `EditData`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 49.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-confirmdata: `ConfirmData`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The confirm page is engine-rendered and no /components example takes this type.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `auth-routes.ts` (`cairn-admin.ts` imports it directly); its barrel line dropped from `sveltekit/index.ts`. Survives structurally inside `AdminData` (`Extract<AdminData, { view: 'confirm' }>['page']`), `AuthRoutes`, and `createAuthRoutes`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 50.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-logindata: `LoginData`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Weak. A site rebranding login is plausible, but cairn's answer for that is AuthRoutesConfig.branding, not a hand-built route.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `auth-routes.ts` (`cairn-admin.ts` imports it directly); its barrel line dropped from `sveltekit/index.ts`. Survives structurally inside `AdminData` (`Extract<AdminData, { view: 'login' }>['page']`), `AuthRoutes`, and `createAuthRoutes`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 51.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-editorsdata: `EditorsData`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Owner-only engine roster surface, and components.md never names this type.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `editors-routes.ts` (`cairn-admin.ts` and `reproductions/stories/site.ts` import it directly); its barrel line dropped from `sveltekit/index.ts`. Survives structurally inside `AdminData` (`Extract<AdminData, { view: 'editors' }>['page']`), `EditorRoutes`, and `createEditorRoutes`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 52.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-helpdata: `HelpData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site putting the markdown cheat sheet on its own /admin/help route mounts CairnHelp and annotates the prop; components.md line 512 writes exactly that.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 53.
- **Any-site case:** A site putting the markdown cheat sheet on its own /admin/help route mounts CairnHelp and annotates the prop; components.md line 512 writes exactly that.

## audit-sveltekit-welcomedata: `WelcomeData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site replacing the /admin landing page with its own dashboard, still rendering cairn's welcome block inside it, types the prop WelcomeData.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 54.
- **Any-site case:** A site replacing the /admin landing page with its own dashboard, still rendering cairn's welcome block inside it, types the prop WelcomeData.

## audit-sveltekit-vocabularyloaddata: `VocabularyLoadData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site that puts tag management on its own route, beside its own taxonomy tooling, mounts the vocabulary screen and types data with this.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 55.
- **Any-site case:** A site that puts tag management on its own route, beside its own taxonomy tooling, mounts the vocabulary screen and types data with this.

## audit-sveltekit-settingsdata: `SettingsData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site folding cairn's tidy settings into its own combined settings page types the prop with this.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 56.
- **Any-site case:** A site folding cairn's tidy settings into its own combined settings page types the prop with this.

## audit-sveltekit-navloaddata: `NavLoadData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site whose public menu is edited beside its other site settings mounts the drag-to-reorder nav editor on its own route and types data.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 57.
- **Any-site case:** A site whose public menu is edited beside its other site settings mounts the drag-to-reorder nav editor on its own route and types data.

## audit-sveltekit-historydata: `HistoryData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site placing per-entry version history on its own screen types data: HistoryData; components.md line 340 shows the prop.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 58.
- **Any-site case:** A site placing per-entry version history on its own screen types data: HistoryData; components.md line 340 shows the prop.

## audit-sveltekit-listdata: `ListData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site mounting CairnEntryList at its own /admin/posts to add a filter bar above it annotates the prop; components.md imports the name by hand.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 59.
- **Any-site case:** A site mounting CairnEntryList at its own /admin/posts to add a filter bar above it annotates the prop; components.md imports the name by hand.

## audit-sveltekit-medialibrarydata: `MediaLibraryData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site mounting CairnMediaLibrary on its own route alongside its non-image asset tooling types data with this.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 60.
- **Any-site case:** A site mounting CairnMediaLibrary on its own route alongside its non-image asset tooling types data with this.

## audit-sveltekit-editdata: `EditData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site wrapping the entry editor in its own route shell, with a domain sidebar beside it, must name this type to declare the merged prop.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 61.
- **Any-site case:** A site wrapping the entry editor in its own route shell, with a domain sidebar beside it, must name this type to declare the merged prop.

## audit-sveltekit-publishactionlink: `PublishActionLink`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. The site-written half is PublishActionEntry/PublishActionsConfig. This is only the resolved form, produced by the unexported resolvePublishActions and read off EditData.publishActions; sveltekit.md:1837 says the edit page renders them. Identical position to FragmentTarget and UsageEntry, both retired.
- **Reopens on:** closed. Executed by the retires pass, Task 2: the module-level export stays in `publish-actions.ts` (`content-routes-core.ts` imports it directly); its barrel line dropped from `sveltekit/index.ts`. Survives structurally inside `EditData`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 62.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-healthdata: `HealthData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An operator wiring /admin/healthz into an uptime check needs the payload shape to assert on.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 63.
- **Any-site case:** An operator wiring /admin/healthz into an uptime check needs the payload shape to assert on.

## audit-sveltekit-healthload: `healthLoad`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A PKCS#1-to-PKCS#8 key mistake is invisible until the first publish fails. Every cairn site signs App JWTs, so every site wants a route proving the key decodes.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 64.
- **Any-site case:** A PKCS#1-to-PKCS#8 key mistake is invisible until the first publish fails. Every cairn site signs App JWTs, so every site wants a route proving the key decodes.

## audit-sveltekit-requestresult: `RequestResult`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site rendering its own login form branches on form.status to show check-your-email, try-again, or wait-a-moment.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 65.
- **Any-site case:** A site rendering its own login form branches on form.status to show check-your-email, try-again, or wait-a-moment.

## audit-sveltekit-authroutes: `AuthRoutes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. auth-routes.ts:241 is `export type AuthRoutes = ReturnType<typeof createAuthRoutes>`. It is not a hand-written interface and cannot drift; the idiom the reshape asks for is already in place on all five returns.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 66.
- **Any-site case:** Thin: a site hand-mounting auth holds the object, which TypeScript infers. The name serves annotation, not construction.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).
- **Annotation (conventions pass, Task 2):** the idiom this keep names is superseded, not the
  verdict: `ReturnType<typeof createAuthRoutes>` retires under `convention-contract-first-returns`,
  and `AuthRoutes` is now a hand-declared interface `createAuthRoutes` names in its own signature.
  The name and its members are unchanged.

## audit-sveltekit-authroutesconfig: `AuthRoutesConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site on a non-Cloudflare mailer supplies its own send, and any site annotating its config object in cairn.server.ts names this. CairnAdminOptions.auth is Partial of it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 67.
- **Any-site case:** A site on a non-Cloudflare mailer supplies its own send, and any site annotating its config object in cairn.server.ts names this. CairnAdminOptions.auth is Partial of it.
- **Annotation (conventions pass, Task 2):** the referring name in this entry's own prose,
  `CairnAdminOptions`, renamed to `CairnAdminConfig` (`convention-parameter-bags`);
  `AuthRoutesConfig` itself is untouched.

## audit-sveltekit-createauthroutes: `createAuthRoutes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site whose login page must live at its own URL, or render inside its own marketing shell, wires the five handlers onto its own routes instead of cairn's catch-all.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 68.
- **Any-site case:** A site whose login page must live at its own URL, or render inside its own marketing shell, wires the five handlers onto its own routes instead of cairn's catch-all.

## audit-sveltekit-editorroutes: `EditorRoutes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. editors-routes.ts:162 is ReturnType<typeof createEditorRoutes>. The stated idiom drift does not exist; membership was already conceded, so the verdict is keep.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 69.
- **Any-site case:** Thin, same as AuthRoutes: an annotation aid for a hand-mounting site, not a name the site must write.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).
- **Annotation (conventions pass, Task 2):** the idiom this keep names is superseded, not the
  verdict: `ReturnType<typeof createEditorRoutes>` retires under
  `convention-contract-first-returns`, and `EditorRoutes` is now a hand-declared interface
  `createEditorRoutes` names in its own signature. The name and its members are unchanged.

## audit-sveltekit-editorroutesoptions: `EditorRoutesOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site with a declared role vocabulary that hand-mounts the roster screen passes its defineRoles output here; nothing else tells that screen the vocabulary.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 70.
- **Any-site case:** A site with a declared role vocabulary that hand-mounts the roster screen passes its defineRoles output here; nothing else tells that screen the vocabulary.
- **Annotation (conventions pass, Task 2):** renamed `EditorRoutesOptions` → `EditorRoutesConfig`
  (`convention-parameter-bags`); the `opts` parameter renames to `config` on `createEditorRoutes`
  the same way. The shape and behavior are unchanged.

## audit-sveltekit-createeditorroutes: `createEditorRoutes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site whose people-admin screen treats cairn editors as a subset of a larger roster mounts these four actions itself, inheriting the anti-lockout rule.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 71.
- **Any-site case:** A site whose people-admin screen treats cairn editors as a subset of a larger roster mounts these four actions itself, inheriting the anti-lockout rule.

## audit-sveltekit-navroutes: `NavRoutes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. nav-routes.ts's tail is ReturnType<typeof createNavRoutes>. Same refutation as AuthRoutes.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 72.
- **Any-site case:** Thin, same as the other factory-return aliases.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).
- **Annotation (conventions pass, Task 2):** the idiom this keep names is superseded, not the
  verdict: `ReturnType<typeof createNavRoutes>` retires under `convention-contract-first-returns`,
  and `NavRoutes` is now a hand-declared interface `createNavRoutes` names in its own signature.
  The name and its members are unchanged.

## audit-sveltekit-createnavroutes: `createNavRoutes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site editing its public menu beside its own settings mounts navLoad and navSaveAction itself, reusing the engine's config read and commit rather than re-implementing them.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 73.
- **Any-site case:** A site editing its public menu beside its own settings mounts navLoad and navSaveAction itself, reusing the engine's config read and commit rather than re-implementing them.

## audit-sveltekit-contentroutes: `ContentRoutes`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Thin by name, but consequential: this type is why two dozen janitorial types are public at all.
- **Reopens on:** closed. Executed by foundations B, Task 1: `createContentRoutesInternal` (unexported from every barrel) returns the wide 35-member shape the single-mount composer drives, and the public `createContentRoutes` declares the narrow 25-member `ContentRoutes`, derived from the internal shape by `Pick` rather than hand-mirrored, per the C3 prescription. The ten excluded members are the media-janitorial actions: `mediaBulkDeleteAction`, `mediaOrphanScanAction`, `mediaOrphanPurgeAction`, `mediaReplaceAction`, `mediaAltPropagateAction`, `mediaDeleteAction`, `mediaUpdateAction`, `mediaAltPreviewAction`, `mediaReplacePreviewAction`, `mediaLibraryUploadAction`.
- **Shape:** Split the public return into the loads and actions a hand-mounting site actually wires, keeping the media-janitorial actions on an engine-internal shape the engine's own components import directly, already how they reach them today. The split is a NECESSARY step toward the media-janitorial retires, not a sufficient one: `createCairnAdmin`'s rendered return still names every ranks 1-13/17-22/38 janitorial type after it (`api-surface.md:498`, `:519`), because the composer keeps driving the wide internal shape. Closing this entry therefore consumes no retire; the retires pass reads the closure re-derivation for that.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 74.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-contentroutesoptions: `ContentRoutesOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site whose authorization lives in its own database uses navFilter to stop teasing links its routes then refuse; a site with a work queue uses attention to badge it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 75.
- **Any-site case:** A site whose authorization lives in its own database uses navFilter to stop teasing links its routes then refuse; a site with a work queue uses attention to badge it.
- **Annotation (conventions pass, Task 2):** renamed `ContentRoutesOptions` → `ContentRoutesConfig`
  (`convention-parameter-bags`); the `deps` parameter renames to `config` on every factory that
  takes this bag (`createContentRoutesInternal`, `createContentRoutes`,
  `createContentRoutesContext`). The shape and behavior are unchanged.

## audit-sveltekit-createcontentroutes: `createContentRoutes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site hand-mounting /admin route-by-route, because its admin URLs must match an existing information architecture, wires editLoad, saveAction and publishAction onto its own files.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 76.
- **Any-site case:** A site hand-mounting /admin route-by-route, because its admin URLs must match an existing information architecture, wires editLoad, saveAction and publishAction onto its own files.

## audit-sveltekit-admindata: `AdminData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every site on the canonical mount writes it: admin-routes.md's route file is literally 'let { data, form }: { data: AdminData; form: ActionData } = $props();'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 77.
- **Any-site case:** Every site on the canonical mount writes it: admin-routes.md's route file is literally 'let { data, form }: { data: AdminData; form: ActionData } = $props();'.

## audit-sveltekit-cairnadminroutes: `CairnAdminRoutes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. cairn-admin.ts:346 is ReturnType<typeof createCairnAdmin>, already the single idiom the note demands. With the form objection refuted and the annotation case real, it is a keep.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 78.
- **Any-site case:** A site annotating the admin export in cairn.server.ts names it; real, but served equally by any of the five idioms.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).
- **Annotation (conventions pass, Task 2, 2026-08-30):** the idiom this keep names is superseded,
  not merely re-verified: `ReturnType<typeof createCairnAdmin>` retires under
  `convention-contract-first-returns`, and `CairnAdminRoutes` is now a hand-declared, `Pick`-composed
  contract over a new internal wide factory (`createCairnAdminInternal`), mirroring the
  foundations-B `ContentRoutes` precedent. The membership decision this reshape makes explicit: the
  declared contract carries the members `ContentRoutes` exposes plus the shell/help/auth members the
  admin mount needs, and withdraws the same ten media-janitorial actions `ContentRoutes` withdraws
  (`mediaDelete`, `mediaUpdate`, `mediaLibraryUpload`, `mediaReplacePreview`, `mediaReplace`,
  `mediaAltPreview`, `mediaAltPropagate`, `mediaBulkDelete`, `mediaOrphanScan`, `mediaOrphanPurge`);
  `mediaUpload` stays, since it wraps the same `uploadAction` the kept `upload` action wraps. This
  IS the `createCairnAdmin` narrowing question [r4-rederivation](record/2026-08-30-r4-rederivation.md)
  "List (c)" Tier 1 is blocked on: with both `ContentRoutes` and `CairnAdminRoutes` now narrowed, the
  25 Tier 1 retires route to slice 4b, unblocked. The keep verdict on the NAME `CairnAdminRoutes`
  itself is undisturbed; only the mechanism generating it and the composer's own `actions` shape
  changed.

## audit-sveltekit-cairnadminoptions: `CairnAdminOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site overriding a seam on the recommended mount: a custom mailer, a role filter over the sidebar, attention badges, a preview lifetime.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 79.
- **Any-site case:** Any site overriding a seam on the recommended mount: a custom mailer, a role filter over the sidebar, attention badges, a preview lifetime.
- **Annotation (conventions pass, Task 2):** renamed `CairnAdminOptions` → `CairnAdminConfig`
  (`convention-parameter-bags`); the `deps` parameter renames to `config` on `createCairnAdmin`
  the same way. The shape and behavior are unchanged.

## audit-sveltekit-attentionitem: `AttentionItem`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site with a pending-work queue behind a custom admin screen (unreviewed submissions, unread messages) wants a nav badge rather than a screen editors must remember to visit.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 80.
- **Any-site case:** Any site with a pending-work queue behind a custom admin screen (unreviewed submissions, unread messages) wants a nav badge rather than a screen editors must remember to visit.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-enginescreenid: `EngineScreenId`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site declaring navLayout writes { screen: 'media' }; the alias documents the fixed screen vocabulary while the (string & {}) tail keeps concept ids assignable.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 81.
- **Any-site case:** A site declaring navLayout writes { screen: 'media' }; the alias documents the fixed screen vocabulary while the (string & {}) tail keeps concept ids assignable.

## audit-sveltekit-resolvenavlayoutoptions: `ResolveNavLayoutOptions`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Falls with resolveNavLayout. Its independent charge is weak too: a structural stand-in for one's own richer type is the engine's documented convention (CairnEvent, CookieJar), and here it spares a caller from materializing ConceptDescriptor's fields, schema and validate.
- **Reopens on:** closed. Executed by the retires pass, batch 1c: dropped the `export` keyword in `admin-nav.ts` (consumed only inside its declaring module, by `resolveNavLayout` and its own internal helpers) and its barrel line in `sveltekit/index.ts`.
- **Shape:** Its concepts member is a structural stand-in for ConceptDescriptor, which is already public, so the surface carries two shapes for one idea. Take the real descriptor type, or keep the resolver internal.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 82; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1c.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-resolvenavlayout: `resolveNavLayout`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Every caller is the engine (content-routes-core.ts:606 in shellLoad); no doc calls it. The proposed replacement, a validate-and-preview function, does not exist and half-duplicates validateNavLayout. Inventing surface to justify surface fails the leanness rule.
- **Reopens on:** closed. Executed by the retires pass, batch 1c: the module-level export stays in `admin-nav.ts`, since `content-routes-core.ts`'s `shellLoad` still calls it internally by relative import; only its barrel line in `sveltekit/index.ts` is dropped.
- **Shape:** Export a narrow, purpose-named function that validates and previews a navLayout against this site's concepts, rather than publishing the engine's internal resolver with its internal options bag.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 83; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1c.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-validatenavlayout: `validateNavLayout`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. The any-site case is false: content-routes-context.ts:280-287 already calls it on runtime.navLayout at composition, dynamic or literal, and the thrown error already names the bad node. Calling it by hand buys nothing and re-derives three facts the runtime holds.
- **Reopens on:** closed. Executed by the retires pass, batch 1c: the module-level export stays in `admin-nav.ts`, since `content-routes-context.ts` still calls it internally by relative import; only its barrel line in `sveltekit/index.ts` is dropped.
- **Shape:** Take the composed runtime (or adapter) plus the layout, instead of a ctx the caller assembles by hand from conceptIds, navMenuConfigured and roleNames, three facts the composed runtime already holds, so the call site cannot assemble the context wrongly.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 84; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1c.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-resolvedlayoutsection: `ResolvedLayoutSection`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A navFilter that drops or reorders a whole group narrows on 'children' in node and needs this name to type the branch.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 85.
- **Any-site case:** A navFilter that drops or reorders a whole group narrows on 'children' in node and needs this name to type the branch.

## audit-sveltekit-resolvedlayoutchild: `ResolvedLayoutChild`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The leaf branch of the same navFilter narrowing a site writes by hand.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 86.
- **Any-site case:** The leaf branch of the same navFilter narrowing a site writes by hand.

## audit-sveltekit-resolvedlayoutnode: `ResolvedLayoutNode`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site writing navFilter: (items: ResolvedLayoutNode[], ctx) => … in its own cairn.server.ts writes this exact name; nothing infers it, because the site authors the function.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 87.
- **Any-site case:** A site writing navFilter: (items: ResolvedLayoutNode[], ctx) => … in its own cairn.server.ts writes this exact name; nothing infers it, because the site authors the function.

## audit-sveltekit-resolvedenginenaventry: `ResolvedEngineNavEntry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A navFilter that keeps a site's own entries while hiding engine doors for a given role discriminates on screen and needs this name.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 88.
- **Any-site case:** A navFilter that keeps a site's own entries while hiding engine doors for a given role discriminates on screen and needs this name.

## audit-sveltekit-resolvednaventry: `ResolvedNavEntry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The site-entry half of the same navFilter narrowing.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 89.
- **Any-site case:** The site-entry half of the same navFilter narrowing.

## audit-sveltekit-resolvednavlayout: `ResolvedNavLayout`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site rendering its own shell chrome around cairn's resolved tree, or writing a helper over data.shell.nav, needs the items/fallback grammar named.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 90.
- **Any-site case:** A site rendering its own shell chrome around cairn's resolved tree, or writing a helper over data.shell.nav, needs the items/fallback grammar named.

## audit-sveltekit-navicon: `NavIcon`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site declaring one navLayout entry picks an icon; the closed allowlist gives completion and fails the build on a typo instead of rendering a blank.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 91.
- **Any-site case:** Any site declaring one navLayout entry picks an icon; the closed allowlist gives completion and fails the build on a typo instead of rendering a blank.

## audit-sveltekit-navlayoutengineref: `NavLayoutEngineRef`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site relabelling Posts to Articles, or hiding a built-in door with hidden: true, writes this node. It is also how the omission-fallback answer works for one added link.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 92.
- **Any-site case:** A site relabelling Posts to Articles, or hiding a built-in door with hidden: true, writes this node. It is also how the omission-fallback answer works for one added link.

## audit-sveltekit-navlayoutentry: `NavLayoutEntry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every site adding one custom admin screen writes a NavLayoutEntry to put a door on it. The most-written type here after CairnEvent.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 93.
- **Any-site case:** Every site adding one custom admin screen writes a NavLayoutEntry to put a door on it. The most-written type here after CairnEvent.

## audit-sveltekit-adminshelldata: `AdminShellData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every site on the canonical mount writes it in +layout.svelte: 'let { data, children }: { data: { shell: AdminShellData }; children: Snippet }'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 94.
- **Any-site case:** Every site on the canonical mount writes it in +layout.svelte: 'let { data, children }: { data: { shell: AdminShellData }; children: Snippet }'.

## audit-sveltekit-previewdata: `PreviewData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The preview page is a public page in the site's own design, so the site owns its markup and must type previewLoad's return to render it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 95.
- **Any-site case:** The preview page is a public page in the site's own design, so the site owns its markup and must type previewLoad's return to render it.

## audit-sveltekit-previewtokenconfig: `PreviewTokenConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site whose review cycle is not seven days — a newsroom wanting 24 hours, a committee wanting thirty — sets ttlMs.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 96.
- **Any-site case:** A site whose review cycle is not seven days — a newsroom wanting 24 hours, a committee wanting thirty — sets ttlMs.

## audit-sveltekit-mintpreviewtoken: `mintPreviewToken`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site minting a share link from its own workflow — an editorial queue emailing a reviewer on submit — rather than from the editor's Share button.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 5, on the signature branch of
  the shape's either/or: `mintPreviewToken(db, config, record)` becomes
  `previewMint(runtime, config, event, { concept, entryId })`, which performs the entry-scoped
  check the admin action performs rather than naming the obligation. The header comment admitting
  the obligation is gone, along with the reference page's copy of it. The sequence is the engine's
  own, extracted rather than duplicated: `requireEditor(event)`, `findConcept`,
  `requireEngineAccess(runtime.access, ...)`, `isValidId`, then the `branchHead(pendingBranch(...))`
  draft check, with `previewMintAction` reduced to naming the target from its route params and
  dressing each `outcome` arm in the refusal that screen speaks. `requireEntryFromParams` is
  deliberately NOT the extracted helper: it derives its target from route params, so a helper
  calling it would authorize the route's entry while minting the argument's, and would 404 on any
  route outside `/admin/[concept]/[id]`, which is the any-site caller this verdict exists for.
  Seam fit: the rename pairs the mint with `previewLoad` on one parameter shape, the editor stops
  being a caller-supplied string (so the editor-removal revocation cascade always matches), and the
  refusals ride the 4a `outcome` grammar (`PreviewMintOutcome`) rather than a throw. Token hygiene
  is byte-identical to `main`. Design note, recorded per the plan's round-2 disposition (fold
  SEC-B-3): the security round proposed `authorizeAdminTarget`'s fail-closed no-rule posture in
  place of `canReach`'s nav semantics; this pass deliberately reused the engine's own mint
  sequence, since a helper stricter than the engine route it mirrors protects nothing while that
  route keeps the permissive reading. A stricter floor is an engine-wide access-semantics question,
  filed to the internals pass rather than decided asymmetrically here.
- **Shape:** Its header admits it 'performs no authorization or draft-existence check of its own, so a caller that reaches it directly owns both'. Either perform the entry-scoped check the admin action performs, or make the caller's obligation part of the name and the signature rather than a header comment.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 97.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-previewload: `previewLoad`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site letting a non-editor see an unpublished draft — a client, a board member, a copy editor without an account. Resolving the draft off its pending branch is not reproducible site-side.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 98.
- **Any-site case:** Any site letting a non-editor see an unpublished draft — a client, a board member, a copy editor without an account. Resolving the draft off its pending branch is not reproducible site-side.

## audit-sveltekit-slotdef: `SlotDef`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. It reaches /sveltekit as R4 closure of CairnRuntime, a /sveltekit export because every factory takes it. Dropping it would leave a /sveltekit-only importer unable to name a member of a type it holds, the exact condition R4 removes. Substantive audit still belongs to render/registry.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 99.
- **Any-site case:** Real for a site declaring a custom markdown component, but that developer reads /delivery or the root barrel, not the route-factory subpath.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-mediaentry: `MediaEntry`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Real at /media, where the manifest record is the media vocabulary's core noun; none at /sveltekit once UploadResult moves.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 2, riding Task 1's
  `UploadResult` retire (the closure justification the `/sveltekit` row named): the row drops
  from `sveltekit/index.ts` and its `check-surface-reexports.json` record, and `/media` is now
  `MediaEntry`'s sole publication.
- **Shape:** Keep it in the engine at /media and drop the /sveltekit re-export. Its substantive audit belongs to the media bucket.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 100.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-emailattachment: `EmailAttachment`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. It sits on exactly the two barrels that publish MagicLinkMessage (index.ts:21, sveltekit/index.ts:123), whose attachments?: EmailAttachment[] names it. Coherent closure, not a duplicate home, and the ranking accepted the identical pattern for RateLimitLike.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 101.
- **Any-site case:** A site supplying a custom SendMagicLink needs the message shape, but reads it from the mail contract's own subpath, not the route-factory barrel.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-cookiesetoptions: `CookieSetOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site writing a CairnEvent test double types the set signature; otherwise it is reached through CookieJar.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 102.
- **Any-site case:** A site writing a CairnEvent test double types the set signature; otherwise it is reached through CookieJar.

## audit-sveltekit-cookiejar: `CookieJar`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site unit-testing its own adminAction-wrapped handler builds a fake event; cookies is required on CairnEvent, so the fake must satisfy this interface.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 103.
- **Any-site case:** A site unit-testing its own adminAction-wrapped handler builds a fake event; cookies is required on CairnEvent, so the fake must satisfy this interface.

## audit-sveltekit-platformcontext: `PlatformContext`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site building a test event, or reasoning about why its own App.Platform carrying ctx still satisfies cairn, needs this contract stated.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 104.
- **Any-site case:** A site building a test event, or reasoning about why its own App.Platform carrying ctx still satisfies cairn, needs this contract stated.

## audit-sveltekit-handleinput: `HandleInput`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every site with its own hook — analytics, a redirect table, a second auth audience — sequences around cairn's guard and types the { event, resolve } argument.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 105.
- **Any-site case:** Every site with its own hook — analytics, a redirect table, a second auth audience — sequences around cairn's guard and types the { event, resolve } argument.

## audit-sveltekit-cairnmediabindings: `CairnMediaBindings`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every media-enabled site writes env: CairnPlatformBindings & CairnMediaBindings & { … } in app.d.ts.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 106.
- **Any-site case:** Every media-enabled site writes env: CairnPlatformBindings & CairnMediaBindings & { … } in app.d.ts.

## audit-sveltekit-cairnplatformbindings: `CairnPlatformBindings`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every cairn site: 'a binding a site forgets to wire fails app.d.ts at compile time rather than surfacing as a runtime config.bindings-missing error'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 107.
- **Any-site case:** Every cairn site: 'a binding a site forgets to wire fails app.d.ts at compile time rather than surfacing as a runtime config.bindings-missing error'.

## audit-sveltekit-adminactionoptions: `AdminActionOptions`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Its own doc says every real caller takes the default, and the ranking's any-site case is 'Essentially none'. Reshape presupposes membership; an item with none fails before form is reached. The note's own first branch, folding the flag away, is retirement.
- **Reopens on:** open; not executed by the retires pass. The F-1 hybrid ruling
  (`f1-return-position-leak-sanction`) moved this name to list (c) Tier 3 as the sole
  argument-position closure leak (a consumer passes a value of this type INTO `adminAction`, so an
  un-nameable type is a construction-ergonomics regression the return-position sanction does not
  cover). Blocked on `adminAction`'s own declared signature naming it (`api-surface.md:472`);
  reopens when a later ruling reshapes that signature or overturns the verdict.
- **Shape:** A bag named Options whose only member is an injected build flag advertises configuration that does not exist. Fold the flag into the function's own testing surface, or name it for what it is rather than as the wrapper's options.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 108; [r4-rederivation](record/2026-08-30-r4-rederivation.md), section 7.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-unauditedactionerror: `UnauditedActionError`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site whose handleError or test harness must distinguish this dev-only authoring signal from a real failure asserts on the class rather than a message string.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 109.
- **Any-site case:** A site whose handleError or test harness must distinguish this dev-only authoring signal from a real failure asserts on the class rather than a message string.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-adminactionaudit: `AdminActionAudit`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every wrapped handler writes ctx.audit({ action, entity, entityId }); a site factoring a helper names the type. The four-field vocabulary carries no site's domain.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 110.
- **Any-site case:** Every wrapped handler writes ctx.audit({ action, entity, entityId }); a site factoring a helper names the type. The four-field vocabulary carries no site's domain.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-adminactionauditrecord: `AdminActionAuditRecord`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site writing its own sink, to its own logging service or table, declares (record: AdminActionAuditRecord) => void and names this type.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 111.
- **Any-site case:** A site writing its own sink, to its own logging service or table, declares (record: AdminActionAuditRecord) => void and names this type.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-adminactioncontext: `AdminActionContext`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site writes it by hand in two places: a factored handler's parameter annotation, and SectionActionConfig.rateLimit.key(ctx).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 112.
- **Any-site case:** A site writes it by hand in two places: a factored handler's parameter annotation, and SectionActionConfig.rateLimit.key(ctx).
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-adminactionauditsink: `AdminActionAuditSink`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site wires event.locals.cairnAuditSink = mySink in hooks.server.ts and types mySink with this; the fail-open contract is a property it should not have to discover.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 113.
- **Any-site case:** A site wires event.locals.cairnAuditSink = mySink in hooks.server.ts and types mySink with this; the fail-open contract is a property it should not have to discover.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-sectionactionaudit: `SectionActionAudit`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A handler touching two entities in one call overrides entity on the second emit and needs this defaulting shape; the defaulting removes the repetition that made hand-rolled audits drift.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 114.
- **Any-site case:** A handler touching two entities in one call overrides entity on the second emit and needs this defaulting shape; the defaulting removes the repetition that made hand-rolled audits drift.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-sectionactioncontext: `SectionActionContext`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site factoring a wrapped handler out of its actions record annotates ctx: SectionActionContext<D1Database>; db: NonNullable<Db> is what removes the null check from every handler body.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 115.
- **Any-site case:** A site factoring a wrapped handler out of its actions record annotates ctx: SectionActionContext<D1Database>; db: NonNullable<Db> is what removes the null check from every handler body.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-sectionactionoptions: `SectionActionOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every wrapped call site writes { action, entity }, and any parameterized or catch-all route must declare target, because 'on a catch-all route the pathname is attacker-chosen while the route id is not'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 116.
- **Any-site case:** Every wrapped call site writes { action, entity }, and any parameterized or catch-all route must declare target, because 'on a catch-all route the pathname is attacker-chosen while the route id is not'.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-ratelimitlike: `RateLimitLike`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site writing rateLimit.resolve must name the return; the structural definition lets a test pass a fake and a non-Cloudflare host pass its own limiter.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 117.
- **Any-site case:** A site writing rateLimit.resolve must name the return; the structural definition lets a test pass a fake and a non-Cloudflare host pass its own limiter.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-sectionactionconfig: `SectionActionConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every site using the seam writes this object once per section and must name it to annotate Env, since Env does not infer from resolveDb alone.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 118.
- **Any-site case:** Every site using the seam writes this object once per section and must name it to annotate Env, since Env does not infer from resolveDb alone.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-created1auditsink: `createD1AuditSink`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any Workers site wanting admin mutations persisted rather than only logged: Workers Logs expire, and answering who changed this in March needs a table.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 119.
- **Any-site case:** Any Workers site wanting admin mutations persisted rather than only logged: Workers Logs expire, and answering who changed this in March needs a table.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-createsectionaction: `createSectionAction`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site adding one custom admin screen with a form: SvelteKit dispatches a matched action directly and never re-runs an ancestor load, so the page looks gated and the POST is not.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 120.
- **Any-site case:** Any site adding one custom admin screen with a form: SvelteKit dispatches a matched action directly and never re-runs an ancestor load, so the page looks gated and the POST is not.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-adminaction: `adminAction`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A custom admin screen with a form but no database binding: it resolves the signed-in editor as typed ctx.editor and makes an unaudited mutation a build failure rather than a discipline.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 121.
- **Any-site case:** A custom admin screen with a form but no database binding: it resolves the signed-in editor as typed ctx.editor and makes an unaudited mutation a build failure rather than a discipline.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-createmediaroute: `createMediaRoute`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every media-enabled site mounts /media/[...path]; serving user-uploaded bytes from your own origin without nosniff, inline disposition and a sandbox CSP is an XSS hole.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 122.
- **Any-site case:** Every media-enabled site mounts /media/[...path]; serving user-uploaded bytes from your own origin without nosniff, inline disposition and a sandbox CSP is an XSS hole.

## audit-sveltekit-authguardoptions: `AuthGuardOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site declaring roles or an access map writes this object in hooks.server.ts; each member is a decision only the site can make.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 123.
- **Any-site case:** Any site declaring roles or an access map writes this object in hooks.server.ts; each member is a decision only the site can make.

## audit-sveltekit-requireowner: `requireOwner`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site adding a destructive admin operation — a bulk import, a data purge — gates its load in one line instead of re-deriving what owner means from a role string.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 124.
- **Any-site case:** A site adding a destructive admin operation — a bulk import, a data purge — gates its load in one line instead of re-deriving what owner means from a role string.

## audit-sveltekit-requireeditor: `requireEditor`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site whose custom screen is content-adjacent gates on can-edit-content rather than a role list; the none contract is what lets a site have admin users who are not cairn editors.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 125.
- **Any-site case:** A site whose custom screen is content-adjacent gates on can-edit-content rather than a role list; the none contract is what lets a site have admin users who are not cairn editors.

## audit-sveltekit-requiresession: `requireSession`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every custom admin screen's load. The session lives in an engine-owned cookie resolved against the engine's D1 store, so a site cannot reach it correctly on its own.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 126.
- **Any-site case:** Every custom admin screen's load. The session lives in an engine-owned cookie resolved against the engine's D1 store, so a site cannot reach it correctly on its own.

## audit-sveltekit-requireaccess: `requireAccess`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site with more than two kinds of admin user gates its own route in one line against the map it already declared, and gets the denial log for free.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 127.
- **Any-site case:** A site with more than two kinds of admin user gates its own route in one line against the map it already declared, and gets the denial log for free.

## audit-sveltekit-createcairnadmin: `createCairnAdmin`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The recommended path for every site: two route pairs mount the whole /admin surface, so the site restates no route table and wires no action names by hand.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 128.
- **Any-site case:** The recommended path for every site: two route pairs mount the whole /admin surface, so the site restates no route table and wires no action names by hand.

## audit-sveltekit-createauthguard: `createAuthGuard`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every cairn site, one line in hooks.server.ts. It carries session resolution, the CSRF authority the site handed over by setting checkOrigin: false, capability resolution, security headers, and a dev-backend fail-closed.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 129.
- **Any-site case:** Every cairn site, one line in hooks.server.ts. It carries session resolution, the CSRF authority the site handed over by setting checkOrigin: false, capability resolution, security headers, and a dev-backend fail-closed.

## audit-sveltekit-cairnevent: `CairnEvent`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every other export here names it, so a site annotating any handler, helper or test double writes it. Structural by design: any kit server event satisfies it with zero casts.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 130.
- **Any-site case:** Every other export here names it, so a site annotating any handler, helper or test double writes it. Structural by design: any kit server event satisfies it with zero casts.

## audit-admin-formatphone: `formatPhone`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A markdown CMS stores no phone numbers; the body is one NANP regex plus a template string, with zero consumers anywhere in engine, showcase, or docs.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: deleted from `admin-toolkit/format.ts` and the `/admin-toolkit` barrel; zero remaining callers anywhere in `src/lib`.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 1; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-formatphoneoptions: `FormatPhoneOptions`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent of formatPhone. A one-optional-string interface on the public surface.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: deleted alongside `formatPhone`, its only reference.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 2; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-agefrombirthdate: `ageFromBirthdate`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. cairn has no birthdates; rosters and waivers are site domain. Eight lines, zero consumers, and the reference page must except it from its own file's charter.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: deleted from `admin-toolkit/format.ts` and the `/admin-toolkit` barrel; zero remaining callers anywhere in `src/lib`.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 3; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-formatmoney: `formatMoney`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. cairn takes no payments; the body is one Intl.NumberFormat over cents/100. Zero consumers.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: deleted from `admin-toolkit/format.ts` and the `/admin-toolkit` barrel; zero remaining callers anywhere in `src/lib`.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 4; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-formatmoneyoptions: `FormatMoneyOptions`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent of formatMoney.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: deleted alongside `formatMoney`, its only reference.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 5; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-status-chip-dot-class: `STATUS_CHIP_DOT_CLASS`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None stated. The reference page argues it in the future conditional: 'so a future legend or key component reuses the identical dot color'. Zero consumers.
- **Reopens on:** closed. Executed by the toolkit-seams pass, Task 2, alongside the whole tone/dot retirement the 2026-08-24 owner probe ratified (docs/internal/probes/2026-08-26-chip-registers-v2): `STATUS_CHIP_DOT_CLASS`, `StatusChipTone`, and the status dot itself are all gone from `StatusChip`.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 6; executed in [2026-08-26 toolkit-seams pass](../superpowers/plans/2026-08-26-toolkit-seams-pass.md), Task 2.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-fieldrow: `FieldRow`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Three CSS declarations, and the component's own header states 'No measured defect drove this component' after the 2026-08 alignment inventory found nothing to fix.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: `FieldRow.svelte` deleted (zero consumers anywhere in the engine); its bottom-aligned-row recipe (`display: flex; align-items: flex-end; gap: var(--cairn-gap-control, 0.5rem)`) is now documented as a hand-roll rather than a shipped component.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 7; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-computecountline: `computeCountLine`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. ListToolbar already renders the line; a site designing its own toolbar designs its own copy. Sibling computeFacetLabel in the same module is deliberately unexported.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: unexported from the `/admin-toolkit` barrel and `ListToolbar.svelte`'s own module context; stays exported from `list-toolbar.ts`, since `ListToolbar.svelte` still calls it internally to render the count line.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 8; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-computeappliedfilters: `computeAppliedFilters`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Its input type ListToolbarFilter[] exists only to feed ListToolbar, so a site not mounting the toolbar has nothing to pass it.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: unexported from the `/admin-toolkit` barrel and `ListToolbar.svelte`'s own module context; stays exported from `list-toolbar.ts`, since `ListToolbar.svelte` still calls it internally for the count line's scope labels.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 9; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-appliedfilterpill: `AppliedFilterPill`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent of computeAppliedFilters. Appears in no component's prop signature.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: unexported from the `/admin-toolkit` barrel and `ListToolbar.svelte`'s own module context; stays exported from `list-toolbar.ts`, since it is `computeAppliedFilters`'s own return type.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 10; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-computeitemrange: `computeItemRange`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Arithmetic Pagination already renders for anyone mounting it.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: unexported from the `/admin-toolkit` barrel and `Pagination.svelte`'s own module context; stays exported from `pagination-window.ts`, since `Pagination.svelte` still calls it internally for the range line.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 11; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-itemrange: `ItemRange`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent of computeItemRange; absent from every component's props.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: unexported from the `/admin-toolkit` barrel and `Pagination.svelte`'s own module context; stays exported from `pagination-window.ts`, since it is `computeItemRange`'s own return type.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 12; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-computepagewindow: `computePageWindow`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Plausible but unmeasured: a site rendering its own pager chrome wanting cairn's exact elision. No site has asked or hand-rolled it, and cairn ships the component.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: unexported from the `/admin-toolkit` barrel and `Pagination.svelte`'s own module context; stays exported from `pagination-window.ts`, since `Pagination.svelte` still calls it internally for the page-button window.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 13; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-pagewindowitem: `PageWindowItem`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent of computePageWindow; absent from every component's props.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: unexported from the `/admin-toolkit` barrel and `Pagination.svelte`'s own module context; stays exported from `pagination-window.ts`, since it is `computePageWindow`'s own return type.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 14; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-welcomeview: `WelcomeView`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A per-route mounter needs an /admin/+page.svelte for a none-capability session or the page renders nothing. Real but unexercised: no consumer imports it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 15.
- **Any-site case:** A per-route mounter needs an /admin/+page.svelte for a none-capability session or the page renders nothing. Real but unexercised: no consumer imports it.

## audit-admin-confirmpage: `ConfirmPage`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A per-route mounter must post cairn's magic-link token to ?/confirm with the engine's own field names and expired-link handling; retyping that form silently 403s or mishandles expiry.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 16.
- **Any-site case:** A per-route mounter must post cairn's magic-link token to ?/confirm with the engine's own field names and expired-link handling; retyping that form silently 403s or mishandles expiry.

## audit-admin-officelist: `OfficeList`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The card frame carries two measured fixes (UA h1/p margins leaking ~32px inside a flex column; the action stretching full-width below sm). The header half duplicates PageHeader.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 9. `PageHeader`'s own `self-start` action wrap ported in first (the two fixes were asymmetric; a naive collapse would have regressed it), then `OfficeList` collapsed to a thin card-frame that composes `PageHeader` for its header band. `OfficeList`'s `subtitle` prop renamed to `meta` (no forwarding alias), and the merged band adopted `PageHeader`'s rhythm (`mb-10`, `gap-0.5`, `text-wrap: balance`) as the toolkit's one office-header rhythm, per the design system's F3 proximity-grouping scale; `OfficeList`'s card keeps its own tighter proximity by sitting directly under that offset. The `WATCH` comment and the parked ROADMAP spacing-convergence entry (`ROADMAP.md:1427-1434` before this pass) both close: this ruling, ratified 2026-08-26, postdates and supersedes the entry's 2026-07-20 parking, which had held the convergence for "a later major" before the any-site audit re-examined and settled it.
- **Shape:** Collapse to a card-frame wrapper that composes PageHeader for its header band, retiring the second eyebrow/title/subtitle/action implementation and closing the WATCH comment's parked ROADMAP spacing-convergence entry between OfficeList and PageHeader.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 17.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-formattimestamp: `formatTimestamp`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Pinning a zone so a Worker's SSR and a browser's hydration cannot render two different strings is an any-site trap. The shipped signature misses it by taking a SQLite-shaped string.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 3: `formatTimestamp` now accepts any Date-parseable timestamp, including an ISO string with an offset, WIDENING rather than swapping the input domain, since D1 rows still hand it the SQLite `'YYYY-MM-DD HH:MM:SS'` shape and that acceptance stays load-bearing. `CairnHistory`'s `formatVersionDate` is deleted; the component routes every date it renders through `formatTimestamp`, proving the widened shape on cairn's own screen. The `timeZone` zone-pin behavior is asserted by test for both the SQLite shape and the ISO shape, not merely preserved.
- **Shape:** Take any Date-parseable timestamp (ISO with offset included), not a SQLite 'YYYY-MM-DD HH:MM:SS' string; then delete CairnHistory's formatVersionDate and route it through this formatter instead, proving the shape on cairn's own screen.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 18.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-formattimestampoptions: `FormatTimestampOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The timeZone option is the load-bearing half of the hydration mechanic: it lets a site state its own zone instead of inheriting one consumer's. Survives the reshape unchanged.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 19.
- **Any-site case:** The timeZone option is the load-bearing half of the hydration mechanic: it lets a site state its own zone instead of inheriting one consumer's. Survives the reshape unchanged.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-cairnhistory: `CairnHistory`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. It renders cairn's git publish history and posts ?/revert with both the row sha and the head sha this page rendered against — a stale-page guard no site can reproduce without cairn's git model.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 20.
- **Any-site case:** It renders cairn's git publish history and posts ?/revert with both the row sha and the head sha this page rendered against — a stale-page guard no site can reproduce without cairn's git model.

## audit-admin-renamedialog: `RenameDialog`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A custom list screen offering rename must post cairn's exact field names to cairn's action; a slug rename moves the entry's branch and repoints inbound links, which a retyped form gets silently wrong.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 21.
- **Any-site case:** A custom list screen offering rename must post cairn's exact field names to cairn's action; a slug rename moves the entry's branch and repoints inbound links, which a retyped form gets silently wrong.

## audit-admin-deletedialog: `DeleteDialog`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. It carries the inbound-link guard blocking a delete while other entries link to the target, plus the pending-branch cascade warning. A hand-rolled delete button breaks the link graph silently.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 22.
- **Any-site case:** It carries the inbound-link guard blocking a delete while other entries link to the target, plus the pending-branch cascade warning. A hand-rolled delete button breaks the link graph silently.

## audit-admin-selectinputoption: `SelectInputOption`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. retires with SelectInput; names only its options prop
- **Reopens on:** closed. Executed by the retires pass, batch 1a: deleted alongside `SelectInput.svelte`, the module that declared it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 23; conductor adjudication over recorded dissent, see the audit record; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-selectinput: `SelectInput`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. restored pass-1 overturn: .select-sm ships in the packaged sheet whose class inventory is a de facto public API (admin-css-safelist.ts:104); pass-2 keep rested on family adoption, insufficient under constraint 2
- **Reopens on:** closed. Executed by the retires pass, batch 1a: `SelectInput.svelte` deleted (zero consumers anywhere in the engine); its `FieldLabel`-plus-`<select>` composition is now hand-rolled by any test or doc example that needs it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 24; conductor adjudication over recorded dissent, see the audit record; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-textinput: `TextInput`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. conflict adjudicated retire over reshape: same shipped-sheet ground as SelectInput; the xcathletes type-union defect (2026-08-21 harvest:21) is recorded and dies with the export
- **Reopens on:** closed. Executed by the retires pass, batch 1a: `TextInput.svelte` deleted (zero consumers anywhere in the engine); its `FieldLabel`-plus-`<input>` composition is now hand-rolled by any test or doc example that needs it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 25; conductor adjudication over recorded dissent, see the audit record; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md) (verdict overturned there).

## audit-admin-fieldlabel: `FieldLabel`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. It carries a measured width hook the engine had to scope by hand (a direct child fills, a nested one does not) and the wrapping-label a11y trap where only the first labelable descendant gets a name.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 26.
- **Any-site case:** It carries a measured width hook the engine had to scope by hand (a direct child fills, a nested one does not) and the wrapping-label a11y trap where only the first labelable descendant gets a name.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-vocabularyadmin: `VocabularyAdmin`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. It edits cairn's committed tag vocabulary against cross-branch usage counts, with immutable slugs and a guarded remove for in-use values. The counts come from cairn's branch model.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 27.
- **Any-site case:** It edits cairn's committed tag vocabulary against cross-branch usage counts, with immutable slugs and a guarded remove for in-use values. The counts come from cairn's branch model.

## audit-admin-cairntidysettings: `CairnTidySettings`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Two-tier settings that commit the conventions block into the same committed site-config YAML the nav editor writes — a file no export lets a site write.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 28.
- **Any-site case:** Two-tier settings that commit the conventions block into the same committed site-config YAML the nav editor writes — a file no export lets a site write.

## audit-admin-helphome: `HelpHome`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Its getting-started progress is derived from the committed manifest and the open edit branches — engine state with no public accessor. The supportContact adapter override is the correct thin site hook.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 29.
- **Any-site case:** Its getting-started progress is derived from the committed manifest and the open edit branches — engine state with no public accessor. The supportContact adapter override is the correct thin site hook.

## audit-admin-navtree: `NavTree`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Drag-to-reorder over cairn's nav tree, committing the rebuilt nav to site config through an engine-only commit path.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 30.
- **Any-site case:** Drag-to-reorder over cairn's nav tree, committing the rebuilt nav to site config through an engine-only commit path.

## audit-admin-manageeditors: `ManageEditors`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Owner-only allowlist management with the anti-lockout guard and role rendering that adapts to a site's declared role vocabulary; the xcathletes brief names it the documented fallback for coach provisioning.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 31.
- **Any-site case:** Owner-only allowlist management with the anti-lockout guard and role rendering that adapts to a site's declared role vocabulary; the xcathletes brief names it the documented fallback for coach provisioning.

## audit-admin-loginpage: `LoginPage`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The magic-link request form with the three-state outcome (sent, send_error, throttled) a hand-rolled form collapses into one vague failure. Throttle and send-failure vocabularies are engine-owned.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 32.
- **Any-site case:** The magic-link request form with the three-state outcome (sent, send_error, throttled) a hand-rolled form collapses into one vague failure. Throttle and send-failure vocabularies are engine-owned.

## audit-admin-emptystateheadinglevel: `EmptyStateHeadingLevel`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A consumer whose empty state is a page's only content passes 'h1' so the page has a real heading in its accessible tree; a screen under a PageHeader keeps the default.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 33.
- **Any-site case:** A consumer whose empty state is a page's only content passes 'h1' so the page has a real heading in its accessible tree; a screen under a PageHeader keeps the default.

## audit-admin-admintabledensity: `AdminTableDensity`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Names AdminTable's density prop for a consumer holding density in its own state; deliberately aligned with StatusChipSize's vocabulary, which is the surface evenness the gate protects.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 34.
- **Any-site case:** Names AdminTable's density prop for a consumer holding density in its own state; deliberately aligned with StatusChipSize's vocabulary, which is the surface evenness the gate protects.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-statuschipsize: `StatusChipSize`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The distinction is measured, not cosmetic: sm reserves a 5rem minimum width, xs carries none so a dense table column budgets against its own short vocabulary rather than a longer label's floor.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 35.
- **Any-site case:** The distinction is measured, not cosmetic: sm reserves a 5rem minimum width, xs carries none so a dense table column budgets against its own short vocabulary rather than a longer label's floor.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-statuschipregister: `StatusChipRegister`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The two registers carry canvas-measured contrast across four grounds (bounded 3.586/3.513/4.959/5.263; quiet 1.804/1.684/1.703/2.026) a consumer cannot re-derive without its own probe rig.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Stale-case note (toolkit-seams pass, Task 2, 2026-08-26):** the recorded any-site case describes the FIRST-generation dotted grammar's two registers (`bounded`/`quiet`) and their measured numbers. The type stays kept, still unavailable to a consumer without its own probe rig, but its shape and values are both stale: the second generation (the 2026-08-24 owner probe, docs/internal/probes/2026-08-26-chip-registers-v2) is three registers (`'quiet' | 'warning' | 'outline'`), and the current measured band is 1.16-1.47:1 for the two tinted fills against their own row ground (plain/zebra, both themes) plus the unchanged >= 3:1 outline-border floor. Read the current header comment in `cairn-admin.css` for the live numbers rather than this entry.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 36.
- **Any-site case:** The two registers carry canvas-measured contrast across four grounds (bounded 3.586/3.513/4.959/5.263; quiet 1.804/1.684/1.703/2.026) a consumer cannot re-derive without its own probe rig.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-statuschiptone: `StatusChipTone`  (retire, 2026-08-26, any-site audit; superseded by the 2026-08-24 owner probe)

- **Verdict:** superseded. The audit's original keep read: "The engine ships the vocabulary and the site assigns meaning: the same chip serves a publish-state pill and a household-standing pill with no shared domain knowledge baked in." That described the dotted grammar, where `tone` was the ONLY color-carrying axis and had to stay a prop for the site to assign. The 2026-08-24 owner probe (Geoff's own ratification for the CHIP family) fused tone into the register and retired the dot that rendered it, leaving `tone` driving nothing: retiring the prop follows the ratified evidence rather than inventing a tone-times-register color grammar no probe measured. Distinguish `warning-button-tier` (held, deferred 2026-08-26) explicitly: that hold is the BUTTON family's own register question, still Geoff's to rule, and this retirement does not speak to it; the chip warning register was ratified by the owner probe and invents nothing new.
- **Reopens on:** closed. Executed by the toolkit-seams pass, Task 2: `tone`, `StatusChipTone`, and `STATUS_CHIP_DOT_CLASS` are all removed from `StatusChip`.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 37; superseded in [2026-08-26 toolkit-seams pass](../superpowers/plans/2026-08-26-toolkit-seams-pass.md), Task 2.
- **Any-site case:** No longer applicable; the register itself now carries what tone used to carry, so a site assigns its own meaning to `register`, not to a separate `tone`.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-listtoolbaraction: `ListToolbarAction`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The type is where the one-action rule is enforced: the toolbar 'never accepts more than one'. Constraining a screen to a single primary action is an engine opinion expressed in the type.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 38.
- **Any-site case:** The type is where the one-action rule is enforced: the toolbar 'never accepts more than one'. Constraining a screen to a single primary action is an engine opinion expressed in the type.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-listtoolbarfilteroption: `ListToolbarFilterOption`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Names one option in a filter's vocabulary including the count, carrying the copy rule ('All 6', never 'All(6)') in the component rather than leaving it to each site.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 39.
- **Any-site case:** Names one option in a filter's vocabulary including the count, carrying the copy rule ('All 6', never 'All(6)') in the component rather than leaving it to each site.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-listtoolbarfilter: `ListToolbarFilter`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The type a consumer actually writes. It encodes the fully controlled convention and the promoted-versus-overflow decision any site with more filters than band width has to make.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 40.
- **Any-site case:** The type a consumer actually writes. It encodes the fully controlled convention and the promoted-versus-overflow decision any site with more filters than band width has to make.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-itemlabel: `ItemLabel`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. It sits in the public prop signature of both Pagination and ListToolbar, so any consumer wanting correct grammatical number at a count of one needs it. Count lines are universal, not domain-shaped.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 41.
- **Any-site case:** It sits in the public prop signature of both Pagination and ListToolbar, so any consumer wanting correct grammatical number at a count of one needs it. Count lines are universal, not domain-shaped.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-itemnoun: `itemNoun`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Contradicts the ranking's own item 8: the same scenario answers computeCountLine retire and itemNoun keep. It is a function, so in no prop signature, the exact line retiring ItemRange and AppliedFilterPill. Body is one ternary, the gate's fail condition.
- **Reopens on:** closed. Executed by the retires pass, batch 1a: unexported from the `/admin-toolkit` barrel; stays exported from `format.ts`, since `Pagination.svelte`, `list-toolbar.ts`, and `ConceptList.svelte` all still call it internally.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 42; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1a.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md) (verdict overturned there).

## audit-admin-formatcivildate: `formatCivilDate`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site with a dated concept renders a frontmatter YYYY-MM-DD in a list; a naive new Date(iso) shows yesterday for every visitor west of UTC. cairn's own ConceptList renders exactly that cell.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 43.
- **Any-site case:** Any site with a dated concept renders a frontmatter YYYY-MM-DD in a list; a naive new Date(iso) shows yesterday for every visitor west of UTC. cairn's own ConceptList renders exactly that cell.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-formatcivildateoptions: `FormatCivilDateOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. CairnMediaLibrary uses the intlOptions passthrough for a month/day cell, proving it is not speculative; a consumer wanting a longer or shorter date shape needs it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 44.
- **Any-site case:** CairnMediaLibrary uses the intlOptions passthrough for a month/day cell, proving it is not speculative; a consumer wanting a longer or shorter date shape needs it.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-conceptlist: `ConceptList`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. It renders cairn's publish-state vocabulary directly — New, Edited, Published, plus a Hidden badge for draft frontmatter. That status is the branch model made visible; no site can compute it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 45.
- **Any-site case:** It renders cairn's publish-state vocabulary directly — New, Edited, Published, plus a Hidden badge for draft frontmatter. That status is the branch model made visible; no site can compute it.

## audit-admin-emptystate: `EmptyState`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every admin screen has a nothing-here state, and the component carries the distinction sites get wrong: whole-concept-empty is this centered fill, filtered-to-zero is AdminTable's in-card notice.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 46.
- **Any-site case:** Every admin screen has a nothing-here state, and the component carries the distinction sites get wrong: whole-concept-empty is this centered fill, filtered-to-zero is AdminTable's in-card notice.

## audit-admin-pagination: `Pagination`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A long admin list needs a pager, and this one carries the windowing that stops 40 buttons rendering plus role=status on the range line so a page change announces without moving focus.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 47.
- **Any-site case:** A long admin list needs a pager, and this one carries the windowing that stops 40 buttons rendering plus role=status on the range line so a page change announces without moving focus.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-expandablerow: `ExpandableRow`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Expand-in-place over a wide admin table: the sticky trigger cell that horizontal scroll cannot strand, zebra parity on the pinned column, and a real td colspan because a display:block cell mis-resolves width.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 48.
- **Any-site case:** Expand-in-place over a wide admin table: the sticky trigger cell that horizontal scroll cannot strand, zebra parity on the pinned column, and a real td colspan because a display:block cell mis-resolves width.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-admintable: `AdminTable`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. It owns table chrome and never a row shape: no rows:T[] prop, the caller's markup stays its own. Plus the nowrap floor and overflow-x fallback a consumer otherwise rediscovers by shipping a wrapped table.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 49.
- **Any-site case:** It owns table chrome and never a row shape: no rows:T[] prop, the caller's markup stays its own. Plus the nowrap floor and overflow-x fallback a consumer otherwise rediscovers by shipping a wrapped table.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-statuschip: `StatusChip`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. badge-error/badge-success do not compile into the packaged cairn-admin.css while every status-<tone> does, so a consumer writing badge badge-success inside the admin theme gets nothing and cannot fix it.
- **Reopens on:** closed. Both halves are now executed.
- **Shape:** Replace the 6px tone dot at StatusChip.svelte:106 as the color carrier (Geoff's 2026-08-24 owner probe ruled it illegible toolkit-wide) and complete the register set (warning-tint, outline) against cairn's own themes, re-measuring rather than copying ASC's tuning.
- **Progress note (toolkit-seams pass, Task 2, 2026-08-26):** the dot/register half of this reshape is executed: the 6px tone dot is gone, `tone` retires, and `register` alone now carries color (`'quiet' | 'warning' | 'outline'`, second generation, docs/internal/probes/2026-08-26-chip-registers-v2). The badge-tier half named in the verdict (`badge badge-success` compiling to nothing) is NOT executed here; `badge-error`/`badge-success` do now compile again in the shipped sheet, but only as an incidental side effect of Task 2 blessing them in `admin-css-safelist.ts` to preserve the shipped sheet's de facto public API after the dot-era doc comment that had accidentally compiled them was removed, not because this reshape's badge-tier recipe was built. This entry stays open; a later pass closes it if it takes up the badge-tier half.
- **Closed (conformance pass, Task 10, 2026-09-01):** the badge-tier half is executed, covering every safelisted `badge-*` class, not only `badge-error`/`badge-success`. The docket item this task's own remediation pass carried in first (4b's docket) described this entry's ALREADY-EXECUTED dot/register half, a staleness the pass caught and re-authored around rather than resurrecting the retired `tone`/dot API; `StatusChip.svelte`'s props, registers, and tuning are untouched by this task. The badge-tier recipe: `badge-error`, `badge-success`, and `badge-soft` each paint their own fill and their own base-content-derived ink (daisyUI 5.7.20's `badge-soft` recipe carries both even with no tone class set), each measured (canvas readback, the `status-chip-register-tuning.test.ts` method) against the register set's own >= 4.5:1 text floor (WCAG 1.4.3) on both packaged admin themes, clearing it with no retune needed. `badge-outline` and `badge-dash` paint no fill of their own and inherit their ink and currentColor border from the row; both are measured against the row ground on the same text floor and against the unrelated >= 3:1 non-text floor (WCAG 1.4.11) on the border, clearing both with no retune. `badge-tier-legibility.test.ts` is the one canonical home for the measured numbers themselves; this entry states the floors they clear, not the numbers, so it never becomes a second copy to fall out of date. All five stay blessed, now as a deliberate, documented badge-tier recipe rather than an incidental safelist side effect. `docs/internal/admin-design-system.md` and `docs/reference/admin-toolkit.md` both carry the when-to-use line (a stock daisyUI-flavored surface reaches for a badge tone directly; anything in the chip register grammar reaches for `StatusChip`). `badge-soft`'s own fill measures 1.185:1 against its row ground on both themes, roughly 0.32 under `chip-ground-collision`'s 1.5:1 floor; unlike the two false-positive classes that rule's own ledger entry names as open work, this one is a deliberate exemption rather than a defect: `badge-soft` is boundary-less by design, the same shape choice `badge-outline`/`badge-dash` make, and its label names the state in text (WCAG 1.4.1 Use of Color), so it never depends on the fill reading as distinct from the row. Both doc sites now carry the exemption and the WCAG 1.4.1 one-liner alongside the when-to-use line.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 50.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-listtoolbar: `ListToolbar`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. It carries a real ARIA radiogroup for segmented filters, a role=status count line, and a full disclosure pattern. The one consumer that hand-copied the disclosure 'missed all four on the first pass'.
- **Reopens on:** closed. Executed as `ToolbarDisclosure` (`/admin-toolkit`), a controlled trigger-plus-panel primitive carrying five dismissal mechanics (aria-expanded/aria-controls, focus-into-panel-on-open, Escape-plus-return-focus, outside-pointerdown, and the facet's own focus-leaves-the-boundary mechanic the original shape missed). `ListToolbar` folds both duplications onto it, its overflow menu and each `'menu'`-display facet; single-open-at-a-time for the facets stays in `ListToolbar` via `openFacetId`, since no self-contained primitive can enforce it across siblings, and the ARIA-menu content layer (role, roving tabindex, reset-to-first) stays in `ListToolbar`'s own panel content, since it is facet behavior, not disclosure mechanics. The Svelte-scoped `:focus-within` neutralizer moved with the container markup it serves, verified by a rendered check against the packaged admin sheet (the same check the original bug needed to be caught at all).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 51; executed in [2026-08-26 toolkit-seams pass](../superpowers/plans/2026-08-26-toolkit-seams-pass.md), Task 4.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-pageheader: `PageHeader`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A consumer adding a screen to CairnAdminShell needs its header band to match the engine's or the screen reads as foreign; it also carries the placement rule that search never lives in this band.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 52.
- **Any-site case:** A consumer adding a screen to CairnAdminShell needs its header band to match the engine's or the screen reads as foreign; it also carries the placement rule that search never lives in this band.

## audit-admin-cairnmedialibrary: `CairnMediaLibrary`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Its safe-delete gates on cairn's link graph: an in-use face naming the breaking entries behind a typed-slug confirm. No site can compute where-used across published and branch state.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 53.
- **Any-site case:** Its safe-delete gates on cairn's link graph: an in-use face naming the breaking entries behind a typed-slug confirm. No site can compute where-used across published and branch state.

## audit-admin-editpage: `EditPage`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. cairn's core job made visible: the save/publish lifecycle over a pending branch, the sandboxed preview frame, and the dirtiness guard. previewMint is documented as presentational only, never access control.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 54.
- **Any-site case:** cairn's core job made visible: the save/publish lifecycle over a pending branch, the sandboxed preview frame, and the dirtiness guard. previewMint is documented as presentational only, never access control.

## audit-admin-markdowneditor: `MarkdownEditor`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site mounting the bare CodeMirror surface with its own chrome, supplying controls through registerFormat, gets markdown-aware lint, GFM parsing, the directive rails, and the editor face — reachable no other way.
- **Reopens on:** closed. Executed by the internals pass, Task 7 (2026-09-02). The 13 `register*`
  props (11 per-capability callbacks plus the two object grants, `registerTidy` and
  `registerImagePlaceholders`) collapsed into one `registerEditor?: (api: EditorApi) => void`;
  `Props` now reads `extends StableEditorProps, EditPageWiringProps`. `EditorApi` is a real
  export of `MarkdownEditor.svelte` (not re-exported through the `/components` barrel, the same
  posture `FormatKind`/`TidyApi`/`ImagePlaceholderApi` already held), documented on
  `docs/reference/components.md` with its full member grammar. `spellcheckTest` is pinned
  documented-unstable, enforced by the new `check:reference` props-vs-reference clause.
- **Usage evidence:** neither the showcase nor any in-repo fixture mounts `MarkdownEditor` directly
  with a `register*` prop (`grep -rn` across `examples/showcase/src` turns up nothing); every
  reachable direct-mount caller is a test, migrated in the same task. The breaking `Consumers
  must:` line in `CHANGELOG.md` names the recovery for the theoretical external direct-mount case
  the stability tier promises, not an evidenced one.
- **Shape:** reconciled to the executed shape (ruling 1). The ledger's earlier "roughly twenty
  Unstable EditPage wiring props into one non-exported internal composition object, publishing
  only the eleven stable bare-surface props" text undercounted (13 register* props, not
  "roughly twenty") and mis-scoped the shape (the grant object is a real, documented export, not
  an internal-only composition). The executed shape is the one in the Verdict line above.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 55.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-previewbanner: `PreviewBanner`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The published state must never claim the draft went live, since a discard reaches it too; and the fixed UTC expiry string stops a Worker and a browser in different zones rendering a hydration mismatch.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 56.
- **Any-site case:** The published state must never claim the draft went live, since a discard reaches it too; and the fixed UTC expiry string stops a Worker and a browser in different zones rendering a hydration mismatch.

## audit-admin-csrffield: `CsrfField`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every form inside CairnAdminShell must carry cairn's double-submit token, read from shell context. A site cannot mint the token itself, and a form without the field fails closed by design.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 57.
- **Any-site case:** Every form inside CairnAdminShell must carry cairn's double-submit token, read from shell context. A site cannot mint the token itself, and a form without the field fails closed by design.

## audit-admin-cairnadminshell: `CairnAdminShell`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. One chrome for engine views and any custom screen, resolving a site's navLayout, the attention pills, the streamed publish-all count, the palette, and CSRF context — all engine state a site cannot compute.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 58.
- **Any-site case:** One chrome for engine views and any custom screen, resolving a site's navLayout, the attention pills, the streamed publish-all count, the palette, and CSRF context — all engine state a site cannot compute.

## audit-admin-cairnadmin: `CairnAdmin`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The whole zero-config admin from one component on the catch-all route, switching data.view across every engine screen. Its props are the adapter's three rendering knobs plus form passthrough.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 59.
- **Any-site case:** The whole zero-config admin from one component on the catch-all route, switching data.view across every engine screen. Its props are the adapter's three rendering knobs plus form passthrough.

## audit-auth-generatecsrftoken: `generateCsrfToken`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. A site building double-submit CSRF on its own member routes needs a random token. generateToken, on the same import line, already is it; the alias adds a third semver'd name and zero capability.
- **Reopens on:** closed. Executed by the retires pass, batch 1b: unexported from the `/auth-crypto` barrel; stays exported from `auth/crypto.ts`, since `sveltekit/csrf.ts` still calls it internally for the double-submit CSRF token.
- **Shape:** Body is byte-identical to generateToken (auth/crypto.ts:86); a site wanting the reading name writes a one-line local alias.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 1; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1b.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-generatesessionid: `generateSessionId`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. A site minting a member session id calls an identical function under a second name. The real edge (how many bytes, URL-safe?) is answered once by generateToken.
- **Reopens on:** closed. Executed by the retires pass, batch 1b: unexported from the `/auth-crypto` barrel; stays exported from `auth/crypto.ts`, since `sveltekit/auth-routes.ts` still calls it internally to mint a session id.
- **Shape:** A future divergence, such as a longer session id, is a parameter on one generator, never a second public name.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 2; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1b.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-channel-schema-version: `CHANNEL_SCHEMA_VERSION`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. The docs name no consumer action. The comparison it exists for runs inside the factory, and the value is already embedded in CHANNEL_SCHEMA_SQL's own seeding INSERT that the site runs.
- **Reopens on:** closed. Executed by the retires pass, batch 1b: `export` keyword dropped in `auth-channel/store.ts`; barrel line removed from `auth-channel/index.ts`. Stays a module-internal const, since `store.ts` still reads it in `verifySchema` and the seeding `INSERT`.
- **Shape:** Publishing an internal version marker as semver surface is surface without capability; a bespoke drift check reads the cairn_channel_meta row instead.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 3; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1b.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-devdelivery: `devDelivery`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. pass-2 dissent upheld: a hand-rolled transport gets no guard at all (the discoverability class the gate names), and the one built consumer redundantly guards before delegating
- **Reopens on:** closed. Executed by the retires pass, batch 1b: `auth-channel/dev.ts` deleted outright (zero remaining consumers anywhere in `src/lib`); its barrel line and subject test (`auth-channel-config.test.ts`'s `devDelivery, direct and wrapped` block) deleted with it.
- **Shape:** Its stated purpose, guarding a dev transport reaching production, is a discoverability problem an export does not fix; a factory-side CAIRN_DEV_BACKEND refusal is a design question for a later pass (createAuthChannel reads no env at construction time, so it cannot observe a per-request value), and until then the refusal lives in the site's own transport body. A site wanting the dev-only console print hand-rolls it with the refusal inside the deliver function itself, never in a caller's wrapper around it, per CHANGELOG.md's migration line and the showcase's own capture-transport.ts.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 4; conductor adjudication over recorded dissent, see the audit record; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1b.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-insertownerifempty: `insertOwnerIfEmpty`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. A site seeding its first owner from a setup script. That resolves to listEditors then insertEditor, and the engine already ships the declarative bootstrapOwner config for exactly this outcome.
- **Reopens on:** closed. Executed by the retires pass, batch 1b: unexported from the `/auth-store` barrel; stays exported from `auth/store.ts`, since `sveltekit/auth-routes.ts` still calls it internally for `bootstrapOwner`.
- **Shape:** Two public paths to one outcome. The atomic `INSERT ... SELECT ... WHERE NOT EXISTS` race matters on the concurrent bootstrap login path, which `bootstrapOwner` already owns; a site seeding a first owner from a setup script instead resolves to `listEditors` (empty?) then `insertEditor`, both kept.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 5; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1b.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-hashtoken: `hashToken`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site storing member session tokens hash-only, so a leaked database yields no live sessions, then comparing a presented token's digest against the stored row with tokensMatch.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 6.
- **Any-site case:** A site storing member session tokens hash-only, so a leaked database yields no live sessions, then comparing a presented token's digest against the stored row with tokensMatch.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-delivercontext: `DeliverContext`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site typing its own deliver implementation. Two fields, wholly entailed by createAuthChannel; no independent case.
- **Reopens on:** closed. Executed by Task 8 of the conventions pass: the type keeps with the
  factory, unchanged in shape, and its precedent grew rather than shrank. `lookup` and `verify` now
  take a narrow `{ env }` context modelled on this one, so the "resolved binding, nothing else"
  idiom this entry introduced is now the factory's rule for every callback that reads a roster.
- **Shape:** Shape is fine on its own. Membership is exactly as strong as createAuthChannel's, so it shrinks or disappears with the factory reshape (item 15).
- **Annotation (2026-08-30, conventions-pass sitting):** follows the `audit-auth-createauthchannel`
  reopen (ruling 8). The factory is KEPT and folds onto the engine's auth grammar rather than
  shrinking, so this type's "shrinks or disappears with the factory reshape" line above resolves
  as "stays with the factory": membership stays exactly as strong as `createAuthChannel`'s.
  Task 8 executes it.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 7.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-channelrequestresult: `ChannelRequestResult`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site's form action switching on the request result to pick a message. Entailed by createAuthChannel.
- **Reopens on:** closed. Executed by Task 8 of the conventions pass: the type keeps with the
  factory, unchanged, and the no-roster-leak encoding this entry credits it with (`sent` even for
  an unknown contact) survives verbatim.
- **Shape:** One of the better-shaped items here: it encodes the no-roster-leak ruling ('sent even for an unknown contact') in the type. Follows the factory's verdict.
- **Annotation (2026-08-30, conventions-pass sitting):** follows the `audit-auth-createauthchannel`
  reopen (ruling 8). The factory is KEPT and folds onto the engine's auth grammar, so this type
  keeps with it and its no-roster-leak encoding survives verbatim per the factory's fold shape.
  Task 8 executes it.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 8.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-channelconfirmresult: `ChannelConfirmResult`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site rendering seven distinct confirm outcomes on its login form, each needing site copy. Entailed by createAuthChannel.
- **Reopens on:** closed. Executed by Task 8 of the conventions pass: the type keeps with the
  factory, unchanged, and the challenge-required-is-a-retry-invitation ruling survives verbatim in
  the factory itself rather than in a replacement seam.
- **Shape:** Follows the factory. The 'challenge-required is a retry invitation, never a hard failure' ruling should survive in whatever seam replaces it.
- **Annotation (2026-08-30, conventions-pass sitting):** follows the `audit-auth-createauthchannel`
  reopen (ruling 8). The factory is KEPT and folds onto the engine's auth grammar, not replaced by
  a shrink-to-recipe seam, so the challenge-required-is-retry ruling survives verbatim in the
  factory itself. Task 8 executes it.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 9.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-authchannelevent: `AuthChannelEvent`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site typing the parameter of its own challenge callback or rateLimit.key function.
- **Shape:** (re-authored 2026-08-30 from rank 10, whose text this entry had truncated) the type
  carries an objection of its own beyond the factory's. The engine published a THIRD request-event
  shape (kit's `RequestEvent`, `CairnEvent`, and this) for a consumer to hold in their head, and the
  type's own comment conceded that kit's satisfies it structurally. Right form, per the rank source:
  name the engine's own event in the callback signatures and stop exporting a parallel shape; where
  the factory needs more than that shape carries, express the requirement as a STRUCTURAL CONSTRAINT
  on `CairnEvent` rather than a fourth published interface.
- **Reopens on:** closed. Executed by Task 8 of the conventions pass, in the structural-constraint
  form above: `challenge` and `rateLimit.key` take `CairnEvent<Env>`; `request` and `confirm` take
  `CairnEvent<Env> & { getClientAddress(): string }`, since only they derive a requester bucket;
  `logout` and `resolveSubject` take the bare `CairnEvent<Env>`, which is what lets a consumer's own
  session helper declare `(event: CairnEvent<Env>)`. `CairnEvent` is a recorded R4 re-export on
  `/auth-channel`. This is a BREAKING rename for xcathletes, stated honestly rather than claimed
  structurally compatible: it imports the NAME and uses it in a public signature, so the CHANGELOG
  carries the rename in its `Consumers must:` line and a compile-only fixture
  (`src/tests/unit/auth-channel-consumer-fixture.test.ts`) pins the post-migration shape.
- **Annotation (2026-08-30, conventions-pass sitting):** follows the `audit-auth-createauthchannel`
  reopen (ruling 8). The factory is KEPT and folds onto the engine's auth grammar: this type
  retires in favor of `CairnEvent`, a rename recorded as a breaking change for xcathletes (review
  finding F9, honestly stated rather than claimed structurally compatible). Task 8 executes it.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 10.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-authchannel: `AuthChannel`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site holding the constructed channel in a module-scope const and typing it.
- **Shape:** (re-authored 2026-08-30 from rank 11, whose text this entry had truncated) an internal
  asymmetry beyond the factory's own: `revokeSessions: (db: D1Database, subject: string)` takes a
  raw binding while every other member takes an event and resolves the binding through the config's
  `resolveDb`. The rank source's proposed right form was uniformity, `revokeSessions` taking the
  same `(event)` its siblings take, or an env, so a consumer never reaches past `resolveDb` for the
  one call the engine itself describes as the roster-removal exemplar.
- **Reopens on:** closed. Executed by Task 8 of the conventions pass, and the uniformity above is
  deliberately NOT what shipped. `revokeSessions` keeps its event-free signature as a recorded,
  doc-commented exception, per `convention-internal-sibling-comment`'s stated-split culture:
  it is the one member callable OUTSIDE a request (xcathletes calls it from a roster-archive path
  with a `db` and no event; a cron trigger and a queue consumer are the same class), so an
  event-taking signature would put the exemplar out of reach of exactly the callers who need it.
  Uniformity was weighed and lost to the out-of-request capability, and the reason is stated at the
  member itself. The rest of the interface folded: the three actions and `resolveSubject` name
  `CairnEvent` rather than the retired `AuthChannelEvent`.
- **Annotation (2026-08-30, conventions-pass sitting):** follows the `audit-auth-createauthchannel`
  reopen (ruling 8). The factory is KEPT; the `revokeSessions` asymmetry this entry names does NOT
  resolve by uniformity as originally proposed above ("give it the same" event-taking shape as its
  siblings). It stays a deliberate, doc-commented exception, per `convention-internal-sibling-comment`:
  `revokeSessions` is the one member callable outside a request (xcathletes calls it from a
  roster-archive path with a `db` and no event), and the asymmetry gets a stated reason rather than
  forced uniformity. Task 8 executes it.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 11.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-channel-schema-sql: `CHANNEL_SCHEMA_SQL`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Unavoidable while the factory exists: a site must run this DDL once against its channel binding before any action works, from a migration in its own migrations_dir.
- **Shape:** (re-authored 2026-08-30 from rank 12, whose text this entry had truncated) right
  membership while the factory stays, wrong form, and provably so by the engine's own
  inconsistency: `AUTH_DB` gets packaged `.sql` migration files shipped in the tarball, and the
  channel got a template literal a site pastes into a file it writes itself. Right form, per the
  rank source: ship the channel schema as a packaged migration directory BESIDE `migrations/`, the
  shape the engine already proves, and drop the string constant. The per-deployment salt exclusion
  the constant's own comment defends is unaffected by the change.
- **Reopens on:** closed. Executed by Task 8 of the conventions pass, exactly as proposed above.
  The DDL ships as `migrations-channel/0000_channel.sql`, a SIBLING directory never under
  `migrations/` (that is `AUTH_DB`'s own `migrations_dir`, and a shared one applies each database's
  schema to the other), packed by a `check:package` assertion that also fails a channel schema
  found under `migrations/`. Every statement is idempotent (`CREATE TABLE IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`, `INSERT OR IGNORE` for the version row), so an already-provisioned
  consumer that ran the DDL by hand can point a `migrations_dir` at it without the apply aborting;
  the `Consumers must:` line carries the insert-the-marker step for exactly that case. The store's
  `CHANNEL_SCHEMA_VERSION` is now parsed out of the packaged file by the repointed drift test, which
  also pins the showcase fixture byte-equal to it, since a version constant cannot byte-equal a SQL
  file and the two disagreeing is a fail-closed login outage. `verifySchema` semantics are
  unchanged, and the schema itself did not change.
- **Annotation (2026-08-30, conventions-pass sitting):** follows the `audit-auth-createauthchannel`
  reopen (ruling 8). The factory is KEPT and folds onto the engine's auth grammar: the wrong-form
  objection above resolves exactly as originally proposed, packaged, never a shrink-to-recipe. The
  DDL ships as `migrations-channel/0000_channel.sql`, a sibling directory never under `migrations/`
  (a shared `migrations_dir` cross-applies schemas into `AUTH_DB`), in idempotent form so an
  already-provisioned consumer's `migrations_dir` pointer does not abort. Task 8 executes it.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 12.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-authchannelconfig: `AuthChannelConfig`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The surface a consumer actually reads and writes; nobody uses the factory without it.
- **Shape:** (re-authored 2026-08-30 from rank 13, whose text this entry had truncated) two
  objections of its own, beyond following the factory. First, the `ttl` bag grouped nine knobs
  because the design document's own Defaults table did, transplanted rather than re-derived for a
  reader, and its in-tree `WATCH` comment already conceded the name: only three of the nine fields
  are durations, so `ttl` reads narrower than its contents. Right form, per the rank source: name a
  surviving knob bag for what it holds (limits, defaults), not for the three fields that happen to
  be durations. Second, `kind?: 'code'` publishes a reserved extension point with exactly one legal
  value, so an anonymous consumer can only ever write the default; the rank source's right form is
  to drop it until a second authenticator exists.
- **Reopens on:** closed for the fold; ONE residual named below. Executed by Task 8 of the
  conventions pass: `ttl` becomes `limits`, regrouped by what a site actually tunes together
  (`code`, `throttle`, `session`), with every group and every field optional so a single-knob
  override stays a single knob (`limits: { session: { ttlMs } }`, the one override xcathletes
  writes, has its own test). Construction messages name the group and the field. `lookup` and
  `verify` gain a narrow `{ env }` context rather than the full event, mirroring `DeliverContext`:
  the evidenced need is a BINDING, and handing over the event would put `request`/`cookies`/`url`
  into the two most safety-critical callbacks, where `lookup` decides subject-versus-decoy (the
  no-roster-leak property, and the factory swallows its throw as a miss) and a `false` from `verify`
  destroys the session row on every authenticated request. The TSDoc on both states that neither may
  read request-shaped data. The residual NOT closed here: `kind?: 'code'` stays. Dropping it is a
  separate breaking surface change the fold list this pass batches does not carry, and it belongs
  with whichever pass next opens this signature rather than to a second touch in the same window.
- **Annotation (2026-08-30, conventions-pass sitting):** follows the `audit-auth-createauthchannel`
  reopen (ruling 8). The factory is KEPT and folds onto the engine's auth grammar: the `ttl` bag
  re-derives by what a site actually tunes together (rank 13's re-authored shape, not the
  shrink-to-recipe this entry's own truncated shape argued for), and `lookup`/`verify` gain a
  narrow `{ env }` context, not the full event, mirroring the existing `DeliverContext` precedent.
  Task 8 executes it.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 13.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-generatetoken: `generateToken`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site with a members area mints a single-use link token to email a member. Hand-rolled, this is where Math.random, a 16-byte draw, or raw base64 +// in a URL ship and pass every test.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 14.
- **Any-site case:** A site with a members area mints a single-use link token to email a member. Hand-rolled, this is where Math.random, a 16-byte draw, or raw base64 +// in a URL ship and pass every test.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-createauthchannel: `createAuthChannel`  (reshape, 2026-08-26, any-site audit; REOPENED 2026-08-30, conventions-pass sitting)

- **Verdict:** reshape, KEPT. The 2026-08-26 shrink-to-recipe shape is overturned, in Geoff's own
  ruling at the 2026-08-30 conventions-pass sitting: *"`/auth-channel` is KEPT, reopened on
  evidence (Geoff, 2026-08-30). The 2026-08-26 shrink-to-recipe shape is overturned:
  xcathletes-org now runs its member login on `createAuthChannel`
  (`xcathletes-org/src/lib/server/auth/channel.ts`, tests included, citing
  `docs/extend/add-a-second-audience.md` Path B), so the 'no consumer anywhere has built against
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
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 15;
  [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md), item 15;
  [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), ratified
  ruling 8, Task 1, and Task 8.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md)
  (premise refuted there, verdict stands; shape further reopened by the 2026-08-30 sitting above).

## audit-auth-cookiename: `cookieName`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site setting a member session cookie on a deployment that is https in production and plain http under wrangler dev: hard-coded __Host- breaks local dev, omitting it drops origin binding in production.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 16.
- **Any-site case:** A site setting a member session cookie on a deployment that is https in production and plain http under wrangler dev: hard-coded __Host- breaks local dev, omitting it drops origin binding in production.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-tokensmatch: `tokensMatch`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site comparing a submitted session token or CSRF pair against a stored value. The natural a === b leaks timing, and the natural hand-rolled fix accepts empty against empty, authenticating a request with no cookie.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 17.
- **Any-site case:** A site comparing a submitted session token or CSRF pair against a stored value. The natural a === b leaks timing, and the natural hand-rolled fix accepts empty against empty, authenticating a request with no cookie.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-editorrow: `EditorRow`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site rendering its own roster screen writes const rows: EditorRow[] = await listEditors(db). Without the type a consumer cannot declare a kept function's result.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 18.
- **Any-site case:** A site rendering its own roster screen writes const rows: EditorRow[] = await listEditors(db). Without the type a consumer cannot declare a kept function's result.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-seteditorrole: `setEditorRole`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Unconditional UPDATE (store.ts:233). Demoting the last owner leaves a non-empty roster with zero owners; insertOwnerIfEmpty fires only on an empty table, so bootstrapOwner can never re-seed. Safe use needs findEditor, unexported. Right form: take ownerRoles, refuse.
- **Reopens on:** closed. Executed by Task 4 of the conventions pass: `setEditorRole(db, email,
  role, ownerRoles)` folds the owner-capability vocabulary into one conditional `UPDATE` whose
  `WHERE` encodes "not a demotion out of owner-capability OR another owner-capability row
  remains", per this entry's own ruled shape. Returns `{ outcome: 'ok' } | { outcome: 'last-owner'
  } | { outcome: 'not-found' }`; `editors-routes.ts`'s `editorSetRoleAction` no longer pre-fetches
  the target's role and dispatches between this function and `demoteOwnerIfNotLast`.
- **Shape:** `setEditorRole(db, email, role, ownerRoles)` takes the owner-capability vocabulary and becomes the one general-purpose role change a caller needs: one conditional `UPDATE` whose `WHERE` encodes "not a demotion out of owner-capability OR another owner-capability row remains" (atomic statement first, never a preceding read). Returns `{ outcome: 'ok' } | { outcome: 'last-owner' } | { outcome: 'not-found' }`; on `changes === 0` a follow-up read purely classifies which of the two refusal cases applies. Replaces the caller-side `findEditor`-then-branch protocol `editorSetRoleAction` used to run against `demoteOwnerIfNotLast`.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 19;
  executed by [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), Task 4.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md) (verdict overturned there).

## audit-auth-listeditors: `listEditors`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site showing 'who can edit this site' in its own admin, or a setup script checking an empty roster. Also the documented prerequisite for telling the owner guards' two false outcomes apart.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 20.
- **Any-site case:** A site showing 'who can edit this site' in its own admin, or a setup script checking an empty roster. Also the documented prerequisite for telling the owner guards' two false outcomes apart.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-inserteditor: `insertEditor`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site syncing editors from its own user table or SSO inserts Backup@Site.com as typed. Hand-rolled, that row is unreachable to the lowercased login lookup yet still blocks the last-owner guard.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 21.
- **Any-site case:** A site syncing editors from its own user table or SSO inserts Backup@Site.com as typed. Hand-rolled, that row is unreachable to the lowercased login lookup yet still blocks the last-owner guard.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-deleteeditor: `deleteEditor`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Cascade knowledge is real; the form is two exports for one operation, dispatched by a lookup the subpath withholds. The built consumer spent 20 comment lines plus a four-step protocol on 'remove this person's access' (roster-admin.ts:197-241).
- **Reopens on:** closed. Executed by Task 4 of the conventions pass: `deleteEditor(db, email,
  ownerRoles)` folds the owner-capability vocabulary into one atomic `DELETE` whose `WHERE`
  encodes "not owner-capability OR another owner-capability row remains", per this entry's own
  ruled shape. Returns `{ outcome: 'removed' } | { outcome: 'last-owner' } | { outcome:
  'not-found' }`; `editors-routes.ts`'s `editorRemoveAction` no longer pre-fetches the target's
  role and dispatches between `deleteEditor` and `removeOwnerIfNotLast`.
  `removeOwnerIfNotLast` survives as the narrower owner-only guard (see rank 24, closed below).
- **Shape:** `deleteEditor(db, email, ownerRoles)` takes the owner-capability vocabulary and becomes the one general-purpose removal a caller needs: one atomic `DELETE` whose `WHERE` encodes "not owner-capability OR another owner-capability row remains" (no preceding read of the target's role). Returns `{ outcome: 'removed' } | { outcome: 'last-owner' } | { outcome: 'not-found' }`; on `changes === 0` a follow-up existence read purely classifies the refusal, since every non-refusal case would already have matched. Resolves the two-export dispatch: a caller no longer pre-fetches the target's role and branches between `deleteEditor` and `removeOwnerIfNotLast`. `removeOwnerIfNotLast` survives as the narrower owner-only guard (see rank 24).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 22;
  executed by [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), Task 4.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md) (verdict overturned there).

## audit-auth-demoteownerifnotlast: `demoteOwnerIfNotLast`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. In-UPDATE count must survive, but it is the guarded half of the pair setEditorRole reshapes, and carries the same conflated boolean the doc works around ('to tell them apart, read the roster with listEditors first'). Evidence is symmetry, not measured misuse.
- **Reopens on:** closed. Executed by Task 4 of the conventions pass: keeps its existing narrow,
  owner-only atomic `UPDATE` (matching only `ownerRoles` rows), with the `boolean` return replaced
  by `{ outcome: 'ok' } | { outcome: 'last-owner' } | { outcome: 'not-eligible' }`, per this
  entry's own ruled shape. A concurrency test (two simultaneous demotes of a two-owner roster)
  asserts exactly one succeeds.
- **Shape:** Keeps its existing narrow, owner-only atomic `UPDATE` (matching only `ownerRoles` rows), but the `boolean` return becomes `{ outcome: 'ok' } | { outcome: 'last-owner' } | { outcome: 'not-eligible' }`. `not-eligible`, not `not-found`: the follow-up read on `changes === 0` can only establish "no row matched email AND owner-capability", which conflates absent-from-roster with present-but-not-owner, so the discriminant names only what the predicate knows.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 23;
  executed by [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), Task 4.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md) (verdict overturned there).

## audit-auth-removeownerifnotlast: `removeOwnerIfNotLast`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Measured failure: the only built consumer drops the boolean (roster-admin.ts:237) and its caller writes a roster.revoke audit record regardless, so a last-owner coach keeps editor row and sessions while the log records a revocation. Right form: discriminated result.
- **Reopens on:** closed. Executed by Task 4 of the conventions pass: keeps its existing narrow,
  owner-only atomic `DELETE` (matching only `ownerRoles` rows), with the `boolean` return replaced
  by `{ outcome: 'ok' } | { outcome: 'last-owner' } | { outcome: 'not-eligible' }`, per this
  entry's own ruled shape. A concurrency test (two simultaneous removals of a two-owner roster)
  asserts exactly one succeeds.
- **Shape:** Keeps its existing narrow, owner-only atomic `DELETE` (matching only `ownerRoles` rows), but the `boolean` return becomes `{ outcome: 'ok' } | { outcome: 'last-owner' } | { outcome: 'not-eligible' }`, the same three-arm grammar and `not-eligible` reasoning as `demoteOwnerIfNotLast` above. Survives alongside the generalized `deleteEditor` (rank 22) as the narrower guard a caller reaches for when it specifically wants an owner-only removal refused outright rather than silently no-opping.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 24;
  executed by [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), Task 4.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md) (verdict overturned there).

## audit-cloudflare-verifyturnstileoptions: `VerifyTurnstileOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site factoring its Turnstile guard into a shared helper must annotate that helper's options argument; without the export the only route is Parameters<typeof verifyTurnstile>[2].
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/rank-cloudflare-audit-sink.md), rank 1.
- **Any-site case:** A site factoring its Turnstile guard into a shared helper must annotate that helper's options argument; without the export the only route is Parameters<typeof verifyTurnstile>[2].
- **Verified:** [verify-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/verify-cloudflare-audit-sink.md).

## audit-cloudflare-checkratelimitkeys: `checkRateLimitKeys`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site checking an IP budget and an email budget on one form; but the body is a five-line loop over checkRateLimit and the broadest-first ordering it teaches is prose, not enforced.
- **Reopens on:** closed. Executed by Task 4 of the conventions pass, folded with rank 3: one
  export, `resolveRateLimit(binding, keys: string | string[])`, replaces the `checkRateLimit`/
  `checkRateLimitKeys` pair, per this entry's own ruled shape.
- **Shape:** Folds with rank 3 into one export, `resolveRateLimit(binding, keys: string | string[])`, replacing the `checkRateLimit`/`checkRateLimitKeys` boolean pair. Returns a four-arm discriminated result: `{ outcome: 'allowed' } | { outcome: 'limited'; key: string } | { outcome: 'no-binding' } | { outcome: 'failed'; error: unknown }`, keeping the documented short-circuit (the first failing key stops the loop) and the broadest-first ordering guidance in one place instead of two exports.
- **Record:** [rank-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/rank-cloudflare-audit-sink.md), rank 2;
  executed by [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), Task 4.
- **Verified:** [verify-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/verify-cloudflare-audit-sink.md).

## audit-cloudflare-checkratelimit: `checkRateLimit`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A Workers site wants a limiter that never blocks local dev or vitest when the binding is unprovisioned, and wants to be told when a misspelled binding name silently disabled it.
- **Reopens on:** closed. Executed by Task 4 of the conventions pass, folded with rank 2 into the
  same `resolveRateLimit(binding, keys)` export, returning the four-arm `RateLimitOutcome` (
  `allowed` / `limited` / `no-binding` / `failed`), per this entry's own ruled shape.
  `createSectionAction`'s inline reimplementation now calls it; the three log events
  (`admin.action.rate_limited`, `admin.action.rate_limit_absent`, `admin.action.rate_limit_failed`)
  are unchanged.
- **Shape:** One export taking `string | string[]` and returning an outcome that names the absent-binding case instead of folding it into `true` — the four-arm `resolveRateLimit` result rank 2 records. The helper captures a throwing `limit()` into the `failed` arm; degrade-to-open on that throw stays each caller's own decision, exactly as `createSectionAction` already had to hand-roll.
- **Record:** [rank-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/rank-cloudflare-audit-sink.md), rank 3;
  executed by [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), Task 4.
- **Verified:** [verify-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/verify-cloudflare-audit-sink.md).

## audit-cloudflare-verifyturnstile: `verifyTurnstile`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any Workers site with a public Turnstile form: the naive siteverify fetch trusts a malformed 200 body and throws on a fetch failure, a bot bypass two family sites shipped to production before this export existed.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/rank-cloudflare-audit-sink.md), rank 4.
- **Any-site case:** Any Workers site with a public Turnstile form: the naive siteverify fetch trusts a malformed 200 body and throws on a fetch failure, a bot bypass two family sites shipped to production before this export existed.
- **Verified:** [verify-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/verify-cloudflare-audit-sink.md).

## audit-media-resolvedassetconfig: `ResolvedAssetConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site storing the value in an exported const or threading it through its own helper needs an importable name; it is normalizeAssets's return type and buildMediaResolver's parameter type.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-media.md](record/2026-08-26-any-site-audit/rank-media.md), rank 1.
- **Any-site case:** A site storing the value in an exported const or threading it through its own helper needs an importable name; it is normalizeAssets's return type and buildMediaResolver's parameter type.
- **Verified:** [verify-media.md](record/2026-08-26-any-site-audit/verify-media.md).
- **Re-tested (4b conformance pass, Task 14):** the type's shape narrows (its `variants` member
  retires per sitting ruling 4, 2026-09-01, the `variants` evidence sweep; sweep evidence
  recorded once, at `audit-adapter-variantspec` (closed), not restated here) but the recorded
  any-site case is unaffected: a site still needs `ResolvedAssetConfig` as `normalizeAssets`'s
  return type and `createMediaResolver`'s parameter type, `variants` or no. The keep holds. See
  `audit-adapter-assetconfig` (amended) for the rest of this same amendment.

## audit-media-mediatoken: `mediaToken`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site with its own admin over its own data (an events table, a staff directory) picks an asset from cairn's media library and must write a media: reference the engine will later resolve.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-media.md](record/2026-08-26-any-site-audit/rank-media.md), rank 2.
- **Any-site case:** A site with its own admin over its own data (an events table, a staff directory) picks an asset from cairn's media library and must write a media: reference the engine will later resolve.
- **Verified:** [verify-media.md](record/2026-08-26-any-site-audit/verify-media.md).
- **Annotation (conventions pass, Task 3):** renamed `mediaToken` → `formatMediaToken`
  (`convention-verb-rules`: `parse*` is reserved for string-to-structure codecs, paired with
  `format*` for the reverse; `formatMediaToken` pairs with `parseMediaToken`). Names only; the
  signature and behavior are unchanged.

## audit-media-mediamanifest: `MediaManifest`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site writing its own card or hero helper takes the committed manifest as a parameter and needs the name; it is also readCommittedManifest's return type.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-media.md](record/2026-08-26-any-site-audit/rank-media.md), rank 3.
- **Any-site case:** A site writing its own card or hero helper takes the committed manifest as a parameter and needs the name; it is also readCommittedManifest's return type.
- **Verified:** [verify-media.md](record/2026-08-26-any-site-audit/verify-media.md).

## audit-media-normalizeassets: `normalizeAssets`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site building its own public render resolver must obtain a resolved config, and buildMediaResolver cannot take the runtime without pulling kit types into node-safe /media.
- **Reopens on:** closed. Executed by the conformance pass, Task 8: the showcase config hoists one
  `const media = { bucketBinding: 'MEDIA_BUCKET' }` fed to both `normalizeAssets(media)` and the
  adapter's `media:` member, and `templates/waymark` is regenerated from it, so the scaffold no
  longer hands a fresh site the split-brain pair. `docs/reference/media.md`'s worked example hoists
  the same `media` object rather than typing the literal a second time, and the `normalizeAssets`
  section now states that the engine already normalizes `adapter.media` once at compose
  (`CairnRuntime.resolvedAssets`), so a site's own render resolver should pass the same object
  rather than re-typing it. `normalizeAssets`'s exported signature and return type are
  byte-identical to `main`; no engine code changed.
- **Shape:** A single hoisted media block used by both `normalizeAssets(...)` and the adapter's
  `media:` member, per verify-media.md's viable form. The verify record's other candidate,
  reading `runtime.resolvedAssets` back into `cairn.config.ts`, is NOT viable and was not
  attempted: the runtime composer imports `cairn.config.ts`, so the reverse import is circular in
  the documented topology (every family repo shares this shape).
- **Record:** [rank-media.md](record/2026-08-26-any-site-audit/rank-media.md), rank 4.
- **Verified:** [verify-media.md](record/2026-08-26-any-site-audit/verify-media.md); two
  corrections recorded there: the propagation vector is the scaffold
  (`packages/create-cairn-site/template/src/theme/cairn.config.ts:368`/`:457` in the verify
  record's own citation), and the `runtime.resolvedAssets` alternative does not work (above). The
  cited path does not exist in this tree; `packages/create-cairn-site` bakes `templates/waymark`
  from the showcase at prepack (`scripts/emit-template-dir.mjs`), and that showcase-then-emit route
  supersedes the verify record's path, which predates it.

## audit-media-readcommittedmanifest: `readCommittedManifest`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A fresh site has no committed media.json until an editor uploads; a static import of the absent file fails the Vite build, so the site cannot build at all without the glob read this encodes.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-media.md](record/2026-08-26-any-site-audit/rank-media.md), rank 5.
- **Any-site case:** A fresh site has no committed media.json until an editor uploads; a static import of the absent file fails the Vite build, so the site cannot build at all without the glob read this encodes.
- **Verified:** [verify-media.md](record/2026-08-26-any-site-audit/verify-media.md).

## audit-media-parsemediatoken: `parseMediaToken`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The editor writes media: tokens into frontmatter, but the engine resolves them only inside the markdown body, so any custom hero, card grid, or OG endpoint must decode an engine-authored string.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-media.md](record/2026-08-26-any-site-audit/rank-media.md), rank 6.
- **Any-site case:** The editor writes media: tokens into frontmatter, but the engine resolves them only inside the markdown body, so any custom hero, card grid, or OG endpoint must decode an engine-authored string.
- **Verified:** [verify-media.md](record/2026-08-26-any-site-audit/verify-media.md).

## audit-media-buildmediaresolver: `buildMediaResolver`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Membership passes; shape does not. opts.preset has zero non-test callers anywhere (engine, six sites, docs) and silently contradicts imageDetail: resolve() returns presetUrl while imageDetail builds srcSet from the bare path and reports the asset's original width/height. srcset beats src, so the preset is discarded and the intrinsic dimensions are wrong — the layout shift imageDetail exists to prevent. "Costs nothing to leave" is migration cost, which never sustains a verdict. Drop opts; keep (manifest, resolved).
- **Reopens on:** closed. Executed by Task 3 of the conventions pass: renamed `createMediaResolver`
  per `convention-verb-rules` (the resolver trio's `build*` names move to `create*`, since they are
  function factories, not pure data derivation) and dropped the dead `opts?: { preset?: string }`
  parameter in the same edit, per this entry's own ruled shape; the signature is now
  `createMediaResolver(manifest, resolved): MediaResolve`. The `{ preset: 'inline' }` assertion and
  the "applies a named preset" test case in `resolve-media.test.ts` are removed with it.
- **Record:** [rank-media.md](record/2026-08-26-any-site-audit/rank-media.md), rank 7; executed by
  [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), Task 3.
- **Verified:** [verify-media.md](record/2026-08-26-any-site-audit/verify-media.md) (verdict overturned there).

## audit-delivery-ai-crawlers-reviewed: `AI_CRAWLERS_REVIEWED`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A bare date string whose only meaning is that the engine's own table may be stale; a consumer cannot refresh, override, or substitute the table buildRobots applies unconditionally.
- **Reopens on:** closed. Executed by the retires pass, batch 1c: deleted outright from `ai-crawlers.ts` (zero remaining consumers anywhere in `src/lib`); its barrel line and subject test (`delivery-ai-crawlers.test.ts`'s `AI_CRAWLERS_REVIEWED` block) deleted with it.
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 1; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1c.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md).

## audit-delivery-aicrawler: `AiCrawler`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent. Parasitic on AI_CRAWLERS: nothing in the engine accepts an AiCrawler, so a consumer can only name it while holding the table that itself fails.
- **Reopens on:** closed. Executed by the retires pass, batch 1c: dropped the `export` keyword in `ai-crawlers.ts` (consumed only inside its declaring module, by `AI_CRAWLERS`'s own array-literal type) and its barrel line in `data.ts`.
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 2; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1c.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md).

## audit-delivery-ai-crawlers: `AI_CRAWLERS`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Weak. buildRobots already applies it (robots.ts:42); importing it means reimplementing robots.txt. Sibling CONTENT_SIGNAL, same module and same doctor consumer, is deliberately internal.
- **Reopens on:** closed. Executed by the retires pass, batch 1c: the module-level export stays in `ai-crawlers.ts`, since `robots.ts` and `doctor/check-posture.ts` still import it internally; only its barrel line in `data.ts` is dropped.
- **Shape:** Demote the public export; keep the module internal beside CONTENT_SIGNAL, which the doctor already reaches by relative import.
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 3; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1c.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md).

## audit-delivery-feedview: `feedView`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Both arms fail. The hasTaxonomy guard (views.ts:26,35) is dead: content-index.ts:129 already sets tags:[] absent a taxonomy field, so nothing in feedView is consumer-unreachable. And routing:'feed' bundles inFeeds (concepts.ts:17); ASC takes it on bulletins for dated permalinks (cairn.config.ts:272) while excluding them from its feed, so inFeeds is not trustworthy membership.
- **Reopens on:** closed. Executed by the retires pass, batch 1c: `feedView` deleted outright from `views.ts` (zero remaining consumers anywhere in `src/lib`); its barrel line and subject test (`delivery-views.test.ts`'s `feedView` block) deleted with it.
- **Shape:** The reshape candidacy considered and rejected by the verification pass (an optional per-item render hook, or the `inFeeds`-filtered `ContentSummary[]` a site maps itself) does not rescue it: `ContentSummary` already carries `permalink`, `excerpt`, and normalized `tags`, so a site hand-writing its own `feed.ts` (as all six family sites already do, near-verbatim) reproduces the routing filter in one line off the already-public `inFeeds` flag. `FeedItem` stays and is what makes the retirement costless.
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 4; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1c.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md) (verdict overturned there).

## audit-delivery-unlistedroutes: `unlistedRoutes`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Reshape presupposes membership. The proposed glob-taking form still parses SvelteKit's own published route-id grammar (sitemap.ts:31-41, two regexes), touches no descriptor or content-model type, and emits no delivery document, so both arms fail in the reshaped form too. 907-life copies the doc's boilerplate verbatim (sitemap.test.ts:40-52).
- **Reopens on:** closed. Executed by the retires pass, batch 1c: `unlistedRoutes` deleted outright from `sitemap.ts`, taking its two now-orphaned private helpers (`isDynamicRouteId`, `routeIdToPath`) with it (zero remaining consumers anywhere in `src/lib`); its barrel line and subject test (`delivery-sitemap.test.ts`'s `unlistedRoutes` block) deleted with it.
- **Shape:** Move the check into `cairn-audit` or `cairn-doctor`, per the workstation rule that the mechanically detectable half never lives in a consuming site's own probe script: both arms of the export gate fail regardless of form, since the grammar it parses is SvelteKit's own, not cairn's, and it emits no delivery document.
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 5; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1c.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md) (verdict overturned there).

## audit-delivery-publicroutes: `PublicRoutes`  (reshape, 2026-08-26, any-site audit; REOPENED 2026-08-30, conventions-pass sitting)

- **Verdict:** reshape. REOPENED from `retire`/CLOSED. The original retire (below) correctly
  targeted a mechanically derived alias: `createPublicRoutes` returned an inferred object literal
  (`public-routes.ts:246`) with `ReturnType<typeof createPublicRoutes>` appended at 253, named in
  no signature, so the export rule never reached it. `convention-contract-first-returns` (ruling 2
  of the 2026-08-30 sitting) bans exactly that `ReturnType<typeof f>` idiom for every public
  factory and requires a deliberately AUTHORED return type instead. The name returns under the
  SAME identifier, `PublicRoutes`, but now as a hand-declared contract that
  `createPublicRoutes(config: PublicRoutesConfig): PublicRoutes` names in its own signature,
  satisfying the export rule the original retire found the alias failing. Task 2 of the
  conventions pass executes the reintroduction.
- **Overturned premise, with evidence:** the retire's own "one-line exact re-derivation available"
  reasoning holds for the ALIAS form and is not disturbed by this reopen; what is overturned is
  the retires pass's implicit assumption that no public factory needs its return type declared at
  all. The overturning evidence is the sitting's ruling itself (ruling 2, ratified 2026-08-30), not
  new consumer data: no site's usage of `createPublicRoutes` changed between the retire and this
  reopen.
- **Shape:** A declared `PublicRoutes` interface, composed the way `ContentRoutes` (the
  foundations-B precedent) is: hand-written members or `Pick` over the internal wide return, at the
  task's discretion. `createPublicRoutes` annotates its return with it.
- **Reopens on:** closed. Executed by Task 2 of the conventions pass: `public-routes.ts` declares
  `export interface PublicRoutes { entryLoad; entries; markdownEntries; markdownLoad }` and
  `createPublicRoutes(config: PublicRoutesConfig): PublicRoutes` names it in its own signature,
  re-exported from `/delivery`. Verified by `check:reference`/`check:reference:signatures` and the
  compile-only fixture `src/tests/unit/factory-contracts.test.ts`.
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 6;
  executed (retire) in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md),
  Task 1 batch 1c; reopened by
  [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), ratified
  ruling 2, Task 1, and Task 2.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md) (verdict
  overturned there); shape further reopened by the 2026-08-30 sitting above.

## audit-delivery-entrydataoverrides: `EntryDataOverrides`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site rendering an entry through its own lookup with substituted resolvers (a staging preview, a per-branch render). Only realized instance is the engine's own previewLoad.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 7.
- **Any-site case:** A site rendering an entry through its own lookup with substituted resolvers (a staging preview, a per-branch render). Only realized instance is the engine's own previewLoad.

## audit-delivery-contentproblem: `ContentProblem`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A content-health page holding index.problems(). Nearly dead: createSiteResolver throws on every non-draft problem first (site-resolver.ts:68), so only draft failures are reachable.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 8.
- **Any-site case:** A content-health page holding index.problems(). Nearly dead: createSiteResolver throws on every non-draft problem first (site-resolver.ts:68), so only draft failures are reachable.

## audit-delivery-jsonldscript: `jsonLdScript`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site owning its own svelte:head must serialize SeoMeta.jsonLd without a script breakout. The naive form is wrong: the engine itself shipped the bug (6b004007, U+2028/U+2029).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 9.
- **Any-site case:** A site owning its own svelte:head must serialize SeoMeta.jsonLd without a script breakout. The naive form is wrong: the engine itself shipped the bug (6b004007, U+2028/U+2029).
- **Annotation (conventions pass, Task 3):** renamed `jsonLdScript` → `renderJsonLdScript`
  (`convention-bare-noun-functions`: an exported function's name begins with a verb; `render*`
  states it produces markup, not a data structure). Names only; the signature and behavior are
  unchanged.

## audit-delivery-markdownresponse: `markdownResponse`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Wiring the .md twin route needs text/markdown; charset=utf-8, 'the one detail every site otherwise copies and occasionally gets wrong' (responses.ts:3). Weakest of five responders: no builder twin.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 10.
- **Any-site case:** Wiring the .md twin route needs text/markdown; charset=utf-8, 'the one detail every site otherwise copies and occasionally gets wrong' (responses.ts:3). Weakest of five responders: no builder twin.

## audit-delivery-seofields: `SeoFields`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Annotating a helper that carries SEO fields after readSeoFields. cairn-pub calls the function and never names the type; the four keys are the engine's declared SEO vocabulary.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 11.
- **Any-site case:** Annotating a helper that carries SEO fields after readSeoFields. cairn-pub calls the function and never names the type; the four keys are the engine's declared SEO vocabulary.

## audit-delivery-buildsitemap: `buildSitemap`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A plain-Node build step writing sitemap.xml to disk, the stated charter of /delivery/data. Shares the strongest XML escape: 'the old sitemap copy skipped quotes' (xml.ts:2).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 12.
- **Any-site case:** A plain-Node build step writing sitemap.xml to disk, the stated charter of /delivery/data. Shares the strongest XML escape: 'the old sitemap copy skipped quotes' (xml.ts:2).

## audit-delivery-resolveimageurl: `resolveImageUrl`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Building og:image from author frontmatter. The naive new URL() ships the raw media: token as the social image (seo-fields.ts:46) — a failure only cairn's own token grammar creates.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 13.
- **Any-site case:** Building og:image from author frontmatter. The naive new URL() ships the raw media: token as the social image (seo-fields.ts:46) — a failure only cairn's own token grammar creates.

## audit-delivery-readseofields: `readSeoFields`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A bespoke page (tag index, landing page) reading the same SEO keys the entry pages read, so the two surfaces agree. Depends on the engine's validate-once normalization (seo-fields.ts:24).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 14.
- **Any-site case:** A bespoke page (tag index, landing page) reading the same SEO keys the entry pages read, so the two surfaces agree. Depends on the engine's validate-once normalization (seo-fields.ts:24).

## audit-delivery-parsemanifest: `parseManifest`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Validating a fetched manifest before newlyPublishedEntries: version guard plus entry-shape checks over an engine-owned schema. Friction: the one live consumer cast instead (sweep.ts:144).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 15.
- **Any-site case:** Validating a fetched manifest before newlyPublishedEntries: version guard plus entry-shape checks over an engine-owned schema. Friction: the one live consumer cast instead (sweep.ts:144).

## audit-delivery-deriveexcerpt: `deriveExcerpt`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Excerpting text outside the corpus (a search hit, a custom card) so it matches ContentSummary.excerpt on the same page. The description-first, word-boundary, 200-char rule is engine policy.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 16.
- **Any-site case:** Excerpting text outside the corpus (a search hit, a custom card) so it matches ContentSummary.excerpt on the same page. The description-first, word-boundary, 200-char rule is engine policy.

## audit-delivery-seoinput: `SeoInput`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A chassis helper assembling head inputs for several bespoke page types before calling buildSeoMeta. Twelve call sites build it inline today because it never crosses a boundary.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 17.
- **Any-site case:** A chassis helper assembling head inputs for several bespoke page types before calling buildSeoMeta. Twelve call sites build it inline today because it never crosses a boundary.

## audit-delivery-feedchannel: `FeedChannel`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. One channel definition shared between a site's RSS and JSON Feed routes — the pattern every family site's chassis/feed.ts already follows. Its members are RSS 2.0 and JSON Feed metadata.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 18.
- **Any-site case:** One channel definition shared between a site's RSS and JSON Feed routes — the pattern every family site's chassis/feed.ts already follows. Its members are RSS 2.0 and JSON Feed metadata.

## audit-delivery-buildjsonfeed: `buildJsonFeed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A plain-Node generator writing feed.json. Holds JSON Feed 1.1 details a site gets wrong: the version URI, ISO-8601 UTC instants, and the content_html-else-content_text fallback.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 19.
- **Any-site case:** A plain-Node generator writing feed.json. Holds JSON Feed 1.1 details a site gets wrong: the version URI, ISO-8601 UTC instants, and the content_html-else-content_text fallback.

## audit-delivery-buildrssfeed: `buildRssFeed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Same node-safe generation, higher correctness floor: RFC-822 UTC dates, atom:link rel=self, and the CDATA hazard — a hand-rolled feed breaks on the first post containing ']]>'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 20.
- **Any-site case:** Same node-safe generation, higher correctness floor: RFC-822 UTC dates, atom:link rel=self, and the CDATA hazard — a hand-rolled feed breaks on the first post containing ']]>'.

## audit-delivery-siteglobs: `SiteGlobs`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A chassis that builds the glob record once and passes it to both createSiteIndexes and buildSiteManifest; without the name it loses the adapter's concept-key checking, the point of the typed pass.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 21.
- **Any-site case:** A chassis that builds the glob record once and passes it to both createSiteIndexes and buildSiteManifest; without the name it loses the adapter's concept-key checking, the point of the typed pass.

## audit-delivery-buildrobots: `buildRobots`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every site needs robots.txt pointing at its sitemap. The posture arm encodes Cloudflare's Content-Signal grammar plus the restraint of not withholding search presence (robots.ts:5).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 22.
- **Any-site case:** Every site needs robots.txt pointing at its sitemap. The posture arm encodes Cloudflare's Content-Signal grammar plus the restraint of not withholding search presence (robots.ts:5).

## audit-delivery-buildsitemanifest: `buildSiteManifest`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Load-bearing mechanism: the cairnManifest plugin's generated virtual module imports it by public specifier inside the consumer's Vite resolution (vite/internal.ts:72), where a relative path cannot reach.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 23.
- **Any-site case:** Load-bearing mechanism: the cairnManifest plugin's generated virtual module imports it by public specifier inside the consumer's Vite resolution (vite/internal.ts:72), where a relative path cannot reach.

## audit-delivery-composeentrydata: `composeEntryData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A staging preview or scheduled-publish peek needing byte-identical composition with the public page: the SEO unify rule, article-vs-website choice, adjacent pair, and hero off the media: token.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 24.
- **Any-site case:** A staging preview or scheduled-publish peek needing byte-identical composition with the public page: the SEO unify rule, article-vs-website choice, adjacent pair, and hero off the media: token.

## audit-delivery-seometa: `SeoMeta`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The contract between buildSeoMeta, CairnHead, and a site's own templates. The plain-data design ('so the template renders it', seo.ts:1) only works if the type is nameable.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 25.
- **Any-site case:** The contract between buildSeoMeta, CairnHead, and a site's own templates. The plain-data design ('so the template renders it', seo.ts:1) only works if the type is nameable.

## audit-delivery-siteindexes: `SiteIndexes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Annotating the chassis/content.ts export every family site keeps, or passing the whole bundle into a helper. Carries the reserved 'site' key rule createSiteIndexes throws on.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 26.
- **Any-site case:** Annotating the chassis/content.ts export every family site keeps, or passing the whole bundle into a helper. Carries the reserved 'site' key rule createSiteIndexes throws on.

## audit-delivery-sitemapview: `sitemapView`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A sitemap must list exactly the routable concepts; getting it wrong 'hands a crawler a 404' (site-resolver.ts:30). That membership comes from engine-owned routing flags.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 27.
- **Any-site case:** A sitemap must list exactly the routable concepts; getting it wrong 'hands a crawler a 404' (site-resolver.ts:30). That membership comes from engine-owned routing flags.
- **Annotation (conventions pass, Task 3):** renamed `sitemapView` → `buildSitemapView`
  (`convention-verb-rules`: `build*` derives pure data; the exported function's name begins with a
  verb per `convention-bare-noun-functions`). Names only; the signature and behavior are unchanged.

## audit-delivery-newlypublishedentries: `newlyPublishedEntries`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Announcing a post on first publish. Not derivable: it depends on the publishedAt stamp, upsertEntry's carry-forward rules, and the concept+id key — 'a drafted entry CAN carry a stamp forward' (manifest.ts:44).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 28.
- **Any-site case:** Announcing a post on first publish. Not derivable: it depends on the publishedAt stamp, upsertEntry's carry-forward rules, and the concept+id key — 'a drafted entry CAN carry a stamp forward' (manifest.ts:44).
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md).
- **Annotation (conventions pass, Task 3):** renamed `newlyPublishedEntries` → `diffNewlyPublished`
  (`convention-bare-noun-functions`: an exported function's name begins with a verb; `diff*` states
  it compares a before/after manifest pair). Names only; the signature and behavior are unchanged.

## audit-delivery-buildfragmentresolver: `buildFragmentResolver`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site using ::include must resolve a fragment id to raw markdown at build. Depends on the reserved fragments concept id and the throw-at-build, mark-at-preview split (site-resolver.ts:200).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 29.
- **Any-site case:** Any site using ::include must resolve a fragment id to raw markdown at build. Depends on the reserved fragments concept id and the throw-at-build, mark-at-preview split (site-resolver.ts:200).
- **Annotation (conventions pass, Task 3):** renamed `buildFragmentResolver` → `createFragmentResolver`
  (`convention-verb-rules`: the resolver trio's `build*` names move to `create*`, since they are
  function factories, not pure data derivation). Names only; the signature and behavior are
  unchanged.

## audit-delivery-resolvedreference: `ResolvedReference`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Typing an author card or related-entry prop. Reuses the target's own summary fields 'so a linked author card reads the same title and permalink the target's own page does' (site-resolver.ts:124).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 30.
- **Any-site case:** Typing an author card or related-entry prop. Reuses the target's own summary fields 'so a linked author card reads the same title and permalink the target's own page does' (site-resolver.ts:124).

## audit-delivery-resolvereferences: `resolveReferences`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Only the cross-concept resolver reaches another concept's entries: 'a posts entry's author edge targets a pages entry, which the posts index alone cannot read' (site-resolver.ts:151).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 31.
- **Any-site case:** Only the cross-concept resolver reaches another concept's entries: 'a posts entry's author edge targets a pages entry, which the posts index alone cannot read' (site-resolver.ts:151).

## audit-delivery-sitemapurl: `SitemapUrl`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every site that hand-assembles part of its sitemap declares an array of these before passing it to sitemapResponse — the contract between the site's route list and the engine's serializer.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 32.
- **Any-site case:** Every site that hand-assembles part of its sitemap declares an array of these before passing it to sitemapResponse — the contract between the site's route list and the engine's serializer.

## audit-delivery-jsonfeedresponse: `jsonFeedResponse`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site's feed.json/+server.ts is one call; the engine holds the JSON Feed 1.1 document and application/feed+json, the content type sites otherwise copy and get wrong.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 33.
- **Any-site case:** A site's feed.json/+server.ts is one call; the engine holds the JSON Feed 1.1 document and application/feed+json, the content type sites otherwise copy and get wrong.

## audit-delivery-sitemapresponse: `sitemapResponse`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. sitemap.xml/+server.ts reduces to one call, with application/xml; charset=utf-8 held by the engine — a content type with a common wrong answer some crawlers treat differently.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 34.
- **Any-site case:** sitemap.xml/+server.ts reduces to one call, with application/xml; charset=utf-8 held by the engine — a content type with a common wrong answer some crawlers treat differently.

## audit-delivery-robotsresponse: `robotsResponse`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. One-call robots.txt route, and the only path any consumer actually uses to reach the AI-posture behavior. A wrong content type here has a search-visibility cost.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 35.
- **Any-site case:** One-call robots.txt route, and the only path any consumer actually uses to reach the AI-posture behavior. A wrong content type here has a search-visibility cost.

## audit-delivery-rssresponse: `rssResponse`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. feed.xml/+server.ts is one call over the site's own item list, wrapping the document with the most ways to be wrong (RFC-822, CDATA, escaping) behind a content type readers are strict about.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 36.
- **Any-site case:** feed.xml/+server.ts is one call over the site's own item list, wrapping the document with the most ways to be wrong (RFC-822, CDATA, escaping) behind a content type readers are strict about.

## audit-delivery-buildseometa: `buildSeoMeta`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Bespoke pages the catch-all doesn't serve (tag index, events list) must emit the same OG, Twitter, canonical, and schema.org head, or social previews disagree page to page.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 37.
- **Any-site case:** Bespoke pages the catch-all doesn't serve (tag index, events list) must emit the same OG, Twitter, canonical, and schema.org head, or social previews disagree page to page.

## audit-delivery-sitedescriptors: `siteDescriptors`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The only legal way to obtain the ConceptDescriptor[] that sitemapView, feedView, and resolveReferences require; it delegates to normalizeConcepts 'so the pairing is one path, not tribal knowledge'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 38.
- **Any-site case:** The only legal way to obtain the ConceptDescriptor[] that sitemapView, feedView, and resolveReferences require; it delegates to normalizeConcepts 'so the pairing is one path, not tribal knowledge'.
- **Annotation (conventions pass, Task 3):** renamed `siteDescriptors` → `buildSiteDescriptors`
  (`convention-bare-noun-functions`: an exported function's name begins with a verb; `build*` derives
  pure data). Names only; the signature and behavior are unchanged. The live `## Unreleased`
  CHANGELOG line instructing hand-writing off `siteDescriptors` (retires pass) is amended to the new
  name in this same task, per the window-consistency constraint.

## audit-delivery-cairnhead: `CairnHead`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The one place plain-data SeoMeta becomes markup: the name-vs-property branch, escaped JSON-LD, title={false} escape, and the twin's alternate link omitted for a noindex entry.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 39.
- **Any-site case:** The one place plain-data SeoMeta becomes markup: the name-vs-property branch, escaped JSON-LD, title={false} escape, and the twin's alternate link omitted for a noindex entry.

## audit-delivery-feeditem: `FeedItem`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The target shape of the one module every cairn site hand-writes — 'the one place that maps the posts index into cairn-cms/delivery's FeedItem shape' — letting one mapping feed both serializers.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 40.
- **Any-site case:** The target shape of the one module every cairn site hand-writes — 'the one place that maps the posts index into cairn-cms/delivery's FeedItem shape' — letting one mapping feed both serializers.

## audit-delivery-publicroutesconfig: `PublicRoutesConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A chassis builds the config once so the catch-all route, the markdown twin route, and any preview path share one definition; composeEntryData also takes it by name.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 41.
- **Any-site case:** A chassis builds the config once so the catch-all route, the markdown twin route, and any preview path share one definition; composeEntryData also takes it by name.

## audit-delivery-entrydata: `EntryData`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The catch-all returns it and the page component types the prop. Every field is engine-derived: rendered html with engine resolvers wired, composed SEO, the adjacent pair, the hero off the media: token.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 42.
- **Any-site case:** The catch-all returns it and the page component types the prop. Every field is engine-derived: rendered html with engine resolvers wired, composed SEO, the adjacent pair, the hero off the media: token.

## audit-delivery-buildlinkresolver: `buildLinkResolver`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. cairn:<concept>/<id> is a grammar cairn invented; resolving it needs the cross-concept union plus the routability rule, and the throw-on-miss is the build backstop against dead links.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 43.
- **Any-site case:** cairn:<concept>/<id> is a grammar cairn invented; resolving it needs the cross-concept union plus the routability rule, and the throw-on-miss is the build backstop against dead links.
- **Annotation (conventions pass, Task 3):** renamed `buildLinkResolver` → `createLinkResolver`
  (`convention-verb-rules`: the resolver trio's `build*` names move to `create*`, since they are
  function factories, not pure data derivation). Names only; the signature and behavior are
  unchanged.

## audit-delivery-contentindex: `ContentIndex`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Passing one concept's index into an archive, tag page, or related-posts helper. Its members encode draft filtering, per-concept ordering, and taxonomy-marked byTag — none re-derivable.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 44.
- **Any-site case:** Passing one concept's index into an archive, tag page, or related-posts helper. Its members encode draft filtering, per-concept ordering, and taxonomy-marked byTag — none re-derivable.

## audit-delivery-contententry: `ContentEntry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. byPermalink returns it, composeEntryData takes it, EntryData carries it. Its frontmatter is the validator's normalized output, not raw YAML — unreproducible without the validator.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 45.
- **Any-site case:** byPermalink returns it, composeEntryData takes it, EntryData carries it. Its frontmatter is the validator's normalized output, not raw YAML — unreproducible without the validator.

## audit-delivery-siteresolver: `SiteResolver`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Unconstructable by a site: createSiteResolver was demoted internal in 2026-07. Carries the permalink union, duplicate-permalink build failure, and the routable gate that prevents advertising 404s.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 46.
- **Any-site case:** Unconstructable by a site: createSiteResolver was demoted internal in 2026-07. Carries the permalink union, duplicate-permalink build failure, and the routable gate that prevents advertising 404s.

## audit-delivery-contentsummary: `ContentSummary`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Every list, card, archive, tag page, and feed mapping holds one. Its tags field deliberately differs from frontmatter.tags (content-index.ts:35), so a site reading frontmatter gets a different answer.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 47.
- **Any-site case:** Every list, card, archive, tag page, and feed mapping holds one. Its tags field deliberately differs from frontmatter.tags (content-index.ts:35), so a site reading frontmatter gets a different answer.

## audit-delivery-createsiteindexes: `createSiteIndexes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The only legal door from markdown files to a typed corpus: createContentIndex, createSiteResolver, fromGlob, and RawFile were all demoted internal in the 2026-07-01 prune.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 48.
- **Any-site case:** The only legal door from markdown files to a typed corpus: createContentIndex, createSiteResolver, fromGlob, and RawFile were all demoted internal in the 2026-07-01 prune.

## audit-delivery-createpublicroutes: `createPublicRoutes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A cairn site's public pages are one catch-all route. Hand-rolling the twin ships a disclosure bug or 404s: the noindex refusal is duplicated in enumerator and loader deliberately.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 49.
- **Any-site case:** A cairn site's public pages are one catch-all route. Hand-rolling the twin ships a disclosure bug or 404s: the noindex refusal is duplicated in enumerator and loader deliberately.

## audit-render-cardshell: `cardShell`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. It hands a stranger a baked <div class="card-body"> they did not choose, saving one h() call in a file that already imports hastscript.
- **Reopens on:** open; not executed by the retires pass. The r4-rederivation addendum ruling defers
  this name to list (c) Tier 4 (chassis-coupled): it is value-imported by
  `examples/showcase/src/theme/cairn.config.ts` / `src/chassis/render.ts` and the baked
  `templates/waymark` twins, and taught as `docs/extend/configure-rendering.md`'s worked example, so
  its deletion requires the chassis re-homing, `emit:template` re-bake, and guide rewrite in the
  same change. The chassis pass (slice 6) owns the re-homing, the re-emit, the guide rewrite, and
  then the deletion.
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 1; [r4-rederivation](record/2026-08-30-r4-rederivation.md), section 7 (ADDENDUM RULINGS).
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-render-iconspan: `iconSpan`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The whole body is one family site's class vocabulary ('ec-icon'), and every family site already wraps it in its own makeIconRenderer factory anyway.
- **Reopens on:** open; not executed by the retires pass. The r4-rederivation addendum ruling defers
  this name to list (c) Tier 4 (chassis-coupled): it is value-imported by
  `examples/showcase/src/theme/cairn.config.ts` / `src/chassis/render.ts` and the baked
  `templates/waymark` twins, and taught as `docs/extend/configure-rendering.md`'s worked example, so
  its deletion requires the chassis re-homing, `emit:template` re-bake, and guide rewrite in the
  same change. The chassis pass (slice 6) owns the re-homing, the re-emit, the guide rewrite, and
  then the deletion.
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 2; [r4-rederivation](record/2026-08-30-r4-rederivation.md), section 7 (ADDENDUM RULINGS).
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-render-headrow: `headRow`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Weak. Real logic (optional icon, level), but bakes 'ec-head' and 'card-title'; a stranger whose design lacks those classes must override or abandon it.
- **Reopens on:** open; not executed by the retires pass. The r4-rederivation addendum ruling defers
  this name to list (c) Tier 4 (chassis-coupled): it is value-imported by
  `examples/showcase/src/theme/cairn.config.ts` / `src/chassis/render.ts` and the baked
  `templates/waymark` twins, and taught as `docs/extend/configure-rendering.md`'s worked example, so
  its deletion requires the chassis re-homing, `emit:template` re-bake, and guide rewrite in the
  same change. The chassis pass (slice 6) owns the re-homing, the re-emit, the guide rewrite, and
  then the deletion.
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 3; [r4-rederivation](record/2026-08-30-r4-rederivation.md), section 7 (ADDENDUM RULINGS).
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-render-iselement: `isElement`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Generally applicable but unnecessary: the body is `!!node && node.type === 'element'` over hast types the site already imports, and hast-util-is-element exists.
- **Reopens on:** closed. Executed by the retires pass, batch 1c: the module-level export stays in `rehype-dispatch.ts` (its own other transform functions call it internally); only its barrel line in `render/authoring.ts` (the `/render` subpath) is dropped.
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 4; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1c.
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-render-strattr: `strAttr`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Real and design-agnostic: the engine types attributes as string|boolean, so every string read must narrow. 10-17 call sites per family site, 15 in the shipped scaffold.
- **Reopens on:** closed. Executed by the conformance pass (Task 7): `strAttr(ctx, key)` moved onto `ComponentContext` as `attr(key)`, not `str(key)` (the verify record's proposed name) — `attr` matches its siblings `slot(name)`/`items(name)`, which name what they return rather than restate the signature. The standalone `/render` export retires; the `ComponentContext` re-export record's reason rewrites from "`strAttr` names it on this subpath" to the consumer-builder parameter typing that now motivates it. Four consumer repos migrated their call sites (`strAttr(ctx, key)` to `ctx.attr(key)`), the showcase and regenerated `templates/waymark` included. The deeper `FieldDescriptor`-typed fix the verify record flagged (typing `attributes` itself from a component's own field declarations, so a `text` attribute reads as `string` with no accessor) stays blocked by `build` living inside the same object literal it would infer from, and is not attempted here.
- **Shape:** Move the reader onto `ComponentContext` as `attr(key)`, beside `slot(name)` and `items(name)`; drop the standalone `/render` export.
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 5.
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-render-cairnmanifestoptions: `CairnManifestOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A consumer factoring build config (shared makeCairnPlugins, or a monorepo with two cairn sites) must name the parameter; the type is already reachable via Parameters<>, so naming it is strictly better.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 6.
- **Any-site case:** A consumer factoring build config (shared makeCairnPlugins, or a monorepo with two cairn sites) must name the parameter; the type is already reachable via Parameters<>, so naming it is strictly better.
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-render-hydrateislands: `hydrateIslands`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A stranger sets hydrate:'visible' and must mount after every SPA navigation. The boundary attributes are engine-emitted and versioned; a hand-roll stacks duplicate instances on the second navigation.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 7.
- **Any-site case:** A stranger sets hydrate:'visible' and must mount after every SPA navigation. The boundary attributes are engine-emitted and versioned; a hand-roll stacks duplicate instances on the second navigation.
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-render-cairnmanifest: `cairnManifest`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A stranger edits a markdown file, forgets to regenerate the committed manifest, and deploys; without the plugin the build passes and the index silently omits the post.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 8.
- **Any-site case:** A stranger edits a markdown file, forgets to regenerate the committed manifest, and deploys; without the plugin the build passes and the index silently omits the post.
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-repro-stories: `stories`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Unimported by the only consumer; enumerating the registry is build-time work that belongs on the node-safe manifest, so this export points a consumer at the Svelte half.
- **Reopens on:** closed. Executed by the retires pass, batch 1c: dropped the `export` keyword in `reproductions/index.ts` (consumed only inside its declaring module, by `getStory`); `reproductions-stories.test.ts`'s "universal story contract" loop repointed onto `manifest` filtered through `getStory`, the seam the real admin reaches a story through, rather than the array directly.
- **Shape:** Un-export; keep module-internal for getStory and the in-repo test.
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 1; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1c.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-fixturemediabase: `fixtureMediaBase`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A docs site under a SvelteKit paths.base cannot comply: ReproContext hardcodes the root-absolute /repro-assets with no override, so every fixture image 404s.
- **Reopens on:** closed. Executed by the conformance pass, Task 6: `ReproContext` gains an
  optional `mediaBase` prop defaulting internally to `/repro-assets`, threaded to both the
  `MEDIA_BASE_CONTEXT_KEY` setContext and the shell-hosted path's own `shellData.mediaBase`
  (`CairnAdminShell`'s shadowing context); the exported constant retires with no export-map entry
  to drop (the `/reproductions/manifest` subpath survives on its other exports). Seam fit: the
  reshape holds cleanly, matching verify's mechanical-viability finding, since fixture URLs
  compose at render time from context plus asset slug/hash/ext rather than being baked into
  fixture data.
- **Shape:** Make the media base a ReproContext prop defaulting to /repro-assets; the site owns its URL space and the constant export can go.
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 2; executed by [2026-09-01-conformance-pass.md](../superpowers/plans/2026-09-01-conformance-pass.md), Task 6.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-reproinstance: `ReproInstance`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Stated ground is false: tsc --declaration emits a non-exported same-file alias verbatim. The alias is Record<string, unknown> ("Untyped by design", index.ts:26), carries no engine fact, and cairn-pub's installed 0.95.0-rc.1 has no such parameter.
- **Reopens on:** closed. Executed by the retires pass, Task 2: dropped the `export` keyword in `reproductions/index.ts` (consumed only inside its declaring module, by `ReproStory.pose`); `ReproContext.svelte` and the test suite's shared mount helper now derive the type structurally as `Parameters<NonNullable<ReproStory['pose']>>[1]` rather than importing the name. Survives structurally inside `ReproStory`; accepted `NavIcon`-class leak per the F-1 hybrid ruling, r4-rederivation section 7.
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 3.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md) (verdict overturned there).

## audit-repro-reprofencevalidation: `ReproFenceValidation`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Named at zero call sites worldwide: only its declaration, its own return annotation, the manifest.ts:331 re-export, and the reference page. Eleven in-repo sites and check-visuals.mjs:194-200 destructure inline. Retiring is one clause off line 331.
- **Reopens on:** closed. Executed by the conventions pass, Task 9, alongside the
  `validateReproFence` reshape it was blocked on: the return type inlines to `{ issues: string[] }`
  (contract-first, since the inlined return removes its only carrier), so `ReproFenceValidation`
  loses its declaration, its `manifest.ts:331` re-export, and the reference-page entry. Retiring
  leak-free: verified with the regenerated `api-surface.md` carrying zero hits for the name.
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 4; [r4-rederivation](record/2026-08-30-r4-rederivation.md), section 7 (ADDENDUM RULINGS); executed
  by [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), Task 9.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md) (verdict overturned there).

## audit-repro-reproheights: `ReproHeights`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site sizing an embed iframe before load makes the indexed read entry.heights[width] ?? entry.heights.column, exactly as cairn-pub repro-marker.ts:114 does.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 5.
- **Any-site case:** Any site sizing an embed iframe before load makes the indexed read entry.heights[width] ?? entry.heights.column, exactly as cairn-pub repro-marker.ts:114 does.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-validatereprofence: `validateReproFence`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Half is engine-only (story resolves, width declared). Half is cairn-pub's register: a hardcoded English "Reproduction" alt prefix and a 150-char cap refuse a localized site's valid page.
- **Reopens on:** closed. Executed by the conventions pass, Task 9: `validateReproFence` gains a
  third parameter, `options?: ValidateReproFenceOptions` (`altPrefix?: RegExp; maxAltLength?:
  number; extraKeys?: string[]`), with no register default baked into the engine; omitting an
  option skips the check it backs entirely. The manifest-dependent half (required keys, `story`
  resolves, `width` declared) stays engine-owned and unconditional. `check-visuals.mjs`, this
  engine's own build of gate 1, now supplies cairn-pub's register explicitly (`REPRO_REGISTER`,
  the same `"Reproduction"`-prefixed English alt, 150-character ceiling, and closed key set the
  hardcoded version enforced) rather than the engine baking it in.
- **Shape:** Keep and export only the manifest-dependent half; move the alt prefix, 150-char ceiling, and closed key set behind caller options or back to the site.
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 6; executed by
  [2026-08-30-conventions-pass.md](../superpowers/plans/2026-08-30-conventions-pass.md), Task 9.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-repromanifestentry: `ReproManifestEntry`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site iterating the registry at build time (one prerendered route per story, embed sizing, chip counting) types that iteration through it; the fields are engine facts a site cannot derive.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 7.
- **Any-site case:** A site iterating the registry at build time (one prerendered route per story, embed sizing, chip counting) types that iteration through it; the fields are engine facts a site cannot derive.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-fixturemediafiles: `fixtureMediaFiles`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site serving the fixture bytes needs the content-hashed names for prerender entries() and as the allowlist keeping a [...file] route from walking the installed package tree.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 8.
- **Any-site case:** A site serving the fixture bytes needs the content-hashed names for prerender entries() and as the allowlist keeping a [...file] route from walking the installed package tree.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-reprostory: `ReproStory`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A capture or embed pipeline runs settle then pose against the mounted root before measuring; typing that driver needs the shape (cairn-pub: Pick<ReproStory,'settle'|'pose'>).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 9.
- **Any-site case:** A capture or embed pipeline runs settle then pose against the mounted root before measuring; typing that driver needs the shape (cairn-pub: Pick<ReproStory,'settle'|'pose'>).
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-getstory: `getStory`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A /repro/[id] route resolves a URL param to the one story it mounts and throws on an unknown id rather than rendering a blank frame.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 10.
- **Any-site case:** A /repro/[id] route resolves a URL param to the one story it mounts and throws on an unknown id rather than rendering a blank frame.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-manifest: `manifest`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site needs, from a bare node process at build time, what stories exist and how each is framed; a hand-written copy reintroduces the staleness the seam exists to eliminate.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 11.
- **Any-site case:** A site needs, from a bare node process at build time, what stories exist and how each is framed; a hand-written copy reintroduces the staleness the seam exists to eliminate.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-reprocontext: `ReproContext`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site rendering the cairn editor in its own handbook cannot: six mounted components are unexported, two context keys internal, and containment (inert subtree, five captured document events) unreachable.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 12.
- **Any-site case:** A site rendering the cairn editor in its own handbook cannot: six mounted components are unexported, two context keys internal, and containment (inert subtree, five captured document events) unreachable.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-log-auth-channel-delivery-inline: `auth.channel.delivery_inline`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. factory.ts:721-726 comment: inline await runs on "the unit-test/no-adapter runtime... log so a real deployment missing its platform binding is loud". resolveWaitUntil (:114-120) returns undefined whenever platform.ctx/context is unwired, an anonymous misconfiguration. Folding into auth.channel.requested (info, every request, :705) destroys alertability-by-existence.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 1.
- **Any-site case:** Essentially none in production: doc calls it "the unit-test and edge-case runtime path", and on Cloudflare Workers (the engine's only supported runtime) waitUntil is always present, so an anonymous consumer never emits this record.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md) (verdict overturned there).

## audit-log-auth-session-destroyed: `auth.session.destroyed`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. "An editor reports being signed out unexpectedly" — today this record cannot confirm or deny it for that editor, since it carries nothing.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 11. The record names the deleted row's own email and fires only on a real deletion; `docs/reference/log-events.md`'s row states both. Seam fit: `deleteSession` returns `Promise<string | null>`, so a caller that ignores the value behaves exactly as before, and the dev fake AUTH_DB gained the matching statement handler.
- **Shape:** Name the session's subject without an extra read: `deleteSession` becomes `DELETE FROM session WHERE id = ? RETURNING email` and answers with the deleted row's email, which the logout record carries. Logout is a public admin path, so the guard resolves no editor onto it and the row is the only place the subject exists. No returned row means no record.
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 2.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-channel-session-created: `auth.channel.session.created`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A member reports "the code worked but I'm not logged in": this record's presence or absence after auth.channel.confirmed isolates the fault to the session row write.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 3.
- **Any-site case:** A member reports "the code worked but I'm not logged in": this record's presence or absence after auth.channel.confirmed isolates the fault to the session row write.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-session-created: `auth.session.created`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor clicks a valid magic link and lands back at login: auth.token.confirmed present with auth.session.created absent separates a session-write fault from a token fault.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 4.
- **Any-site case:** An editor clicks a valid magic link and lands back at login: auth.token.confirmed present with auth.session.created absent separates a session-write fault from a token fault.

## audit-log-dictionary-added: `dictionary.added`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. "An author says a word keeps flagging as misspelled" — a count plus the `retried` flag answers that; the words themselves are not needed to diagnose it.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 11. `dictionary.added` and `dictionary.add_conflict` both carry `wordCount`, and the reference rows note the client keeps the pending words. Seam fit: contract-consistency, not confidentiality; the same words reach the public commit message and the committed file. The dead `commitFields` variable at `content-routes-dictionary.ts:126`, a fifth pseudo-concept whose `id` would have been the first added word if ever wired, is deleted in the same change.
- **Shape:** Ship a count, never the flagged tokens: both `dictionary.added` and `dictionary.add_conflict` carry `wordCount` in place of `words`, conforming the records to the documented `dictionary.*` content contract.
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 5.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-commit-reverted: `commit.reverted`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. "Why did this draft's text change under an editor?" — `ref` (the reverted-to sha) and `branchSha` (the new branch commit) exist nowhere else, and the doc states it fires alongside commit.succeeded for the same commit.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 6.
- **Any-site case:** "Why did this draft's text change under an editor?" — `ref` (the reverted-to sha) and `branchSha` (the new branch commit) exist nowhere else, and the doc states it fires alongside commit.succeeded for the same commit.

## audit-log-auth-channel-session-destroyed: `auth.channel.session.destroyed`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The keep rests on "an extra D1 read"; D1 supports DELETE ... RETURNING subject, one statement (store.ts:334-336), and the hash is local. factory.ts:903 carries nothing, the same defect reshaped at rank 2 on the same kind of blind delete. Evenness forbids splitting them.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 11, alongside rank 2 as the verify record requires. Seam fit: the channel subsystem keeps its spec-level posture that no record carries a roster identity, so the evenness fix lands in the subsystem's own currency rather than borrowing the magic-link subsystem's raw-email convention. Deliberate trade, recorded once: the verify-refused path used to revoke in total silence, no record and no pseudonym anywhere; it now emits the same pseudonymous `correlationId` every other teardown does, so evenness wins over staying maximally quiet on this one path.
- **Shape:** `destroyChannelSession` becomes `DELETE ... RETURNING subject`, and the logout record derives the channel's own pseudonym from the returned subject, `(await deriveIdentity(salt, subject, '')).slice(0, 16)`, which reconstructs the exact `correlationId` the request flow produced. The raw subject never reaches a record. The verify-refused revocation in `resolveSubject`, silent until now, gains the same record; confirm's orphan cleanup keeps its own flow's `correlationId` and takes nothing from the destroyed row. Every emit fires only on a real deletion, and a salt fault at teardown skips the record rather than failing the request.
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 7.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md) (verdict overturned there).

## audit-log-preview-token-revoked: `preview.token.revoked`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. "An editor swears they revoked a preview link but it still resolves" — `count: 0` says the revoke matched no rows, which is the answer.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 8.
- **Any-site case:** "An editor swears they revoked a preview link but it still resolves" — `count: 0` says the revoke matched no rows, which is the answer.

## audit-log-media-alt-propagated: `media.alt_propagated`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor sets a default alt and reports "nothing changed on my pages": `written: 0` with `overwrite: false` names the cause (the placements already carried custom alt) without opening a diff.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 9.
- **Any-site case:** An editor sets a default alt and reports "nothing changed on my pages": `written: 0` with `overwrite: false` names the cause (the placements already carried custom alt) without opening a diff.

## audit-log-admin-action-audited: `admin.action.audited`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site whose own sink truncated a `detail` field reconstructs the full record from this line. The doc states the property that earns the slot: this is the untruncated original, and audit.sink.write_failed's `detail` is a truncated copy.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 10.
- **Any-site case:** A site whose own sink truncated a `detail` field reconstructs the full record from this line. The doc states the property that earns the slot: this is the untruncated original, and audit.sink.write_failed's `detail` is a truncated copy.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-token-confirmed: `auth.token.confirmed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor clicks a link and lands back on the login screen: this record present with no following auth.session.created isolates the fault to the session write rather than the token.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 11.
- **Any-site case:** An editor clicks a link and lands back on the login screen: this record present with no following auth.session.created isolates the fault to the session write rather than the token.

## audit-log-media-bulk-deleted: `media.bulk_deleted`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An operator selects thirty assets, sees fewer disappear, and `skipped` names how many were still referenced without re-running the reference scan.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 12.
- **Any-site case:** An operator selects thirty assets, sees fewer disappear, and `skipped` names how many were still referenced without re-running the reference scan.

## audit-log-preview-token-minted: `preview.token.minted`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. "The preview link my editor sent stopped working" — `expiresAt` against the request time settles expiry versus revocation in one read, and preview.rejected's `expired` reason confirms it from the other side. Doc: "Never carries the token itself."
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 13.
- **Any-site case:** "The preview link my editor sent stopped working" — `expiresAt` against the request time settles expiry versus revocation in one read, and preview.rejected's `expired` reason confirms it from the other side. Doc: "Never carries the token itself."

## audit-log-tidy-succeeded: `tidy.succeeded`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. "Our Anthropic bill jumped" — a per-editor token total is exactly the query, and this is the only record carrying it.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 4, alongside the `TidyClient`
  narrowing (audit-sveltekit-tidyclient): the record's `usage` field becomes `tokens: { input,
  output }`, the engine's own two numbers, projected off `TidyClient.tidy`'s coarse token record
  rather than re-exporting the vendor `usage` object (`content-routes-tidy.ts`'s `tidy.succeeded`
  emit). `docs/reference/log-events.md`'s row updated in the same task. Seam fit: the field name
  change lands in the same unpublished window as the client narrowing that motivates it, so a site
  reading this record updates both at once.
- **Shape:** Project the two numbers the engine means (input, output token counts) as `tokens: { input, output }` instead of re-exporting the vendor `usage` object; `content-routes-tidy.ts`'s `tidy.succeeded` emit reads them off `TidyClient.tidy`'s own coarse token record.
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 14.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-link-requested: `auth.link.requested`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The doc argues the anonymous case directly (log-events.md:101-104): "Because the endpoint has no authentication, a flood of distinct addresses here signals a request flood that edge rate-limiting can throttle." No other record supports that, which is why this one alone logs the raw pre-allowlist address (lowercased, trimmed, capped at 320).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 15.
- **Any-site case:** The doc argues the anonymous case directly (log-events.md:101-104): "Because the endpoint has no authentication, a flood of distinct addresses here signals a request flood that edge rate-limiting can throttle." No other record supports that, which is why this one alone logs the raw pre-allowlist address (lowercased, trimmed, capped at 320).

## audit-log-auth-token-minted: `auth.token.minted`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor clicks a link and gets an expired notice: this record's `expiresAt` versus the click time decides whether the TTL or a mail delay is the cause.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 16.
- **Any-site case:** An editor clicks a link and gets an expired notice: this record's `expiresAt` versus the click time decides whether the TTL or a mail delay is the cause.

## audit-log-media-uploaded: `media.uploaded`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An operator watching R2 growth needs to know whether content-addressed dedup is working; `reused: true` says the bytes were already stored. `contentType` is the sniffed value rather than the client's claim, which additionally closes "why was my file rejected downstream".
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 17.
- **Any-site case:** An operator watching R2 growth needs to know whether content-addressed dedup is working; `reused: true` says the bytes were already stored. `contentType` is the sniffed value rather than the client's claim, which additionally closes "why was my file rejected downstream".

## audit-log-media-deleted: `media.deleted`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A broken image on a live page, traced by `hash` back to who removed the asset and when.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 18.
- **Any-site case:** A broken image on a live page, traced by `hash` back to who removed the asset and when.

## audit-log-media-replaced: `media.replaced`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor replaces a logo and reports two pages still showing the old one: `affected` versus the real reference count exposes a stale index.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 19.
- **Any-site case:** An editor replaces a logo and reports two pages still showing the old one: `affected` versus the real reference count exposes a stale index.

## audit-log-editor-removed: `editor.removed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. "Why can't this person sign in any more?" — the record names the acting owner and the time. The owner/target field pair is the right generic shape, carrying no site-specific naming.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 20.
- **Any-site case:** "Why can't this person sign in any more?" — the record names the acting owner and the time. The owner/target field pair is the right generic shape, carrying no site-specific naming.

## audit-log-editor-role-changed: `editor.role_changed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor lost access after a config edit: this record carries `capability` (the capability resolved against the committed vocabulary at the time of the change), which cannot be recomputed from the log alone, so comparing it against today's resolution names a vocabulary change as the cause.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 21.
- **Any-site case:** An editor lost access after a config edit: this record carries `capability` (the capability resolved against the committed vocabulary at the time of the change), which cannot be recomputed from the log alone, so comparing it against today's resolution names a vocabulary change as the cause.

## audit-log-editor-added: `editor.added`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Same as editor.role_changed for an addition: the resolved `capability` at insert time is the field a later access dispute turns on.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 22.
- **Any-site case:** Same as editor.role_changed for an addition: the resolved `capability` at insert time is the field a later access dispute turns on.

## audit-log-entry-discarded: `entry.discarded`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor reports lost work. This record is the difference between "a discard ran" and "a save never landed" (commit.failed), and the two have completely different remedies: the branch is gone versus the commit failed.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 23.
- **Any-site case:** An editor reports lost work. This record is the difference between "a discard ran" and "a save never landed" (commit.failed), and the two have completely different remedies: the branch is gone versus the commit failed.

## audit-log-media-orphans-reconciled: `media.orphans_reconciled`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An operator suspects R2 and the manifest have drifted: a non-zero `missing` means public pages will 404 on images, which is a live site defect rather than a housekeeping number.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 24.
- **Any-site case:** An operator suspects R2 and the manifest have drifted: a non-zero `missing` means public pages will 404 on images, which is a live site defect rather than a housekeeping number.

## audit-log-dictionary-add-conflict: `dictionary.add_conflict`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An author reports the same word flagging repeatedly: a recurring record here says the dictionary commit is losing a race (doc: "the client keeps the words pending and re-attempts on the next save"), not that the spellchecker is broken. Its `words` payload inherits the same content-exposure finding charged to dictionary.added.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 25.
- **Any-site case:** An author reports the same word flagging repeatedly: a recurring record here says the dictionary commit is losing a race (doc: "the client keeps the words pending and re-attempts on the next save"), not that the spellchecker is broken. Its `words` payload inherits the same content-exposure finding charged to dictionary.added.

## audit-log-media-replace-blocked: `media.replace_blocked`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. "Replace does nothing for me" answered without a repro: the record says the typed-slug confirm gate fired, not that references are the problem.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 26.
- **Any-site case:** "Replace does nothing for me" answered without a repro: the record says the typed-slug confirm gate fired, not that references are the problem.

## audit-log-media-delete-blocked: `media.delete_blocked`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The most common media support question a content site fields. `foundIn` (the count of referencing entries) is the actionable field: the editor must clear that many references first.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 27.
- **Any-site case:** The most common media support question a content site fields. `foundIn` (the count of referencing entries) is the actionable field: the editor must clear that many references first.

## audit-log-commit-succeeded: `commit.succeeded`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. "Did that save actually reach GitHub?" — the highest-value success record in the vocabulary, and `branch` distinguishes a pending-branch save from a default-branch commit.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 11, in the same change as `commit.failed` (audit-log-commit-failed). Seam fit: `scope` is a superset of `config.invalid`'s existing three values, so a site's log filter reads one field across both vocabularies, and `commit-log.ts` types the two shapes as a union so a site name can never reach `scope`.
- **Shape:** `concept` stays only on entry-scoped commits. The four non-entry surfaces move to `scope: 'nav' | 'settings' | 'vocabulary' | 'media'`, the axis `config.invalid` already reports on, so a pseudo-concept can no longer collide with a name a site may legally declare.
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 28.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-entry-published: `entry.published`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. F5 is preference, not divergence: events.ts:5-7 ratifies name form and snake_case reasons, nothing about pairs sharing an area. entry.* names entry outcomes (published/discarded); publish.* names publish-machinery faults (failed, address_collision). The rename breaks a public contract and orphans entry.discarded for a one-name-shorter query.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 29.
- **Any-site case:** "Which entries went live in the 09:14 publish-all, and which didn't?" — `batch` plus the doc's operator rule ("a failed publish-all logs one publish.failed per entry, so the log names everything that didn't go live").
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md) (verdict overturned there).

## audit-log-taxonomy-unmarked-field: `taxonomy.field_unmarked`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. "My tag pages are blank and nothing is failing" — a concept declares a multiselect named tags/freetags/categories but marks no `taxonomy: true` field, so the tag index reads empty with no error anywhere. Fires once per index build (content-index.ts:101).
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 11. Both renames landed together, as the verify record requires; `docs/extend/debug-your-site.md` and the reference table follow. Seam fit: an event name is public-observable contract, so both renames ride the one unpublished breaking window with a `Consumers must:` line naming them.
- **Shape:** Rename to the grammar `events.ts` ratifies in its own header: `taxonomy.unmarked_field` becomes `taxonomy.field_unmarked`, a state adjective naming a detected condition. The verify record found a second bare noun phrase, `publish.address_collision`, which becomes `publish.address_collided`; any rename lands both.
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 30.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-media-orphans-purged: `media.orphans_purged`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An image 404s a week after a purge: this is the only record that a purge ran, who ran it, and how many byte objects went. The action is irreversible, which is what makes the record load-bearing rather than housekeeping.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 31.
- **Any-site case:** An image 404s a week after a purge: this is the only record that a purge ran, who ran it, and how many byte objects went. The action is irreversible, which is what makes the record load-bearing rather than housekeeping.

## audit-log-auth-session-destroy-failed: `auth.session.destroy_failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Premise fails twice: logout is a public admin path (guard.ts:19-20, 149) so no cairnEditor, and the throw comes from the DELETE itself (auth-routes.ts:230), so RETURNING yields nothing. Enriching it means an extra SELECT on every logout. An editor-scoped D1 delete fault is not a real mode; error is the diagnostic.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 32.
- **Any-site case:** Repeated failures for one editor point at a row-level D1 problem rather than a transient fault; today the records cannot be grouped by anything.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md) (verdict overturned there).

## audit-log-tidy-refused: `tidy.refused`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An author reports tidy "not working" on one document but not others: a refusal record means the model declined that content (fail 422, text untouched), which is a completely different remedy from a 502. Carries no content and no key.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 33.
- **Any-site case:** An author reports tidy "not working" on one document but not others: a refusal record means the model declined that content (fail 422, text untouched), which is a completely different remedy from a 502. Carries no content and no key.

## audit-log-tidy-empty: `tidy.empty`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The 502 twin of tidy.refused for an empty completion; the separate name earns its slot because the remedy differs (retry versus reword).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 34.
- **Any-site case:** The 502 twin of tidy.refused for an empty completion; the separate name earns its slot because the remedy differs (retry versus reword).

## audit-log-content-field-behavior-failed: `content.field_behavior_failed`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. "One of my field validators is being silently swallowed and I don't know which" — the engine deliberately keeps the save working (fieldset.ts comment: "A developer's cross-field validate() is a bug, not an author fault; log and treat the field as valid rather than breaking the save"), so the log is the entire signal.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 11. Seam fit: the argument is optional, so `Fieldset.validate` stays call-compatible for any site that builds a fieldset itself; a concept binds its own id when `normalizeConcepts` builds the descriptor, so no engine call site has to remember to pass one.
- **Shape:** Carry an owner label beside `field`, threaded as an optional third argument through `Fieldset.validate`: the concept id on the content path, and the component's own directive name on the component-attribute path, which has no concept at all. A fieldset is a standalone object a site may share across concepts, so it cannot supply the label itself. The label is a schema identifier, never a value.
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 35.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-include-missing: `include.missing`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. "A visitor reported a grey 'this include doesn't name a fragment' box somewhere on the site" — the directive renders a calm notice instead of failing, so the log is the only trace.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 11. Seam fit: `entry` rides the resolver the VFile already carries, the same mechanism `previewTitle` uses, because a site's own `render` forwards the resolver it receives by reference while it would never forward a render option it has not heard of.
- **Shape:** Separate the two authoring faults with `reason: 'empty_fragment' | 'not_found'`, snake_case per the grammar line in `events.ts`, and name the containing entry as `<concept>/<id>`. `fragment` is author-typed document content and unbounded, so it is capped at its first 160 characters rather than dropped.
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 36.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-editor-bootstrapped: `editor.bootstrapped`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A brand-new deploy where nobody can sign in: the presence or absence of this once-in-a-site's-life record separates "the bootstrapOwner address didn't match" from "the mail never sent". A first-hour question for every anonymous consumer.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 37.
- **Any-site case:** A brand-new deploy where nobody can sign in: the presence or absence of this once-in-a-site's-life record separates "the bootstrapOwner address didn't match" from "the mail never sent". A first-hour question for every anonymous consumer.

## audit-log-auth-channel-locked: `auth.channel.locked`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A member reports "it says my code is wrong but I copied it": a locked record says the per-code attempt cap fired and the code was never compared, which is a wait rather than a re-send. The wire answer is deliberately indistinguishable, so the log is the only place this survives.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 38.
- **Any-site case:** A member reports "it says my code is wrong but I copied it": a locked record says the per-code attempt cap fired and the code was never compared, which is a wait rather than a re-send. The wire answer is deliberately indistinguishable, so the log is the only place this survives.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-channel-escalated: `auth.channel.escalated`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Members reporting challenge-required loops: this record says the site's own `challenge` callback is failing or throwing, which is the site's bug and visible nowhere else. The spec makes it load-bearing: "the factory cannot tell a Turnstile siteverify call from async () => true", and "the entire economic bound on guessing is that function's consequence".
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 39.
- **Any-site case:** Members reporting challenge-required loops: this record says the site's own `challenge` callback is failing or throwing, which is the site's bug and visible nowhere else. The spec makes it load-bearing: "the factory cannot tell a Turnstile siteverify call from async () => true", and "the entire economic bound on guessing is that function's consequence".
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-channel-rate-limited: `auth.channel.rate_limited`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. "Members say login is randomly refusing them" — `action` plus `correlationId` names the limiter rather than the roster.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 40.
- **Any-site case:** "Members say login is randomly refusing them" — `action` plus `correlationId` names the limiter rather than the roster.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-admin-action-rate-limited: `admin.action.rate_limited`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor reports a custom section action failing under load: the 429 is visible in the UI, but only this record names which limit, which path, and which editor.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 41.
- **Any-site case:** An editor reports a custom section action failing under load: the 429 is visible in the UI, but only this record names which limit, which path, and which editor.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-media-resolver-absent: `media.resolver_absent`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A developer's first deploy renders literal `media:abc123` strings in the page source, because media is configured on with no resolveMedia wired. Fires once at construction, which is the right cadence.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 11. Seam fit: the diagnostic is unchanged, since the event fires only in the misconfigured case and its own existence already carries what the field said.
- **Shape:** Drop the `enabled` field. `public-routes.ts` emitted `{enabled: true}` and the reference row documented it as "(always `true`)"; a field that can hold one value is dead payload in a contract.
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 42.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-include-read-failed: `include.read_failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The doc states a real diagnostic protocol an anonymous consumer can follow: "Distinguishes a transport failure from a fragment that is genuinely absent: pair it with an include.missing naming the same id." It carries `error`, which include.missing correctly does not.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 43.
- **Any-site case:** The doc states a real diagnostic protocol an anonymous consumer can follow: "Distinguishes a transport failure from a fragment that is genuinely absent: pair it with an include.missing naming the same id." It carries `error`, which include.missing correctly does not.

## audit-log-preview-cleanup-failed: `preview.cleanup_failed`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Preview links still resolving for entries an editor deleted, traced to accumulating stale rows. The degradation policy is right (doc: "The primary action already succeeded; a stale row is a lesser evil than failing it") and it correctly stays silent on the two expected conditions, a missing binding and an un-migrated table.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 11. Seam fit: the leak-safety reasoning in the `clearPreviewTokens` header (the delete is keyed by concept and id, so no token is in scope) carries to the new field name rather than being dropped.
- **Shape:** Move the stringified throw from `reason`, which the events header reserves for snake_case enum values, to `error`, the field its five sibling failure records already use. The reference row follows.
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 44.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-admin-action-session-absent: `admin.action.session_absent`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A developer's custom admin action redirects to login mid-work with nothing else in the log explaining it. The doc states the uniqueness: "this is the only trace an adminAction-mounted route leaves for a session that lapsed between the guard's resolve and this action running."
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 45.
- **Any-site case:** A developer's custom admin action redirects to login mid-work with nothing else in the log explaining it. The doc states the uniqueness: "this is the only trace an adminAction-mounted route leaves for a session that lapsed between the guard's resolve and this action running."
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-admin-action-csrf-rejected: `admin.action.csrf_rejected`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An anonymous developer mounts a custom admin route outside the guard's coverage. The doc is honest that it is "expected to be rare on a route the guard actually covers" and names what earns it: "it's the only gate a custom admin route reaches if it's ever mounted outside the guard's coverage."
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 46.
- **Any-site case:** An anonymous developer mounts a custom admin route outside the guard's coverage. The doc is honest that it is "expected to be rare on a route the guard actually covers" and names what earns it: "it's the only gate a custom admin route reaches if it's ever mounted outside the guard's coverage."
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-media-resolve-missing: `media.resolve_missing`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Not diagnostically incomplete: hash is the asset's stable identity and a site's content is in its own git repo, so a search for the hash names every referencing page (the engine computes the same scan for foundIn). resolve-media.ts:100 is a closure over the manifest with no entry in scope, so the field costs a render-seam change for an answer already available.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 47.
- **Any-site case:** "One image is broken somewhere on the site and I can't find which page": media on, hash has no manifest row, which is the broken-reference case a site's visitors actually see. The emit is correctly gated — media-off stays silent (resolve-media.ts:98: "the media-off path above stays silent, since an unresolved token there is expected, not a fault").
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md) (verdict overturned there).

## audit-log-auth-channel-rate-limit-absent: `auth.channel.rate_limit_absent`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A developer configures a rate limiter, ships, and believes they are protected. The check degrades open and is silent by design, so this record is the only evidence a security control is not running — nothing else would ever tell them.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 48.
- **Any-site case:** A developer configures a rate limiter, ships, and believes they are protected. The check degrades open and is silent by design, so this record is the only evidence a security control is not running — nothing else would ever tell them.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-channel-rate-limit-failed: `auth.channel.rate_limit_failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A configured limiter whose binding is present but whose key()/limit() throws: two names, two remedies. The doc states the split reasoning in the admin mirror — "the binding itself was present and reachable, so the two events triage differently."
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 49.
- **Any-site case:** A configured limiter whose binding is present but whose key()/limit() throws: two names, two remedies. The doc states the split reasoning in the admin mirror — "the binding itself was present and reachable, so the two events triage differently."
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-admin-action-rate-limit-absent: `admin.action.rate_limit_absent`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A developer's admin section is unthrottled and nothing in the UI says so; the doc states the degrade ("the check degrades to open (never blocks) rather than 500ing"), which is exactly why the record is the only witness.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 50.
- **Any-site case:** A developer's admin section is unthrottled and nothing in the UI says so; the doc states the degrade ("the check degrades to open (never blocks) rather than 500ing"), which is exactly why the record is the only witness.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-admin-action-rate-limit-failed: `admin.action.rate_limit_failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The binding-present-but-throwing twin, carrying `error`. It was added by review rather than assumed, which is evidence the split was found necessary in practice.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 51.
- **Any-site case:** The binding-present-but-throwing twin, carrying `error`. It was added by review rather than assumed, which is evidence the split was found necessary in practice.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-channel-confirmed: `auth.channel.confirmed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A roster data fault would otherwise show as members reporting wrong-code errors for codes that were correct. The doc names why the log is the only witness: on `outcome: 'empty_subject_fault'` "the wire answer is bad-code either way, identical to a wrong guess."
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 52.
- **Any-site case:** A roster data fault would otherwise show as members reporting wrong-code errors for codes that were correct. The doc names why the log is the only witness: on `outcome: 'empty_subject_fault'` "the wire answer is bad-code either way, identical to a wrong guess."
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-channel-requested: `auth.channel.requested`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. "Members say codes aren't arriving": the `outcome` distribution answers it in one query, and `lookup_failed` separates a roster outage from ordinary probing. The best-shaped record in the vocabulary — the design spec states the reasoning verbatim: emitted for every outcome with the outcome in a field, "so the record's existence carries no roster signal and an operator can still alert on ceiling_exceeded and lookup_failed." One event, six outcomes, a privacy property falling out of the shape rather than bolted on.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 53.
- **Any-site case:** "Members say codes aren't arriving": the `outcome` distribution answers it in one query, and `lookup_failed` separates a roster outage from ordinary probing. The best-shaped record in the vocabulary — the design spec states the reasoning verbatim: emitted for every outcome with the outcome in a field, "so the record's existence carries no roster signal and an operator can still alert on ceiling_exceeded and lookup_failed." One event, six outcomes, a privacy property falling out of the shape rather than bolted on.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-tidy-failed: `tidy.failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. "Tidy stopped working for everyone this morning" resolves to a rotated key in one query. Six reasons across two HTTP outcomes, each with a distinct remedy: auth (rotate the key; also marks it unhealthy in the shared cache), sdk_missing (install the optional peer), invalid_request (an unsupported tidy.model setting), against the retryable timeout/abort/model. Carries no content and no key.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 54.
- **Any-site case:** "Tidy stopped working for everyone this morning" resolves to a rotated key in one query. Six reasons across two HTTP outcomes, each with a distinct remedy: auth (rotate the key; also marks it unhealthy in the shared cache), sdk_missing (install the optional peer), invalid_request (an unsupported tidy.model setting), against the retryable timeout/abort/model. Carries no content and no key.

## audit-log-admin-action-sink-threw: `admin.action.sink_threw`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A developer's own audit sink silently loses records while every action still succeeds (the wrapper is fail-open). Its redaction reasoning is the vocabulary's best precedent: it omits record.detail "not because detail is sensitive but to avoid duplication: admin.action.audited already logged the full untruncated record ... one line earlier."
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 55.
- **Any-site case:** A developer's own audit sink silently loses records while every action still succeeds (the wrapper is fail-open). Its redaction reasoning is the vocabulary's best precedent: it omits record.detail "not because detail is sensitive but to avoid duplication: admin.action.audited already logged the full untruncated record ... one line earlier."
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-admin-action-unaudited: `admin.action.unaudited`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A compliance gap invisible by construction: a custom action mutated state, called ctx.audit zero times, nothing failed and nothing 500'd, and the trail simply has a hole. No site could detect this for itself, since the detection lives inside the wrapper. Logs at error, production only (dev throws).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 56.
- **Any-site case:** A compliance gap invisible by construction: a custom action mutated state, called ctx.audit zero times, nothing failed and nothing 500'd, and the trail simply has a hole. No site could detect this for itself, since the detection lives inside the wrapper. Logs at error, production only (dev throws).
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-channel-ceiling-exceeded: `auth.channel.ceiling_exceeded`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An unexplained SMS bill. The spec explains why the engine logs rather than denies: "An attacker can spend a site's SMS budget by pumping requests at one number. Nothing denies this, deliberately, because denying it means denying the member ... The engine logs ceiling_exceeded at error; the response is an operator one, at the edge or with the provider." An engine that deliberately will not act owes a loud record, and this is it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 57.
- **Any-site case:** An unexplained SMS bill. The spec explains why the engine logs rather than denies: "An attacker can spend a site's SMS budget by pumping requests at one number. Nothing denies this, deliberately, because denying it means denying the member ... The engine logs ceiling_exceeded at error; the response is an operator one, at the edge or with the provider." An engine that deliberately will not act owes a loud record, and this is it.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-channel-send-failed: `auth.channel.send_failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A member never receives a code and the site's provider credentials are the cause. The `error` field is scrubbed and length-capped for a measured reason the spec states: "Twilio and Resend both embed the recipient in their error strings" — the correct generic shape, since the engine cannot know what a site's provider puts in an error and so assumes the worst.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 58.
- **Any-site case:** A member never receives a code and the site's provider credentials are the cause. The `error` field is scrubbed and length-capped for a measured reason the spec states: "Twilio and Resend both embed the recipient in their error strings" — the correct generic shape, since the engine cannot know what a site's provider puts in an error and so assumes the worst.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-auth-role-unknown: `auth.role.unknown`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A developer prunes a role from the committed config and an editor silently loses every permission with no error anywhere in the UI. The design is stated at guard.ts:154-157: the session still authenticates at `none` capability, and "only the log names it, so a stale config never locks the person out of sign-in." Listed in docs/admin/troubleshooting.md.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 59.
- **Any-site case:** A developer prunes a role from the committed config and an editor silently loses every permission with no error anywhere in the UI. The design is stated at guard.ts:154-157: the session still authenticates at `none` capability, and "only the log names it, so a stale config never locks the person out of sign-in." Listed in docs/admin/troubleshooting.md.

## audit-log-github-unreachable: `github.unreachable`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor reports the pending-entries count reading zero when drafts exist. Three best-effort reads degrade rather than fail (scope: shell, help, publish_advisories), so without this record the screen is simply, quietly wrong. Listed in docs/admin/troubleshooting.md.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 60.
- **Any-site case:** An editor reports the pending-entries count reading zero when drafts exist. Three best-effort reads degrade rather than fail (scope: shell, help, publish_advisories), so without this record the screen is simply, quietly wrong. Listed in docs/admin/troubleshooting.md.

## audit-log-media-delivery-failed: `media.delivery_failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A first deploy where every image on the site 404s. One binding missing breaks all media delivery, and the route cannot say so in a response that is a 404 image; `reason: 'binding_missing'` plus `binding` names exactly what to add to wrangler.jsonc.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 61.
- **Any-site case:** A first deploy where every image on the site 404s. One binding missing breaks all media delivery, and the route cannot say so in a response that is a 404 image; `reason: 'binding_missing'` plus `binding` names exactly what to add to wrangler.jsonc.

## audit-log-auth-access-denied: `auth.access.denied`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The most common admin support question — "why can't this role reach that screen" — answered with the role and the target in one line, and distinguishable from auth.role.unknown (no rule versus no valid role). Four emit sites share one shape (email, role, target) across requireAccess, the engine's own gated screens, and createSectionAction's 403 branch; the uniform `target` is the right generic form, since a screen id, a site route target, and 'media' all read the same way to a query.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 62.
- **Any-site case:** The most common admin support question — "why can't this role reach that screen" — answered with the role and the target in one line, and distinguishable from auth.role.unknown (no rule versus no valid role). Four emit sites share one shape (email, role, target) across requireAccess, the engine's own gated screens, and createSectionAction's 403 branch; the uniform `target` is the right generic form, since a screen id, a site route target, and 'media' all read the same way to a query.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-publish-address-collision: `publish.address_collided`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A page silently stops resolving after an unrelated publish, with no error anywhere. The engine deliberately does not refuse (doc: "last-write-wins, now visible"), so the log is the entire mechanism by which the consequence is observable. displacedConcept/displacedId is the generic shape, not a URL string an anonymous site would have to parse.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 63.
- **Any-site case:** A page silently stops resolving after an unrelated publish, with no error anywhere. The engine deliberately does not refuse (doc: "last-write-wins, now visible"), so the log is the entire mechanism by which the consequence is observable. displacedConcept/displacedId is the generic shape, not a URL string an anonymous site would have to parse.

## audit-log-media-upload-failed: `media.upload_failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. "My editor can't upload images" is the highest-volume support ticket a content site fields, and this resolves it without a repro. Nine closed snake_case reasons cover the whole refusal ladder in ingestAndStore, each mapping to a distinct HTTP status and a distinct fix. One noted redundancy that is not a defect: an access-denied upload emits both auth.access.denied (content-routes-media.ts:508) and media.upload_failed reason access_denied (:475) — deliberate, one record per story, and it costs an operator nothing. Listed in docs/admin/troubleshooting.md.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 64.
- **Any-site case:** "My editor can't upload images" is the highest-volume support ticket a content site fields, and this resolves it without a repro. Nine closed snake_case reasons cover the whole refusal ladder in ingestAndStore, each mapping to a distinct HTTP status and a distinct fix. One noted redundancy that is not a defect: an access-denied upload emits both auth.access.denied (content-routes-media.ts:508) and media.upload_failed reason access_denied (:475) — deliberate, one record per story, and it costs an operator nothing. Listed in docs/admin/troubleshooting.md.

## audit-log-turnstile-verify-failed: `turnstile.verify_failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A rotated or mis-pasted secret silently rejecting every form submission site-wide. The best-shaped failure record in the vocabulary: seven reasons each with their own conditional field, plus an explicit rule for what it does NOT log — "An ordinary success: false with only invalid-input-response or timeout-or-duplicate logs nothing, since that is the function working" — which is what makes it alertable. The comment at turnstile.ts:90-95 names the anonymous scenario: if Cloudflare ever lengthens the response token past MAX_TOKEN_LENGTH, "every submission would otherwise fail for every visitor with a completely silent lockout. Carries the token's length, never the token itself."
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 65.
- **Any-site case:** A rotated or mis-pasted secret silently rejecting every form submission site-wide. The best-shaped failure record in the vocabulary: seven reasons each with their own conditional field, plus an explicit rule for what it does NOT log — "An ordinary success: false with only invalid-input-response or timeout-or-duplicate logs nothing, since that is the function working" — which is what makes it alertable. The comment at turnstile.ts:90-95 names the anonymous scenario: if Cloudflare ever lengthens the response token past MAX_TOKEN_LENGTH, "every submission would otherwise fail for every visitor with a completely silent lockout. Carries the token's length, never the token itself."
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-audit-sink-write-failed: `audit.sink.write_failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site's audit table quietly missing rows while every action succeeds. The doc states the keep burden itself: "The audited action already completed (the sink is fail-open), so this is the only surviving record of the persisted row." Four reasons separate a data problem from a binding problem, it persists the whole truncated record with a placeholder for whichever field's coercion failed, and it guarantees at most one record. It is also the one event whose `actor` is documented as not necessarily an editor, a correct generic accommodation for site code calling createD1AuditSink with its own domain events.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 66.
- **Any-site case:** A site's audit table quietly missing rows while every action succeeds. The doc states the keep burden itself: "The audited action already completed (the sink is fail-open), so this is the only surviving record of the persisted row." Four reasons separate a data problem from a binding problem, it persists the whole truncated record with a placeholder for whichever field's coercion failed, and it guarantees at most one record. It is also the one event whose `actor` is documented as not necessarily an editor, a correct generic accommodation for site code calling createD1AuditSink with its own domain events.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-admin-action-misconfigured: `admin.action.misconfigured`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A developer mounts a custom admin section outside the guard and gets a 500 with no explanation — the anonymous-consumer scenario in its purest form. Two reasons, both pure developer faults with pure developer fixes. access_map_not_attached is only detectable because of a deliberate engine choice recorded at guard.ts:163-166: "access ?? {}, not access ... It buys section-action.ts a real signal: an absent locals.cairnAccess then only ever means the guard never ran on this route."
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 67.
- **Any-site case:** A developer mounts a custom admin section outside the guard and gets a 500 with no explanation — the anonymous-consumer scenario in its purest form. Two reasons, both pure developer faults with pure developer fixes. access_map_not_attached is only detectable because of a deliberate engine choice recorded at guard.ts:163-166: "access ?? {}, not access ... It buys section-action.ts a real signal: an absent locals.cairnAccess then only ever means the guard never ran on this route."
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-config-invalid: `config.invalid`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor's nav screen renders empty after a hand-edited config, with nothing in the UI naming the parse error. The doc states the property that earns the top tier: two loads degrade silently (nav to an empty tree, vocabulary to an empty list) and two saves answer with generic copy, while "the parser's own message stays in this log record, not the response." `scope` is a closed snake_case enum and conditionId ('config.site-config-invalid') ties the record to the diagnostics registry the doctor reads.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 68.
- **Any-site case:** An editor's nav screen renders empty after a hand-edited config, with nothing in the UI naming the parse error. The doc states the property that earns the top tier: two loads degrade silently (nav to an empty tree, vocabulary to an empty list) and two saves answer with generic copy, while "the parser's own message stays in this log record, not the response." `scope` is a closed snake_case enum and conditionId ('config.site-config-invalid') ties the record to the diagnostics registry the doctor reads.

## audit-log-commit-failed: `commit.failed`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. "My editor pressed save and nothing happened", the most common failure a content site has. CLAUDE.md routes here first: "A save that does nothing points at a commit failure: a conflict reason is a stale-edit collision, and an error field is the GitHub failure to act on." The warn/error split is principled and centralized in commit-log.ts. Listed in docs/admin/troubleshooting.md.
- **Reopens on:** closed. Executed by the 4b conformance pass, Task 11, in the same change as `commit.succeeded` (audit-log-commit-succeeded), as the verify record charged. Seam fit: both events read the one `CommitLogFields` union in `commit-log.ts`, so the two can never drift apart again.
- **Shape:** Inherits the pseudo-concept fix charged to `commit.succeeded` verbatim: the same `commitFields` objects flow through the shared `logCommitFailed` helper, so the entry-scoped `concept` and the non-entry `scope` split lands on both events at once.
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 69.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-admin-action-failed: `admin.action.failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor reports "it just says something went wrong." The engine deliberately hides the error from the UI (doc: "the editor sees the calm failure strip instead of the platform's raw 500"), so this record is the entire diagnostic. The fields are exactly right: `error` is "the thrown error's message, never a stack", and concept/id/editor are conditional on being in scope rather than faked. Listed in docs/admin/troubleshooting.md.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 70.
- **Any-site case:** An editor reports "it just says something went wrong." The engine deliberately hides the error from the UI (doc: "the editor sees the calm failure strip instead of the platform's raw 500"), so this record is the entire diagnostic. The fields are exactly right: `error` is "the thrown error's message, never a stack", and concept/id/editor are conditional on being in scope rather than faked. Listed in docs/admin/troubleshooting.md.

## audit-log-publish-failed: `publish.failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor publishes twelve drafts, nine appear, and nobody can say which three failed or why. The doc's publish-all rule is what makes it uniquely load-bearing: "a failed publish-all logs one publish.failed per entry, so the log names everything that didn't go live." No screen carries that list — the redirect collapses to a single bounded publish_failed code (refusal-codes.ts:17). Listed in docs/admin/troubleshooting.md.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 71.
- **Any-site case:** An editor publishes twelve drafts, nine appear, and nobody can say which three failed or why. The doc's publish-all rule is what makes it uniquely load-bearing: "a failed publish-all logs one publish.failed per entry, so the log names everything that didn't go live." No screen carries that list — the redirect collapses to a single bounded publish_failed code (refusal-codes.ts:17). Listed in docs/admin/troubleshooting.md.

## audit-log-auth-link-send-failed: `auth.link.send_failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Nobody can log in to a freshly deployed site because the sender domain is unverified, and the deploy never surfaced it. The richest failure envelope in the vocabulary (email, scrubbed error, code, conditionId) against the failure mode CLAUDE.md names first. The `code` field exists because of a measured platform trap no anonymous consumer could reason out unaided: the binding throws E_SENDER_NOT_VERIFIED for two entirely different conditions, "the same string Routing uses for an unverified destination, which is how the ecxc outage hid." conditionId ties the record to the doctor's registry so the operator gets a remedy, not just a string. Listed in docs/admin/troubleshooting.md.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 72.
- **Any-site case:** Nobody can log in to a freshly deployed site because the sender domain is unverified, and the deploy never surfaced it. The richest failure envelope in the vocabulary (email, scrubbed error, code, conditionId) against the failure mode CLAUDE.md names first. The `code` field exists because of a measured platform trap no anonymous consumer could reason out unaided: the binding throws E_SENDER_NOT_VERIFIED for two entirely different conditions, "the same string Routing uses for an unverified destination, which is how the ecxc outage hid." conditionId ties the record to the doctor's registry so the operator gets a remedy, not just a string. Listed in docs/admin/troubleshooting.md.

## audit-log-guard-rejected: `guard.rejected`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The entire admin is unreachable on a new deploy, and the reason — a missing AUTH_DB binding versus an origin mismatch behind a proxy versus plain HTTP versus CAIRN_DEV_BACKEND left set in production — lives only here. Eight emit sites, five reasons, and a level split that is itself the triage (error for the two operator faults, warn for the three request refusals). The reasoning is stated at guard.ts:118-121: "That is an operator fault, not a sign-in problem, so name the condition on every admin path, the public ones included, instead of rendering a login form that can never succeed." Carries conditionId on bindings. Listed in docs/admin/troubleshooting.md.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 73.
- **Any-site case:** The entire admin is unreachable on a new deploy, and the reason — a missing AUTH_DB binding versus an origin mismatch behind a proxy versus plain HTTP versus CAIRN_DEV_BACKEND left set in production — lives only here. Eight emit sites, five reasons, and a level split that is itself the triage (error for the two operator faults, warn for the three request refusals). The reasoning is stated at guard.ts:118-121: "That is an operator fault, not a sign-in problem, so name the condition on every admin path, the public ones included, instead of rendering a login form that can never succeed." Carries conditionId on bindings. Listed in docs/admin/troubleshooting.md.

## audit-log-preview-rejected: `preview.rejected`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. An editor shares a preview link with a client, the client sees a 404, and the site owner must choose between "apply migration 0003", "bind AUTH_DB", "the link expired", and "the draft was reverted into an invalid state" — four different days of work, selected by one `reason` field. The doc makes the argument in one sentence: "Every outward response is an identical 404, except bindings_missing, which answers 503; this log is the only place the distinction survives." Seven reasons in a documented check order span an unbound binding, an un-migrated table, an unknown hash, an expiry, a stale row, a draft that no longer validates, and a vanished branch — seven different operator actions behind one deliberately indistinguishable response, since distinguishing them on the wire would leak preview-token validity to a prober. The conditional field policy is equally disciplined: concept/id only on the three reasons where an entry is identified, `binding` only on bindings_missing, and never the token.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 74.
- **Any-site case:** An editor shares a preview link with a client, the client sees a 404, and the site owner must choose between "apply migration 0003", "bind AUTH_DB", "the link expired", and "the draft was reverted into an invalid state" — four different days of work, selected by one `reason` field. The doc makes the argument in one sentence: "Every outward response is an identical 404, except bindings_missing, which answers 503; this log is the only place the distinction survives." Seven reasons in a documented check order span an unbound binding, an un-migrated table, an unknown hash, an expiry, a stale row, a draft that no longer validates, and a vanished branch — seven different operator actions behind one deliberately indistinguishable response, since distinguishing them on the wire would leak preview-token validity to a prober. The conditional field policy is equally disciplined: concept/id only on the three reasons where an entry is identified, `binding` only on bindings_missing, and never the token.

## audit-cli-check-dogfood-tripwire-proposed-into-cairn-audit-coherence-c: `check:dogfood tripwire proposed into cairn-audit (coherence C13 / R-8)`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None inside cairn-audit. cairn-audit is a design-language audit that 'ships whole, as consumer product' and whose 23 rules all audit /admin; a rule counting engine call sites can never fire in a consumer tree, and check-package-files.mjs:172-178 forces any registered rule to ship. The rule itself is right; the home is wrong.
- **Reopens on:** closed. Executed by the retires pass, batch 1b: a process/tooling proposal, not an exported symbol; closing declines the proposed home. No code shape to record. shape-needs-rederivation.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 1; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1b.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-unlistedroutes-proposed-as-a-cairn-audit-rendered-rule: `unlistedRoutes proposed as a cairn-audit rendered rule`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Fails both arms. The verify pass established the function encodes 'SvelteKit's published grammar, not cairn's (sitemap.ts:31-41 is two regexes)'; relocating two regexes does not change whose grammar they are. Subject is wrong twice: sitemap completeness is not design, and the routes are public pages outside the /admin surface every rule audits. The harness cannot do it either, since rendered rules receive a page's DOM, never the route manifest.
- **Reopens on:** closed. Executed by the retires pass, batch 1b: a process/tooling proposal, not an exported symbol; closing declines the proposed relocation. The `unlistedRoutes` export itself is a separate ledger entry (`audit-delivery-unlistedroutes`, batch 1c). No code shape to record. shape-needs-rederivation.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 2; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1b.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-skill-admin-screens-check-and-cairn-doctor-fix: `skill.admin-screens check and cairn-doctor --fix`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Weak and hazardous. The doctor 'probes the configuration a deployed cairn site depends on'; a Claude Code skill is not that, and the check 'never fails ... a development aid, not a deploy blocker'. It assumes one specific agent harness (.claude/skills/), and the docs concede the install leaks utility class names into the consumer's shipped CSS unless they add an '@source not' directive by hand.
- **Reopens on:** closed. Executed by the retires pass, batch 1b: a process/tooling proposal, not an exported symbol; closing declines the proposed doctor check. No code shape to record. shape-needs-rederivation.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 3; executed in [2026-08-30 retires-pass](../superpowers/plans/2026-08-30-retires-pass.md), Task 1 batch 1b.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-edge-https-forced-and-edge-hsts: `edge.https-forced and edge.hsts`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Split the pair. conditions.ts:35-42 gives edge.https-not-forced a cairn-owned why (JS-free sign-in form POST, CSRF guard, opaque 403 over http), severity blocker: Arm A holds, keep it gating. edge.hsts is severity 'warning' yet returns fail: retire. Also, report.ts:8-12 has no advisory tier to demote into.
- **Reopens on:** closed. Executed by the conventions pass, Task 10, on the verifier's shape (the ranking's own 'demote both to advisory' shape below is superseded, per round-2 B-1): `edgeHsts` and its entry in the default check registry (`checks-cloudflare.ts`, `assemble.ts`) are removed, and the `edge.hsts-off` condition retires from `src/lib/diagnostics/conditions.ts`. `edge.https-forced` is untouched and stays gating.
- **Shape:** Split the pair rather than demoting both, per the verification pass, which overturned the ranking's shape: keep `edge.https-forced` as a gating check (its condition is cairn-owned: the JS-free admin sign-in form POST hits an opaque 403 over http, a failure mode a generic tool cannot name), and retire `edge.hsts` outright, since its own registry entry is severity 'warning' yet the check returns a gating `fail()`, and the doctor carries no advisory tier to demote either one into.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 4.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md) (verdict overturned there).

## audit-cli-chip-ground-collision-rendered-rule: `chip-ground-collision rendered rule`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The formula is engine-owned so Arm A holds, but the docs record it 'produced 24 false errors of 40 on the first consumer admin it measured, so as coded it could not serve as a consumer gate.' A 60% false-positive rate trains a reader to stop reading the advisory section, damaging the eight advisory rules that do work.
- **Reopens on:** open; partially executed. The conformance pass, Task 12, fixed the hue half of the docket's named defect: the formula gains a chroma term (`color.ts`'s `chromaDistance`, a Cb/Cr-plane distance), so a collision now requires both a close luminance ratio and a close hue, which rescues the hue-distinct false-positive class (roughly 14 of the corpus's 24 measured false positives). The docket's own hold-out-of-the-registry shape was not taken: by the time this task ran, `rules/rendered/index.ts:8-11` already carried the rule at advisory (demoted in design infrastructure Pass 3, corpus C), so the error-tier harm the docket named was already remedied and holding the rule out of the registry entirely would have traded an advisory signal for none. The floor-recalibration half of the filed repair (ROADMAP: "a distance formula that can see hue, plus a recalibrated floor") remains open: the other named false-positive class, a near-neutral dark-theme pill reading bounded despite a low ratio (roughly the other 10 of 24), carries no hue for the chroma term to rescue and still flags (cairn's own dark-theme tokens measure chroma distance 0.89 to 2.66 at ratios 1.190 to 1.432, all under both floors). Recalibrating the luminance floor for this class cannot be honestly done inside this task: it needs measured pixel data from a real consumer admin audit run, which this repo does not carry. `chromaDistance` also models trichromat perception only, so a red/green color-vision-deficient (protanope or deuteranope) viewer can still read a collision the term calls hue-distinct, a false-negative class this repair does not address; and `CHROMA_DISTINCT_FLOOR`'s own value of 10 sits inside a band (roughly 3 to 24) no measured pair has sampled, a provisional pick inside a wide margin rather than a value pinned by evidence on both sides (both caveats now stated in the rule's own header, `chip-ground-collision.ts`). The rule stays advisory throughout; promotion to error is a separate, later act on its own re-measured evidence. The discriminator that separates this rule from the two geometry heuristics the docket left at `keep` (rank 7): this rule's formula produced a measured 60% false-positive rate (24 of 40) against a live consumer admin before repair, a defect class neither `container-inset-asymmetry` nor `field-edge-alignment` has shown on any corpus measured so far.
- **Shape:** Repair the formula in two halves, not the registration: a chroma-aware distance term (landed) and a recalibrated luminance floor for the near-neutral dark-theme class (open, pending measured consumer-corpus evidence). The docket's own hold-out-of-the-registry option was superseded before execution by the Pass 3 demotion already having remedied the error-tier harm.
- **Annotation (conventions pass, Task 11):** explicitly routed to 4b, not this pass. This is a cairn-audit REGISTRY rule reshape (a rule's own formula), not a doctor check or CLI-evenness item, so no 4a task touches it; still allowlisted on `check-rulings-format-allowlist.json` pending its own execution. [allowlist removal executed in conformance-pass Task 12]
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 5.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-form-font-parity-rendered-rule: `form-font-parity rendered rule`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Purpose is squarely Arm A ('the UA reset layer's own regression tripwire, catching a consumer whose sheet never reached the page') and only the engine ships that reset. But three named false-positive classes ship today: 'it misses variant-prefixed forms (md:font-mono, dark:font-mono), font-serif/font-sans, and Tailwind 4's font-(family-name:--x) shorthand'.
- **Reopens on:** closed. Executed by the conformance pass, Task 12: `hasExplicitFace` now strips leading variant prefixes before testing the base utility and recognizes `font-serif`, `font-sans`, and Tailwind 4's `font-(family-name:--x)` shorthand alongside the existing `font-mono`/`font-[family-name:...]` net, closing all three named classes. The rule stays advisory in this pass; the docket's own intended error-tier promotion is a separate, later act, since closing false positives is not itself the CI re-check evidence that promotion still waits on.
- **Shape:** Close the exemption net (variant prefixes, `font-serif`/`font-sans`, the Tailwind 4 shorthand) before any error-tier promotion, and keep the report's own "may be an exemption miss" guidance for a utility the net still misses.
- **Annotation (conventions pass, Task 11):** explicitly routed to 4b, not this pass. Also a cairn-audit REGISTRY rule reshape, not a doctor check or CLI-evenness item, so no 4a task touches it; still allowlisted on `check-rulings-format-allowlist.json` pending its own execution. [allowlist removal executed in conformance-pass Task 12]
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 6.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-container-inset-asymmetry-and-field-edge-alignment-rendered-: `container-inset-asymmetry and field-edge-alignment rendered rules`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Both are honest, correctly-tiered geometry heuristics, and the case container-inset-asymmetry actually caught is not family-shaped: 'a bare <ul class="list"> keeping the 40px bullet indent read as a 40px left inset against a 0px right one' is DaisyUI plus a UA default, which any consumer styling an admin list hits. Thresholds are calibrated against cairn's own admin, which only the engine ships.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 7.
- **Any-site case:** Both are honest, correctly-tiered geometry heuristics, and the case container-inset-asymmetry actually caught is not family-shaped: 'a bare <ul class="list"> keeping the 40px bullet indent read as a 40px left inset against a 0px right one' is DaisyUI plus a UA default, which any consumer styling an admin list hits. Thresholds are calibrated against cairn's own admin, which only the engine ships.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-admin-mount-shape-check: `admin.mount-shape check`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Arm A holds (the four-file /admin mount is cairn's contract and nobody else's), but the check has no failing state: 'This check never fails; it skips with guidance when it cannot see the mount.' It spends one of nineteen report lines to say 'I could not tell'.
- **Reopens on:** closed. Executed by the conventions pass, Task 10: `admin.mount-shape` returns `info(ADMIN_MOUNT_GUIDANCE)` in place of `skip(...)` on both its no-mount-found branches; it still never fails, so the never-fails design the audit praised survives unchanged.
- **Shape:** Fold the check into the doctor's third status tier: 'could not find a file to check' becomes a distinct `info` result from 'checked and passed' (the same distinction `config.csrf-disable`, rank 16, needs), rather than the `skip` the check returns today for both 'nothing wired' and 'could not tell'.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 8.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-ai-posture-effective-check: `ai.posture-effective check`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm A passes narrowly: aiPosture is a cairn adapter concept, and the gap between 'declared in the adapter' and 'served at the edge' is nameable only by the engine that knows what the declaration should have produced. The restraint is right: it 'fails on one case only', passes a site that declares none, and passes a managed Cloudflare layer 'since whether that's wanted belongs to the zone's owner'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 9.
- **Any-site case:** Arm A passes narrowly: aiPosture is a cairn adapter concept, and the gap between 'declared in the adapter' and 'served at the edge' is nameable only by the engine that knows what the declaration should have produced. The restraint is right: it 'fails on one case only', passes a site that declares none, and passes a managed Cloudflare layer 'since whether that's wanted belongs to the zone's owner'.

## audit-cli-config-tidy-key-check-and-its-active-anthropic-probe: `config.tidy-key check and its active Anthropic probe`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Tidy is cairn's feature so the tidy.enabled-to-binding relationship is Arm A, but validating an Anthropic key is Anthropic's grammar. Three outcome modes, an outbound third-party call and a fail-soft branch for an opt-in feature that is off by default; and on a real deployed site the secret is 'invisible to any CLI', so the live probe can only fire against a local .dev.vars a developer can curl by hand.
- **Reopens on:** open; partially executed. The conventions pass, Task 10 fixed the C16 two-jobs half: `config.tidy-key` now carries its own `config.tidy-key-missing` condition id in `src/lib/diagnostics/conditions.ts`, with its own docsAnchor (`is-it-working.md#configure-the-tidy-api-key`), so a failure no longer prints the wrangler-bindings remediation. The active, unconditional Anthropic probe is untouched and remains open; the remediation pass closes it.
- **Shape:** Two independent defects. (1) C16's two-jobs finding: `config.tidy-key` shares `conditionId: 'config.bindings-missing'` with the wrangler-bindings check, so a tidy-key failure prints remediation written for a missing EMAIL/AUTH_DB binding; give it its own condition id. (2) Arm A fails on the active half: validating an Anthropic key is Anthropic's grammar, not cairn's; keep the presence-and-wiring half, and either drop the live call or move it behind the same opt-in flag discipline `--send-test` and `--probe` already establish for a live third-party touch.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 10.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-no-help-on-any-of-the-five-commands: `No --help on any of the five commands`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The purest Arm A item here: a consumer cannot add --help to a bin the engine ships, and it is the most likely first keystroke of a developer who just saw cairn-doctor in an install log. Verified: grep -rn "'--help'" over src/lib and packages/create-cairn-site/src returns nothing. Three defects, not one: the flag is missing everywhere; asking exits 2, the code reserved for 'the run couldn't start'; and cairn-manifest ignores argv entirely rather than rejecting it.
- **Reopens on:** closed for the four engine bins. Executed by the conventions pass, Task 11: `--help` on `cairn-doctor`, `cairn-audit`, `cairn-media-seed`, and `cairn-manifest` prints the bin's existing `USAGE` constant at exit 0, and `cairn-manifest` gains argv parsing (`vite/assemble.ts`'s new `parseArgs`/`USAGE`, mirroring the doctor split) that accepts only `--help` and rejects everything else at exit 2, matching its three siblings.
- **Shape:** `--help` on all five, printing the existing `USAGE` constant, exit 0. `cairn-manifest` gains argv parsing that accepts `--help` and rejects everything else, matching its siblings.
- **Progress note:** the fifth command, `create-cairn-site`, is untouched: it has `--version` and no `--help` (Node's `parseArgs` with `strict: true` throws on it), and its own CLI surface is out of scope for a slice-4 engine pass. Routed to the tool's own pre-publish pass, per the "What this pass unblocks" section ("everything create-cairn-site-scoped ... --help ... the tool's pre-publish pass").
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 11.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-focus-parity-motion-band-reduced-motion-static-rules: `focus-parity, motion-band, reduced-motion static rules`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. motion-band is Arm B outright (the 150-250ms band is a ratified cairn number). focus-parity and reduced-motion are general hygiene, but their scope carve-out is engine knowledge: 'Tailwind's hover: variant classes are deliberately out of scope: their keyboard affordance is the admin's blanket focus ring' is correct only because cairn ships that ring. A consumer writing this from scratch flags every hover: class or skips the hand-authored ones.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 12.
- **Any-site case:** motion-band is Arm B outright (the 150-250ms band is a ratified cairn number). focus-parity and reduced-motion are general hygiene, but their scope carve-out is engine knowledge: 'Tailwind's hover: variant classes are deliberately out of scope: their keyboard affordance is the admin's blanket focus ring' is correct only because cairn ships that ring. A consumer writing this from scratch flags every hover: class or skips the hand-authored ones.

## audit-cli-auth-role-wiring-check: `auth.role-wiring check`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm A passes cleanly: a two-place cairn contract (defineRoles in the adapter, createAuthGuard({ roles }) in hooks.server.ts) whose failure is silent and security-relevant, the role resolving to 'none' and an editor losing access with no error anywhere. Nothing outside the engine knows the two places must agree.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 13.
- **Any-site case:** Arm A passes cleanly: a two-place cairn contract (defineRoles in the adapter, createAuthGuard({ roles }) in hooks.server.ts) whose failure is silent and security-relevant, the role resolving to 'none' and an editor losing access with no error anywhere. Nothing outside the engine knows the two places must agree.
- **Annotation (conventions pass, Task 10):** the keep stands. `auth.role-wiring`'s could-not-see
  branches (`src/hooks.server.ts` absent, no `createAuthGuard` call found, or its argument an
  unreadable bare identifier) convert from `skip` to `info`, matching the doctor's new status
  vocabulary; its no-custom-roles branch (the guard fallback already matches the declared
  vocabulary) stays `skip`, since that branch really is not applicable, not merely unseen.

## audit-cli-cairn-media-seed-header-repeatable: `cairn-media-seed --header (repeatable)`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Family-originated (the one adopter is aksailingclub-org's Cloudflare Access script) but the shape already satisfies charter constraint 3: the engine did not add --cf-access-id/--cf-access-secret, it re-derived a generic repeatable header. Basic auth, a staging bearer token, a VPN gateway header and a User-Agent allowlist are all the same flag. Best model of 're-derive, never transplant' on the whole surface.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 14.
- **Any-site case:** Family-originated (the one adopter is aksailingclub-org's Cloudflare Access script) but the shape already satisfies charter constraint 3: the engine did not add --cf-access-id/--cf-access-secret, it re-derived a generic repeatable header. Basic auth, a staging bearer token, a VPN gateway header and a User-Agent allowlist are all the same flag. Best model of 're-derive, never transplant' on the whole surface.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-cairn-audit-cookies-environment-seam: `CAIRN_AUDIT_COOKIES environment seam`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Without it rendered mode is near-useless on any real site: cairn-pub's own config $comment warns 'Without the cookie every page redirects to the sign-in card and the run measures that card once per entry while reporting zero errors.' Arm A passes on both throw conditions: the engine owns the session cookie name and owns cairn-admin-theme, which a caller override would invalidate.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 15.
- **Any-site case:** Without it rendered mode is near-useless on any real site: cairn-pub's own config $comment warns 'Without the cookie every page redirects to the sign-in card and the run measures that card once per entry while reporting zero errors.' Arm A passes on both throw conditions: the engine owns the session cookie name and owns cairn-admin-theme, which a caller override would invalidate.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-config-csrf-disable-check: `config.csrf-disable check`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Arm A passes emphatically: the CSRF handoff (cairn disabling SvelteKit's checkOrigin and taking ownership in its own guard) is the most security-load-bearing configuration contract the engine has and is invisible to every generic tool. But a bare sv create scaffold 'writes no svelte.config.js at all', so the check skips on every such site and 'the run looks clean while the CSRF-handoff check never executed: a silent green'.
- **Reopens on:** closed. Executed by the conventions pass, Task 10: `config.csrf-disable` reads both `svelte.config.js` and `vite.config.ts`, returns `unchecked` only when neither file exists, and fails, never passes or skips, when at least one file is readable but neither carries an uncommented `checkOrigin: false` (security round N9's found-in-neither clause).
- **Shape:** Read `vite.config.ts` as well as `svelte.config.js` (a bare `sv create` scaffold wires the adapter, and any CSRF disable, inside `vite.config.ts`'s plugin call instead), and make 'could not find a file to check' (neither file exists) a result distinct from 'checked and found nothing', which must still read as a real fail, never a false pass or skip.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 16.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-cairn-doctor-send-test-opt-in-live-email-send: `cairn-doctor --send-test (opt-in live email send)`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm A passes on knowledge the engine paid for in a production outage: env.EMAIL.send throws E_SENDER_NOT_VERIFIED, the same string Email Routing uses for an unverified destination, 'which is how the ecxc outage hid', and the REST send's 10203/10204 cannot distinguish 'never onboarded' from 'still propagating' since 'elapsed time since onboarding is the only discriminator'. A configuration check cannot tell those apart; only a real send can. Any consumer of Cloudflare Email Sending inherits that ambiguity.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 17.
- **Any-site case:** Arm A passes on knowledge the engine paid for in a production outage: env.EMAIL.send throws E_SENDER_NOT_VERIFIED, the same string Email Routing uses for an unverified destination, 'which is how the ecxc outage hid', and the REST send's 10203/10204 cannot distinguish 'never onboarded' from 'still propagating' since 'elapsed time since onboarding is the only discriminator'. A configuration check cannot tell those apart; only a real send can. Any consumer of Cloudflare Email Sending inherits that ambiguity.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-cairn-media-seed-bucket-and-the-wrangler-r2-buckets-resoluti: `cairn-media-seed --bucket and the wrangler r2_buckets resolution`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The binding-vs-real-name distinction is a real Cloudflare trap ('wrangler r2 object put addresses a bucket by name'), and resolveBucket refuses to guess on zero, several, or a nameless entry rather than writing real objects into the wrong bucket. Arm A is thin (reading r2_buckets is Cloudflare's grammar) but the reuse is exemplary: bin.ts:12 imports readR2Buckets from ../doctor/wrangler-config.js, so both commands share one parser.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 18.
- **Any-site case:** The binding-vs-real-name distinction is a real Cloudflare trap ('wrangler r2 object put addresses a bucket by name'), and resolveBucket refuses to guess on zero, several, or a nameless entry rather than writing real objects into the wrong bucket. Arm A is thin (reading r2_buckets is Cloudflare's grammar) but the reuse is exemplary: bin.ts:12 imports readR2Buckets from ../doctor/wrangler-config.js, so both commands share one parser.

## audit-cli-cairn-doctor-probe-opt-in-live-admin-sign-in-probe: `cairn-doctor --probe (opt-in live admin sign-in probe)`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm A at its strongest: the probe is safe only because of a specific cairn design decision. 'It submits a random non-editor address at the reserved example.invalid domain, and the engine's non-leak design answers a non-editor exactly like a successful send while sending no email and minting no token.' A consumer writing their own sign-in probe would mint a real token against a real editor row, or would not know example.invalid is safe. The knowledge that makes it harmless is engine-internal.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 19.
- **Any-site case:** Arm A at its strongest: the probe is safe only because of a specific cairn design decision. 'It submits a random non-editor address at the reserved example.invalid domain, and the engine's non-leak design answers a non-editor exactly like a successful send while sending no email and minting no token.' A consumer writing their own sign-in probe would mint a real token against a real editor row, or would not know example.invalid is safe. The knowledge that makes it harmless is engine-internal.

## audit-cli-the-post-hydration-page-identity-guard: `The post-hydration page-identity guard`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Anti-silent-green discipline applied to the harness itself, gating at error tier, and shaped for any site by construction: 'The mechanism reads only <title>, <main>, and [role="main"], none of them cairn-only markup, so a consumer's own custom route and cairn's shell-less login page (which renders no <main> at all) both stay auditable.' The engine could have keyed it on .card-shell or PageHeader and did not. Arm A passes on the no-JavaScript baseline context, which no consumer can install around a tool they did not write.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 20.
- **Any-site case:** Anti-silent-green discipline applied to the harness itself, gating at error tier, and shaped for any site by construction: 'The mechanism reads only <title>, <main>, and [role="main"], none of them cairn-only markup, so a consumer's own custom route and cairn's shell-less login page (which renders no <main> at all) both stay auditable.' The engine could have keyed it on .card-shell or PageHeader and did not. Arm A passes on the no-JavaScript baseline context, which no consumer can install around a tool they did not write.

## audit-cli-create-cairn-site-flag-set-resume-state-store-local-console: `create-cairn-site flag set, resume state store, local console`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The keep's own praised flag rests on the defect rank 46 retires. args.mjs:29-33 and chapter2.mjs:680-693 gate Workers Paid behind --email, premised on chapter.mjs:106-113's "nothing in this step costs money". Rank 46 says the prompt order is part of the defect, and the order lives in these flags. --dry-run and the resume store keep.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 21.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md) (verdict overturned there).

## audit-cli-the-static-suppression-directive-contract: `The static suppression directive contract`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Three honesty properties, each its own error-tier finding, and 'Neither of those errors can itself be suppressed. A build that passes by suppression has to read as one.' Arm A passes on the node-resolution semantics ('resolves to the next syntax-tree node, not the next physical line'), which need the svelte/compiler AST the tool already holds. The most even sub-surface in the subsystem, mirrored by the rendered allowlist's three stale/dead/unprobeable ids.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 22.
- **Any-site case:** Three honesty properties, each its own error-tier finding, and 'Neither of those errors can itself be suppressed. A build that passes by suppression has to read as one.' Arm A passes on the node-resolution semantics ('resolves to the next syntax-tree node, not the next physical line'), which need the svelte/compiler AST the tool already holds. The most even sub-surface in the subsystem, mirrored by the rendered allowlist's three stale/dead/unprobeable ids.

## audit-cli-config-public-origin-check: `config.public-origin check`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Textbook Arm A, and the shape coherence C13 wanted everywhere: 'The judgment is requireOrigin, the same rule the Worker applies.' The check does not reimplement the rule, it calls the engine's own, so the CLI verdict and the runtime verdict cannot drift by construction. A consumer hand-rolling a PUBLIC_ORIGIN sanity regex agrees with the Worker until the Worker changes. The localhost/127.0.0.1 http carve-out serves every consumer, not the family.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 23.
- **Any-site case:** Textbook Arm A, and the shape coherence C13 wanted everywhere: 'The judgment is requireOrigin, the same rule the Worker applies.' The check does not reimplement the rule, it calls the engine's own, so the CLI verdict and the runtime verdict cannot drift by construction. A consumer hand-rolling a PUBLIC_ORIGIN sanity regex agrees with the Worker until the Worker changes. The localhost/127.0.0.1 http carve-out serves every consumer, not the family.

## audit-cli-create-cairn-site-cloudflare-chapters-deploy-domain-and-emai: `create-cairn-site Cloudflare chapters (deploy, domain and email, Builds)`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The charter question is settled by a recorded ruling, not open: 'create-cairn-site is setup tooling a developer runs deliberately, so it may provision. The runtime library still must never reach for provisioning credentials.' The merge argument is entirely anonymous-consumer: 'a scaffolder that cannot provision has to emit a wrangler.jsonc with blank D1 and R2 identifiers for the developer to fill in by hand, while one tool writes the real ids it just created.' The honesty about what it cannot do (API token, Email Sending onboarding, App creation, nameserver delegation) is the strongest evidence of good shape.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 24.
- **Any-site case:** The charter question is settled by a recorded ruling, not open: 'create-cairn-site is setup tooling a developer runs deliberately, so it may provision. The runtime library still must never reach for provisioning credentials.' The merge argument is entirely anonymous-consumer: 'a scaffolder that cannot provision has to emit a wrangler.jsonc with blank D1 and R2 identifiers for the developer to fill in by hand, while one tool writes the real ids it just created.' The honesty about what it cannot do (API token, Email Sending onboarding, App creation, nameserver delegation) is the strongest evidence of good shape.

## audit-cli-create-cairn-site-github-chapter-app-creation-install-repo-c: `create-cairn-site GitHub chapter (App creation, install, repo create, push)`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm A passes hard: the GitHub App IS cairn's publish mechanism (committer cairn-cms[bot], author the editor), and the permission set, installation scope, and three Worker credentials are cairn's contract end to end. Creating that App by hand from a docs page is the highest-friction step in setup and the one most likely to be subtly wrong in a way that fails only later, at the first Publish. 'The no-git-binary push' serves any developer on a machine without git configured.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 25.
- **Any-site case:** Arm A passes hard: the GitHub App IS cairn's publish mechanism (committer cairn-cms[bot], author the editor), and the permission set, installation scope, and three Worker credentials are cairn's contract end to end. Creating that App by hand from a docs page is the highest-friction step in setup and the one most likely to be subtly wrong in a way that fails only later, at the first Publish. 'The no-git-binary push' serves any developer on a machine without git configured.

## audit-cli-cairn-audit-rendered-harness-base-url-dynamic-playwright-bot: `cairn-audit rendered harness (BASE_URL, dynamic Playwright, both themes, silent-green refusals)`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Five named refusal conditions all at exit 2, which 'is never a design verdict'. Two decisions deserve protection: 'Every configured page renders under both themes, always: a rule that only holds in one color scheme is exactly the failure mode this exists to catch' (not configurable, correctly), and Playwright as a dynamic import from the consumer's own install, 'so a project that never runs rendered mode takes no browser dependency' - the leanest possible seam for a heavy dependency, serving the consumer least invested in the tool.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 26.
- **Any-site case:** Five named refusal conditions all at exit 2, which 'is never a design verdict'. Two decisions deserve protection: 'Every configured page renders under both themes, always: a rule that only holds in one color scheme is exactly the failure mode this exists to catch' (not configurable, correctly), and Playwright as a dynamic import from the consumer's own install, 'so a project that never runs rendered mode takes no browser dependency' - the leanest possible seam for a heavy dependency, serving the consumer least invested in the tool.

## audit-cli-rendered-allowlist-and-rule-declared-exemptions: `Rendered allowlist and rule-declared exemptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Exists because 'a live-page finding has no source line a suppression comment could sit beside', with three failure ids mirroring the static idiom. Two pieces of reasoning are the strongest on the audit surface: the dead verdict 'waits on a complete run', and 'Only an advisory rule can exempt itself ... A gate any rule could quiet in one line is worth no more than the runs it passes.' An engine that gave itself a self-exemption power and then capped it at advisory has answered the who-audits-the-auditor question honestly.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 27.
- **Any-site case:** Exists because 'a live-page finding has no source line a suppression comment could sit beside', with three failure ids mirroring the static idiom. Two pieces of reasoning are the strongest on the audit surface: the dead verdict 'waits on a complete run', and 'Only an advisory rule can exempt itself ... A gate any rule could quiet in one line is worth no more than the runs it passes.' An engine that gave itself a self-exemption power and then capped it at advisory has answered the who-audits-the-auditor question honestly.

## audit-cli-cairn-media-seed-command-exit-contract-content-addressed-wri: `cairn-media-seed command, exit contract, content-addressed write`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm A passes decisively: the command translates between two cairn-owned conventions, the public delivery URL <base>/media/<slug>.<hash>.<ext> and the internal R2 key media/<hash[0:2]>/<hash>.<ext>, including the two-character hash shard. Engine-internal knowledge with no external documentation source. The exit contract is the most complete of the four bins (0/1/2, per-failure stderr lines, a summary that always prints), and the per-row tolerance matches the engine's own manifest reader rather than inventing a local rule.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 28.
- **Any-site case:** Arm A passes decisively: the command translates between two cairn-owned conventions, the public delivery URL <base>/media/<slug>.<hash>.<ext> and the internal R2 key media/<hash[0:2]>/<hash>.<ext>, including the two-character hash shard. Engine-internal knowledge with no external documentation source. The exit contract is the most complete of the four bins (0/1/2, per-failure stderr lines, a summary that always prints), and the per-row tolerance matches the engine's own manifest reader rather than inventing a local rule.

## audit-cli-cairn-doctor-shell-report-format-exit-codes: `cairn-doctor shell, report format, exit codes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm A passes through the condition registry: 'Each check ties to a condition in cairn's diagnostics registry, and a failure prints that condition's why and remediation, the same text the runtime error surfaces use.' One vocabulary across the CLI, the runtime errors and the readiness checklist is a coherence property only the engine can hold. 'A failing check never stops the run, so a single pass surfaces everything that still needs fixing' is the right design commitment, and 'An unknown conditionId is a programming error; condition() throws and the report does not paper over it.'
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 29.
- **Any-site case:** Arm A passes through the condition registry: 'Each check ties to a condition in cairn's diagnostics registry, and a failure prints that condition's why and remediation, the same text the runtime error surfaces use.' One vocabulary across the CLI, the runtime errors and the readiness checklist is a coherence property only the engine can hold. 'A failing check never stops the run, so a single pass surfaces everything that still needs fixing' is the right design commitment, and 'An unknown conditionId is a programming error; condition() throws and the report does not paper over it.'

## audit-cli-cairn-audit-command-shape-tiers-exit-codes: `cairn-audit command shape, tiers, exit codes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The tier reasoning is what makes the tool safe to ship to a consumer whose admin looks nothing like cairn's: 'each advisory rule measures a compositional question a legitimately novel component can answer differently on purpose.' That separates a design audit from design police. 'Exit code 2 is never a design verdict.' Arm A passes: the tiering rests on cairn's own ratified-vs-observed distinction, which lives in the shipped norms manifest.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 30.
- **Any-site case:** The tier reasoning is what makes the tool safe to ship to a consumer whose admin looks nothing like cairn's: 'each advisory rule measures a compositional question a legitimately novel component can answer differently on purpose.' That separates a design audit from design police. 'Exit code 2 is never a design verdict.' Arm A passes: the tiering rests on cairn's own ratified-vs-observed distinction, which lives in the shipped norms manifest.

## audit-cli-cairn-doctor-flag-set-env-fallbacks-three-source-derivation: `cairn-doctor flag set, env fallbacks, three-source derivation`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm A at its cleanest on the doctor: the third source 'evaluates the configured adapter module through the site's own Vite resolution', reading cairn.email.from and cairn.backend.{owner,repo}. The adapter is TypeScript, so no external tool can do it, and the payoff is that a zero-argument npx cairn-doctor works on any correctly-wired site. The secret discipline is right: 'Secrets ... come only from the environment. They are never derived from the repo and never printed', and github assembles only on the complete trio so a partial setup skips with one remediation line.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 31.
- **Any-site case:** Arm A at its cleanest on the doctor: the third source 'evaluates the configured adapter module through the site's own Vite resolution', reading cairn.email.from and cairn.backend.{owner,repo}. The adapter is TypeScript, so no external tool can do it, and the payoff is that a zero-argument npx cairn-doctor works on any correctly-wired site. The secret discipline is right: 'Secrets ... come only from the environment. They are never derived from the repo and never printed', and github assembles only on the complete trio so a partial setup skips with one remediation line.

## audit-cli-cairn-audit-config-json-contract-scope-cssfiles-palettefiles: `cairn-audit.config.json contract (scope, cssFiles, paletteFiles, sheet, rendered.pages, allowlist)`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The scope-typo asymmetry is excellent ('a typo that quietly narrows the audit to nothing is the silent green this engine exists to rule out', implemented as staticScopeFromConfig rather than a filename special case) and paletteFiles is a working adopted seam. But rendered.pages 'Replaces the defaults, never extends them ... the six core routes go unmeasured while the run still reports a clean pass' is a documented trap producing a clean report, and BOTH adopters paid the tax by restating the six defaults by hand.
- **Reopens on:** closed. All three edits executed. (b) landed in the harvest-detection pass, Task 2 (`sheet` is now `string | string[]`, additive; a string still resolves to a one-element list). (a) and (c) land in the conventions pass, Task 11: `rendered.extraPages` (`config.ts`) appends to `rendered.pages` (or, absent that key, `DEFAULT_RENDERED_PAGES`), so the "replaces, never extends" doc warning dissolves; and the rendered harness (`rendered.ts`) gains the redirect-trap refusal, throwing (exit 2, naming `CAIRN_AUDIT_COOKIES`) when `/admin/login` is configured and every other configured page's SSR identity also resolves to the login route's own title/landmark.
- **Shape:** Three edits: (a) add `rendered.extraPages` as additive so a consumer's own screen does not silently drop the core six; (b) make `sheet` a list (`config.ts:154` failed on anything but a bare string, so `no-uncompiled-class` could not see a consumer's own compiled CSS alongside the packaged one); (c) the rendered-mode redirect trap (rank 15) becomes a harness refusal: if every configured page settles on the login card, that is a silent green the run should exit 2 on, not something a consumer documents in a config `$comment`.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 32.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-one-filled-action-focus-renders-interactive-contrast-viewpor: `one-filled-action, focus-renders, interactive-contrast, viewport-overflow (error-tier rendered)`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. one-filled-action is Arm B with a structural exemption rather than a nominal one ('Filled means the accent, read from the live computed background, so the sanctioned ink fills are exempt by construction rather than by name') - charter constraint 3 done right, no class name from any site in the rule. focus-renders measures paint not markup. interactive-contrast is honest that it is not a WCAG floor. viewport-overflow at 390 and 320 is where every consumer's admin breaks first. All four rest on the canvas-readback color method, since 'a parser is the one component in this pipeline guaranteed to be wrong about a real value'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 33.
- **Any-site case:** one-filled-action is Arm B with a structural exemption rather than a nominal one ('Filled means the accent, read from the live computed background, so the sanctioned ink fills are exempt by construction rather than by name') - charter constraint 3 done right, no class name from any site in the rule. focus-renders measures paint not markup. interactive-contrast is honest that it is not a WCAG floor. viewport-overflow at 390 and 320 is where every consumer's admin breaks first. All four rest on the canvas-readback color method, since 'a parser is the one component in this pipeline guaranteed to be wrong about a real value'.

## audit-cli-touch-targets-rendered-rule: `touch-targets rendered rule`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The most rigorously bounded rule in the engine, and it publishes the limit that most weakens it: 'on cairn's own admin, 8 of the 10 errors this rule raises clear it' under 2.5.8's spacing exception. An engine that states that is not overclaiming, which is what lets it gate at error tier without lying. The measurement is engine-grade and not hand-rollable: the control's box unioned with a qualifying ::before expansion plus every label the platform reports as activating the control.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 34.
- **Any-site case:** The most rigorously bounded rule in the engine, and it publishes the limit that most weakens it: 'on cairn's own admin, 8 of the 10 errors this rule raises clear it' under 2.5.8's spacing exception. An engine that states that is not overclaiming, which is what lets it gate at error tier without lying. The measurement is engine-grade and not hand-rollable: the control's box unioned with a qualifying ::before expansion plus every label the platform reports as activating the control.

## audit-cli-email-sender-onboarded-check: `email.sender-onboarded check`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Magic-link auth is cairn's front door: if the sender is not onboarded, no editor can ever sign in, and the error is E_SENDER_NOT_VERIFIED, the same string Email Routing uses for a different failure, 'which is how the ecxc outage hid'. A check that resolves an ambiguity a production outage could not resolve is a claim about the platform's error vocabulary that any consumer of that platform inherits, hit on day one, not day one hundred.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 35.
- **Any-site case:** Magic-link auth is cairn's front door: if the sender is not onboarded, no editor can ever sign in, and the error is E_SENDER_NOT_VERIFIED, the same string Email Routing uses for a different failure, 'which is how the ecxc outage hid'. A check that resolves an ambiguity a production outage could not resolve is a claim about the platform's error vocabulary that any consumer of that platform inherits, hit on day one, not day one hundred.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-github-app-check: `github.app check`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. 'The GitHub check walks the exact chain the Worker walks on a save, so a green check means the commit pipeline's credentials work, and a failure names which link broke.' Arm A by construction: PEM parse to JWT sign to installation-token mint to repo read exists in that exact sequence because src/lib/github walks it on every Publish. Three credentials, three ways to be subtly wrong (a re-wrapped PEM, the wrong installation id, an App id vs a client id), all failing identically at the first Publish with the editor watching.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 36.
- **Any-site case:** 'The GitHub check walks the exact chain the Worker walks on a save, so a green check means the commit pipeline's credentials work, and a failure names which link broke.' Arm A by construction: PEM parse to JWT sign to installation-token mint to repo read exists in that exact sequence because src/lib/github walks it on every Publish. Three credentials, three ways to be subtly wrong (a re-wrapped PEM, the wrong installation id, an App id vs a client id), all failing identically at the first Publish with the editor watching.

## audit-cli-stock-default-hazards-static-rule: `stock-default-hazards static rule`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm B in its purest form: four recorded cairn rulings against specific DaisyUI defaults, with the finding text carrying the citation ('Each finding names the refuted alternative and where the decision is recorded'). The recurrence is evidence about DaisyUI, not about the family: 'the invisible-edge mechanic already patched three times across cairn sites' by people who had already fixed it elsewhere. Any consumer building a DaisyUI admin reaches for badge-ghost and a bare .dropdown because that is what DaisyUI's own docs show.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 37.
- **Any-site case:** Arm B in its purest form: four recorded cairn rulings against specific DaisyUI defaults, with the finding text carrying the citation ('Each finding names the refuted alternative and where the decision is recorded'). The recurrence is evidence about DaisyUI, not about the family: 'the invisible-edge mechanic already patched three times across cairn sites' by people who had already fixed it elsewhere. Any consumer building a DaisyUI admin reaches for badge-ghost and a bare .dropdown because that is what DaisyUI's own docs show.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-create-cairn-site-command-template-bake-check-template-gate: `create-cairn-site command, template bake, check:template gate`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The publish ruling is entirely an anonymous-consumer argument: 'It ships as a published create-* package, since the ruling's whole point is a single experience for someone who has not cloned this repo. A repo script only a cloner can run cannot be that.' create-* is npm's own convention, so first contact costs zero prior knowledge, and the bake derives the template from examples/showcase, the tree the engine's test suite actually runs against, with check:template failing on drift. Ranks here and no higher because it does not exist yet: npm view returns 404, version is 0.0.0, the ROADMAP item is unchecked, and two of four recorded first-run defects are still open.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 38.
- **Any-site case:** The publish ruling is entirely an anonymous-consumer argument: 'It ships as a published create-* package, since the ruling's whole point is a single experience for someone who has not cloned this repo. A repo script only a cloner can run cannot be that.' create-* is npm's own convention, so first contact costs zero prior knowledge, and the bake derives the template from examples/showcase, the tree the engine's test suite actually runs against, with check:template failing on drift. Ranks here and no higher because it does not exist yet: npm view returns 404, version is 0.0.0, the ROADMAP item is unchecked, and two of four recorded first-run defects are still open.

## audit-cli-config-site-config-check: `config.site-config check`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Arm A is unambiguous: 'the doctor runs the engine's own parser and URL-policy validator', the parseSiteConfig / requireOrigin pattern again, including the Contract v2 hard-error on a stale per-concept content: block. A consumer cannot get this right by hand because the parser's rules change with the engine. AND Arm B fires: the engine's own scaffolder diverged from the engine's own checker, on 100% of scaffolded sites.
- **Reopens on:** closed. Executed by the conventions pass, Task 10: `src/theme/site.config.yaml` joins `SITE_CONFIG_PATHS` in `checks-local.ts`, and the not-found branch returns `unchecked` rather than `skip`. The one-source derivation off the template bake's own constant is left as a `// WATCH:` comment beside the list, routed to the internals pass's dogfood work rather than executed here.
- **Shape:** Add `src/theme/site.config.yaml` to `SITE_CONFIG_PATHS` (the path the engine's own scaffolder bakes to, per `create-cairn-site`'s and the showcase's template), and derive the candidate list from the same constant the template bake uses, so the scaffolder and the checker cannot diverge again.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 39.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-type-scale-gap-scale-token-colors-grammar-boundary-static-gr: `type-scale, gap-scale, token-colors, grammar-boundary (static grammar rules)`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm B by definition, and each carries the carve-out that is the actual engineering. grammar-boundary is the load-bearing one for any consumer who themes: 'A site re-tunes the palette tokens freely; a grammar token names structure and holds across both themes' - the whole palette-vs-grammar seam, mechanically enforced, letting a consumer restyle the admin without going red while stopping them breaking the structural contract by accident. Only the engine can draw that line. Exact resolution protects all four: 'text-base, the size utility, and text-base-content, the daisyUI color utility, never read as the same class.'
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 40.
- **Any-site case:** Arm B by definition, and each carries the carve-out that is the actual engineering. grammar-boundary is the load-bearing one for any consumer who themes: 'A site re-tunes the palette tokens freely; a grammar token names structure and holds across both themes' - the whole palette-vs-grammar seam, mechanically enforced, letting a consumer restyle the admin without going red while stopping them breaking the structural contract by accident. Only the engine can draw that line. Exact resolution protects all four: 'text-base, the size utility, and text-base-content, the daisyUI color utility, never read as the same class.'

## audit-cli-border-contrast-weight-budget-screen-anatomy-relational-spac: `border-contrast, weight-budget, screen-anatomy, relational-spacing, norms-bands (advisory rendered)`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. norms-bands is why the manifest is a product: 'a number that is not settled ground truth is not a reference to measure against.' weight-budget's region model is charter constraint 3 longhand - 'Each shape is named by an HTML tag or the ARIA role that means the same thing, never by a class, so a rewritten component stays covered' - and it publishes where its own abstraction leaks (PageHeader's action slot exempt, Pagination's range line not). screen-anatomy reads the drawer class the shell projects at SSR rather than guessing from path depth. border-contrast hit-tests the pixel beyond each edge and refuses a ratio it cannot stand behind.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 41.
- **Any-site case:** norms-bands is why the manifest is a product: 'a number that is not settled ground truth is not a reference to measure against.' weight-budget's region model is charter constraint 3 longhand - 'Each shape is named by an HTML tag or the ARIA role that means the same thing, never by a class, so a rewritten component stays covered' - and it publishes where its own abstraction leaks (PageHeader's action slot exempt, Pagination's range line not). screen-anatomy reads the drawer class the shell projects at SSR rather than guessing from path depth. border-contrast hit-tests the pixel beyond each edge and refuses a ratio it cannot stand behind.

## audit-cli-auth-store-auth-role-vocabulary-auth-email-normalization-d1-: `auth.store, auth.role-vocabulary, auth.email-normalization (D1 probes)`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm A is total: three table names, one capability semantics and one bootstrap invariant, all cairn's, none documented anywhere a consumer could find without reading engine source. The failure mode is the worst a CMS has - a correctly deployed site with an empty owner table locks every human out permanently, with no recovery through the UI because the UI is what you are locked out of. auth.email-normalization names its hole exactly: 'a manual wrangler d1 execute insert is the one way to violate it', which is the documented late-night setup path, and the row silently never matches at sign-in.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 42.
- **Any-site case:** Arm A is total: three table names, one capability semantics and one bootstrap invariant, all cairn's, none documented anywhere a consumer could find without reading engine source. The failure mode is the worst a CMS has - a correctly deployed site with an empty owner table locks every human out permanently, with no recovery through the UI because the UI is what you are locked out of. auth.email-normalization names its hole exactly: 'a manual wrangler d1 execute insert is the one way to violate it', which is the documented late-night setup path, and the row silently never matches at sign-in.

## audit-cli-supported-toolchain-contract-and-check-target-stack: `Supported-toolchain contract and check:target-stack`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Distinguishes two claims most projects conflate ('Where a peer range admits versions older than the one CI runs, that room is untested rather than proven') and the gate derives every Target today cell from the source the number comes from, with honest scoping. The @cloudflare/workers-types ^5 note is the strongest anonymous-consumer content: 'a skipLibCheck: true project, a common default, silently loses every cairn-typed binding signature to an unresolvable-import any, with no red TS2307 to flag the gap.' A consumer whose types silently become any will never file a bug.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 43.
- **Any-site case:** Distinguishes two claims most projects conflate ('Where a peer range admits versions older than the one CI runs, that room is untested rather than proven') and the gate derives every Target today cell from the source the number comes from, with honest scoping. The @cloudflare/workers-types ^5 note is the strongest anonymous-consumer content: 'a skipLibCheck: true project, a common default, silently loses every cairn-typed binding signature to an unresolvable-import any, with no red TS2307 to flag the gap.' A consumer whose types silently become any will never file a bug.

## audit-cli-config-bindings-config-media-bucket-config-observability: `config.bindings, config.media-bucket, config.observability`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The closest thing to a pure Arm A trio here. EMAIL and AUTH_DB are cairn's names by identity - the Worker looks them up by literal string, so a typo deploys cleanly and fails at the first sign-in in production, and no generic wrangler validation will ever check them. config.media-bucket is a cross-file consistency check between the TypeScript adapter and the wrangler JSON, the class of contract no single-file tool can hold. config.observability is what makes the entire logging subsystem reachable; a consumer who never sets it discovers it while debugging a production incident with no logs.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 44.
- **Any-site case:** The closest thing to a pure Arm A trio here. EMAIL and AUTH_DB are cairn's names by identity - the Worker looks them up by literal string, so a typo deploys cleanly and fails at the first sign-in in production, and no generic wrangler validation will ever check them. config.media-bucket is a cross-file consistency check between the TypeScript adapter and the wrangler JSON, the class of contract no single-file tool can hold. config.observability is what makes the entire logging subsystem reachable; a consumer who never sets it discovers it while debugging a production incident with no logs.

## audit-cli-no-uncompiled-class-static-rule: `no-uncompiled-class static rule`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Arm A is absolute: the check resolves against dist/components/cairn-admin.css, a stylesheet only the engine builds and ships, and it catches a failure class with no other detector anywhere in the stack - a class that compiled to nothing renders as unstyled markup that a type check, a build and a test suite all pass. Two family sites filed for it independently, which is evidence about the mechanism rather than about the family: 'No build or type step flags a DaisyUI class that produced zero rules.' Any consumer extending the admin through the CairnAdminShell seam writes classes compiled by their own build.
- **Reopens on:** closed. Executed by the harvest-detection pass, Task 2: `sheet` is now `string | string[]` (`config.ts`'s `asPathOrPathList`), so a site's own compiled stylesheet joins the packaged one, and a class either registered sheet compiles is no longer a false positive.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 45.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-create-cairn-site-cost-narrative-chapter-1-consent-email-adm: `create-cairn-site cost narrative (chapter 1 consent, EMAIL_ADMISSION_DETAIL, costPreamble)`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Adjudicated, not inherited, and verified live: money.mjs:32-34 correctly states Workers Paid '$5 US per month ... from the day you deploy it', while chapter.mjs:106-113 still tells the reader at the consent moment 'Cloudflare's free workers.dev hosting ... The free plan is enough; nothing in this step costs money', and chapter2.mjs:191-196 frames Paid as needed 'once anyone other than you needs to sign in'. The tool contradicts itself inside one run. Every other defect on this surface is found by someone already invested; this one is found by a stranger in the first five minutes, at the instant they are asked to consent, and what they find is that the tool lied about money.
- **Reopens on:** open until executed; the remediation pass closes it (shape: RULING: Workers Paid is the baseline, stated once up front, and every later prompt is premised on it. Three constraints. (1) Not a copy fix - EMAIL_ADMISSION_DE).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 46.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-config-dependency-floors-check: `config.dependency-floors check`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The best-shaped mechanism in the doctor: the floors are 'read from the installed @glw907/cairn-cms/package.json so the floors are declared once', so the check is correct on 0.51.0 and on 0.96.0 and on every future release with no doctor change, and can never disagree with package.json, supported-toolchain.md, or the peer warning npm printed at install. Arm A is total. The failure it catches is severe and silent: svelte 5.56.1 miscompiles parenthesized boolean groupings and a consumer compiles the package's shipped .svelte sources directly.
- **Reopens on:** closed. Executed by the conventions pass, Task 10: `config.dependency-floors` reads `package-lock.json`, then `pnpm-lock.yaml`, then `yarn.lock` in that order, judging whichever resolves first against the engine's peer ranges; it returns `unchecked` only when none of the three exists.
- **Shape:** Read `pnpm-lock.yaml` and `yarn.lock` alongside `package-lock.json`, so a pnpm or yarn consumer gets a real verdict instead of a silent skip that never changes the exit code; failing that, at minimum give the no-lockfile-found case the INFO-vs-PASS (here, unchecked-vs-skip) distinction rank 8 needs.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 47.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-cairn-audit-norms-subcommand-and-the-shipped-norms-manifest: `cairn-audit norms subcommand and the shipped norms manifest`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The only thing on the CLI surface a consumer could not build with unlimited effort, because it measures a rendering only the engine produces. Four properties: provenance is a first-class field checked in BOTH directions ('A one-directional check can only notice a row it already knows about, which is how a settled ruling once left a stale [open-question] flag printing with no question behind it'); it survives a consumer re-theming by construction ('a palette-dependent property as a relationship, never as a resolved value ... no entry teaches a number that site's own theme never produces'); it refuses to answer emptily (unknown term exits 2 with the role list); and the apparatus/product boundary is drawn correctly and gated.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 48.
- **Any-site case:** The only thing on the CLI surface a consumer could not build with unlimited effort, because it measures a rendering only the engine produces. Four properties: provenance is a first-class field checked in BOTH directions ('A one-directional check can only notice a row it already knows about, which is how a settled ruling once left a stale [open-question] flag printing with no question behind it'); it survives a consumer re-theming by construction ('a palette-dependent property as a relationship, never as a resolved value ... no entry teaches a number that site's own theme never produces'); it refuses to answer emptily (unknown term exits 2 with the role list); and the apparatus/product boundary is drawn correctly and gated.

## audit-cli-cairn-manifest-publishedat-carry-forward-and-corrupt-file-de: `cairn-manifest publishedAt carry-forward and corrupt-file degradation`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The strongest Arm A case in the subsystem, and a one-way door. Every other manifest field is derived from the corpus; publishedAt is derived from HISTORY, which is not in the corpus. 'Without this, regenerating would clear every one.' A consumer who regenerates by any other means permanently destroys every first-publish date on their site, silently, with a clean exit code and a valid-looking manifest - no test catches it, no build fails. The corrupt-file branch correctly resolves a real conflict: 'regenerating is how a site repairs a corrupt manifest, so throwing here would leave it with no way out', and it announces the loss on stderr.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 49.
- **Any-site case:** The strongest Arm A case in the subsystem, and a one-way door. Every other manifest field is derived from the corpus; publishedAt is derived from HISTORY, which is not in the corpus. 'Without this, regenerating would clear every one.' A consumer who regenerates by any other means permanently destroys every first-publish date on their site, silently, with a clean exit code and a valid-looking manifest - no test catches it, no build fails. The corrupt-file branch correctly resolves a real conflict: 'regenerating is how a site repairs a corrupt manifest, so throwing here would leave it with no way out', and it announces the loss on stderr.

## audit-cli-cairn-manifest-command-vite-config-discovery-exit-behavior: `cairn-manifest command, Vite-config discovery, exit behavior`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The most-adopted CLI in the family: 5 of 5 sites wire it as "cairn:manifest": "cairn-manifest". Arm A is complete on both halves. The manifest is a build-gating engine artifact (the plugin 'verifies the manifest on every build and fails the build on drift'), so a developer who edits content outside the admin has a broken build and exactly one fix. And regeneration cannot be hand-rolled at all, because 'the bin reuses the plugin's options, it regenerates with exactly the inputs the build verifies against' - agreement with the verifier is achieved by being the same code. This is what the whole surface should look like.
- **Reopens on:** closed. Executed by the conventions pass, Task 11: `vite/bin.ts` moves to `process.exitCode` (never `process.exit`), matching the stdout-flush rule its three siblings already state verbatim, and gains argv parsing (`vite/assemble.ts`) that accepts `--help` (exit 0, printing `USAGE`) and rejects everything else at exit 2.
- **Shape:** Two evenness defects on the item every consumer touches. (a) `vite/bin.ts:10` used `process.exit(1)` where its three siblings deliberately do not (`doctor/bin.ts:5-7`: "The codes go through `process.exitCode`, never `process.exit`, so a piped stdout flushes the whole report before the process ends", the same note verbatim in `audit/bin.ts` and `media-seed/bin.ts`); a truncated stderr message in a piping CI job left a consumer with a red build and no reason. (b) It read no argv at all, so `--help`, `--verbose`, and `--typo` were all silently accepted and ignored, where the siblings reject unknown flags with a usage line; rides with rank 11's `--help` shape.
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 50.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## check-self-use: `check:self-use`, the standing self-use gate for R-0's second direction  (accept, 2026-09-02, internals pass)

- **Verdict:** accept. Ratified as a standing gate: `scripts/checks/check-self-use.mjs` walks the
  public surface `check:surface`'s own `buildSurfaceModel()` derives and, for every export, checks
  whether the engine itself (`src/lib`, outside the declaring module) or the showcase reaches for
  it. A zero-caller export not covered by a reasoned allowlist entry
  (`scripts/checks/check-self-use-allowlist.json`) fails the gate. This discharges both routings
  named below: `read-from-the-source-rule`'s ratified but unenforced second direction (no gate
  existed to catch a fifth "an export the engine could use and does not" instance after the four
  C13 examples closed) and the retired `check:dogfood` proposal's underlying mechanism, rehomed
  from the cairn-audit product it was wrongly proposed into to a `scripts/checks/*.mjs` engine
  gate, its correct home.
- **Reopens on:** closed. Executed by the internals pass, Task 1. A new zero-caller export is not
  a reopen of this row; it is a new allowlist entry (with its own reason) or a new showcase call
  site, decided at the time it appears.
- **Shape:** Two-arm call-site count (in-engine, showcase) per export, STATIC TEXT SCANNING ONLY
  (never `import()`s a showcase or consumer module). An export declared under `src/lib/auth*` or
  one of `src/lib/sveltekit/{guard,csrf,admin-action,section-action}.ts` is ALLOWLIST-ONLY: a
  showcase call site alone never discharges it, enforced in `analyzeExport`'s `authOnly` branch and
  covered by `src/tests/unit/check-self-use.test.ts`. The failure message states the remedy order
  (allowlist with reason first, showcase call site second, deletion never suggested by the gate
  itself). `prepareText` blanks block comments, barrel re-export lines, AND every whole-line `//`
  comment (a line whose trimmed text starts with `//`) before scanning, so a prose mention of an
  export's name in its own doc header never counts as a call site; a `//` starting partway through
  a code line is left alone (a whole line cannot sit inside a string literal, so blanking it risks
  nothing, but a partial-line strip risks corrupting a string literal that itself contains `//`).
  The residual gap this narrows to is a name mentioned only in a trailing same-line comment on an
  otherwise-comment-free line. The allowlist's 86 entries are seeded from each zero-caller export's
  ledger KEEP row where one exists (cited by slug) and fresh prose (`no-ledger-row: true`) for the
  remainder, mostly types introduced by a post-audit reshape (the auth-family discriminated
  results, the `ToolbarDisclosure` attrs trio, `TidyEffort`) with the same anonymous-consumer shape
  their siblings already carry. Round-2 fix (whole-line-comment blanking): 17 more exports surfaced
  as zero-caller once whole-line `//` prose stopped counting as usage, five of them auth-path
  (`AuthChannelConfig`, `SectionActionConfig`, `createSectionAction`, `defineAccess`,
  `requireAccess`); every one carries a pre-existing ledger KEEP or reshape row with a genuine
  anonymous-consumer argument, so each got a cited allowlist entry rather than a showcase call
  site or a filler reason.
- **Plan-assumption correction:** the internals plan's draft named `presetUrl` and
  `BUILT_IN_PRESETS` as seeds to allowlist "with the deferral reason." Verified against the built
  surface (`buildSurfaceModel()`, and `docs/reference/media.md:55`'s own "engine-internal, not
  public surface" line): neither is exported from any package subpath, so neither is in this
  gate's domain (public exports only) and neither is allowlisted here; adding a dead entry for a
  name the gate can never see would be confusing, not discharging. This does not touch the F-1 leak
  question (Task 2) of whether either name still leaks through a rendered signature elsewhere.
- **Record:** `read-from-the-source-rule` (this file, line 38) and
  `audit-cli-check-dogfood-tripwire-proposed-into-cairn-audit-coherence-c` (this file, line 4617),
  both cited, both left byte-untouched by this row.
- **Verified:** `npm run check:self-use` (CI, `.github/workflows/test.yml`) and
  `src/tests/unit/check-self-use.test.ts`.

## check-surface-leaks: the F-1 leak-class rider on `check:surface`  (accept, 2026-09-02, internals pass)

- **Verdict:** accept. Ratified as a standing gate, chained from the existing `check:surface`
  package entry (no new top-level gate name): `scripts/checks/check-surface-leaks.mjs` derives
  F-1's own predicate ("a retire-verdicted OR ABSENT name still named inside a surviving KEEP
  export's rendered public shape") against the CURRENT surface every run, never a fixed count, and
  fails on any leak the derivation finds with no matching entry in
  `scripts/checks/check-surface-leaks.json`. This is the owner
  `docs/internal/record/2026-08-30-r4-rederivation.md`'s ratified hybrid ruling (section 7, "the
  sanction arrives with an owner") and
  `docs/internal/record/2026-08-30-retires-move-record.md` name explicitly, discharging the manual
  18-row ledger that document keeps until this rider lands.
- **Reopens on:** closed. Executed by the internals pass, Task 2. A new leak the derivation surfaces
  on a later pass is not a reopen of this row; it is a new registry entry (with its own reason),
  same discipline as `check-self-use`'s allowlist above.
- **Shape (the two-model derivation, stated join).** The recorded set is the UNION of two
  independent derivations, keyed by `(name, subpath)`, because the two known proof cases live in
  different models and neither alone finds both:
  - **The TYPE-CHECKER model** (`deriveTypeCheckerLeaks`) walks the real TypeScript type graph
    through the compiler API, from every currently-exported symbol on each subpath's own built
    `.d.ts` (excluding `/components`, see the stated-limits paragraph below), to a fixed point:
    union/intersection members (including the pre-flattening `.origin` TypeScript keeps only for
    display, which is what still names `TidyKeyProbeResult` after `TidyKeyProbeResult | "missing"`
    flattens to four raw literals), array element types, index signatures, generic type arguments,
    and call-signature parameter/return types (needed to reach an action's own failure/result
    types, `DictionaryAddFailure` and its whole family, which sit on a callable member, not an
    object property). A name is recorded only when it is absent from every subpath's export list
    AND declared somewhere in `src/lib` (`collectDeclaredTypeNames`, the known-type-universe filter
    that keeps an ambient library type like `Promise`/`RequestEvent` out of the candidate set
    without needing a hand-maintained denylist). This is the model that proves `AdvisoryAction`: two
    hops deep (`EditData.advisories[].actions[]`), invisible to the renderer, which expands exactly
    one member level (`renderInterface` prints a nested INTERFACE reference as its bare name, never
    recursing into ITS members), so `AdvisoryAction` never appears in `docs/internal/api-surface.md`
    text at all once its one-hop carrier `AdvisoryNotice` loses its own top-level row.
  - **The RENDERER model** (`deriveRendererLeaks`) works over `buildSurfaceModel()`'s already-
    rendered shape strings, comparing a name's OWN literal-string-union shape (only a shape this
    distinctive is compared, so an ordinary object or primitive member never false-matches) against
    every OTHER subpath's rendered members, canonicalized as a set so union-member reordering across
    subpaths (a real dts-bundling artifact, not a semantic difference) does not defeat the match.
    This is the model that proves `NavIcon`/`EngineScreenId`: each has its own top-level export row
    on `/sveltekit`, but root's rolled-up `.d.ts` bundles `NavLayoutEntry.icon`/
    `NavLayoutEngineRef.screen` with NO surviving symbol reference back to the named alias (an
    anonymous inlined union), so the type-checker model finds no symbol there to name; the renderer
    model catches it by comparing the printed TEXT instead. `SlotKind` is the negative control for
    this asymmetry: unlike `NavIcon`, its declaring module bundles into BOTH subpaths' own `.d.ts`
    (a real symbol reference survives on each), so the type-checker model finds it directly and the
    renderer model, which needs a name's OWN export row to read a comparison shape from, never even
    attempts it (`SlotKind` has no row on any subpath).
- **Shape (Step 3, the un-verdicted split, RULED not inherited).** The move record hands this rider
  the decision it declined to make: `DictionaryAddFailure`/`TidyFailure` (r4-rederivation section
  3(c)) versus `RemoveIndex`/`ValueOf`/`StandardResult` (the move record's "Two written exclusions"
  bullet) were treated differently by accident of discovery order, both groups structurally
  identical under F-1's predicate (unexported, never ledger-verdicted, rendered inside a surviving
  shape). RULED: fold both groups into ONE `standing-unverdicted` class; no rule separates them.
  Executed narrower than stated, honestly: the derivation's type-checker model finds
  `DictionaryAddFailure`, `TidyFailure`, and `StandardResult` (all recorded, `standing-unverdicted`),
  but not `RemoveIndex`/`ValueOf`: both live only inside `InferFieldset`'s unresolved CONDITIONAL
  and MAPPED type expression (`S extends Fieldset<infer R> ? { [K in keyof RemoveIndex<R> ...] }`),
  and the compiler's public checker API exposes no clean accessor for a conditional type's own
  `checkType`/`extendsType`/`trueType`/`falseType` the way it does for a union's `.types`; this is a
  stated derivation limit (see below), not a decision to exclude `RemoveIndex`/`ValueOf` from the
  ruled class should a later derivation reach them.
- **Shape (registry grammar).** Every recorded entry carries exactly one of two reason kinds:
  `sanctioned-by` (a move-record row, a ledger slug, or both: 27 of the 43 recorded entries, the
  18-name move-record sanction plus the 8 additional 4b Tier-1 retires Step 0 names, `UsageEntry`,
  `MediaUploadFailure`, `VocabularySaveFailure`, `SettingsSaveFailure`, `NavSaveFailure`,
  `DictionaryAddResult`, `TidyResult`, `UploadResult`) or `standing-unverdicted` (a one-line
  citation: the remaining 16, the Step 3 fold above, `NavIcon`/`EngineScreenId`/`SlotKind` per
  r4-rederivation section 1, and four names first surfaced by this rider's own derivation with no
  prior audit history at all: `DatePrefix`, `EditorActionFailure`, `MediaLibrary`, `UsageOrigin`.
  A leak with neither is a stop-and-rule, enforced by `findLeakViolations`' `hasReason` check
  (exactly one of the two, never both, never neither); the registry currently derives to 43 entries
  across 36 distinct names, a MEASURED output, never a hard-coded count.
- **Stated limits (the rider is a name-keyed guard, not a completeness claim).** Svelte component
  PROPS sit outside this rider's scope entirely: `/components` exports Svelte components
  exclusively, and every component's declared type is a generic reference to its own
  Props/Events/Slots parameters, so walking it structurally reaches every prop's own callback and
  object types, a different surface with a different owner: Task 7's props gate (`check:reference`'s
  props-vs-reference clause). `/components` therefore contributes no roots to the type-checker
  model. Beyond that: an anonymous inline shape (an object literal type with no declared name at
  all) is invisible by construction, since this rider is name-keyed; a runtime value can diverge
  from its declared type without either model seeing it (this rider reads static types only); a
  name reachable only through doc prose or a TSDoc `@link` is out of scope (text, not a type); a
  `dist`-on-disk deep import outside the `exports` map is out of scope (the package boundary, not
  the type graph); and, per the Step 3 note above, a name reachable only through an unresolved
  conditional/mapped type's own internals (`RemoveIndex`, `ValueOf`) is not currently derivable
  through the compiler's public checker API.
- **Record:** `docs/internal/record/2026-08-30-r4-rederivation.md` (section 7's hybrid ruling, its
  addendum, and section 1's three unowned names) and
  `docs/internal/record/2026-08-30-retires-move-record.md` (the 18-row sanction table and its "Two
  written exclusions" bullet), both cited throughout, both left byte-untouched by this row.
- **Verified:** `npm run check:surface` (CI, `.github/workflows/test.yml`, which already runs this
  entry) and `src/tests/unit/check-surface-leaks.test.ts`, including a failing-first proof against a
  synthetic unrecorded leak.

## reference-coverage-stale-names-rescope: `staleNames` scoped per page, not per the whole package  (accept, 2026-09-02, internals pass)

- **Verdict:** accept. Executed as foundations A's own inheritance note 1 prescribed
  (`docs/internal/record/2026-08-29-foundations-a-move-set.md:18-25`, echoed as docket item 2 in
  `docs/internal/record/2026-09-01-internals-planning-inputs/docket.md`): `scripts/checks/reference-coverage.mjs`'s
  `staleNames` reverse (stale-prose) check used to flag a reference-page name only when NO subpath
  anywhere in the package exported it, fed by `globalKnownNames()`, the union of every subpath's
  exports. A page could therefore name a real export of a DIFFERENT subpath as if it were its own
  and the gate stayed green, exactly how 14 dead Types-table rows (`AccessMap`, `Backend`,
  `RolesDeclaration`, `Capability`, `MagicLinkMessage`, and nine more) survived undetected in
  `delivery-data.md` until a manual sweep (`b065ea51`) found and removed them by hand. The gate now
  checks each page against the real exports THAT PAGE documents, via the new `knownNamesByPage()`,
  so a foreign name fails there instead of hiding behind an unrelated subpath's export list.
- **Reopens on:** closed. Executed by the internals pass, Task 3. A future page that legitimately
  needs to show a real export from another subpath as narrative context is not a reopen of this
  row; it is a new `NARRATIVE_CONTEXT_ALLOWLIST` entry with its own reason, same discipline as
  `check-surface-leaks`' registry above.
- **Shape (the per-PAGE pool, not per-subpath-entry).** Two page files each cover two `CONFIG`
  entries: `delivery.md` documents both `/delivery` and `/delivery/head`, and `reproductions.md`
  documents both `/reproductions` and `/reproductions/manifest`. Pooling per CONFIG entry rather
  than per page would false-positive a name real only on the page's OTHER covered subpath, so
  `knownNamesByPage()` unions every entry's own exports keyed by `entry.page`, and `checkOne()`
  checks a page against that union. `globalKnownNames()` (the old pool) survives unchanged, now
  used only to keep a narrative-context allowlist entry honest: an allowlisted name must still be a
  real export SOMEWHERE in the package, so a later rename or removal of `cardShell`/`headRow`/
  `iconSpan` (below) still fails here rather than hiding behind a stale allowlist reason.
- **Shape (the allowlist, fail-unless-recorded).** Measured against the real `CONFIG`: the whole
  reference tree, `core.md` included, runs clean with an EMPTY allowlist. `core.md`'s
  "Component-author helpers" section mentions the `/render` hast-building trio (`cardShell`,
  `headRow`, `iconSpan`) in prose and in a fenced example that carries a real `import`, so
  `isSignatureOnlyBlock` rejects that block and none of the three candidate carriers
  (Types-table row, bare heading, signature-only `declare` block) ever nominates the trio; the
  rescope surfaces no live drift on this page. `NARRATIVE_CONTEXT_ALLOWLIST` still carries a
  reasoned entry for the trio, recorded PREEMPTIVELY rather than in response to a firing check: if
  a later edit moves the trio into a Types-table row or a signature-only block (re-homing onto
  `/render`'s own page is deferred to the chassis pass; this ledger's
  `f1-return-position-leak-sanction` row carries the same trio as list (c) Tier 4,
  chassis-coupled), the move is carried by a reasoned entry rather than a silent pass.
  `assertAllowlistReasoned()` fails any entry with an empty `reason`, the same fail-unless-recorded
  idiom `check-surface-leaks`' registry uses above.
- **Record:** `docs/internal/record/2026-08-29-foundations-a-move-set.md` (inheritance note 1),
  `docs/internal/record/2026-09-01-internals-planning-inputs/docket.md` (item 2), and commit
  `b065ea51` (the manual fix the rescope now automates), all cited above.
- **Verified:** `npm run check:reference` (CI, `.github/workflows/test.yml`) and
  `src/tests/unit/reference-coverage.test.ts`, including a failing-first proof reconstructing the
  `delivery-data.md` drift shape against fixture subpaths. The reference tree, including
  `core.md`, passes with an empty allowlist; the recorded entry is inert against current page
  text, confirmed by running `staleNames([], coreMdText)` directly.

## indexed-access-parenthetical-convention: the indexed-access reference convention (ruling 3)  (accept, 2026-09-02, internals pass)

- **Verdict:** accept. Executed per ruling 3 (this file, "The rulings" section): a rendered shape
  that prints a member whose own type carries no export row now carries an inline parenthetical,
  beside the member's row, giving the exact expression a consumer types to reach it by indexed
  access off the containing exported type. One README note
  (`docs/reference/README.md#reading-indexed-access-forms`) states the convention once; the check
  clause enforces it wherever it applies.
- **Reopens on:** closed. Executed by the internals pass, Task 5. A future leak the
  `check-surface-leaks` rider records against a page this convention already covers inherits the
  requirement automatically (the check clause reads that registry directly); a future retrofit
  site outside `/sveltekit` and `/reproductions` is not a reopen of this row, it is the same
  convention applied to a new page as that page's own leaks accumulate.
- **Shape (the corpus, derived not counted).** The retrofit's corpus is the `check-surface-leaks`
  registry's own output (Task 2), filtered to the two subpaths this task's file list covers,
  `/sveltekit` and `/reproductions` (`core.md` carries no leak recorded against it and is dropped;
  `/delivery` and `/delivery/data`'s leaks are out of this task's scope, left for a later
  retrofit): 35 recorded entries across those two subpaths at execution time, of which 25 print
  the leaked name literally on the page (a member field typed by name, not fully inlined
  structurally): 21 needed the parenthetical added, and three (`LoginData`, `ConfirmData`,
  `EditorsData`) plus `ReproInstance` already carried it, needing only the scar-tissue sweep
  below. The other 10 (`AdvisoryAction`,
  `DatePrefix`, `EditorActionFailure`, `FragmentTarget`, `LinkTarget`, `MediaLibrary`, `SlotKind`,
  `StandardResult`, `UsageOrigin`, and `NavConcept` on `/reproductions`) are never printed by name
  on either page at all (each is absorbed into a fully-expanded inline structural type, or reaches
  the page only through a nested carrier that itself never surfaces as a bare name), so ruling 3's
  own rule (a name absent from the page is never retrofitted a parenthetical to hang on) leaves
  them untouched. `LoginData` and `ConfirmData` needed only the "or equivalently
  `Awaited<ReturnType<...>>`" alternate removed, per ruling 3's fold note (the canonical form is
  single).
- **Shape (the check clause, `reference-coverage.mjs`).** `leakNamesForSubpath` reads
  `check-surface-leaks.json` (via `check-surface-leaks.mjs`'s newly exported `loadRegistry`, one
  parse, no duplicated logic) and scopes it to one subpath; `missingIndexedAccessParentheticals`
  reports a leak name that the page prints with no code-span carrying a non-empty bracket
  subscript (`['page']`, `[number]`, `[string]`, and the like) in the same locality unit, where a
  Types-table row is its own unit (no blank line separates table rows, so the whole table would
  otherwise read as one paragraph and let one row's unrelated bracket expression excuse every
  other row's missing parenthetical) and a prose paragraph is a blank-line-delimited block
  (matching where `LoginData`/`ConfirmData`/`EditorsData` already placed theirs, a few sentences
  into the same paragraph as the printed name). The bracket search reads real backtick code spans
  (splitting on the backtick character, not a single greedy regex spanning two unrelated spans
  across intervening prose that happens to contain a markdown link's own `[text](url)` brackets)
  and requires non-empty bracket contents, so an ordinary array-type suffix (`Foo[]`) never
  false-matches as the marker. Wired into `checkOne`/`main` as a new failure class alongside
  `missing`/`untagged`/`stale`, chained on the existing `check:reference` entry (no new script,
  per the tie-break rule).
- **Shape (the scar-tissue sweep).** Every touched line's verdict provenance moved here: the
  `LoginData`/`ConfirmData` and `EditorsData` parentheticals no longer say "the retires pass
  unexported them, a sanctioned `NavIcon`-class leak"; `reproductions.md:95`'s `ReproInstance`
  parenthetical no longer carries that clause either. Each now states plainly that the type
  "carries no export row of its own," the same phrasing every new site in this retrofit uses, and
  the ledger is the only place the pass/taxonomy history lives (this row, and the rows the
  scar-tissue text pointed at: `audit-sveltekit-fragmenttarget`, `audit-sveltekit-mediausageinfo`,
  `audit-sveltekit-navpageoption`, and the F-1 hybrid ruling's own `NavIcon`-class taxonomy in
  `check-surface-leaks`, above, all byte-untouched by this row).
- **Resolves:** `audit-sveltekit-usageentry`'s closed row (byte-untouched by this row) states the
  public recovery, `NonNullable<ContentFormFailure['usage']>[number]`, as the outcome of 4b's
  retire ruling, but that expression lived only in the ledger and a test until this task: the
  `sveltekit.md` `ContentFormFailure` row now carries it as the required parenthetical (an add,
  not a verify, per this task's own scoping note), closing the gap between what the ledger
  promised and what the page said.
- **Record:** `docs/internal/record/2026-09-01-internals-planning-inputs/docket.md` (item 7) and
  "The rulings" (ruling 3), both cited above.
- **Verified:** `npm run check:reference` (CI, `.github/workflows/test.yml`) and
  `src/tests/unit/reference-coverage.test.ts`, including unit coverage for
  `missingIndexedAccessParentheticals`'s locality scoping (a Types-table row is not excused by a
  different row's marker; an array-type suffix's empty brackets are not mistaken for one) and an
  integration proof that `sveltekit.md` and `reproductions.md` carry the parenthetical for every
  name the `check-surface-leaks` registry records against them and prints.

## dev-backend-flag-refusal: `CAIRN_DEV_BACKEND`'s two refusals, on diverging witnesses (ruling 4, letter-amended)  (accept, 2026-09-02, internals pass)

- **Verdict:** accept, executing ruling 4 as letter-amended at the round-1 fold (this file, "The
  rulings" section, item 4). The docket's original text, "refuse when set," would have broken the
  engine's own exemplar: `CAIRN_DEV_BACKEND='1'` is the dev transport's ENABLE contract (the
  showcase capture transport refuses WITHOUT it), so a flag-alone refusal inside
  `createAuthChannel` would have failed the showcase's own members e2e suite before this task
  ever ran. The amended, executed predicate is *refuse when the flag is set AND the request is
  non-local*: `guard.ts` keeps its original flag-alone predicate unchanged (it mounts only in a
  production build, so there is no legitimate live-flag case for it to admit), and
  `auth-channel/factory.ts` gains a new, stricter tripwire on the AND-non-local predicate, since
  one factory instance serves both dev and prod. This executes the ruling's intent, that the flag
  must never be live in a deployed environment, with a buildable sense.
- **Reopens on:** a site's documented dev-backend deployment pattern changes shape such that the
  factory's own `event.url.hostname` is no longer a trustworthy locality witness for it (for
  example, a proxy or tunnel fronting local dev with a non-local hostname), or a consumer reports
  the AND-non-local predicate still admitting a genuinely deployed, non-local leak the tripwire
  was meant to catch.
- **Shape (the discriminator gate, Step 1).** Both discriminants the amended predicate needs are
  readable at every one of the factory's per-request entry points (`request`, `confirm`,
  `logout`): the env flag off `event.platform?.env`, a structural probe since `createAuthChannel`
  is generic over a site-defined `Env` and carries no guaranteed `CAIRN_DEV_BACKEND` member, and
  the request host off `event.url.hostname`, always present on every real `CairnEvent`. The
  discriminator gate therefore ran and took the PRIMARY path (the first-request tripwire), never
  the sanctioned fallback (documenting today's transport-body pattern as the sole contract): both
  reads are unconditionally available with no missing-input branch to route around.
- **Shape (isolate-stable vs. per-request, round-1 review S-2).** Only the env flag observation is
  cached, once per channel instance (`DevBackendFlagCache`), since a Worker isolate's env vars do
  not change between requests. The host observation is evaluated fresh on every call and never
  cached: one isolate can serve `*.workers.dev` and a custom domain interchangeably, so a cached
  host verdict from an early warm-up request would pin a permissive answer onto later production
  traffic. A caching scheme that memoized the host half alongside the flag, the naive reading of
  "a first-request tripwire," would have been unsound for exactly this reason.
- **Shape (one wording, two witnesses).** `src/lib/auth-channel/dev-flag.ts`, a new internal
  module, is the one source for the flag name, the refusal message, and the locality predicate;
  `guard.ts` and `factory.ts` both import it rather than hand-writing a second wording
  (`read-from-the-source-rule`, above). The two refusals diverge only on witness and status form:
  `guard.ts` returns a bare 503 `Response` (it runs ahead of SvelteKit's own error machinery in
  the `handle` hook); `factory.ts` throws SvelteKit's `error(503, ...)`, a hard throw outside
  either action's own result union, matching the guard's unconditional, checked-first-of-everything
  form.
- **Resolves:** `audit-auth-devdelivery`'s closed row (byte-untouched by this row) posed this
  exact question in its Shape field: "a factory-side CAIRN_DEV_BACKEND refusal is a design
  question for a later pass (`createAuthChannel` reads no env at construction time, so it cannot
  observe a per-request value)." This task is that later pass: the factory reads the flag at each
  per-request entry point instead of at construction, which is what makes the per-request host
  witness available to pair it with.
- **Record:** `docs/superpowers/plans/2026-09-01-internals-pass.md`, Task 9, and "The rulings"
  (ruling 4) and the round-1 review fold (S-1, S-2), both in the same plan file.
- **Verified:** `src/tests/unit/auth-channel-dev-backend-tripwire.test.ts` (flag set + non-local
  refuses on `request`/`confirm`/`logout` with a hard throw carrying `guard.ts`'s own message and
  status; flag set + local host is untouched; flag absent changes nothing; the env observation
  caches across calls within one instance) and the showcase's members e2e suite (its capture
  transport requires `CAIRN_DEV_BACKEND='1'` locally, proving the amended, AND-non-local sense
  breaks no legitimate dev-backend deployment).
