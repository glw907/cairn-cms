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

## Immediate next action (2026-08-01: the ASC seams planning sitting is DONE; next is pass-one execution)

**The ASC engine-seams planning sitting is COMPLETE.** All three open decisions settled with Geoff
2026-08-01: **seam 3 is IN SCOPE** under a stated charter line (Cloudflare-native platform
primitives are in-stack; third-party verifiers such as Stripe or Discord are not, and must never
ride the precedent in); **seam 1 exports one primitive** (`cookieName(base, secure)` plus the pure
crypto and `tokensMatch`, no TTL or naming-policy surface); **seam 2's factory reads the
guard-owned access map** (config carries only the DB-binding resolver and an optional rate limit).
The spec, `docs/superpowers/specs/2026-08-01-asc-engine-seams-design.md` (`061d5710`), designs BOTH
passes, so pass two needs no second sitting, only its just-in-time plan. The governing constraint,
Geoff's at the sitting: every seam properly generic, for any builder; ASC and ecxc are evidence,
never shape.

**The spec and plan are POST-REVIEW.** Geoff ordered a pre-implementation adversarial review
(2026-08-01); both read-only reviewers (`web-auth-security-reviewer`, `svelte-reviewer`,
Opus) returned do-not-implement-as-written verdicts, and the fold landed as `5e09e437`. The
blocking catches, so the executor knows why the contract looks the way it does: `canReach`
alone fails open on unmapped POSTs (the wrapper now mirrors `requireAccess`'s
`hasAccessRule` predicate), a catch-all route's pathname is attacker-chosen (`opts.target`),
and the `AuthEnv`-fixed `AdminActionEvent` broke route `Actions` assignability
(compile-proven; now generic). The spec's "Adversarial review record" section carries the
full list and the one deliberate non-adoption (fail over throw).

**NEXT: execute pass one** from the committed plan,
`docs/superpowers/plans/2026-08-01-asc-engine-seams-1.md` (`ae3e9072`, amended `5e09e437`):
four tasks, the
`cookieName`/`tokensMatch` internal refactor, the `./auth-crypto` server-only subpath, the
`createSectionAction` module and suite, and its export plus docs. A fresh Opus session executes on
a feature worktree, dispatching each task to `cairn-implementer` per the repo defaults;
`web-auth-security-reviewer` is mandatory at the pass-end fan-out (auth crypto plus an
authorization wrapper). Pass two (seams 3+4+5: the `./cloudflare` subpath, the packaged D1 audit
sink) follows with its own plan written from the spec after pass one lands.

**Resume prompt**, from `~/Projects/cairn-cms`: "Execute the ASC engine-seams pass one per
`cairn-pass`. Plan: `docs/superpowers/plans/2026-08-01-asc-engine-seams-1.md`; spec:
`docs/superpowers/specs/2026-08-01-asc-engine-seams-design.md`. Work on a feature worktree off
`main`; dispatch each task to `cairn-implementer`; hold unpublished at close (the window batches,
`release-size: minor`)."

Three carry-notes from the xcathletes pass, still live (its full entry is archived):

1. **`check:snippets` is a FOURTH CI-only gate the local ritual skips**, alongside
   `check:comments`, `check:reference:signatures`, and `check:surface`. The `cairn-pass` skill's
   step 5 names the other three and should name it.
2. **The engine now owns email normalization** (`src/lib/auth/store.ts`); `COLLATE NOCASE` on
   `editor.email` is filed in ROADMAP's Next tier for the next auth migration (that queued
   migration may claim `0002`, which is why the audit-sink migration number is claimed at
   pass-two plan time).
3. **`main` arrived red once** (the CodeMirror bump landed without the suite); the fix shipped
   with the xcathletes pass, and the lesson stands: nothing lands on `main` without the suite.

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
