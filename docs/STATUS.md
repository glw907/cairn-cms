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

## Immediate next action (2026-08-10 late night: T3 is PLANNED; next is executing it, fresh Opus session)

**The T3 planning sitting ran (Fable, brainstorm-first) and made three rulings, recorded in the
spec's decisions section.** (1) The old T3 charge ("Cloudflare plus the two doors", ~10
deliverables) **split three ways**: **T3** is the Cloudflare chapter through chapter 1's finish
line (deploy, D1, the PEM's move to a Worker secret, the bootstrap sign-in); **T4** is chapter 2
(money, domain, email) plus Builds connect; **T5** is the browser door (the public template repo,
the Deploy button, C3 `--template`). Pass D follows T5; release one after D, unchanged. (2) The
localhost console grows where the waits live: T3 stays terminal-primary, the console takes its
full form in T4. (3) T4 plans around **token-prefill** for the beyond-wrangler API surface (zone
create, DNS writes); the self-managed OAuth client is rejected without a spike. The T4/T5 briefs
live at the end of the T3 spec. Two engine facts the sitting verified: the bootstrap needs no
engine change (the tool seeds the D1 `editor` row and a hashed `magic_token` row, then rides the
engine's own confirm page; one click, no email), and the App identity is source-carried
(`backend.ts`), so T3 adds a pre-push finalize to the T2 chapter and the repo is born with a
working `cairn.config.ts`.

**Next: execute the T3 plan
([`2026-08-10-create-cairn-site-t3.md`](superpowers/plans/2026-08-10-create-cairn-site-t3.md); the
spec is
[`2026-08-10-create-cairn-site-t3-design.md`](superpowers/specs/2026-08-10-create-cairn-site-t3-design.md))
in a fresh Opus session** on the existing worktree `worktree-t3-cloudflare-chapter`
(`.claude/worktrees/t3-cloudflare-chapter`, branched off `main` after the T2 merge). Method:
`cairn-pass` start ritual; Task 1 is a main-loop spike against the glw907 account (the standing
`CLOUDFLARE_API_TOKEN` makes wrangler non-interactive; no Geoff browser needed) and is the
decision gate for Tasks 5-10; Tasks 2-11 dispatch to `cairn-implementer` test-first with the full
gate per task; Task 12 (live e2e) needs Geoff for at most `wrangler login` and one confirm click.
Standing constraints carried from T2: the desktop-side-effect rule (no suite spawns a browser, a
real wrangler, or a real npm; the fake-bin pattern), the friction-log hardening entry to triage
if T3 touches the files it names, and the scratch org `t2-scratch-org` (T3 does not need it;
kept or deleted at Geoff's option).

**Resume prompt** (launch directory
`~/Projects/cairn-cms/.claude/worktrees/t3-cloudflare-chapter`): "Execute Pass T3 of the
create-cairn-site umbrella (the Cloudflare chapter):
`docs/superpowers/plans/2026-08-10-create-cairn-site-t3.md`. Start with the cairn-pass skill;
read the plan in full and the T3 spec first. Task 1 (the spike) runs in the main loop before any
dispatch."

## Standing state (release ordering, consumers, open items, carry-forwards)

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
`STATUS-archive-2026-08-09-to-2026-08-10.md` (the T1 completion and docs-refactor pass-start entries),
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
