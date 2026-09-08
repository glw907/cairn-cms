# Identity-seam precedent report

Research for a `resolveEditor` option on `createAuthGuard`: a site behind Cloudflare Access
brings its own identity, cairn mints no session in that mode, and the roster still assigns
owner/editor roles. All citations are to `docs/internal/engine-rulings.md` unless noted.

## 1. Rulings bearing on the guard, sessions, and the auth store

- **`audit-sveltekit-createauthguard`** (keep, 2026-08-26 any-site audit; lines 2536-2541).
  Verdict: keep. Reason: `createAuthGuard` is "every cairn site, one line in
  `hooks.server.ts`. It carries session resolution, the CSRF authority the site handed over
  by setting `checkOrigin: false`, capability resolution, security headers, and a dev-backend
  fail-closed." Reopens on: evidence against the recorded any-site case. **This is the
  load-bearing enumeration of what the guard does today**, a `resolveEditor` seam has to
  say, item by item, which of these five it keeps (CSRF authority, capability resolution,
  security headers, dev-backend fail-closed) and which it replaces (session resolution).

- **`audit-sveltekit-requiresession`** (keep; lines 2515-2520). Verdict: keep. Reason:
  "Every custom admin screen's load. **The session lives in an engine-owned cookie resolved
  against the engine's D1 store, so a site cannot reach it correctly on its own.**" This is
  the strongest textual constraint against silently reusing `requireSession`'s contract for
  an Access-authenticated request with no cairn cookie: the ruling's whole any-site case is
  that only the engine can resolve its own cookie/D1 pair. A `resolveEditor` mode is a
  *different* path (`requireSession` still serves the magic-link case; the new seam does not
  reuse or repurpose it), not an argument against building one.

- **`audit-sveltekit-requireowner`** / **`audit-sveltekit-requireeditor`** / **`audit-sveltekit-requireaccess`**
  (keep; lines 2501-2513, 2522-2527). Each keep argues these three helpers exist so a site
  gates "in one line" against role/capability rather than re-deriving what owner/editor/access
  mean. None of the three reasons mention *how* the session was established, they operate on
  `locals.cairnEditor`/`locals.cairnAccess` regardless of origin. This is precedent that the
  role/capability layer is deliberately decoupled from the session-minting mechanism: once an
  `Editor` is resolved and attached to `locals`, these three helpers are agnostic to how it
  got there.

- **`audit-adapter-editor`** (keep; lines 1300-1305). "Every custom admin route reads
  `locals.cairnEditor` and every helper taking the signed-in identity types its parameter. A
  re-declared shape drifts the moment the engine adds a field." Confirms `Editor` is the
  stable public shape a `resolveEditor` callback would need to return.

- **`audit-adapter-accessmap`** / **`audit-adapter-rolesdeclaration`** / **`audit-adapter-defineaccess`**
  / **`audit-adapter-defineroles`** / **`audit-adapter-canreach`** / **`audit-adapter-resolvecapability`**
  (all keep; lines 1244-1298, 1260-1274). Together these establish that access/role resolution
  is a pure function of a declared vocabulary plus a resolved role string, nothing in any of
  these entries references session mechanics. `resolveCapability`'s "fail-closed default…
  an absent role name returns `none`" (line 1262) is the policy a `resolveEditor` mode must
  also honor: an Access-resolved identity with an unrecognized or absent role must fail
  closed to `none`, not silently to `owner`.

- **`audit-adapter-ownerlevelroles`** (keep; lines 966-976). "A site provisioning admins from
  its own screen must know which of its role names carry owner capability, since the
  last-owner guard counts across that set." Relevant because a resolveEditor site still needs
  the roster (D1 editor table) to assign roles, the spec's own premise ("the roster still
  assigns owner/editor") matches this precedent exactly: identity resolution and role
  assignment are already two separate concerns in the engine.

