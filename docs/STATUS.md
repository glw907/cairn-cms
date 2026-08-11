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

## Immediate next action (2026-08-11: T3 is BUILT and locally green; next is Geoff's GitHub-half e2e, then T4 planning)

**Pass T3 (the Cloudflare chapter) is complete on `worktree-t3-cloudflare-chapter`, unpushed at
the time of writing.** The tool now takes a site from `pushed` to live on the admin's own free
`workers.dev` hostname with them signed in to its admin: it installs, signs wrangler in, builds,
deploys, provisions and migrates both D1 databases and the R2 bucket from an **id-less**
`wrangler.jsonc`, moves the GitHub App's key from local state into a Worker secret, and seeds an
owner row plus a ten-minute magic-link token straight into the deployed database so the first
sign-in is one click and no email. It also writes the App's real identity into the scaffold before
the T2 push, so the repository is born able to publish. Thirteen local gates pass, including the
four a local ritual usually skips.

**The one thing Geoff still owns.** The live e2e's Cloudflare half ran end to end through the
**packaged** CLI against the real account (deploy, migrations, key move, bootstrap, the
`deployed`-resume with zero redeploys, full teardown verified by listing). The **GitHub half needs
a browser**: creating a GitHub App goes through GitHub's manifest flow and has no API, so the last
unproven link is *a save in the signed-in admin committing to the repo through the App*. Run the
full `--github --deploy` flow once, click through the two GitHub trips, then save a post in the
admin. Everything else in Task 12 is already evidenced in the plan's post-mortem.

**Read the spike before touching T4.** `docs/internal/2026-08-10-t3-cloudflare-spike.md` records,
with observed output, that wrangler provisions id-less bindings by name and **writes nothing
back**, that migrations take the binding name, that multi-statement `d1 execute --command` works,
and that `wrangler delete` needs a permission the standing estate token lacks. It also corrects
this repo's `CLAUDE.md` gotcha about Email Sending, which predates the rename to Cloudflare Email
Service; T4 owns re-reading that against current docs.

**Two carry-forwards this pass raised and deliberately did not fix.** (1) `npm run check:comments`
runs `eslint src/lib` and nothing else, so `packages/create-cairn-site` has **no comment gate at
all** despite its plan binding it to one; pointing the existing ruleset at it reports 1588 errors,
almost all complaints about `@param {type}`, which is the correct idiom for plain `.mjs`. The gate
that belongs there is the em-dash ban alone over `**/*.mjs`, and the package is currently clean of
them, so this is latent. It goes to a pass that owns tooling. (2) `src/github/install.test.mjs`'s
reauthorize race is **flaky**, hit twice this pass by different implementers; and `test/fake-github.mjs`
cannot recover `callback_urls` for an App made through the real manifest flow, so a test that builds
one that way hangs until its timeout. Both are T2 test infrastructure, worked around rather than
fixed, and both will keep costing an implementer a debugging round.

**Resume prompt for the next session** (launch directory
`~/Projects/cairn-cms/.claude/worktrees/t3-cloudflare-chapter` for the e2e, or
`~/Projects/cairn-cms` once T3 has merged): "T3 is built and green. Run the GitHub half of its
live e2e (`--github --deploy` end to end, two browser trips, then save a post in the signed-in
admin to prove the App commit path), append the evidence to
`docs/superpowers/plans/2026-08-10-create-cairn-site-t3.md`'s post-mortem, then merge T3 and open
the T4 planning sitting from the brief at the end of the T3 spec." Note the branch topology: T4
branches off `main` **after** T3 merges, not off the T3 worktree.

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
