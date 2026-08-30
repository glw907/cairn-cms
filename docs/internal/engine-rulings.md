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
- **Record:** link to the consultation, triage, or audit document holding the full argument.
- **Any-site case:** (audit entries; required on every keep) the concrete anonymous-consumer scenario.
- **Verified:** (audit entries; required on every family-originated export and every non-keep) the verifier pass that checked it.
```

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
- **Reopens on:** the conventions pass's auth-family reshapes, where `auth-routes.ts`'s
  `requestAction`/`confirmAction` pair adopts the same `pendingCookie` nonce binding
  `createAuthChannel` already proves.
- **Record:** [2026-08-27 csrf-hardening-pass](../superpowers/plans/2026-08-27-csrf-hardening-pass.md), Task 4.

## session-cookie-derivation-out-of-csrf-slice: session cookie's secure/name derivation stays on `event.url.protocol`  (defer, 2026-08-29, csrf-hardening pass)

- **Verdict:** defer. The CSRF cookie pair now derives its Secure bit and name from
  `csrfSecure(event)` (`PUBLIC_ORIGIN`-aware), but the session cookie's own three call sites
  (`guard.ts:150`, `auth-routes.ts:199-200`'s `confirmAction`, `auth-routes.ts:225`'s
  `logoutAction`) still derive `secure` from the bare `event.url.protocol`, unchanged by this
  pass. `crypto.ts:20`'s `csrfCookieName` docstring ("mirroring `sessionCookieName`") is true
  only for the shape of the derivation, not for the `PUBLIC_ORIGIN` source now feeding the CSRF
  half; this entry is that docstring's listener. Deliberately out of scope here: the session
  cookie belongs to the conventions pass's auth family, not this CSRF-hardening slice.
- **Reopens on:** the conventions pass that threads `PUBLIC_ORIGIN` (or an equivalent
  `csrfSecure`-shaped helper) through the session cookie's own three call sites, or, sooner, the
  CSRF half resolving WEAKER than the session half on one response. That second trigger, not a
  cross-protocol mismatch alone, is what the divergence actually risks, and the fix round's
  finding 1 is its shape: a `PUBLIC_ORIGIN` carrying a leftover `http` dev value minted a bare,
  non-Secure, thirty-day `cairn_csrf` on a live https deploy while the session cookie, deriving
  from `url.protocol`, stayed `__Host-` Secure. The monotonic rule (an https request always
  resolves Secure) closes that instance; any new configuration input to the CSRF derivation can
  reopen the class, and the reverse asymmetry, where TLS termination leaves the session half the
  weaker one, stays covered by the cross-protocol trigger above.
- **Record:** [2026-08-27 csrf-hardening-pass](../superpowers/plans/2026-08-27-csrf-hardening-pass.md), Task 1.

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
  CSRF context key. That is the same objection sustained against `MediaInsertPopover`, which also
  stays internal, deferred until the `MarkdownEditor` seam collapse. The evidenced ASC need was
  selection and display, which the newly exported `MediaPicker` serves.
- **Reopens on:** a second consumer needing the whole save-path field rather than selection alone.
- **Record:** [2026-08-26 toolkit-seams pass](../superpowers/plans/2026-08-26-toolkit-seams-pass.md), Task 1; the need is evidenced in [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Survivors 1.

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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Unexport from '.'; keep internal. Its own StandardResult member is already unexported, so the rule never closed over it anyway.).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 1.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-default-roles: `DEFAULT_ROLES`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. restored pass-1 overturn: defineAccess requires a concrete vocabulary and docs/extend/restrict-admin-access.md:14 instructs the import; retire becomes correct only with a defineAccess reshape to accept undefined (filed in remediation)
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 2; conductor adjudication over recorded dissent, see the audit record.
- **Any-site case:** None demonstrated. core.md:940: resolveCapability already treats 'an undefined vocabulary as DEFAULT_ROLES', so a site gets the behavior without the constant; the literal is two keys.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-authbranding: `AuthBranding`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Real on /sveltekit (AuthRoutesConfig.branding types a hand-mounted route's argument). None on '.': nothing root-public names it, and buildMagicLinkMessage was itself demoted in 2026-07-01.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Export from /sveltekit only; drop the root re-export, following the ResolvedReference precedent ('the root re-export is a straight duplicate ... keep it exporte).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 3.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

## audit-adapter-publishactionsconfig: `PublishActionsConfig`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The seam has one; the alias does not. A site declaring editor.publishActions writes an array literal, and one annotating it writes PublishActionEntry[] just as clearly.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Retire the X[] alias; keep PublishActionEntry and type editor.publishActions as PublishActionEntry[]. Contrast NavLayout, whose alias compresses a real three-ar).
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
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 21.
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
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
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

## audit-adapter-extractvocabulary: `extractVocabulary`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The read half of the tag vocabulary the admin writes. The harvest records two themes hand-rolling capitalization around it, unaware 'a theme can commit a static vocabulary list ... purely for display labels'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-adapter-concept-model.md](record/2026-08-26-any-site-audit/rank-adapter-concept-model.md), rank 100.
- **Any-site case:** The read half of the tag vocabulary the admin writes. The harvest records two themes hand-rolling capitalization around it, unaware 'a theme can commit a static vocabulary list ... purely for display labels'.
- **Verified:** [verify-adapter-concept-model.md](record/2026-08-26-any-site-audit/verify-adapter-concept-model.md).

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
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 1.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-brokenrefrow: `BrokenRefRow`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A row of the orphan scan's referenced-but-absent half, reached only by property access from an engine-only action.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 2.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-bulkdeleteskip: `BulkDeleteSkip`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Its reason literals ('still-referenced','uncommitted') are the engine's own bulk-delete refusal vocabulary for its own dialog.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 3.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-repointplacement: `RepointPlacement`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A before/after diff row rendered inside the engine's media replace-preview modal.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 4.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-altplacement: `AltPlacement`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Its three bucket literals are copy decisions in one engine modal; near-identical to RepointPlacement.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 5.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-branchref: `BranchRef`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None, and it leaks the cairn/<concept>/<id> pending-branch layout into the public surface.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 6.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaorphanscanresult: `MediaOrphanScanResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Returned by an owner-only maintenance action inside the engine's Media Library.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 7.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaorphanpurgeresult: `MediaOrphanPurgeResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The purge modal's result bag, consumed in-process by the engine's own component.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 8.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaaltpreviewentry: `MediaAltPreviewEntry`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A row inside MediaAltPreviewPlan, itself an engine two-step modal's intermediate state.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 9.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaaltpreviewplan: `MediaAltPreviewPlan`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The preview half of a preview-then-apply flow entirely inside the engine's Media Library.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 10.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediareplacepreviewentry: `MediaReplacePreviewEntry`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A row inside the replace-preview plan; no site drives mediaReplacePreviewAction.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 11.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediareplacepreviewplan: `MediaReplacePreviewPlan`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None, and its branchDelta member drags the pending-branch model public with it.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 12.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediabulkdeleteresult: `MediaBulkDeleteResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The bulk-delete action's result bag, rendered by the engine's own library screen.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 13.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-dictionaryaddresult: `DictionaryAddResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A single-field wrapper over string[], echoed back to the editor component in the same process.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 14.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-tidykeyproberesult: `TidyKeyProbeResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A literal union describing an Anthropic key probe the engine runs for its own settings screen; inferred from data.keyStatus.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 15.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-tidyresult: `TidyResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. It also pins Anthropic SDK field naming (input_tokens/output_tokens) into cairn's public surface.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 16.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaaltpropagatefailure: `MediaAltPropagateFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None directly. components.md shows the union ContentFormFailure as the form prop, never this arm.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 17.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediabulkfailure: `MediaBulkFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Structurally identical to five siblings; six exported names for { error: string } is itself an evenness defect.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 18.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediaupdatefailure: `MediaUpdateFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A site mounting CairnMediaLibrary types form as ContentFormFailure, the union, not this arm.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 19.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediareplacefailure: `MediaReplaceFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None; same union-not-arm reasoning as MediaUpdateFailure.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 20.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediadeleterefusal: `MediaDeleteRefusal`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The engine's own still-referenced refusal, rendered by the engine's own delete dialog.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 21.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediauploadfailure: `MediaUploadFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string } again, delivered through the ContentFormFailure union.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 22.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-vocabularysavefailure: `VocabularySaveFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string } from an engine settings action; kit's generated ActionData types the form.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 23.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-settingssavefailure: `SettingsSaveFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string }; nothing in the docs asks a site to write this name.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 24.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-navsavefailure: `NavSaveFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The doc's own nav-editor example passes data: NavLoadData and lets kit's ActionData type the form.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 25.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-renamefailure: `RenameFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string }, delivered to the engine's own dialog through ContentFormFailure.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 26.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-createfailure: `CreateFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string }; identical in shape to four siblings.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 27.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-previewmintfailure: `PreviewMintFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { error: string } from the Share-link action, surfaced through the union.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 28.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-deleterefusal: `DeleteRefusal`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None by name. Richer than its siblings, but still delivered to the engine's delete dialog as ContentFormFailure.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 29.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-savefailure: `SaveFailure`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Weakest-plausible: a site might care that body round-trips on a broken-link refusal. It still reads that through the union.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 30.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-contentformfailure: `ContentFormFailure`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site mounting CairnMediaLibrary or the entry editor on its own /admin route must annotate the form prop; components.md line 204 writes this name.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Declare it as one flat interface with every field optional, each documented against the action that sets it, and keep the eleven arms module-internal. As writte).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 31.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-revertfailure: `RevertFailure`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site rendering its own history screen branches on the reason discriminant to distinguish a blocking draft from a stale head.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Rename draftStartedAt and HistoryData's startedAt to lastSavedAt. The doc-comment admits both are wrong and keeps them 'for API stability'; churn is free until ).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 32.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-tidyclient: `TidyClient`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site pointing tidy at its own gateway or proxy supplies a client. Rare, but real, and no other seam serves it.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Replace the transcribed Anthropic wire shape (max_tokens, output_config.effort, stop_reason, usage.*) with a narrow engine-owned interface taking a prompt and s).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 33.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-fragmenttarget: `FragmentTarget`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { id; title; body } feeds the editor's fragment picker; a site mounting CairnEntryEditor passes data whole.
- **Reopens on:** open until executed; the remediation pass closes it.
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
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 36.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-mediausageinfo: `MediaUsageInfo`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A per-hash overlay the engine's own library renders; no seam takes or returns it, so its Extension tier is unearned.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 37.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-uploadresult: `UploadResult`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. The proposed home is wrong: media/index.ts's header restricts /media to node-safe projection and excludes admin/ingest internals, and createMediaRoute sets the opposite precedent. Membership alone cannot carry it: Unstable, no worked example, consumed by components/media-upload-outcome.ts like the retired result bags.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Move it to /media beside MediaEntry, whose type its own body names. A developer should find cairn's media vocabulary in one subpath, not split between /media an).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 38.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-navpageoption: `NavPageOption`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. nav-routes.ts calls it 'one page option for the URL picker datalist' — a widget detail, not a contract.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 39.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-navconcept: `NavConcept`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { id; label } reached through AdminShellData.concepts; a site with nav ambitions uses the navLayout seam instead.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 40.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-gettingstarted: `GettingStarted`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A hard-coded total: 3 in the type is the tell that this is cairn's own onboarding copy, not a contract.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 41.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-markdownreferencerow: `MarkdownReferenceRow`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A markdown cheat-sheet row the engine authors and renders; reached as data.reference[i].
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 42.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-historyentry: `HistoryEntry`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None by name; reached as data.entries[i] when a site mounts the history component.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 43.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-entrysummary: `EntrySummary`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Plausible but not demanding: a helper like badge(e: EntrySummary). Satisfied by ListData['entries'][number].
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 44.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-advisoryaction: `AdvisoryAction`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. { label; href? } inside an advisory the engine both produces and renders.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 45.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-advisorynotice: `AdvisoryNotice`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. There is no seam for a site to contribute an advisory, so exporting the shape advertises an extension point that does not exist.
- **Reopens on:** open until executed; the remediation pass closes it.
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
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 48.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-resolvedpreview: `ResolvedPreview`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A site names its own preview config; this is what the engine resolved from it, reached as data.preview.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 49.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-confirmdata: `ConfirmData`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The confirm page is engine-rendered and no /components example takes this type.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 50.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-logindata: `LoginData`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Weak. A site rebranding login is plausible, but cairn's answer for that is AuthRoutesConfig.branding, not a hand-built route.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 51.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-editorsdata: `EditorsData`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Owner-only engine roster surface, and components.md never names this type.
- **Reopens on:** open until executed; the remediation pass closes it.
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
- **Reopens on:** open until executed; the remediation pass closes it.
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

