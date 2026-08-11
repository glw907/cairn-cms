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

## Immediate next action (2026-08-11: T4a's offline half is LANDED; the rest is BLOCKED on Geoff)

**T4a Tasks 1 (partial), 2, 3, 4, 5, and 6 are done, committed, and pushed on
`t4a-domain-chapter`** (branched off `main` at `1415f48e`, in the `t3-cloudflare-chapter`
worktree). Suite: **342 pass, 0 fail, exit 0** in `packages/create-cairn-site`. No PR yet, since
the pass is half-done. What exists now: the spawn seam carries `env`, `updateSite` deep-merges
`cloudflare`, `retireSite` scrubs a saved token, `test/fake-cloudflare.mjs` serves the REST
routes from verbatim spike fixtures, the catalogue carries `wait`/`act`/`ask-someone` and
seventeen new rows, `src/cloudflare/api.mjs` is the REST seam with token redaction, and
`ensureAccountId` fixes chapter 1's multi-account defect across four wrangler call sites.

**Two blockers, both needing Geoff, both satisfied in one browser sitting.** Tasks 7 through 13
cannot start without them.

1. **A Cloudflare API token that can create zones.** The estate token deliberately cannot create
   zones and deliberately cannot mint tokens, so it cannot self-extend (that refusal is correct
   and should stay). A prefilled create-token URL for a deliberately broad, short-lived **spike**
   token sits in `docs/internal/2026-08-11-t4a-domain-spike.md`; the shipped prefill URL will
   carry only the minimum the spike proves necessary.
2. **The scratch domain**, registered at any external registrar and **seeded with an MX record
   and a DKIM-shaped TXT** before the run. This corrects the plan, which named it as a Task 13
   prerequisite only: spike step 4 needs an active zone under our control, so it gates Task 1 too.

**The spike corrected two plan premises that would otherwise have shipped a defect.** The cutover
attaches a Workers **Custom Domain**, not a Workers Route (a route does not make a hostname
resolve, so the planned confirm could never have passed; every cairn site in production is
attached this way). And an insufficient-scope refusal reports `errors[].code` **0**, not 9109,
with the missing permission named in the message. Eight amendments in total are folded into the
plan's own "Spike amendments" section; the post-mortem's part one carries the full account.

**Resume prompt once Geoff has both** (a fresh Opus session; launch directory
`~/Projects/cairn-cms/.claude/worktrees/t3-cloudflare-chapter`, branch `t4a-domain-chapter`,
already checked out): "Resume Pass T4a of the create-cairn-site umbrella at Task 7:
`docs/superpowers/plans/2026-08-11-create-cairn-site-t4a.md`. Tasks 1 through 6 are landed; read
the plan's Spike amendments section and post-mortem part one, plus
`docs/internal/2026-08-11-t4a-domain-spike.md`, first. Finish spike steps 2 and 4 in the main
loop against the scratch domain before dispatching Task 7." The scratch domain's name and the
spike token are the two inputs to ask for.

**T4b research is banked ahead of its sitting** (see the T4b line under Standing state), and
**the console is now its own pass, T4d** (Geoff, 2026-08-11), so the queue reads **T4a 7-13 → T4b
(email + money) → T4c (Builds + reconcile) → T4d (console) → T5 → Pass D**. The reasoning is in
the ROADMAP item and the T4d brief at the end of the T4a spec: the email chapter turned out to
have no long wait for a console to serve, and the wait that earns one is T4a's delegation park.

**Carry-forwards raised by T3 and its e2e, deliberately not fixed.** (1) The engine's
committer-attribution drift (`src/lib/github/repo.ts` says an omitted committer attributes to the
App; the real API falls back to the author, contra spec §7.4). Engine-side; a pass that touches
`src/lib/github` owns aligning code, comment, and spec. (2) `packages/create-cairn-site` has
**neither a comment gate nor a type gate**: `check:comments` covers `src/lib` only, and the root
`tsconfig.json` includes `src/lib` only, so root `npm run check` never type-checks this package's
`.mjs` at all. `npm test` inside the package is its only real gate. Sharpened by T4a, which
verified the tsconfig scope; goes to a pass that owns tooling. (3)
`src/github/install.test.mjs`'s reauthorize race is flaky (it tripped once under load across
roughly a dozen T4a suite runs; only its timing assertion is load-sensitive) and
`test/fake-github.mjs` cannot recover `callback_urls` for a real-manifest App; both T2 test
infrastructure. (4) The deferred defect list per the T4a spec's ruling 2: slug collisions,
wrangler output-string pinning, Windows `.cmd` spawning, the cross-package token contract test (a
hardening pass owns them). Note T4a retired the `wrangler whoami` half of the output-string risk
by moving to `--json`. (5) The umbrella's resume table (one row per step: persisted key, expiry,
partial-state detection, re-entry) is a standing debt no tool pass has carried; noted for Pass D.
(6) `carry-over-declined` is an `act` row, so an admin who declines the DNS carry-over exits 1.
There is no kind for "done, by choice", and inventing one for a single row is over-abstraction;
T4a's Task 10 owns deciding whether its orchestration treats a decline as a clean stop.

(7) `test/fake-cloudflare.mjs` copied its HTTP plumbing from `test/fake-github.mjs`, so `compile`,
`readRawBody`, and `sendJson` are now byte-identical in both, with `makeHandler` a near-copy. The
fix is a shared `test/fake-http.mjs`, which means editing `fake-github.mjs`, a file T4a never
touched. **The trigger is whichever of T4b or T4d first needs a third fake: extract then, rather
than making it a third copy.** Also unextracted, and older: the `makeFakeBin` plus
`CAIRN_WRANGLER_BIN` setup repeats roughly sixty times, where `fake-github.mjs` already solved the
same problem with `pointAtFake`.

**One open hand step from T3:** Geoff deletes the e2e's GitHub App at github.com
(`cairn-t3-live-71d37c`).

## Standing state (release ordering, consumers, open items, carry-forwards)

**T4b's research is BANKED ahead of its sitting:**
`docs/internal/2026-08-11-t4b-email-console-cost-research.md`, from a nine-agent workflow whose
adversarial half refuted or corrected six of eight verified claims. Three things the sitting starts
from rather than re-deriving. **(1) Magic-link email needs Workers Paid, $5/month** (3,000 emails
included, then $0.35/1,000): "Sending to arbitrary recipients requires the Workers Paid plan", and a
CMS mails whoever the owner adds as an editor. So chapter 3 has a real cost admission to make, and
the umbrella's "this costs nothing" framing stops being true there. **(2) The free
verified-destination path does not fit cairn** on three independent grounds, the worst being that it
requires Email Routing, which seizes the domain's root MX records and would break mail the owner
already receives. **(3) The console split out into T4d** (Geoff ratified this 2026-08-11), because the
console's justifying long wait is chapter 2's nameserver delegation rather than anything in the
email chapter, so bundling it with email was accretion by adjacency. It sits after Builds because
it improves a flow that already works through terminal parks. The brief also
lists its own execution prerequisites, including a Workers Paid test account and a scratch domain
whose inbound mail is expendable.

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
