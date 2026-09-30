# Docs-code sync, built as the arms are drafted: design

**Date:** 2026-09-30. **Status:** approved by Geoff, 2026-09-30 (rulings S1 to S9), folded after a four-lens review and again
after its fold verification (`docs/superpowers/research/2026-09-30-docs-code-sync-fold.md`); page names updated 2026-09-30 to match their titles (owner ruling); meaning unchanged. The Acceptance clause "and zero across all six is read there as a prompt failure" was struck 2026-09-30 per the 2a plan fold (PR-12): a zero count is no failure signal, and the checkpoint reports entries per pilot page while the close triages them. **Parent:**
`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` (the stages, the page chain, the
pilot checkpoint). This spec amends the parent: it adds a code-first gap sweep to each rebuilt
stage's planning phase and two docs-code sync mechanisms that ride steps already running. Where
it and the parent disagree, this spec governs for stage 2a onward; the disagreements are listed
under "Amends the parent."
**Inputs:** the gap sweep record (`docs/superpowers/research/2026-09-30-extend-gap-sweep.md`) and
the prior-art record (`docs/superpowers/research/2026-09-30-docs-code-sync-prior-art.md`).

## Brief

The harvest proved every old page's claims against the code, so the fact container holds what the
August-era docs said. It holds nothing they omitted. A code-first sweep of the extend reader's
surface produced 140 raw findings (167 verifier records after splits, none refuted), which
yielded 148 verified gap claims (131 filed as new facts after dedupe) and 12 code defects; 4
existing facts were corrected, and 2 outline pages were added. Of the 74 surface findings, 27 were major, clustered in the adapter and editor
config, delivery and SEO, component authoring, and the scaffold's build and deploy traps (2a
plan, "Code-first gap sweep").

Two mechanisms keep the container in step from here on, each built into the page chain while
the arms are drafted rather than retrofitted after:

1. **Option coverage.** A committed map gives every public option path a fact, an exclusion with
   a reason, or a frozen pending entry; a gate fails any path with no entry, and page inputs
   receives its page's entries.
2. **Release sweep.** A capability release runs the code-first sweep over the window since the
   last swept tag, with an independent verifier before anything is filed.

The gap sweep also becomes a standing step in each rebuilt stage's planning phase, and the page
chain treats drafting as a design review through its existing friction route. A fact-staleness
lockfile was drafted and fails the lean guard: the four facts it named were wrong when filed, not
made wrong later. It is deferred with a trigger, with three other mechanisms. The pilot of six
still runs as the parent spec describes. Geoff ruled the release sweep's cadence and the
ceiling (S8, S9).

## Owner rulings (Geoff, 2026-09-30)

