# Any-site audit: adapter / concept model (`.` and `/ambient`)

118 items, ranked weakest-to-strongest anonymous-consumer case. Rank 1 is the weakest case.

## Standing findings that shape many verdicts

**1. The dominant provenance in this bucket is engine doctrine, not a consumer ask.** The C2
breaking-window pass (2026-08-02, R4) adopted a rule:

> **The export rule, adopted as doctrine:** *every type named in a public signature is exported
> from a subpath the consumer already imports.*
> — `docs/superpowers/plans/2026-08-02-c2-breaking-window.md:206`

Its own post-mortem records the blast radius:

> The audit's ~40 estimate, and the main loop's own cross-reference confirming 42, both
> undercounted: closing each newly-exported type's own structural body grew the list to roughly 90.
> — same file, line 684

That rule **reversed** an earlier, adversarially-argued, evidence-based pruning verdict for 22
names (`src/tests/unit/root-barrel-prune.test.ts`, `C2_READDED`). The 2026-07-01 pass had argued
each one down individually, e.g.:

> DEMOTE TextField [prosecution: demote, HOLDS] — defense: Arm of the kept FieldDescriptor union;
> consumers use fields.text and structural narrowing on `kind`, neither of which needs the arm
> exported. … No consumer imports it.
> — `docs/superpowers/plans/2026-07-01-surface-pruning-audit-verdicts.md`

This audit's standard says family recurrence is never sufficient and there is no accept-by-default.
Doctrine is weaker still: it is not evidence at all. So every C2_READDED name ranks low here.
They nonetheless survive as **keeps**, on one ground and one only: they are a *mechanically closed
set* (the export-rule closure gate), and evenness is a property of the whole surface. Pulling
`TextField` while keeping `SelectField`, or keeping `FieldDescriptor` while unexporting its arms,
reintroduces exactly the leak the gate now forbids. Their ranks record how thin each case is.

**2. The four "collision" flags in this bucket are an audit-tooling artifact, not a real
divergence.** `EmailAttachment`, `SlotDef`, `NavLayoutEntry`, and `NavLayoutEngineRef` each have
exactly one declaration in `src/lib`. The differing signatures are union-member *ordering*
differences in the extractor's rendering (`"attachment" | "inline"` vs `"inline" | "attachment"`;
the icon literal union rotated). Verified: `src/lib/auth/types.ts:31`, `src/lib/render/registry.ts:17`,
`src/lib/sveltekit/admin-nav.ts:53` and `:116` are the sole declaration sites. No item's verdict
turns on its collision flag. Noted per item below.

**3. Measured consumer ground truth.** Root-barrel imports across the six family artifacts
(907-life, ecxc-ski, aksailingclub-org, xcathletes-org, cairn-pub, examples/showcase), read
2026-08-26. Actually imported by name: `defineAdapter`, `defineConcept`, `fieldset`, `fields`,
`githubApp`, `createRenderer`, `defineRegistry`, `defineComponent`, `composeRuntime`,
`parseSiteConfig`, `parseMarkdown`, `extractMenu`, `extractVocabulary`, `glyph`, `defineRoles`,
`defineAccess`, `canReach`, `resolveCapability`, `ownerLevelRoles`, and the types `AccessMap`,
`RolesDeclaration`, `Editor`, `CairnEnv`, `IconSet`, `NavNode`, `ImageValue`, `ComponentDef`,
`Manifest`, `ManifestEntry`, `DocHeading`, `EmailRecipient`, `MagicLinkMessage`, `SendMagicLink`.
Everything else in this bucket has **zero** named imports anywhere in the family. Zero external
consumers exist for any item: no consumer outside the family was found for anything here.

---

## 1. `StandardSchemaV1` — VERDICT: retire

