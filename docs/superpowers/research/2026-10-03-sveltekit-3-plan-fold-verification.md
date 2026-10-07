# SvelteKit 3 plan fold: verification read

Target: `docs/superpowers/plans/2026-10-03-sveltekit-3-upgrade.md` at HEAD `8503cdc7` (1108 lines),
against the fold record `2026-10-03-sveltekit-3-plan-fold.md`, the three plan reviews, and the
approved spec. A fresh-context read with no part in the reviews or the fold. Every claim below was
checked against the code at HEAD, the Kit 3 and adapter 8 sources under `~/.cache/kit3-research/`,
or the installed wrangler 4.137.0.

**Counts:** 0 blockers, 2 major, 4 minor. Every high and major review finding closed at its cited
location except part of PC3 (PV2). The fold introduced no renumbering inconsistency.

## 1. High and major findings: closure

| Finding | Closed? | Where verified |
|---|---|---|
| PM1 (high) | Yes | Task 5 outcome and acceptance (`:504-515`); the red run without the header is required |
| PM3 (high) | Yes | Global constraints `:128-132`; Decision 3; Task 5 (`--var`, no `.dev.vars`); Task 6 (200, not a redirect); Close step 5 |
| PR1, PM6 | Yes | Close step 5 (`:1072-1089`); placeholder App verified at `cairn.config.ts:149` |
| PR2, PC7 | Yes | Task 5's two mutation proofs (`:523-527`); Task 11a (`:798-800`); Task 11b's nine mutations (`:906-912`) |
| PC1 | Yes | Decision 10; Task 5 Files; the 11b nesting test (`:894-895`). `dev-wiring.ts:42-52` confirms the two members |
| PC2 | Yes | Decision 11; `CairnAdminShell.svelte:679` sits before `{#if data.public}` at `:686`; Task 8's document-level count |
| PC3 | **Partly.** Files, named input, `--check`, and the mutation landed. Waymark's `Env` has no workable mechanism (PV2) | Task 11b `:863-867` |
| PC4 | Yes | Task 5 and Task 6 greps; survivors are allowed with a reason |
| PC5 | Yes | Split rule `:60-63` |
| PC6 | Yes | Task 3 (`:430-434`) and Task 11b (`:889-893`) |
| PC8 | Yes | Task 11b import graph positive control (`:885-888`) |
| PC9 | Yes | Task 10 outcome and table (`:730-735`, `:750-754`); `uncheckedCsrfDetail` exists |

## 2. Contradictions, renumbering, and segment order

No defect found. Checked:

- No reference to a bare "Task 11" survives outside Decision 12's own heading.
- The Segments table, Architecture, Models, Worktree, Consumes lines, and both Interfaces blocks
  agree on 11a (Kit 2.70, Sonnet) and 11b (Kit 3, Opus).
- The split rule forbids a cut after S3 and after 11a, and it names the S2 boundary as the only
  weigh point. The 80 percent trigger (`:39`) raises a question at the next boundary, and the split
  rule (`:61`) makes that question a budget question past S2. The two agree.
- No segment holds more than four tasks. S4 holds three if Task 11c is built.
- Each segment ends on a green commit. 11a lands on Kit 2.70 under F, because `$app/env` and
  `refreshAll` exist in Kit 2.70.3 and the fake is imported by nothing in `src/lib`.

## 3. Findings

### PV1 (major): spike item 4 cannot discriminate as framed, and it omits the gate form proven at HEAD

**Location:** Task 1 item 4 (`:333-337`), the go/stop rule (`:348-349`), Task 11b Building (`:848-851`).

**Defect:**

- **A gate form is already proven at HEAD.** `src/lib/sveltekit/preview.ts:433-440` reads
  `building` through `await import('$app/environment')` inside `try`/`catch`. The doc comment at
  `:414-430` says this form exists to keep this exact esbuild test green. The test passes today with
  that import reachable from the barrel. `src/tests/integration/preview-load.test.ts` proves the
  gate fires through the vitest alias. Task 2 renames this import to `$app/env`, so the engine
  already carries the candidate the spike is told to find. The plan never names it. FA1's sentence
  "a `building` read from `$app/env` in the guard would turn it red" holds only for a static import.
