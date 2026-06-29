# cairn principle-adherence audit

The prioritized output of the principle-adherence review pass (2026-06-28). It records what the
whole-engine audit found when every subsystem was read through the charter lens. The charter is the
`## What cairn is` block in `CLAUDE.md` and `what-cairn-is-and-is-not.md` (same directory); the pass
spec is `docs/superpowers/specs/2026-06-28-cairn-principle-adherence-review.md`.

## Headline

The engine is charter-adherent. A ten-subsystem audit, calibrated to hunt only for things to remove,
simplify, or narrow, and to reject any finding that proposed adding anything, surfaced **no verified
blocker or high-severity drift**. The auth reviewer confirmed directly that the reverted phase-1
identity substrate (a principal model, scopes, an `admin`/`member` trust tier, an `authorize`
callback, a session-minting `signIn`, member login) did not creep back: the `Role` type is exactly
`'owner' | 'editor'` and nothing wider. Every deliberate, charter-named investment the spec warned
against misreading (the `fields.*` library, islands, the R2 media stack, the GitHub-App backend, the
Cloudflare-first primitives, the self-owned magic-link auth) was confirmed correctly lean.

Two things produced this result. Part A of the pass removed the one real piece of reserved-but-inert
drift, the `CairnExtension`/`AdminPanel`/`FieldTypeDef` register-components scaffolding, ahead of the
audit. And the engine was already built to the north-star quality bar, so what remains is a short list
of small dead-surface items, not structural over-build.

## Method

A `Workflow` fanned one reviewer across each of ten subsystems. Each reviewer read the charter, the
calibration (remove-only; a finding that proposes adding is itself a violation), and its slice of the
code, then reported what aligns and any remove/simplify/narrow candidate with a severity, a confidence,
an exact location, the evidence, and a reductive recommendation. Every blocker/high finding would have
gone to two independent skeptics defaulting to rejection, kept only on a unanimous confirm; no finding
reached that bar, because none was rated above medium. The false-positive guard held: no reviewer
flagged a deliberate lean investment as drift for being large.

The findings below are the reviewers' medium and low candidates, ranked by severity then confidence,
each with a disposition. "Fix now" items are safe, high-confidence, and touch no public contract or
product-UX decision. "Defer" items are public-surface narrowings (which want a release and a changelog
entry) or product-UX calls that belong to another initiative.

## What aligns (recorded so it is not re-litigated)

The audit's confirmations are as load-bearing as its findings: they record what is correctly lean and
must not be "improved" into over-build by a later gap-hunting reviewer.

- **auth + sveltekit.** `auth/store.ts` is exemplary: prepared-statement D1, no ORM, anti-lockout as
  one atomic guarded statement so concurrent owner removals cannot strand zero owners. `auth/crypto.ts`
  is ~60 lines of Web Crypto with opaque D1 session rows and no JWT-for-sessions. The guard gates only
  `/admin`, restores the framework Origin check, and resolves the role live per request. The
  single-mount admin composer maps fixed views to fixed delegates with no plugin/registry point. The
  structural-event subsetting in `sveltekit/types.ts` is a thin decoupling seam, not an abstraction
  layer.
- **content + adapter.** No domain actor, no auth, no plugin registry. `fields.*` is the sanctioned
  field library; its type-level inference is load-bearing, not speculative. `concepts.ts` attaches a
  new concept by adding one key. `manifest.ts` size is inherent to the content-graph job. The
  `define*` helpers do only fail-closed consistency assertions at module load.
- **render + delivery.** One composed pipeline the editor preview and delivery share, so they cannot
  drift. The sanitize floor is genuine XSS-strip security code. The component registry is the
  sanctioned contract; `hydrate?`/islands fields are the shipped 4b feature. Delivery is pure-data
  projections with a node-safe split that keeps SvelteKit and Svelte out of plain-Node graphs, which
  is correct Cloudflare-first plumbing, not portability abstraction.
- **islands.** Two tiny files mounting via Svelte's own `mount()`. Zero-cost when unused. Both exports
  have real callers. No reserved-but-inert export.
- **media.** Content-addressing is the right lean primitive. The R2 stack (reconcile, orphan-scan,
  bulk-delete-plan, rewrite-plan) is the charter-named investment; the planners are pure and own no
  domain logic. The usage index unions main plus every open `cairn/*` branch and fails closed for the
  destructive gate. `sniff.ts` is a fixed deny-list, not an extensible scanner framework.
- **backend.** The `Backend` interface is read/commit/branch-over-files only and holds the line that it
  never grows a `query()` method, which is what keeps a database out. `CommitAuthor` is git attribution
  only, not a member/role model. Self-owned App JWT signing avoids pulling octokit into the Worker.
- **diagnostics + doctor.** The condition registry has real runtime consumers across the core path; the
  doctor is a deploy preflight for cairn's one job. The hand-rolled helpers are deliberately shallow
  with their gaps named, choosing the leanest form over a public-suffix list or a full TOML parser.
- **components.** The editor/admin frame is the core job. The CodeMirror modules, spellcheck, tidy, and
  the `fields.*` components are tight client-only units with correct server-boundary discipline.
  `objective-errors.ts` explicitly refuses a style/opinion linter. `CairnAdmin` is a pure single-mount
  switcher.
