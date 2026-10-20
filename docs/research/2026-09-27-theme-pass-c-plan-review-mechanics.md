# Theme identity pass C plan review: mechanics and feasibility

Target: `docs/superpowers/plans/2026-09-27-theme-identity-pass-c.md` at `1ed7e232` (branch
`theme-c-plan`). Lens: whether every mechanism the plan relies on behaves as stated, judged on the
post-rename assumption. Every claim below was probed. Probes ran in a scratch directory against
daisyUI 5.7.44, tailwindcss and `@tailwindcss/cli` 4.3.3, and culori 4.0.2 (the locked versions).
They also read `pass-execute.js`, the `gate-tier.mjs` on `theme-identity-a` (`305011c7`), and the
repo's sources and workflows. Probe scripts live under the session scratchpad `pc-mech/`. No gate
ran.

**Counts:** 1 blocker, 4 major, 7 minor. There is one over-ceremony note and no owner fork.

## Findings, ranked by consequence

### M1 (blocker): the showcase config's `../../` roots ship to every scaffolded site

**Location:** plan:885-888 (task 7, "The showcase config"). Decision 6 at plan:295-307 has the
same effect.

**Defect:** Task 7 puts `../../src/lib/public` in `examples/showcase/cairn-audit.config.json`
under `public.scope`. It also puts `../../src/lib/public/cairn-public.css` under
`public.themeRoots`. That file is emitted verbatim:
- `templates/waymark/cairn-audit.config.json` exists today as a byte copy of the showcase's file.
- `scripts/build/emit-template.mjs` copies every non-excluded path.
- The npm setup command bakes the same tree (`create-cairn-site` `prepack`:
  `bake-template.mjs`).

A configured root the tree lacks throws. `src/lib/audit/run.ts:53` reads `if (fromConfig &&
!existsSync(resolve(config.root, dir))) throw new Error(missingScope(dir))`, and decision 6 keeps
that rule for `public.scope`. So `npm run check:cairn` fails in every scaffolded site and in the
template's shipped `.github/workflows/check.yml`. CI catches it at the segment C boundary:
`.github/workflows/create-site.yml:202` runs `npm run check:cairn` in a scaffolded site. That red
is outside the expected-red set, so task 7 gets re-dispatched with no sanctioned fix. The spec
says "rooted at the engine's `src/lib/public/` by the showcase config" (spec:58), so the fix
departs from spec text, and the plan's stop-and-report rule applies.

**Evidence:** `cat templates/waymark/cairn-audit.config.json` prints the showcase's `sheet` list
unchanged. `.cairn-template.json`'s `exclude` does not name the config. A JSON file cannot carry
the `cairn-template:exclude-start` line markers and still parse.

**Fold:** Add a decision that keeps repo-relative roots out of the showcase config.
`scripts/checks/check-public-scope.mjs` supplies the engine's `src/lib/public` root and
`cairn-public.css` theme root through its own config file, passed with `--config` or built with
`resolveConfig`. Record the departure from the spec's phrase. Task 7's acceptance then quotes the
scanned count from `check:public-tokens`, not from the showcase's `check:cairn`. Add one assertion
to `emit-template-dir.test.mjs`: no emitted `cairn-audit.config.json` value starts with `..`.

### M2 (major): `check:surface` stays red on CI from task 6 until the close