- **surfacedAt:** `.`
- **Provenance:** engine-internal, from the Standard Schema conformance work.
  `git log -S` gives `22f12445 feat(content): Standard Schema conformance on the concept schema`
  and `1954a25b feat(content): export the schema primitive from the package entry`. Its own doc
  comment states what it is: *"A minimal local copy of the Standard Schema v1 interface
  (https://standardschema.dev), so the schema is a drop-in where the ecosystem accepts a
  validator, with no runtime dependency."* (`src/lib/content/standard-schema.ts:12`). No family
  site imports it. No external consumer.
- **Any-site case:** none that survives inspection. cairn's conformance is *structural*: a
  `Fieldset` satisfies a Standard-Schema-aware library because it carries a conforming
  `~standard` property, not because the consumer imports cairn's copy of the interface. An
  anonymous consumer who genuinely needs the interface as a name takes it from
  `@standard-schema/spec`, the spec's own package, exactly as they would for Zod or Valibot.
  Re-publishing a vendored copy of a third party's interface under cairn's name is the type-level
  form of the standing "link vendor docs, don't restate them" rule.
- **Verdict argument.** *For keeping:* it is zero-cost, and it lets a consumer annotate without
  adding a dependency. *Against, and decisive:* the export rule does not actually close over it
  here — `Fieldset['~standard']` is declared as `StandardSchemaV1<StandardInput, …>['~standard']`
  (`src/lib/content/fieldset.ts:57`), which declaration-emit **inlines**, and the helper
  `StandardResult` that appears in the emitted signature is itself never exported. So the surface
  already publishes this shape structurally while the named export buys nothing. It is a
  permanent support promise over someone else's spec, which cairn cannot version. Retire from `.`;
  the internal type stays.

## 2. `DEFAULT_ROLES` — VERDICT: retire

- **surfacedAt:** `.`
- **Provenance:** `77ae707e feat(auth): site-declared role vocabulary core`, the extensible-roles
  work whose driving consumer was ASC (`aksailingclub-org`, which declares `defineRoles`). Filed
  family requirement; no external consumer; **no family site imports the constant**.
- **Any-site case:** thin to absent. The engine already absorbs the default at the one place it
  matters, and the reference says so: *"`resolveCapability` returns the mapped capability,
  treating an `undefined` vocabulary as `DEFAULT_ROLES`"* (`docs/reference/core.md:940`). A site
  that wants the pair writes `{ owner: 'owner', editor: 'editor' }`; a site that wants the
  *behavior* passes `undefined` and gets it. The constant is documentation shipped as API.
- **Verdict argument.** *For keeping:* if the engine ever changed its zero-config vocabulary, a
  site's literal copy would drift. *Against, and decisive:* that change would be a breaking
  capability-model change announced with a `Consumers must:` line, not something a shared constant
  would silently absorb correctly — and nothing consumes it to drift. A two-key frozen literal
  with zero importers is the textbook "hand-roll is small" failure. Retire from `.`.

## 3. `AuthBranding` — VERDICT: reshape

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** Plan 01 auth. It sits on the root barrel as a bare 2026-07-01 keep — the
  verdicts doc lists `KEEP AuthBranding` with **no defense paragraph at all**, unlike its
  neighbors `SenderConfig` and `NavMenuConfig`, which each earned an argued REFUTED. No family
  site imports it from either subpath.
- **Any-site case:** on `/sveltekit`, real: `AuthRoutesConfig { branding: AuthBranding; … }`
  (`docs/reference/sveltekit.md:1850`), and a site on the hand-mount path types that argument.
  On `.`, none: nothing root-public names it. Grep confirms its only non-`/sveltekit` reader is
  `buildMagicLinkMessage(input: { to; branding: AuthBranding; link })`
  (`src/lib/email.ts:57`) — and `buildMagicLinkMessage` was itself **demoted** in 2026-07-01
  ("A consumer supplying a custom `SendMagicLink` receives an already-built `MagicLinkMessage`
  rather than building one"). A site's own branding reaches the engine through the adapter's
  `email: SenderConfig`, a different type.
- **Verdict argument.** Right membership (the engine owns the magic-link email; a site cannot
  patch it), wrong form: the root copy is a duplicate that the export rule does not require and
  that the July pass never defended. **Reshape:** export `AuthBranding` from `/sveltekit` only,
  the precedent the same audit set for `ResolvedReference` ("the root re-export is a straight
  duplicate … keep it exported only from /delivery, its resolver's home").

## 4. `PublishActionsConfig` — VERDICT: reshape

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** `2ae22833 feat(sveltekit): add the publish-actions seam` (2026-07-07), whose
  commit body names the new types outright: *"New public types (sveltekit): PublishActionEntry,
  PublishActionsConfig, PublishActionLink."* Built family consumer: ASC
  (`aksailingclub-org/src/theme/cairn.config.ts` declares `publishActions`). Root exposure came
  later, from the export rule (`a6b72e22 Adopt the export rule`). No external consumer.
- **Any-site case:** the *seam* has a genuine one (below, `PublishActionEntry`). The *alias* does
  not. `type PublishActionsConfig = PublishActionEntry[]` names nothing a reader could not read:
  a site declaring `editor.publishActions: [...]` writes an array literal, and one annotating it
  writes `PublishActionEntry[]` just as clearly.
- **Verdict argument.** *For keeping:* symmetry with `NavLayout`, also an array alias. *Against,
  and decisive:* `NavLayout` names a **three-arm union** array, which genuinely compresses
  something; `PublishActionsConfig` compresses `X[]` into a second name for one concept, and a
  second name for one concept is the exact evenness cost this audit exists to catch. **Reshape:**
  retire the alias, keep `PublishActionEntry`, and type the adapter member `PublishActionEntry[]`.

## 5. `DatePrefix` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`
- **Provenance:** engine doctrine. Demoted 2026-07-01 with an argued defense — *"Consumers write
  the 'year'|'month'|'day' literal on defineConcept (ConceptConfig types the field); the type need
  not be imported"* — then reinstated by the C2 export rule because `ConceptConfig.datePrefix`
  names it. Zero importers, family or external.
- **Any-site case:** the barrel comment states the mechanism honestly: *"`ConceptConfig.datePrefix`
  names this granularity type"* (`src/lib/index.ts`). A site factoring a shared concept builder
  across several concepts (`function dated(prefix: DatePrefix)`) names it. Real but marginal; the
  literal union is three tokens.
- **Verdict argument.** Weak on its own merits and I would not add it today. It survives on
  closure: `ConceptConfig` is root-public and a consumer must be able to name every part of a type
  they annotate. Keeping it while unexporting a sibling closure type would fail evenness. Keep.

## 6. `BehaviorTable` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** `b5d97e80 feat(content): expand the field behavior table with a per-field
  validator`; demoted 2026-07-01 (*"consumers pass behavior inline and never name the table. No
  consumer imports it."*); readded by `a6b72e22 Adopt the export rule`. Zero importers.
- **Any-site case:** `FieldsetOptions.behavior` and `Fieldset.behavior` both name it. A site that
  builds its behavior tables in a separate module from its fieldsets — the natural shape once
  cross-field rules grow past a couple of fields — must annotate the module's export.
- **Verdict argument.** The scenario is real but thin, and it is a closure keep, not an earned
  one. Keep for evenness with `FieldBehavior` and `FieldsetOptions`.

## 7. `FieldBehavior` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** same commit and same round-trip as `BehaviorTable` (2026-07-01 demote: *"One
  entry in the behavior table, declared inline. No consumer imports it."*; C2 readd). Zero
  importers.
- **Any-site case:** `BehaviorTable = Record<string, FieldBehavior>`, so a site that names the
  table needs the element. The reference row is honest about why it exists at all: *"Function-valued
  behavior a field descriptor cannot carry as plain data"* (`core.md:1099`) — that is a genuine
  engine constraint a site cannot work around, since descriptors must stay serializable.
- **Verdict argument.** Keep, on the same closure ground, one rank above `BehaviorTable` because
  the constraint it encodes (plain-data descriptors vs. function-valued behavior) is engine-owned
  and invisible without the type.

## 8. `StandardInput` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `b7d1088a feat(fields): fieldset derived validator + Standard Schema`. Unlike
  `StandardSchemaV1` this is cairn's own shape, not a vendored copy: *"The validate input the cairn
  adapter takes: the raw frontmatter and the body"* (`src/lib/content/standard-schema.ts:5`). Zero
  importers.
- **Any-site case:** a site feeding a fieldset through a Standard-Schema-aware pipeline must know
  the validator takes `{ frontmatter, body }` and not a bare frontmatter object. That is a
  genuinely non-obvious engine convention — every other Standard Schema validator in the ecosystem
  takes one value — and getting it wrong fails silently against `(value ?? {}) as Partial<StandardInput>`
  (`fieldset.ts:478`), which swallows a wrong shape into empty defaults rather than throwing.
- **Verdict argument.** *Against:* two fields, trivially written inline. *For, and decisive:* the
  silent-swallow behavior makes the convention worth naming; a named type is how a consumer's
  compiler catches the mistake the runtime will not. Keep, and note it outranks its own
  companion `StandardSchemaV1` precisely because it is cairn's shape rather than someone else's.

## 9. `RoutingRule` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** demoted **twice** in 2026-07-01 — once in the barrel prune, once again in that
  pass's Task 5, recorded in the test as *"`RoutingRule` is the internal normalization target only,
  no longer an accepted `ConceptConfig.routing` value"* (`root-barrel-prune.test.ts:7`) — then
  reinstated by the export rule because `ConceptDescriptor.routing` names it. Zero importers.
- **Any-site case:** `CairnRuntime.concepts: ConceptDescriptor[]` is root-public, and a delivery
  route that partitions concepts by `routing.inFeeds` or `routing.dated` annotates the value it
  reads. That is a real pattern (feed routes exist on every family site), even if each site
  currently destructures rather than annotating.
- **Verdict argument.** The double demotion is the strongest single piece of evidence in this
  bucket that a name is not earned. It survives only because the type it decorates is genuinely
  public and read. Keep, ranked accordingly low.

## 10. `SlotDef` — VERDICT: keep

- **surfacedAt:** `.` (flagged collision: same single declaration at `src/lib/render/registry.ts:17`;
  `/delivery`, `/delivery/data`, `/sveltekit` render the `kind` union in a different order)
- **Provenance:** demoted 2026-07-01 (*"Reachable through the kept ComponentDef.slots but declared
  inline by consumers in defineComponent … No consumer imports it."*), readded by the export rule.
  Zero importers.
- **Any-site case:** a site with a component library large enough to share slot definitions
  between components (a `title`/`body` pair reused across a callout family) names it. The showcase
  and ASC both declare multi-slot components, so the shape is live even though nobody has factored
  it out yet.
- **Verdict argument.** Keep on closure — `ComponentDef` is root-public and `slots` is one of its
  members. Ranked just above `RoutingRule` because the factoring scenario is concrete rather than
  hypothetical.

## 11. `ReferenceEdge` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`
- **Provenance:** `bfde5663 feat(content): fail the build on a dangling reference`. Demoted
  2026-07-01 with a sharp argument — *"consumers read the resolved edge (ResolvedReference on
  /delivery) via resolveReferences, not the raw edge"* — readded by the export rule via
  `ManifestEntry.references`. Zero importers of the raw edge.
- **Any-site case:** a site writing its own manifest-inspection script (the same audience
  `serializeManifest`/`verifyManifest` serve) walks `entry.references` and annotates the row. ASC
  already writes exactly this class of script (`aksailingclub-org/src/theme/announce-stamps.ts`
  imports `Manifest, ManifestEntry`), so the next step onto `references` is a short one.
- **Verdict argument.** The July argument still stands for *delivery* readers, who should use
  `ResolvedReference`. It does not stand for manifest-script readers, who have no resolved form.
  Keep.

## 12. `AiPosture` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`
- **Provenance:** the AI-posture pass, `f68ca468 Let a site state an AI posture, and emit what it
  implies`, from `docs/superpowers/specs/2026-08-05-ai-posture-design.md` with all four decisions
  confirmed by Geoff. Built family consumers exist (`xcathletes-org` and the showcase both set
  `aiPosture`). No external consumer.
- **Any-site case:** the value reaches `buildRobots`, which the engine renders. A site cannot
  patch the emitted `robots.txt` without replacing the route, so this passes the
  cannot-reach-the-surface limb cleanly. The *type*, though, is a two-token literal union a site
  writes inline.
- **Verdict argument.** *For keeping the type:* the barrel states the rule it follows —
  *"`CairnAdapter.aiPosture` names this, so it reaches root the way every other adapter member type
  does"* (`src/lib/index.ts`). *Against:* `'invite' | 'decline'` is the smallest possible
  hand-roll. Keep, on adapter-member parity, ranked low.

## 13. `TidyConventions` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** `07202666 Add the tidy config, prompt builder, and doctor check (Task 10)`;
  root exposure from `a6b72e22 Adopt the export rule`. Zero importers.
- **Any-site case:** the reference distinguishes it from `TidyConfig` in a way that matters —
  *"the corrected convention set the tidy prompt builder consumes, every field resolved to a
  concrete value from a site's partial `TidyConfig.conventions`"* (`core.md:1108`). A site with a
  house style guide expressing it once, then feeding a partial into YAML, wants the resolved shape
  to check against.
- **Verdict argument.** Keep on closure (`TidyConfig.conventions` names it, `SiteConfig.tidy`
  names `TidyConfig`, `parseSiteConfig` returns `SiteConfig`, and every site calls
  `parseSiteConfig`). Marginal; the whole chain is doctrine-driven.

## 14. `TidyConfig` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** same commit; named in the C2 plan's own leak list — *"The 40 confirmed shape-only
  leaks (`UsageEntry`, `InboundLink`, `TidyConfig`, `TidyConventions`, …)"* (C2 plan line 207).
  Zero importers.
- **Any-site case:** a site that reads `siteConfig.tidy?.enabled` to decide whether to show a
  tidy affordance in its own chrome annotates the value. Thin but real, and it sits one hop closer
  to a consumer than `TidyConventions`.
- **Verdict argument.** Keep on closure. Same doctrine caveat.

## 15. `ComposeInput` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** the Plan 02 adapter/runtime composition; kept in 2026-07-01 as one of *"the types
  that name those constructors' signatures"*. Zero named importers — every family site writes
  `composeRuntime({ adapter: cairn, siteConfig })` inline (`*/src/chassis/cairn.server.ts`, five
  repos).
- **Any-site case:** a site with more than one composed runtime — a multi-tenant or preview build
  passing a different `siteConfig` per environment — factors the input into a builder and annotates
  its return. xcathletes is the family's multi-team platform and is the plausible first case.
- **Verdict argument.** *Against:* five real consumers have gone years without naming it. *For:*
  `composeRuntime` takes a destructured object literal, and a public function's parameter type must
  be nameable under declaration emit or a consumer's own wrapper cannot be typed. Keep.

## 16. `EmailAttachment` — VERDICT: keep

- **surfacedAt:** `.` (flagged collision: identical declaration at `src/lib/auth/types.ts:31`;
  the `/sveltekit` rendering only rotates `"attachment" | "inline"`)
- **Provenance:** the Email Sending surface widening, *"live-verified 2026-07-07"* per
  `core.md:1079`. Zero importers of the attachment type; ecxc-ski imports its sibling
  `EmailRecipient` (`ecxc-ski/src/theme/email-transport.ts:5`).
- **Any-site case:** a site supplying a custom `SendMagicLink` (ecxc-ski does exactly this) that
  forwards or inspects attachments annotates them. Today cairn's own magic-link message never
  carries one, so the case is a site's *own* mail riding the same transport.
- **Verdict argument.** *Against:* nothing in cairn emits an attachment, so this is surface for a
  capability the engine does not use. *For, and decisive:* `MagicLinkMessage.attachments` is
  root-public and a custom sender receives the whole message; leaving one member unnameable is the
  precise leak the export rule closed. Keep.

## 17. `NavLayoutSection` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** `e3bbf0ef feat(admin-nav): navLayout types and construction validation`
  (2026-07-14), the lean-extensibility redesign that shipped in `0.77.0`. Built family consumers:
  ASC and xcathletes both declare `navLayout`. No external consumer.
- **Any-site case:** the admin sidebar is engine-rendered chrome a site cannot patch — the
  cannot-reach limb, cleanly. A site grouping its own admin screens under a heading declares a
  section; annotating it matters once the sections are built by a helper rather than a literal
  (ASC's `admin-attention.ts` is already that shape).
- **Verdict argument.** Keep. Ranked lowest of the four navLayout types because a section is the
  arm most often written as a plain literal inline.

## 18. `NavLayoutEngineRef` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data` (flagged collision: single declaration at
  `src/lib/sveltekit/admin-nav.ts:116`; the `/sveltekit` copy rotates the icon literal union)
- **Provenance:** same commit, whose body enumerates the validation this type gates: *"throws
  defineRoles-style at construction on every case the plan specifies: unknown screen id, duplicate
  engine reference (hidden counted the same as visible), 'nav' referenced without a configured
  navMenu …"*.
- **Any-site case:** placing or hiding an engine screen (`media`, `settings`, `editors`) inside a
  site's own sidebar order is something no site can do any other way — the screens are engine
  routes and the sidebar is engine markup. A site computing its layout conditionally (role-gated
  ordering) annotates the node.
- **Verdict argument.** Keep. The membership case is the strongest of the navLayout family; the
  low rank reflects that the *type* is usually written as an inline literal.

## 19. `NavLayoutEntry` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data` (flagged collision: same artifact, single
  declaration at `admin-nav.ts:53`)
- **Provenance:** same commit; the icon allowlist is engine-owned (*"Embedded site entries reuse
  resolveEntry, so the icon allowlist and href-collision checks can never drift"*).
- **Any-site case:** stronger than its siblings for one concrete reason — the `icon` field is a
  **closed 27-value union of engine-shipped glyph names**. A site building its entries in a helper
  cannot infer that list; the type is how the compiler tells it which icons exist. That is a
  divergence the engine owns and a site cannot discover from its own code.
- **Verdict argument.** Keep. The closed icon union is a real, non-restatable constraint.

## 20. `NavLayout` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** same commit; `CairnAdapter.editor.navLayout` takes it. Two built family
  consumers.
- **Any-site case:** the adapter member's own type, and the one name that compresses something
  real — a three-arm union array whose arms a consumer would otherwise have to spell out. A site
  exporting its sidebar from a dedicated module (ASC does) annotates that export with exactly this.
- **Verdict argument.** Keep. Ranked highest of the four, and the contrast with
  `PublishActionsConfig` (rank 4, reshape) is deliberate: a union-array alias earns its name, an
  `X[]` alias does not.

## 21. `roleHome` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `77ae707e feat(auth): site-declared role vocabulary core`, the ASC-driven
  extensible-roles work. Zero family importers (ASC imports its siblings `resolveCapability` and
  `ownerLevelRoles`, not this one).
- **Any-site case:** a site whose custom admin section wants to bounce a wrong-role visitor to
  *their* landing page rather than a flat 403. Re-deriving it means re-reading `RoleDeclaration`'s
  union by hand — `Capability | { capability: Capability; home?: string }` — and the bare-capability
  arm is exactly where a hand-roll crashes on `.home` of a string.
- **Verdict argument.** *Against:* zero importers after a year, and the engine's own guard already
  performs the landing redirect, so the surface a site cannot reach is already served. *For, and
  decisive:* the union's two arms are a real correctness trap in a five-line hand-roll. Keep,
  ranked low.

## 22. `BackendCommit` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `65198b69 Add Backend.listCommits and the typed branch-collision error`, later
  consolidated by `fcbed73a Simplify the pass's diff: one BackendCommit home`. Zero importers.
- **Any-site case:** a site implementing an alternative `BackendProvider` — the seam cairn
  advertises for *"GitLab, Gitea, or plain git"* (`core.md:96`) — must type `listCommits`'s return.
  The reference row carries a trap worth naming: *"the git commit-author trailer (`author`, never
  the matched GitHub account, which is null for a magic-link editor)"*.
- **Verdict argument.** Keep. The alternative-store seam is a documented promise and its element
  types travel with it; whether that seam itself is earned is a `Backend` question (rank 84), not
  this row's.

## 23. `hasAccessRule` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `3db5f792 feat(auth): access map core (defineAccess, canReach)` then
  `2d766263 feat(auth): requireAccess and the access-denial event`; the ASC roles/access harvest.
  Zero importers (ASC imports `canReach`, not this).
- **Any-site case:** it encodes a distinction a site genuinely cannot re-derive: *"a route that
  opts into the map refuses every session with a 403, owner included, when the map has no opinion
  on its path at all, distinct from `canReach`'s own any-editor reading used for nav visibility"*
  (`core.md:1015`). A site writing its own guard that wants `requireAccess`'s fail-closed posture,
  rather than `canReach`'s fail-open-for-nav posture, needs the second predicate.
- **Verdict argument.** *Against:* a site could compute "is this target mapped" with an object
  lookup. *For, and decisive:* it cannot — the href form is a **deepest path-segment-prefix**
  match with a documented non-match rule (`/admin/moneyx` never matches `/admin/money`), which a
  naive lookup gets wrong in the direction that grants access. Keep.

### Shared frame for ranks 24–38 (the fifteen `FieldDescriptor` arms)

Each arm is argued individually below. They share a provenance and a verdict logic, stated once here
and not repeated fifteen times.

- **surfacedAt (all fifteen):** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Shared provenance:** `4df384bc feat(content)!: cut over to the Contract v2 fieldset field
  system`. All fifteen were **demoted** 2026-07-01, each with its own argued defense of the form
  *"Arm of the kept FieldDescriptor union; consumers use fields.text and structural narrowing on
  `kind`, neither of which needs the arm exported. … No consumer imports it."* All fifteen were
  **readded** by the C2 export rule, listed verbatim in `root-barrel-prune.test.ts`'s `C2_READDED`
  with the reason *"Each is genuinely named in a root-public signature … so the new doctrine …
  outranks the July minimalism call for exactly this set."* Zero importers, family or external, of
  any arm. Family-originated in the sense that the Contract v2 field system was shaped by the family
  sites' own schemas; the *export* of each arm was shaped by doctrine alone.
- **Shared verdict logic.** *Against, forcefully:* the July pass argued each one down on evidence,
  adversarially, and the reversal that restored them cites no consumer — only a rule. By this
  audit's standard (no accept-by-default; recurrence is never sufficient, and doctrine is weaker
  than recurrence), fifteen names with zero importers is the weakest block in the bucket. *For, and
  decisive:* they are now a mechanically closed, gated set whose union `FieldDescriptor` every
  consumer does name. Retiring some or all reopens the leak the gate forbids and leaves a surface
  where a consumer can name a union but not its arms. Migration cost carries no weight here;
  coherence does. All fifteen keep, ranked by how concrete each arm's own annotation scenario is.

