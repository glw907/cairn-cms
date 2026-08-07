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

## Immediate next action (2026-08-07: stable `0.94.0` on `latest`; ASC adopted; the vertical alignment pass gates release one)

**Stable `0.94.0` published 2026-08-07**, the content-identical promotion of `0.94.0-rc.2`: same
source, same exports, same breaking list, proven end-to-end by ASC's 75-spec Playwright run
against `rc.2` from the registry. `npm view` confirms `latest: 0.94.0`. (`next` still points at
`0.94.0-rc.2`, now behind `latest`; it sits there harmlessly until the next candidate replaces
it.) One mechanic to know when reading the history: the release targeted commit `1d415c1b` on
`release/v0.94.0`, a one-commit promotion branch off the `v0.94.0-rc.2` tag, NOT `main`'s tip,
because `main` already carried the history-revert window under `## Unreleased` for release one
and publish.yml ships whatever tree it checks out. The stable-cut renames (heading to
`## 0.94.0`, RC preambles dropped, per the rule now archived) landed twice, once on the
promotion branch and once on `main`; tag `v0.94.0` keeps the promotion commit alive.

**ASC's `0.94.0` adoption is COMPLETE and verified** (2026-08-07): the migration merged to that
repo's `main` via its PR #3 (merge `3e7d97d`), `origin/main` carries the `^0.94.0` pin, the
"Deploy to Cloudflare Workers" run on `main` completed green, and ASC's own STATUS records the
adoption merged, deployed, and smoked. Nothing in cairn waits on ASC.

**The remaining consumer migrations WAIT for release one (Geoff, 2026-08-07).** The vertical
alignment pass holds unpublished, so migrating now would make `907-life`, `ecxc-ski`, and
`cairn-pub` cross twice (to `0.94.0`, then again for the fix). Order: vertical alignment pass
→ release one → each site migrates ONCE, landing history/revert, preview, and the alignment
machinery in a single crossing, with the upgrade guide's `0.92.0` geometry note and the audit
tripwire in place when they cross the register flip. (cairn-pub's saves and publishes stay
blocked on the GitHub App installation item below regardless; its migration is not.)

**One finding came back with the verification**, filed to `ROADMAP.md`'s Now tier rather than left
in a report: the stacked register drops a field's control by the label's height, so a bare sibling
control in the same row no longer aligns with it (12.5px on ASC's season picker, both widths, both
themes). It sits beside the optical-centring default Geoff asked for on 2026-07-30, which was
refiled at the same time after being lost in a closed plan's next-pass-seed paragraph. They are one
class and are worth one pass.

**Both Phase F passes are DONE and MERGED to `main`.** Pass one (history and revert): merge
`55aaad28`, 2026-08-06, post-mortem in
[`2026-08-06-history-revert.md`](superpowers/plans/2026-08-06-history-revert.md). Pass two
(public preview): merge `e3db7de8` via PR #23, 2026-08-07, all five CI checks green on the
real merge ref, post-mortem in [`2026-08-06-preview.md`](superpowers/plans/2026-08-06-preview.md)
(the pass-end adversarial workflow refuted 34 of 41 findings and the 7 confirmed are fixed;
the live admin smoke and its transcript are in the post-mortem). Both hold under
`## Unreleased` for RELEASE ONE; no version bump. The spec, with its round 3 corrections and
the discard nuance, is
[`2026-08-06-history-revert-preview-design.md`](superpowers/specs/2026-08-06-history-revert-preview-design.md).