**Location:** plan:454-455 (Global constraints: "`check:surface` is regenerated only at the
close"), plan:813-815 (task 6's root export), plan:1198-1199 (S1 acceptance), plan:1258-1263 and
1285-1286 (the close order).

**Defect:** Task 6 adds `previewMarkdown` to the root barrel. `check:surface` compares the built
`.d.ts` surface against `docs/internal/api-surface.md` and "Any drift fails the gate"
(`scripts/checks/check-surface.mjs` header). CI runs it at `test.yml:67`. The failure has three
effects:
1. The `test` job goes red from the segment B push, outside the expected-red set. A job stops at
   its first failing step, so steps 68 to 116 (`check:template`, the showcase `check:cairn`,
   `check:comments`, and the rest) give no signal at the B, C, and D boundaries.
2. S1's acceptance ("`test` ... green with no expected-red exception left") cannot hold.
3. The close runs its full gate, which includes `check:close` and so `check:surface`, before the
   ritual's `check:surface -- --update`.

**Fold:** Task 6 runs `npm run check:surface -- --update` and commits the `api-surface.md` diff
with the export. That diff is the disclosure the gate exists to force, and the reviewer reads it.
Drop the "only at the close" constraint. The close re-runs `--update` only if `code-simplifier`
changed a declaration.

### M3 (major): culori's `interpolate` is not premultiplied, so a `transparent` operand measures wrong

**Location:** plan:982-985 (task 9, "The resolver ... via culori's `interpolate`. It then
alpha-composites over the ground"). Acceptance at plan:1014-1016.

**Defect:** CSS `color-mix()` interpolates with premultiplied alpha. culori's `interpolate` does
not: it lerps `l`, `a`, and `b` toward `transparent`'s black channels. The resolver
alpha-composites its result, so every `X p%, transparent` mix comes out too dark. That form covers
today's muted default, a stale copied `tokens.css` (the plan's own Review focus 1), and the
chassis's translucent inks. On light themes the error is a false pass. On dark themes it is a
false fail. This is the silent-green case task 9's Opus upshift exists to prevent.

**Evidence:** probe `m2.mjs` measured `color-mix(in oklab, oklch(25% 0 0) 60%, transparent)`:

| Method | Mix result | On `oklch(98.4% 0 0)` | Dark case (92% on 24%) |
| --- | --- | --- | --- |
| `interpolate` | `l` 0.15, alpha 0.6 | 5.13 (passes 4.5) | 2.07 |
| `interpolateWithPremultipliedAlpha` | `l` 0.25, alpha 0.6 | 4.22 (fails) | 5.53 |

The true values are the premultiplied row.

A second trap sits in `oklch` mixing (probe `m.mjs`). With an achromatic operand that carries an
explicit hue of 0, culori interpolates the hue (150 and 0 give 105). CSS Color 4 treats an
achromatic color's hue as powerless, so Chromium may carry 150.

**Fold:** Name `interpolateWithPremultipliedAlpha` in the outcome. Among the six Chromium pairs,
require one with a `transparent` operand and one `oklch` pair with an achromatic operand. If
Chromium disagrees on the second, the resolver treats a hue at chroma near 0 as missing.

### M4 (major): decision 1's rule always lands on its chroma floor, which sits on a float boundary

**Location:** plan:249-260 (decision 1). Task 9's standing reskin case at plan:1004-1005.

**Defect:** Two facts make the rule degenerate:
- In this population the pass count falls steadily as `N` rises. So "highest pass count, subject
  to chroma" always picks the smallest `N` that meets the chroma floor, and the tie-break never
  fires.
- The median theme's `base-content` is achromatic. An oklab mix scales `a` and `b` linearly, so
  the median chroma ratio is exactly `N/100`. The floor ("at least half") is met at `N = 50` with
  the ratio at exactly 0.5.

Task 3 measures from Chromium's serialized computed values, and serialization rounding can move
0.5 to 0.4999, which selects `N = 55`. At 55, Waymark with its inks stripped fails light `warning`
on `base-200` (4.5 floor). That turns task 9's standing `test:reskin` case red, and it is an
outcome the rule cannot foresee. At 50 the same pair clears at 4.90.

**Evidence:** probe `sel.mjs` covers the 35 stock themes plus stripped Waymark light and dark,
with the plan's grounds and culori's sRGB and P3 gamut clamp. It picks `N = 50` for every status,
with the median ratio `0.5` exactly and 0.44999999999999996 at 45. The table shows themes passing
out of 37:

| Status | N = 30 | N = 40 | N = 50 | N = 55 |
| --- | --- | --- | --- | --- |
| success | 35 | 34 | 32 | 30 |
| warning | 35 | 30 | 26 | 24 |
| error | 36 | 35 | 31 | 30 |
| info | 35 | 34 | 30 | not measured |

Stripped Waymark light warning passes for `N` from 0 through 50 and fails from 55.

**Fold:** State the rule as it behaves: "the smallest multiple of 5 whose median chroma ratio is
at least 0.5 − 0.005". Compute the ratio from culori over the parsed values, never from
serialized strings. Record the pass counts above so the trade is visible. The floor is a
design-taste setting (0.4 buys four more warning passes). By the methodology ruling it is
Claude's to set, so it is not an owner fork.

### M5 (major): task 8's import-chain loader cannot resolve `@import "tailwindcss"` the stated way

**Location:** plan:926-929 (task 8, "package specifiers from the audited root's installed
packages ... Every file parses through `sheet.ts`, never a regex over raw text").

**Defect:** Node resolution such as `createRequire(root).resolve('tailwindcss')` returns
`tailwindcss/dist/lib.js`. The CSS entry exists only under the `style` export condition:
`"style":"./index.css"` in tailwind's `exports["."]`, which is how Tailwind's own resolver finds
it. Following the chassis's first line with Node resolution feeds JavaScript to `parseSheet`. That
does not throw: object literals parse as rules with declarations, so junk custom-property names
can enter the resolution set and resolve a `var()` that should fail. The same failure lands on
any consumer `@import` of a package whose CSS sits behind `style`.

**Evidence:** `node -e 'require.resolve("tailwindcss")'` prints `.../dist/lib.js`. The exports
entry reads `{"types":...,"style":"./index.css","require":"./dist/lib.js","import":"./dist/lib.mjs"}`.

**Fold:** The loader resolves package specifiers with the `style` condition (exports, then the
`style` field) and fails with a named finding on a non-CSS target. `tailwindcss` itself need not
be traversed, since source 2 already covers its variables. Add one fixture that imports a package
exporting CSS only under `style`.

### M6 (minor): `parseSheet` drops `@import`, so the "never a regex" loader needs a `sheet.ts` change

**Location:** plan:926-929; the task 8 Files at plan:920-923 omit `src/lib/audit/sheet.ts`.

**Defect:** `collectRules` treats `;` as a prelude reset, so a block-less statement at-rule
(`@import`, `@source`, a block-less `@plugin`) never becomes a rule. The loader cannot read the
chain through `sheet.ts` unless `sheet.ts` exposes statements. Without that change, the reviewer
sees either a regex, which violates the plan, or an unlisted file edit.

**Evidence:** reading `src/lib/audit/sheet.ts` `collectRules`. Probe `probe-sheet.mts` confirms
the rest of decision 8: `@plugin "daisyui/theme"` and `@theme` parse as rules whose selector is the
prelude (32, 32, and 27 declarations), and the comment-fused property counts are 23, 7, and 3, as
the plan states.

**Fold:** Add `sheet.ts` to task 8's Files. The outcome is a sibling export listing top-level
statement at-rules with offsets.

### M7 (minor): the preview frame cannot see an explicit Waymark dark, and "the page" is the admin

**Location:** plan:736-739 (task 4 acceptance).

**Defect:** `buildPreviewDoc` emits `<html data-cairn-preview>` with no `data-theme`
(`src/lib/components/preview-doc.ts:94`). An explicit `cairn-dark` choice therefore never reaches
the frame, and only OS-dark emulation does. "The page's computed `--color-base-100`" is the admin
page's value, which is the admin theme's, not Waymark's. As written, the assertion is either
unreachable or compares two themes.

**Fold:** Emulate `prefers-color-scheme` dark and light. Assert that the frame body's
`background-color` equals the frame document's own computed `--color-base-100` in both.

### M8 (minor): the showcase set can test a stale `dist`

**Location:** plan:197-199 (the showcase legs). Used as a task check in tasks 1, 6, 7, 8, and 9.

**Defect:** The showcase's `cairn-audit` bin is `dist/audit/bin.js`, and its type check reads
`dist/index.d.ts`. No leg packages first. If the task checks run before the engine gate, whose
`check:reference` packages, `check:cairn` runs the old audit. That is a false green for the new
rules in tasks 7 to 9. The showcase `check` in task 6 also cannot see `previewMarkdown`.

**Fold:** Prefix the showcase-set string with `npm run package &&`.

### M9 (minor): the showcase unit project has no DOM environment

**Location:** plan:779-781 (`theme-toggle.test.ts`).

**Defect:** `examples/showcase/vitest.config.ts` sets `environment: 'node'`, and neither `jsdom`
nor `happy-dom` is a showcase devDependency. An implementer who reaches for either adds a
dependency to the template. That triggers the `dependency-upgrade` survey, which the plan places
only in task 9.

**Fold:** Say the test stubs `document`, `getComputedStyle`, and `matchMedia` with
`vi.stubGlobal`.

### M10 (minor): the fixture harness's build environment is unstated

**Location:** plan:271-276 (decision 4).

**Defect:** The showcase's Playwright server builds with `VITE_CAIRN_E2E=1` and runs with
`CAIRN_DEV_BACKEND=1` (`examples/showcase/playwright.config.ts`). Decision 4 says only `vite
build` and `vite preview`. The copy itself resolves correctly: every relative import in the
showcase stays inside the copied tree, the symlinked `node_modules` resolves both `file:` links
through realpath, and a probe confirms Tailwind scans sources inside a gitignored
`.cairn-theme-fixture-*` directory.

**Fold:** Mirror `playwright.config.ts`'s `webServer` environment in the harness.

### M11 (minor): `check:audit-pack` must install outside the repository tree

**Location:** plan:386-393 (decision 20).

**Defect:** Node's upward resolution from a directory under the repo finds the repo's
`node_modules`, which holds `daisyui`, `tailwindcss`, and `culori`. The "no peers" case and the
"culori back in devDependencies" mutation would then both pass. The in-repo
`.cairn-vite-test-*` precedent that decision 4 cites exists to get that walk-up, so it is the
wrong model here. The template arm and this check also both install into `/tmp`, which carries a
6275M per-user quota (the `tmpfs-user-quota-go-link` memory).

**Fold:** Say `os.tmpdir()` and remove the directory on exit. Add a guard: before the no-peers
run, fail if `createRequire(tmp).resolve('daisyui')` succeeds.

### M12 (minor): `color-scheme` is one of the 29 keys, and task 5's toggle now reads it

**Location:** plan:934-937 (task 8 completeness) and plan:771-773 (task 5).

**Defect:** `daisyui/theme/object` has 29 keys: 28 custom properties plus `color-scheme` (probe).
daisyUI defaults a missing `color-scheme` to `normal` (`daisyui/theme/index.js`). Task 5 makes
`resolveTheme` read the root's computed `color-scheme`. A block without it computes `normal`, so
the toggle cannot choose a scheme. Neither task says what `normal` means.

**Fold:** Completeness treats a missing `color-scheme` as a finding, and `resolveTheme` falls back
to `matchMedia` on any value other than `light` or `dark`. Add one row to the task 5 table.

## Over-ceremony

**O1 (minor): task 0's baseline engine gate duplicates evidence item 1 already requires**
(plan:566-569). Item 1 requires pass B's branch head green on CI, and the worktree is cut from
that head. The local run adds one heavy gate slot on the machine lock and about 0.2M tokens. It
proves only that the component project does not stall, which task 1's own engine gate proves
minutes later. Recommendation: drop it, or keep it only as the stall detector with no reviewer
role.

The per-task gates otherwise match `pass-core`'s class table: `engine-logic` on the engine tier,
and `paint` and `docs` on named targeted gates. None is heavier than its risk, since the
equivalence spec is the pass's primary proof.

## Where the plan is sound (verified)

- **The gate sentinel.** On `theme-identity-a`, `gate-tier.mjs` `decideGate` throws on an unknown
  pin, and `main()` routes it to `fail()` with exit 1 and empty stdout. `pass-execute.js`
  `resolveGate` returns `t.gate || a.gate` for any pinned task, and the implementer prompt falls
  back to the Gate command on a non-zero exit. The engine string matches `SCRIPTS_GATE`
  character for character, so the `gateCore` comparison matches for the pinned engine tasks.
- **daisyUI blocks.** `daisyui/theme/index.js` emits blocks with `addBase` (`@layer base`), which
  beats `@layer theme`, so Waymark's per-scheme overrides win over `cairn-public.css`'s defaults.
  Arbitrary `--*` keys pass through. A block named after a built-in merges with it. The prefers-
  dark selector is `:root:not([data-theme])`.
- **The comma exception.** In a Tailwind build, `--cairn-shadow: 0 1px 2px red, 0 6px 20px blue`
  inside `@plugin "daisyui/theme"` compiles to two declarations, and the last one wins (probe
  `p1`).
- **`@theme` colors.** They emit on `:root, :host` only, so the nesting limit the plan documents
  is real. Unused `@theme` keys are tree-shaken identically before and after the move.
- **Lever collision.** With `--font-heading` declared, `--font-weight-heading` silently loses the
  `font-heading` utility, which compiles to `font-family` only (probe `p2`). The `theme-conformance`
  finding is warranted.
- **Focus-ring move.** `cairn-focus-ring` has no variant use in the showcase, and its hosts style
  focus in unlayered scoped rules, so moving it from `@utility` to `@layer components` changes no
  computed value.
- **Code-block order.** `.prose pre` sets only background longhands, so importing `pre.shiki`
  before `prose.css` does not flip its colors.
- **Package resolution.** `createRequire(root)` resolves both `daisyui/theme/object` and
  `tailwindcss/theme.css`. Real daisyUI 5.7.44 has 35 themes.
- **Waymark's inks.** Waymark's hand-set inks clear every new `theme-contrast` pair (base-200 and
  the callout tints) at 4.6 or better in sRGB and P3, and muted clears 6.4. The "zero findings on
  the showcase" acceptance is reachable with no palette change.
- **Named files and paths.**
  - Every e2e spec the gates name exists.
  - `site-visual` holds exactly ten `styleguide-*` baselines.
  - Pass A's `playwright.config.ts` honors `E2E_PORT`.
  - `e2e.yml` offers `update_snapshots`. S1 correctly reads CI on the conductor's ledger commit,
    since a push by `GITHUB_TOKEN` triggers no new run.
  - `test.yml` installs the showcase after `npm test`, as decision 21 assumes.
  - The retired script's readers are the ones decision 26 lists.
  - `reference-coverage.mjs` keys on typed subpaths only, so the CSS export needs no reference
    page before task 11.