| # | Ruling |
| --- | --- |
| S1 | Build the sync system while the arms are drafted, never as a later retrofit. |
| S2 | Guard against over-engineering: it has happened twice before in the docs space (the docs reset's reader-validation line and the style-guide sync's re-accretion). |
| S3 | Prior art must include agent-first setups: where agents make a method cheap, and where they make a human-era safeguard matter more. |
| S4 | Stage 2a's pilot of six holds. |
| S5 | The gap sweep may add outline pages; Geoff keeps or cuts each on the R10 page. |
| S6 | Stage 2a's ceiling is 18M, flagged at 14.4M. Superseded by S9. |
| S7 | Use the docs as a design review of cairn itself: what is hard to document often reflects bad design, so drafting surfaces improvement opportunities. |
| S8 | The release sweep runs only on capability releases (the release rule's trigger 2), capped at 1M per cut, and never blocks a cut on its yield. |
| S9 | Stage 2a's ceiling is 24M, flagged at 19.2M, on the measured spend under "Budget." (A first approval of 21M rested on wrong arithmetic; Geoff re-ruled on the measured numbers.) |

## The lean guard (S2)

Every mechanism in this spec meets all three conditions, and a later fold or plan review that adds
one must meet them too:

1. **A named prior-art source** that runs it (the prior-art record's methods table or its
   addendum).
2. **A failure today's sweep found** that it would have caught, named by finding id or fact id.
3. **It rides a step that already runs** (the fact read, page inputs, the docs gate, or the
   release skill), or states why no existing step can carry it.

A mechanism that fails a condition is deferred with a trigger, not built. The plan review runs
this guard as an explicit lens and records one verdict per mechanism, each with its three
citations; any finding that proposes new machinery is held to it.

## The gap sweep in each stage's planning phase

Before an arm's outline goes to Geoff, the stage runs the sweep this stage ran:

1. **Finders** read the arm reader's surfaces: the export surface, the scaffold and CLI, and the
   changelog. A deep read of whole module source follows only when the finders' majors cluster
   (here they did, in the adapter config, delivery, and component authoring).
2. **Independent verifiers**, one per batch of finders, confirm, correct, or refute every finding
   against source at HEAD. The finders never verify themselves (Huang, ICLR 2024: self-correction
   without external feedback degrades).
3. **One filer** dedupes, files verified gaps as `[verified]` facts, corrects wrong facts in
   place, places each fact on an outline page or adds a page (S5), and records code defects for
   the friction log. A defect is never a fact.

Each finder and verifier reads one surface or one module per context (context rot, Chroma). The
arm's reader sets the surfaces: admin's sweep covers the setup command, doctor, and Cloudflare
steps; editors' covers the `/admin` UI's behavior. This stage's sweep cost about 3.3M (measured) against its
3M share; stage plans budget from that figure, scaled to the arm's surface.

## Mechanism 1: option coverage

**Prior art:** typescript-eslint's `docs.test.mts` fails any rule option in the schema with no
documented heading and keeps a named allowlist; Terraform's generate-then-diff check is the
inventory form. **Failure it catches:** the sweep's largest class, options added inside public
types with no fact (`editor.publishActions`, `editor.preview`, `editor.nav`, fieldset `refine`
and `behavior`, `summaryFields`, `ComponentDef`, the `media` config). **Rides:** page inputs
(the map is its input) and the docs gate (`docs-gate.mjs`, the one list the chain and CI read).

A text match against facts or reference pages would not have caught that class: before the sweep
(`86fd134c^`), every option named above already appeared in `docs/reference/*.md`, and leaf-name
matching covers 178 of `CairnAdapter`'s 180 paths. The gate therefore checks a committed record,
never prose.

- **The walker is new.** `check:surface` renders each export as one flat string and expands no
  member paths. The generator reuses the export enumeration over `dist` declarations that
  `check:surface` and the docs gate's `check:reference` already share (`surfaceSubpaths`,
  `moduleExports`) and adds a member walk, so it joins `docs-gate.mjs` on the same footing. An
  unfiltered walk measured 7,497 paths from 2,269 member declarations; a crude filter left 1,379.
- **Option-bearing** means a member of a named type a developer passes in, reached from
  `defineAdapter`, the `define*` helpers, and the route-factory config types. A path is keyed by
  its declaring type (`AssetConfig.maxUploadBytes`), so a type reached from several roots is
  listed once. The walk stops at a named type already listed (`ArrayField.item: FieldDescriptor`),
  and excludes `*Data` and runtime outputs, descriptors, registries, and engine component props.
  The plan records the generated count and the pending count at creation.
- **The map** is one committed file beside the fact container, one sorted row per path: a
  citable fact id, `exclude` with a reason, or `pending` with the outline page slug that should
  dispose it. Matching is exact equality of the declaring-type path key; nothing else counts.
- **The gate** walks the types and compares them to the map. It fails a generated path with no
  row, a row whose path is no longer generated, a row naming a fact id that does not exist or is
  not `[verified]`, an `exclude` with no reason, and a `pending` row whose slug is not a page in
  a committed outline, so every row for an arm is a fact or an exclusion once its outline is
  deleted at the arm's merge.