- **No negative control.** Item 4 passes if the probe gate keeps the test green. A probe module that
  is not reachable from `dist/sveltekit/index.js` also passes, because the test bundles only that
  entry. Nothing requires the static `import { building } from '$app/env'` form to turn the test red
  first. That red run proves the probe sits in the barrel's graph.
- **Items 1 and 4 can prove different forms.** The try/catch form sets `building` to `false` when
  the import rejects. A form that bundles cleanly but whose import rejects in a real Kit 3 build
  would touch `env` during prerender. Adapter 8's virtual module then throws
  (`cf/package/src/virtual-cloudflare-workers.js:17-19`, `:97-99`). Only item 1's prerender run
  catches that, and only if item 1 uses the same form.
- **The external rule is recalled, not quoted.** It is provable: wrangler 4.137.0's
  `cloudflare-internal-imports` esbuild plugin (`node_modules/wrangler/wrangler-dist/cli.js:183712`)
  returns `{ external: true }` for `/^cloudflare:.*/`.

**Fix:** item 4 does four things:

1. Names the HEAD form (`preview.ts:433-440`) as the leading candidate.
2. Quotes a red run of the boundary test with a static `$app/env` import in the probe module, after
   `cloudflare:*` is external.
3. Quotes the green run with the chosen form.
4. Requires item 1's prerender build to use that same form.

Cite the wrangler plugin for the external. With a proven form in hand, the stop clause stays as a
backstop that is unlikely to fire.

### PV2 (major): Waymark's generated `Env` has no mechanism that survives `emit:template`

**Location:** Task 11b Files (`:826-827`, "through emit or generated beside it") and the generated
`Env` outcome (`:866-867`).

**Defect:**

- **"Generated beside it" fails `check:template`.** `emit-template-dir.mjs:223-225` deletes
  `templates/waymark` and copies in a fresh bake. `--check` diffs the trees (`:204-216`). So a file
  generated in `templates/waymark` is deleted by every later `emit:template`, and `check:template`
  flags it as drift. The Global constraints require that check green at every commit.
- **"Through emit" ships `MEMBER_DB`.** Emit copies the showcase's committed
  `worker-configuration.d.ts` verbatim. That file is generated from the showcase's `wrangler.jsonc`,
  which declares `MEMBER_DB` inside exclude markers (`:44-55`). Hand-adding markers to the generated
  file makes the showcase's `wrangler types --check` fail.
- **Nothing tests the claim.** The outcome says Waymark's `Env` carries no `MEMBER_DB`, but no
  acceptance line checks it. The Opus task discovers this mid-flight, in a file set (the bake under
  `scripts/build/emit-template.mjs`) that its Files do not list.

**Fix:** name the mechanism. The likely one: the bake regenerates the template's `Env` with
`wrangler types` against the stripped template `wrangler.jsonc`, and the emit script joins 11b's
Files. Add three acceptance checks:

- `grep -c MEMBER_DB templates/waymark/worker-configuration.d.ts` prints 0;
- `wrangler types --check` passes in `templates/waymark`;
- `check:template` is green.

### PV3 (minor): spike item 3 on `main` hits the handle Decision 10 retires

**Location:** Task 1 item 3 (`:328-332`).

**Defect:** the spike branches off `main`, where `membersDevHandle` calls `resolveChannelDb()` on
every request (`dev-wiring.ts:42-43`). Under workerd that throws `Illegal constructor`. The mechanics
probe saw exactly this ("Before the patch, `/admin` died inside `membersDevHandle`"). Item 3 requires
a quoted 200 from `/admin/posts`, and a mode with no quoted output counts as failed. That invites a
false stop, and a false stop costs Geoff's attended time.

**Fix:** item 3 runs with `membersDevHandle` removed from the scratch branch's hooks (Decision 10).

