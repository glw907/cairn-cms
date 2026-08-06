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

## Immediate next action (2026-08-05: `0.94.0-rc.1` IS PUBLISHED; the ASC migration is the next session, from its own repo)

**`0.94.0-rc.1` is on npm, under the `next` dist-tag.** `latest` still serves `0.93.0`, and a caret
range does not resolve a prerelease, so no consumer moves until it chooses to. A site testing the
candidate pins the exact version (`"@glw907/cairn-cms": "0.94.0-rc.1"`) and returns to `^0.94.0`
when the stable lands. Release `v0.94.0-rc.1`, tagged on `main` at `adc21174`, all four workflows
green at that commit. The RC is a one-time guard for this window, not a pattern (Geoff,
2026-08-05): later pre-beta cuts go straight to the final number, and the beta-and-after scheme
(`1.0.0-beta.N` under `next`, then strict SemVer with RCs only ahead of a major) is in ROADMAP's
"Toward 1.0".

**Ruling 1 landed and merged** (branch `audit-actor`, six commits, `4e1f52bb`). Direct
domain-event calls to `createD1AuditSink` are a sanctioned pattern, and `AdminActionAuditRecord`'s
identity field is `actor`, not `editor`. The log events follow the actor they can report:
`admin.action.audited` and `audit.sink.write_failed` key their identity `actor`, while
`admin.action.sink_threw`, `admin.action.unaudited`, `admin.action.csrf_rejected`, and
`admin.action.rate_limited` keep `editor`, because each fires only where the actor is a verified
cairn editor. Nothing else from the harvest entered the engine. Decision record:
[`docs/superpowers/specs/2026-08-05-engine-harvest-decisions.md`](superpowers/specs/2026-08-05-engine-harvest-decisions.md).

**The DX reporting shape is written**, at
[`docs/internal/feedback/README.md`](internal/feedback/README.md). It carries ruling 3's three
seam-fit questions plus the two deltas that correct the upgrade guide, the first gate failure, and
both budgets. Every migration fills it and lands the report in cairn, in that same directory, as a
docs-only change; the full per-task evidence stays in the site's own repo. Its own governing rule
is that every finding leaves the report.

**Resume prompt for the next session** (launched from `~/Projects/aksailingclub-org`, on Opus 5):
"Migrate this site to `@glw907/cairn-cms@0.94.0-rc.1`, pinning the exact version rather than a
caret, since a caret cannot resolve a prerelease. Read cairn's
`docs/guides/upgrade-cairn.md` `0.94.0-rc.1` entry and cross every `Consumers must:` list your
range crosses. Delete the hand-rolled audit sink in favor of `createD1AuditSink`, whose record
field is now `actor`. This migration is the FIRST walk, so it writes the recipe the other three
follow. Close by filling cairn's `docs/internal/feedback/README.md` shape into
`docs/internal/feedback/2026-08-XX-aksailingclub-org-migration.md` in the cairn repo, and file the
three ROADMAP riders from ruling 4 of cairn's engine-harvest decisions onto this repo's own
`ROADMAP.md`."

**Then:** cairn.pub migrates next, against the same RC, folding in the owed cairn.pub live admin
smoke (Geoff's magic link plus a publish round-trip). Mint `0.94.0` once both gates are green, then
migrate `907-life` and `ecxc-ski` off the recipe the first migration wrote. Then phase F with F1 and
F4 batched into one Fable sitting, then RELEASE ONE, then phase P with the four-CI-gates
consolidation pulled forward. Scaffolder and Topo stay last, and Cloudflare provisioning lands
inside the pre-beta series as part of the scaffolder itself (Geoff, 2026-08-04).

**How the final `0.94.0` cut handles the changelog.** The window is now headed `## 0.94.0-rc.1`, not
`## Unreleased`. At the stable cut, rename THAT heading to `## 0.94.0` rather than adding a second
entry above it: the candidate and the stable carry identical content, and a separate entry would
duplicate a 35-step `Consumers must:` list. `check:version` supports either shape, since it sizes an
entry against the nearest earlier heading whose numeric core differs. Do the same in
`docs/guides/upgrade-cairn.md`, and drop that entry's release-candidate preamble.

**The release machinery learned prereleases in this session, in both halves.** Neither could cut an
RC before. `scripts/check-version.mjs` matched headings on `^## (\d+\.\d+\.\d+)\b`, so
`## 0.94.0-rc.1` parsed as `0.94.0` and failed its own equality check; it now parses the suffix,
orders by SemVer precedence, and sizes against the nearest earlier differing core. `publish.yml`
passed no `--tag`, and npm defaults to `latest` whatever the version looks like, so the RC would
have reached every bare `npm install` while reaching no caret-pinned consumer at all; the tag is now
derived from the version. The `cairn-release` skill was corrected to match.

**One registry loose end, not acted on.** A stale `rc` dist-tag still points at `0.6.0-rc.1` from
the pre-rebuild era, so `npm install @glw907/cairn-cms@rc` serves something ancient. The scheme uses
`next`, so `rc` should be removed (`npm dist-tag rm @glw907/cairn-cms rc`). Left alone as an
outward-facing registry change nobody asked for.

**A watch routine is live** for the two external AI-crawler triggers: `trig_01SLdXarWCJX2LD2FB8b3Dqk`,
monthly on the 1st, first run 2026-09-01, emailing only when a condition trips. It watches Cloudflare's
2026-09-15 crawler-default change and the crawler table's staleness. **It carries a correction to the
plan:** whether that change reaches backward into zones with an existing configuration is genuinely
ambiguous in Cloudflare's own post, which the ROADMAP had asserted as settled fact.

**Three rulings from the AI-posture pass that outlive it.** A vendor's specifics get a **link, never
a copy**, in every docs arm, now in `docs/internal/docs-register.md`'s universal contract. The
**friction log is a staging area, not a backlog**: triage is complete-or-move and every entry
leaves. And **a repeat is an altitude signal**: the same friction from a second consumer site, or
the same workaround in two sites, is engine work rather than a faster patch.

**FOUR consumer sites, each on its own `0.x` caret**, none of which resolves the RC:

| Repo | Range | Behind |
|---|---|---|
| `907-life` | `^0.84.4` | 0.85 through 0.93, plus this window |
| `cairn-pub` | `^0.87.4` | 0.88 through 0.93, plus this window |
| `aksailingclub-org` | `^0.91.1` | 0.92, 0.93, plus this window |
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
`STATUS-archive-2026-08-04-to-2026-08-05.md`.
