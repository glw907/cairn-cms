# The C2 breaking-window agenda

**Status: DRAFT agenda, adjudication pending.** This document widens phase C2's charter from "the
naming pass" to "the breaking-window pass" (Geoff signaled the widening 2026-08-02; the sitting
ratifies it by working this agenda). It exists so the last cheap breaking window is spent
deliberately and exhaustively rather than item by item. Release one is the final release a consumer
absorbs breakage as one batch; at beta, compatibility-SemVer makes every deferred item here a major
version or a permanent resident.

**Sequencing:** the refusal-channel convergence pass lands first (it changes what `AdminActionError`
means, and the sitting should not name a symbol mid-change). Then, RECOMMENDED and pending Geoff's
workflow opt-in: a read-only adversarial audit sweep over the settled surface (lenses: SvelteKit
idiom, API consistency, dead or accidental surface, doc-versus-code drift, cruft), appending
confirmed findings to this agenda so the sitting adjudicates evidence rather than a session's
recollection. Then the sitting runs, on Fable, over `docs/internal/api-surface.md` (corrected by
C1; it records nullability for the first time) plus this agenda. Execution stays one pass, one
diff, one `Consumers must:` list.

## In the window (adjudicate every item; silence is not a decision)

1. **The rename set.** The sitting's original charter: one deliberate read of every exported name,
   option key, subpath, and log event as a whole. The known asymmetries: the `create*` factory
   family beside the bare `adminAction` wrapper; anything the read surfaces.
2. **The `locals` namespace policy.** Four engine keys in the shared namespace (`editor`, `backend`,
   `auditSink`, `cairnAccess`), three unprefixed. Plausible shape already filed: engine keys take a
   `cairn` prefix, old names as deprecated aliases through the beta window, one `Consumers must:`
   line.
3. **Subpath taxonomy.** `./sveltekit` accretes toward a grab-bag while `./auth-store` and
   `./auth-crypto` stay precise. Membership is architecture, not naming, and this window is the only
   cheap time to move anything. The `./cloudflare` charter-line precedent (a stated membership rule
   in the barrel header and the reference page opening) is the form each subpath should get.
4. **The event-shape trio.** `RequestContext` pins `AuthEnv`, `ContentEvent` pins `BackendEnv`,
   `AdminEvent` pins both, and `AdminEvent` leaks shape-only into the public `.d.ts` (never exported
   by name). Three names for "the event your admin route receives," distinguished by nothing a
   consumer chooses. Decide: one generic event shape, or three ratified pins, and either way whether
   `AdminEvent` becomes a named export or disappears.
5. **The env story, whole.** The C1 carry-in plus the sharper framing: before deciding whether the
   route factories become generic over `Env` (not free; a site would write
   `createCairnAdmin<SiteEnv>(runtime)` explicitly), evaluate making cairn's binding types
   structurally accept the platform's own (`AuthEnv['EMAIL'].send` returns `Promise<void>` where
   `@cloudflare/workers-types`' `SendEmail.send` returns `Promise<EmailSendResult>`). Structural
   compatibility may dissolve the `CairnPlatformBindings` intersection requirement and the
   section-action bridge casts with no generics at all. The evidence anchor is the
   `@ts-expect-error` tripwire in `src/tests/unit/env-genericity.test.ts` (`BareWranglerSiteEnv`):
   if the fix works, that tripwire fails on TS2578 and gets removed, which is the proof.
6. **The log-event vocabulary.** Event names are the public-observable contract. Two known
   collisions: `admin.audit.sink_failed` (the packaged D1 sink's internal persist failure) beside
   `admin.action.audit_sink_failed` (a site's sink throwing at the engine's call site); and
   `guard.rejected` with `reason: 'csrf'` (the guard's pre-routing refusal) beside
   `admin.action.csrf_rejected` (the wrapper's defense-in-depth branch, added by the convergence
   pass). Renames are free only until the next publish. Read the whole vocabulary, not just the
   pairs.
7. **The deprecated-alias sweep.** Known: the platform wrapper's `context` alias for `ctx`
   (`src/lib/sveltekit/types.ts`). Sweep for others. Aliases retire while retirement costs one
   changelog line.
8. **`AdminActionError`'s residual identity.** After convergence it means exactly one thing: the
   dev-only unaudited-action defect signal. Decide whether the name still describes that (a candidate
   honest name exists in the obvious form) or whether it keeps its name for continuity. The declined
   `isAdminActionError` export stays declined unless the sitting overrules with a reason.
9. **`SectionActionConfig.resolveDb`'s shape.** C1's regen surfaced
   `(env: Env | undefined) => Db | undefined` on both `resolveDb` and `rateLimit.resolve`. The
   semantics are ratified (fail-closed / degrade-to-open); the question is whether the
   `Env | undefined` parameter shape is right or the callback should handle absence internally.
10. **The built-in actions' refusal pattern.** The engine's own mutating actions refuse by
    `redirect(303, '...?error=')` where kit's designed affordance is `fail()` plus the `form` prop.
    Either converge to `fail()` inside this window (behavioral, breaking-adjacent, consumer-visible
    UX) or ratify redirect-PRG as the house pattern with a recorded ruling. Silence freezes it by
    accident, which is what the function-color audit existed to prevent.
11. **Reserved vocabulary for the F features.** History, revert, and preview arrive next and ship in
    release one. Sketch their expected exported names (the entry-history read surface, the revert
    action, the preview token/URL surface) before settling conventions, so the conventions cover
    them and the features do not arrive under rules made without them.

## Deliberately out (not breaking; do not let them ride in)

- **The doctor migration probe** (teach `cairn-doctor` to compare the live schema against the
  installed engine's expected migrations and name the missing file). Additive; file for C/P and land
  before beta, but it does not belong in the breaking diff.
- **The kit#12987 mitigation** (streamed pending count flattens admin error statuses to 200).
  Internal behavior, needs a decision DATE before beta (stop streaming the count, or accept and
  document in operations docs), but not this window's diff.
- **The four-CI-gates consolidation** and other mechanical hardening (phase P).
- **The media-library split (P5), conditionally.** It stays out only if genuinely additive. Run the
  placement check before the window shapes: if the split moves exports, it is breaking and must pull
  forward into this window.

## Standing constraints the sitting inherits

- `Env extends AuthEnv` does not compile (TS2559, weak-type detection against the all-optional
  `AuthEnv`); any generic uses unconstrained `Env` with a default.
- The section-action bridge casts (`section-action.ts`) are load-bearing until item 5 resolves them.
- `check:reference:signatures` reads only fenced `ts` blocks; a signature stated only in a reference
  table is ungated (C1 carry-in). Whatever the sitting renames, the execution pass keeps the fenced
  blocks as the gated form.
- The changelog convention: every breaking change carries its `Consumers must:` line, and the whole
  window lands as one list.