### PV4 (minor): 11b's Building test needs a fake mode that 11a does not produce

**Location:** Task 11a Interfaces (`:810-812`) and Task 11b Building acceptance (`:889-890`).

**Defect:** 11b needs "the fake set to throw on any access". 11a exports `setFakeEnv`, `resetFakeEnv`,
and `flushWaitUntil`, with no throw mode. The helper file is not in 11b's Files.

**Fix:** add a throw-on-access control to 11a's Interfaces, mirroring adapter 8's prerender throw.

### PV5 (minor): the Ruling has a dominant answer, and its cost line misstates the change

**Location:** Rulings for Geoff 1 (`:210-232`).

**Evidence holds.** Each claim checked:

- `media-route.ts:36` sets `public, max-age=31536000, immutable`.
- Adapter 8's `files/worker.js` has no `caches` use.
- All five consumer sites pin adapter-cloudflare `^7`.

**Defects:**

- **The answer is dominant.** The plan's own grounds make "no" the dominant answer under the
  charter: no measured problem, and the stale-after-delete defect would return. pass-core puts a
  question to Geoff only when it is a fork "with no dominant answer". This one should be recorded as
  a decision with its disposition, which Geoff may veto.
- **The cost line is wrong.** It says the change costs "one R2 read per cold visitor per colo".
  Under adapter 7, each object cost about one read per colo. Under adapter 8, it costs one read per
  visitor whose browser does not hold the object yet, wherever that visitor is. The per-colo
  qualifier understates the change.
- **The magnitude is unpriced.** The ruling quotes no Class B price, so Geoff cannot weigh the size
  of the cost.
- **No deadline is stated.** Nothing says the ruling is needed before S4.

**Fix:**

- Make it Decision 14 ("no; a ROADMAP watch"), open to Geoff's veto.
- Correct the cost sentence and quote R2's published Class B rate.
- Reduce "Yes builds" to one line pointing at the fold record.
- Task 13's ROADMAP bullet becomes unconditional.

### PV6 (minor): proportionality

The 236 added lines are mostly load-bearing: Task 11a, the mutation proofs, the doctor rows, the
live smoke, and the inputs to the security read. These passages restate other text or narrate the
review history, and can be cut without losing a criterion, fixture, gate, or decision (about 55
lines):

| Lines | What | Cut to |
|---|---|---|
| `:196-201` | Decision 12 restates Task 11a's outcome (`:789-795`) | "Task 11 splits into 11a (Kit 2.70 prep) and 11b (the atomic bump); see Task 11a" |
| `:182-190` | Decision 10's mechanics duplicate Task 5 | the departure from the spec, plus the replacement nesting test |
| `:210-232` | the Ruling, once it is a decision (PV5) | about 6 lines |
| `:234-264` | Review focus restates each task's acceptance in full | one line per item: the input plus its pin's task |
| `:328`, `:507` | "the plan review's probe already booted", "measured by the plan review" | delete; this is review history |
| `:504-509` | adapter 7 cache narration | "adapter 7's worker serves `caches.default` first; the post-delete probe sends `Cache-Control: no-cache`" |
| `:676-679` | the admin regression rationale | one clause |
| `:108-110` | D's parenthetical listing what `check:docs-gate` runs | delete |
| `:924-927` | the `requireBucket` narration in Interfaces | "the media bucket is read by its configured name through `requireBucket` (`env.ts:98`)" |

Recommendation: do not run a fold round for this alone. Apply these cuts while folding PV1 and PV2.

**Ceiling.** The basis sums to 12.35M, which matches 12.4M. That is plausible but tight in two
places:

- **11b at 2.0M.** It keeps a full e2e F run, the harness run, a reinstall, and nine mutation
  proofs. Most of those proofs are unit-level and cheap. 11a's slice brings mechanics' 3M figure for
  the unsplit task down to about 2.3 to 2.5M.
- **The 1.0M fix reserve.** That is 0.2M per segment, and every `auth-data` fix round reruns the
  full gate.

The 9.9M trigger covers both risks. No change is needed.
