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

## Immediate next action (2026-08-03: C2b is DONE and unmerged; next is the ambient-defaults audit)

**Pass C2b is complete**, fifteen commits on `c2b-refusal-channel` (worktree
`.claude/worktrees/c2b-refusal-channel`, off `main` at `8559f3e7`), ending at `f0098d4b`. **It is
NOT merged and NOT pushed**, deliberately: no merge was asked for. It holds in the same
`## Unreleased` window as C2, so the window now carries five passes.

Every gate verified by the orchestrator rather than only reported: `npm run check` 1559 files 0/0,
`npm test` exit 0 at 4768 tests, `check:consumers` OK (which covers the showcase `svelte-check`, 585
files 0/0). Three full-page renders were read in the main loop, including a crafted phishing link
that renders nothing at all. Full detail and the post-mortem:
`docs/superpowers/plans/2026-08-03-c2b-refusal-channel.md`.

**Two decisions to make before the next pass starts.** Neither blocks the audit.

1. **Merge C2b to `main`** (a PR, as C2 used), or leave it on the branch. The window holds
   unpublished either way.
2. Whether the ambient-defaults audit wants a multi-agent sweep. It is one lens per surface, which
   suits a workflow, and it needs an explicit opt-in.

**Resume prompt** (fresh Opus 5 session, launched from `~/Projects/cairn-cms`):
"Run the ambient-defaults audit. Read `ROADMAP.md`'s Now tier entry for it (the method, the surface
list, the three-way who-chose-this test, and the report-don't-fix boundary) and
`docs/internal/2026-08-03-ai-crawler-posture-research.md` for the evidence and the measured
four-site audit. It runs BEFORE the AI-posture pass, which is its first consumer, and both run
before the site migrations. Ask first whether C2b should merge to `main`."

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
