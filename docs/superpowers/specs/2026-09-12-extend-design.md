# Extend: design

Drafted 2026-09-12 during the polish run, from a brainstorm with Geoff. Revision 2, landed
2026-09-14 after a fresh-context read against post-C `main` at `55fc7762` and a three-lens
adversarial review (charter-and-ledger, mechanics-and-feasibility, domain-risk). The Fold section
records what the review changed; "What the fresh read changed" records what the read changed
before it. Geoff reads those two sections; the rest is the design as it now stands.

Executed by two plans: `docs/superpowers/plans/2026-09-14-extend-1-pass.md` (gates and atoms) and
`docs/superpowers/plans/2026-09-14-extend-2-pass.md` (guidance).

## Fold (2026-09-14)

Revision 1 went to three adversarial lenses. Every ranked change is applied. The ten decisions
that changed the design's shape, with the lens that forced each:

1. **The comment standard and the hygiene idioms leave the shipped gates** (charter 1, mechanics
   13 and 14). They are this workstation's authoring charter and cairn's own pass-ritual
   vocabulary, and shipping them tells a developer how to write comments, which is a design
   choice and not a mechanic. Two of the three idioms invert for a consumer (a site's own
   hostname is the normal thing for a site to write). They stay engine-internal in
   `eslint.config.js` and `check-idioms.mjs`.
2. **There is no third package.** With the comment rules out, the payload was one rule, and the
   charter lens's honest fallback (a single config, no bin) still needs ESLint in a site that has
   none (mechanics 13: neither the template, the showcase, nor either production site carries
   ESLint). The log-event rule becomes a `cairn-audit` static rule over source text, the mechanism
   the scaffold already wires and the engine's own `check-idioms.mjs` already uses. That removes
   the trusted-publisher bootstrap, the lockstep gate, and the four template spec-rewrite sites
   (mechanics 10) in one move.
3. **`outcome-grammar` is cut as a rule** (charter 3, mechanics 12). It found none of the ecxc
   evidence it was designed from (both envelopes sit outside form actions), it contradicted the
   ruling's two-outcome allowance in its own trigger, and the ruling governs public result types,
   not `ActionData`. The grammar is taught by a recipe and asked about by the extension reviewer.
4. **The log rule reserves exact engine event strings, never areas** (charter 2). Reserving
   first segments would outlaw the showcase's own exemplar (`admin.signups.misconfigured`) on the
   day it is converted. The engine exports its event list as a runtime array.
5. **The stylesheet seam is utilities-only, compiled to a fixed path, imported from the admin
   layout alone, and proved by three assertions** (risk 1 and 2, mechanics 3 and 4, charter 4).
   Revision 1's entry activated the DaisyUI plugin, which re-emits complete component definitions
   into a higher layer than the engine's own overrides, so one `.btn` on a custom screen would
   restyle every engine screen. And a Vite-compiled entry has no stable path for the audit to
   name. The shape below is the engine's own proven four-line entry plus a standalone compile.
6. **The package writes only files it created and stamped** (charter 5, mechanics 15, risk 4).
   The install refreshes the guidance tree, keeping a `.orig` beside anything it overwrites that
   differs. The `check:cairn` script, the audit config, the CI workflow, and the `CLAUDE.md`
   import line are reported with their snippet, never written, on an existing site. The settings
   hook is a snippet in the fragment and is written by nothing, ever. The bake, as the creator,
   writes the workflow, the guidance tree, and the import line into a new site.
7. **The scaffold's GitHub App gains `workflows: write`** (mechanics 1, a blocker). Without it the
   Git Data API refuses the whole tree push once it carries a `.github/workflows/` path. The
   permission lands in the manifest the scaffold mints, so every new app has it; no existing
   installation needs re-acceptance because the scaffold only pushes with an app it just created.
8. **Batch actions on `AdminTable` is engine work riding along, not an atom** (charter 10,
   mechanics 5). Neither production site reinvented multi-select, so it fails the list's own test,
   and `AdminTable` has no row model, so the shape is an additive `selection` prop plus a snippet
   with rows still caller-owned. The Tooltip primitive passes the test on ASC's evidence (native
   `title` on action controls across ten admin route files) and stays.