**RELEASE ONE gates on the vertical alignment pass, which is now the IMMEDIATE next action**
(Geoff, 2026-08-06/07: the beta does not ship with the alignment class unanswered, and the
class is more pervasive than field rows). The plan, widened 2026-08-07 from the earlier
field-row draft, is
[`2026-08-07-vertical-alignment.md`](superpowers/plans/2026-08-07-vertical-alignment.md): a
MEASURED inventory across the admin's rendered screens first (glyph-box centers, not element
boxes; every flex row, the icon-text and mixed-line-height classes included), then
engine-owned recipes (`FieldRow`, whatever row classes the inventory confirms, the
`text-box-trim` silent default), the generalized `cairn-audit` vertical rule, and the
retroactive `0.92.0` geometry note. The inventory sizes the pass; the sizing rule applies
from the first split. It runs on a fresh worktree off `main` in a fresh Opus 5 session,
standard method. Resume prompt: "Execute the vertical alignment plan at
docs/superpowers/plans/2026-08-07-vertical-alignment.md via cairn-pass; the plan is committed
on main; work a fresh worktree off main. Task 2 moves the approved admin visual baseline, so
its diffs run through the visual-fidelity read with Geoff's before/after."

**cairn-pub's open item, not yet resolved:** the `cairn-cms` GitHub App installation does not
carry `glw907/cairn-pub`, so a save or publish on that site cannot commit. Adding a repository to
an App installation needs a token that can modify the App (the `gh` OAuth token and the stored bot
PAT both refuse), which needs Geoff, in a browser, at the App's own installation settings.

**One registry loose end, not acted on.** A stale `rc` dist-tag still points at `0.6.0-rc.1` from
the pre-rebuild era, so `npm install @glw907/cairn-cms@rc` serves something ancient. The scheme uses
`next`, so `rc` should be removed (`npm dist-tag rm @glw907/cairn-cms rc`). Left alone as an
outward-facing registry change nobody asked for.

**A watch routine is live** for the two external AI-crawler triggers: `trig_01SLdXarWCJX2LD2FB8b3Dqk`,
monthly on the 1st, first run 2026-09-01, emailing only when a condition trips. It watches Cloudflare's
2026-09-15 crawler-default change and the crawler table's staleness. **It carries a correction to the
plan:** whether that change reaches backward into zones with an existing configuration is genuinely
ambiguous in Cloudflare's own post, which the ROADMAP had asserted as settled fact.

**FOUR consumer sites.** ASC is current on `^0.94.0`; the other three sit on their own `0.x`
carets and move only by migration (a caret admits only its own minor in `0.x`), which waits for
release one per the ordering above:

| Repo | Range | Behind |
|---|---|---|
| `907-life` | `^0.84.4` | 0.85 through 0.93, plus this window |
| `cairn-pub` | `^0.87.4` | 0.88 through 0.93, plus this window (migration ran against `rc.1`; the `Consumers must:` work is done, blocked only on the GitHub App item above) |
| `aksailingclub-org` | `^0.94.0` | current (adoption merged, deployed, and smoked 2026-08-07) |
| `ecxc-ski` | `^0.93.0` | this window only |

(`~/Projects/asc-site` is a second checkout of `aksailingclub-org`, not a fifth consumer.)
**cairn.pub is a consumer and the project's own site**, a docs shell six minors behind the engine it
documents.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN); `config.kit.csrf.checkOrigin` is an ACTIVE
deprecation warning in the toolchain this repo builds against (kit#15992, watched by a scheduled
routine) and prints on every showcase build; engine-rendered markup depending on classes Tailwind
may never emit (ROADMAP Now, and resolving it moves the approved visual baseline, so it runs through
`visual-fidelity` with Geoff's before/after); mermaid diagrams near-illegible at 320/390;
section-index breadcrumbs duplicating the arm name; the `/admin/help` first-steps card overlap; the
`sideEffects` coverage gate filed as mechanical hardening. The xcathletes pass-1 plan amendment
(ruling 3) still rides the next session that touches `~/Projects/ecxc-ski`. ASC's own retrofits run
in that repo on its own clock.

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
merging are in `STATUS-archive-2026-08-02-to-2026-08-03.md`. The auth-channel window and the
AI-posture pass, as STATUS carried them up to the `0.94.0-rc.1` cut, are in
`STATUS-archive-2026-08-04-to-2026-08-05.md`. The rc.2 cut, the ASC end-to-end verification, and
the RC window as STATUS carried them to the stable `0.94.0` cut are in
`STATUS-archive-2026-08-06-to-2026-08-07.md`.
