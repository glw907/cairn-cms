# Docs-code sync spec review: mechanics and feasibility

**Target:** `docs/superpowers/specs/2026-09-30-docs-code-sync-design.md` at commit 15a71698, read
with the parent spec, the harvest spec, the sweep record, and the prior-art record. **Lens:** does
each mechanism behave as stated. Every claim below was checked with a probe run or a source quote.
The probes live in the session scratchpad and are not committed.

**Summary:** 2 blockers, 4 majors, 4 minors; 1 owner fork (MF-1). The two blockers are both
lean-guard condition 2 failures, measured. Mechanism 2's four named catches were wrong when they
were filed, so a stamp would have recorded them as verified. Mechanism 1's gate, as worded, passes
every option the spec names, because the reference arm already named each one.

## Evidence gathered

- **The surface enumerator.** `scripts/checks/check-surface.mjs:94-120` renders each export as
  one flat string. It expands one level of interface members. A referenced named type "stays a
  name" (line 105), and an inline object prints inline. A Svelte component prints as
  `Component<Props, {}, "">` with `Props` left unexpanded (`docs/internal/api-surface.md:121-146`).
  It produces no member paths.
- **Walker probe.** A recursive walker (about 40 lines) built on `surfaceSubpaths` and
  `moduleExports` reaches member paths, and it reaches Svelte props through the `Component` call
  signature's second parameter. Unfiltered, it yields **7,497** root-qualified paths from
  **2,269** unique member declarations. 730 paths hit the depth-6 cap on recursive types such as
  `ArrayField.item`. 1,174 paths are Svelte props, and 536 sit under `*Data` output types. A crude
  filter that drops outputs, runtime, descriptors, registries, and props still leaves **1,379**
  declarations. `.#CairnAdapter` alone has 180 paths. The named examples (`editor.publishActions[].href`,
  `editor.preview.bodyClass`, `FieldsetConfig.refine`, `media.maxUploadBytes`) all resolve.
- **Fact source forms.** The container holds 1,525 fact bullets. 1,216 (80%) cite only
  `path:line`, 56 cite only `path#Symbol`, 59 mix both, and 194 cite no code pointer at all. 461
  cite no `src/` file. Of the line pointers, 194 point into `.svelte` files, which
  `check-facts.mjs:514-516` bars from the symbol form.
- **The symbol lookup.** `resolveSymbolDeclaration` (`check-facts.mjs:479-506`) exists. It walks
  a parsed source file, but it returns `{ startLine, endLine }` and not the node. Returning the node
  is a small change.
- **The four corrected facts.** In `f:kkp5bi`, `f:hdrzxd`, `f:7wiuwr`, and `f:i4fj93`, the
  wrong wording entered the container at the harvest (`b9282369`, 2026-09-15) or at an extend
  audit (`70577ef3`, 2026-09-29). The code they misdescribe predates both:
  `createInstallationTokenCache` landed in `8621e217` (2026-06-02), the draft filter in `352450c6`
  (2026-05-30), and the embedded-routing throw in `8204d0de` (2026-07-15). At harvest,
  `f:kkp5bi` cited `docs/extend/security-model.md` and no code at all.
- **Hash probe.** On `src/lib/media/config.ts`, a normalized-AST hash (node kinds plus
  identifier and literal values) behaves as follows:

  | Edit | Symbol hash of `DEFAULT_MAX_UPLOAD_BYTES` | Symbol hash of `normalizeAssets` | Normalized text of line 35 |
  | --- | --- | --- | --- |
  | Prettier (60 columns, no semicolons, no trailing commas) | stable | stable | **changes** |
  | Two lines inserted above | stable | stable | **changes** (now reads `DEFAULT_PUBLIC_BASE`) |
  | Default changed from 25 MB to 50 MB | **changes** | **stable** | changes |
  | Redundant parentheses added | changes | stable | changes |

  In the first probe, `ts.forEachChild` stopped early because the callback returned a truthy
  value, so every hash came out equal. The implementer will meet the same trap.
- **Line-hash churn.** Stamp every line-cited fact at an old tag, then compare its lines at HEAD.
  Over `v0.97.0..v0.98.0` (740 commits), 320 of 1,144 hashes differ, and 64 of those differ only
  because the code moved. Over `v0.98.0..HEAD` (72 commits), 31 differ.