## 24. `IconField` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`; provenance and verdict logic per
  the shared frame above.
- **Any-site case:** the weakest arm. It declares no constraint of its own — *"none; the stored
  value is the picked glyph's name"* (`core.md:404`) — so an annotation buys nothing beyond the
  `type` tag. Its only distinguishing behavior lives outside the descriptor, in whether the adapter
  supplied an icon set at all.
- **Verdict:** keep on closure alone. If the export rule were ever relaxed, this is the first arm
  to go.

## 25. `BooleanField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** *"none; an absent or non-`true` value normalizes to unset"* (`core.md:403`).
  The one thing worth naming is that normalization rule, which a site reading raw frontmatter must
  not assume is a stored `false`.
- **Verdict:** keep on closure; the normalization asymmetry is the thinnest of real reasons.

## 26. `DatetimeField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** it carries a live gap a site must know about: *"accepted as a plain string
  today; the descriptor's `min`/`max` are not yet enforced by the validator"* (`core.md:402`). A
  site that declares bounds and assumes enforcement ships an unvalidated field.
- **Verdict:** keep. The declared-but-unenforced `min`/`max` is a real trap the named type at least
  makes visible.

## 27. `EmailField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** a shared field helper across a family of sites (`contactEmail()`), typed at the
  module boundary. Nothing arm-specific beyond the format check the validator applies.
- **Verdict:** keep on closure.

## 28. `UrlField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** same shared-helper scenario as `EmailField`. Marginally stronger only because a
  URL field is the one most often wrapped with site conventions (a required protocol, an allowed
  host list enforced through `refine`), which pushes the declaration into a helper module.
- **Verdict:** keep on closure.

## 29. `NumberField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** it carries three constraints (`min`, `max`, `integer`) that a site's shared
  helper would take as parameters and pass through. `integer: true` rejecting a fraction is engine
  behavior a site cannot restate cheaply in its own type.
- **Verdict:** keep.

## 30. `TextareaField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** it carries `rows` plus the same length and pattern constraints as `TextField`,
  so a site factoring a "description" field convention (a common cross-concept pattern — three
  family sites declare one) annotates the helper's parameter.
- **Verdict:** keep.

## 31. `DateField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** stronger than its neighbors for a structural reason: a dated concept's
  permalink *requires* a `date` field of this type, and `defineConcept` *"normalize[s] the declared
  field to `required: true`, since the permalink can't resolve without it"* (`core.md:118`). A site
  generating dated concepts from a table names this arm in the generator.
- **Verdict:** keep.

## 32. `MultiselectField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** the arm with the most engine-owned behavior packed into its flags. `taxonomy:
  true` is what binds the field to the site's tag vocabulary and to the manifest's `tags`;
  `creatable` changes the rendered control from checkboxes to a tag input; the two interact with
  vocabulary enforcement in a documented, non-obvious way (*"a save of a value that is neither in
  the vocabulary nor already on the entry is rejected"*). A site building its taxonomy field in a
  shared helper names it.
- **Verdict:** keep.

## 33. `SelectField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** its `options: readonly string[]` is the arm whose literal capture drives type
  inference — *"a `select` or `multiselect` preserves its literal option list so the inferred type
  narrows to that union"* (`core.md:418`). A site writing a helper that maps a select's options
  onto a filter UI must name the arm to keep the literal through the boundary.
- **Verdict:** keep. The clearest inference-preservation case among the leaves.

## 34. `ObjectField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** a container arm carrying a hard rule a site will otherwise discover by a thrown
  error: *"Holds only leaves, no nested container"* (`core.md:1095`), enforced at the `fieldset()`
  call. A site generating grouped fields from a schema table names it and gets the constraint
  checked at authoring time.
- **Verdict:** keep.

