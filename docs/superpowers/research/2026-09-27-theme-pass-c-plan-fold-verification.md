# Theme identity pass C plan: fold verification

**Target:** `docs/superpowers/plans/2026-09-27-theme-identity-pass-c.md` at `8cff6651` (branch
`theme-c-plan`), against the fold record `2026-09-27-theme-pass-c-plan-fold.md`, the three lens
reviews, and the approved spec. The reader had no part in the fold. The claims were checked against
the text and the tree, not against the record. Probes ran under the session scratchpad
`pc-verify/` against the repo's installed culori 4.0.2, Tailwind 4.3.3, and daisyUI 5.7.44.

**Counts:** 0 blockers, 3 majors (V1 to V3), 5 minors (V4 to V8).

**Verdict:** needs a narrow second fold on V1, V2, and V3. The minors can ride the same fold.

## Question 1: did each blocker and major close where the record says?

Every blocker and major has plan text at the cited location. Two closures carry a defect in the
new text: R2/M2/C1 (V1) and C16/R7 (V2).

| IDs | Closed at | Result |
| --- | --- | --- |
| M1, R1 (blocker) | Decision 27 (plan:477-488); task 6 gate and fixture (:953-955, :967-968); task 7 Files, outcome, and acceptance (:992, :1015-1018, :1041-1044); task 8 (:1107-1108); task 9 (:1156-1157); decision 17 (:404) | Closed. The `--config` path resolves against the working directory, and roots resolve against it too (`config.ts` `loadConfig(process.cwd(), args.config)`, `bin.ts:62`), so "relative to the showcase" holds. The root list has a literal-reading hole (V4). |
| R2, M2, C1 (blocker) | Global constraints (:544-548); Gates (:211); task 6 (:937-939, :972); task 15 (:1445-1446, :1479-1480) | Closed in intent, but the named command regenerates nothing (V1). The "only at the close" line is gone. |
| C2 | Task 4 (:835-839, :845-852) | Closed. |
| C3, M7 | Task 4 (:853-857) | Closed. |
| C4, R9, M4 | Decision 1 (:266-279); task 3 (:809-812) | Closed. |
| C5 | Task 9 (:1159-1160, :1173-1176, :1180-1182) | Closed. |
| C6 | Task 9 (:1125, :1184-1187) | Closed. |
| C7 | Task 10 (:1209, :1217-1219, :1246-1247) | Closed. |
| C8 | Task 10 (:1223-1229, :1241) | Closed. |
| C9 | Decision 4 (:303-308); task 10 (:1220-1221, :1243-1245); S2 (:1394-1400) | Closed. |
| C10, R18 | Ruling 1 (:508-520) | Routed. The arithmetic is off by 0.1M (V5). |
| M3 | Task 9 (:1134-1141, :1177-1179) | Closed. Probe confirms the mechanism. |
| M5 | Task 8 (:1069-1072, :1102) | Closed. |
| R3 | Decision 6 (:326-333); task 7 (:1001-1003, :1036-1038) | Closed. |
| R4 | Task 2 (:725-727, :759-761); task 15 (:1467-1469) | Closed. Decision 5 still reads singular (V8). |
| R5 | Decision 28 (:489-498); task 0 items 3, 4, 7; expected-red set (:171-173); release (:1512-1515) | Closed. The expected-red attribution cannot execute as written (V3). |
| R6 | Task 15 (:1466-1476) | Closed. |
| C16, R7 | Decisions 16 and 20 (:396-402, :423-436) | The lazy-peer logic closes. The fold's new fixture statement is false against `run.ts` (V2). |

## Question 2: contradictions and build order

- **The repo-owned config.** Task 7 creates `scripts/checks/public-scope.config.json`, and no
  earlier task reads it. Task 6's `..` gate reads only the emitted `cairn-audit.config.json`. Today
  that file holds `node_modules/...` and `.cairn/admin.css`, and neither path starts with `..`. The
  order builds.
- **`check:surface -- --update` in task 6.** This agrees with the rewritten global constraint. The
  surface check is also sufficient scope: `./audit` is not an `exports` entry with `types` (only
  the `cairn-audit` bin), so tasks 7 to 9's `types.ts` and `config.ts` changes do not drift
  `api-surface.md`. The command itself is the defect (V1).
- **The dependency sweep in task 0.** It builds, since items 4, 5, and 7 run after it. It
  introduces two gaps: the expected-red attribution (V3), and a dispatch that does not carry the
  template rule (V7).
- **R17's superset claim holds.** `check:close` (`package.json:79`) contains `check`,
  `check:reference`, `check:reference:signatures`, `check:docs`, `check:facts`, and `check:vale`,
  and the full gate adds the two test legs.