- **The page chain.** The fact read runs as `agentType: "general-purpose"`, so it has Bash
  (`docs-page-chain.js:702`). The workflow runtime itself has no filesystem or exec access (lines
  76-81), so a stamp runs the way `cairn-docs-outline link` does: an agent runs a rendered
  command. Pages run three at a time by default (`IN_FLIGHT`, line 213; worker pool, lines 768-783).
  The drafter already files friction directly into the friction log and returns `frictionFiled`
  (lines 149 and 606-610). `check:facts` runs inside the docs gate (`docs-gate.mjs:84`), which
  every drafter runs as its last act.
- **The release window.** Tags interleave with the Go tool's tags (`v0.98.0`, `v0.97.0`,
  `tool/v1.1.0`, ...). `v0.97.0..v0.98.0` touched 192 non-test source and scaffold files and
  changed 49 lines of `api-surface.md`. 257 facts cite a source file changed in that window.

## Findings

### MF-1: blocker. Mechanism 2 fails the lean guard's second condition. OWNER FORK

**Location:** `2026-09-30-docs-code-sync-design.md:105-108` ("Failure it catches"), `:56`.

**Defect:** The spec says the four corrected facts were "each wrong while its `Source:` still
resolved", and names them as mechanism 2's catch. The git record shows none of them drifted. Each
was wrong when it entered the container, and the code it misdescribes had not changed since. A
stamp only detects a code change after verification. Had these facts been stamped when they were
filed, the stamp would have recorded the wrong claim as verified, and the gate would have stayed
green. The sweep's independent verifiers caught them, and that is the planning sweep's and
mechanism 3's job. The sweep found no fact that went stale after it was verified. So under S2 the
mechanism has no named failure. There is a smaller cost as well: the lockfile covers only a claim
that was right when stamped.

**Options:**
- (a) **Defer mechanism 2 with a trigger** (recommended). Trigger: a release sweep or fact read
  finds a `[verified]` fact that was right when verified and was made wrong by a later code
  change. The release sweep already re-reads that population (MF-5), so the trigger can fire.
  This saves about half of the 1.5M mechanism budget and removes MF-4 and MF-6.
- (b) Build it only for `path#Symbol` sources, about 115 facts (7.5%), where the probe shows the
  hash is stable under formatting and line shifts. It is cheap, but it covers little, and it still
  has no named failure.
- (c) Build it as specified, with the MF-4 fold for line pointers. This fits S1's "build it
  while drafting", but it enters without a named failure, which is exactly the accretion that S2
  names.

If (a) is taken, rewrite the brief's claim at `:14-16` ("a fact whose code changed underneath it
stays green"). The sweep did not observe that, so the spec should call it a risk, not a finding.

### MF-2: blocker. Mechanism 1's gate passes every failure it names

**Location:** `:85-88`, `:96-98`.

**Defect:** The gate "fails any path that no citable fact names and no reference entry
documents." Before the sweep (`86fd134c^`), every named example already appeared as a whole word
in a reference page: `bodyClass`, `configPath`, `menuName`, `refine`, `summaryFields`,
`creatable`, and `transformations` in `core.md`, and `publishActions` in `sveltekit.md`. The
reference arm prints full type shapes, so the "or a reference entry" clause satisfies nearly every
path. Without that clause, the matching rule decides everything, and the spec leaves it open.
Leaf-name matching, the rule `reference-coverage.mjs` uses, covers 178 of `CairnAdapter`'s 180
paths, which makes the gate vacuous. Qualified-path matching leaves 157 uncovered, because nobody
writes `content.*.fields.fields.*.item.creatable`. The sweep's gaps were missing behavior,
defaults, and error paths in the narrative facts, not missing names. The cited prior art checks
structure, not word mentions: typescript-eslint requires an `option` heading plus examples per
option (prior-art record, line 163).

**Fold:** Make the committed mapping the gate's unit. Page inputs already "maps each to a fact,
files a new fact, or records an exclusion with a reason" (`:94-95`). Commit that mapping, one row
per path pointing at a fact id or an exclusion reason, and have the gate fail any generated path
with no row. Drop the reference-entry escape. The gate then checks a record an agent made against
the generated list, which is the typescript-eslint shape. The baseline becomes the set of paths
with no row yet. State in the acceptance criteria that the gate would have failed at `86fd134c^`
on the named examples.

