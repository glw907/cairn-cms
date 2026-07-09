# The machine-local design-iteration loop

Status: approved by Geoff 2026-07-08 ("looks good, proceed"), with both flagged forks
resolved to the recommendation (arc log lives in the repo; deploy-at-settle is the default
and settle-and-hold is allowed). Mid-execution Geoff added a scope ruling: the media-seeding
tool ships with cairn for consumers, not as a per-site script.

## Context and governing rulings

During the aksailingclub education arc (round 3) Geoff issued binding process rulings,
banked in `aksailingclub-org/docs/design-benchmark/decisions.md` (the PROCESS entry) and the
`design-iteration-economics` memory:

- Design iteration runs fully local: `vite dev` with HMR, reviewed by Geoff in a live
  localhost tab. Nothing deploys to GitHub or Cloudflare until the design is finalized.
- An arc runs 10 to 15 iterations; each turn takes minutes. Cost and latency per iteration
  are the binding constraints, not per-iteration quality ceremony.
- Owner notes are exploratory probes ("an opportunity for you to change and try out"), not
  settled directives.
- Per-iteration ceremony is banned: no code-simplifier, no full gate, no e2e per tweak. The
  simplifier and the whole gate run once, when the arc settles and the branch merges.
- The design-refinement skill's dispatch-builders shape failed these economics on its cold
  trial. It needs an exploratory mode; its existing rounds-and-passes machinery remains
  valid for landing settled designs.

The media plumbing that makes local review real already works in the ASC repo: a
seed script (`scripts/sync-media-local.mjs`) populates wrangler's local R2 state from the
deployed site, and a dev-only vite middleware (`devMediaFallback`) works around the engine's
media-route `onlyIf` bug (ROADMAP "Now").

## The loop

### Who edits, and how notes flow

The main loop edits directly. A dispatch costs context pre-extraction plus round-trip
latency that exceeds the edit itself, and reviewing a subagent's diff per tweak is exactly
the banned ceremony. One exception, proven in education round 3: when a note is a genuine
fork in taste, fan out two or three parallel static-HTML or branch candidates to Sonnet
dispatches while the main loop keeps working; the owner or the conductor picks. That is
divergent exploration, not iteration, and it is the only dispatch shape inside an arc.

Notes flow through the conversation, live. A note that is a question gets a reasoned answer
before any edit (the questions-are-not-commands rule). A probe gets rendered, and the reply
tells the owner exactly what to look at. Each iteration ends with a verdict: keep, revert,
or push further.

Each kept iteration gets a one-line commit on the arc branch (`design: <probe>`). Commits
are the undo mechanism, not ceremony; a reverted probe is a checkout, not archaeology. No
pushes until settle.

A one-line-per-iteration arc log rides along in `docs/design-benchmark/` next to the
decisions log: probe tried, verdict, why. It is insurance against context summarization and
a crashed session, and the raw material the settle-time decisions entry distills. At settle
it is distilled into the round's `decisions.md` entry and removed.

### Self-check cadence (three tiers, none the full gate)

1. Per iteration, always: watch the dev server output (a background process) for HMR and
   console errors. Nothing more for pure CSS and copy tweaks; the owner's eyes are the
   per-iteration visual gate.
2. Per structural edit (splitters, wrappers, `{@html}` segments): run the targeted
   regression test plus a quick DOM sanity check. This tier exists because of the round-3
   hydration duplication bug, invisible in the code, which cost a whole round of misread
   notes.
3. Every ~5 iterations, and before any "ready for your look" on a structural rework: one
   render read of my own at 390 and 1440 (with the body-scroller capture guard), catching
   the locally-coherent-globally-incoherent drift that focused per-note eyes miss.

### The settle ritual (once, when the owner ratifies)

Trigger: the owner's notes go felt-tier or he says it is done.

1. Design gates first: the design-probe script, the multi-lens fresh-agent critique fan-out
   (narrow lenses, refuter aggregation), and a five-viewport render read. Findings return to
   the owner as one batch.
2. Code ceremony second: code-simplifier over the arc's whole diff, then the repo's full
   gate.
