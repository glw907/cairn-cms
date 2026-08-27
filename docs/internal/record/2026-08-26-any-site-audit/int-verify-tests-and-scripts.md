# Fresh-context verification: tests-and-scripts internals findings

Verifier had no part in producing the ranking. Every claim below was re-derived from the tree at
`main` (clean at start and end; two temporary edits were made and restored, `git status` verified
empty after). Checked against `docs/internal/code-idioms.md`, `docs/internal/engine-rulings.md`,
`CONTRIBUTING.md`, `eslint.config.js`, `vitest.config.ts`, and the record docs for a ruling that
sanctions each pattern.

---

## 1. `as-never-erases-checked-contracts` — STANDS (refactor). Strengthened by experiment.

**Counts re-derived.** `grep -ro "as never" src/tests --include=*.ts | wc -l` = **828** (the
ranking said 827; off by one, immaterial). 89 files. `: CairnEvent` annotations = 16 (ranking said
13; still ~50:1 against).

**The decisive check the ranking did not run.** `tsconfig.json:15` `include` already covers
`src/tests/**/*.ts`, so `npm run check` (svelte-check) type-checks the whole test tree today. The
casts are therefore suppressing a gate that is already running, not standing in for one that is
absent. I tested whether the typed path actually compiles:

1. Annotated `contentEvent(opts: ContentEventOptions): CairnEvent` in
   `src/tests/unit/_content-harness.ts` and imported the type. `svelte-check`: **zero errors on the
   harness**. The inferred literal already satisfies `CairnEvent` exactly; nothing structural
   forces the cast.
2. Deleted all 18 ` as never` from `src/tests/unit/content-routes-save.test.ts`. `svelte-check`:
   **zero errors**. Eighteen casts were pure noise.
3. Deleted all 73 ` as never` from `src/tests/component/CairnMediaLibrary.test.ts`.
   `svelte-check` surfaced exactly **one** error, and it is a real defect the cast was hiding:

```
src/tests/component/CairnMediaLibrary.test.ts:388:29
Error: Object literal may only specify known properties, and 'flashError' does not exist in type 'MediaLibraryData'.
```

That site (`it('renders nothing for a query-derived flashError now that the field is gone from the
load')`) is deliberately passing a removed field, so it is the one legitimate cast in the file — and
it wants a narrow `as MediaLibraryData & { flashError: string }`, not `as never`. 72 of 73 in that
file are gratuitous. The experiment is the falsification test the standing rulings ask for: the
gate can fail, and does, the moment the cast is lifted.

**Ruling search.** `types.ts:50-63` documents the opposite intent explicitly — the env default is
justified by `src/tests/unit/env-genericity.test.ts` proving assignment "with zero casts". No
ruling anywhere sanctions `as never` in tests. The engine argues against itself here.

**Verdict: stands, refactor.** Bar directive 3 (agent-extensibility) is directly harmed: an agent
that adds a `CairnEvent` member or renames a component prop gets no compile feedback from 89 files.

---

## 2. `no-aggregate-gate-target` — STANDS (refactor). One remediation clause overstated.

**Verified.** `package.json` declares **27** `check:*` targets. `.github/workflows/test.yml`
hand-lists **26** `npm run check*` invocations; across all eight workflows **25 distinct**
`check:*` targets are invoked. `comm` on the two sets returns exactly:

```
check:interactive-contrast
check:touch-targets
```

Both are `package.json:59-60`, both run in no workflow, and the only prose mentioning them is
`docs/superpowers/specs/2026-07-27-design-infrastructure-design.md:157` (as targets expected to
"graduate") and an archived STATUS. They are dormant, as claimed.

`"lint": "eslint src/lib"` (`package.json:64`) versus `scripts/checks/check-comments.sh:9`
(`npx --no-install eslint src/lib`): same job, two spellings, only the second in CI. Confirmed.

`CONTRIBUTING.md:66` verbatim: "derive the list from those files rather than from prose." That
institutionalises the hand-derivation the memory `cairn-ci-only-gates` records as having shipped
`main` red three times, and it contradicts the repo's own CLAUDE.md "Watch items" rule ("a code
condition ... becomes a gate"). No countervailing ruling found.

