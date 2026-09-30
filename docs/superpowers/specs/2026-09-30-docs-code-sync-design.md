# Docs-code sync, built as the arms are drafted: design

**Date:** 2026-09-30. **Status:** draft for Geoff's review. **Parent:**
`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` (the stages, the page chain, the
pilot checkpoint). This spec amends the parent: it adds a code-first gap sweep to each rebuilt
stage's planning phase and three docs-code sync mechanisms that ride steps the page chain already
runs. Where it and the parent disagree, this spec governs for stage 2a onward.
**Inputs:** the gap sweep record (`docs/superpowers/research/2026-09-30-extend-gap-sweep.md`) and
the prior-art record (`docs/superpowers/research/2026-09-30-docs-code-sync-prior-art.md`).

## Brief

The harvest proved every old page's claims against the code, so the fact container holds what the
August-era docs said. It holds nothing they omitted, and a fact whose code changed underneath it
stays green as long as its `Source:` line still resolves. A code-first sweep of the extend
reader's surface found 140 gaps that independent verifiers confirmed (none refuted), which became
131 new facts, 4 corrected facts, 2 new outline pages, and 12 code defects. Most of the majors
were options inside types, defaults, and error paths that no changelog entry announced.

Three mechanisms keep the container in step from here on, each built into the page chain while
the arms are drafted rather than retrofitted after:

1. **Option coverage.** A generated list of every public option path feeds each page's inputs,
   and a gate fails an option with no fact or reference entry.
2. **Fact staleness.** The page chain's independent fact read stamps a normalized hash of each
   cited declaration into a lockfile; a code change that alters a stamped declaration fails
   `check:facts` until a fact read re-verifies it.
3. **Release sweep.** Each release cut runs the code-first sweep over the git range since the
   last tag, with an independent verifier before anything is filed.

The gap sweep also becomes a standing step in each rebuilt stage's planning phase. Three further
mechanisms the prior art recommends are deferred, each with a trigger. The pilot of six still runs
as the parent spec describes.

## Owner rulings (Geoff, 2026-09-30)

| # | Ruling |
| --- | --- |
| S1 | Build the sync system while the arms are drafted, never as a later retrofit. |
| S2 | Guard against over-engineering: it has happened twice before in the docs space (the docs reset's reader-validation line and the style-guide sync's re-accretion). |
| S3 | Prior art must include agent-first setups: where agents make a method cheap, and where they make a human-era safeguard matter more. |
| S4 | Stage 2a's pilot of six holds. |
| S5 | The gap sweep may add outline pages; Geoff keeps or cuts each on the R10 page. |
| S6 | Stage 2a's ceiling is 18M, flagged at 14.4M. |

## The lean guard (S2)

Every mechanism in this spec meets all three conditions, and a later fold or plan review that adds
one must meet them too:

1. **A named prior-art source** that runs it (the prior-art record's methods table).
2. **A failure today's sweep found** that it would have caught, named by finding id or fact id.
3. **It rides a step that already runs** (the fact read, page inputs, `check:close`, or the
   release skill), or states why no existing step can carry it.

A mechanism that fails a condition is deferred with a trigger, not built. The plan review runs
this guard as an explicit lens, and any finding that proposes new machinery is held to it.

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
steps; editors' covers the `/admin` UI's behavior. This stage's sweep cost about 4.4M against its
3M share, the first measurement; stage plans budget from it.

## Mechanism 1: option coverage

**Prior art:** typescript-eslint's `docs.test.mts` fails any rule option in the schema with no
documented heading and keeps a named allowlist; TypeDoc's `requiredToBeDocumented` is the
generation-side form. **Failure it catches:** the sweep's largest class, options inside public
types with no fact (`editor.publishActions`, `editor.preview`, `editor.nav`, fieldset `refine`
and `behavior`, `summaryFields`, `ComponentDef`, the `media` config). **Rides:** page inputs
(the list is its input) and `check:close` (the gate).

- A generator walks the option-bearing types reachable from the public export surface (the same
  enumeration `check:surface` and `docs/internal/api-surface.md` already do) down to member paths,
  and writes them to a committed list.
- The page-inputs step receives the paths its page covers and maps each to a fact, files a new
  fact, or records an exclusion with a reason. A generated list is the input, so the agent never
  enumerates options from memory.
- The gate fails any path that no citable fact names and no reference entry documents. It starts
  from a committed baseline of today's uncovered paths, which may only shrink; adding a path to
  the baseline needs a reason on the entry.
- Defaults stay facts. TSDoc `@defaultValue` on every optional member is the conventional home,
  but mandating it moves doc text into source comments; it is deferred (below).

## Mechanism 2: fact staleness

**Prior art:** Swimm's snippet coupling (per-PR auto-sync on a normalized form, since a raw hash
proved too noisy) and API Extractor's golden report, which `check:surface` already is at the
signature level. **Failure it catches:** the four facts the sweep corrected (`f:kkp5bi`,
`f:hdrzxd`, `f:7wiuwr`, `f:i4fj93`), each wrong while its `Source:` still resolved. Name
resolution alone catches only deleted references (Tan et al., EMSE 2023). **Rides:** the page
chain's fact read (the stamp) and `check:facts` (the gate).

- A lockfile beside the container maps each stamped fact id to its source, a hash, and the commit
  it was verified at. For a `path#Symbol` source the hash covers the declaration's normalized
  syntax tree (comments and whitespace stripped), found through the compiler-API lookup
  `check:facts` already has; for a `path:line` or range source it covers the cited lines'
  normalized text, and accepts more noise.
