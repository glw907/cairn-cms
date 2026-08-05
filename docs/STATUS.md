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

## Immediate next action (2026-08-04: pass 2 is PLANNED; a fresh Opus 5 session executes it)

**The factory pass is merged** (Geoff approved 2026-08-04; merge commit `06b3470d`, twelve pass
commits): the full `./auth-channel` subpath, 164 tests across seven suites, docs arm complete,
post-mortem appended to the plan. Post-merge `npm test` on `main` exits 0 (4932 tests), which also
cleared the `docs-links` red that the planning-era provenance commit had left on `main`. The
pass-end review ran as an adversarial find-and-verify workflow (24 raw findings, 12 confirmed, all
folded; two majors: an unclosed `formData()` consumption and a guide migration-directory
cross-apply). Details in the plan's post-mortem:
[`docs/superpowers/plans/2026-08-03-auth-channel-factory.md`](superpowers/plans/2026-08-03-auth-channel-factory.md).

**Pass 2 is planned and approved** (2026-08-04, Fable sitting). Spec:
[`docs/superpowers/specs/2026-08-04-auth-channel-consumer-proof-design.md`](superpowers/specs/2026-08-04-auth-channel-consumer-proof-design.md)
(**v2** after a two-lens adversarial round; read the revision log). Plan:
[`docs/superpowers/plans/2026-08-04-auth-channel-consumer-proof.md`](superpowers/plans/2026-08-04-auth-channel-consumer-proof.md)
(eight tasks, worktree `.claude/worktrees/auth-channel-2` off `main`). Two findings from the
round matter beyond this pass: the dev-fold grep gate in `e2e.yml`/`scaffold.yml` is **vacuous
today** (adapter-cloudflare 7 stopped bundling, so the grepped directory holds no server code;
Task 2 repairs it with a wrangler dry-run target and a positive control), and `test:emit` runs
in no CI workflow (the new emitted-tree test lands in `src/tests/unit/` instead).

**The rule that governed the pass, for pass 2's context:**

> **No control keyed on the victim's identity may deny, delay, or destroy anything. Denial keys on
> the requester. Identity-keyed controls either escalate through a channel the site can act on, or
> they only log.**

Execution-locked decisions beyond the spec (the `requester_bucket` column, the sweep-on-mint
housekeeping, the escalation-refund exits, the backwards-timestamp guard in `charge()`) are in the
post-mortem; none has had its own adversarial round, so pass 2's review gate should read that list.

**The window remains open but is now consumable.** xcathletes Task 4 still has not run
(`xcathletes-org` does not exist as of this pass's close). Once the merge lands and a release is
cut, the consumer builds against the factory instead of hand-writing it.

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

**Resume prompt** (fresh session, launched from `~/Projects/cairn-cms`; execution runs on Opus 5
per the model economy):
"Execute `docs/superpowers/plans/2026-08-04-auth-channel-consumer-proof.md` with `cairn-pass`,
task-by-task via `cairn-implementer` dispatches, on a fresh worktree
`.claude/worktrees/auth-channel-2` off `main`. Read the plan's authority spec (v2) in full first,
run each dispatch's gates in the foreground, and paste the CI gate list from
`.github/workflows/test.yml` into every dispatch."

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