- **Decisions 27 and 28 against earlier decisions.** Decision 6's "every admin-scope root is
  excluded from the public scope" needs the default static scope and the public default roots to
  be disjoint. At plan time `DEFAULT_STATIC_SCOPE` still holds `src/lib/components`
  (`config.ts:15-19`), which is also a public default root. The spec's own disjointness test
  (spec:307-310), carried in task 7 at :1032, catches that. Pass B's rename is expected to remove
  it, and task 0 item 4 records the value. This is not a finding.

## Question 3: mechanisms stated from memory

| Mechanism | Status |
| --- | --- |
| culori `interpolateWithPremultipliedAlpha` | Proven. `color-mix(in oklab, oklch(25% 0 0) 60%, transparent)` gives `l` 0.15 with `interpolate` and 0.25 with `interpolateWithPremultipliedAlpha`, both at alpha 0.6 (`pc-verify/m.mjs`). |
| The `style` export condition | Proven. Tailwind 4.3.3's `exports["."]` is `{"types":"./dist/lib.d.mts","style":"./index.css","require":"./dist/lib.js","import":"./dist/lib.mjs"}`, and its `style` field is `index.css`. `./theme.css` is exported, so source 2 is reachable. |
| The harness's `--theme-dir`, `--build-only`, and `--probe` | These are new behaviors specified as outcomes, and they claim nothing about existing code. The environment they mirror is quoted correctly: `playwright.config.ts:30` sets `VITE_CAIRN_E2E=1` and `:34` sets `CAIRN_DEV_BACKEND: '1'`. |
| Decision 6's config semantics | Its "like `static.scope`" claim is proven: `asPathList` returns a configured list in place of the fallback, and `run.ts:54` throws on a configured root the tree lacks. The `exclude` merge is new behavior and is specified. |
| `npm outdated` under the skip clause | Quoted. `~/.claude/skills/cairn-release/SKILL.md:49-50` reads: "Skip this only when the window already contains such a sweep and `npm outdated` at every manifest returns only the held majors." Decision 28's reading matches it. |
| **`npm run check:surface -- --update`** | **Disproven** (V1). |
| **Decision 20's fixture "reaches peer resolution"** | **Disproven against `run.ts`** (V2). |

## Question 4: can Geoff rule on ruling 1?

Yes. The ruling states both builds, and the itemized table supports it. The rows sum to 24.2M, not
24.1M (V5). The fold's +0.6M delta is right, and the 0.1M comes from the pre-fold table, whose rows
summed to 23.6M against a stated 23.5M. At 24.2M, a 24M flag trips on plan in the release tail, so
the recommendation's claim that the flag "fires only if the pass overruns its plan" is off by
0.2M. Under the current 24M ceiling, the 19.2M flag trips around S2 (segment E) on the itemized
order, not segment D. Neither point changes the recommendation.

## Question 5: are the owed errata stated correctly?

- **Erratum 1** quotes spec:58 correctly. It omits spec:313-315: "The audit runs from the
  showcase, whose `cairn-audit.config.json` adds the engine's `src/lib/public/` to the public
  roots." Decision 27 departs from that sentence most directly (V6).
- **Erratum 2** quotes spec:307 correctly, and its reasoning holds.
- **Erratum 3** quotes spec:373 correctly, and its reasoning holds.

## Findings

### V1 (major): the named surface regeneration regenerates nothing

**Location:** plan:545-547 (Global constraints), :937-939 (task 6), :1445-1446 (task 15).

**Defect:** `npm run check:surface -- --update` exits 0 and writes nothing. `check:surface` is
`npm run package && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs`
(`package.json:40`). npm appends run arguments to the end of the whole string, so `--update`
reaches only `check-surface-leaks.mjs`, which ignores it. The fold's closure of the R2/M2/C1
blocker rests on this command.

**Evidence:**
- `ROADMAP.md:957-964` records the quirk with the trigger "the next pass that changes the public
  surface". That is task 6.
- `ROADMAP.md:2596` and `docs/internal/docs-friction-log.md:91-92` record the same quirk.
- A probe confirms the forwarding. `npm run s -- --update` on
  `"s": "node -e A && node -e B"` hands the flag to B only (`pc-verify/package.json`).
- Task 6's own acceptance ("the surface check is green", :972) would turn red, which costs a fix
  round. At the close, the conditional regeneration would no-op, and the full gate would then fail
  at `check:surface`.

**Fold:** At all three sites, name the working form,
`npm run package && node scripts/checks/check-surface.mjs --update`. Alternatively, task 6 takes
the roadmap's fix: a separate npm script that calls the generator alone. In that case task 6 also
lists `package.json` and `ROADMAP.md` in its Files and retires both roadmap entries.