9. **The doctor is not the installer, and no extend pass adds a doctor check** (Geoff,
   2026-09-14, after the fold: the Go `cairn` tool's 1.0 build is in flight and `cairn-doctor`
   is about to retire). The guidance install and the wiring report move to a new package bin,
   `cairn-guidance`, which is the doctor's existing skill-install code relocated to a bin whose
   whole job it is. That also resolves the ledger contradiction the read found (departure 4) the
   other way round: the retire is executed, late, and the install lives where the ruling's first
   ground said it should. The install stays in the npm package rather than the Go tool because
   the scaffold runs it at creation with no Go binary present, and one implementation beats two.
   The CLI's relationship is stated in Layer 3.
10. **Plan-review corrections folded back** (2026-09-14, six lenses over the two plans). The
   scaffold's template is baked from the showcase at prepack, and the overlay directory
   composes only into the GitHub template repository, so anything a scaffolded site must carry
   (the CI workflow, the guidance tree, the `CLAUDE.md` import line) travels through the bake:
   the workflow lives in the showcase, where GitHub ignores a nested `.github`, and the bake
   writes the guidance tree and the import line the way it writes the dev shim, so a site is
   born with them and no install runs at creation. The shipped review agent carries
   `tools: Read, Grep, Glob` and no model pin, because a packaged agent with `Bash` is the
   unattended-execution door the trust boundary exists to close. Skills and agents are
   auto-discovered on install with no consent line, and the boundary says so. The documented
   hook is a `Stop` hook running the static audit with `--if-present`, never a `PostToolUse`
   hook that compiles a stylesheet on every write. `.orig` is never clobbered, the install
   writes a `MANIFEST` so a retired file is named rather than silently retained, and `check`
   gains `--strict` for a site that wants a gate. Redaction matches a whole key against a
   documented list, since substring matching would have destroyed two documented engine fields
   (`tokens`, `tokenLength`). The event union stays the type source of truth, with the runtime
   array asserted equal to it in both directions at compile time, so the two parsers that read
   the union by shape are untouched. The gate runner keys its lock on the working directory, so
   two worktrees do not serialize and their browser-bearing gates would run concurrently, which is
   the recorded 2026-09-14 crash; a pass's second chain therefore runs no browser-bearing gate.

