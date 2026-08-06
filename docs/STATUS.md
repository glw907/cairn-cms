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

## Immediate next action (2026-08-05: the harvest brainstorm is DECIDED; the RC-cut session is next, opening with the audit-seam task)

**The AI-posture pass merged to `main`** (`e0d1388d`, branch `ai-posture`, thirteen commits). A site
states `aiPosture: 'invite' | 'decline'` and the engine emits what that implies; `cairn-doctor` fetches
the deployed origin's live `/robots.txt` and reports what actually ships; every routable non-`noindex`
entry has a raw-markdown twin; the admin HSTS stopped pinning sibling subdomains by default; and the
tutorial raises the posture where a developer is already deciding. Post-mortem in the plan:
[`docs/superpowers/plans/2026-08-05-ai-posture.md`](superpowers/plans/2026-08-05-ai-posture.md).

**The engine-harvest brainstorm RAN and is DECIDED** (Fable sitting, Geoff ratified 2026-08-05).
Decision record:
[`docs/superpowers/specs/2026-08-05-engine-harvest-decisions.md`](superpowers/specs/2026-08-05-engine-harvest-decisions.md),
consuming the standing input
[`docs/internal/engine-harvest-candidates.md`](internal/engine-harvest-candidates.md). The frame held:
validation over addition. **One task enters the engine, and it gates the RC**: sanction direct
domain-event use of the D1 audit sink and rename the record's identity field `editor` to `actor`
(ruling 1; the blast radius was verified by grep across all four consumer repos, ASC's hand-rolled
sink being the only reader and already queued for deletion). Everything else is filings: the
xcathletes pass-1 plan gets amended to the `createAuthChannel` factory before execution (carrying the
pre-pass-3 team-URL decision, since the permalink token set was verified closed), the seam-fit
questions fold into the DX reporting shape below, the ASC ROADMAP gets three rider lines in its
migration session, and the composed form-protection wrapper is declined. The sitting also recorded
cairn's position on programmatic content edits in the same record: deliberate-publish binds every
actor (the owner is another editor), so a guarded operation stages onto the per-entry branches and
the owner publishes through the existing flow; the season-rollover rider points at it.

**Resume prompt** (fresh session from `~/Projects/cairn-cms`, on Opus 5 per the model economy):
"Execute ruling 1 of `docs/superpowers/specs/2026-08-05-engine-harvest-decisions.md` as one
`cairn-implementer` task on a fresh worktree off `main`, full gate, merge; then cut `0.94.0-rc.1`
via `cairn-release`, and author the per-migration DX reporting shape (ruling 3's three questions)
before starting the ASC migration."

**Then the order is unchanged:** cut `0.94.0-rc.1`, migrate ASC and cairn.pub against it from their own
repos, mint `0.94.0` once their gates are green, migrate the remaining two off the recipe the first
migration writes into `docs/guides/upgrade-cairn.md`, then phase F, then RELEASE ONE, then phase P.

**A watch routine is live** for the two external AI-crawler triggers: `trig_01SLdXarWCJX2LD2FB8b3Dqk`,
monthly on the 1st, first run 2026-09-01, emailing only when a condition trips. It watches Cloudflare's
2026-09-15 crawler-default change and the crawler table's staleness. **It carries a correction to the
plan:** whether that change reaches backward into zones with an existing configuration is genuinely
ambiguous in Cloudflare's own post, which the ROADMAP had asserted as settled fact.

**Three rulings from this pass that outlive it.** A vendor's specifics get a **link, never a copy**, in
every docs arm, now in `docs/internal/docs-register.md`'s universal contract. The **friction log is a
staging area, not a backlog**: triage is complete-or-move and every entry leaves, with the full rules in
the log's own header and the summary in `CLAUDE.md`. And **a repeat is an altitude signal**: the same
friction from a second consumer site, or the same workaround in two sites, is engine work rather than a
faster patch.

**A DX reporting shape for the migrations is still owed** and belongs in the RC-cut session, since its
first consumer is the ASC migration. The four migrations are the same upgrade walked four times, so
per-migration reporting turns them into a comparison; without it, what gets learned depends on whoever
runs each session remembering to write it down.

## Superseded (the auth-channel window, kept until the RC cut)


**Both auth-channel passes are merged.** The factory pass merged 2026-08-04 (`06b3470d`). The
consumer proof merged 2026-08-05 (branch `auth-channel-2`, twelve commits): `createChannelDb` in the
dev package, the showcase `/members` fixture with its own `MEMBER_DB` and migration, three dev-only
harness routes, marker-based template stripping with a forbidden-token scan over the emitted tree,
five e2e specs (118 in the full suite), and the guide's "Prove your channel" section. Post-mortem in
the plan:
[`docs/superpowers/plans/2026-08-04-auth-channel-consumer-proof.md`](superpowers/plans/2026-08-04-auth-channel-consumer-proof.md).

**The window is now releasable on the auth-channel work**, which is what pass 2 existed to prove. It
still HOLDS UNPUBLISHED by default; cut only when independently warranted (a consumer needs it, or
the queue reaches the RC).

**Read the pass's harvest before the next UI or gate work:**
[`docs/internal/2026-08-04-auth-channel-consumer-proof-harvest.md`](internal/2026-08-04-auth-channel-consumer-proof-harvest.md).
Two findings are engine-level mechanics, not showcase quirks:

1. **The dev-backend build fence did not eliminate.** A shared exported constant does not fold across
   a module boundary, so every site following the shape the dev-package README and the tutorial
   taught ships its dev backend as dead code in the deployed Worker. Fixed everywhere in this repo
   (a Vite `define` named at each call site) and carried as a `Consumers must:` line in the window.
2. **Engine-rendered markup depends on classes Tailwind may never emit.** `rehype-dispatch.ts` writes
   `card-body` and `card-title` into runtime HTML, which Tailwind never scans, so DaisyUI ships those
   base rules only if some source file happens to name them. One fixture page naming `card-title`
   restyled every callout on the site. **This is an OPEN design question, filed to ROADMAP's Now
   tier**, and resolving it moves the approved visual baseline, so it runs through `visual-fidelity`
   with Geoff's before/after rather than as a side effect of another pass.

**The rule that governed both passes, still binding on anything auth-shaped:**

> **No control keyed on the victim's identity may deny, delay, or destroy anything. Denial keys on
> the requester. Identity-keyed controls either escalate through a channel the site can act on, or
> they only log.**

**The seam window is still open.** xcathletes Task 4 has not run (`~/Projects/xcathletes-org` does
not exist as of 2026-08-05). Once a release is cut, that consumer builds against the factory instead
of hand-writing it.

**Two review-gate lessons worth carrying into the next one.** A refutation prompt saying "refute if
uncertain," scored by counting survivors, returned zero on a diff carrying three real defects (a
client-bundle leak of the channel module, a missing changelog entry, a stale published comment); the
orchestrator found them by reading the raw findings. Read raw findings, not just the verdict, and
treat an all-refuted result as a signal the bar is mistuned. Also: 43 agents and 3.1M tokens was
over-scaled for this diff, and two verifiers that died on API errors were silently dropped by the
survivor filter rather than surfaced as unjudged.