## audit-sveltekit-authroutesconfig: `AuthRoutesConfig`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site on a non-Cloudflare mailer supplies its own send, and any site annotating its config object in cairn.server.ts names this. CairnAdminOptions.auth is Partial of it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 67.
- **Any-site case:** A site on a non-Cloudflare mailer supplies its own send, and any site annotating its config object in cairn.server.ts names this. CairnAdminOptions.auth is Partial of it.

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

## audit-sveltekit-editorroutesoptions: `EditorRoutesOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site with a declared role vocabulary that hand-mounts the roster screen passes its defineRoles output here; nothing else tells that screen the vocabulary.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 70.
- **Any-site case:** A site with a declared role vocabulary that hand-mounts the roster screen passes its defineRoles output here; nothing else tells that screen the vocabulary.

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

## audit-sveltekit-createnavroutes: `createNavRoutes`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site editing its public menu beside its own settings mounts navLoad and navSaveAction itself, reusing the engine's config read and commit rather than re-implementing them.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 73.
- **Any-site case:** A site editing its public menu beside its own settings mounts navLoad and navSaveAction itself, reusing the engine's config read and commit rather than re-implementing them.

## audit-sveltekit-contentroutes: `ContentRoutes`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Thin by name, but consequential: this type is why two dozen janitorial types are public at all.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Split the public return into the loads and actions a hand-mounting site actually wires, keeping the media-janitorial actions on an engine-internal shape the adm).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 74.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md).

