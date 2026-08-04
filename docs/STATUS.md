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

## Immediate next action (2026-08-03: the ambient-defaults audit is RUN; next is the auth seam)

**Pass C2b is complete and MERGED to `main`** ([PR #20](https://github.com/glw907/cairn-cms/pull/20),
merge `51d55dd3`; fifteen commits from `c2b-refusal-channel`, branched off `main` at `8559f3e7`).
All five CI workflows green on the merged head (`test`, `e2e`, `design`, `norms`, `scaffold`).

**The window HOLDS UNPUBLISHED.** `package.json` is untouched and the changelog window is still
`## Unreleased`, now carrying five passes: the ASC seams pass two, C1, the earlier refusal-channel
convergence, C2, and C2b. Nothing is cut until the ambient-defaults audit and the AI-posture pass
land with it.

The worktree `.claude/worktrees/c2b-refusal-channel` still exists and is now redundant; remove it
whenever convenient (`git worktree remove`).

Every gate verified by the orchestrator rather than only reported: `npm run check` 1559 files 0/0,
`npm test` exit 0 at 4768 tests, `check:consumers` OK (which covers the showcase `svelte-check`, 585
files 0/0). Three full-page renders were read in the main loop, including a crafted phishing link
that renders nothing at all. Full detail and the post-mortem:
`docs/superpowers/plans/2026-08-03-c2b-refusal-channel.md`.

**The ambient-defaults audit is RUN** (2026-08-03), as a 14-agent workflow: one lens per surface
plus an adversarial verifier per surface. Report:
[`docs/internal/2026-08-03-ambient-defaults-audit.md`](internal/2026-08-03-ambient-defaults-audit.md).
It reported and fixed nothing, per its own boundary.

**It does not gate the RC.** One finding is recommended for this window and the recommendation is a
judgment call, not a forced hand: the engine's admin HSTS is `max-age=63072000; includeSubDomains`
unconditionally, so one editor visit to `/admin` pins a site's apex and every subdomain to HTTPS for
two years, including on zones whose owner left edge HSTS off (measured on cairn.pub). It is not
API-breaking, so it could defer; it is recommended to ride because the fix changes a security header
four deployed sites emit and the migrations open each site anyway. Everything else triaged to phase P
or to the operator. The audit's own inputs needed three corrections, all recorded in the report,
including that the ASC cairn site is `dev.aksailingclub.org` rather than the apex.

**The pre-RC queue, in order** (Geoff, 2026-08-03). Both remaining items are additive and ride the
same unpublished window:

1. **The auth seam** (ASC seam 1 as a `create*` factory) — a Fable planning sitting, then execution.
   Its input is ready and its window closes the session xcathletes runs Task 4 of its platform pass.
   This is now the immediate next action.
2. **The AI-posture pass** — consumes the audit, lands before the migrations so each site adopts a
   posture in the session that migrates it. The audit's answer to its shared-shape question: the
   ambient defaults do **not** want one policy surface. They split into behavior the engine emits
   (headers, cache directives, cookie attributes) and behavior the engine can only observe (the
   managed robots layer, zone TLS settings, DNS mail authentication). A posture config belongs to
   the first group and should not try to absorb the second; the second wants a check.

Then the RC cut and the migrations.

**Resume prompt** (fresh session, launched from `~/Projects/cairn-cms`):
"Plan the auth seam: ASC seam 1 as a `create*` factory. Read `ROADMAP.md`'s Now tier entry for it
(the shaping principle, what the factory owns versus what the site supplies, and the SMS threat-model
section) and the `cairn-auth-seam-factory` memory. The window closes when xcathletes runs Task 4 of
its platform pass, so confirm that has not happened first."

**Carry this warning into every dispatch.** This pass's orchestrator derived the CI gate list from
`.github/workflows/test.yml` once and then retyped it from memory across nine dispatches, dropping
`check:consumers`. A real consumer-facing `ActionData` collision therefore survived to Task E
instead of failing at Task B1. **Paste the list out of the workflow file into each dispatch; do not
retype it.**

**Two initiatives were scoped during this pass and sit in `ROADMAP.md`'s Now tier**, both sequenced
ahead of the site migrations by Geoff: the **ambient-defaults audit** ("what does a deployed cairn
site do that nobody decided?"), then the **AI-posture pass**. The measured audit found 907.life and
aksailingclub.org edge-blocking AI crawlers while cairn.pub and ecxc.ski do not, chosen by nobody,
and found that Cloudflare's managed robots.txt prepends to the origin's rather than replacing it, so
cairn cannot assume the robots.txt it emits is the one that ships. Comparables research covering 22
tools landed at `docs/internal/2026-08-03-ambient-defaults-comparables.md` and
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

**The order after the audit and the AI-posture pass:** cut `0.94.0-rc.1` rather than the final
number, migrate ASC and cairn.pub against the RC from their own repos, mint `0.94.0` once their
gates are green, migrate the remaining two off the recipe the first migration writes into
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
