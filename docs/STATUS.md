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

## Immediate next action (2026-08-11 evening: T4a Tasks 1-10 are LANDED; next is Task 11)

**T4a Tasks 1 through 10 are done, committed, and pushed on `t4a-domain-chapter`** (in the
`t3-cloudflare-chapter` worktree). Suite: **421 pass, 0 fail, exit 0** in
`packages/create-cairn-site`; `npm run check` 0 errors / 0 warnings. No PR yet.

**Both blockers cleared in one sitting.** Geoff minted a spike token, ran a second dashboard
probe, and registered the scratch domain; the token is now revoked and the local copy shredded.
The spike doc carries two addenda with every capture, and the plan carries eight new amendments
in "Spike amendments, part two".

**Geoff's ruling on the external-registrar path (2026-08-12):** do not buy a domain outside
Cloudflare. The external case ships **general instructions**, which cut the per-registrar table
outright. What that leaves unobserved is narrow and handled in code, not prose: no externally
registered domain ever went through `POST /zones`, so Task 8 re-reads the zone rather than
trusting the create response to populate `name_servers`, and treats the birth `status` as unknown.

**What the live half changed, beyond what the plan already carried.** The prefill link now
carries **five** verified keys, including `email_sending`, for which Cloudflare documents no
template key at all; it is known to work only because it was tried, and a wrong key renders an
empty control with no error. `api.mjs` now carries the raw status and `errors[0].code` on a thrown
error, so callers branch on the numeric code rather than Cloudflare's prose. The cutover confirm
falls back to HTTP when HTTPS fails at the transport level, because a newly attached custom domain
fails the TLS handshake while serving fine, and the plan's ordered flow would otherwise have
failed on every new zone.

**The defect this pass exists to have caught:** a stale negative DNS cache reads exactly like an
absent record, per record type, in the window this chapter runs in. It returns an EMPTY list,
which is what a domain with no mail legitimately looks like. `readCurrentRecords` prefers the
authoritative nameservers and flags `lowConfidence` on the recursive fallback; an unattended run
refuses to copy a low-confidence list (`records-unverified`) rather than writing a set quietly
missing the admin's MX rows and reporting success.

**Resume prompt** (a fresh Opus session; launch directory
`~/Projects/cairn-cms/.claude/worktrees/t3-cloudflare-chapter`, branch `t4a-domain-chapter`,
already checked out): "Resume Pass T4a of the create-cairn-site umbrella at Task 11:
`docs/superpowers/plans/2026-08-11-create-cairn-site-t4a.md`. Tasks 1-10 are landed and pushed.
Read both Spike amendments sections and the two addenda in
`docs/internal/2026-08-11-t4a-domain-spike.md` first. Tasks 11 and 12 are dispatchable; Task 13
needs Geoff."

**Task 13 needs Geoff, and needs a NEW token.** The live e2e wants a zone-create-capable
Cloudflare API token (the spike one is revoked by design), the scratch domain in its seeded state,
and Geoff's own moments. Tasks 11 and 12 run unattended before it.

**Scratch resources still live on the account, deliberately left for Task 13's e2e** and torn down
with everything else it creates: the domain `carin-test.org` (registered at Cloudflare Registrar,
so its zone arrived active), two MX records, an SPF TXT, a 437-byte DKIM TXT that splits across
two chunks, a proxied A for `nothing.carin-test.org` with no Worker behind it, the scratch Worker
`cairn-t4a-spike`, and the apex Custom Domain attached to it.

**New carry-forward from this pass:** `runActions` re-wraps a thrown error with its action label
and does not carry the `catalogue` property across, so a row thrown inside an action loses its
`kind` and `code` upstream and only the message survives. Chapter 1 depends on the same runner, so
changing it is its own piece of work. The `packages/create-cairn-site` tooling gap is now three
deep (no comment gate, no type gate, and no `--experimental-test-module-mocks`, which is what
leaves `promptSecret`'s cancel path untested); `npm test` inside the package remains its only real
gate. The `src/github/install.test.mjs` timing flake reproduced again under load, twice, and
isolates clean when re-run alone.

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
