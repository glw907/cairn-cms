# The any-site audit remediation: initiative design

Ratified by Geoff 2026-08-27; revised the same day after two adversarial reviews (an
`engine-triage` structural review and a `web-auth-security-reviewer` review of the hardening
slice; verdicts folded throughout, with the two ratification changes re-put to Geoff). This
document frames the initiative; the per-item rulings live in `docs/internal/engine-rulings.md`
and the audit record (`docs/internal/record/2026-08-26-any-site-audit.md`), and are
deliberately not restated here. Slice names are words, never `R<n>` (the audit's own rule
vocabulary uses R-numbers, and `R1`/`R4` already mean two other things in the record).

Each slice gets its own just-in-time plan through the standing two-round adversarial review,
executed in a fresh session on its own worktree.

## The slices, in order

**1. The hardening pass (short, first; waits for the harvest-detection merge, which holds warm
edits in `docs/extend/security-model.md`).** Closes the CSRF 403 incident class as far as the
evidence reaches, per the security review's full verdict. The candidate mechanism (the
confirm-load re-mint under `SameSite=Strict`; a candidate, not a confirmed diagnosis, and the
class recurs once per browser after the fix as old Strict cookies age out) plus every named
sibling path:

- The CSRF cookie moves to an EXPLICIT `sameSite: 'lax'` (never attribute-omission: Chrome's
  Lax-allowing-unsafe window applies to no-attribute cookies) with
  `maxAge: Math.floor(SESSION_TTL_MS / 1000)` so the pair lives and dies together, and
  `logoutAction` deletes it alongside the session cookie. No rotate-on-confirm (that would
  reintroduce the tab invalidation this fixes). The review proved Lax weakens nothing the
  guard screens (Lax and Strict are identical for unsafe methods) and closes a live
  unauthenticated cross-tab denial primitive through the public login page.
- `secure` derives from the configured `PUBLIC_ORIGIN`, not `event.url.protocol`, closing the
  cookie-name flip class and making `crypto.ts:33-35`'s own docstring true; the false "UX
  only" claim on `isLocalHost` is corrected.
- The `content-routes-core.ts:644` empty-token ternary is deleted or becomes a throw (fails
  closed today; unreadable as an incident).
- The rejection discriminator is four-valued plus a witness:
  `detail: no-cookie | no-witness | mismatch | unparseable-body` and
  `witness: header | field`, plus presence-only `hasSession: boolean`, on BOTH
  `guard.rejected` (`reason: 'csrf'`) and `admin.action.csrf_rejected`, with both
  `docs/reference/log-events.md` rows updated. Log-only: no token material, prefix, or length
  ever logged; the HTTP response stays the single generic condition.
- `applySecurityHeaders` gains `Cache-Control: no-store, private` (Lax reduces `Set-Cookie`
  frequency, removing an accidental cache suppressor on token-bearing admin HTML).