## 35. `ArrayField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** the most structurally complex arm — its `item` is itself a `FieldDescriptor`,
  and the one-level nesting rule (*"an `array` holds a leaf or a flat `object`, never another
  `array`"*) is enforced at declaration. The gallery port's harvest is the measured case: a
  photo-row shape built as `fields.array(fields.object({...}))` with four sibling leaves per photo.
  A site with several such rows factors the row builder and annotates it.
- **Verdict:** keep.

## 36. `ReferenceField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** it is the only arm carrying a cross-concept coupling — its `concept` names
  another concept whose entries the picker lists and whose deletion the engine's guard refuses. A
  site generating a reference field per relationship (the gallery port's self-`reference` `parent`
  is the family's worked example) names the arm in the generator, and the `concept` string is what
  the build-time `verifyReferences` gate checks.
- **Verdict:** keep.

## 37. `ImageField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** it carries the `seo` marker that designates the social-card image, a
  site-wide singleton concern rather than a per-field one, plus the one validation the type raises
  (*"a `required` image with no picked source"*). Its stored value is `ImageValue` (rank 73), which
  a family site already imports — so this arm sits one hop from measured demand.
- **Verdict:** keep. Highest-ranked container-adjacent arm.

## 38. `TextField` — VERDICT: keep

- **surfacedAt:** as above; shared frame applies.
- **Any-site case:** the arm most likely to be annotated first, because a `title` field appears in
  every concept on every site and is therefore the first thing a multi-site developer factors out.
  It also carries the constraint with the sharpest failure mode: *"A malformed `pattern` throws at
  the `fieldset()` call, not on a later save"* (`core.md:502`), so a helper that builds patterned
  text fields wants the arm typed at its boundary.
- **Verdict:** keep. Strongest of the fifteen, and the one the July pass listed first when arguing
  the block down — the disagreement is worth recording rather than smoothing over.

## 39. `NamedField` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** Plan 02 content model; kept through 2026-07-01 unargued (`KEEP NamedField`).
  Zero importers.
- **Any-site case:** *"A field descriptor with its frontmatter key re-attached as `name`, the
  normalized shape `ConceptDescriptor.fields` carries"* (`core.md:1049`). A site rendering its own
  editor-adjacent UI — a field checklist, a content-completeness report over `runtime.concepts` —
  iterates exactly this array. That is the normalized view a site genuinely cannot rebuild, because
  the key-to-`name` re-attachment happens inside `normalizeConcepts`, which is demoted.
- **Verdict argument.** Keep. Ranked above the arms because the shape it names is engine-produced
  rather than site-authored: a site *receives* `NamedField[]` and has no other way to describe it.

## 40. `PublishActionEntry` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** `2ae22833 feat(sveltekit): add the publish-actions seam` (2026-07-07). One built
  family consumer (ASC). No external consumer.
- **Any-site case:** the publish-success moment is engine-rendered markup inside the engine's edit
  page. A site that wants "now update the newsletter" beside a fresh publish has no other seam —
  it cannot patch that screen. The type's `href` template semantics (`{concept}`/`{id}`
  substitution) are engine-owned and non-obvious.
- **Verdict argument.** Keep; the membership case is clean on the cannot-reach limb. The rank
  reflects that one family site uses it and no anonymous demand has been demonstrated — but the
  shape is right and the hand-roll is impossible, which is what the standard asks.

## 41. `VariantSpec` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/media`, `/sveltekit`
- **Provenance:** the media substrate work; `AssetConfig.variants` names it. Family media
  consumers exist (907-life, ecxc-ski, ASC all use `media:` references).
- **Any-site case:** *"named Cloudflare Images presets, merged over the built-in `thumb`, `inline`,
  `card`, and `hero` presets"* (`core.md:290`). The `fit` and `upscale` unions are Cloudflare's
  vocabulary as cairn accepts it; a site defining variants in a shared module annotates them, and
  the union is what stops a typo becoming a dead `/cdn-cgi/image` URL at request time.
- **Verdict argument.** Keep. Real constraint, real failure mode, engine-owned URL construction.

## 42. `IslandRegistry` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/islands`
- **Provenance:** the islands seam; `CairnAdapter.rendering.islands` names it. Built family
  consumers: ASC, xcathletes, cairn-pub, and the showcase all declare `islands:`.
- **Any-site case:** `Record<string, Component>` looks trivial, but the engine enforces a pairing a
  site cannot enforce itself: *"`defineAdapter` fails closed at declaration on either mismatch,
  naming the offending directive"* (`core.md:651`). A site exporting its island map from a
  components module annotates it; the alias is how the Svelte `Component` generic reaches that
  annotation without the site importing Svelte's type surface by hand.
- **Verdict argument.** Keep, with four family consumers and a fail-closed engine contract behind
  it. Ranked here because the *alias itself* is thin — the seam is what earns the place.

## 43. `FieldsetOptions` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 02 / Contract v2; kept in 2026-07-01 unargued. Zero importers.
- **Any-site case:** the second parameter of `fieldset`, carrying the cross-field `refine` hook.
  The reference states a constraint a site must design around: *"`FieldsetOptions.refine` is
  deliberately synchronous … because it runs inline in the save action's own request path, on every
  save"* (`core.md:507`). A site writing a shared refine-builder must type the options object.
- **Verdict argument.** Keep. A public function's options type is the least controversial category
  of export here.

## 44. `ValidationIssue` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** the nested-validation work that added located issues alongside the flat error
  map. Zero importers.
- **Any-site case:** *"an additive `issues` array of `ValidationIssue`, each located by a
  multi-segment path (a row index, a leaf sub-key) so the form routes a nested error to its input"*
  (`core.md:516`). A site building a custom entry form over its own fieldsets — a bulk importer, a
  CSV upload screen — reports errors from this array and must annotate it.
- **Verdict argument.** Keep. The path encoding is engine-defined and a site consuming it needs the
  contract; ranked above `FieldsetOptions` because a site *receives* this rather than authoring it.

## 45. `Renderer` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** the render pipeline; the doc is explicit: *"`createRenderer` exports its return
  type by name as `Renderer`"* (`core.md:550`). Zero importers by name, though every family site
  calls `createRenderer` and destructures.
- **Any-site case:** a site that composes its renderer once and passes it around — a chassis
  module handing the renderer to several route modules, which is exactly the shape
  `*/src/chassis/render.ts` already takes in three family repos — annotates the parameter.
- **Verdict argument.** Keep. A public factory's return type must be nameable; the near-miss
  family usage (three repos hold a renderer in a shared module) makes the scenario concrete rather
  than hypothetical.

## 46. `ResolveOptions` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** export-rule closure over `renderMarkdown`/`renderDocument`'s `opts`; the barrel
  says so — *"`createRenderer`'s returned `renderMarkdown`/`renderDocument` name `ResolveOptions` in
  their own `opts` parameter"* (`src/lib/index.ts`). Zero importers.
- **Any-site case:** a site threading its resolvers through a wrapper (`function renderEntry(md,
  opts: ResolveOptions)`) names it. Every family site builds such a wrapper in
  `theme/render.ts`; none has yet needed the annotation because the calls are direct.
- **Verdict argument.** Keep on closure. Honest rank: the case is one refactor away from real, not
  yet real.

## 47. `FragmentResolve` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** the `::include` fragment work; the barrel records the precedent it followed —
  *"the same public-surface pattern as `LinkResolve`"* (`src/lib/index.ts`). Zero importers.
- **Any-site case:** a site with a custom `SiteRender` (the adapter's required `rendering.render`)
  receives `resolveFragment` in its input object and must type it if it forwards or wraps it. The
  reference names the failure semantics a site must respect: *"`undefined` is a preview miss; a
  resolver that throws is the build backstop"* (`core.md:1057`) — a convention with no other home.
- **Verdict argument.** Keep. The two-mode failure contract is genuinely engine-owned.

## 48. `MediaRef` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/media`, `/sveltekit`
- **Provenance:** the media substrate; `MediaResolve`'s parameter. Family media consumers exist
  (907-life, ecxc-ski, ASC content carries `media:` references).
- **Any-site case:** `{ slug: string | null; hash: string }` encodes cairn's identity rule —
  *"The hash is the content identity and the slug is cosmetic, so a rename never breaks a
  reference"* (`core.md:300`). A site writing a custom media resolver (a CDN in front of R2)
  receives this and must not key on `slug`. The type is how that rule reaches the compiler.
- **Verdict argument.** Keep.

## 49. `MediaResolve` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/media`, `/sveltekit`
- **Provenance:** same; named by `SiteRender`, `CairnRuntime.render`, and `ResolveOptions`.
- **Any-site case:** a site's `rendering.render` receives `resolveMedia` and typically forwards it
  to `renderMarkdown`. A site that instead *supplies* one — serving media from its own domain or
  from a signed URL — writes a function of this exact type, and the same `undefined`-is-a-miss /
  throw-is-the-backstop convention applies.
- **Verdict argument.** Keep, one rank above `MediaRef` because it is the function a site actually
  authors rather than merely receives.

## 50. `ComponentContext` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/render`, `/sveltekit`
- **Provenance:** Plan 04 render engine; kept implicitly through both audits. Zero named importers
  — family components write `build: (ctx) => …` and let inference do the work.
- **Any-site case:** a site with more than a handful of components factors shared build helpers
  (`function shell(ctx: ComponentContext)`), and ASC's component set (facts, membership-pricing,
  card, availability, related, steps, table, page-cta — eight named in its tests) is already past
  that size. The type is how `ctx.slot(name)` / `ctx.items(name)` become checkable at that boundary.
- **Verdict argument.** Keep. The engine owns the hast contract entirely; a site cannot restate it.

## 51. `Capability` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** `8477c382 feat(auth): capability resolution, requireEditor, none contract`, the
  extensible-roles work driven by ASC. Zero named importers.
- **Any-site case:** `resolveCapability` returns it, and ASC calls `resolveCapability` in its own
  test helper (`aksailingclub-org/src/tests/_editor.ts`). The reference draws the line this type
  exists to hold: *"A role *name* types as `string` everywhere the engine reads one … only the
  three-way capability … is a closed union, since that vocabulary is genuinely fixed while a
  site's own role names are not"* (`core.md:908`). That asymmetry is the whole design and cannot be
  inferred from a site's own code.
- **Verdict argument.** Keep.

## 52. `RoleDeclaration` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** same commit family; `RolesDeclaration`'s value type. Zero named importers (ASC
  and xcathletes import `RolesDeclaration`).
- **Any-site case:** the union `Capability | { capability: Capability; home?: string }` is exactly
  the trap named at rank 21. A site building its vocabulary programmatically — mapping a
  permissions table onto roles — annotates each value and gets the two-arm shape checked.
- **Verdict argument.** Keep.

## 53. `ownerLevelRoles` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `77ae707e feat(auth): site-declared role vocabulary core`, extended by
  `5b0a1aad feat(doctor): vocabulary and email-normalization checks`. **Two built family
  consumers**: `xcathletes-org/src/lib/server/roster/roster-admin.ts:12` and
  `aksailingclub-org/src/tests/roles-vocabulary.test.ts:2`.
- **Any-site case:** any site that provisions or removes admins from its own screen must know
  which of *its* role names carry owner capability, because the engine's last-owner guard counts
  across that set rather than the literal string `'owner'` (`core.md:944`). Getting it wrong locks
  a site out of its own roster. That is precisely the "cannot reach the surface" limb: the guard is
  engine-enforced and the set is derived from a site declaration the engine normalizes.
- **Verdict argument.** Keep, and it earns it. Ranked here rather than higher only because the
  scenario is confined to sites that build their own roster UI.

## 54. `SiteConfigError` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 06 nav/site-config; kept 2026-07-01 unargued. Zero importers.
- **Any-site case:** `parseSiteConfig` runs at module load in every family site's
  `theme/site-config.ts`. A site that wants a readable startup failure — or a build script that
  validates several config files and reports them together — catches by `instanceof`, which works
  only because the class ships from the package: *"they are defined in the package, so `instanceof`
  is reliable across the peer boundary"* (`core.md:852`). Its `conditionId`
  (`config.site-config-invalid`) ties the throw to the doctor's diagnostic registry.
- **Verdict argument.** Keep. Error classes across a peer boundary are the clearest
  cannot-hand-roll case in the bucket.

## 55. `BranchExistsError` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `65198b69 Add Backend.listCommits and the typed branch-collision error`. Zero
  importers.
- **Any-site case:** two-sided. A site implementing a custom `Backend` must *throw* it —
  *"Both the GitHub App backend and the packaged dev backend throw it identically from
  `Backend.createBranch`, so a caller … catches the collision as a typed refusal instead of a raw
  500"* (`core.md:873`). A site with a custom revert or draft-branch route must *catch* it.
- **Verdict argument.** Keep. Same peer-boundary logic as `SiteConfigError`, ranked just above it
  because the type is load-bearing in both directions.