- **Pending only shrinks.** The gate holds the pending count at the map's creation as a
  committed constant and fails when the map's pending count exceeds it, the way Betterer commits
  its results file and fails a run that gets worse (its results-file and introduction pages,
  in the prior-art record's addendum). A disposal lowers the constant in the same
  diff, where it shows. So a new option can never be parked as pending, in 2a or in any later
  engine pass. When the gate fails on an unmapped path, its message names the two ways out: file
  the fact, or add an `exclude` row whose reason the diff-reviewer accepts.
- **Page inputs** receives its page's rows: the pending rows naming its slug and the rows whose
  fact id is in its outline entry's `factIds`. It disposes each pending row in its claim
  inventory (carried, filed, or cut with a reason) and rewrites the row to the fact id or the
  exclusion, the same way it already files facts. The fact read's existing rule blocks an
  inventory item the page dropped without a `cut`.
- **After an arm merges**, its outline is deleted but the map stays: an engine pass that adds an
  option fails the gate until it files the fact `CLAUDE.md` already requires.
- **Defaults stay facts.** TSDoc `@defaultValue` on every optional member is the conventional
  home, but mandating it moves doc text into source comments; it is deferred (below).

## Mechanism 2: release sweep

**Prior art:** Kubernetes' release docs deadline and Rust's docs-before-stabilization gate, with
OpenAI's recurring doc-gardening agent and READU as the mechanized forms. **Failure it catches:**
the classes option coverage cannot see, such as the sweep's scaffold findings (25 raw, `SCF-1` to `SCF-25`)
and the changelog gaps that landed after the harvest (15 raw, `CLN-1` to `CLN-15`), which sit
outside option-bearing types. **Rides:** the `cairn-release` skill, before the version is set.
Its cadence and cap are S8: capability releases only, 1M per cut, never blocking the cut. It
stops at the cap and reports the unswept modules. An urgent cut (trigger 1) keeps its fast path
and rolls its window into the next sweep.

- **Window.** From the last engine tag whose sweep `docs/HISTORY.md` records, matched as
  `v[0-9]*` with prerelease tags excluded (the repo's `tool/v*` tags interleave), so a cut that
  ran no sweep rolls its range into the next one. The finders work from the `api-surface.md` diff,
  the scaffold's emitted-template diff, and the changelog's `Consumers must:` and behavior lines,
  one module per context as the planning sweep does. A per-file window would have meant about 192
  files for `v0.97.0..v0.98.0`.
- **Filing.** Before an arm merges, a verified gap is placed on its outline page as the planning
  sweep does. After an arm merges, the gap is filed as a fact naming the rebuilt page it affects,
  and the page fix follows in the next pass under "Edits after the chain"; the cut never waits on
  it (S8). A gap with no page home becomes a friction entry, not a new page.
- **What it does not do.** It finds new gaps; it does not re-verify existing facts whose cited
  files changed (257 facts in the last window). A verifier that meets an existing fact the
  changed code contradicts reports it; that report is the deferred staleness mechanism's trigger.
- **Yield.** Each run records in `docs/HISTORY.md` the verified gaps found beside the modules
  swept, so window size does not confound the measure. A steady yield says option coverage
  misses a class, which names the next mechanism to consider. Two consecutive capability
  releases with zero verified gaps move the sweep to on-demand, run when a site round finds a doc
  gap in a surface changed since the last sweep.

## Docs as a design review (S7)

Writing a page after the code is built is the cheapest design review cairn gets. What is hard to
explain usually reflects a design flaw: a seam that needs a caveat, an exception list, or a
workaround step before it can be used safely. The sweep already surfaced several, found as gaps
or defects but rooted in design: settings saves that read a config path the scaffold does not use
(DAD-1), concept ids that silently collide with admin routes (DAD-2), SEO fields that are ignored
unless declared in the schema (EXB-4), and an image field honored only under the key `image`
(EXB-5). **Prior art:** the Rust RFC template's required "Guide-level explanation", which asks
the author to explain a proposal "as if it was already included in the language and you were
teaching it" (https://github.com/rust-lang/rfcs/blob/master/0000-template.md), and Rust's
docs-before-stabilization gate. **Rides:** the drafter's existing friction route (it writes a
design gap straight into `docs/internal/docs-friction-log.md` and names it in `frictionFiled`),
and the log's own charter, "the design friction that writing a doc surfaces."

- **Two more agents use the same route.** Page inputs and the fact read, the two agents that meet
  the code, get the drafter's instruction and a `frictionFiled` field. The drafter's instruction
  widens from "a genuine design gap" to the smells above: a hedge, a caveat, an exception, a
  workaround, a surprising default, or two seams naming or behaving the same thing differently.
  Each entry names the fact ids or `file:line` involved. The register editor does not report;
  its job is prose. No new agent runs. Page inputs' schema and the read schema gain the
  drafter's `frictionFiled`; the read schema is shared with the register editor and the figure
  verifier, so the runner copies the field only from page inputs, the drafter, and the fact read.
  With three pages in flight, up to three agents per page write the log directly, and the Edit
  tool's stale-read check is the guard against a lost write.
- **The page documents the code as it is.** A friction entry never blocks or pauses a page. The
  fact records the code's behavior, including a defect's consequence, and the page states it.
- **The stage close triages them**, in the close's fold agent, never the conductor. It reconciles
  every `frictionFiled` entry against the log, then triages complete-or-move under the log's
  verify-first rules: routed to an engine pass through the `ROADMAP.md` tier where it bites
  (tagged as simplifying a named page), or deleted with a reason. Before promoting an engine
  change it reads `docs/internal/engine-rulings.md` and runs the charter's premise test (EXB-5
  sits against the ruling `audit-adapter-imagefield`). The stage's HISTORY entry counts the
  entries and their outcomes, so each arm's design yield is visible next to its page cost.