- Drift carried in the same pass: the `csrf.ts` docstrings (Strict claim, the "second tab
  reuses the same value" invariant the incident broke), `csrf.test.ts:75` asserts `'lax'`
  explicitly, the doctor-probe fixtures, the smoke-test doc, and a reference statement of the
  cookie's attributes. Invariants NOT to disturb, stated for the implementer: no CORS headers
  for `/admin`/`/media` ever; the `__Host-` prefix is the sibling-subdomain defense;
  `checkOrigin: false` pairs with the guard's own origin rule.
- Filed with a trigger, not fixed here: the magic-link confirm has no same-browser binding
  (login CSRF); the newer `createAuthChannel` seam already carries the `pendingCookie` nonce
  pattern. Ledger entry with `Reopens on:` rather than silent residue (Geoff's call pending
  on adopt-vs-file).

**2. The narrowing pass (new lead slice; the structural review's top finding).** The audit's
own sequencing section prescribes it: narrow `ContentRoutes` first ("declare the narrow return
deliberately"), then re-derive the R4 nameability closure, which re-tests adapter's ~22
C2_READDED keeps and the three closure leaks. About 30 of the 53 route-factory retires FALL
OUT of the narrowing, and the retire list's membership is not settled until it lands, so
hand-deleting first would double-touch the same files against an unstable list. This slice
also repairs the ledger as infrastructure: ~30 reshape entries carry shapes truncated
mid-sentence (`engine-rulings.md:3851` et al.); regenerate them untruncated from the
`rank-*.md` sources, and until then every slice plan routes to the rank files by name. It
also files the missing `MediaInsertPopover` deferral as its own ledger entry
(`Reopens on: the MarkdownEditor seam collapse`).

**3. The retires pass.** Executes the retire list the narrowing produced. The list this slice
owns is NOT "the 94": excluded and named in its plan header are `DEFAULT_ROLES` (a keep that
becomes a retire only inside the conventions pass's coupled `defineAccess` pair), the ~30
closure leaves the narrowing already dropped, and any second wave the re-derivation's re-tests
produce (those land where the re-test lands). Each retire closes its ledger entry. The
drift-hunt per removed name covers `docs/`, `src/` (comments), `examples/`, and `templates/`,
not `docs/` alone (`devDelivery` alone is cited in six showcase files).

**4. The conventions pass (reshapes).** The seven structural coherence families define the
target conventions, and the 57 reshapes execute against them in the same slice so no signature
is touched twice; includes the coupled pair and `createSectionAction`'s authorization
asymmetry. Its planning round decides the expected split, and the spec names the candidate cut
so the sizing is not deferred blind: first the convention rulings plus the auth and CLI
family reshapes; second the cross-surface conformance sweep. The three-edit config-contract
entry's remaining edits ((a) `rendered.extraPages`, (c) the redirect trap; edit (b) landed in
harvest-detection with a progress note) belong to this slice.

**5. The internals pass.** The ten rewrite-tier findings: the five monolith splits (~9,700
lines total, including the `MarkdownEditor` 33-prop seam collapsing onto
`registerEditor(api)`, whose collapse also re-rules the `MediaInsertPopover` deferral), the
`FieldDescriptor` exhaustiveness idiom, the coherence-thirteen, and the `src/lib` internals
map. ALSO the custom-screen content-read DOCS items: the audit's verifier overturned the
"missing read seam" finding in full (`int-verify-walk-agent.md:78-140`: `parseManifest` is
public and documented; the residue is note-tier), so the previously scheduled design session
is cancelled and replaced by the two docs items the verifier names (a "Reading cairn's own
content" section; disambiguating the two senses of "draft"). Sizing: this slice is larger
than any prior pass; its planning round is expected to split it (candidate cut: monolith
splits and the seam collapse first; the coherence-thirteen, idiom gate, and map second).

**6. The chassis pass.** `examples/showcase` improves against the changed engine (review half
done: 14 findings, none rewrite-tier). PLUS the second in-tree consumer the original spec
left unassigned: `templates/waymark` (20+ engine imports, compiled by the scaffold CI job,
the tree `create-cairn-site` bakes, and the base for the beta-path site rebuilds). Each
earlier slice keeps waymark compiling as part of its own gate (`check:consumers` and the
scaffold job make breakage loud); this slice does waymark's deliberate adaptation and the
final rebake before the cut.

## The publish ruling

**One cut, after the chassis pass.** Geoff's call: the whole remediation ships in a single
release with one `Consumers must:` list; `main` stays releasable throughout and the
already-open window (toolkit-seams, harvest-detection) rolls into the same cut.

The escape hatch is now a written procedure, not a gesture: a consumer-blocking or
security-relevant fix that cannot wait ships as a patch off the last published tag — branch
from the tag; both packages (`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`) take the patch
number; `gh release create` targets the patch branch, not `main`; the patch's CHANGELOG entry
lives on the branch and is reconciled into `main`'s window note so the eventual cut's rolled
notes do not double-count it. Whether a security-relevant fix (the `createSectionAction`
asymmetry is the live candidate) is entitled to that hatch rather than waiting for the cut is
Geoff's pending carve-out ruling.

## Standing constraints (every slice; lifted here so fresh sessions inherit them)

Test-first; the full gate is `npm run check` 0/0 plus `npm test` exit 0 plus the CI-derived
gate list re-derived from `.github/workflows/` before the first commit, never from memory;
`check:surface -- --update` on any exported-type change with the regenerated snapshot
committed; every public-API change updates its reference page in the same task; every task
adds its `CHANGELOG.md` line under `## Unreleased` with a `Consumers must:` line where consumer
action is needed; a task executing a ruling closes (or progress-notes) its ledger entry in the
same task; the drift-hunt scope above; `templates/waymark` compiles at every slice's gate; no
version bump, no publish. Plan headers carry a token ceiling that covers the WHOLE pass,
chains plus ritual (toolkit-seams data point: 2.4M chain ceiling, ~4.3M pass), and a
checkpoint interval.

## Handoff

`docs/STATUS.md` names this spec as the initiative's frame (not only the window clause).
Fresh session per slice; the handoff artifacts are this spec, STATUS, the ledger, and the
slice's own plan. The hardening pass additionally waits for the harvest-detection merge
(shared files); the internals pass coordinates with nothing in flight by construction
(surface settled first).