## 56. `CommitConflictError` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 03 GitHub backend. Survived the 2026-07-01 prosecution on an argued refutation:
  *"It is thrown by Backend.commit's fail-closed path (expectedHead) … A developer implementing or
  calling the public Backend seam (documented as GitLab/Gitea/plain-git extensible) catches it by
  instanceof. Deliberate seam contract, keep."* Zero importers.
- **Any-site case:** a lost-SHA race is the one save failure a site's own commit path must
  distinguish from a real error, because the correct response is "reload and retry", not "report a
  bug". The engine's own log vocabulary mirrors the distinction (a `conflict` reason vs. an `error`
  field). A site cannot detect it by message text without coupling to prose.
- **Verdict argument.** Keep. Strongest of the three error classes: the failure it names is
  concurrent and user-visible.

## 57. `DocHeading` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `672d7331 Add renderDocument heading collection to the render pipeline`. **One
  built family consumer, imported twice**: `cairn-pub/src/lib/docs/loader.ts:13` and
  `cairn-pub/src/lib/docs/types.ts:3`.
- **Any-site case:** any site rendering long-form content with a table of contents. The reference
  states why the engine must produce it rather than the site: headings are collected *"after
  `rehypeSlug` stamps ids and after any `RendererOptions.rehypePlugins` a site supplied have run,
  so a site rewrite of a heading's id is the id collected"* (`core.md:563`). A site regexing the
  returned HTML for headings gets ids that can disagree with the anchors actually rendered.
- **Verdict argument.** Keep. Real consumer, real ordering constraint, and the hand-roll is
  subtly wrong rather than merely tedious.

## 58. `ManifestEntry` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`
- **Provenance:** the content-graph design. **Demoted** 2026-07-01 (*"Element type of
  Manifest.entries, reachable structurally through the kept Manifest; no consumer names it"*),
  **readded** by the export rule — and the reversal turned out to be right on the facts: ASC now
  imports it by name (`aksailingclub-org/src/theme/announce-stamps.ts:16`).
- **Any-site case:** a site that diffs or inspects the committed manifest — the announce-on-publish
  pattern the xcathletes brief specified and ASC built — annotates the rows it walks. `publishedAt`
  lives only here: *"no content file carries it: a publish sets it once, at the commit that first
  lands the entry non-draft"* (`core.md:815`). A site cannot derive that from its corpus.
- **Verdict argument.** Keep, and note this is the one C2 readd with a measured consumer behind it.

## 59. `Manifest` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`
- **Provenance:** content-graph design; kept 2026-07-01 on an argued refutation — *"It is the
  parameter type of the kept, vite-consumed verifyManifest/verifyReferences/serializeManifest …
  so a developer can annotate `const m: Manifest = buildSiteManifest(...)` for a custom
  regenerate/inspect script."* Imported by ASC alongside `ManifestEntry`.
- **Any-site case:** exactly the annotation the July defense predicted, now built. A custom
  regenerate or inspect script is a documented cairn workflow (`cairn-manifest` CLI has a
  reference page), and the manifest is a committed file with a version guard the site must not
  reshape.
- **Verdict argument.** Keep.

## 60. `serializeManifest` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** kept 2026-07-01 on a hard fact, not a judgment: *"The /vite cairnManifest
  plugin's generated virtual module … imports serializeManifest from the root specifier
  '@glw907/cairn-cms' and evaluates it inside the CONSUMER's Vite build."* Verified still true:
  `src/lib/vite/internal.ts:73` emits `import { serializeManifest, verifyManifest,
  verifyReferences } from '@glw907/cairn-cms';`.
- **Any-site case:** the strongest form of cannot-reach in this bucket: **any** site using the
  `cairnManifest` plugin resolves this from the root barrel at build time. Demoting it breaks the
  build of every consumer that has never heard of the function.
- **Verdict argument.** Keep, unconditionally. The `.` placement is load-bearing, not a
  convenience.

## 61. `verifyReferences` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `bfde5663 feat(content): fail the build on a dangling reference, wired into the
  manifest build`; kept 2026-07-01 on the same vite-plugin fact, with an added reason —
  *"references have no prerender backstop, so this is their only build-time integrity gate"*.
  `src/lib/vite/internal.ts:70` emits it inside the verify-mode expression.
- **Any-site case:** identical structural necessity as rank 60, plus a correctness argument: a
  reference edge that points at a deleted entry has no other detector. A site using `fields.reference`
  and not running this ships broken links.
- **Verdict argument.** Keep.

## 62. `verifyManifest` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** kept 2026-07-01 on two grounds, one of them a direct measurement —
  *"907-life imports it directly in content.ts (grep ground truth)"* — alongside the vite-plugin
  necessity.
- **Any-site case:** the drift detector between the committed manifest and the corpus. *"a raw-git
  edit fails the build loudly"* (`core.md:835`). A site whose authors sometimes edit markdown
  outside the admin — which is every site with a developer — needs it, and it is the one of the
  three with a demonstrated direct import as well as the plugin path.
- **Verdict argument.** Keep. Strongest of the manifest trio.

## 63. `ConceptDescriptor` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** Plan 02; kept 2026-07-01 despite that audit's own NOTE flagging it as a tell —
  *"the doc itself labels … ConceptDescriptor 'engine-internal' yet exports it anyway, which at
  beta freeze converts each into a permanent support promise."* Zero named importers.
- **Any-site case:** `CairnRuntime.concepts: ConceptDescriptor[]` is how a site enumerates its own
  content model at runtime — building an admin dashboard, a sitemap partition, or a "what can I
  create" affordance. The descriptor carries the *resolved* values (`singular` defaulted from
  `label`, `permalink` and `datePrefix` defaulted, `routing` normalized) that the site's own
  `ConceptConfig` deliberately leaves unset.
- **Verdict argument.** *Against:* the "engine-internal" label is still in the reference
  (`core.md:1036`) and a type documented as internal should not be public. *For, and decisive:*
  the label is the defect, not the export — the type is reachable from `CairnRuntime`, which every
  site composes and reads. Keep; the honest follow-up is a documentation correction, not a
  retirement.

## 64. `NavMenuConfig` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** Plan 06 nav editor; kept 2026-07-01 on an explicit parity argument — *"keeping
  PreviewConfig while cutting NavMenuConfig is inconsistent; keep both or neither, and PreviewConfig
  stays."* Zero named importers.
- **Any-site case:** declaring `editor.nav` is what turns `/admin/nav` from a 404 into a working
  screen — an engine route a site cannot otherwise reach. `configPath` and `menuName` bind the
  editor to a YAML file the site also reads with `extractMenu`, and typing the pair is how the two
  halves stay in agreement.
- **Verdict argument.** Keep. Adapter-member type over an engine-owned screen; a clean pass.

## 65. `PreviewConfig` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** kept 2026-07-01 unargued; substantially extended by the 2026-08-06 preview pass
  (`byConcept`). Built family consumer: 907-life declares `byConcept`.
- **Any-site case:** the edit page's preview frame is engine chrome with deliberate CSS isolation:
  *"Chrome isolation means the admin deliberately never loads the site's CSS, so a design-accurate
  preview needs the site to name its compiled stylesheets here; without the knob the preview
  renders unstyled markup"* (`core.md:165`). There is no other route to a styled preview, and the
  `?url`-only rule attached to it is a real, documented trap.
- **Verdict argument.** Keep. Textbook cannot-reach-the-surface.

## 66. `AssetConfig` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/media`, `/sveltekit`
- **Provenance:** the media substrate; kept 2026-07-01 unargued. Media is live on three family
  sites.
- **Any-site case:** declaring `media` is the switch that turns R2-backed media on at all, and the
  members encode zone-level facts a site must state because a Worker cannot detect them:
  *"`transformations` (default `false`) declares whether Cloudflare Image Transformations are
  enabled for the zone. This is a per-zone setting that the dashboard or API turns on, not
  something a Worker can flip"* (`core.md:293`). Getting it wrong produces dead `/cdn-cgi/image`
  URLs.
- **Verdict argument.** Keep.

## 67. `SenderConfig` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** kept 2026-07-01 on a **corrected fact** — the prosecution had called it a dead
  type and the defense refuted it: *"REFUTED on fact. The prosecution's premise ('referenced
  nowhere except its re-export; wired to no adapter member') is false: content/types.ts types
  CairnAdapter.email: SenderConfig (a required adapter member every consumer configures)."*
- **Any-site case:** every cairn site sets `email: { from }`; it is one of the four **required**
  adapter members. A site building its adapter in pieces (a shared base config across a family of
  sites, or a test fixture) annotates it.
- **Verdict argument.** Keep. Required adapter member; the near-miss deletion is a useful reminder
  that this audit's own prosecution can be wrong on facts.

## 68. `VocabularyEntry` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** `13e6895d Add the vocabulary site-config key, validation, and setVocabulary`.
  `extractVocabulary` returns it and is imported by **five** family repos.
- **Any-site case:** the pre-beta harvest records the exact failure that happens without it:
  *"Both the AstroPaper port … and the gallery port … independently reimplemented a one-word
  capitalize transform instead, since neither mounts the tag-vocabulary admin and neither noticed
  the read-only seam did not require it."* The `{ value, label }` split — *"a frozen slug `value`
  (the stored frontmatter token and filter key) and an editable display `label`"* (`core.md:1068`)
  — is the distinction those hand-rolls collapsed.
- **Verdict argument.** Keep. Measured, twice-repeated hand-roll that the type prevents.

## 69. `NavNode` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** Plan 06. **Imported by name in four family repos** (showcase, xcathletes, ASC
  `SiteHeader.svelte`, and xcathletes' `app.d.ts`).
- **Any-site case:** `extractMenu` returns `NavNode[]` and a site's header component takes it as a
  prop. Typing a Svelte prop *requires* the name — inference does not cross a component boundary.
  That is a hard structural need, not a convenience.
- **Verdict argument.** Keep. Among the best-evidenced items in the bucket.

## 70. `SiteConfig` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`
- **Provenance:** Plan 06; kept 2026-07-01 unargued. Every family site calls `parseSiteConfig` and
  passes the result into `composeRuntime`; xcathletes and the showcase export it from a dedicated
  `theme/site-config.ts` module.
- **Any-site case:** the return of `parseSiteConfig` and the input of `extractMenu`,
  `extractVocabulary`, and `composeRuntime`. A site exporting the parsed config from one module
  and consuming it in four others (the shape all six family repos take) must annotate the export.
- **Verdict argument.** Keep. Its own boundary rule is engine-owned and enforced — *"every
  top-level key must be one the engine reads from the YAML … A key that belongs on the adapter
  instead … throws a message naming `cairn.config.ts` as its correct home"* (`core.md:750`).

## 71. `glyph` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 04 render engine; kept 2026-07-01 unargued. **Three built family
  consumers** (`ecxc-ski`, `xcathletes-org`, `cairn-pub`, each in `src/chassis/render.ts`), plus
  ecxc's component module.
- **Any-site case:** it is the bridge between a site's own `IconSet` and the hast tree a
  component's `build` must return, and it is the only public part of that toolkit that lives on the
  root — *"The rest of the hast-building toolkit … lives on the `/render` subpath, not here"*
  (`core.md:698`). A site could hand-roll `h('svg', …)`, but then its `fields.icon` picker values
  and its rendered glyphs are two vocabularies that can drift.
- **Verdict argument.** *Against:* the split placement (one helper on `.`, five on `/render`) is
  itself an evenness wart. *For, and decisive:* three sites import it from `.` today and the
  icon-name-to-SVG binding is engine-owned. Keep; the placement asymmetry is worth watching but is
  not this item's defect.

## 72. `IconSet` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** Plan 04; kept 2026-07-01 unargued. **Four built family consumers by name**
  (showcase, xcathletes, cairn-pub, ecxc-ski chassis).
- **Any-site case:** a site exports its icon map from a components module and hands it to `glyph`
  and to the adapter's `rendering.icons`. The type is what makes the `fields.icon` picker's stored
  value — *"the picked glyph's name"* (`core.md:404`) — line up with the map's keys.
- **Verdict argument.** Keep. Four measured importers.

## 73. `ImageValue` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `6f563215 feat(content): Add the image field-type data contract (media 3b task
  1)`; kept 2026-07-01 unargued. **Built family consumer, imported twice**:
  `aksailingclub-org/src/theme/post-cards.ts:9` and its test.
- **Any-site case:** the stored shape of an `image` field, which a delivery route reads out of
  frontmatter to build a card or an OG tag. The engine writes it; the site reads it; the site
  cannot define it. The pre-beta harvest even records a live extension request against it (*"the
  engine's leaf image type (`ImageValue`) carries only `src`/`alt`/`caption`, no intrinsic width or
  height"*), which is evidence the shape is load-bearing enough to argue about.
- **Verdict argument.** Keep.

## 74. `ValidationResult` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** Plan 02; kept 2026-07-01 unargued. Zero named importers.
- **Any-site case:** the return of `Fieldset.validate` and `ConceptDescriptor.validate`. A site
  validating content outside the admin — a bulk importer, a migration script, a pre-commit hook
  over its corpus — branches on `ok` and must annotate the discriminated union. That is a real,
  named workflow (cairn ships a `cairn-manifest` CLI for the sibling case).
- **Verdict argument.** Keep. A discriminated union whose narrowing a consumer relies on is the
  category of type that most needs a public name.

## 75. `InferFieldset` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`
- **Provenance:** `10ff5cf4 feat(fields): inferred frontmatter type from a fieldset`; kept
  2026-07-01 unargued. Zero named importers in the family — the strongest under-adopted item here.
