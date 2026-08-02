# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(see the Archives section at the end of this file),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.

## Immediate next action (2026-08-02: phase C1 DONE and holding; next is phase C2, the naming pass)

**TWO PASSES ARE NOW UNMERGED, BY DECISION. This changes where C2 branches from.** ASC seams pass
two sits on `asc-engine-seams-2` ([PR #16](https://github.com/glw907/cairn-cms/pull/16)), and phase
C1 sits on `pre-beta-c1-seam-shape`, which is branched off it. `main` carries NEITHER. So **C2
branches off `pre-beta-c1-seam-shape`**, never off `main`: a cold session branches off `main` by
default and would build against an engine missing the `./cloudflare` subpath, `createD1AuditSink`,
the corrected surface snapshot, and every C1 ruling. Both worktrees stay in place until they merge.

**Phase C1, the seam-shape pass, is DONE and HOLDS UNPUBLISHED.** All five ROADMAP contract entries
landed across twelve commits. The window (still pass two's `## Unreleased`, `release-size: minor`)
now also carries C1. One entry has real consumer content: **a site's `App.Platform['env']` must
intersect `CairnPlatformBindings`**, which was previously documented as a recommendation. The
post-mortem is appended to `docs/superpowers/plans/2026-08-01-pre-beta-c1-seam-shape.md`.

What C1 settled, in one line each:

1. **The surface snapshot stopped lying about nullability.** `normalizeSignature` stripped
   `| undefined` unconditionally and `check-surface.mjs` imports it, so `| undefined` occurred ZERO
   times in `api-surface.md`. The regen corrected 27 entries across 8 subpaths, return types
   included. No reference page needed editing.
2. **The env-genericity sweep changed no type**, and that conclusion is scoped: it holds for a site
   that intersects `CairnPlatformBindings`, NOT for a bare `wrangler types` env. See below.
3. **Function-color rulings** are recorded per seam. `render(md)` needed nothing: it has been
   `Promise<string>` since `0.76.0`, and the ROADMAP entry claiming otherwise was five weeks stale.
4. **Five refusal channels are documented** (the entry said two). The third, `requireOwner`/
   `requireAccess` throwing SvelteKit-native `error()`, is the one the custom-screen guide teaches
   first.
5. **The supported-toolchain matrix** ships at `docs/reference/supported-toolchain.md`, plus
   `engines: { node: ">=22" }`. The TypeScript floor is 5.0, forced by `const` type parameters on
   the public surface, far below the `^6.0.3` the engine develops against.

**The defect C1 found and deliberately did NOT fix, which C2 inherits.** `AdminActionError`'s
`status` never reaches the browser: SvelteKit derives a response status only from its own
`HttpError`/`SvelteKitError`, so a plain `Error` subclass always renders 500, and `handleError`
receives the status as an input and cannot change it. A 403 authorization refusal is therefore
indistinguishable from an engine fault in logs and monitoring. Not a security defect (the refusal
still happens, fail-closed) and not urgent (the guard refuses both conditions pre-routing, so the
branches rarely fire), but not something to carry into beta. The filed shape: converge the channel
rather than document the workaround, with `adminAction`'s missing-editor branch throwing
`redirect(303, '/admin/login')` and its CSRF branch throwing `error(403, ...)`. The security review
argued specifically AGAINST adding an `isAdminActionError` guard, on the grounds that making the
workaround comfortable removes the pressure to remove the need for it.

**NEXT: phase C2, the naming pass** (ROADMAP, "The pre-beta pass series and the two-release
shape"). Its shape is unchanged: a Fable sitting over `docs/internal/api-surface.md` settles the
rename set and the `locals` policy, then ONE execution pass lands every rename in one diff with one
`Consumers must:` list. It is the only genuinely breaking pass in the series. Two things that are
different now than when C2 was described:

1. **The snapshot it reads is finally accurate.** That was C1's first task and the whole reason it
   ran first. The sitting reads real nullability for the first time.
2. **Four C2 carry-ins are filed in ROADMAP's Next tier**, and they are inputs to the sitting, not
   separate work: the refusal-channel convergence above; the env-genericity decision whole (whether
   the route factories become generic over `Env`, which is NOT free the way pass one's
   `AdminActionEvent` fix was, since a site would have to write `createCairnAdmin<SiteEnv>(runtime)`
   explicitly); the two near-identical log event names `admin.audit.sink_failed` and
   `admin.action.audit_sink_failed`, both still unpublished so the rename is free; and a gate gap
   where `check:reference:signatures` reads only fenced `ts` blocks, leaving a signature stated only
   in a reference table ungated.

**Resume prompt**, from `~/Projects/cairn-cms`: "Run the phase C2 naming sitting per `cairn-pass`.
Read `docs/internal/api-surface.md` as the review document (C1 corrected it; it now records
nullability). ROADMAP's Next tier carries the four C2 carry-ins C1 filed, which are inputs to the
sitting rather than separate work. The sitting settles the rename set plus the `locals` namespace
policy; execution is ONE pass landing every rename in one diff with one `Consumers must:` list.
Branch the execution worktree off `pre-beta-c1-seam-shape` (NOT off `main`: pass two and C1 are both
deliberately unmerged, so `main` lacks the `./cloudflare` subpath, `createD1AuditSink`, the corrected
snapshot, and every C1 ruling). Hold unpublished at close unless a consumer needs it."

**Open question for Geoff, still unanswered and now due.** Where the two feature design sittings
(history/revert, preview) slot against the standing template queue (the optical-centering ratchet,
the cairn.pub voice sitting, the ASC Assets trial, Topo, the scaffolder). C1 said this call comes due
after it. It is now after it.

**A process finding worth keeping.** C1's review gate found five real defects with every gate green,
three of them the species pass two named: a claim the code makes about itself, invisible to every
mechanical check. The most important was that Task 2's compile fixtures built their site env from
cairn's own types, so part of what they proved was circular. A negative control (which C1 ran, and
which passed) proves a fixture CAN fail; it does not prove the fixture models the real input.
**When a fixture stands in for a consumer, build its input from the consumer's sources, not from the
library's own types.**

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN; cairn-side mitigation weighed in ROADMAP); mermaid
diagrams near-illegible at 320/390 (candidate: the Topo pass); section-index breadcrumbs duplicating
the arm name; the cairn.pub live admin smoke (Geoff's magic link plus publish round-trip) is owed;
the `/admin/help` first-steps card overlap (ROADMAP, Now); the `sideEffects` coverage gate filed as
mechanical hardening. ASC's own retrofits run in that repo on its own clock, both seams passes now
landed.

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`,
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries), `STATUS-archive-2026-07-19-to-2026-07-20.md` (the chassis-nav pass and the
v0.88.3 safelist publish), `STATUS-archive-2026-07-21-to-2026-07-28.md` (design-infrastructure
Passes 1 and 2 phase by phase, the `0.89.x` and `0.90.x` publishes, and the admin-toolkit
organization pass), and `STATUS-archive-2026-07-29-to-2026-08-01.md` (the `0.91.0` publish, the
`0.91.1` hotfix and ASC harvest fold, the `0.92.0` design-ratchet minor, and the xcathletes seams
pass as planned).