**Next: the AI-posture pass**, then the RC cut, then the migrations. It consumes the ambient-defaults
audit (below) and lands before the migrations so each site adopts a posture in the session that
migrates it. **It is now planned and not yet executed:** spec at
[`docs/superpowers/specs/2026-08-05-ai-posture-design.md`](superpowers/specs/2026-08-05-ai-posture-design.md),
eight-task plan at
[`docs/superpowers/plans/2026-08-05-ai-posture.md`](superpowers/plans/2026-08-05-ai-posture.md).

**All four decisions are CONFIRMED (Geoff, 2026-08-05)**: markdown serving stays in the pass; the
admin HSTS drops `includeSubDomains` by default with a per-site opt-in; `llms.txt` does not ship and
the guide says why; the doctor probe stays black-box only. One addition rode the confirmation: the
guide carries the `Accept: text/markdown` negotiation recipe as zone config (an edge Transform Rule
rewriting to the `.md` twin), with Cloudflare's managed "Markdown for Agents" named as the
zero-config variant. The spec's "Decisions, confirmed" section carries the rulings. **The pass is
ready to execute; nothing gates Task 1.**

**Planning overturned two things the ROADMAP still asserted**, both recorded in the spec's
corrections section. `Accept: text/markdown` negotiation **cannot work** on a cairn site, because the
public catch-all is prerendered and the request never reaches the Worker, so only the `.md` suffix is
buildable. And Cloudflare's AI Crawl Control now **writes a WAF custom rule** when it blocks a
crawler, which is an API-readable object class, so the "no API exposes per-crawler state" finding is
no longer safe to assert; the read was attempted and returned `Authentication error` on all four
zones, a token-scope gap rather than a confirmed absence.

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
"Execute `docs/superpowers/plans/2026-08-05-ai-posture.md` with `cairn-pass`, task-by-task via
`cairn-implementer` dispatches, on a fresh worktree `.claude/worktrees/ai-posture` off `main`. Read
the authority spec `docs/superpowers/specs/2026-08-05-ai-posture-design.md` in full first, including
its corrections section; the four open decisions are confirmed there (Geoff, 2026-08-05). Run each
dispatch's gates in the foreground, and paste the CI gate list from `.github/workflows/test.yml` into
every dispatch."

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
`docs/guides/upgrade-cairn.md`, then phase F with F1 and F4 batched into one Fable sitting, then
RELEASE ONE, then phase P with the four-CI-gates consolidation pulled forward. Scaffolder and Topo
stay last, and
Cloudflare provisioning now lands inside the pre-beta series as part of the scaffolder itself
(Geoff, 2026-08-04, two rulings: pre-beta rather than after it, because every site provisioned so
far was set up by an agent holding account-wide access and the `wrangler`-plus-dashboard path a
developer actually walks has never been measured; and one create-a-site experience rather than a
separate provisioning tool, so `create-cairn-site` emits the code and creates the remote resources
in one run). The RC exists because
`examples/showcase` is a stand-in cairn wrote for itself.

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