- **Any-site case:** the whole point of `defineConcept`'s const-generic capture. A site writing
  a typed delivery route — *"a descriptor declared `required: true` is a required key"*
  (`core.md:525`) — gets its frontmatter type from `InferFieldset<typeof postFields>` instead of
  hand-maintaining a parallel interface that silently drifts from the schema. That drift is the
  single most common failure in schema-driven CMS code, and it is exactly what the engine can
  prevent and a site cannot.
- **Verdict argument.** *Against:* six family artifacts and not one import; by the audit's own
  standard, unproven. *For, and decisive:* the value is highest precisely where nobody has looked,
  and its absence is invisible (a site that hand-writes the interface never notices what it lost).
  Keep — and flag that zero adoption after this long is a discoverability signal worth a docs
  answer, not an export change.

## 76. `CairnRef` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** the content-graph design; kept 2026-07-01 unargued. Zero named importers.
- **Any-site case:** `LinkResolve`'s parameter. Any site supplying its own link resolver — which
  is required for `cairn:` links to become permalinks at all outside the default path — writes
  `(ref: CairnRef) => string | undefined`. The `{ concept, id }` pair is the engine's permanent-id
  model, and a site keying on a slug instead breaks on rename.
- **Verdict argument.** Keep.

## 77. `LinkResolve` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** same; named by `SiteRender`, `CairnRuntime.render`, `ResolveOptions`, and
  `createRenderer`'s options. Every family site's `rendering.render` forwards a `resolve`.
- **Any-site case:** the function a site's delivery layer supplies so `cairn:` tokens become live
  URLs. The reference states the contract's two failure modes — *"`undefined` is a preview miss; a
  resolver that throws is the build backstop"* (`core.md:1056`) — a distinction with no other home
  and real consequences (a throwing resolver is what fails a build on a dangling link).
- **Verdict argument.** Keep.

## 78. `parseMarkdown` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 02; kept 2026-07-01 unargued, with the write side deliberately demoted
  (*"the write inverse of parseMarkdown; committing is the engine's job"*). **Built family
  consumer**: 907-life imports it in two test modules.
- **Any-site case:** a build script, a content audit, or a migration that reads committed markdown
  must split frontmatter from body **the same way the engine's writer joined them**. A hand-rolled
  split (a `---` regex plus a YAML parse) diverges on the cases that matter: a body containing a
  `---` rule, an empty frontmatter block, CRLF. That divergence corrupts content silently.
- **Verdict argument.** Keep. The asymmetry with the demoted `serializeMarkdown` is exactly right:
  read is the site's, write is the engine's.

## 79. `FileChange` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** Plan 03; kept 2026-07-01 unargued. Zero importers.
- **Any-site case:** `Backend.commit(branch, changes: FileChange[], …)`. Its null convention is the
  non-obvious part — *"write `content`, or delete the path when `content` is null"* (`core.md:1040`)
  — and a custom backend implementer who treats null as an empty file silently stops deletions from
  working.
- **Verdict argument.** Keep. Backend-seam member type with a real semantic trap.

## 80. `RepoFile` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** Plan 03; kept 2026-07-01 on an argued refutation — *"RepoFile is in the public
  Backend interface signature: Backend.readEntries(dir, ref): Promise<RepoFile[]> … A developer
  implementing that seam must name RepoFile to type readEntries."*
- **Any-site case:** exactly as the July defense states. A site backing cairn with GitLab, Gitea,
  or plain git implements `readEntries` and cannot type its return without the name.
- **Verdict argument.** Keep.

## 81. `CommitAuthor` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** Plan 03; kept 2026-07-01 on the same argued refutation — *"CommitAuthor is in the
  public Backend interface signature: Backend.commit(branch, changes, author: CommitAuthor, …)."*
- **Any-site case:** same as `RepoFile`, plus a product-visible reason: the author is the signed-in
  editor while the committer is `cairn-cms[bot]`, and a custom backend that collapses the two
  destroys the attribution model the whole product is built on.
- **Verdict argument.** Keep, one rank above `RepoFile` because the attribution split is a
  product invariant, not just a signature.

## 82. `GithubAppProvider` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** the Contract v2 backend phase; kept 2026-07-01 unargued. Zero named importers —
  but the pre-beta harvest records a port that *needed* what it provides and worked around it:
  *"the port re-exported a literal `REPO` constant next to `githubApp({...})` as a workaround"*,
  a workaround later proven unnecessary because `defineAdapter`'s const-generic capture preserves
  the concrete return type.
- **Any-site case:** a site reading `cairn.backend.owner`/`.repo` to build a "view on GitHub" link
  or a deploy badge. The harvest's own correction is the evidence that the reachability question
  is live and that the type is what makes the answer checkable.
- **Verdict argument.** Keep. `githubApp`'s return type must be nameable; the recorded workaround
  is the demand signal.

## 83. `BackendProvider` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** the Contract v2 backend phase; the barrel calls it *"The Backend seam … the store
  interface and its default GitHub provider"* (`src/lib/index.ts`). Zero named importers.
- **Any-site case:** the adapter's `backend` member type, and the seam the reference explicitly
  advertises: *"a different store such as GitLab, Gitea, or plain git can supply its own provider
  later without the engine changing"* (`core.md:96`). A site on a self-hosted Gitea has no other
  path.
- **Verdict argument.** *Against:* zero non-GitHub providers exist anywhere, in or out of the
  family, so this is a promise nothing exercises — the same defect the July audit named for
  `/sveltekit`'s per-route factories. *For, and decisive:* the seam is genuinely the difference
  between "cairn requires GitHub" and "cairn ships a GitHub default", and that is a charter-level
  property, not a convenience. Keep, and note the unexercised-promise risk honestly.

## 84. `Backend` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** same; kept 2026-07-01 unargued. Also the type of `locals.cairnBackend`, which the
  dev-backend package sets on every local request in six family repos.
- **Any-site case:** two, and the second is measured. A custom store implements it. And **every**
  site running `@glw907/cairn-cms-dev` has it flowing through `locals` — *"the dev-backend handle
  sets it so the engine resolves it ahead of the real `githubApp` provider"*
  (`src/lib/ambient.ts`) — so the type is load-bearing for local development on every site, not
  only for the hypothetical alternative store.
- **Verdict argument.** Keep. Its deliberate narrowness is part of the case: *"It's deliberately not
  a query interface, so content querying stays build-time over the committed manifest"*
  (`core.md:98`).

## 85. `githubApp` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 03 / Contract v2 backend; kept 2026-07-01 unargued. **Imported by name in
  five family repos** (`ecxc-ski`, `aksailingclub-org`, `xcathletes-org`, `cairn-pub`, showcase),
  in every `theme/cairn.config.ts`.
- **Any-site case:** the required `backend` member of every adapter. Its secret-handling contract
  is the part a site must not reinvent: *"The private key stays the Worker secret
  `GITHUB_APP_PRIVATE_KEY_B64`, which the engine reads at request time and never from the adapter
  source"* (`core.md:94`). A hand-rolled provider that reads the key at module scope leaks it into
  the build.
- **Verdict argument.** Keep. Five measured consumers and a security-shaped contract.

## 86. `EmailRecipient` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** the Email Sending widening (live-verified 2026-07-07). **Built family consumer**:
  `ecxc-ski/src/theme/email-transport.ts:5`.
- **Any-site case:** a site supplying a custom `SendMagicLink` (which ecxc-ski does, to route
  through its own transport) must handle `cc`/`bcc` in both forms, `string | { email, name? }`.
  The reference records a platform asymmetry a site would otherwise learn from a 400:
  *"`replyTo` takes a single address only; the platform rejects an array there"* (`core.md:1079`).
- **Verdict argument.** Keep.

## 87. `MagicLinkMessage` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** Plan 01 auth; kept 2026-07-01 unargued. **Built family consumers**:
  `ecxc-ski/src/theme/email-transport.ts` and its test.
