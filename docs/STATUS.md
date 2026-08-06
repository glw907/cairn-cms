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

## Immediate next action (2026-08-06: cut `0.94.0-rc.2` once `rc2-worker-condition` merges)

**Both `aksailingclub-org` and `cairn-pub` have migrated to `0.94.0-rc.1` and filed their
reports**: [ASC](internal/feedback/2026-08-05-aksailingclub-org-migration.md),
[cairn-pub](internal/feedback/2026-08-05-cairn-pub-migration.md). Every migration follows the DX
reporting shape at [`docs/internal/feedback/README.md`](internal/feedback/README.md) and lands its
report in that same directory as a docs-only change.

**ASC's own Playwright gate found a blocker**: `/auth-crypto` and `/cloudflare` published a
`browser` condition with no `worker` condition ahead of it, so a Workers build resolved the
same client-only throwing stub a browser build gets, and the deployed Worker never started. Filed
at
[`2026-08-05-rc1-worker-condition-defect.md`](internal/feedback/2026-08-05-rc1-worker-condition-defect.md).
**ASC's migration branch stays held on `0.94.0-rc.1` until the fix ships.**

**`/auth-crypto` has carried this since stable `0.93.0`**, the release that shipped the subpath;
it stayed latent because no consumer imported it until this window. `/cloudflare` carried it from
its first publish in `0.94.0-rc.1`. So the defect is not RC-only, and `ecxc-ski` on `^0.93.0`
would hit it the moment it adopts `/auth-crypto`.

**Branch `rc2-worker-condition` fixes it**, adding a `worker` condition ahead of `browser` in both
subpaths' `exports` entries. Two gates cover the class, and they are not equally strong. The
structural check (`scripts/check-package-files.mjs`, wired into `check:package`) runs
unconditionally, needs no build, and sits on the publish path, so it is what would have aborted
the `rc.1` cut. The behavioral resolver probe
(`src/tests/unit/packaging-boundary.test.ts`) spawns Node against the built package under
Wrangler's own condition set (`workerd,worker,browser`, verified against wrangler's own
`getBuildConditions`), and every case is `skipIf(!built)`, so it proves nothing without
`npm run package` first. CI runs `npm ci`, whose `prepare` builds `dist`, so it runs there.

**What neither gate covers:** real Wrangler. Both are Node `--conditions` proxies, so if Wrangler
ever changed its condition set both stay green while every consumer breaks the same way. The
end-to-end proof is ASC's Playwright suite against `rc.2` from the registry, and the standing gate
is filed in [`ROADMAP.md`](../ROADMAP.md).

**Next action: cut `0.94.0-rc.2`.** Merge this branch, rename the `## 0.94.0-rc.1` heading in
`CHANGELOG.md` and the matching heading in `docs/guides/upgrade-cairn.md` to `0.94.0-rc.2` (the
candidate and the fix carry the same window; a stable-cut rename, not a new entry, per the rule
below), bump `package.json`, and release under the `next` dist-tag. ASC's Playwright suite is the
proof: once it runs green against `rc.2`, mint the stable `0.94.0`, then migrate `907-life` and
`ecxc-ski` off the recipe ASC's migration wrote, each resolving on its own caret. (The cut
itself is executed and waiting: both commits are on `main`, held at a GitHub Actions outage;
the release fires once CI proves the cut commit.)

**Phase F is pre-baked** (the F1+F4 sitting ran 2026-08-06, during the outage wait). The spec is
[`2026-08-06-history-revert-preview-design.md`](superpowers/specs/2026-08-06-history-revert-preview-design.md);
the plans are [`2026-08-06-history-revert.md`](superpowers/plans/2026-08-06-history-revert.md)
(pass one, F2/F3 merged) and [`2026-08-06-preview.md`](superpowers/plans/2026-08-06-preview.md)
(pass two; its task 0 adversarial review blocks every dispatch). Execution runs in a fresh
Opus 5 session per the model economy, each pass on its own worktree off `main`; it does not
depend on the migration window and may run parallel to it. Resume prompt: "Execute the Phase F
pass-one plan at docs/superpowers/plans/2026-08-06-history-revert.md via cairn-pass; the spec
and plan are committed; work a fresh worktree off main."

**How a stable cut handles the changelog.** The window is headed `## 0.94.0-rc.1` (soon
`## 0.94.0-rc.2`), not `## Unreleased`. At the stable cut, rename that heading to `## 0.94.0`
rather than adding a second entry above it: the candidate and the stable carry identical content,
and a separate entry would duplicate a long `Consumers must:` list. `check:version` supports
either shape, since it sizes an entry against the nearest earlier heading whose numeric core
differs. Do the same in `docs/guides/upgrade-cairn.md`, and drop that entry's
release-candidate preamble.

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

**FOUR consumer sites, each on its own `0.x` caret**, none of which resolves the RC:

| Repo | Range | Behind |
|---|---|---|
| `907-life` | `^0.84.4` | 0.85 through 0.93, plus this window |
| `cairn-pub` | `^0.87.4` | 0.88 through 0.93, plus this window (migration ran against `rc.1`; the `Consumers must:` work is done, blocked only on the GitHub App item above) |
| `aksailingclub-org` | `^0.91.1` | 0.92, 0.93, plus this window (migration ran against `rc.1`; held on this branch's fix before `rc.2` proves the Playwright gate) |
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
