# The cleanup pass: split the repo along engine-development versus consumer-facing

**Date:** 2026-08-08. **Status:** ratified in the Fable brainstorm sitting; ready for a plan.
**Authorized:** as its own pass (Geoff, 2026-08-07, ROADMAP Now tier). **Sequencing:** runs
ahead of release one, so its one consumer-visible change batches into the single crossing each
site makes.

## Goal and governing ruling

The engine a consumer receives should be lean, organized, and nothing more than what using
cairn requires. The repo may hold every tool that builds the engine, but the sausage-making
must be organized, must live outside the shipped surface, and must still earn its keep.

The governing ruling (Geoff, 2026-08-07): complexity is welcome locally to help build the
engine, and contributors keep every tool they need in the repo, but a developer who just wants
to USE cairn should receive none of it.

The mechanical form of the line: svelte-package emits everything reachable under `src/lib`,
and the `files` array adds the rest of the tarball. Therefore engine apparatus lives outside
`src/lib`, and a gate enforces the tarball's shape. `vertical-metrics` is the worked example:
nothing named it in `files` or the exports map, and it shipped anyway.

## Measured baseline

Taken 2026-08-07, re-confirmed 2026-08-08: **2.5 MB packed, 7.0 MB unpacked, 741 files**
(739 at the first measurement; the instrument is `npm pack --dry-run`, which is the honest
one, since `files` and the exports map both under-report). Success is this baseline moving
down with zero export subpaths lost.

## Decisions ratified in this sitting

1. **cairn-audit ships whole, as consumer product.** The ROADMAP hypothesized a split
   (consumer rules ship, engine-conformance rules stay). The rule inventory dissolved it:
   all 23 registered rules audit only the `/admin` surface, and a consumer's admin IS cairn's
   admin toolkit, so conformance to cairn's design system is exactly the product being
   audited. The shipped `cairn-admin-screens` skill already directs a consumer's agent to run
   the audit as a done-gate. The 792 KB is CLI code in `node_modules`, never in a site's
   runtime bundle. What is engine apparatus sits adjacent to the rules, not among them: the
   unregistered `vertical-metrics` lab module, the norms generator (already engine-side in
   `scripts/`), and the probe script. No export is removed.
2. **Scope edges, all three in:** repo history pruning (delete `legacy/`, prune closed-plan
   binary artifacts), example-theme relocation, and the `@anthropic-ai/sdk` conversion to an
   optional peer dependency.
3. **Approach: boundary-first cleanup** (approach A of three weighed). Establish the
   structural line, then sweep every surface against it in one pass, mechanical work first,
   judgment-bearing sweeps last. The alternatives, packed-surface-only (half the goal) and a
   full contributor re-layout with a maintained repo map (more churn and standing surface
   than a pre-beta repo needs), were declined.

## The work

### 1. Lab eviction and the anti-leak gate

`src/lib/audit/rules/rendered/vertical-metrics.ts` (66.6 KB in dist), its tests, and
`scripts/probe-vertical-alignment.mjs` move as one unit to an engine-side lab home outside
`src/lib` (exact home is the plan's call; the constraint is only that svelte-package cannot
reach it and vitest still can). The module's `// WATCH:` comment, which deferred this move to
this pass, dies with the move.

`check:package` (`scripts/check-package-files.mjs`, already the tarball-shape gate) grows a
dist-contents assertion: every module under the packed rule directories is reachable from
the rule registries (`rules/static/index.ts`, 9 rules; `rules/rendered/index.ts`, 14), so an
unregistered module can never ship again. The registry indexes and any helper a registered
rule imports pass by construction; a module nothing in the registries reaches fails. The gate stays a pure function driven by the real `npm pack --dry-run`
file list, the shape it already has.

### 2. The audit ruling, recorded

Ruling 1 above lands where it stays settled: a line in
`docs/internal/what-cairn-is-and-is-not.md` and a sentence in `docs/reference/cairn-audit.md`
stating what ships (the registered rules, the manifest, the CLI) and what deliberately does
not (the norms generator, the probe apparatus).

### 3. `@anthropic-ai/sdk` to optional peer

The SDK is a plain runtime dependency today (`^0.105.0`), statically imported at the top of
`src/lib/sveltekit/content-routes-context.ts`, so every consumer installs it whether or not
they use the tidy action. A lazy import alone does not change that; install weight follows
`dependencies`. The change is therefore both:

