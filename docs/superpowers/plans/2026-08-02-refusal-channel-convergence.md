# Refusal-channel convergence: `adminAction` stops needing a `handleError`

> **For agentic workers:** dispatch each task to `cairn-implementer` (pinned Sonnet); the main loop
> reviews each diff and confirms the full gate between dispatches. Steps use checkbox (`- [ ]`) syntax.

**Goal:** make `adminAction`'s refusals convey their own meaning, so a site needs no `handleError`
mapping and an authorization refusal stops reading as an engine fault.

**Authority:** phase C1's post-mortem
(`docs/superpowers/plans/2026-08-01-pre-beta-c1-seam-shape.md`) and the `web-auth-security-reviewer`
finding it records. Geoff ratified the fix over the documented workaround (2026-08-02).

**Branch:** `refusal-channel-convergence`, worktree `.claude/worktrees/refusal-convergence`, off
`main`. Both prior passes merged (PRs #16 and #17), so `main` is current and the stack is collapsed.

## The defect

`AdminActionError extends Error`. SvelteKit derives a response status only from its own `HttpError`
and `SvelteKitError` (`node_modules/@sveltejs/kit/src/utils/error.js`, `get_status`), so a plain
`Error` subclass always renders **500**. `HandleServerError` receives `status` as an INPUT and
returns `void | App.Error`, so a site's `handleError` shapes the message and cannot change the code.

`AdminActionError(403, ...)` therefore reaches the browser as a 500 no matter what a site does. An
authorization refusal is indistinguishable from an engine fault in logs, in monitoring, and to the
editor, and the 500 tells a client a retry might succeed, which is the wrong instruction for a
refusal. C1 documented this truthfully; this pass removes it.

## The shape (from the security review, ratified)

`adminAction` has three throw sites (`src/lib/sveltekit/admin-action.ts:151,159,212`). Two are
authorization refusals that a framework-native throw expresses correctly; the third is a genuine
500 and stays.

| Site | Today | After | Why |
|---|---|---|---|
| `:151` no `event.locals.editor` | `AdminActionError(403)` | `redirect(303, '/admin/login')` | Matches `requireSession` (`guard.ts:151`) exactly. An editor whose session expired needs the login page, not an error page. |
| `:159` CSRF mismatch | `AdminActionError(403)` | `error(403, ...)` | A genuine refusal, not a session expiry. SvelteKit renders 403 natively through the nearest `+error.svelte`. |
| `:212` dev unaudited | `AdminActionError(500)` | unchanged | Really is a 500, and really is a developer-facing defect signal. |

**`AdminActionError` stays exported**, now meaning only the dev-only unaudited-action signal. Removing
the export is a rename, and renames belong to C2.

**Revisit, do not preserve, the existing rationale.** The comment at `admin-action.ts` argues the
missing-editor case "throws a 403, never a redirect, since an action is not a page navigation." That
reasoning produced a 500 in practice, which is worse than either option it weighed. Replace it.

## Global constraints

- Full gate per task: targeted test green, `npm run check` ending `0 ERRORS 0 WARNINGS`, `npm test`
  exit 0. Run `npm test` UNPIPED or read `PIPESTATUS`; `| tail` captures tail's exit status.
- The four CI-only gates by name before close: `check:comments`, `check:reference:signatures`,
  `check:surface`, `check:snippets`.
- `scripts/check-reference-signatures.mjs`'s `ALLOWLIST` is an EXEMPTION list. Add nothing to it.
- Documentation goes LAST, after the code settles (the standing rule since pass two).
- Changelog under the EXISTING `## Unreleased` window. No version bump, no publish.
- Commit specific files, imperative mood, `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

### Task 1: converge the two authorization branches

**Deliverables: 2** (the two converged throws; their tests.)

- [ ] Write the failing tests first: a missing-editor action redirects to `/admin/login` with 303;
      a CSRF mismatch throws SvelteKit's own `error(403)`. Match the existing admin-action suite's
      setup idiom. Use `isRedirect`/`isHttpError` (already imported in this file) to assert the
      thrown shape rather than matching on message text.
- [ ] Convert the two sites. Match `requireSession`'s redirect exactly, including the status and the
      literal path, so the two refuse identically. Verify the path against `guard.ts` rather than
      trusting this plan.
- [ ] Give the CSRF `error(403, ...)` a message safe to render to a browser. It reaches an error page
      now, where the old message never did. Keep the specific reason in the log, not in the response.
- [ ] Leave `:212`'s dev-only `AdminActionError(500)` untouched.
- [ ] Rewrite the doc block on `adminAction` and on `AdminActionError` to describe the new model.
      `AdminActionError`'s block currently explains that its `status` is decorative; that explanation
      exists because of the defect this task removes, so it goes with it. The class now means one
      thing: a dev-time unaudited-action defect.
- [ ] Check `createSectionAction`, which composes `adminAction` underneath: its own branches return
      `fail(...)` and must be unaffected, but `section-action.ts:75`'s comment describes the old
      propagate-and-map behavior and needs correcting. Confirm its suite still passes; a section
      action with no editor now redirects rather than throwing, which is the intended improvement.
- [ ] Search the whole tree for other assertions or comments that assume the old behavior.

**Acceptance:** new tests green; `npm run check` 0/0; `npm test` exit 0; `check:surface` regenerated
only if the exported surface actually moved (it should not: no signature changes).

---

### Task 2: retire the `handleError` requirement from the docs

**Deliverables: 4** (the reference; the guide; the showcase; the close artifacts.)

Documentation task. The code has settled.

- [ ] `docs/reference/sveltekit.md`: the refusal-channel model C1 wrote now has three developer-facing
      channels collapsing to two. `adminAction`'s authorization refusals are the same framework-native
      `error()`/`redirect()` channel as `requireOwner`/`requireAccess`, so the "thrown
      `AdminActionError` needs a site `handleError`" channel disappears for every production path.
      Rewrite the model rather than patching it: a reader should meet two channels, not three with a
      footnote. Keep the pre-routing raw-`Response` and built-in-redirect cross-references.
- [ ] `docs/reference/sveltekit.md`: remove the `handleError` requirement from the `adminAction`
      section and from the `createSectionAction` section (C1 added it to both). Rewrite
      `AdminActionError`'s type-table row: it no longer describes a production refusal channel.
- [ ] Keep C1's warning that defining a `handleError` REPLACES SvelteKit's default error logging.
      That fact is still true and still useful; it just no longer arrives attached to a cairn
      requirement.
- [ ] `docs/guides/add-a-custom-admin-screen.md`: C1 added a passage contrasting three refusal shapes
      at the layout-guard transition. Two of the three have now converged. Rewrite it.
- [ ] `examples/showcase/src/hooks.server.ts`: C1 added a `handleError` mapping `AdminActionError`.
      That mapping is now pointless, and the hook's only remaining job would be logging, which is
      exactly what SvelteKit's default already does. **Delete the hook**, restoring the default. That
      is the honest demonstration that cairn needs no `handleError`, and it is the strongest possible
      statement of what this pass bought. Verify the showcase still builds and typechecks.
- [ ] `CHANGELOG.md`, existing `## Unreleased` window: one entry.
      `Consumers must: remove any AdminActionError mapping from handleError; adminAction's
      authorization refusals are now SvelteKit's own redirect() and error(403), which need no mapping.`
      Note that a site relying on the old 500 for alerting will now see a 303 and a 403 instead.
- [ ] The matching window in `docs/guides/upgrade-cairn.md` (the `docs-links` parity gate ties them).
- [ ] `ROADMAP.md`: remove the C2 carry-in for this convergence; it is shipped. Leave the other three
      C1 carry-ins.
- [ ] `docs/STATUS.md`: **it is currently WRONG and this is urgent.** It says two passes are unmerged
      and that C2 branches off `pre-beta-c1-seam-shape`. Both merged (PRs #16, #17) on 2026-08-02, so
      the stack is collapsed and everything branches off `main` again. Rewrite the entry for this
      pass, and make the next action C2 with the corrected topology. Also record the ordering reason
      this pass ran before C2: `AdminActionError`'s meaning changed, and C2 should not name a symbol
      mid-change.

**Acceptance:** `check:docs`, `check:reference`, `check:reference:signatures`, `check:snippets`,
`check:arm-indexes`, `check:version` green; showcase build green.

---

## Acceptance for the pass

- Both tasks' criteria met; full gate plus the four CI-only gates by name.
- `web-auth-security-reviewer` fan-out folded. This pass changes auth refusal behavior, so it is
  mandatory, not optional.
- No documented path still tells a site to map `AdminActionError`.
- Holds unpublished on `refusal-channel-convergence`.

---

## Post-mortem (2026-08-02)

**Shipped.** Both tasks plus the security-review fold, five commits on `refusal-channel-convergence`
(`f7f93e01` the convergence, `f056a856` the docs retirement, `576c620d` the fold, plus the plan and
the main merge). Holds unpublished in the shared `## Unreleased` window. Full gate green at close:
`npm run check` 0/0, `npm test` exit 0 unpiped (4722 tests), every named gate including the four
CI-only ones, showcase build and typecheck against this worktree's own engine.

**What changed.** `adminAction`'s two authorization-era refusals ride SvelteKit's own channels:
missing editor logs `admin.action.session_absent` and redirects `303` to `/admin/login` (matching
`requireSession` exactly); a CSRF mismatch logs `admin.action.csrf_rejected` and throws kit's
`error(403, ...)` with a browser-safe message. `AdminActionError` survives as exactly one thing, the
dev-only unaudited-action signal. The `handleError` requirement is retired from the reference, the
guide, and the showcase (whose hook is deleted, restoring kit's default logging). The implementer
verified both converged shapes against kit 2.61.1's action source on BOTH the enhanced and
plain-form paths before reporting, which is the assumption-checking this arc keeps proving
necessary.

**What the mandatory review earned.** Verdict sound, but it found the pass had built asymmetries in
both directions:

1. **The layers disagreed on what counts as a CSRF witness.** The guard accepts a valid
   `X-Cairn-CSRF` header and short-circuits; `adminAction` read only the `csrf` form field. A
   fetch-based custom action using the header (the engine's own documented media-upload pattern)
   would clear the outer gate and 403 on the inner one, every request, benignly, and the new
   log-events row told operators to treat exactly that as a possible attack. The fold aligned the
   inner check on the same helper (`validateCsrfHeader` first, form-field fallback), which is the
   correct direction: an inner defense-in-depth layer must accept at least what the outer layer
   deliberately admits.
2. **One converged branch got observability and the other lost its only signal.** The CSRF branch
   gained a log event; the missing-editor branch silently 303ed, having lost the loud
   `AdminActionError` message it used to carry. A developer mounting an action outside the guard's
   coverage would read the symptom as "sessions keep expiring." Now logged as
   `admin.action.session_absent`.
3. The review also corrected a conflation this pass INTRODUCED: grouping `adminAction` with the
   `require*` helpers as "authorization." It authenticates and verifies CSRF; it authorizes nothing,
   and a `none`-capability editor reaches the handler. The docs now say so and point at
   `requireAccess`/`createSectionAction` for capability checks.

The species ledger, across C1 and this pass: C1's reviews caught code breaking promises the docs
made; this one caught a doc making an operational promise the code's own outer layer falsifies. Same
seam, both directions. The claims-verification docs audit now filed as a 1.0 gate (ROADMAP, "Toward
1.0") is that lesson made structural.

**Smaller fold items.** `createSectionAction`'s rate-limit catch now rethrows kit control-flow shapes
instead of degrading them to open, mirroring the audit-sink guard. The changelog and upgrade guide
name the UX consequence (both refusals navigate away, discarding unsaved input, where the old 500
left the page recoverable). The reference inlines a log-first `handleError` snippet instead of
pointing at the showcase file that no longer demonstrates it. ROADMAP's P1 cluster notes the showcase
exercises neither `adminAction` nor the converged paths end to end, so kit-version drift in
action-thrown rendering would go uncaught.

**Sequencing note.** This pass ran before C2 because it changed what `AdminActionError` means, and
the naming sitting should not name a symbol mid-change. The full breaking-window agenda (eleven
items in, four out) is `docs/superpowers/specs/2026-08-02-c2-breaking-window-agenda.md`; this pass
added two entries to its vocabulary item (the `csrf_rejected`/`guard.rejected` pair and the
`session_absent` naming).

**Carried.** The docs claims-verification audit (1.0 gate, filed). The showcase adminAction coverage
gap (P1). The guard's own unlogged redirect paths (deliberately untouched here; the consistency call
is C2-adjacent vocabulary work). Whether `AdminActionError` keeps its name in its shrunken role is
agenda item 8.
