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

## Immediate next action (2026-08-11 evening: T4a Tasks 1-12 are LANDED; next is Task 13, which needs Geoff)

**T4a Tasks 1 through 12 are done and committed on `t4a-domain-chapter`** (in the
`t3-cloudflare-chapter` worktree). Suite: **437 pass, 0 fail, exit 0** in
`packages/create-cairn-site`; `npm run check` 0 errors / 0 warnings. No PR yet. **Only Tasks 13
and 14 remain**, and 13 cannot start without Geoff.

**Task 13 needs three things, all of them Geoff's.** A **fresh zone-create-capable Cloudflare API
token** (the spike one was revoked by design, and the estate token deliberately cannot create
zones or mint tokens); the scratch domain `carin-test.org` in its seeded state (an MX record and
a DKIM-shaped TXT, so the carry-over proof can fail); and Geoff's own browser moments for the
token paste and the sign-in. The prefilled create-token URL lives in `prefill.mjs` and in the
spike doc. Task 14 (docs, ROADMAP, CHANGELOG, pass close) follows it.

**The domain is registered at Cloudflare Registrar, so its zone arrives active** and the
delegation park is unreachable on it. The externally registered path is therefore proven by the
suite and by code review, never live. That is a known, accepted limit of this pass's e2e.

**Tasks 11 and 12, and what they cost.** Task 11 wired chapter 2 into `bin.mjs`: the three new
resumable steps, the reopened `live` branch, the `domain-live` terminal branch, and the
`--start-over` refusal. Task 12 added the cross-cutting safety net, nine cases proving a resumed
record repeats no hop and the pasted token reaches no surface but the state record. The plan's
post-mortem part two carries the four main-loop rulings, the five defects diff review caught, and
the evidence for each.

**The one worth carrying forward: the suite was opening real browser tabs.**
`ensureApiToken` opens the create-token page before prompting for the paste, and
`chapter2.test.mjs` never passed the `openBrowser` seam, which defaults to the real platform
opener. Five tabs per full run, roughly fifty across repeated agent runs, invisible on CI (no
opener binary exists there) and silent by design (`openBrowser` swallows spawn errors). Fixed at
both layers: every call site passes a stub, and `test/no-desktop.mjs` loads through `--import`
from the test script, putting no-op stand-ins for `xdg-open`, `open`, and `cmd` first on PATH and
recording what they intercept. **Any new test that drives a chapter must pass the `openBrowser`
seam; the guard is the net, not the fix.**

**Resume prompt** (a fresh Opus session; launch directory
`~/Projects/cairn-cms/.claude/worktrees/t3-cloudflare-chapter`, branch `t4a-domain-chapter`,
already checked out): "Resume Pass T4a of the create-cairn-site umbrella at Task 13:
`docs/superpowers/plans/2026-08-11-create-cairn-site-t4a.md`. Tasks 1-12 are landed. Start with
the cairn-pass skill; read the plan's two post-mortems, both Spike amendments sections, and the
two addenda in `docs/internal/2026-08-11-t4a-domain-spike.md` first. Task 13 is the live e2e and
runs in the main loop: ask Geoff for a fresh zone-create-capable Cloudflare API token before
anything else, and confirm the scratch domain is still seeded. Task 14 closes the pass."

## Standing state (release ordering, consumers, open items, carry-forwards)

**T4b's spec and plan are BANKED and APPROVED** (Geoff, 2026-08-11):
`docs/superpowers/specs/2026-08-11-create-cairn-site-t4b-design.md` and
`docs/superpowers/plans/2026-08-11-create-cairn-site-t4b.md`, sitting from the nine-agent
research at `docs/internal/2026-08-11-t4b-email-console-cost-research.md` (whose adversarial half
refuted or corrected six of eight verified claims). Ten tasks, eight dispatchable, five
deliverables. **The pass is email plus the money framing only; the console is T4d.**

Four things a resuming session should not re-derive. **(1) The three open questions are
answered.** The onboarding poll rides T4a's pasted API token through the existing REST seam, and
cairn never invokes the `wrangler email sending` beta command group, which retires the
pin-a-wrangler-range worry outright. The scaffold sends from `no-reply@<domain>`, no prompt. A
declined paid plan is a clean recorded stop, exit 0, token deleted, with `--sign-in` named as the
owner's own way back in (the 30-day `SESSION_TTL_MS` means it is not urgent), which makes
`paid-plan-declined` the second "done, by choice" row after `carry-over-declined` and **retires
carry-forward 6 below** by earning the catalogue a fourth `declined` kind.

**(2) Four research unknowns closed live against the account during the sitting**, so the spike
shrank to one browser sitting: the sending-subdomain response shape and its apex naming, the
`cf-bounce` record placement, the `p=reject` DMARC default (confirmed on `ecxc.ski`, which also
carries an unrelated SES sender under that same policy), and the fact that the engine doctor's
existing `s.name === domain` predicate is already correct, so no engine fix is owed. What
survives for the spike: the Email Sending permission group's dashboard name, a Workers Paid
confirmation, the Advanced Certificate Manager billing glance, and fixture capture.

**(3) The money admission opens the tool, before the scaffold** (Geoff's call, over a
lighter-touch recommendation): the owner learns the whole cost picture before typing a site name.
Chapter 1's consent copy keeps its true "nothing in this step costs money" claim and simply stops
carrying the whole story alone. **(4) The admin test-send left the pass** and files to ROADMAP as
engine work; the doctor half of the umbrella's commitment already ships and was verified in code.

Execution prerequisites the plan names: T4a landed through Task 14, the scratch domain left
delegated and active, the account on Workers Paid (strong evidence glw907 already is), the
billing glance, the permission name, and a real inbox for the test send.

**THEN release one, AFTER Pass D** (amended ordering, Geoff 2026-08-09): it rolls this window
plus the history/revert, preview, vertical-alignment, and cleanup passes plus the docs reset, and
**`create-cairn-site` and the template repo publish in the same cut** so no shipped page
describes an uninstallable tool. Invoke `cairn-release`; verify the next number is free first.

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
`STATUS-archive-2026-08-09-to-2026-08-11.md` (the T1 completion, docs-refactor pass-start, and T3-built entries),
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
`STATUS-archive-2026-08-04-to-2026-08-05.md`. The stable `0.94.0` window, ASC's adoption, and the
vertical-alignment pass as STATUS carried them are in `STATUS-archive-2026-08-08.md`. The rc.2 cut, the ASC end-to-end verification, and
the RC window as STATUS carried them to the stable `0.94.0` cut are in
`STATUS-archive-2026-08-06-to-2026-08-07.md`.