Smaller applied changes: the ledger action is executed in extend-2 as Fold 9 states (charter 8
asked for a reversal in extend-1; Geoff's note settled it the other way); `createLogger` lives
in its own module so `check:self-use` sees a caller (mechanics 7); `check:reference` is
configured per subpath and needs a `CONFIG` entry, and the sentence claiming it fails on its own is
corrected (mechanics 8); the skill budget check is decoupled from the tier-map assertion
(mechanics 9); `createLogger` redacts secret-named keys and the reference page carries a never-log
list (risk 10); a trust-boundary section is added (risk 11); the import-syntax watch becomes a
scheduled routine (risk 12); `cairn-btn-guarded` stays compiled for one minor with a rule naming
the migration, and any new consumer-facing audit rule enters at advisory tier for one minor
(risk 8 and 9); the Tooltip ships its own scoped styles rather than DaisyUI's excluded `.tooltip`
(risk 7); `check:cairn` is static-only with the rendered half opt-in (charter 6); ten public
`*Outcome` types, not eleven (mechanics 18); the upgrade page gains a guidance-install step in
extend-2 (mechanics 19, revised by Fold 9); `/log` and `/admin-toolkit` are added to ROADMAP's seam bullet rather than riding
it (mechanics 20); the members login exemplar is described accurately as a consumer of engine
outcome types (charter 11); the create-site CI assertions are amended as a named deliverable
(mechanics 2); the transcript fixtures are re-captured (mechanics 16); the seam proof's
acceptance is a CI regen of exactly ten baselines (mechanics 17).

## The question

The audit-remediation and polish slices refined a set of patterns inside the engine. What makes it
easy for a developer extending cairn to borrow them, given that the ways a site extends cairn are
unpredictable?

Two consumer sites are the evidence, as working examples of what happens without the extend
initiative, never as exemplars. aksailingclub-org (ASC) built a twenty-section custom admin over its
own D1 schema and a second member identity. ecxc-ski built a registration and contact pipeline with
no custom admin at all. Their survey (session record, 2026-09-12) shows one thing borrowed well and
two classes reinvented:

- Both copied the chassis and theme boundary from the showcase's `src/chassis/README.md` verbatim.
  Borrowing by reading works.
- Both reinvented what the engine had but did not export: auth crypto until `0.94.0`, the
  section-action guard until `0.93.0`, the admin toolkit until the harvest, and structured logging
  still. The emitter is internal, so ecxc's handlers call `console.error`, and so does the
  showcase's own custom-screen exemplar (`examples/showcase/src/routes/admin/signups/+page.server.ts:29`
  writes `console.error('admin.signups.misconfigured', ...)` by hand in the engine's grammar).
- Both reinvented what the engine holds as a convention with no shared shape: the form-outcome
  envelope, invented twice inside ecxc alone (a remote function and a domain handler, neither a
  form action).
- The craft failure is real: ecxc runs no audit, and both sites hit the dead-DaisyUI-class trap on
  admin routes independently, one in production. ASC's admin routes carry hand-written `<style>`
  blocks whose own comments name the cause ("admin routes load only cairn's compiled
  cairn-admin.css").

## Decisions taken in the brainstorm

- Audience: both the package's third-party developer and Geoff's own sites, with the package and
  scaffold as the floor and Claude infrastructure shipped for a developer using Claude Code.
- Failure modes designed against: reinvention first, craft inconsistency second. Drift on upgrade is
  the standing constraint on every choice, not the target.
- Architecture: qualities, not features. Ship what a pattern checks or composes, never what it
  builds, because the next extension is not one we can draw. Rejected: archetype exemplars as the
  primary channel (copied code drifts; polish-11a Task 9's scratch site is the live case) and an
  extension framework (registration APIs make cairn a framework and widen the 1.0 surface).
- Claude infrastructure ships inside the package (a few kilobytes of markdown a non-Claude user
  never opens), installed by a package bin (the brainstorm named `cairn-doctor --fix`; Fold 9
  moves it to `cairn-guidance`). A split into its own package is the fallback if the set grows
  heavy.

## What the fresh read changed

Ten departures from the 2026-09-12 draft, verified against `main` at `55fc7762`. Where the Fold
later changed one, the Fold governs.

1. **The outcome family is a grammar, not a type.** No `Outcome` or `Failure` type exists on the
   surface or inside the engine. `convention-outcome-idiom` (`engine-rulings.md:237`, widened by
   polish-C Task 8) rules one grammar: the discriminant key is `outcome`, its values are a
   kebab-case string-literal union, an operation with more than two distinguishable outcomes uses
   it, and every such type is named `*Outcome`, with `*Failure` kept for a `fail()` payload whose
   arms are all refusals. The engine composes ten such types on its public surface with no shared
   generic, and `createSectionAction`'s signature is already generic over the site's own `T`. A
   generic export would be the framework move the brainstorm rejected. The grammar is taught, not
   exported. The logger is the asymmetric case because it carries runtime behavior a site must
   match byte for byte to share one queryable Workers Logs stream (sink per level, envelope keys
   written last); the outcome grammar has no runtime at all.
2. **The logger export is generic over the site's own event union.** `src/lib/log/emit.ts` types
   `log` against the closed `CairnLogEvent` union. A site cannot add to that union and must not
   collide with it. The export is `createLogger<Event extends string>()`, returning the same three
   methods and the same envelope, plus `CAIRN_LOG_EVENTS`, the engine's event list as a runtime array asserted equal to the type
   union in both directions at compile time, so the grammar rule can refuse a site event equal to
   an engine one. The engine's own `log` becomes `createLogger<CairnLogEvent>()` and is not
   itself exported.
3. **No ESLint, no new package.** (Superseded by Fold 2; kept for the record of why the draft's
   `cairn-check` was first re-homed and then dissolved.)
4. **The ledger and the code disagree about `cairn-doctor --fix`, and this design executes the
   ledger row rather than building on either silently.**
   `audit-cli-skill-admin-screens-check-and-cairn-doctor-fix` (`engine-rulings.md:4955`) reads
   "retire, closed, executed by the retires pass, batch 1b", on three grounds: a doctor probes
   deployed configuration and a skill is not that; the check assumes one agent harness; and the
   install leaks utility class names into the site's Tailwind scan. Yet `main` ships the check
   (`src/lib/doctor/check-skill.ts`), the flag (`assemble.ts`), the reference row and section
   (`docs/reference/doctor.md:45`, `:246`), and the packaged skill. The retire was recorded as
   executed without the removal, which is a ledger integrity failure on its own. The first
   ground stands and the doctor is retiring anyway (Fold 9), so extend-2 removes the check and
   the flag from the doctor and moves the install to `cairn-guidance`. The second ground is
   superseded by Geoff's 2026-09-12 decision: the harness assumption is accepted as the
   package's stated target, with the docs carrying every statement for everyone else. The third
   ground is closed by mechanism (the `@source not "./.claude"` exclusion, written by the
   scaffold and reported by `cairn-guidance check`). extend-2 appends a dated Note recording the
   late execution, the relocation, each ground's disposition, and the executed-without-removal
   discrepancy.
5. **The stylesheet seam has a shape**, given in Layer 2 as the Fold revised it. The packaged
   `cairn-admin.css` is built at publish, so no safelist a site writes can add a rule to it; only
   a site-compiled sheet can. `cairn-audit`'s `sheet` is already `string | string[]`
   (`audit-cli-no-uncompiled-class-static-rule`), and naming it replaces the default resolution,
   so the site lists the packaged sheet and its own.
6. **The save hook is documented, never installed**, and the same rule now covers every file the
   package did not create (Fold 6), whichever bin does the writing (Fold 9).
7. **Two Carbon defaults join extend-1**, per ROADMAP's "Five admin defaults" entry: the Tooltip
   primitive as an atom, the batch-action graduation as engine work (Fold 8).
8. **The motion pass hands extend five things**, per its plan's "What this pass hands forward":
   the three static rules and one rendered rule as the gates layer's first consumer-run motion
   members; `docs/extend/animate-a-custom-screen.md` as the extend track's first per-pattern recipe;
   the rendered half of `motion-hover-gate` with its trigger; the `.tooltip` touch defect, whose
   closing is a behavioral override of a vendor component and lands with the Tooltip primitive;
   and the `.menu` gate with the same follow-up.
9. **The scaffold writes a CI workflow, which it does not do today**, and its GitHub App manifest
   gains the permission that makes the push legal (Fold 7). Gated rules hold only where something
   runs them.
10. **extend-1 owns its own reference page.** `check:surface` derives its subpath list from
    `package.json` and fails on an unregistered one; `check:reference` checks only the subpaths
    its `CONFIG` names, so a new subpath needs an entry there and a page with a stability-tier
    marker on every export. Both land in extend-1. The recipes stay with the docs rewrite.

## Layer 1: gates

One installable check surface for a consumer's own code, wired by the scaffold into one
`check:cairn` script.

**`cairn-audit`**, the existing design-language auditor (twelve static and sixteen rendered rules
before the motion pass, which adds three static and one rendered), gains three things.

1. **Two static rules over source text**, a new input kind: `StaticRuleContext` gains an optional
   `sources` list (path and text of every `.ts` and `.svelte` file under the config's source
   scope, default `src`), populated by the static run. The two rules run over the whole source
   scope, never `adminOnly`, and enter at advisory tier for their first minor with the promotion
   version in their own message, the standing rule for any new rule aimed at a pattern consumers
   already write.
   - `log-event-grammar`: every string literal in the first argument of `<ident>.info(`,
     `<ident>.warn(`, or `<ident>.error(` matches `area[.subject].verb_phrase` (snake_case
     segments, a dotted subject allowed, a past-tense verb phrase or a state adjective last) and
     is not a member of `CAIRN_LOG_EVENTS`. This is a name heuristic, and its limits are stated
     in the rule's own doc comment: it fires on `console.info` and on another library's logger
     with the same method names, and it misses a computed name, a template literal, and a
     re-exported logger. The fix message names the grammar and the collision.
   - `log-secret-field`: a field key in the same calls that whole-key matches `REDACTED_LOG_KEYS`,
     the documented redaction list exported beside `createLogger` (`token`, `secret`, `password`, `cookie`,
     `authorization`, `session_id`, `sessionId`, `apiKey`, `privateKey`, case-insensitive) is
     flagged, because a runtime redaction catches a key and never a value interpolated into a
     message. `tokens`, `tokenLength`, and `hasSession`, all documented engine fields, are
     untouched by both.
2. **Scaffold wiring**, so every new site runs it from creation: the `check:cairn` script
   (`cairn-audit`, static only), a `check:cairn:rendered` script for the browser half a developer
   opts into, a `cairn-audit.config.json` naming the packaged sheet and the site's compiled admin
   sheet, and `.github/workflows/check.yml` running install, the site's check (whose `precheck`
   compiles the admin sheet), and `check:cairn`, with no secrets and no browser, and a last step
   `npx cairn-guidance check` under `continue-on-error` once extend-2 ships that bin. ecxc's dead classes would have
   failed `no-uncompiled-class` on the first push.
3. **The named-sheet hard error, locked by a test.** The audit already throws when a named
   sheet path is missing; extend-1 pins that with a named test and documents it, so a workflow
   that audits before the compile step fails loudly rather than reading a false green. The engine's
   own CI gains `npm --prefix examples/showcase run check:cairn`, so the seam cannot rot.

The engine-only gates (`check:surface`, `check:reference`, `check:self-use`, the comment gate,
`check:idioms`, and the rest) stay where they are. A check is a dev-time behavior of a package the
site already installs, so this layer widens no API surface.

## Layer 2: atoms

The closed list every extension composes regardless of purpose. Each earns its place by one test:
both sites reinvented it, or one did and the other will. Additions after this go through the
`engine-consult` charter test.

| Atom | Status on `main` | What changes |
| --- | --- | --- |
| The outcome grammar (`outcome` key, kebab literal union, `*Outcome` and `*Failure` names) | ruled convention, ten public instances, no shared type | unchanged; a recipe teaches it and the extension reviewer asks about it |
| The structured logger (`src/lib/log/`) | internal, typed to the closed engine union | `@glw907/cairn-cms/log` exports `createLogger<Event extends string>()`, `CAIRN_LOG_EVENTS`, `REDACTED_LOG_KEYS`, and the `CairnLogEvent` type; the engine's `log` is one instance of it |
| `createSectionAction` (`/sveltekit`) | shipped `0.93.0` | unchanged; taught as the default custom-action shape |
| The admin identity (`locals.cairnEditor`, `locals.cairnIdentity`, the guard) | shipped; the identity seam since the `0.96.0` window | unchanged; the recipes reference it |
| The admin toolkit (`/admin-toolkit`) | shipped, harvested from ASC | gains `Tooltip`: visible on focus and hover, dismissed on Escape, reachable on touch, with its own scoped styles and literal fallbacks (never DaisyUI's `.tooltip`, which the scaffold's theme excludes); it replaces native `title` on every engine action control; `cairn-btn-guarded` stays compiled on its four sites, named as retired at advisory tier by `stock-default-hazards`, and its removal is a later pass |
| The site admin stylesheet | no seam; the engine's prebuilt sheet is the only one under `/admin` | a recipe plus scaffold wiring, shape below |

**Engine work riding along, not an atom:** batch actions graduated from `CairnMediaLibrary` onto
`AdminTable` in an additive shape, an optional `selection` prop (a `Set` of caller-owned row ids
with an id accessor) and a `batchBar` snippet that renders when the set is non-empty, rows still
rendered by the caller's own snippet. No existing prop changes. The media library's roving focus,
shift-range anchor, and dialogs stay where they are.

**The stylesheet seam's shape.** The site keeps a second Tailwind entry, `src/admin.css`, in the
engine's own proven form (`scripts/build/admin-css.input.css`):

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities) source(none);
@source "./routes/admin";
```

It emits only the utilities the site's admin routes use, with no preflight, no base, no theme
block, and no DaisyUI plugin: every DaisyUI component the admin uses is already compiled in the
engine's sheet, and activating the plugin here would re-emit complete component definitions into
the utilities layer, above the engine's `components`-layer overrides. A site that needs a DaisyUI
component the engine does not compile adds `@plugin "daisyui" { themes: false; include: <that
component>; }` naming only it, and the recipe states that including a component the engine already
ships is forbidden. A standalone compile, `npx @tailwindcss/cli -i src/admin.css -o .cairn/admin.css`
as the `build:admin-css` script (run by `precheck`, `prebuild`, `predev`, and `check:cairn`, and in
watch mode by the scaffold's dev shim), gives the audit a fixed path; `/.cairn/` is gitignored at
the root only, since the content manifest also lives under a `.cairn` directory. The admin
`+layout.svelte` imports `.cairn/admin.css` after `CairnAdminShell`, so Vite hashes and
route-splits it as a plain asset and it loads on admin routes only. The site sheet is unscoped
where the engine's is prefixed with a zero-specificity `:where([data-theme=...])`, so a site
utility and an engine component rule tie on specificity and the utilities layer wins, which is the
memory-recorded Tailwind v4 fact and the intended direction: a utility on the site's own element
beats the engine's component default for that element.

extend-1 proves it on the showcase's signups screen with one utility the engine's sheet does not
compile. The static half runs in the task: the audit fails before the seam and passes after. The
rendered half runs once after the merge, against a branch-point capture: a public page's served
CSS is unchanged; each admin page gains exactly one sheet, whose body carries the utility; the
computed styles of the engine's own admin screens are unchanged and a rendered `cairn-audit` pass
over them shows no new finding.
The ten `admin-signups-*` visual baselines move, regenerated on CI, and the acceptance criterion is
that regen commit rewriting exactly those ten files with a green run after it.

Off the list on purpose: the `navLayout` per-role collapsed hook (a real seam gap, but a feature
ask for the consultation channel), and any domain helper (money, email, members, registration stay
the site's).

**The logger's promise, stated narrowly.** `/log` promises three method names, the envelope keys
and their write order (fields first, then `level`, `event`, `timestamp`), the redaction of
secret-named keys to `'<redacted>'`, `REDACTED_LOG_KEYS`, and `CAIRN_LOG_EVENTS`. The console sink is not promised.
Every `createLogger` instance emits through the module's one sink, so a future subscriber fan-out
registered on the module reaches the site's records and the engine's alike: the stream stays one.
`CLAUDE.md`'s paragraph stating the logger is internal is rewritten in extend-1, and `/log` and
`/admin-toolkit` are added to ROADMAP's 1.0 seam bullet, which names the log event names already.

## Layer 3: guidance

The layer that handles the extension nobody drew. It ships in the package under `skills/` (where
`cairn-admin-screens` already lives) and a new `claude/` directory added to `package.json`'s
`files`, and a new package bin, `cairn-guidance`, installs or refreshes it into the site's
`.claude/` (`cairn-guidance install`) and reports the site's wiring gaps with their snippets
(`cairn-guidance check`). It is the doctor's `check-skill.ts` and `--fix` relocated, since the
doctor is retiring in favor of the Go `cairn` tool and a skill install was never a deployment
probe. A scaffolded site is born with the tree: the template bake writes it at prepack from the
engine's own `skills/` and `claude/`, stamps `VERSION` from the engine version it resolves, writes
`MANIFEST`, and writes the `CLAUDE.md` import line, the same way it writes the dev shim.

**Relationship to the `cairn` CLI.** The Go tool is the operator's front door and the agent's
retrieval path (its planned `docs` search over the installed version). The fragment points a
developer's agent at `cairn docs <query>` where the tool is installed and at the tarball's docs
index where it is not. The tool owns no developer-tooling install; a later tool version may
surface guidance staleness as one of its health checks by reading `.claude/cairn/VERSION`
against the installed package, which is a hand-forward to the tool's 2.0, never an extend task. Every statement in these files also lives in the extend
docs, so a developer without Claude Code loses nothing.

- **A `CLAUDE.md` fragment** at `.claude/cairn/CLAUDE.md`, which the site's own `CLAUDE.md`
  imports with one `@.claude/cairn/CLAUDE.md` line (the scaffold writes the line;
  `cairn-guidance check` reports its absence and never edits `CLAUDE.md`). Its first line names what it is and that the
  `.claude/cairn/` tree is engine-owned and refreshed on upgrade, so site-specific guidance goes in
  the site's own file. It carries the boundary in two paragraphs (what is cairn's, what is the
  site's), the atoms by name, the gates and how to run them, the rule that a repeated local
  workaround is a consultation trigger, the DaisyUI-first rule, the save-hook snippet for
  `.claude/settings.json` (a `Stop` hook running `npm run check:cairn --if-present`, static only,
  never a `PostToolUse` hook), the DaisyUI tooling recommendation (the published skill via
  `npx skills add saadeghi/daisyui --agent claude-code` plus a free documentation server, with
  Blueprint named as the paid option; a recommendation the bin prints, never a dependency), and
  a pointer to the docs index the rewrite adds to the tarball.
- **Three skills.** `cairn-admin-screens` stays. `cairn-extend` is the recipe router: given what
  the developer is building, it opens with "is there a DaisyUI component or template for this?",
  then names the atom, the seam, the showcase exemplar, and the ruling behind each, and carries the
  pre-flight checklist that saved fix rounds in 11a. Its worked example is the engine's own
  home-grown-versus-DaisyUI grading from the 2026-09-13 minor-bump survey, including the cases
  where a documented DaisyUI defect in the rulings ledger is the reason a home-grown version
  exists. `cairn-consult` is the site-side half of `engine-consult`: it writes an ask in the brief's
  four-field format (what the pass builds, the engine edge it presses, evidence for the any-site
  case, the site's fallback if declined) so a site files one without this workstation.
- **One agent**, `cairn-extension-reviewer`: `tools: Read, Grep, Glob`, no `Bash`, no model
  pin, so it cannot run a command and runs on the consumer's own default model; reads a diff
  against the boundary, the atoms, and the craft bar, asks the DaisyUI question of every new component and the outcome
  grammar question of every action with more than two outcomes, and returns accept, fix, or
  escalate with `file:line` findings.
- **One hook, documented.** The static audit when the agent stops, as a snippet in the fragment.

Every packaged `SKILL.md` faces the existing 3,500-token budget over the whole file, frontmatter
included; the
budget check takes a list of skill paths, and its tier-map assertion stays bound to
`cairn-admin-screens` alone, the one skill that carries a tier map.

The recipes themselves are docs in the extend track, one page per pattern, each linking its engine
ruling as the why and opening with the version the pattern shipped in, so a site on an older range
reading cairn.pub's newer docs is told rather than led into a module it does not have. The skill
points at those pages rather than restating them, so there is one source and the docs rewrite owns
it. The first such page, the motion recipe, exists before extend-2 starts.

**Versioning and refresh.** `.claude/cairn/VERSION` is stamped from the package version at install.
`cairn-guidance check` compares it by the same tree hash `check-skill.ts` uses today, and the
scaffolded workflow's last step runs it with `continue-on-error`, so staleness prints on every
push and not only when a developer remembers to run it; `--strict` makes stale or missing
guidance exit 1 for a site that wants the gate. `cairn-guidance install` lists each destination
whose content differs and writes `<file>.orig` beside anything it overwrites, never clobbering an
existing `.orig` (the recovery copy is most needed on the second upgrade), and writes
`.claude/cairn/MANIFEST` so a later install names any path the package no longer ships rather than
leaving a retired agent discoverable forever. It never deletes. An edited skill is recoverable and
an upgrade's guidance change is a reviewable diff in the site's repo. extend-2 adds a step to `docs/extend/upgrade-cairn.md` running `cairn-guidance install`
after the bump, ahead of the existing doctor step, and removes the doctor's `--fix` flag, its `skill.admin-screens` check, and the
reference page's `--fix` section, since the doctor will not carry them into its retirement.

**Trust boundary.** Shipping agent markdown adds no capability a compromised release does not
already have: the package runs four bins and a Vite plugin in the site's build. It adds a review
class, because markdown is not typed, tested, or read by any gate. Publishing is OIDC trusted
publishing with provenance, which attests the tarball's origin and not its content. Two rules hold
the line: `cairn-guidance` never writes `.claude/settings.json`, because a hook is what would
give a compromised package unattended execution inside a developer's session without a
deliberate edit;
and the shipped agent carries no tool that can write or execute. The `@`-import line gates the
fragment alone: Claude Code auto-discovers `.claude/skills/` and `.claude/agents/` on install, and
on a scaffolded site the bake writes the import line, so the honest statement is that installing
the package's guidance is the consent, and the one deliberate act that removes all of it is deleting
`.claude/skills/cairn-*`, `.claude/agents/cairn-extension-reviewer.md`, and `.claude/cairn/`.
Everything the bin writes is committed to the site's repository, so it is diffable, and the
install says so. The
`@`-import syntax is another vendor's, so its change is an external trigger: extend-2 files a
scheduled routine that watches Claude Code's `CLAUDE.md` import documentation and pings on change,
per this repo's watch-item rule.

## Exemplars

The showcase keeps one demonstration per archetype, written to be read: a header comment names the
archetype, the atoms it composes, and the recipe page it illustrates.

- **The custom admin screen over the site's own table**: the signups route, the extend track's
  custom-screen example since polish-11b-ii and polish-C. extend-1 moves its hand-written
  `console.error` onto `createLogger`, adds the one site-compiled utility that proves the
  stylesheet seam, and leaves its two-outcome actions as they are, since the ruling allows them.
- **The public form with a domain action** (ecxc's shape): the members login route, which consumes
  the engine's `ChannelRequestOutcome` and `ChannelConfirmOutcome` at a site boundary and returns
  two-outcome `ActionData` of its own. That is the lesson an extender needs (switch on the engine's
  `outcome`, never on a boolean), and extend-1 adds the logger to its request action and the
  header comment saying exactly that. No new route, no new e2e surface, no new baseline.
- **External identity**: stays a recipe in the extend track, per the identity-seam ruling.

The scaffold copies none of the exemplar code; it copies the wiring only (gates, CI, and the guidance tree the bake writes). A developer borrows an exemplar by reading it.

## Drift

- `/log` and `/admin-toolkit` are added to ROADMAP's 1.0 seam bullet the day extend-1 lands, so
  `check:surface` and `check:reference` cover them from the first release.
- Every move of a stable seam ships a `Consumers must:` line and a `cairn-guidance check` line
  where the old shape is detectable in the site's tree. `cairn-btn-guarded` stays compiled for one minor after the Tooltip lands, and
  `stock-default-hazards` names the retired class with its migration in that window.
- Guidance versions with the package; `cairn-guidance check` flags a stale copy, and the
  workflow prints it.

## Adoption on existing sites

Not by default. `cairn-guidance check` (extend-2) reports six things, each with the snippet the
scaffold would have written: the `check:cairn` script, the audit config, the CI workflow, the
`CLAUDE.md` import line, the `@source not "./.claude"` exclusion (inspecting the entry Vite
builds, accepting a gitignored `.claude` as equivalent, and stating the Tailwind 4.1 floor), and
the guidance tree's presence and version. `cairn-guidance install` writes the guidance tree only.
A site adopts by bumping, running the install, and pasting the snippets the check names. ASC is
most of the way there. ecxc gets all of it from one bump and one run. No doctor check is added by
either pass, because the doctor is retiring.

The atoms take a site pass because they replace code: ecxc's two outcome envelopes and its
`console.error` calls; little for ASC beyond dropping hand-written scoped styles once the
stylesheet seam exists. The advisory-tier findings schedule the swaps.

ecxc's local hookify rules overlap the audit's static rules (its DaisyUI v4 class list is
`no-uncompiled-class`'s failure class); the shipped hook replaces them where they cover the same
ground, and the remainder is a harvest candidate.

## Sequencing

After the `0.97.0` cut.

1. **extend-1** (engine): the gates and atoms. Runs in parallel with the rest of the Go tool pass A,
   since the tool lives under its own module, and before the docs rewrite, so the rewrite documents
   exports that exist. Two independent chains: engine (the rules, `/log`, the Tooltip, batch
   actions, the exemplars, the ledger) and site (the seam proof, the scaffold wiring). A minor
   release when it is next cut, since `/log` is new surface.
2. **The docs rewrite**: the recipe pages with their "available since" lines, the docs index in the
   tarball.
3. **extend-2** (engine): the guidance layer. It waits on the rewrite for the recipe pages it routes
   to and the index the fragment points at.
4. **Site adoption**: one task in each site's next pass, after all three have landed, so each site
   migrates once onto the finished set (Geoff, 2026-09-13).

## Inputs recorded after the brainstorm

- `docs/internal/record/2026-09-13-carbon-patterns-survey.md`: Carbon against the admin, case by
  case. Part 5b's five default changes are decided in ROADMAP: three in the pre-cut window, two
  here. Carbon Charts is rejected outright; "Sign in" stays, per Microsoft.
- `docs/internal/record/2026-09-13-icon-set-comparison.md`: keep Lucide.
- The admin motion language pass (spec and plan of 2026-09-13): departure 8.
- DaisyUI first (Geoff, 2026-09-13): guidance-layer material, placed in the fragment, the router,
  and the reviewer.
- DaisyUI's own Claude tooling (Geoff, 2026-09-13): a recommendation the fragment carries and the
  bin prints. The engine's own implementers adopting the skill at user scope and a free server at
  project scope is a workstation config change, pending Geoff's yes and outside this design.