- **vite + log.** `escape.ts` and `ambient.ts` are minimal and fully consumed. The log module is a lean
  chokepoint over a console sink with a frozen event-name union and no reserved subscriber machinery.
  The vite plugin's `AdapterFacts` is narrow by design, exposing only four build-time facts.
- **exports.** The subpath split is consumer-driven; every subpath has a real consumer. The node-safe
  boundary is deliberate. The barrels curate internals out rather than leaking them.

## Findings

### Fixed in this pass

| # | Subsystem | Finding | Action |
|---|-----------|---------|--------|
| F1 | render + delivery | Three empty `/** */` doc stubs on public exports (`serializeComponent`, `remarkDirectiveStamp`, `jsonLdScript`): noise the authoring charter forbids. | Replaced each with a real one-line TSDoc stating the contract. |
| F2 | vite + log | The log barrel re-exports `Logger`, `LogLevel`, `LogRecord`, which no consumer imports and which the internal logger publishes from no package subpath. | Dropped the three re-exports, keeping `log` and `CairnLogEvent`. |
| F3 | content + adapter | `resolveConcepts` is an internal one-line identity wrapper over the public `normalizeConcepts`, with two callers and no added behavior. | Deleted it; both callers call `normalizeConcepts` directly. |
| F4 | components | A "Filter by type: Images/Documents" radiogroup in the Media Library, built for a media type the delivery route does not serve (`showFacet` can never fire today). Speculative reserved generality. | Removed the `distinctTypes`/`showFacet` derivation and the `{#if showFacet}` radiogroup block. |

F1, F2, and F3 are high-confidence, touch no public contract (F3 is internal-only) or product-UX
decision, and are pure removals or quality fixes. F4 is speculative UI for an unsupported content type,
which is genuine remove-only drift; removing it was confirmed against the admin design system.

### Follow-up filed (not drift)

The audit also flagged two inert "Upload" buttons in the Media Library (the header and the empty
state), which render with no wired action. On inspection this is not reserved-but-inert drift: the
`?/mediaUpload` action they need **already exists** and is used today by the Library's replace flow, so
the buttons are an unfinished entry point, not scaffolding for an out-of-scope feature. The Library can
manage images but cannot directly upload one. The right answer is to finish the feature, not to delete
the buttons, so this is filed as a small media finish-up follow-up (ROADMAP, Next) rather than actioned
in this remove-only pass. The stale `TODO(Task 7+)` on the header button claims no media-only upload
action exists, which is no longer true.

### Deferred (triaged backlog)

Ranked by severity then confidence. Each carries why it is deferred rather than fixed now.

| # | Subsystem | Sev / Conf | Finding | Why deferred |
|---|-----------|-----------|---------|--------------|
| D1 | media | med / high | `MediaStore.get` (conditional/ranged read) has no production caller; delivery reads through the separate `DeliveryBucket` seam. Removing it narrows `MediaStore` to put/head/delete and drops three R2 type imports. | Public seam method on `/sveltekit`. Narrowing it is a versioned surface change wanting a release + changelog; fold into the media initiative or the next release. |
| D2 | exports | med / high | `generateComponentReference` + `ReferenceOptions` are exported from the root barrel with zero callers (engine, bins, showcase), built for an author-reference generator never wired up. | Deliberately published: it has a unit test, an export-surface test, and a `core.md` reference row. Removing it is a real public-API removal wanting a release + a `Consumers must` changelog line. Decide at the next release or fold into the extensibility redesign's surface review. |
| D3 | auth + sveltekit | low / med | `RequestResult.sent` is redundant with the `status` discriminant; its own comment admits it is kept for a hypothetical site form, and `LoginPage.svelte` carries a dead `|| form?.sent` clause. | Public form-result field a consumer may read. Drop it with a deliberate surface narrowing + changelog, not silently. |
| D4 | auth + sveltekit | low / med | `PlatformContext.ctx`/`context` (`waitUntil`) is dead; no engine code reads it, and the only test sets it to assert cairn does not call it. | Public platform type; the change also touches the test harness. Cheap, but batches with the other surface narrowings in a release. |
| D5 | render + delivery / content | low / med | `siteDescriptors(adapter, siteConfig)` discards `siteConfig` (`void siteConfig`, "retained for API stability"); all callers pass a config it throws away. | Public `/delivery/data` export; the reviewer itself recommends landing the signature change at the next breaking/minor boundary, not silently. |
| D6 | exports | low / low | `ResolvedReference` is re-exported from the root barrel on top of its canonical `/delivery/data` home. | Low confidence; the dual export is mild and documented. Confirm no consumer imports it from root before pruning. |

## How this informs the next pass

The next pass is the lean extensibility redesign, from clean context, against the charter. Every
deferred finding is a public-surface narrowing (D1 through D6) that the redesign will review the public
surface for anyway; it should fold them into that review and carry their `Consumers must` lines into
whatever release closes the redesign. The Media Library upload follow-up is separate: it is feature
work for the media initiative, not the redesign.

The standing lesson the audit reinforces: the engine stayed lean because the premise check ("is this
cairn's job, and is it the leanest form?") was applied at design time on most of it, and the one place
it lapsed (the extensibility over-build) was caught and reverted. The audit found small residue, not
structural drift, which is the expected shape when the premise check is doing its job.