**Where the finding overreaches.** "reduce test.yml to calling it" is not fully achievable.
`test.yml` interleaves non-npm prerequisites between the gates: `npx playwright install --with-deps
chromium`, a `working-directory` template bake that computes the engine version in shell, `npm ci
--prefix examples/showcase`, `npm --prefix examples/showcase run check`, and a curl-installed Vale
3.15.1. An aggregate `gate` target can compose the pure-npm gates; the workflow still owns the
environment steps. That trims the remediation, not the finding.

**Verdict: stands, refactor.**

---

## 3. `lint-gate-stops-at-src-lib` — STANDS (refactor). Two numbers corrected.

**Verified.** `eslint.config.js:33`:
`const COMMENT_GLOBS = ['src/lib/**/*.ts', 'packages/cairn-cms-dev/src/**/*.ts'];` — so
`tsdoc/syntax`, `jsdoc/no-types`, `jsdoc/informative-docs`, and `house/no-em-dash-in-comments`
never reach `src/tests` (82,437 lines of `.ts`, higher than the ranking's 79.7k) or `scripts`
(9,538 lines of `.mjs`, matching).

`tsconfig.json:15` `include` = `["src/lib/**/*.ts", "src/lib/**/*.svelte", "src/tests/**/*.ts"]`.
`scripts/**` is absent, confirmed. With `allowJs: true, checkJs: true` set, adding it would
type-check the JSDoc already written there. Scripts imported by a `src/tests/unit/check-*.test.ts`
are pulled into the program transitively; the ones no test imports are **15** of 41 `.mjs` files
(the ranking said 17 — a small overcount, the conclusion is unchanged).

**Live symptom confirmed.** `scripts/checks/check-admin-prose.mjs:267` prints
`Run \`node scripts/check-admin-prose.mjs --list\``, with the same stale path repeated at `:16` and
`:17` in the header. `git log` confirms the move: commit **d6ce6c13** "Regroup scripts/ into
checks/build/lab, delete legacy/, refresh knip.jsonc". Following the gate's own remediation gives
ENOENT. `scripts/lab/migrate-allowlist.mjs:6` carries the identical stale form
(`node scripts/migrate-allowlist.mjs`).

**Ruling search.** `eslint.config.js:29-32` states the scope but offers no rationale for excluding
tests; nothing in `code-idioms.md` or the record docs sanctions it. The `require-jsdoc` objection
(tests have no public surface) is already answered by the finding's own remediation.

**Verdict: stands, refactor.**

---

## 4. `flat-282-file-unit-dir` — STANDS (refactor).

**Verified exactly.** `ls src/tests/unit/*.test.ts | wc -l` = **282**. The only subdirectories are
`audit/`, `fixtures/`, `__snapshots__/`. Prefix histogram re-derived: 36 `content-`, 24 `delivery-`,
18 `media-`, 15 `check-`, 14 `render-`, 11 `github-`, 11 `doctor-`, 9 `auth-`, 9 `admin-` — the
prefixes rebuild `src/lib`'s 23 directories by hand. `src/tests/unit/audit/{,rules/,rules/rendered/}`
mirrors `src/lib/audit/{,rules/static,rules/rendered}` exactly, so the better scheme is already
built and in use.

**Feasibility of the remediation confirmed.** `vitest.config.ts` includes
`src/tests/unit/**/*.test.ts` (recursive), so nesting costs nothing at the config level.

**The three casings confirmed** in `src/tests/component/`: `EditPage.test.ts`,
`EditPage-insert.test.ts`, and six `edit-page-*.test.ts`. `CONTRIBUTING.md:131` states only that
tests live under `src/tests/{unit,integration,component}/` plus `fixtures/`; it gives no within-
project placement or naming rule.

**One nuance on the fourth convention.** `rulings.*.test.ts` is not a stray casing — it is a
consistent group prefix applied to the four ruling-derived rendered tests. It is a fifth spelling
of "how a test file is named" in a repo whose charter opens "one obvious way per pattern", so the
finding is right that the estate has no rule; calling it a *fourth competing convention* slightly
overstates its disorder.

`code-idioms.md` N6 governs only the `_` helper prefix; T3 governs describe titles, not filenames.
No ruling covers file layout, so this is an unfilled gap rather than a violated rule — which is
exactly what bar directive 3 asks to be filled.

**Verdict: stands, refactor.**

---

## 5. `raw-chromium-in-unit-project` — STANDS (refactor), but the NAMING half is REFUTED.

**Structural half confirmed.** `grep -rln "chromium.launch" src/tests/unit` returns exactly **13**
files, all in `src/tests/unit/audit/rules/rendered/`, and the full list matches the ranking.
`rulings.weight-budget.test.ts:21` is `browser = await chromium.launch();` inside a `beforeAll`
raised to `120_000`, in a project `vitest.config.ts` sets to `environment: 'node'`, `maxWorkers: 4`,
`testTimeout: 30_000`. All **13** also carry their own private `async function findingsFor(...)`
copy — 13 duplicate browser lifecycles plus 13 duplicate helpers. `npm run test:unit`, which reads
as the fast node target, launches up to 13 browsers. No ruling in `engine-rulings.md` or the
design-infrastructure record docs sanctions the placement.

**The naming claim does not survive.** The ranking calls the `.browser.` infix "a naming signal
that is wrong 92% of the time". It is not a half-applied convention. `norms-bands.test.ts` and
`norms-bands.browser.test.ts` are a **pair covering one module**, and the pure half opens with a
header explaining the split verbatim:

> "This is the half of the rule that needs no browser, the same split interactive-contrast and
> chip-ground-collision draw between their DOM walk and their color arithmetic (color.test.ts is
> the precedent). The DOM walk itself ... is proven against real Chromium in
> norms-bands.browser.test.ts."

The infix disambiguates a colliding basename, with a stated precedent. Applying it to the other 12
(which have no pure sibling) would add noise, and dropping it from this one would collide two files.
That clause of the remediation should be struck; the shared-lifecycle / own-project clause stands.

**Verdict: stands, refactor** — on the duplicated browser lifecycle and the project placement
alone. Strike the `.browser.` infix remediation.

---

## 6. `editpage-test-monolith` — STANDS (refactor).

**Verified line-exact.** `describe('EditPage', ...)` opens at `EditPage.test.ts:124`; the first
sub-describe (`'zen'`) is at `:2463`. The file is 3,367 lines with 209 `it()` blocks total, and
`awk 'NR>124 && NR<2463 && /^\s*it\(/'` returns exactly **174** — the ranking's number, confirmed
to the assertion. Only eight describes exist in the whole file and seven of them arrive in the last
900 lines. Sibling sizes confirmed: `CairnMediaLibrary.test.ts` 1,764, `MarkdownEditor.test.ts`
1,679, `CairnAdminShell.test.ts` 1,288.

**Idiom cited correctly.** `code-idioms.md` T3: "Pure-function files use `describe('<symbol>:
<one-line contract>')`; **component tests describe by UI region**; titles are present-tense
sentences with no plan-task numbers." This is a documented-rule violation, not a lint instinct.

**Bonus observation (not part of the finding, worth carrying).** Four of the eight existing
describe titles carry exactly the plan/audit labels T3's third clause bans: `'guarded emphasis
parity with Figure (audit finding 7)'` `:2744`, `'desk band collisions at phone widths (audit
finding 2)'` `:3073`, `'phone-desk composition (design-arc C1, docs/internal/2026-07-15-design-arc-log.md)'`
`:3157`, `'guarded Figure control emphasis (audit finding 7)'` `:3303`. Two of those four are also
near-duplicate titles.

**Tension with finding 4, resolvable.** Finding 6 wants the monolith split into more files while
finding 4 complains that EditPage already has eight files under three casings. They are compatible
only if the split lands under one stated naming rule; sequence 4 before 6.

**Verdict: stands, refactor.**

---

## Tree state

`git status --short` empty at the end. The three files temporarily edited
(`src/tests/unit/_content-harness.ts`, `src/tests/unit/content-routes-save.test.ts`,
`src/tests/component/CairnMediaLibrary.test.ts`) were restored from backups in this scratchpad.
