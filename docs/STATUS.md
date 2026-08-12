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

## Immediate next action (2026-08-12: T4a is DONE and live-proven; next is EXECUTING T4b)

**Pass T4a is complete. Chapter 2 ran end to end against the real scratch domain
`carin-test.org` and reached `domain-live`,** on branch `t4a-domain-chapter` (worktree
`t3-cloudflare-chapter`). A site scaffolded from scratch got its own domain: zone adopted,
carry-over skipped as not needed, delegation short-circuited, Custom Domain attached, origin
rewritten, redeployed, confirmed. Everything torn down and verified gone by listing. Evidence and
the full divergence list are in the plan's post-mortem part three.

**The e2e earned its keep.** It caught a hard defect before the sitting: chapter 2's carry-over hop
ignored the `alreadyActive` flag its neighbours both read, so a domain registered at Cloudflare
Registrar died at the second hop with an uncatalogued, developer-facing exception. Fixed in
`f4a3d3a6` with the coverage gap closed. Every gate had been green, because no fixture ran an
already-active zone through that hop.

**Next: EXECUTE Pass T4b (email + the money framing). Its spec and plan are already approved and
committed**, so no planning sitting is owed: `docs/superpowers/plans/2026-08-11-create-cairn-site-t4b.md`
and `docs/superpowers/specs/2026-08-11-create-cairn-site-t4b-design.md`. Ten tasks, eight
dispatchable. **Task 1 is a spike that runs in the main loop and needs one browser sitting with
Geoff**, and it gates Tasks 4, 5, and 7; its Step 2 confirms the account's Workers Paid status,
which the whole pass depends on because Email Sending reaches arbitrary recipients only there.
Task 9's live e2e needs the scratch domain and a real inbox.

**Resume prompt for the next session** (a fresh Opus session; launch directory
`~/Projects/cairn-cms`): "Execute Pass T4b of the create-cairn-site umbrella (email and the money
framing): `docs/superpowers/plans/2026-08-11-create-cairn-site-t4b.md`. Start with the cairn-pass
skill; read the plan in full and its spec first, plus the T4a plan's post-mortem part three for
what the live e2e learned. Task 1 (the spike) runs in the main loop before any dispatch and needs
one browser sitting with Geoff. Work on the existing `t4a-domain-chapter` branch or a fresh
worktree off it, since T4a is committed but NOT merged and has no PR."

Queue after T4b: T4c (Builds connect + reconciliation) -> T4d (the localhost console) -> T5 ->
Pass D -> release one -> site walk -> P.

**Branch topology matters for the next session.** T4a is committed on `t4a-domain-chapter`
(worktree `.claude/worktrees/t3-cloudflare-chapter`, branched off `main` at `1415f48e`) and is
neither pushed nor merged, so a cold session that branches off `main` by default would build
against an engine and a tool that lack chapter 2 entirely.

**Two hand steps for Geoff, both outstanding:** delete the run's GitHub App
`cairn-t4a-live-596b84` at github.com, and revoke the Cloudflare API token minted for the run
(id `a3640d8f9719e4873eca79d40f8205c3`). That token was pasted into a session transcript, so treat
it as burned rather than merely unused. The older T3 App `cairn-t3-live-71d37c` may still be
pending deletion too.

**Carry-forwards raised by T4a, deliberately not fixed.** (1) The cutover confirm resolves through
`fetch` and the system resolver, so a stale negative DNS cache reports a serving hostname as
unpropagated and parks the owner. Observed live: the router answered empty while `1.1.1.1` served
the records and the site answered 200. This is amendment 15's defect class one layer up, and it
belongs to a pass owning `hostname.mjs`. (2) The prefill URL's permission keys are still
unverified against the live dashboard, so amendment 9's Task 7 obligation stands open; the run
supplied the token by env rather than the interactive paste. (3) An externally registered domain
still owes the branches this scratch domain cannot reach: zone creation and its birth state, the
records probe against a real pre-migration domain, the carry-over gate's confirm and caveat copy,
the delegation park, `propagating`, `wrong-nameservers`, `certificate-pending`, and the apex
address-record collision. (4) Chapter 2's browser-moment count is **one**, the token mint, and
Pass D's admin-track domain page should state it; that page does not exist yet, which is why T4a
did not write it. (5) The engine committer-attribution drift from T3 (`src/lib/github/repo.ts`
versus spec 7.4). (6) `npm run check:comments` and the root type-check both cover `src/lib` only,
so `packages/create-cairn-site` has neither a comment gate nor a type gate; its own `npm test` is
the real gate. (7) `src/github/install.test.mjs`'s reauthorize race is still flaky. (8) The
deferred defect list per the T4a spec's ruling 2. (9) The umbrella's resume table, still unowned,
noted for Pass D.

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