## audit-sveltekit-contentroutesoptions: `ContentRoutesOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site whose authorization lives in its own database uses navFilter to stop teasing links its routes then refuse; a site with a work queue uses attention to badge it.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 75.
- **Any-site case:** A site whose authorization lives in its own database uses navFilter to stop teasing links its routes then refuse; a site with a work queue uses attention to badge it.

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

## audit-sveltekit-cairnadminoptions: `CairnAdminOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site overriding a seam on the recommended mount: a custom mailer, a role filter over the sidebar, attention badges, a preview lifetime.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 79.
- **Any-site case:** Any site overriding a seam on the recommended mount: a custom mailer, a role filter over the sidebar, attention badges, a preview lifetime.

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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Its concepts member is a structural stand-in for ConceptDescriptor, which is already public, so the surface carries two shapes for one idea. Take the real descr).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 82.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-resolvenavlayout: `resolveNavLayout`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Every caller is the engine (content-routes-core.ts:606 in shellLoad); no doc calls it. The proposed replacement, a validate-and-preview function, does not exist and half-duplicates validateNavLayout. Inventing surface to justify surface fails the leanness rule.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Export a narrow, purpose-named function that validates and previews a navLayout against this site's concepts, rather than publishing the engine's internal resol).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 83.
- **Verified:** [verify-route-factories.md](record/2026-08-26-any-site-audit/verify-route-factories.md) (verdict overturned there).

## audit-sveltekit-validatenavlayout: `validateNavLayout`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. The any-site case is false: content-routes-context.ts:280-287 already calls it on runtime.navLayout at composition, dynamic or literal, and the thrown error already names the bad node. Calling it by hand buys nothing and re-derives three facts the runtime holds.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Take the composed runtime (or adapter) plus the layout, instead of a ctx the caller assembles by hand from conceptIds, navMenuConfigured and roleNames. Three fa).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 84.
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Its header admits it 'performs no authorization or draft-existence check of its own, so a caller that reaches it directly owns both'. Either perform the entry-s).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Keep it in the engine at /media and drop the /sveltekit re-export. Its substantive audit belongs to the media bucket.).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: A bag named Options whose only member is an injected build flag advertises configuration that does not exist. Fold the flag into the function's testing surface,).
- **Record:** [rank-route-factories.md](record/2026-08-26-any-site-audit/rank-route-factories.md), rank 108.
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
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 1.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-formatphoneoptions: `FormatPhoneOptions`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent of formatPhone. A one-optional-string interface on the public surface.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 2.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-agefrombirthdate: `ageFromBirthdate`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. cairn has no birthdates; rosters and waivers are site domain. Eight lines, zero consumers, and the reference page must except it from its own file's charter.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 3.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-formatmoney: `formatMoney`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. cairn takes no payments; the body is one Intl.NumberFormat over cents/100. Zero consumers.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 4.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-formatmoneyoptions: `FormatMoneyOptions`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent of formatMoney.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 5.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-status-chip-dot-class: `STATUS_CHIP_DOT_CLASS`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None stated. The reference page argues it in the future conditional: 'so a future legend or key component reuses the identical dot color'. Zero consumers.
- **Reopens on:** closed. Executed by the toolkit-seams pass, Task 2, alongside the whole tone/dot retirement the 2026-08-24 owner probe ratified (docs/internal/probes/2026-08-26-chip-registers-v2): `STATUS_CHIP_DOT_CLASS`, `StatusChipTone`, and the status dot itself are all gone from `StatusChip`.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 6; executed in [2026-08-26 toolkit-seams pass](../superpowers/plans/2026-08-26-toolkit-seams-pass.md), Task 2.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-fieldrow: `FieldRow`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Three CSS declarations, and the component's own header states 'No measured defect drove this component' after the 2026-08 alignment inventory found nothing to fix.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 7.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-computecountline: `computeCountLine`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. ListToolbar already renders the line; a site designing its own toolbar designs its own copy. Sibling computeFacetLabel in the same module is deliberately unexported.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 8.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-computeappliedfilters: `computeAppliedFilters`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Its input type ListToolbarFilter[] exists only to feed ListToolbar, so a site not mounting the toolbar has nothing to pass it.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 9.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-appliedfilterpill: `AppliedFilterPill`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent of computeAppliedFilters. Appears in no component's prop signature.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 10.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-computeitemrange: `computeItemRange`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. Arithmetic Pagination already renders for anyone mounting it.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 11.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-itemrange: `ItemRange`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent of computeItemRange; absent from every component's props.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 12.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-computepagewindow: `computePageWindow`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Plausible but unmeasured: a site rendering its own pager chrome wanting cairn's exact elision. No site has asked or hand-rolled it, and cairn ships the component.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 13.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-pagewindowitem: `PageWindowItem`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent of computePageWindow; absent from every component's props.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 14.
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Collapse to a card-frame wrapper that composes PageHeader for its header band, retiring the second eyebrow/title/subtitle/action implementation and closing the ).
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 17.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-formattimestamp: `formatTimestamp`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Pinning a zone so a Worker's SSR and a browser's hydration cannot render two different strings is an any-site trap. The shipped signature misses it by taking a SQLite-shaped string.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Take any Date-parseable timestamp (ISO with offset included), not a SQLite 'YYYY-MM-DD HH:MM:SS' string; then delete CairnHistory's formatVersionDate and route ).
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
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 23; conductor adjudication over recorded dissent, see the audit record.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-selectinput: `SelectInput`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. restored pass-1 overturn: .select-sm ships in the packaged sheet whose class inventory is a de facto public API (admin-css-safelist.ts:104); pass-2 keep rested on family adoption, insufficient under constraint 2
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 24; conductor adjudication over recorded dissent, see the audit record.
- **Verified:** [verify-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/verify-admin-shell-toolkit.md).

