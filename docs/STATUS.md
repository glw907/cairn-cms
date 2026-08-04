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

## Immediate next action (2026-08-04: the auth-channel plan is APPROVED; execute it)

**Execute the auth-channel factory plan**:
[`docs/superpowers/plans/2026-08-03-auth-channel-factory.md`](superpowers/plans/2026-08-03-auth-channel-factory.md),
eight tasks, against spec **v3.1**
[`docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md`](superpowers/specs/2026-08-03-auth-channel-factory-design.md).
Method: a fresh worktree `.claude/worktrees/auth-channel` off `main`, per-task `cairn-implementer`
dispatches (pinned Sonnet), test-first, with the main loop reviewing each diff and confirming the
full gate between dispatches.

**Read the spec's revision log before the first dispatch.** Three adversarial rounds ran during the
planning sitting and the first two rejected the design outright. The load-bearing rule the whole
design is built from, repeated as a standing constraint in the plan:

> **No control keyed on the victim's identity may deny, delay, or destroy anything. Denial keys on
> the requester. Identity-keyed controls either escalate through a channel the site can act on, or
> they only log.**

Three rounds died on violations of it, the third inside the mechanism written to prevent the
second. The lockout regression tests in Tasks 3 and 4 are the structural guard and are specified
with ordering, cookie-jar separation, and full-Defaults-table scope for that reason. **v3.1 itself
was not reviewed**; Task 8's mandatory `web-auth-security-reviewer` is where an amendment defect
gets caught. Provenance:
[`docs/internal/2026-08-04-auth-channel-review-rounds.md`](internal/2026-08-04-auth-channel-review-rounds.md).

**The window is open.** Verified 2026-08-04: xcathletes Task 4 has not run (Tasks 1 through 7 all
queued in ecxc-ski, `xcathletes-org` does not exist, zero implementation code). The seam must land
before it does, or the consumer hand-writes the code the seam exists to replace.

**This pass is NOT releasable on its own.** The consumer proof is **pass 2** (the showcase
`/members` fixture, its `MEMBER_DB` binding and migration-apply step, dev-gate integration, the
e2e, and the `.cairn-template.json` scaffolder exclusion), so nothing proves the built package
through a consumer's bundler until that lands. The exclusion is load-bearing:
`scripts/emit-template.mjs` copies the showcase verbatim minus four excluded paths, so a fixture
with a code-readback route would ship into every scaffolded site as an unauthenticated OTP oracle.

**Then:** pass 2, the AI-posture pass, the RC cut, the migrations.

**The window still HOLDS UNPUBLISHED** at `0.93.0`. `package.json` is untouched and the changelog
window is `## Unreleased`, carrying the ASC seams pass two, C1, the refusal-channel convergence,
C2, and C2b.

**The ambient-defaults audit is RUN** (2026-08-03), report at
[`docs/internal/2026-08-03-ambient-defaults-audit.md`](internal/2026-08-03-ambient-defaults-audit.md).
It does not gate the RC. One finding is recommended for this window and is a judgment call: the
engine's admin HSTS is `max-age=63072000; includeSubDomains` unconditionally, so one editor visit
to `/admin` pins a site's apex and every subdomain to HTTPS for two years, including on zones whose
owner left edge HSTS off. Everything else triaged to phase P or to the operator.

**The AI-posture pass** consumes the audit and lands before the migrations so each site adopts a
posture in the session that migrates it. The audit's answer to its shared-shape question: the
ambient defaults do **not** want one policy surface. They split into behavior the engine emits
(headers, cache directives, cookie attributes) and behavior the engine can only observe (the
managed robots layer, zone TLS settings, DNS mail authentication). A posture config belongs to the
first group; the second wants a check.

**Resume prompt** (fresh Opus 5 session, launched from `~/Projects/cairn-cms`):
"Execute the auth-channel factory plan (`docs/superpowers/plans/2026-08-03-auth-channel-factory.md`)
against spec v3.1. Read the spec's revision log and the throttle rule first, create the worktree off
`main`, then dispatch Task 1 to `cairn-implementer`."

**Carry this warning into every dispatch.** This pass's orchestrator derived the CI gate list from
`.github/workflows/test.yml` once and then retyped it from memory across nine dispatches, dropping
`check:consumers`. A real consumer-facing `ActionData` collision therefore survived to Task E
instead of failing at Task B1. **Paste the list out of the workflow file into each dispatch; do not
retype it.**

**Background for the AI-posture pass.** The measured audit found 907.life and aksailingclub.org
edge-blocking AI crawlers while cairn.pub and ecxc.ski do not, chosen by nobody, and found that
Cloudflare's managed robots.txt prepends to the origin's rather than replacing it, so cairn cannot
assume the robots.txt it emits is the one that ships. Comparables research covering 22 tools landed
at `docs/internal/2026-08-03-ambient-defaults-comparables.md` and
`docs/internal/2026-08-03-runtime-cms-comparables.md`; read their coverage tables first, since both
sweeps had thin spots.

**FOUR consumer sites, each on its own `0.x` caret**, which admits only its own minor, so a site
more than one minor behind crosses several earlier `Consumers must:` lists on the way to this
window:

| Repo | Range | Behind |
|---|---|---|
| `907-life` | `^0.84.4` | 0.85 through 0.93, plus this window |
| `cairn-pub` | `^0.87.4` | 0.88 through 0.93, plus this window |
| `aksailingclub-org` | `^0.91.1` | 0.92, 0.93, plus this window |
| `ecxc-ski` | `^0.93.0` | this window only |

(`~/Projects/asc-site` is a second checkout of `aksailingclub-org`, not a fifth consumer.)
**cairn.pub is a consumer and the project's own site**, a docs shell six minors behind the engine it
documents; it migrates right after ASC, and the owed cairn.pub live admin smoke (Geoff's magic link
plus a publish round-trip) folds into that same session rather than staying a separate debt.

**The order after the auth-channel passes and the AI-posture pass:** cut `0.94.0-rc.1` rather than
the final number, migrate ASC and cairn.pub against the RC from their own repos, mint `0.94.0` once
their gates are green, migrate the remaining two off the recipe the first migration writes into
`docs/guides/upgrade-cairn.md`, then phase P with the four-CI-gates consolidation pulled forward,
then phase F with F1 and F4 batched into one Fable sitting. Scaffolder and Topo stay last. The RC
exists because `examples/showcase` is a stand-in cairn wrote for itself.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN); `config.kit.csrf.checkOrigin` is an ACTIVE
deprecation warning in the toolchain this repo builds against (kit#15992, watched by a scheduled
routine) and prints on every showcase build; mermaid diagrams near-illegible at 320/390;
section-index breadcrumbs duplicating the arm name; the `/admin/help` first-steps card overlap; the
`sideEffects` coverage gate filed as mechanical hardening. ASC's own retrofits run in that repo on
its own clock.

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
The C1 seam-shape pass, the refusal-channel convergence, and the C2 window as it stood before
merging are in `STATUS-archive-2026-08-02-to-2026-08-03.md`.