### V2 (major): decision 20's pack fixture cannot reach peer resolution

**Location:** plan:427-432 (decision 20, new in the fold).

**Defect:** `runStatic` throws "the static scan matched no files under ..." whenever the admin
static scope and the CSS files are empty (`run.ts:157-163`). The check is unconditional and runs
before any rule does. The fold's fixture site carries only `src/theme/theme.css`, so each of the
three runs fails the same way:
- The no-peers full run prints the static-scan message, not the named peer message.
- The admin-only `--rule` run fails instead of running clean.
- The with-peers run fails instead of running clean.

The record's reason, "so the run reaches peer resolution instead of the empty-scope error", holds
only for the public scope's new error. Nothing in task 7 makes the admin error conditional
(:996-1000).

**Fold:** The fixture site also carries one clean admin-scope file, such as a minimal
`src/routes/admin/+page.svelte`. The report quotes each run's message. Making the admin error
rule-conditional would be a spec-level behavior change and is not needed.

### V3 (major): sweep-moved captures cannot be attributed at the segment A boundary

**Location:** plan:162-165 (the draft PR opens at the segment A push), :171-173 (the
expected-red set), and :612-616 (task 0 item 3).

**Defect:** CI first runs on the segment A push, which holds the sweep and tasks 1 to 3 together.
The Haiku probe cannot tell a capture the sweep moved from one that task 2 or 3 moved. The rule
would admit a Waymark render move from tasks 2 and 3 as "sweep-owned". That is the pass's central
promise, and the screenshots are its secondary proof for everything the equivalence key list does
not pin. Before the fold, no dependency change preceded task 2, so this gap did not exist.

**Fold:** After item 7's green baseline, the conductor pushes the swept head and opens the draft PR
there. One Haiku probe names the `site-visual` and `admin-visual` mismatches on that SHA, and that
list is the sweep's set. From segment A on, any capture outside it is red as usual. The cost is one
CI wait and about 0.1M.

### V4 (minor): the repo-owned config's root list throws if read literally

**Location:** plan:482-484 (decision 27), :1015-1017 (task 7).

**Defect:** "The showcase's default public roots" are, by decision 6, five roots, including
`src/lib/public` and `src/lib/components`. The showcase has neither (`examples/showcase/src/lib`
holds only `log.ts`). A configured list replaces the defaults, and a configured root that is
missing throws (`run.ts:54`).

**Fold:** Name the list as `src/theme`, `src/chassis`, `src/routes`, and `../../src/lib/public`.

### V5 (minor): the projection's arithmetic and the ruling's phrasing

**Location:** plan:131, :133, and :508-512.

**Defect:** The rows sum to 24.2M. The ruling says "about 24.1M" and "at the ceiling"; the
projection is above it. It also says "trip around segment D"; the itemized order puts the trip
around S2. The claim that the flag "fires only if the pass overruns its plan" is off by 0.2M.

**Fold:** Correct the three numbers and phrases. The recommendation stands.

### V6 (minor): erratum 1 cites the weaker spec line

**Location:** fold record, owed erratum 1.

**Defect:** The erratum omits spec:313-315, the sentence that states the showcase config adds the
engine root.

**Fold:** Cite spec:58 and spec:313-315.

### V7 (minor): the task 0 sweep dispatch does not carry the pass's constraints

**Location:** plan:612-616 (task 0 item 3) and :663-667 (item 7).

**Defect:** The showcase manifest is emitted into `templates/waymark/package.json`, and the
template is never hand-edited. The engine string does not run `check:template`, so a sweep that
changes a showcase range without re-emitting surfaces first as a CI red that no `pass-execute`
task owns. The `dependency-upgrade` skill also asks for a refactor decision on each new capability,
and a "take now" in task 0 would land unreviewed before the equivalence capture.

**Fold:** The sweep dispatch re-emits with `npm run emit:template` when a showcase manifest changes
and runs `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:template'`. In task 0, the sweep
files any refactor and takes none.

### V8 (minor): decision 5 still describes one focused element

**Location:** plan:313-314 (decision 5) against :725-727 (task 2, R4's fold).

**Defect:** Decision 5 reads "a focused `cairn-focus-ring` element's", in the singular. Task 2
checks every element.

**Fold:** Decision 5 says "every focused `cairn-focus-ring` element on the pages it loads".

## Refusals checked

- **O1** (keep the baseline gate) is sound under decision 28.
- **R13** (the charter wording) is sound: spec:489-490 scopes the edit to the rule-count line.
- **R1's refused `scaffold.yml` sub-fold** is sound. `create-site.yml` runs on `push` and
  `pull_request`, and its step at :202 runs `npm run check:cairn` in a scaffolded site. Task 6's
  `..` gate now catches the defect class before CI does.