- **`access-semantics-documented-divergence`** (accept, 2026-09-03, internals pass; lines
  5364-5398). Ratifies that the engine runs two deliberately different access postures
  (permissive for its own screens/nav, fail-closed for site POSTs through `adminAction`/
  `createSectionAction`) and documents rather than "blanket hardens" them. Reopens on: a new
  `config.access_unmapped` warning firing in production, or "a consumer explicitly asks for a
  hardened, deny-by-default floor." **Relevant precedent for the new seam's own diligence
  bar**: divergent postures are acceptable engine behavior as long as each carries a
  `Posture:` doc-comment stating which reading it runs and why (see `canReach`,
  `requireEngineAccess`, `adminAction`, `createSectionAction` in `src/lib/auth/access.ts` /
  `sveltekit/guard.ts` / `sveltekit/admin-action.ts` / `sveltekit/section-action.ts`). A
  `resolveEditor` mode should carry the same kind of one-sentence posture comment on what it
  does and does not verify (it trusts the site's Access-verified headers; it does not
  independently authenticate).

- **`dev-backend-flag-refusal`** (accept, 2026-09-02, internals pass; lines 5308-5362).
  Establishes the precedent that the guard's per-request fail-closed tripwires (dev-backend
  flag, in this case) are read from **one shared internal module** two call sites import
  (`read-from-the-source-rule`), and that a "deployed but non-local" witness is derived from
  `event.url.hostname` / `PUBLIC_ORIGIN`, never trusted from a header the request itself
  controls. This is the template a `resolveEditor` implementation should follow for trusting
  Access headers: any Cloudflare-Access-specific verification (JWT audience/signature check)
  belongs in one internal, shared, non-forgeable primitive, not scattered per-callback logic,
  and the "trust boundary" analysis (what a forged header vs. Cloudflare's own edge-injected
  header can and cannot spoof) is the kind of scrutiny this ruling's dev-backend analysis
  models.

- **`audit-cli-auth-store-auth-role-vocabulary-auth-email-normalization-d1-probes`** (keep;
  lines 4979-4984). Names the auth store's three doctor probes (`auth.store`,
  `auth.role-vocabulary`, `auth.email-normalization`) as Arm-A/total because "a correctly
  deployed site with an empty owner table locks every human out permanently, with no recovery
  through the UI." `auth.email-normalization` "names its hole exactly: 'a manual wrangler d1
  execute insert is the one way to violate it.'" **This bears directly on a resolveEditor
  design**: if the roster (owner/editor D1 table) is unchanged, these probes and the
  last-owner guard's invariants still apply verbatim; the new seam does not get to skip
  auth-store correctness just because session-minting is skipped.

## 2. Rulings bearing on `createAuthChannel`

- **`audit-auth-createauthchannel`** (reshape → **REOPENED and KEPT**, 2026-08-30 conventions-pass
  sitting; lines 3220-3270). This is the single most important precedent for "does the engine
  ship a second, non-default identity path, and under what constraint." Original 2026-08-26
  verdict was reshape-to-shrink ("no consumer anywhere has built against it… drop the factory
  to `/auth-crypto`'s primitives plus a documented recipe"). **Overturned** on 2026-08-30 by
  Geoff directly: *"`/auth-channel` is KEPT, reopened on evidence… Ground for keeping:
  adoption evidence plus the high-consequence-hand-roll argument (enumeration oracle,
  unbounded guessing, identity-keyed throttle), **NOT any-site breadth**; the leanness
  boundary is held by the opt-in subpath."* Reopens on: closed (stands unless the adopting
  usage itself retires).
  - **Why it was kept**: production adoption by a real consuming site (xcathletes-org) plus
    the argument that hand-rolling this class of crypto/rate-limiting/session logic is
    high-consequence enough that shipping a verified factory beats a "recipe."
  - **What its boundary is**: it is scoped to "a second audience's own login," explicitly
    *not* a menu of interchangeable auth strategies for editors, see
    `docs/extend/auth-channel-security-model.md` lines 10-15: "Email magic-link through the
    built-in owner/editor model stays the zero-config default and the documented primary path
    for editors… `createAuthChannel` is the supported second channel for a **different
    audience entirely**." It lives in an **opt-in subpath** (`/auth-channel`), never the root
    barrel or the default guard path, "the leanness boundary is held by the opt-in subpath."
  - **Precedent value for `resolveEditor`**: the engine has already ruled, on the record,
    that a second identity mechanism can be KEPT as engine surface when (a) it serves a real,
    evidenced need a site cannot safely hand-roll, and (b) it stays behind an explicit opt-in
    seam rather than folding into the zero-config default. A `resolveEditor` option on
    `createAuthGuard` is a much smaller and more targeted opt-in than a whole parallel auth
    factory, so this ruling's bar is a ceiling, not a floor, for the new seam's justification.