- **Any-site case:** the message a custom sender receives fully built. The July demotion of
  `buildMagicLinkMessage` is what makes this type load-bearing: *"A consumer supplying a custom
  SendMagicLink receives an already-built MagicLinkMessage rather than building one"* — so the type
  is the entire contract between engine and site on that seam.
- **Verdict argument.** Keep.

## 88. `SendMagicLink` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** Plan 01; kept 2026-07-01 unargued. **Built family consumer**: ecxc-ski.
- **Any-site case:** the injection point for any site that does not send through Cloudflare Email
  Sending — a Postmark or SES site, which is most of the anonymous world. It carries a security
  rule that exists nowhere else: *"A thrown error's text reaches the structured log (scrubbed and
  truncated), so a custom sender must not embed the message body or the magic link in what it
  throws"* (`src/lib/email.ts:50`).
- **Verdict argument.** Keep. The default (Cloudflare) is opinionated; the seam is what keeps that
  opinion from being a requirement.

## 89. `EmailSender` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** the C2 env consolidation (R5): *"`EmailSender` is named once … `Promise<unknown>`
  structurally accepts `@cloudflare/workers-types`' `Promise<EmailSendResult>`"* (C2 plan line 230).
- **Any-site case:** it is `CairnEnv['EMAIL']`'s type, and the `Promise<unknown>` choice is the
  thing that makes a real Cloudflare binding satisfy it *with no cast* in a site's own
  `app.d.ts`. Without the deliberate widening every site writes a cast; with it, none do. That is a
  measured-divergence fix, not a convenience.
- **Verdict argument.** Keep.

## 90. `AccessMap` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** `3db5f792 feat(auth): access map core`, from the ASC roles/access harvest.
  **Built family consumer**: `aksailingclub-org/src/theme/access.ts:38` imports it by name.
- **Any-site case:** a site declares the map once and imports it twice — *"Pass the same map to
  `createAuthGuard`'s `access` option and to the adapter's `access` member"* (`core.md:986`) — so
  the shared module's export must be annotated. `Record<string, string[]>` is a thin alias, but the
  *keys* are a validated vocabulary (a concept id or an `/admin`-prefixed path), enforced at
  composition.
- **Verdict argument.** Keep. Measured import, two-call-site pattern.

## 91. `RolesDeclaration` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** `77ae707e feat(auth): site-declared role vocabulary core`. **Built family
  consumer**: `aksailingclub-org/src/theme/access.ts:38`.
- **Any-site case:** same declare-once-import-twice shape as `AccessMap`, and it is
  `defineAccess`'s first parameter, so a site's access module must name it to accept the vocabulary
  it validates against.
- **Verdict argument.** Keep.

## 92. `resolveCapability` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `8477c382 feat(auth): capability resolution, requireEditor, none contract`.
  **Built family consumer, imported twice**: `aksailingclub-org/src/tests/_editor.ts:6` and
  `roles-vocabulary.test.ts:2`.
- **Any-site case:** a custom admin route gating itself against a site-declared vocabulary. The
  fail-closed rule is engine policy a hand-roll would get backwards: *"returns `'none'` for a role
  name absent from the vocabulary, so a pruned config or a hand-edited row fails closed rather than
  locking the person out of sign-in"* (`core.md:942`).
- **Verdict argument.** Keep. Measured consumer plus a security-relevant default.

## 93. `canReach` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `3db5f792 feat(auth): access map core (defineAccess, canReach)`; the ASC harvest.
  **Built family consumer, imported twice**: `aksailingclub-org/src/tests/access.test.ts:2` and
  `roles-matrix.test.ts:2`. The ASC brief also names it as already-public in the seam-2 ask:
  *"access-map check via the already-public `canReach`"*.
- **Any-site case:** the single authority every enforcement and visibility point reads, so a
  site's own guard and the engine's sidebar agree. Its owner/`editors` carve-outs and
  deepest-prefix href matching are engine policy no site can safely restate — and the doc says why
  it matters: *"Deny at the route, never merely hide."*
- **Verdict argument.** Keep. One of the clearest earned exports in the bucket.

## 94. `defineAccess` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** same commit; ASC harvest. **Built family consumers**:
  `aksailingclub-org/src/theme/access.ts` and `xcathletes-org/src/theme/cairn.access.ts`.
- **Any-site case:** construction-time validation of a declaration that would otherwise fail at
  runtime, in production, as a wrong grant: it *"throws an actionable `defineAccess:`-prefixed
  error on an empty map, a role name outside the given vocabulary, an empty role list (owner-only
  must be written explicitly as `['owner']`) …"* (`core.md:966`). The explicit-`['owner']` rule is
  the one that prevents an empty list reading as "everyone".
- **Verdict argument.** Keep.

## 95. `defineRoles` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `77ae707e`; the ASC extensible-roles harvest. **Built family consumers**:
  `aksailingclub-org/src/theme/cairn.config.ts` and `xcathletes-org/src/theme/cairn.roles.ts`.
- **Any-site case:** any site whose people are not called "editor" — a club with instructors, a
  team with coaches, a paper with sub-editors. The `owner` reservation is engine-enforced for a
  reason a site cannot enforce for itself: *"`owner` is the one reserved name, since the last-owner
  guard and the bootstrap owner both anchor on it."*
- **Verdict argument.** Keep. Two built consumers, a named third in the briefs, and a
  const-generic capture that gives the site its own literal role names back.

## 96. `Editor` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** Plan 01 auth. **The most-imported type in the family**: seventeen distinct ASC
  modules and tests import it by name, plus `xcathletes-org` indirectly through `locals`.