- Move the SDK to `peerDependencies` with `peerDependenciesMeta` marking it optional.
- Import it dynamically at the tidy call site, with an actionable refusal when tidy is
  invoked and the SDK is absent (name the package, name the install command, through the
  engine's standard refusal channel, with a log event if the vocabulary calls for one).
- Type-only imports may stay static; they cost nothing at runtime.

This is the pass's one consumer-visible break: a site using tidy must add the SDK to its own
dependencies. Its `Consumers must:` line batches into release one, which is why this pass
runs ahead of the cut.

### 4. The dead-test sweep

Inventory the 422 test files and classify each against conservative criteria:

- **Dead:** the assertion target no longer exists (a removed rule, a renamed export the test
  never followed, a baseline the suite no longer writes).
- **Travels:** lab-apparatus tests, which move with the eviction in task 1.
- **Duplicate:** TDD scaffolding whose coverage is demonstrably held by a later, broader
  test. Demonstrably means named: the surviving test is identified, not presumed.
- **Lives:** everything else. When in doubt, the test stays.

Gates: the full suite exits 0 after the sweep, and the surface gates (`check:surface`,
`check:reference`, `check:package`) are unchanged. This task is shaped for an adversarial
find-and-verify workflow (finder fan-out, a skeptic per proposed deletion); the plan offers
it and Geoff opts in at execution.

### 5. Repo organization

- **Delete `legacy/`** (328 KB, the pre-rebuild source frozen 2026-05-28). Git history keeps
  it; the freeze commit is `140fca04`.
- **Relocate the three theme ports** (`examples/astropaper-theme` 26 MB, `examples/foxi-theme`
  27 MB, `examples/gallery-theme` 11 MB) to their own repo, recommended name
  `glw907/cairn-themes`, history preserved via subtree split. Verified 2026-08-08: nothing in
  `.github`, `scripts/`, `package.json`, or the published docs arms references them.
  `examples/` keeps the showcase (the canonical proving ground) and `examples/cairn-theme`
  (16 KB; the plan verifies what it is before deciding it stays).
- **Prune closed-plan binary artifacts** under `docs/superpowers/` (22 MB) and
  `docs/internal/` (7.6 MB): screenshots and captures referenced only by closed plans and
  superseded reports are deleted (git history keeps them). Post-mortem and plan text stays.
  Any image a live doc links stays; the sweep greps for references before deleting.
- **Group `scripts/`** (39 flat files) into `checks/`, `build/`, and `lab/`, updating the
  `package.json` script paths and any cross-references. The subdirectory names are the map;
  no new standing doc.
- **Refresh `knip.jsonc`** as an on-demand instrument: drop the dead `legacy/**` ignore,
  correct its header (it still describes itself as a one-shot for the July code-polish
  pass), and leave it a tool rather than a gate.

### 6. The docs dimension

Reference and guide pages touched by the SDK change; CHANGELOG entries under
`## Unreleased` (the SDK break carries its `Consumers must:` line); the ROADMAP cleanup
entry marked done and removed from the Now tier; STATUS pointed at release one as the next
action.

## Success criteria

- The packed baseline moves down from 2.5 MB / 7.0 MB / 741 files, measured by
  `npm pack --dry-run`, with every export subpath intact.
- `check:package` fails on any unregistered module under the packed rule directories.
- The repo top level contains no dead tree: `legacy/` gone, `examples/` holding only what
  the gates prove against.
- The full gate is green: `npm run check` 0/0 and `npm test` exit 0, on a fresh
  `npm run package` (several assertions read the built package).
- The one consumer-visible change is exactly the SDK peer move, carried in the changelog.

## Considered and kept

- The shipped docs arms and CHANGELOG (277 KB): deliberate product; the shipped skill points
  a consumer's agent at the installed copies.
- The spellcheck dictionary (1.6 MB, the largest packed file): load-bearing product.
- `packages/cairn-cms-dev`: unpublished (`0.0.0`), showcase-only today. Whether it becomes a
  published companion is a separate positioning question, not this pass's.

## Out of scope

The visual-suite tolerance floor and admin corpus gaps, the Wrangler fixture Worker, the
chassis safelist decision, and everything else in ROADMAP's Now tier not named above. They
stay where they are filed.

## Risks

- **Test deletion losing real coverage:** held by the conservative criteria (dead only when
  the target is gone or the surviving test is named) and the adversarial verify shape.
- **Theme relocation breaking a link:** held by the pre-move grep; the published arms are
  already verified clean.
- **The SDK refusal path regressing tidy for equipped consumers:** held by a test that
  exercises tidy with the SDK present and the refusal with it absent.
- **Artifact pruning deleting a live image:** held by the reference grep before any delete;
  git history is the recovery path either way.