3. A final quick render read confirming the simplifier changed nothing visible.
4. Artifacts: the round entry in `decisions.md` (settled decisions with reasoning, dose
   words quoted), benchmark re-pin if the owner ratified a new one, arc log distilled and
   removed.
5. Merge and push, then the one deploy, a post-deploy render read, and the owner's
   before/after if the page is member-facing. Deploy-at-settle is the default; a site may
   settle-and-hold and deploy several arcs together.
6. Harvest: engine frictions to the cairn ROADMAP, chassis-worthy machinery banked.

### Packaging

The loop lands as an exploratory-arc mode in the existing `design-refinement` skill, chosen
at invocation alongside the existing settled-landing machinery. A new skill would fork the
method from the artifacts it reads and writes (benchmark, ledger, decisions log, dose
words); a script would encode the trivial part and none of the judgment.

## The shipped tool: `cairn-media-seed` (Geoff's ruling, 2026-07-08)

The media-seeding capability ships with cairn as a bin, following the `cairn-doctor` and
`cairn-manifest` pattern, so any consumer can iterate designs locally against real media.
This supersedes harvesting `sync-media-local.mjs` into the showcase chassis.

Shape, generalized from the ASC script:

- Reads the site's media manifest (`src/content/.cairn/media.json`, the engine's own
  convention).
- Downloads each object from a deployed site: `--from <base-url>` (required), with optional
  repeatable `--header 'Name: value'` for access-protected sites (the ASC Access service
  token case).
- Derives the R2 bucket name from the site's wrangler config (reuse the doctor's
  wrangler-config reader) and writes each object into wrangler's local state via
  `wrangler r2 object put <bucket>/media/<hash[0:2]>/<hash>.<ext> --file <tmp> --local`,
  the same content-addressed key the media route reads.
- Idempotent; exits nonzero if any object fails; reports synced/failed counts.
- No `.dev-media` plain-file mirror: that existed only for the middleware workaround, which
  the companion fix below retires.

### Companion fix: local-dev-safe media route (already ROADMAP "Now")

`createMediaRoute` passes the request's `Headers` instance as R2 `get`'s `onlyIf` (and
`range`). Production accepts it; miniflare's `getPlatformProxy` cannot serialize `Headers`,
so every `/media` read 500s under a consumer's `vite dev`, which is what forced the ASC
middleware. Fix: derive a plain `R2Conditional` from the conditional headers and a plain
`R2Range` from the `Range` header. Without this fix the seeded local bucket is unreachable
under `vite dev`, so the tool and the fix ship together. The release changelog notes that
the ASC `devMediaFallback` middleware retires on upgrade.

## Generalization

The loop is chassis-generic: every family site is vite + SvelteKit + the same media route.
With `cairn-media-seed` and the route fix shipped, any cairn site (family or external) gets
local design iteration from the package alone. The `design-probe.mjs` pre-review gate stays
site-side material and is banked in the showcase chassis in genericized form (the
band-composed page list as explicit config), since its hard-fail checks encode site design
opinion. The engine's own admin design work already fits the loop (the showcase runs local;
`mint-session` covers the admin smoke session).

## Work list

1. Skill: add the exploratory-arc mode to `~/.claude/skills/design-refinement/SKILL.md`.
2. Engine (branch `design-iteration-tooling`): the media-route `onlyIf`/`range` fix with a
   serializability regression test; the `cairn-media-seed` bin with unit tests over its pure
   parts; reference page, local-iteration guide, CHANGELOG entries under Unreleased, ROADMAP
   prune of the shipped item.
3. Chassis: genericized `design-probe.mjs` into `examples/showcase/scripts/`.
4. Memory: update `design-iteration-economics` when the skill mode lands.

## Acceptance

- A fresh checkout of any cairn consumer can run `cairn-media-seed --from <url>`, start
  `vite dev`, and see real media on every page with no site-local middleware.
- The media route serves 200/304/206 correctly in production and under `vite dev`
  (regression test proves no `Headers` instance reaches `bucket.get`).
- `npm run check:reference` and the full gate pass; the new bin has a reference page.
- The design-refinement skill states both modes and the exploratory rules above.
