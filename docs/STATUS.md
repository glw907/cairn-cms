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

## Immediate next action (2026-08-01: the xcathletes seams pass is DONE and held; next is the ASC planning sitting)

**The xcathletes engine-seams pass is COMPLETE and HELD UNPUBLISHED.** Seven commits on
`xcathletes-seams`, full gate green (`check` 0/0, `npm test` exit 0 at 375 files / 4604 tests,
every doc and surface gate, plus a consumer build proved against the worktree's own engine rather
than main's). Both briefed seams shipped: the `./auth-store` server-only subpath, and
`ManifestEntry.publishedAt` with the `newlyPublishedEntries` diff helper on `./delivery/data`.
**Geoff called off the release mid-pass (2026-08-01)**, so `package.json` stays at `0.92.0` and this
window batches with the ASC seams below. Full record, including the review gate's yield and four
process findings: the post-mortem in
`docs/superpowers/plans/2026-08-01-xcathletes-engine-seams.md`.

Three things from that pass worth carrying, not buried in the post-mortem:

1. **`check:snippets` is a FOURTH CI-only gate the local ritual skips**, alongside
   `check:comments`, `check:reference:signatures`, and `check:surface`. It was red on this branch
   until late in the pass. The `cairn-pass` skill's step 5 names the other three and should name it.
2. **`main` arrived red.** The CodeMirror bump (`20f7a975`) landed on `main` without the suite and
   broke the `docs-links` changelog/upgrade-guide parity gate. Fixed in this branch.
3. **The engine now owns email normalization** (`src/lib/auth/store.ts`), because the promoted
   `/auth-store` surface made a BINARY-collated `editor.email` lockout-capable. `COLLATE NOCASE` on
   the column is filed in ROADMAP's Next tier for the next auth migration.

**NEXT: the ASC engine-seams PLANNING sitting** (design decisions first, then a plan; execution is a
separate session). Input: `docs/internal/2026-08-01-asc-consumer-brief.md`, five seams harvested from
the ASC site. Geoff ratified the shape 2026-08-01: **split into two passes**, seams 1+2 (exported auth
primitives, the form-action wrapper factory) as the first, seams 3+4+5 (`verifyTurnstile`, the
rate-limit wrapper, the packaged D1 audit sink) as the second. Seams 1 and 2 carry the design weight
and have the xcathletes platform as a second consumer on its own clock.

**Three decisions are OPEN and belong to Geoff at that sitting, not to the planner:**

- **The charter call on seam 3.** The brief states it rather than settling it: cairn performs no
  network sends, and a Turnstile siteverify call is a verification fetch, arguably the same class as
  the engine's own GitHub API commits. This is the only seam that moves the charter boundary rather
  than sitting inside it. "Out of scope" is a valid answer, and if it is the answer, seam 4 still
  stands alone.
- **Seam 1's parameterization shape.** The cookie-name builders and TTL constants are fixed to the
  editor store today; the brief proposes a cookie base name plus TTLs as arguments. This is new
  public surface, not an export-map promotion like the xcathletes seam 1 was.
- **Seam 2's factory signature** (the access map, a binding resolver, an optional rate limit).

**Resume prompt**, from `~/Projects/cairn-cms`: "Brainstorm the ASC engine-seams pass with me per
superpowers:brainstorming. Input: `docs/internal/2026-08-01-asc-consumer-brief.md`. Geoff ratified
the two-pass split (seams 1+2, then 3+4+5) on 2026-08-01; settle the three open decisions recorded in
`docs/STATUS.md` (the seam 3 charter call above all), then author the plan for the first pass under
`docs/superpowers/plans/`. Do not plan seam 3 until the charter call is made."

Queued behind it, in order: the optical-centering ratchet plan (a Fable sitting; `text-box-trim` as a
silent engine default, measurement-first, capture Geoff's ASC chip sighting first, fold in the
`.list-row` `grid-row-start` pin and small verified friction-log items), then the cairn.pub front-page
voice sitting, whose resume prompt is preserved here since its source entry is now archived:

> "Brainstorm the cairn.pub front-page copy with me per superpowers:brainstorming. This is the voice
> sitting Pass 3 deliberately carved out: the sixth principle is ratified (the design language is
> enforced; the payoff is a developer less burdened, never freed) and its substance lives in
> `docs/explanation/enforced-design.md` and the README's 'An enforced design language' section. The
> front page distills those in the site's own personal voice; the `cairn-pub-front-page-voice` memory
> governs (personal voice over neutral definitional intro, no pitch, brainstorm the copy with Geoff
> rather than drafting solo). The skills claim is publishable: `skills/` ships. Scope is the
> front-page treatment only; the principle-pages pass (T1a through T1f) stays a separate queued pass.
> Ratified copy lands through the cairn.pub repo's own deploy as the closing step."

Then the ASC Assets trial (runs in aksailingclub-org's own sessions, graded against
`docs/internal/2026-07-assets-trial-coverage-contract.md`), then Topo, then the scaffolder. Open
pre-release DX calls Geoff has not made, filed in ROADMAP: the `cairn-doctor --fix` flag semantics and
the type-scale rename codemod.

**Published state:** `0.92.0` is `latest`. The unpublished window on `main` now holds the CodeMirror
bump plus this pass's two seams (`release-size: minor`, `Consumers must: nothing`). `0.93.0` is free
and is the right next number when a cut is warranted; verify with
`npm view @glw907/cairn-cms versions --json` at the cut, never before.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN; severity raised, cairn-side mitigation weighed in
ROADMAP); mermaid diagrams near-illegible at 320/390 (candidate: the Topo pass); section-index
breadcrumbs duplicating the arm name; the cairn.pub live admin smoke (Geoff's magic link plus publish
round-trip) is owed; the `/admin/help` first-steps card overlap.

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