## audit-admin-textinput: `TextInput`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. conflict adjudicated retire over reshape: same shipped-sheet ground as SelectInput; the xcathletes type-union defect (2026-08-21 harvest:21) is recorded and dies with the export
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 25; conductor adjudication over recorded dissent, see the audit record.
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
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-admin-shell-toolkit.md](record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md), rank 42.
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Replace the 6px tone dot at StatusChip.svelte:106 as the color carrier (Geoff's 2026-08-24 owner probe ruled it illegible toolkit-wide) and complete the registe).
- **Progress note (toolkit-seams pass, Task 2, 2026-08-26):** the dot/register half of this reshape is executed: the 6px tone dot is gone, `tone` retires, and `register` alone now carries color (`'quiet' | 'warning' | 'outline'`, second generation, docs/internal/probes/2026-08-26-chip-registers-v2). The badge-tier half named in the verdict (`badge badge-success` compiling to nothing) is NOT executed here; `badge-error`/`badge-success` do now compile again in the shipped sheet, but only as an incidental side effect of Task 2 blessing them in `admin-css-safelist.ts` to preserve the shipped sheet's de facto public API after the dot-era doc comment that had accidentally compiled them was removed, not because this reshape's badge-tier recipe was built. This entry stays open; a later pass closes it if it takes up the badge-tier half.
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Collapse the roughly twenty Unstable EditPage wiring props into one non-exported internal composition object, publishing only the eleven stable bare-surface pro).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Body is byte-identical to generateToken (auth/crypto.ts:86); a site wanting the reading name writes a one-line local alias.).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 1.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-generatesessionid: `generateSessionId`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. A site minting a member session id calls an identical function under a second name. The real edge (how many bytes, URL-safe?) is answered once by generateToken.
- **Reopens on:** open until executed; the remediation pass closes it (shape: A future divergence, such as a longer session id, is a parameter on one generator, never a second public name.).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 2.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-channel-schema-version: `CHANNEL_SCHEMA_VERSION`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. The docs name no consumer action. The comparison it exists for runs inside the factory, and the value is already embedded in CHANNEL_SCHEMA_SQL's own seeding INSERT that the site runs.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Publishing an internal version marker as semver surface is surface without capability; a bespoke drift check reads the cairn_channel_meta row instead.).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 3.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-devdelivery: `devDelivery`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. pass-2 dissent upheld: a hand-rolled transport gets no guard at all (the discoverability class the gate names), and the one built consumer redundantly guards before delegating
- **Reopens on:** open until executed; the remediation pass closes it (shape: Its stated purpose, guarding a dev transport reaching production, is a discoverability problem an export cannot fix; the CAIRN_DEV_BACKEND refusal belongs in th).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 4; conductor adjudication over recorded dissent, see the audit record.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-insertownerifempty: `insertOwnerIfEmpty`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. A site seeding its first owner from a setup script. That resolves to listEditors then insertEditor, and the engine already ships the declarative bootstrapOwner config for exactly this outcome.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Two public paths to one outcome. The atomic INSERT...WHERE NOT EXISTS race matters on the concurrent bootstrap login path, which bootstrapOwner already owns (au).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 5.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-hashtoken: `hashToken`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site storing member session tokens hash-only, so a leaked database yields no live sessions, then comparing a presented token's digest against the stored row with tokensMatch.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 6.
- **Any-site case:** A site storing member session tokens hash-only, so a leaked database yields no live sessions, then comparing a presented token's digest against the stored row with tokensMatch.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-delivercontext: `DeliverContext`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site typing its own deliver implementation. Two fields, wholly entailed by createAuthChannel; no independent case.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Shape is fine on its own. Membership is exactly as strong as createAuthChannel's, so it shrinks or disappears with the factory reshape (item 15).).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 7.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-channelrequestresult: `ChannelRequestResult`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site's form action switching on the request result to pick a message. Entailed by createAuthChannel.
- **Reopens on:** open until executed; the remediation pass closes it (shape: One of the better-shaped items here: it encodes the no-roster-leak ruling ('sent even for an unknown contact') in the type. Follows the factory's verdict.).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 8.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-channelconfirmresult: `ChannelConfirmResult`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site rendering seven distinct confirm outcomes on its login form, each needing site copy. Entailed by createAuthChannel.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Follows the factory. The 'challenge-required is a retry invitation, never a hard failure' ruling should survive in whatever seam replaces it.).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 9.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-authchannelevent: `AuthChannelEvent`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site typing the parameter of its own challenge callback or rateLimit.key function.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Carries its own objection: a third published request-event shape beside RequestEvent and CairnEvent, and its own comment concedes SvelteKit's satisfies it struc).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 10.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-authchannel: `AuthChannel`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site holding the constructed channel in a module-scope const and typing it.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Internal asymmetry beyond the factory's: revokeSessions takes a raw D1Database while every sibling takes an event and resolves through resolveDb. Give it the sa).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 11.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-channel-schema-sql: `CHANNEL_SCHEMA_SQL`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Unavoidable while the factory exists: a site must run this DDL once against its channel binding before any action works, from a migration in its own migrations_dir.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Wrong form, proved by the engine's own inconsistency: AUTH_DB gets packaged migrations/*.sql shipped in the tarball, the channel gets a template literal to past).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 12.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-authchannelconfig: `AuthChannelConfig`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The surface a consumer actually reads and writes; nobody uses the factory without it.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Two objections of its own. The ttl bag groups nine knobs because 'the design's own Defaults table' did, transplanted not re-derived, and its in-tree WATCH comme).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 13.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-generatetoken: `generateToken`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site with a members area mints a single-use link token to email a member. Hand-rolled, this is where Math.random, a 16-byte draw, or raw base64 +// in a URL ship and pass every test.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 14.
- **Any-site case:** A site with a members area mints a single-use link token to email a member. Hand-rolled, this is where Math.random, a 16-byte draw, or raw base64 +// in a URL ship and pass every test.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

## audit-auth-createauthchannel: `createAuthChannel`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A cairn site with a members area (club, school, paid newsletter) needs non-editor login, and hand-rolled OTP ships enumeration oracles and identity-keyed throttles that lock members out. Not a small hand-roll.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Not a seam but a second login subsystem with its own D1 schema, cookie namespace, and grammar beside the engine's magic-link login; and transplanted, not re-der).
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 15.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md).

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
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 19.
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
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 22.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md) (verdict overturned there).

## audit-auth-demoteownerifnotlast: `demoteOwnerIfNotLast`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. In-UPDATE count must survive, but it is the guarded half of the pair setEditorRole reshapes, and carries the same conflated boolean the doc works around ('to tell them apart, read the roster with listEditors first'). Evidence is symmetry, not measured misuse.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 23.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md) (verdict overturned there).

## audit-auth-removeownerifnotlast: `removeOwnerIfNotLast`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Measured failure: the only built consumer drops the boolean (roster-admin.ts:237) and its caller writes a roster.revoke audit record regardless, so a last-owner coach keeps editor row and sessions while the log records a revocation. Right form: discriminated result.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-auth-family.md](record/2026-08-26-any-site-audit/rank-auth-family.md), rank 24.
- **Verified:** [verify-auth-family.md](record/2026-08-26-any-site-audit/verify-auth-family.md) (verdict overturned there).

## audit-cloudflare-verifyturnstileoptions: `VerifyTurnstileOptions`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site factoring its Turnstile guard into a shared helper must annotate that helper's options argument; without the export the only route is Parameters<typeof verifyTurnstile>[2].
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/rank-cloudflare-audit-sink.md), rank 1.
- **Any-site case:** A site factoring its Turnstile guard into a shared helper must annotate that helper's options argument; without the export the only route is Parameters<typeof verifyTurnstile>[2].
- **Verified:** [verify-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/verify-cloudflare-audit-sink.md).

## audit-cloudflare-checkratelimitkeys: `checkRateLimitKeys`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site checking an IP budget and an email budget on one form; but the body is a five-line loop over checkRateLimit and the broadest-first ordering it teaches is prose, not enforced.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Fold into the single rate-limit export as `string | string[]`, keeping the short-circuit behavior, so the subpath carries one rate-limit name and the broadest-f).
- **Record:** [rank-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/rank-cloudflare-audit-sink.md), rank 2.
- **Verified:** [verify-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/verify-cloudflare-audit-sink.md).

## audit-cloudflare-checkratelimit: `checkRateLimit`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A Workers site wants a limiter that never blocks local dev or vitest when the binding is unprovisioned, and wants to be told when a misspelled binding name silently disabled it.
- **Reopens on:** open until executed; the remediation pass closes it (shape: One export taking `string | string[]` and returning an outcome that names the absent-binding case instead of folding it into `true` — the shape createSectionAct).
- **Record:** [rank-cloudflare-audit-sink.md](record/2026-08-26-any-site-audit/rank-cloudflare-audit-sink.md), rank 3.
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

## audit-media-mediatoken: `mediaToken`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site with its own admin over its own data (an events table, a staff directory) picks an asset from cairn's media library and must write a media: reference the engine will later resolve.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-media.md](record/2026-08-26-any-site-audit/rank-media.md), rank 2.
- **Any-site case:** A site with its own admin over its own data (an events table, a staff directory) picks an asset from cairn's media library and must write a media: reference the engine will later resolve.
- **Verified:** [verify-media.md](record/2026-08-26-any-site-audit/verify-media.md).

## audit-media-mediamanifest: `MediaManifest`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. A site writing its own card or hero helper takes the committed manifest as a parameter and needs the name; it is also readCommittedManifest's return type.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-media.md](record/2026-08-26-any-site-audit/rank-media.md), rank 3.
- **Any-site case:** A site writing its own card or hero helper takes the committed manifest as a parameter and needs the name; it is also readCommittedManifest's return type.
- **Verified:** [verify-media.md](record/2026-08-26-any-site-audit/verify-media.md).

## audit-media-normalizeassets: `normalizeAssets`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A site building its own public render resolver must obtain a resolved config, and buildMediaResolver cannot take the runtime without pulling kit types into node-safe /media.
- **Reopens on:** open until executed; the remediation pass closes it (shape: composeRuntime already computes resolvedAssets and CairnRuntime exposes it publicly, yet the reference example (media.md:29) and all six sites re-normalize a re).
- **Record:** [rank-media.md](record/2026-08-26-any-site-audit/rank-media.md), rank 4.
- **Verified:** [verify-media.md](record/2026-08-26-any-site-audit/verify-media.md).

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
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-media.md](record/2026-08-26-any-site-audit/rank-media.md), rank 7.
- **Verified:** [verify-media.md](record/2026-08-26-any-site-audit/verify-media.md) (verdict overturned there).

## audit-delivery-ai-crawlers-reviewed: `AI_CRAWLERS_REVIEWED`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. A bare date string whose only meaning is that the engine's own table may be stale; a consumer cannot refresh, override, or substitute the table buildRobots applies unconditionally.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 1.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md).

## audit-delivery-aicrawler: `AiCrawler`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None independent. Parasitic on AI_CRAWLERS: nothing in the engine accepts an AiCrawler, so a consumer can only name it while holding the table that itself fails.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 2.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md).

## audit-delivery-ai-crawlers: `AI_CRAWLERS`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Weak. buildRobots already applies it (robots.ts:42); importing it means reimplementing robots.txt. Sibling CONTENT_SIGNAL, same module and same doctor consumer, is deliberately internal.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Demote the public export; keep the module internal beside CONTENT_SIGNAL, which the doctor already reaches by relative import.).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 3.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md).

## audit-delivery-feedview: `feedView`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Both arms fail. The hasTaxonomy guard (views.ts:26,35) is dead: content-index.ts:129 already sets tags:[] absent a taxonomy field, so nothing in feedView is consumer-unreachable. And routing:'feed' bundles inFeeds (concepts.ts:17); ASC takes it on bulletins for dated permalinks (cairn.config.ts:272) while excluding them from its feed, so inFeeds is not trustworthy membership.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Take an optional async per-item enricher so a full-content feed is one call, or return the inFeeds-filtered ContentSummary[] and let the site map. Do not transp).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 4.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md) (verdict overturned there).

## audit-delivery-unlistedroutes: `unlistedRoutes`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Reshape presupposes membership. The proposed glob-taking form still parses SvelteKit's own published route-id grammar (sitemap.ts:31-41, two regexes), touches no descriptor or content-model type, and emits no delivery document, so both arms fail in the reshaped form too. 907-life copies the doc's boilerplate verbatim (sitemap.test.ts:40-52).
- **Reopens on:** open until executed; the remediation pass closes it (shape: Move the check into cairn-audit or cairn-doctor per the workstation rule that the mechanically detectable half never lives in a consuming site's probe script; o).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 5.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md) (verdict overturned there).

## audit-delivery-publicroutes: `PublicRoutes`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. The export rule does not reach it: createPublicRoutes returns an inferred object literal (public-routes.ts:246) and the alias is appended at 253, named in no signature. The stated scenario is falsified by the site living it: ASC's chassis/public-routes.ts annotates PublicRoutesConfig but leaves the routes const un-annotated. One-line exact re-derivation available.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 6.
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md) (verdict overturned there).

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

## audit-delivery-newlypublishedentries: `newlyPublishedEntries`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Announcing a post on first publish. Not derivable: it depends on the publishedAt stamp, upsertEntry's carry-forward rules, and the concept+id key — 'a drafted entry CAN carry a stamp forward' (manifest.ts:44).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 28.
- **Any-site case:** Announcing a post on first publish. Not derivable: it depends on the publishedAt stamp, upsertEntry's carry-forward rules, and the concept+id key — 'a drafted entry CAN carry a stamp forward' (manifest.ts:44).
- **Verified:** [verify-delivery.md](record/2026-08-26-any-site-audit/verify-delivery.md).

## audit-delivery-buildfragmentresolver: `buildFragmentResolver`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site using ::include must resolve a fragment id to raw markdown at build. Depends on the reserved fragments concept id and the throw-at-build, mark-at-preview split (site-resolver.ts:200).
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-delivery.md](record/2026-08-26-any-site-audit/rank-delivery.md), rank 29.
- **Any-site case:** Any site using ::include must resolve a fragment id to raw markdown at build. Depends on the reserved fragments concept id and the throw-at-build, mark-at-preview split (site-resolver.ts:200).

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
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 1.
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-render-iconspan: `iconSpan`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. None. The whole body is one family site's class vocabulary ('ec-icon'), and every family site already wraps it in its own makeIconRenderer factory anyway.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 2.
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-render-headrow: `headRow`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Weak. Real logic (optional icon, level), but bakes 'ec-head' and 'card-title'; a stranger whose design lacks those classes must override or abandon it.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 3.
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-render-iselement: `isElement`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Generally applicable but unnecessary: the body is `!!node && node.type === 'element'` over hast types the site already imports, and hast-util-is-element exists.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-render-build-tooling.md](record/2026-08-26-any-site-audit/rank-render-build-tooling.md), rank 4.
- **Verified:** [verify-render-build-tooling.md](record/2026-08-26-any-site-audit/verify-render-build-tooling.md).

## audit-render-strattr: `strAttr`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Real and design-agnostic: the engine types attributes as string|boolean, so every string read must narrow. 10-17 call sites per family site, 15 in the shipped scaffold.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Move the reader onto ComponentContext as ctx.str(key), beside ctx.slot and ctx.items, and drop the standalone export: it removes an import and a public export r).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Un-export; keep module-internal for getStory and the in-repo test.).
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 1.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-fixturemediabase: `fixtureMediaBase`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. A docs site under a SvelteKit paths.base cannot comply: ReproContext hardcodes the root-absolute /repro-assets with no override, so every fixture image 404s.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Make the media base a ReproContext prop defaulting to /repro-assets; the site owns its URL space and the constant export can go.).
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 2.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-reproinstance: `ReproInstance`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Stated ground is false: tsc --declaration emits a non-exported same-file alias verbatim. The alias is Record<string, unknown> ("Untyped by design", index.ts:26), carries no engine fact, and cairn-pub's installed 0.95.0-rc.1 has no such parameter.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 3.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md) (verdict overturned there).

## audit-repro-reprofencevalidation: `ReproFenceValidation`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Named at zero call sites worldwide: only its declaration, its own return annotation, the manifest.ts:331 re-export, and the reference page. Eleven in-repo sites and check-visuals.mjs:194-200 destructure inline. Retiring is one clause off line 331.
- **Reopens on:** open until executed; the remediation pass closes it.
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 4.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md) (verdict overturned there).

## audit-repro-reproheights: `ReproHeights`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Any site sizing an embed iframe before load makes the indexed read entry.heights[width] ?? entry.heights.column, exactly as cairn-pub repro-marker.ts:114 does.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 5.
- **Any-site case:** Any site sizing an embed iframe before load makes the indexed read entry.heights[width] ?? entry.heights.column, exactly as cairn-pub repro-marker.ts:114 does.
- **Verified:** [verify-reproductions.md](record/2026-08-26-any-site-audit/verify-reproductions.md).

## audit-repro-validatereprofence: `validateReproFence`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Half is engine-only (story resolves, width declared). Half is cairn-pub's register: a hardcoded English "Reproduction" alt prefix and a 150-char cap refuse a localized site's valid page.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Keep and export only the manifest-dependent half; move the alt prefix, 150-char ceiling, and closed key set behind caller options or back to the site.).
- **Record:** [rank-reproductions.md](record/2026-08-26-any-site-audit/rank-reproductions.md), rank 6.
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Carry `email`. It is the only event whose documented field list is literally `none` (auth-routes.ts:229 emits log.info('auth.session.destroyed') with no argumen).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Replace the `words` payload with a count. content-routes-dictionary.ts:126 ships the added words, which are by construction a slice of the author's draft (the t).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 5.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-commit-reverted: `commit.reverted`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. "Why did this draft's text change under an editor?" — `ref` (the reverted-to sha) and `branchSha` (the new branch commit) exist nowhere else, and the doc states it fires alongside commit.succeeded for the same commit.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 6.
- **Any-site case:** "Why did this draft's text change under an editor?" — `ref` (the reverted-to sha) and `branchSha` (the new branch commit) exist nowhere else, and the doc states it fires alongside commit.succeeded for the same commit.

## audit-log-auth-channel-session-destroyed: `auth.channel.session.destroyed`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The keep rests on "an extra D1 read"; D1 supports DELETE ... RETURNING subject, one statement (store.ts:334-336), and the hash is local. factory.ts:903 carries nothing, the same defect reshaped at rank 2 on the same kind of blind delete. Evenness forbids splitting them.
- **Reopens on:** open until executed; the remediation pass closes it.
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Project the two numbers the engine means (inputTokens, outputTokens) instead of re-exporting the vendor object. content-routes-tidy.ts:258 passes `usage: messag).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: The `concept` field is overloaded with pseudo-concepts. Five of eleven emit sites pass a value that is not a declared concept: nav-routes.ts:141 {concept:'nav',).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 28.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-entry-published: `entry.published`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. F5 is preference, not divergence: events.ts:5-7 ratifies name form and snake_case reasons, nothing about pairs sharing an area. entry.* names entry outcomes (published/discarded); publish.* names publish-machinery faults (failed, address_collision). The rename breaks a public contract and orphans entry.discarded for a one-name-shorter query.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 29.
- **Any-site case:** "Which entries went live in the 09:14 publish-all, and which didn't?" — `batch` plus the doc's operator rule ("a failed publish-all logs one publish.failed per entry, so the log names everything that didn't go live").
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md) (verdict overturned there).

## audit-log-taxonomy-unmarked-field: `taxonomy.unmarked_field`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. "My tag pages are blank and nothing is failing" — a concept declares a multiselect named tags/freetags/categories but marks no `taxonomy: true` field, so the tag index reads empty with no error anywhere. Fires once per index build (content-index.ts:101).
- **Reopens on:** open until executed; the remediation pass closes it (shape: Rename to conform to the grammar events.ts ratifies in its own header ("A past-tense verb phrase names an occurrence; a state adjective names a detected conditi).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Carry `concept` beside `field`. fieldset.ts:450 logs a bare field *name*, and field names repeat across concepts by design (tags, summary, date), so a site with).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 35.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-include-missing: `include.missing`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. "A visitor reported a grey 'this include doesn't name a fragment' box somewhere on the site" — the directive renders a calm notice instead of failing, so the log is the only trace.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Two distinct authoring faults share one name and one field: resolve-include.ts:127 logs {fragment: ''} for a missing/empty attribute (a malformed directive) and).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Drop the `enabled` field. public-routes.ts:193 emits {enabled: true} and the doc row documents it as "(always `true`)": a field that can only hold one value car).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 42.
- **Verified:** [verify-log-vocabulary.md](record/2026-08-26-any-site-audit/verify-log-vocabulary.md).

## audit-log-include-read-failed: `include.read_failed`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. The doc states a real diagnostic protocol an anonymous consumer can follow: "Distinguishes a transport failure from a fragment that is genuinely absent: pair it with an include.missing naming the same id." It carries `error`, which include.missing correctly does not.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-log-vocabulary.md](record/2026-08-26-any-site-audit/rank-log-vocabulary.md), rank 43.
- **Any-site case:** The doc states a real diagnostic protocol an anonymous consumer can follow: "Distinguishes a transport failure from a fragment that is genuinely absent: pair it with an include.missing naming the same id." It carries `error`, which include.missing correctly does not.

## audit-log-preview-cleanup-failed: `preview.cleanup_failed`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Preview links still resolving for entries an editor deleted, traced to accumulating stale rows. The degradation policy is right (doc: "The primary action already succeeded; a stale row is a lesser evil than failing it") and it correctly stays silent on the two expected conditions, a missing binding and an un-migrated table.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Emit `error: String(err)` with no `reason`, and update the doc row. content-routes-core.ts:507 logs {concept, id, reason: String(err)}, putting a stringified th).
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

## audit-log-publish-address-collision: `publish.address_collision`  (keep, 2026-08-26, any-site audit)

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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Inherits the pseudo-concept overload charged to commit.succeeded verbatim: the same commitFields objects flow through the shared logCommitFailed helper in commi).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Decline the home, keep the tripwire: implement as scripts/checks/check-dogfood.mjs beside check:reference, check:surface, check:symbols, check:consumers. Runs o).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 1.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-unlistedroutes-proposed-as-a-cairn-audit-rendered-rule: `unlistedRoutes proposed as a cairn-audit rendered rule`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Fails both arms. The verify pass established the function encodes 'SvelteKit's published grammar, not cairn's (sitemap.ts:31-41 is two regexes)'; relocating two regexes does not change whose grammar they are. Subject is wrong twice: sitemap completeness is not design, and the routes are public pages outside the /admin surface every rule audits. The harness cannot do it either, since rendered rules receive a page's DOM, never the route manifest.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Declined outright. The export was already retired; relocation is removal wearing a new hat. A site's bespoke-route inventory is domain-shaped and the hand-roll ).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 2.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-skill-admin-screens-check-and-cairn-doctor-fix: `skill.admin-screens check and cairn-doctor --fix`  (retire, 2026-08-26, any-site audit)

- **Verdict:** retire. Weak and hazardous. The doctor 'probes the configuration a deployed cairn site depends on'; a Claude Code skill is not that, and the check 'never fails ... a development aid, not a deploy blocker'. It assumes one specific agent harness (.claude/skills/), and the docs concede the install leaks utility class names into the consumer's shipped CSS unless they add an '@source not' directive by hand.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Retire from the doctor, not the skill. Give it its own verb (npx cairn-skill install) or document a copy path; off the deploy preflight either way, and free the).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 3.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-edge-https-forced-and-edge-hsts: `edge.https-forced and edge.hsts`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Split the pair. conditions.ts:35-42 gives edge.https-not-forced a cairn-owned why (JS-free sign-in form POST, CSRF guard, opaque 403 over http), severity blocker: Arm A holds, keep it gating. edge.hsts is severity 'warning' yet returns fail: retire. Also, report.ts:8-12 has no advisory tier to demote into.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Demote both to advisory (report, never gate), or drop edge.hsts entirely. The narrower https claim that IS cairn's (the __Host- cookie prefix needs https) is al).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 4.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md) (verdict overturned there).

## audit-cli-chip-ground-collision-rendered-rule: `chip-ground-collision rendered rule`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The formula is engine-owned so Arm A holds, but the docs record it 'produced 24 false errors of 40 on the first consumer admin it measured, so as coded it could not serve as a consumer gate.' A 60% false-positive rate trains a reader to stop reading the advisory section, damaging the eight advisory rules that do work.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Hold it out of the registry until the filed chroma-aware repair lands, rather than shipping a rule the reference page says does not work. Re-promote on re-measu).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 5.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-form-font-parity-rendered-rule: `form-font-parity rendered rule`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Purpose is squarely Arm A ('the UA reset layer's own regression tripwire, catching a consumer whose sheet never reached the page') and only the engine ships that reset. But three named false-positive classes ship today: 'it misses variant-prefixed forms (md:font-mono, dark:font-mono), font-serif/font-sans, and Tailwind 4's font-(family-name:--x) shorthand'.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Close the exemption net before the intended error-tier promotion: match font-family utilities tolerantly of variant prefixes and the Tailwind 4 shorthand, and s).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Fold into the three-state result the ROADMAP already demands: make 'could not find a file to check' a distinct status (INFO) from 'checked and passed'. One chan).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 8.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-ai-posture-effective-check: `ai.posture-effective check`  (keep, 2026-08-26, any-site audit)

- **Verdict:** keep. Arm A passes narrowly: aiPosture is a cairn adapter concept, and the gap between 'declared in the adapter' and 'served at the edge' is nameable only by the engine that knows what the declaration should have produced. The restraint is right: it 'fails on one case only', passes a site that declares none, and passes a managed Cloudflare layer 'since whether that's wanted belongs to the zone's owner'.
- **Reopens on:** evidence against the recorded any-site case (a consultation or a later audit round).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 9.
- **Any-site case:** Arm A passes narrowly: aiPosture is a cairn adapter concept, and the gap between 'declared in the adapter' and 'served at the edge' is nameable only by the engine that knows what the declaration should have produced. The restraint is right: it 'fails on one case only', passes a site that declares none, and passes a managed Cloudflare layer 'since whether that's wanted belongs to the zone's owner'.

## audit-cli-config-tidy-key-check-and-its-active-anthropic-probe: `config.tidy-key check and its active Anthropic probe`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. Tidy is cairn's feature so the tidy.enabled-to-binding relationship is Arm A, but validating an Anthropic key is Anthropic's grammar. Three outcome modes, an outbound third-party call and a fail-soft branch for an opt-in feature that is off by default; and on a real deployed site the secret is 'invisible to any CLI', so the live probe can only fire against a local .dev.vars a developer can curl by hand.
- **Reopens on:** open until executed; the remediation pass closes it (shape: Keep the presence-and-wiring half; drop the live Anthropic call or move it behind a flag. The doctor already has a ratified idiom for a check that touches a liv).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 10.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).

## audit-cli-no-help-on-any-of-the-five-commands: `No --help on any of the five commands`  (reshape, 2026-08-26, any-site audit)

- **Verdict:** reshape. The purest Arm A item here: a consumer cannot add --help to a bin the engine ships, and it is the most likely first keystroke of a developer who just saw cairn-doctor in an install log. Verified: grep -rn "'--help'" over src/lib and packages/create-cairn-site/src returns nothing. Three defects, not one: the flag is missing everywhere; asking exits 2, the code reserved for 'the run couldn't start'; and cairn-manifest ignores argv entirely rather than rejecting it.
- **Reopens on:** open until executed; the remediation pass closes it (shape: --help on all five printing the existing USAGE constant, exit 0. cairn-manifest gains argv parsing that accepts --help and rejects everything else, matching its).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Read vite.config.ts as well as svelte.config.js (a site carries either depending on when it was scaffolded), and make 'could not find a file to check' a distinc).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Three edits: (a) add rendered.extraPages as additive so a consumer's own screen does not silently drop the core six; (b) make sheet a list (config.ts:154 fails ). Progress: (b) done in the harvest-detection pass, Task 2 (`sheet` is now `string | string[]`, additive; a string still resolves to a one-element list). Edit (a) and the ledger's un-enumerated third edit remain open.
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Add src/theme/site.config.yaml to SITE_CONFIG_PATHS, and derive the list from the same constant the template bake uses so the scaffolder and the checker cannot ).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Read pnpm-lock.yaml and yarn.lock, not only package-lock.json. Neither is exotic, and today a consumer on either gets a silent skip on the one check that would ).
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
- **Reopens on:** open until executed; the remediation pass closes it (shape: Two evenness defects on the item every consumer touches. (a) vite/bin.ts:10 uses process.exit(1) where its three siblings deliberately do not - doctor/bin.ts:5-).
- **Record:** [rank-cli-surface.md](record/2026-08-26-any-site-audit/rank-cli-surface.md), rank 50.
- **Verified:** [verify-cli-surface.md](record/2026-08-26-any-site-audit/verify-cli-surface.md).
