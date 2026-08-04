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
tools is in the closing session's scratchpad (`ambient-defaults-comparables.md`,
`runtime-cms-comparables.md`) and should be moved into `docs/internal/` when the audit opens.

## Superseded: the pre-C2b entry (2026-08-03: C2 is MERGED; next is pass C2b)

**C2, the breaking-window pass, is DONE and merged to `main`** (PR #19, merge `ce81ab40`; 214
files, 27 commits). All four CI workflows green on the merged sha. **The window HOLDS
UNPUBLISHED**: `package.json` is untouched, the changelog window is still `## Unreleased`, and no
release is cut until C2b lands with it.

**NEXT: pass C2b, the refusal-channel convergence.** It is Task 12 of the C2 plan (ruling R10),
cut out mid-execution under the pre-approved split. Branch a NEW worktree off `main` for it
(`main` now carries all of C2, so branching off `main` is correct this time). The full ruling,
the file list, and the acceptance criteria are in
`docs/superpowers/plans/2026-08-02-c2-breaking-window.md` under "Task 12"; that plan's post-mortem
carries what C2b inherits.

What C2b carries:
- The 24 `ReturnType<typeof fail>` annotations become precise `ActionFailure<...>` of the nine
  exported failure shapes, so a consumer's generated `ActionData` stops collapsing to `{}`.
- In-place redirect-refusals become `fail()`, rendered from the components' `form` prop.
- Cross-route bounces carry a bounded error code the load resolves server-side, closing the
  confirmed credential-phishing surface where eight loads render an attacker-chosen `?error=`
  sentence verbatim in the branded alert.
- **The `requireAccess` asymmetry**, inherited from C2: `createSectionAction` derives its
  authorization target from `event.route.id` while `guard.ts`'s `requireAccess` still defaults to
  the attacker-influenceable `event.url.pathname`. **Read the C2 post-mortem before touching this:
  C2 had to add route-group normalization to that derivation, because a SvelteKit route id carries
  `(group)` segments and a URL never does. Moving `requireAccess` onto `route.id` without reusing
  that normalization reintroduces a fail-closed 403 for every session on any route-group layout.**
- Read `docs/internal/2026-08-01-asc-consumer-brief.md`'s seam 2 first: ASC hand-rolled
  `club-action.ts` because neither `adminAction` nor `requireAccess` served it, so the fix and the
  seam request may want shaping together.

**Resume prompt** (fresh Opus 5 session, launched from `~/Projects/cairn-cms`, on `main`):
"Execute pass C2b, the refusal-channel convergence. Invoke `cairn-pass`, read
`docs/superpowers/plans/2026-08-02-c2-breaking-window.md` (ruling R10, Task 12, and the
post-mortem's 'Carried into C2b' section) in full, create a NEW worktree off `main`, and execute
it test-first via `cairn-implementer` dispatches. Gate it with `web-auth-security-reviewer` plus a
read of the admin's failure rendering. Append C2b's `Consumers must:` entries to the same
`## Unreleased` window and hold unpublished; the release comes after."

**FOUR consumer sites, not two or three.** A dependency scan of `~/Projects/*/package.json`
(2026-08-03) found four distinct repos, each on its own `0.x` caret, which admits only its own
minor:

| Repo | Range | Behind |
|---|---|---|
| `907-life` | `^0.84.4` | 0.85 through 0.93, plus this window |
| `cairn-pub` | `^0.87.4` | 0.88 through 0.93, plus this window |
| `aksailingclub-org` | `^0.91.1` | 0.92, 0.93, plus this window |
| `ecxc-ski` | `^0.93.0` | this window only |

(`~/Projects/asc-site` is a second checkout of `aksailingclub-org`, same origin and HEAD, not a
fifth consumer.) Earlier STATUS entries said two, then three; C2 corrected `CLAUDE.md` to four.
**cairn.pub is a consumer too**, and it is the project's own site: a docs shell pinned six minors
behind the engine it documents. It migrates in the batch right after ASC, and the **owed cairn.pub
live admin smoke** (Geoff's magic link plus a publish round-trip) folds into that same session
rather than staying a separate debt. It does not wait for Topo: Topo goes late by design, and if it
does replace that shell later it inherits a current engine instead of porting a stale one forward.

**The order after C2b** (worked through with Geoff 2026-08-02, refined 2026-08-03): C2b → cut
`0.94.0-rc.1` rather than the final number → migrate ASC and cairn.pub against the RC from their
own repos → mint `0.94.0` once their own gates are green → migrate the two remaining sites off the
recipe the first migration produces (write it into `docs/guides/upgrade-cairn.md`) → phase P
overlapping that migration, pulling the four-CI-gates consolidation FORWARD (it taxes every pass
until fixed) → phase F, with F1 and F4 batched into ONE Fable design sitting, since history/revert
and preview share a substrate and C2's R11 already reserved vocabulary for both. Scaffolder and
Topo stay last: the scaffolder emits from the engine's surface, and C2 churned Topo's docs shell
hard. The RC exists because `examples/showcase` is a stand-in cairn wrote itself; ASC is the first
admin-extension consumer and cairn.pub a docs shell, so the two together exercise the reshaped
surface before an immutable number is minted.

**What C2's review gate proved, and the process change it forces.** Thirteen adversarial agents
raised 34 findings; 12 died under refutation and 21 were folded. Two were load-bearing: the branch
had been failing `check:dev-package` since Task 6 (the plan's gate list named six gates, CI runs
nineteen), and R9's `route.id` target derivation 403'd every session including owner on any
route-group layout, which is the reference's own documented mounting example. **Three of the pass's
claims about itself were false and every one passed every gate it ran.** This is the third
consecutive pass to find this species at its review gate. The structural fix, filed to phase P: a
plan's gate list is itself an unverified claim, and should be derived from
`.github/workflows/test.yml` rather than restated from memory.

**Open question for Geoff, still unanswered and now twice deferred.** Where the two feature design
sittings slot against the standing template queue (the optical-centering ratchet, the cairn.pub
voice sitting, the ASC Assets trial, Topo, the scaffolder). Recommendation on the table: F sittings
first, since history, revert, and preview all gate the public beta and nothing in the template
queue does.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN; cairn-side mitigation weighed in ROADMAP);
**`config.kit.csrf.checkOrigin` is now an ACTIVE deprecation warning** in the toolchain this repo
builds against, not merely a planned removal (kit#15992, watched by a scheduled routine) and it
prints on every showcase build; mermaid diagrams near-illegible at 320/390 (candidate: the Topo
pass); section-index breadcrumbs duplicating the arm name; the `/admin/help` first-steps card
overlap (ROADMAP, Now); the `sideEffects` coverage gate filed as mechanical hardening. ASC's own
retrofits run in that repo on its own clock.

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