- Only the fact read stamps. It already opens every cited declaration to verify the claim, so the
  stamp costs one command and means "an independent reader verified this claim against this code."
  The drafter, page inputs, and implementers never stamp, and there is no bootstrap script, which
  would record a verification that never happened.
- `check:facts` fails a stamped fact whose current hash differs from its stamp, naming the fact
  ids. An engine pass that changes a stamped declaration re-verifies those facts in the same pass
  (a fact-read dispatch over the named ids), so drift is caught in the change that causes it.
- A lockfile diff is listed in the diff-reviewer's read. An agent re-running a stamp to turn a
  gate green without reading the claim is the failure the prior art names; the reviewer checks
  each re-stamp against a fact-read record.
- Unstamped facts are not failed. Coverage grows as rebuilt pages cite facts; the release sweep
  covers the rest.

## Mechanism 3: release sweep

**Prior art:** Kubernetes' release docs deadline and Rust's docs-before-stabilization gate, with
OpenAI's recurring doc-gardening agent and READU as the mechanized forms. **Failure it catches:**
everything mechanisms 1 and 2 cannot see, such as scaffold traps (the themed 404, Workers Builds
not running migrations) and behavior outside option-bearing types. **Rides:** the `cairn-release`
skill, before the version is set.

- The sweep runs the planning-phase shape above, windowed to the git range since the last
  published tag and fanned out one changed declaration or scaffold file per context, with an
  independent verifier before filing.
- Its yield per release (verified gaps found) is recorded in `docs/HISTORY.md`. A falling yield
  is the measure that mechanisms 1 and 2 work; a steady one says they miss a class, which names
  the next mechanism to consider.

## Deferred, with triggers

| Mechanism | Prior art | Why deferred | Trigger |
| --- | --- | --- | --- |
| Resolve every backticked identifier in pages and facts (extends `check:symbols`) | rustdoc intra-doc links, Sphinx nitpicky | No sweep finding is a fabricated or deleted name on a page; the wrong names found were real symbols misattributed (`f:7wiuwr`) | A fact read or owner read catches a fabricated or renamed identifier on a drafted page |
| Changelog entries cite the fact ids a surface change touches | Go's `api/next` and `doc/next` check | Its trigger is mechanism 2's stale event, which does not exist yet | Mechanism 2 has run through one release |
| Optional `Test:` pointer on behavior facts | doctest, Go examples | Mechanism 2 covers drift for the pilot; a test pointer is stronger but costs a test per fact | A stamped behavior fact goes wrong without its declaration changing (behavior moved elsewhere) |
| TSDoc `@defaultValue` on optional public options | API Extractor, TypeDoc | Moves doc text into source comments; defaults are carried as facts today | Mechanism 1's gate shows defaults as its most common exclusion |

## What stage 2a inherits

- **Order.** The mechanisms land before the pilot, so the pilot's fact reads stamp and its page
  inputs receive option paths, and the pilot checkpoint measures their cost with the rest.
- **Tasks added to the 2a plan:** the option-path generator and coverage gate with its baseline
  (`engine-logic`); the lockfile, the stamp command, and the staleness check in `check:facts`
  (`engine-logic`); the page chain changes (the fact read stamps, page inputs takes the paths),
  riding task 1's outline read; and the `cairn-release` step (a skill edit).
- **New pages** from the sweep (`configure-media`, `gate-your-site-with-cairn-audit`) are 2b
  pages; the pilot and 2a's page list do not change.
- **Defects** go to the friction log (filed 2026-09-30). A defect that makes a page's
  instruction wrong carries a one-line note on its fact, so the drafter documents the intended
  behavior only where the code honors it.
- **Task 1's lock** in `cairn-docs-outline` is simplified at the close's `code-simplifier` pass to
  a plain exclusive-create lock with a stale break; its extra race handling was built past need,
  an instance of S2 recorded in the post-mortem.

## Budget

Stage 2a had spent about 4.9M by this spec (the outline, the sweep, the prior art, the errata,
and task 1). The three mechanisms add about 1.5M (two `engine-logic` tasks with Opus review, the
chain edits, and the skill step). The pilot and the rest of 2a stay as planned: about 7.75M at
planned rates and 9.9M at pass A's rate. With setup, relink, the consistency read, and the close,
the pass projects at about 16.5M planned and 18.7M at pass A's rate, against S6's 18M. The pilot
checkpoint re-derives it from measured cost, as the parent spec requires; if the projection then
exceeds 18M, that checkpoint's combined question carries it.

## Acceptance

- The option-path list is generated and committed; page inputs receives each page's paths; the
  gate fails a planted uncovered path and passes with the baseline; the baseline cannot grow
  without a reason.
- The lockfile and stamp command exist; the fact read stamps each fact it verifies; `check:facts`
  fails a planted edit to a stamped declaration and passes a whitespace-only edit.
- `cairn-release` carries the windowed sweep step and the yield record.
- Every rebuilt stage's plan template names the planning-phase sweep.
- The lean guard's three conditions appear in the 2a plan's Global constraints.

## Out of scope

The deferred mechanisms above; a per-commit sweep (READU's model), since a release window is the
cheaper first cut; fixing the filed code defects, which the friction log routes; and any change to
the reference arm's own gates.