- **Any-site case:** every custom admin route reads `locals.cairnEditor` and every helper that
  takes the signed-in identity types its parameter. There is no substitute: the object is
  engine-minted at the guard, carries a normalization invariant (*"Email is always trimmed and
  lowercased, an invariant held at every write and lookup path"*, `core.md:1072`), and a site that
  re-declares the shape drifts the moment the engine adds a field.
- **Verdict argument.** Keep, without qualification.

## 97. `CairnEnv` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** the C2 env consolidation (R5), which collapsed `AuthEnv` and `BackendEnv` into
  one all-optional type and proved the change with a tripwire: *"The proof is the tripwire:
  `src/tests/unit/env-genericity.test.ts`'s `BareWranglerSiteEnv` `@ts-expect-error` must fail on
  TS2578 and be removed."* **Built family consumer**: `ecxc-ski/src/tests/email-transport.test.ts`.
- **Any-site case:** every factory that touches platform bindings takes it, and the structural
  acceptance is what lets a site's own wrangler-generated `Env` satisfy cairn with no cast. That
  is a measured grammar divergence the engine fixed on the engine's side rather than making every
  site cast.
- **Verdict argument.** Keep.

## 98. `App.Locals` (`/ambient`) — VERDICT: keep

- **surfacedAt:** `/ambient`
- **Provenance:** engine-internal — the guard and the dev-backend set these keys, and the C2 pass
  (R2 ruling) settled the flat `cairn` prefix. **Built consumers: all six family artifacts**
  (`907-life`, `ecxc-ski`, `aksailingclub-org`, `xcathletes-org`, `cairn-pub`,
  `examples/showcase`), each with `import '@glw907/cairn-cms/ambient';` in `src/app.d.ts`.
- **Any-site case:** the engine writes four keys onto `event.locals` that a site's own routes read.
  Without the module the site hand-writes a `declare global` block that must track four
  engine-owned fields across every version — the exact "ratified grammar has diverged" case, since
  the engine changes the keys (C2 renamed them) and the site's copy would silently go stale. The
  module also earns its shape: *"The subpath exports nothing at runtime (its JS module is empty),
  so the import is safe in a declaration file and free everywhere else"* (`ambient.md:62`).
- **Verdict argument.** Keep. Universal adoption, zero runtime cost, and a documented membership
  rule that keeps the subpath from accreting (*"a type a site consumes directly … belongs on the
  root barrel or /sveltekit instead, even one this augmentation's own members reference"*).

## 99. `extractMenu` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 06; kept 2026-07-01 as one of *"the read helpers a consumer actually calls
  on their own routes"*. **Built family consumers: five** (907-life, ecxc-ski, ASC, xcathletes,
  cairn-pub, each in a header component or a site-config module).
- **Any-site case:** the site's public nav comes from the same committed YAML the engine's nav
  editor writes. Reading it by hand means reimplementing the depth bound and the validation the
  editor enforces on write, so an editor-authored menu and the site's render of it can disagree.
  `extractMenu(config, name, maxDepth)` is the one reader that cannot disagree.
- **Verdict argument.** Keep. Five measured consumers on the read side of an engine-owned write
  path.

## 100. `extractVocabulary` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** `13e6895d` / `110a13db Thread the vocabulary onto CairnRuntime`. **Built family
  consumers: five repos, nine call sites** — the most-imported function in this bucket.
- **Any-site case:** it is the read half of the tag vocabulary the engine's admin writes, and the
  harvest records two independent themes hand-rolling around it because they did not know a
  read-only use needed no admin mount: *"a theme can commit a static `vocabulary:` list in
  `site.config.yaml` purely for display labels."* Enforcement on save is engine-side and opt-in;
  the display half is the site's, through this one function.
- **Verdict argument.** Keep. Highest measured adoption in the bucket.

## 101. `parseSiteConfig` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 06; kept 2026-07-01 unargued. **Built family consumers: four**
  (ecxc-ski, ASC, xcathletes, cairn-pub, showcase via `theme/site-config.ts`).
- **Any-site case:** the typed entry to the YAML half of cairn's two-file config, and the enforcer
  of the boundary between them — a key on the wrong side throws *"a message naming
  `cairn.config.ts` as its correct home"*. A site parsing the YAML itself loses that boundary and
  discovers the split at runtime instead of at startup.
- **Verdict argument.** Keep.

## 102. `ComponentRegistry` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** Plan 04; kept 2026-07-01 unargued. Every family site with components builds one.
- **Any-site case:** *"The single source the render pipeline and the editor palette both read"*
  (`core.md:1060`). A site exports its registry from a components module and passes it into
  `createRenderer` from another — the shape three family chassis modules already have — so the
  export needs the annotation.
- **Verdict argument.** Keep. The one-registry-two-readers invariant is what keeps the editor
  palette and the rendered output from diverging, and it is engine-enforced.

## 103. `ComponentDef` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** Plan 04; kept 2026-07-01 unargued. **Built family consumer**:
  `ecxc-ski/src/theme/markdown/components.ts:24` imports it by name.
- **Any-site case:** a site with a component library declares them in one module and registers
  them in another; typing the array crossing that boundary requires the name. The definition also
  carries constraints only the engine knows — `build` is *"deliberately synchronous: it returns a
  hast `Element`, never a `Promise`, because it runs inline inside the render pipeline's
  synchronous hast transform"* (`core.md:352`).
- **Verdict argument.** Keep.

## 104. `defineRegistry` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 04; kept 2026-07-01 unargued. **Built family consumers: four**
  (907-life, ecxc-ski, ASC, xcathletes, cairn-pub, showcase).
- **Any-site case:** the constructor that turns a list of definitions into the one object both the
  render pipeline and the editor palette read. Hand-building the registry's `get`/`defaultIcon`/
  `iconField` lookups is possible and immediately wrong the moment the engine adds a lookup.
- **Verdict argument.** Keep.

## 105. `defineComponent` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 04, extended by the islands work. **Built family consumers: four**.
- **Any-site case:** it does something a site cannot do for itself — it builds the component's
  attribute validator from `fields.*` descriptors so *"a component attribute and a concept field
  validate through identical code"* (`core.md:339`), and it fails at module load on an
  attribute type directives cannot carry (*"An `object`, `array`, `multiselect`, `reference`, or
  `image` attribute throws at declaration"*). A hand-rolled definition discovers that at first
  insert, in the editor, in front of an author.
- **Verdict argument.** Keep.

## 106. `RendererOptions` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 04, materially extended by measured family harvest: the pre-beta ledger
  records *"**The rehype seam on createRenderer** — LANDED (`43f9967`). `RendererOptions` gained
  `remarkPlugins`/`rehypePlugins` … 907.life's hand-rolled second unified pipeline migrated onto
  it"* and *"**Table-scroll as a built-in default** — LANDED (`71c131d`) … 907.life deleted its
  local wiring"*.
- **Any-site case:** the archetype of a divergence the engine absorbed. Before the seam, a site
  wanting one extra rehype transform re-parsed cairn's returned HTML into a second unified
  pipeline; after it, the site's plugin composes over the same hast tree. The AstroPaper port
  reached three raw-HTML devices through `sanitizeSchema` alone, *"with an **empty** component
  registry"*.
- **Verdict argument.** Keep. Measured hand-roll, deleted twice on adoption.

## 107. `SiteRender` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`
- **Provenance:** Plan 02 adapter contract; kept 2026-07-01 unargued.
- **Any-site case:** it types `rendering.render`, a **required** adapter member every site writes,
  and it is the load-bearing invariant of the whole product: *"the one renderer the editor preview
  and every public page call"* (`core.md:1062`). If the preview and the page could use different
  renderers, WYSIWYG would be a lie; this single type is what makes them the same function.
- **Verdict argument.** Keep. Ranked near the top on product-invariant grounds, not usage counts.

## 108. `createRenderer` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 04; kept 2026-07-01 unargued. **Built family consumers: five repos, plus
  eight ASC component tests** that call it directly.
- **Any-site case:** the whole markdown pipeline — directive syntax, `cairn:` and `media:`
  resolution, `::include`, the sanitize floor, heading slugs, the sink guard. The barrel is
  explicit that the safe ordering is the only public path: *"rehypeDispatch is deliberately not
  public: createRenderer is the one public render pipeline, so the safe plugin ordering is the only
  public path"* (`src/lib/index.ts`). A site assembling its own order gets the sanitize floor in
  the wrong place, which is a security defect, not a styling one.
- **Verdict argument.** Keep.

## 109. `CairnRuntime` — VERDICT: keep

- **surfacedAt:** `.`, `/sveltekit`
- **Provenance:** Plan 02 seam 2; kept 2026-07-01 unargued. Produced in every family site's
  `chassis/cairn.server.ts` and handed to `createCairnAdmin`.
- **Any-site case:** the object every site's server module exports and every admin mount consumes.
  Typing that export requires the name. It is also where the derivations live that a site must not
  redo — *"The per-concept URL policy is derived from the site-config, the same source delivery
  uses, so the runtime and delivery permalinks cannot diverge"* (`core.md:727`).
- **Verdict argument.** Keep.

## 110. `composeRuntime` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 02 seam 2; kept 2026-07-01 unargued. **Built family consumers: six** — every
  single family artifact, in `src/chassis/cairn.server.ts`, the canonical wiring the chassis
  boundary map lists as KEPT: *"`cairn.server.ts` — the one server-side runtime composition point
  (`composeRuntime`, `createCairnAdmin`)"*.
- **Any-site case:** there is no cairn site without it. It is the fold from declaration to running
  engine, and it also applies the defaults a site relies on silently (`supportContact` defaulting
  to cairn.pub's help, the vocabulary snapshot, the URL policy).
- **Verdict argument.** Keep.

## 111. `ConceptConfig` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`
- **Provenance:** Plan 02; kept 2026-07-01 unargued.
- **Any-site case:** `defineConcept`'s parameter and the shape of every content declaration. A
  site factoring shared concept defaults across sites — the multi-site developer this engine is
  built for — annotates the helper. The type is also where the URL-policy vocabulary lives, and
  those fields carry declaration-time enforcement (`permalink`, `datePrefix`, `routing`) a site
  cannot reproduce.
- **Verdict argument.** Keep.

## 112. `defineConcept` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 02; kept 2026-07-01 unargued. **Built family consumers: five repos**, once
  per declared concept.
- **Any-site case:** two things at once, both engine-only. It preserves the fieldset's concrete
  type for typed reads, and it validates the URL policy at module load: *"a bad `permalink`,
  `datePrefix`, or `routing` throws at module load rather than defaulting or resolving silently"*,
  including the date-field coupling (*"the concept must declare a field named `date` of type
  `date`"*). A plain object literal loses both.
- **Verdict argument.** Keep.

## 113. `FieldDescriptor` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** Contract v2 (`4df384bc`); kept 2026-07-01 unargued while all fifteen arms were
  demoted, which is exactly the shape the July pass believed correct.
- **Any-site case:** *"the plain-data descriptor union the form, validator, and inference all
  read"* (`core.md:522`). Any site writing a generic renderer over its own schema — a field
  checklist, a docs generator, a form preview — switches on this union, and exhaustiveness checking
  against it is what tells the site when the engine adds a field type.
- **Verdict argument.** Keep. The union is the earned name; the arms (ranks 24–38) ride on it.

## 114. `Fieldset` — VERDICT: keep

- **surfacedAt:** `.`, `/delivery`, `/delivery/data`, `/sveltekit`
- **Provenance:** Contract v2; kept 2026-07-01 unargued.
- **Any-site case:** the return of `fieldset` and the `fields` member of every `ConceptConfig`. A
  site that defines its fieldsets in one module and its concepts in another must name it. It is
  also the object that carries four things at once — descriptors, behavior table, validator,
  Standard Schema property — none of which a site could assemble consistently by hand.
- **Verdict argument.** Keep.

## 115. `fields` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Contract v2 (`3433de78 feat(fields): export the v2 field vocabulary`); kept
  2026-07-01 unargued. **Built family consumers: five repos**, in every `cairn.config.ts` and in
  ecxc's and ASC's component modules.
- **Any-site case:** the constructor namespace for the whole field vocabulary, and the reason the
  fifteen arms rarely need naming. Its literal-preserving behavior is engine-only —
  *"a `select` or `multiselect` preserves its literal option list so the inferred type narrows to
  that union"* (`core.md:418`) — which is what makes `InferFieldset` produce a useful type rather
  than `string`.
- **Verdict argument.** Keep.

## 116. `fieldset` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Contract v2; kept 2026-07-01 unargued. **Built family consumers: five repos.**
- **Any-site case:** the single source of truth for the editor form, the server validator, and the
  inferred frontmatter type. Its declaration-time enforcement is what a hand-roll cannot buy:
  *"A malformed `pattern` throws at the `fieldset()` call, not on a later save"*, and the container
  nesting rules *"throw at the `fieldset()` call"* rather than producing a form that renders and
  then loses data.
- **Verdict argument.** Keep.

## 117. `CairnAdapter` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 02; kept 2026-07-01 unargued. It is also the one **documented exception**
  to the export-rule closure, recorded in the C2 post-mortem: *"`CairnAdapter` stays the one
  documented exception at `/delivery` and `/delivery/data`, because its body reaches auth- and
  github-shaped types that `delivery-entry-boundary.test.ts` forbids that subpath from importing.
  The boundary test was preserved, not weakened."*
- **Any-site case:** *"The one seam the engine consumes"* (`core.md:1034`). A site that builds its
  adapter across modules, or ships a shared adapter base across several sites, annotates it. The
  recorded boundary exception is itself evidence the type is load-bearing enough that the engine
  bent a gate around it rather than around anything else.
- **Verdict argument.** Keep.

## 118. `defineAdapter` — VERDICT: keep

- **surfacedAt:** `.`
- **Provenance:** Plan 02; kept 2026-07-01 unargued. **Built family consumers: five repos**, once
  each — the single most load-bearing call in a cairn site.
- **Any-site case:** three engine-only jobs in one call. It const-captures each concept's concrete
  fieldset so typed reads work at all (the harvest's own correction proves the mechanism:
  *"`defineAdapter<const A extends CairnAdapter>(adapter: A): A`'s const-generic capture preserves
  `githubApp()`'s concrete `GithubAppProvider` return type, so `cairn.backend.owner` reads with no
  cast"*). It validates the islands pairing fail-closed at declaration. And it is the one place the
  whole nine-member contract is checked before a request ever arrives.
- **Verdict argument.** Keep. The strongest anonymous-consumer case in the bucket: no cairn site
  exists without it, and everything it does is impossible outside the engine.

---

## Summary of non-keep verdicts

| Rank | Item | Verdict | Right form |
| --- | --- | --- | --- |
| 1 | `StandardSchemaV1` | retire | Not cairn's to publish; consumers take the interface from `@standard-schema/spec`. Conformance is structural and already works. |
| 2 | `DEFAULT_ROLES` | retire | Delete from `.`; `resolveCapability(undefined, role)` already applies the default, and no consumer imports the constant. |
| 3 | `AuthBranding` | reshape | Export from `/sveltekit` only (where `AuthRoutesConfig` names it); drop the root duplicate, per the `ResolvedReference` precedent. |
| 4 | `PublishActionsConfig` | reshape | Retire the `X[]` alias; keep `PublishActionEntry` and type `editor.publishActions` as `PublishActionEntry[]`. |

## Two coherence notes for the whole-surface view

1. **The C2_READDED block (ranks 5–38, twenty-two names) is carried entirely by doctrine.** Every
   one was argued down on evidence in July and restored by a rule, not a consumer. Exactly one of
   them (`ManifestEntry`) has since acquired a real importer. That is a 1-in-22 hit rate for the
   reversal. The block stays because it is now a closed, gated set and evenness is a surface
   property — but if the export rule is ever revisited, this is the block to revisit with it.

2. **`glyph`'s split placement is an evenness wart.** One hast helper lives on `.` while
   `iconSpan`, `cardShell`, `headRow`, `strAttr`, and `isElement` live on `/render`
   (`core.md:698`). Three family sites import `glyph` from `.` today, so moving it is not free,
   but the surface currently teaches a rule it does not follow.
