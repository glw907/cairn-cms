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

## Immediate next action (2026-08-10 night: T2 is DONE; next is the T3 planning sitting)

**Pass T2 (the GitHub chapter) is complete and merged through
[PR #26](https://github.com/glw907/cairn-cms/pull/26), all six CI workflows green.**
`create-cairn-site` now takes a scaffolded site to a pushed private repo covered by an App the
admin owns: manifest-first (the admin's own App is the OAuth client; no standing credential), two
browser trips via `request_oauth_on_install`, repo create with verify-only installation coverage,
the no-git-binary Git Data push, a resume frame with `--start-over`, the atomic scaffold claim,
and the dev shim making bare `npm run dev` reach the local admin (CI-probed). The live e2e is
recorded in the plan's post-mortem: personal, org, and interrupted-resume runs all green on real
GitHub, artifacts torn down. The spike verdict that reshaped the plan mid-pass (hook_attributes,
ported-first callbacks, port-only leniency, the refuted repo-link PUT) is
[`2026-08-10-t2-own-app-spike.md`](internal/2026-08-10-t2-own-app-spike.md). The pass-close
adversarial workflow confirmed and fixed six high findings; the unverified tail is parked in the
friction log's hardening entry. The window holds under `## Unreleased`; nothing is published.

**Next: the T3 planning sitting (Fable, brainstorm-first; NOT an execution session).** T3 is the
Cloudflare chapter plus the two doors: wrangler.jsonc emission, the workers.dev deploy, D1
provisioning, moving the PEM from the local state store to a Worker secret (the umbrella's rule,
named in the T2 spec's out-of-scope list), the bootstrap session, the hand-over console, and the
template-repo second door. Open against Part 1 of the umbrella spec
([`2026-08-09-admin-setup-and-docs-reset-design.md`](superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md))
plus the platform-spikes doc
([`2026-08-09-tool-passes-platform-spikes.md`](internal/2026-08-09-tool-passes-platform-spikes.md)).
Known planning inputs: chapter 1 stays inside wrangler's OAuth scopes (zero-credential quickstart
holds); the domain half cannot ride wrangler (no registrar scope) and **still waits on Geoff's
queued action: mint a Registrar-scoped Cloudflare API token** (then one no-cost `domain-check`
call answers the `.ski`/`.life` TLD question); Workers Builds is fully API-driven. T2 adds: the
desktop-side-effect test constraint (no suite may spawn a browser; PATH-empty pattern), the
friction-log hardening entry to triage when T3 touches those files, and the scratch org
`t2-scratch-org` (kept or deleted at Geoff's option) for live org checks.

**Resume prompt** (launch directory `~/Projects/cairn-cms`, on `main` after the merge): "Plan Pass
T3 of the create-cairn-site umbrella (Cloudflare plus the two doors). Start with the cairn-pass
skill and superpowers:brainstorming against Part 1 of the umbrella spec
(`docs/superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md`), reading `docs/STATUS.md`,
the platform-spikes doc, and the T2 post-mortem
(`docs/superpowers/plans/2026-08-10-create-cairn-site-t2.md`) first."

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