- **An engine fix lands in an engine pass, never inside a docs stage.** When one lands, it fixes
  the facts and the page it simplifies in the same pass, under "Edits after the chain."

## Deferred, with triggers

| Mechanism | Prior art | Why deferred | Trigger |
| --- | --- | --- | --- |
| Fact-staleness lockfile: the fact read stamps a normalized hash of each cited declaration, and `check:facts` fails a changed one | Swimm's snippet coupling, API Extractor | Fails guard condition 2. The four facts it named (`f:kkp5bi`, `f:hdrzxd`, `f:7wiuwr`, `f:i4fj93`) were wrong when filed, and their cited code has not changed since, so a stamp would have certified them. The sweep found no fact made wrong after verification. | A later code change makes a verified fact wrong (a fact read, release-sweep verifier, or site round finds a `[verified]` fact whose cited code changed after its verification). The review records' findings are the design's starting inputs. |
| Resolve every backticked identifier in pages and facts (extends `check:symbols`) | rustdoc intra-doc links, Sphinx nitpicky | No sweep finding is a fabricated or deleted name on a page; the wrong names found were real symbols misattributed (`f:7wiuwr`) | A fact read or owner read catches a fabricated or renamed identifier on a drafted page |
| Changelog entries cite the fact ids a surface change touches | Go's `api/next` and `doc/next` check | Its trigger is a stale-fact event, which has not occurred | The staleness lockfile is built and has run through one release |
| Optional `Test:` pointer on behavior facts | doctest, Go examples | No sweep finding is a behavior fact gone wrong with its declaration unchanged; a test pointer costs a test per fact | A verified behavior fact goes wrong without its cited declaration changing (behavior moved elsewhere) |
| TSDoc `@defaultValue` on optional public options | API Extractor, TypeDoc | Moves doc text into source comments; defaults are carried as facts today | The option map shows defaults as its most common exclusion |

## Amends the parent

The parent is not edited here; these are owed errata, applied as the harvest fold's were:

- The Brief's "No new check is built" gains one gate (option coverage), and "The budget goes to
  pages" gains the non-page shares below.
- The stage flow's step 1 opens with the planning-phase sweep, which is the carrier for stages 3
  to 5.
- The Budget's "about 1M for planning" per stage does not hold if a sweep costs near the measured
  3.3M: across stages 3 to 5 that is up to about 7M more against R8's 30M, which the pilot
  checkpoint's combined question on the initiative ceiling carries.