- **`audit-auth-authchannelevent`** (reshape; lines 3093-3117). Names the discipline the fold
  applied: rather than publishing a fourth parallel event/request shape, the engine expresses
  the extra requirement "as a STRUCTURAL CONSTRAINT on `CairnEvent`." **Precedent for
  `resolveEditor`'s own signature**: prefer typing it as `(event: CairnEvent<Env>) => Editor |
  null | Promise<...>` (or similarly structural) rather than inventing a new parallel event
  or context type.

- **`audit-auth-authchannel`** / **`audit-auth-authchannelconfig`** (reshape; lines 3119-3134,
  3178-3210). Establish the pattern that callbacks reading a roster (`lookup`, `verify`) take
  a **narrow `{ env }` context**, never the full request event, specifically because
  "`lookup` decides subject-versus-decoy (the no-roster-leak property)… and a `false` from
  `verify` destroys the session row on every authenticated request… neither may read
  request-shaped data." **Directly relevant to `resolveEditor`'s signature**: if
  `resolveEditor` needs to read Access-injected headers (`Cf-Access-Jwt-Assertion`), it is
  *not* the `lookup`/`verify` case, it needs the full event/request, which is fine and
  distinguishable, but the design should state explicitly why `resolveEditor` takes the full
  `CairnEvent` (it must read headers) where `lookup`/`verify` deliberately do not.

- **`audit-auth-delivercontext`** (reshape; lines 3049-3062). Same narrow-context idiom,
  reinforcing that whenever a callback's contract can be satisfied by "resolved binding,
  nothing else," it should be, a norm the resolveEditor spec should test itself against for
  every callback it introduces beyond the identity resolver itself.

## 3. Rulings bearing on access/roles

(See also section 1's access/role entries, grouped there since they interleave with the
guard discussion.) No additional entries not already covered add new constraints; the
role/capability layer (`defineRoles`, `defineAccess`, `canReach`, `resolveCapability`,
`resolveOwnerLevelRoles`) is uniformly described as operating on a resolved role string with
no dependency on how the underlying identity was authenticated.

## 4. Rulings bearing on magic-link, email, and the last-owner guard

- **`login-csrf-no-same-browser-binding`** (defer → closed; lines 294-341). The magic-link
  confirm flow's login-CSRF fix (nonce-bound cookie, last-requester-wins rebind, unbound-row
  escape hatch). **Scope note for the new seam**: this entire mechanism (the `cairn_login_pending`
  cookie, the nonce binding) is specific to the token-based magic-link flow. A resolveEditor
  site skips this whole flow since it never mints a magic-link token; the design doc should
  say so explicitly rather than leaving a reader to infer it.

- **`audit-auth-insertownerifempty`** (retire; lines 3033-3039) and **`audit-auth-seteditorrole`**
  /​ **`audit-auth-deleteeditor`** / **`audit-auth-demoteownerifnotlast`** /
  **`audit-auth-removeownerifnotlast`** (all reshape, executed conventions-pass Task 4; lines
  3296-3365). These establish the last-owner guard as atomic, conditional SQL statements
  (`setEditorRole`/`deleteEditor` taking `ownerRoles` and refusing a demotion/deletion that
  would leave zero owner-capability rows), entirely independent of session or auth
  mechanism. **This is precedent that the roster/last-owner invariant is orthogonal to
  identity resolution**: a resolveEditor site still calls the same `setEditorRole`/
  `deleteEditor`/`listEditors`/`insertEditor` primitives against the same D1 roster, and the
  last-owner guard applies unchanged, matching the spec's stated premise ("the roster still
  assigns owner/editor").

- **`audit-adapter-defineroles`** (keep; lines 1292-1298) reiterates: "The owner reservation
  is engine-enforced 'since the last-owner guard and the bootstrap owner both anchor on it'."
  A resolveEditor design that removes session minting must NOT remove or bypass
  `bootstrapOwner`/the last-owner guard, those stay engine-enforced regardless of how
  identity got resolved.

## 5. Rulings bearing on `PUBLIC_ORIGIN` and CSRF

- **`public-origin-only-origin-source`** (decline; lines 491-502). Declines env-sourcing
  origin generally for the *public render* path (canonical/OG/feed URLs), for
  deterministic-visual-baseline reasons, not directly about auth, but establishes
  `PUBLIC_ORIGIN` is deliberately narrow-scoped rather than a general environment knob.

- **`originmatches-strict-guard`** (keep; lines 504-515). `originMatches` stays a strict
  `Origin` compare rejecting `Origin: null`, because "some consumer routes have no second CSRF
  layer besides this compare." Reopens on: an evidenced same-origin flow sending `Origin: null`
  the doctor check can't catch. **Relevant**: any resolveEditor-guarded route that still
  performs unsafe (POST) admin actions must still pass through the guard's own CSRF
  double-submit check (`adminAction`), independent of how the session/editor was resolved , 
  see `docs/extend/security-model.md` lines 190-205 ("CSRF: cairn owns it, not the framework").

- **`dev-backend-flag-refusal`** (see section 1) also documents the `PUBLIC_ORIGIN`-based
  "deployed runtime" witness used to decide when a dev-only escape hatch must refuse, the
  same discriminator technique (host/`PUBLIC_ORIGIN`-based, never request-self-reported) that
  a Cloudflare-Access-specific verification would need to use to decide when to trust
  Access-injected headers versus a spoofed local request.

- **`audit-cli-config-public-origin-check`** (keep; line 4828, header only in the grep , 
  content not separately quoted above since it is a straightforward CLI doctor-check keep;
  no additional constraint on the new seam beyond confirming `PUBLIC_ORIGIN` is validated by
  the `cairn-doctor` CLI and should stay so).

- **`audit-cli-config-csrf-disable-check`** (reshape; line 4777, header only), a doctor check
  verifying a site actually set `csrf: { checkOrigin: false }` as the guard's contract
  requires. No text suggesting this check would need to change under resolveEditor, since the
  guard's own CSRF authority (double-submit) is unrelated to session-minting.

## 6. Rulings bearing on the `/cloudflare` subpath and Cloudflare-specific helper placement

- **`isuniqueviolation-cloudflare`** (**defer**, 2026-08-26 toolkit-seams pass, recorded
  2026-09-01; lines 431-444). **The single most important placement precedent found.**
  Verdict: defer, not accept, a proposed `isUniqueViolation` type predicate for `/cloudflare`
  was rejected at the plan's second review because: "the Cloudflare-specific content is the
  workerd cause-chain nesting alone, **four divergent copies in ONE consumer is the
  `site-today-export` decline's own shape**, and the engine itself never handles `UNIQUE
  constraint failed` today… so shipping it would have been a **fifth C13 engine-unused
  export**." Reopens on: "a second unrelated consumer hitting the cause-chain nesting, **or**
  the cheaper decisive check: **an engine-side D1 path that can raise a UNIQUE violation and
  mishandles it today** (candidates: the `AUTH_DB` editor/invite inserts,
  `createD1AuditSink`); if one qualifies, **the engine becomes its own first consumer** and
  the item clears both the gate and C13 in one move."
  - **How this bears on shipping a Cloudflare-Access-specific resolver in the engine**: the
    ruling's test is not "is this Cloudflare-specific code" (that alone is fine, `/cloudflare`
    already ships `verifyTurnstile`, `resolveRateLimit`, etc., all kept) but **"is there an
    engine-side consumer, or does this exist only to serve site copies"**. A generic
    `resolveEditor` *option* on `createAuthGuard` clears this bar trivially: `createAuthGuard`
    itself is the engine-side consumer of the option (it's a parameter on an existing engine
    factory, not a standalone unused export). But a **Cloudflare-Access-specific resolver
    function** shipped *inside* the engine (e.g., a built-in `resolveEditorFromCloudflareAccess`
    helper) would need to clear the same bar this ruling enforced: is there an engine-internal
    consumer, or would it exist purely so sites don't each write their own ~20 lines of JWT
    parsing? Per this ruling's own logic, "four divergent site copies" is explicitly **not**
    sufficient justification by itself (that argument was already made and rejected for
    `isUniqueViolation`); what would be sufficient is either (a) the engine itself needing to
    verify Access identity somewhere internally, or (b) the correctness/security stakes being
    high enough to fail the "site can safely hand-roll this" test the way `createAuthChannel`
    and `verifyTurnstile` did.
  - **Compare to `verifyTurnstile`/`resolveRateLimit`** (`audit-cloudflare-verifyturnstile`,
    kept, line 3400: "the naive siteverify fetch trusts a malformed 200 body and throws on a
    fetch failure, a bot bypass **two family sites shipped to production** before this export
    existed"). This is the shape of argument that DOES clear the bar: not "sites keep
    duplicating this" alone, but "sites hand-rolling this shipped a real vulnerability to
    production." **A Cloudflare-Access JWT verifier is exactly this shape of risk** (parsing
    and trusting a bearer/JWT header incorrectly is a classic auth bypass class), so there is
    a real argument by analogy that a *verification* helper (checking Cloudflare's
    `Cf-Access-Jwt-Assertion` signature/audience) could clear the bar the way Turnstile did , 
    but the ledger does not have a ruling directly on this yet, only the analogous instances
    above.
  - **The leanness/charter answer**: `what-cairn-is-and-is-not.md` (see section 7) states the
    developer can "replace the admin auth with their own framework (cairn then mints no
    session and reads an owner/editor identity through a defined hand-off)", this describes
    the *seam* (an option on `createAuthGuard`), not a built-in Cloudflare-Access
    implementation. The strongest reading of precedent is: **ship the `resolveEditor` seam in
    the engine** (a thin, generic hand-off point, Cloudflare-agnostic in its own type
    signature, it takes an event and returns an `Editor`), but **do not ship a
    Cloudflare-Access-specific JWT-verifying resolver function as engine code**; that
    implementation is the site's (or, if broadly reusable and hand-roll-risky, a candidate for
    a later, separately-argued `/cloudflare` export once a second consumer or an
    engine-internal need is evidenced, following the `isUniqueViolation` reopening
    conditions exactly).

- **`audit-cloudflare-verifyturnstileoptions`**, **`audit-cloudflare-checkratelimitkeys`**,
  **`audit-cloudflare-checkratelimit`** (lines 3367-3399): all kept/reshaped, all justified by
  a concrete evidenced failure mode a naive site hand-roll produces (a malformed 200 trusted,
  a misspelled binding silently disabling a limiter). Reinforces the same test: `/cloudflare`
  exports are justified by evidenced hand-roll risk, not by mere platform-specificity.

- **`access-semantics-documented-divergence`** and **`dev-backend-flag-refusal`** (section 1)
  both model the "document the posture, don't blanket-harden" approach the charter favors , 
  relevant if the resolveEditor spec is tempted to add defensive engine-side Access-signature
  verification "just in case": precedent favors documenting the trust boundary explicitly
  (what the engine verifies vs. what it trusts the site/Access to have already verified) over
  building unrequested hardening.

## 7. Charter tests summary (`docs/internal/what-cairn-is-and-is-not.md`, `CLAUDE.md`)

- **The governing boundary** (lines 56-58): "cairn owns its core job, managing markdown
  content and the editor/admin frame, and little else. Everything a site needs beyond that,
  its own functionality, actors, auth, data, and domain logic, **belongs to the developer**,
  and cairn serves it with **a thin seam, not a built-in feature**."

- **The defaults-are-floors-not-ceilings clause is the seam's exact precedent** (lines 62-66):
  *"A developer can replace the admin auth with their own framework (**cairn then mints no
  session and reads an owner/editor identity through a defined hand-off**) and override the
  default authorization through a thin seam. cairn ships a sensible default and a clean way to
  replace it, never a configurable engine for the general case."* This sentence, written
  before the `resolveEditor` spec, already describes precisely the shape being proposed:
  no-session-minted, hand-off-based identity resolution, roster-based authorization
  unaffected. This is the strongest single piece of textual precedent in the whole charter for
  the design.

- **"cairn never models a domain actor"** (line 69): "A site's domain is the site's… cairn
  never names or models a domain actor; it only ever knows owner/editor." **Test for
  `resolveEditor`**: the seam must not introduce any new actor concept (e.g., "Access user,"
  "SSO principal") into cairn's own vocabulary, it must resolve directly to the existing
  `Editor` (owner/editor) shape, nothing else. A Cloudflare-Access-specific resolver that
  returned some richer "Access identity" object distinct from `Editor` would fail this test;
  one that returns a plain `Editor` (email + role, looked up against the existing roster)
  passes it.

- **The leanness/premise-check test** (lines 94-106): "Add to the engine only when it
  demonstrably serves the core job, and prefer the leanest seam over a general feature." The
  named failure mode: an earlier extensibility effort "misread 'let developers extend cairn'
  as 'cairn should own an identity and permissions substrate,' and grew a principal model,
  scopes, trust tiers, and member login in the engine before it was caught and reverted." This
  is a direct warning shot at over-scoping the resolveEditor design: it must stay a single
  hand-off point (an option that returns `Editor | null`), never grow its own principal model,
  trust tiers, or a parallel permissions substrate, those already exist (`defineRoles`,
  `defineAccess`) and must be reused unchanged.

- **Seam stability tiers** (line 74-80, cross-referenced to the 2026-06-28
  developer-extensibility redesign): the public surface is held by "gated
  Extension-API/Scaffold-API stability tiers," not a single `./extend` subpath. Until 1.0 a
  gate *detects and discloses* a break (changelog `Consumers must:` line), never prevents one;
  two Extension-tier breaks have already shipped inside 0.x minors. **Implication for
  `resolveEditor`**: adding it as a new optional field on `AuthGuardOptions` is an
  Extension-API-tier addition (additive, not breaking) if done as an optional callback with a
  default of `undefined` (falling back to the existing session-based resolution), this is the
  cheapest-tier, least-disruptive way to add the seam and matches how `defineAccess`'s
  `roles` parameter was widened to `RolesDeclaration | undefined` in the conventions pass
  (`audit-adapter-default-roles`, closed) as a non-breaking, backward-compatible widening.

- **The Go `cairn` tool carve-out** (lines 83-92) is a useful contrast, not directly relevant:
  it shows the charter already draws a line between "engine public surface" and "an operator
  cockpit that replicates engine operations from outside," useful only as an example of how
  the charter scopes exceptions narrowly and by explicit decision (Geoff, dated), which is the
  same rigor a resolveEditor design proposal should meet.

## 8. Sentences the new seam would falsify or must explicitly extend

From `docs/extend/security-model.md`:

1. **Lines 3-4**: *"How cairn authenticates an editor, protects `/admin` from forgery, and
   gates what a signed-in session can reach. This covers the built-in owner/editor model that
   guards `/admin`; a second audience's own login channel has its own contract, in [Auth
   channel security model]."*, **Needs extension**: this framing only distinguishes "built-in
   owner/editor" vs. "second audience." A resolveEditor mode is a *third* case (same
   owner/editor audience, different authentication mechanism) this sentence doesn't
   contemplate. The page needs a new cross-reference sentence analogous to the second-audience
   one.

2. **Lines 43-48** (the whole "Sign-in: magic links, not passwords" section), specifically:
   *"An editor requests a sign-in link by email. cairn mints a single-use token… Consuming the
   link creates a session… There is no password anywhere in this path, and **no third-party
   identity provider**; a sign-in proves only membership in the `editor` table."*, **Falsified
   under resolveEditor**: Cloudflare Access is precisely a third-party (from cairn's
   perspective) identity provider brokering the sign-in. This entire section needs an explicit
   "this section describes the built-in magic-link path; see [new resolveEditor doc] for the
   externally-authenticated alternative" framing, or the sentence must be scoped to "the
   built-in path."

3. **Lines 57-70** (the whole "Sign-in binds to the browser that asked" section, the
   `cairn_login_pending` nonce-cookie mechanism), **Inapplicable, not false, under
   resolveEditor**, since there is no cairn-minted magic-link token to bind in that mode; needs
   a note that this mechanism only applies to the built-in path.

4. **Lines 140-147** (the session cookie section): *"The session cookie carries the `__Host-`
   prefix… The session cookie derives `Secure` through the same rule the CSRF cookie does…"*
  , **Inapplicable under resolveEditor** if no cairn session cookie is minted at all; must be
   scoped explicitly, and the CSRF cookie discussion (which is a *separate* mechanism, minted
   independent of the session) needs its own statement of whether it still applies when
   `resolveEditor` is set (likely yes, since CSRF protection for site-authored POSTs is
   orthogonal to how the editor's identity was established, but this must be stated, not
   assumed).

5. **Line 220-222** ("The guard's request order," step 6): *"**Session resolve.** Attaches
   `locals.cairnEditor` and `locals.cairnAccess` for the route to read."*, **Needs
   extension, not falsification**: this step's *outcome* (`locals.cairnEditor`/
   `locals.cairnAccess` populated) must be preserved by `resolveEditor`, but the *mechanism*
   (cookie + D1 lookup) is replaced by the callback. The doc needs to state this step becomes
   "Session resolve **or** `resolveEditor` hand-off" when the option is set.

6. **Line 225-226**: *"The exception is step 6: a missing or invalid session redirects to
   `/admin/login` without logging."*, **Needs an analogous statement for resolveEditor**:
   what happens when `resolveEditor` returns `null` or throws? Does it redirect to
   `/admin/login` (which implies a login page that doesn't exist/apply under Access-only
   auth), or does it need its own named `guard.rejected` reason (e.g., `resolve_editor_null`)?
   This is an open design question the new seam's own spec must answer, not something
   existing precedent settles.

From `docs/extend/auth-channel-security-model.md`:

7. **Lines 10-12**: *"Email magic-link through the built-in owner/editor model stays the
   zero-config default and the documented primary path for editors… `createAuthChannel` is
   the supported second channel for **a different audience entirely**, not a menu of
   interchangeable auth strategies."*, **Not falsified, but the framing must be updated**:
   once `resolveEditor` ships, magic-link is no longer the *only* documented path for the
   editor audience, it becomes "the zero-config default," with resolveEditor as a documented
   alternative **for the same audience** (editors), which auth-channel explicitly says it is
   NOT (it's for a *different* audience). The two seams need to be clearly distinguished in
   the docs: auth-channel = same mechanism family (magic-link-like), different people;
   resolveEditor = same people (editors), different mechanism (Access-delegated).

8. **Lines 93-100** (Sessions and revocation): *"A confirmed code mints a channel session,
   stored and resolved the same hashed-lookup way the built-in admin session is."*, Not
   directly falsified (this is about auth-channel, not the admin guard), but worth noting as
   contrast: if `resolveEditor` mints no session at all, cairn has no session to revoke for
   that editor once Access is the source of truth, logout/session-revocation semantics
   (`revokeSessions`, `logoutAction`) need an explicit statement of what they do (likely
   nothing, or a no-op, since there is no cairn session row) in resolveEditor mode.

## Summary of which rulings are load-bearing

Most constraining, in order:
1. `what-cairn-is-and-is-not.md` lines 62-66 (the defaults-are-floors clause), nearly a
   direct blueprint for this exact seam, already written before the spec existed.
2. `audit-sveltekit-createauthguard` (line 2536), the enumeration the new option must map
   itself onto piece by piece.
3. `isuniqueviolation-cloudflare` (line 431), the operative test for whether a
   Cloudflare-Access-specific *implementation* (as opposed to the generic seam) belongs in the
   engine or a site.
4. `audit-auth-createauthchannel`'s reopening (line 3220), precedent that a second identity
   path can be KEPT as engine surface behind an explicit opt-in, when evidenced need and
   hand-roll risk justify it.
5. `access-semantics-documented-divergence` / `dev-backend-flag-refusal`, the "document the
   posture, don't blanket-harden" and "one shared internal witness module" idioms the new
   seam's trust-boundary language should follow.

No ruling argues against shipping the generic `resolveEditor` **seam** in the engine, the
charter text at lines 62-66 affirmatively describes it. The rulings that read as skeptical
(`isuniqueviolation-cloudflare`, the leanness/premise-check warning at lines 94-106) argue
specifically against shipping a **Cloudflare-Access-specific verifying implementation**
(e.g., a built-in JWT/header verifier) as engine code without evidenced hand-roll risk or an
engine-internal consumer, that piece is the site's to build, at least until such evidence
accumulates, per the exact reopening conditions the `isUniqueViolation` entry states.