### MF-3: major. The generator is a new type walker, and "option-bearing" is undefined

**Location:** `:90-92`.

**Defect:** Neither `check:surface` nor `api-surface.md` enumerates member paths ("Evidence
gathered"). The generator reuses the export enumeration (`surfaceSubpaths`, `moduleExports`), and
the probe shows the walk itself is short. But an unfiltered walk yields 7,497 paths and 2,269
declarations, so the spec's undefined policy choices decide whether the committed list has
hundreds of entries or thousands:
- Inputs versus outputs: `*Data`, `CairnRuntime`, descriptors, and registries are things a
  developer receives, not options.
- Deduplication: `CairnAdapter`, `ComposeInput`, and five `/sveltekit` configs all re-reach the
  same types, so key each path by its declaring named type, such as
  `AssetConfig.maxUploadBytes`, and not by every route that reaches it.
- Recursion: `ArrayField.item` and `ObjectField.fields` recurse.
- Svelte props: 1,174 paths. Are admin component props options?
- Which page a path belongs to: page inputs "receives the paths its page covers", but the outline
  has no path-to-page field.

**Fold:** Define option-bearing as the named types a developer passes in, reached from
`defineAdapter`, the `define*` helpers, and the route-factory config types. Key paths by declaring
type, stop recursion at a named type already listed, exclude `*Data` and runtime outputs, and
treat engine component props as out of scope unless an extend page documents them. Add an
outline field (or a declaring-type-to-page map) that assigns paths to pages. The walker probe runs
clean on today's `dist` in about a second, so feasibility is not in doubt. The walk also needs
`npm run package` first, as `check:surface` does.

### MF-4: major. The `path:line` hash is the common case, and it is noisy

**Location:** `:111-115`, `:218`.

**Applies only if** MF-1 option (b) or (c) is taken.

**Defect:** 80% of facts cite `path:line`, so the fallback path is the normal path. The probe
shows the normalized line text changes whenever lines are inserted anywhere above the cited line,
and it would change under a formatter run. Over the last full release window, 64 of 320
differing line hashes differed only because code moved. Today `check:facts` deliberately tolerates
a 10-line anchor window, because citations drift (`check-facts.mjs:46-57`). A line hash is
stricter than the current gate in exactly the dimension the gate relaxed. The acceptance line
"passes a whitespace-only edit" holds for a symbol source. For a line source, it fails when the
whitespace edit adds a line. There is also a coverage hole. A symbol hash of the consumer
(`normalizeAssets`) did not change when the default changed, because the literal sits in a
separate `const`. A default fact is caught only if it stamps the declaration that holds the value.

**Fold:** For a `.ts` or `.js` line pointer, have the stamp hash the smallest named declaration
enclosing each cited line. The compiler-API walk already exists, and that hash is shift-proof and
formatter-proof. Keep raw line hashing for `.svelte` only (194 pointers). The fact read should
stamp every declaration the claim's value lives in, the constant as well as the consumer. Put a
line-insertion case and a default-in-a-separate-constant case in the acceptance criteria.

### MF-5: major. The release sweep's window unit is too fine, and it skips existing facts

**Location:** `:137-139`, `:126-127`.

**Defect:**
1. **Cost.** "One changed declaration or scaffold file per context" over `v0.97.0..v0.98.0`
   means 192 changed files or more, each with a finder and a verifier. That is at least 380
   agent runs, several times the 4.4M one-arm planning sweep, and the spec has no cap. The
   existing enumerations give a much tighter window: the `api-surface.md` diff between tags
   (49 changed lines there), the scaffold's emitted-template diff, and the CHANGELOG window.
2. **Tag selection.** "The last published tag" needs `v[0-9]*`. `tool/v*` tags interleave in the
   same repo, so `git describe` or "latest tag" picks the wrong base.
3. **"The release sweep covers the rest."** The sweep finds new gaps. Nothing in its shape
   re-verifies the unstamped facts whose cited files changed, which was 257 facts in the last
   window. A fact citing an unchanged file whose behavior moved through a changed dependency is
   invisible to a window keyed on files. So that sentence claims coverage the mechanism does not
   provide.

**Fold:** Window the finders by the `api-surface.md` diff, the scaffold diff, and the
changelog's `Consumers must:` and behavior lines, grouped one module per context as the planning
sweep does. Name the tag glob. Either add a bounded re-verify step (facts citing a changed file,
sampled or capped, which is also MF-1(a)'s trigger detector) or delete "the release sweep covers
the rest" and accept the gap by name.

### MF-6: major. Stamping from parallel fact reads races on one lockfile

**Location:** `:116-119`, `:198-200`.

**Applies only if** MF-1 option (b) or (c) is taken.

**Defect:** Three pages run in flight by default, and each page's fact read would
read-modify-write the same lockfile. Cross-listed facts get stamped by two pages. Meanwhile the
same spec simplifies task 1's outline lock, the one existing lock that serializes a shared write
in this chain. The spec also has the fact read "fix or retag" a fact and then stamp it. A fact the
reader just rewrote gets stamped by that same reader, which is the self-verification the spec
cites Huang to avoid.

**Fold:** The fact read returns `verified: [factId]` in `READ_SCHEMA`, and does not stamp itself.
One serial probe at the end of the run stamps the union of accepted pages' ids. This needs no
lock, and it keeps "only the fact read's record authorizes a stamp". A fact the fact read edited
stays unstamped until a later, independent read.

### MF-7: minor. A staleness check in `check:facts` fails every drafter's gate container-wide

**Location:** `:120-122`.

**Defect:** `check:facts` runs in the docs gate (`docs-gate.mjs:84`), which is each drafter's
last act. A stale fact anywhere in the container would redden every drafter's gate, and drafters
may not touch facts. The spec wants that exposure in an engine pass, not a docs page chain.

**Fold:** Have the docs gate run the staleness check scoped to the page's cited ids, or skip it.
Run the full check in `check:close` and CI (`test.yml:107`).

### MF-8: minor. `designFriction` has two routes, and the conductor cannot verify entries

**Location:** `:158-167`.

**Defect:** The drafter already writes design gaps straight into the friction log and reports
`frictionFiled` (`docs-page-chain.js:606-610`). The new field adds a second route through the
conductor for the same agent. With four agents per page each reporting, one smell gets reported up
to four times. "The conductor files every entry ... verified against the code first" contradicts
the thin-conductor rule, under which the conductor never reads source.

**Fold:** Give the drafter one route, either `designFriction` replacing its direct write or the
reverse. Name the dispatched agent that dedupes and verifies the entries at the checkpoint, such
as the fact-read model over the collected list.

### MF-9: minor. The "same enumeration" wording oversells reuse

**Location:** `:90-92`.

**Fold:** Say instead that it reuses the export enumeration (`surfaceSubpaths`, `moduleExports`)
and adds a member walk. Budget the walk and the MF-3 policy as a real `engine-logic` task. The
1.5M figure at `:205` assumes two small tasks. MF-1 through MF-6 each add scope to one of them,
and the pilot checkpoint re-derivation should know that.

### MF-10: minor. A hashing implementation note for the acceptance tests

**Location:** `:217-218`.

**Defect:** A normalized-AST hash that visits children with `ts.forEachChild(node, (c) => visit(c))`
stops at the first child whenever `visit` returns a truthy value. The probe's first run hashed
only each declaration's name, and every planted change passed. A test that plants a whitespace
edit alone would not expose this.

**Fold:** The acceptance criteria already plant a declaration edit. Require that edit to change a
literal inside the declaration's body, not its name.

## Over-ceremony, ranked by cost

1. **The release sweep at one declaration per context** (MF-5). This is the largest recurring
   token cost in the spec, it repeats every release, and nothing caps it.
2. **Mechanism 2 as specified** (MF-1, MF-4, MF-6). It brings a lockfile, a stamp command,
   hash normalization, lock discipline, diff-reviewer re-stamp policing, and an engine-pass
   re-verify duty, all for a failure class the sweep did not observe.
3. **Four agents each reporting `designFriction`** (MF-8). The token cost is small, but it adds
   dedupe work and owner-facing triage volume at each stage close. The drafter and the fact read
   see most of the friction. The register editor's and page inputs' entries mostly duplicate
   theirs.