- Stage 2's extend page count grows by the two sweep pages, if Geoff keeps them (S5).

## What stage 2a inherits

- **Order.** The mechanisms land before the pilot, so the pilot's page inputs receive map rows,
  and the pilot checkpoint measures their cost with the rest.
- **Tasks added to the 2a plan:** the walker, the map with its initial slug assignment (one
  Sonnet dispatch over the declaring types and the outline), and the gate in `docs-gate.mjs`
  (`engine-logic`); the chain changes (page inputs takes map rows and rewrites them; page inputs
  and the fact read carry `frictionFiled`; the runner copies it); the `cairn-release` step (a
  skill edit); and filing DAD-1, EXB-4, and EXB-5 as friction entries, since they were filed as
  facts and the triage stream never saw them.
- **New pages** from the sweep (`configure-media`, `run-cairn-audit-on-your-site`) are 2b
  pages; the pilot and 2a's page list do not change.
- **Defects** go to the friction log (filed 2026-09-30).
- **Task 1's lock** in `cairn-docs-outline` handles more races than it needs, an S2 instance
  recorded in the post-mortem. The tool lives in `~/.dotfiles`, outside the close's
  `code-simplifier` scope, so any simplification is a separate dotfiles change with a
  `diff-reviewer` read, not part of this pass.

## Budget

Spend through the fold verification is measured for subagents; the conductor session is not, and
its figure is an estimate the plan's counting rule replaces with `/cost`. The subagent line
includes the sweep's measured 3.31M. The mechanisms add about 1.2M (one `engine-logic` task with Opus review for the
walker, map, and gate; the chain edits; the skill step). The other remaining shares (tasks 2, 4,
6, and 7 and the conductor from here) are 3.0M.

| Line | Planned | At pass A's rate |
| --- | --- | --- |
| Subagents through the first fold (measured) | 5.20M | 5.20M |
| Fold verification (measured) | 0.13M | 0.13M |
| Conductor through handoff (estimated) | 1.50M | 1.50M |
| Mechanisms and friction route | 1.20M | 1.20M |
| Pilot and task 5 | 7.75M | 9.90M |
| Tasks 2, 4, 6, 7 and the conductor from here | 3.00M | 3.00M |
| **Projected total** | **18.78M** | **20.93M** |

S9's 24M ceiling flags at 19.2M. The planned total sits under the flag, as the parent's 80
percent rule requires, so the flag fires only on an overrun; a pass that runs at pass A's page
rate trips it, and the pilot checkpoint's combined question carries that overage with task 5's
pages the lever. The plan review and this second fold are not yet priced.

## Acceptance

- The walker, the map, and the gate exist; the gate fails a planted new member on
  `CairnAdapter.editor` with no row, naming the path and its export; it fails a row for a removed
  path, a row naming a missing fact id, and an `exclude` with no reason; it passes on the
  committed map. The planted member sits inside a nested named type, so a walk that stops
  early fails the fixture. It also fails a pending count above the committed constant and a
  `pending` row whose slug names no page in a committed outline. The plan records the generated
  and pending counts at creation.
- Page inputs receives its page's rows and rewrites each pending row it disposes.
- `cairn-release` carries the windowed sweep step, the tag glob, the yield record, the 1M cap,
  and the retire rule, for capability releases only (S8).
- The parent's owed errata land, the stage flow among them naming the planning-phase sweep.
- Page inputs, the drafter, and the fact read carry `frictionFiled`, and the runner copies it to
  the page record. The pilot checkpoint reports entries per pilot page. The stage close's HISTORY entry counts the entries and how
  each was triaged.
- The 2a plan's pilot task depends on the mechanism tasks; the R10 page marks both added pages
  keep-or-cut; the plan review records one guard verdict per mechanism with its three citations.

## Out of scope

The deferred mechanisms above; a per-commit sweep (READU's model), since a release window is the
cheaper first cut; fixing the filed code defects, which the friction log routes; and any change to
the reference arm's own gates.
