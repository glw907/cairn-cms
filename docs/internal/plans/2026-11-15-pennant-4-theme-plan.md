# Pennant pass 4: the theme

Initiative: theme-garden
Round: pennant
Pass: 4 theme

The design is `~/Projects/initiatives/theme-garden/specs/2026-11-14-pennant-design.md`, approved
by Geoff through packet `20261115-041501-ead5c5`. The pass runs in worktree
`.claude/worktrees/pennant-4` on branch `pennant-4`, based on `a6d064500` (the head of
`pennant-3`). The PR base is `main`. Until PRs #251, #253, and #254 merge, the PR's diff also
shows passes 1 to 3; the review range is `a6d064500..HEAD`. Class `ordinary`, `live-account`.
The conductor is `conductor-pennant`. The design's path is 260 minutes, and this plan's is 440
(T0 15, group 1 95, group 2 75, T5 110, the grade 95 with one fix round, Close 50; sum of all
minutes 545). Each figure counts its task's fast lane. The plan review raised the first draft's
310: T5 renders fourteen sites, and a grade fix round rebuilds and regrades. The pass parks at
planning over 520, twice the design's estimate, so it launches. The executor's path ceiling is
880 minutes, twice the plan's path (`round-run.md` standing answer 7, by the analogy pass 3
used). [advisor]

The executor loads `pass-core` (with `references/executor.md` and `references/round-run.md`),
`cairn-pass`, `cairn-running-passes`, `standards:visual-fidelity` before any theme file,
`cairn-following-public-design`, `standards:daisyui`, and `frontend-design:frontend-design` for
the components and CSS, `cairn-writing-engine-code` for the scripts, `standards:svelte-conventions`
and `standards:ts-conventions` for comments, and `writing-voice` before the README and the PR
body. Each implementer dispatch names the skills its task loads.

Outcome: `themes/pennant/`, a club and team theme in the look of
`~/Projects/initiatives/theme-garden/research/pennant-mockups/varsity-3.html`, with one `colors`
option of five sets, every option value measured for contrast in light and dark, its
screenshots, and its manifest. `check-rules.mjs` measures every option value. Merging publishes
Pennant 1.0.0, a permanent release, with its demo at `demo-pennant.cairn.pub` over the
organization set. The PR never lands unattended: it waits for Geoff with a close packet that
shows the grader's renders beside the mockup.

## Pre-flight

- **Owner steps.** None. The Worker `cairn-demo-pennant` exists with the custom domain
  `demo-pennant.cairn.pub` (M21), and `ci-cairn-demos` covers it.
- **Permissions checked.** The denials log (`~/.local/state/claude-denials.jsonl`, 2026-11-01 to
  2026-11-15, 73 rows) was read by class: Self-Modification 10, an unexplained "judged
  dangerous" 10, Interfere With Workloads 9, Classifier unavailable 9, Destructive or Unwanted
  5, Merge Without Review 3, Auto-Mode Bypass 3, two each of Irreversible Local Destruction, Git
  Destructive, Create Public Surface, Unverifiable Deletion Scope, Sensitive-Source Provenance,
  Security Weaken, and Undermining Oversight, and one each of Production Deploy, Secret-Store
  Writes, DNS/Domain/Cert, Bot Check Circumvention, Code from External, Shared Scratch Sweep,
  Safety Bypass Flag, Out-of-Place Publication, PII Data Handling, and Modify Shared Resources.
  Two Auto-Mode Bypass rows refused `gh workflow run e2e.yml`. The routes below avoid every
  class the pass could meet. The pass deploys nothing by hand.
- **Reviewed.** One `standards:plan-reviewer` read (Opus, `medium`), folded below. The class is
  `ordinary`, which needs none, but merging publishes a permanent release.
- **Evidence.** Probes ran in a scratch copy at `a6d064500` with dependencies installed (M1 to
  M24). The probe scripts are in the planner's job `tmp` and aren't kept.

### Auto-mode routes

| Refused class seen in the log | Route the pass takes |
| --- | --- |
| Interfere With Workloads | Never `kill`, `pkill`, or `claude stop`. A background server stops with `TaskStop`. A harness closes every server it starts through its own handle. |
| Classifier unavailable | Retry the same call once, then park with the call. |
| Self-Modification, Security Weaken, Safety Bypass Flag | No edit to `.claude/settings*`, hooks, or agent files. Never `--no-verify`. |
| Destructive or Unwanted, Git Destructive, Irreversible Local Destruction, Unverifiable Deletion Scope, Shared Scratch Sweep | No `git reset --hard`, no `git checkout -- .`, no `rm -rf` outside a path the task created under the job's `tmp`, never a glob under `/tmp`. |
| Auto-Mode Bypass | No workflow is dispatched by hand. A superseded `catalog` run gets one `gh run rerun` (decision 15); if refused, the PR records the run id for the conductor. |
| Undermining Oversight | No `claude stop`, and no edit to the design or this plan's acceptance. An item that can't be met as written stays verbatim, with the amended check beside it, flagged. |
| "Judged dangerous" with no class | Standing answer 2: the alternative the task names, once, then flag the task and go on. |
| Merge Without Review | The executor never merges. Under the conductor it ends at PR-ready. |
| Production Deploy, Create Public Surface, Out-of-Place Publication, Modify Shared Resources | No `wrangler deploy` and no R2 write from the workstation. Local servers bind 127.0.0.1. The PR's `catalog` run uses the proving target only. |
| Secret-Store Writes, DNS/Domain/Cert Changes | None needed. On a 403, standing answer 5. |
| Code from External | Font files go in their own empty directory under the job's `tmp`. Nothing downloaded is executed or imported; only `.woff2` files are copied out. |
| PII Data Handling | No person is named; the theme prints no name or caption on a photo. |

## Mechanism table

| # | Probe or source | Result |
| --- | --- | --- |
| M1 | `check-rules.mjs` `audit`, lines 255-276 | Lays the theme into a showcase copy (`makeShowcaseCopy`, `layIn`), resolves `scripts/checks/public-scope.config.json`, and runs `runStatic` with `theme-contrast`, `theme-conformance`, and `public-literals`. The public stylesheet chain is `['src/theme/theme.css']` (`DEFAULT_PUBLIC_STYLESHEETS`, `src/lib/audit/config.ts:54`). `check.mjs scripts/theme/fixtures/options-theme --rules audit` passes with the `tide` value never read. Option values are not measured, so standing answer 2 doesn't apply. |
| M2 | The options fixture's `tide` sheet as a second chain entry, unchanged | Every accent row reads UNMEASURED: "set on the selector ':root:has(input.theme-controller[value=\"opts\"]:checked)', which the scheme model does not read". |
| M3 | The same sheet with every selector holding `:has(` filtered out by postcss, written to `src/site/theme-options.css` in the copy and added as the second chain entry | `tide`: accent pairs 5.41 light and 8.04 dark, PASS, 0 findings. A failing copy (`tide-bad`): 1.09 FAIL in light under both light schemes, dark PASS, 1 finding. Decision 1 builds on this. |
| M4 | `build-tokens.mjs` `selectors()`, about line 335 | An option sheet's selector is `:where(:root),:root:has(input.theme-controller[value=X]:checked),[data-theme=X]`. A token whose value holds a comma (a `color-mix()`) is written unlayered on `:root`, which is where #412 bites: an option rule on `:where(:root)` loses to it with no cookie (`BACKLOG.md:155`). |
| M5 | `src/lib/audit/contrast.ts:113-140`, `:163` | The resolver evaluates `color-mix()` in oklab or oklch with exactly one percentage over `var()` operands. Relative color syntax is recorded as unmeasured. |
| M6 | `theme-contrast.ts:174-196`, `ROLES_WITH_CONTENT` line 39 | The check measures `--color-primary` on the page ground and each role's `-content` on its role, for `primary`, `secondary`, `accent`, `neutral`, and the statuses. |
| M7 | `check.mjs --rules engine-range` on a copy whose manifest reads `>=0.99.0-rc.5` | Fails: `engine ">=0.99.0-rc.5" does not admit this repository's engine 0.99.0-rc.4` (exit 1). `--rules manifest-schema` on the same copy passes. |
| M8 | `grep engine` over `scripts/catalog/{reference-check,publish,index}.mjs`, `scripts/theme/lay-in.mjs`, `scripts/theme/viewer/*.mjs`, and `tool/**/*.go` | Only `check-rules.mjs:81-88` compares a theme's range with the repository's version. `reference-check.mjs:51-54` compares release ranges with engine choices drawn from the catalog's own bounds. `index.mjs` only lists the range. The Go tool never reads a theme's `engine`. `publish.mjs:267` runs the full check, so the rule is the publish job's one reader. |
| M9 | `scripts/theme/check.test.mjs:73-74` | Two engine-range cases exist (`>=1.0.0` and `>=0.1.0 <0.2.0` fail). Neither pins the message text. |
| M10 | A plain `:root { --color-accent: ... }` written to `src/site/overrides.css` in the copy and added as a further chain entry | Measured in both modes. A light-only value passed light (9.49) and failed dark (1.77), so an override applies to both modes and the sixth pair must pass both. |
| M11 | `examples/showcase/src/site/` and `templates/waymark/src/site/` | Both hold an empty-by-default `overrides.css` loaded after `theme-options.css` (`+layout.svelte:24`, `+error.svelte:17`). Neither the default audit chain nor the template's `cairn-audit.config.json` (the theme sheet only) reads it. |
| M12 | `examples/showcase/node_modules/@axe-core/playwright` (`^4.14.0`), used by `examples/showcase/e2e/styleguide.spec.ts` | Axe is absent at the repo root. `package.json` and `examples/**` are outside the row, so item 3 runs from a harness under the job's `tmp` that resolves `@axe-core/playwright` and `playwright` from the showcase's modules through `createRequire`. |
| M13 | `scripts/theme/viewer/site.mjs:107` `writeOptions(siteDir, themeDir, options, mode)`, `:135` `composeSite({root, themeDir, contentDirs})`, `headless.mjs:67` | `composeSite` defaults to the starter overlay plus the conformance set and never copies a set's `site.config.yaml`. `writeOptions` writes the chosen option sheets and `modes/<mode>.css`. `runHeadless` composes with no content dirs. |
| M14 | `scripts/catalog/demo.mjs:179` `buildDemo({root, themeDir, out, worker, origin, set})` | Composes with `[set]`, then `writeMarker`, `writeOrigin`, `writeSetConfig` (the home title as `siteName`), `removeAdminMenus`, and `buildSite`, into `out`, with no deploy. The demo is the default value of each option. |
| M15 | `examples/showcase/src/routes/+layout.server.ts:22-33` | `page.data.actions` holds the `actions` menu's links, present only when the menu has one. `page.data.nav`, `footerNav`, and `siteName` are there too. |
| M16 | `examples/showcase/src/routes/(site)/+page.svelte`, `home.ts:120` | A `home` page renders as `<ArticleView {data} home={data.home} titleTemplate=...>`. `home` is `{ before, after, posts, archiveUrl }` with at most three posts (`HOME_POST_COUNT`). `data.entry` carries the title and `data.heroImage` the image; the front-matter `description` reaches the page through `data.entry`'s fields (the executor reads `+page.server.ts:24-40` for the exact path). |
| M17 | `examples/showcase/src/chassis/directives/vocabulary.ts:384-387` | The banner renders as `<div class="banner" role="status"><p class="banner-message">...</p>...` and an expired one as `<div hidden class="banner-expired">`. It is the first element of `home.before` in the organization set's home page. |
| M18 | `examples/showcase/src/chassis/prose.css:507-570`; PR #251's `[advisor]` call 2; PR #254's `[advisor]` decision 5 | The chassis lays a `columns="4"` block out two across inside the reading measure and four across only in a container near 1400 px or wider. The organization home keeps three-column programs and facts and a four-column supporters block. The conductor wants the home body in the wide container (about 1060 to 1120 px, the mockup's `.wrap` is 1120). |
| M19 | `varsity-3.html` lines 9, 52-158, 169-173 | Fonts: Barlow 400, 500, 600; Barlow Semi Condensed 600, 700; Big Shoulders Display 700, 800. `.wrap` 1120 px with a 28 px gutter. Programs and facts rows three across, logos four; under 760 px the cards and facts stack and logos go two across. The five sets' color 1 and color 2 in oklch: fireweed 52% 0.21 357 and 25% 0.035 175; navy 30% 0.09 260 and 80% 0.15 85; scarlet 52% 0.22 27 and 27% 0.01 260; purple 38% 0.16 300 and 82% 0.012 280; orange 70% 0.18 52 and 40% 0.17 262. Line 148 uses relative color syntax for the menu border, which Pennant can't (M5). |
| M20 | `scripts/catalog/card.mjs:30-48`; `themes/waymark/screenshots/*.png` | The first screenshot must be exactly 3:2 (`width * 2 === height * 3`) and its WebP card at most 100 KB. Waymark ships 1440x960 light and dark and 390x960 mobile. |
| M21 | `curl https://demo-pennant.cairn.pub/`; the Workers API; `~/.claude/docs/cloudflare-estate/api-tokens.md:75` | 200 with a placeholder. The Worker `cairn-demo-pennant` has the domain, `workers.dev` and previews off. `ci-cairn-demos` is Workers Editor on `cairn-demo-waymark` and `cairn-demo-pennant`. |
| M22 | `scripts/theme/check-rules.mjs:18`, `:137-151`, `:169-193`, `:206`; `check-render.mjs:30` | Fonts at most 400 KiB together, each file listed in `fonts[].files`; every file in the theme must be listed or allowed (`paths-unlisted`); `tokens-required` and `directive-styled` rules; the `render` rule renders every starter and conformance page headless. |
| M23 | `package.json` `files`; `.github/workflows/catalog.yml:13-24` | `themes/` and `scripts/theme/` don't ship in the npm package. Every push of `themes/**` fires the PR's `catalog` run against the proving target. |
| M25 | `scripts/theme/build-tokens.mjs:390-394`; `themes/waymark/modes/light.css:2`; plan review probe | A mode sheet pins its mode on `html:root:not([data-theme])` (specificity 0,2,1), and `writeOptions` (`viewer/site.mjs:107-121`) writes it into `theme-options.css` after the option sheets. A plain `:root` override in `overrides.css` (0,1,0) loses to it for a visitor with no cookie: the review's probe painted navy, not the override's teal, on a light and a dark OS, and teal with `data-theme` set. The selector `:root, html:root:not([data-theme])` painted teal in all six states. |
| M26 | `examples/showcase/src/chassis/directives/vocabulary.ts:344-359`; `src/lib/render/rehype-dispatch.ts`; `src/lib/render/registry.ts:96` | The banner is a hydrate component, so its markup reaches `home.before` inside a `<div data-cairn-island="banner" data-cairn-props=...>` wrapper. M17's `div.banner` is the wrapper's first child, not the first element. |
| M27 | `gh variable list -e catalog-proving` (read 2026-11-15); `scripts/catalog/publish.mjs:77`, `:296-313` | `DEMO_ORIGIN` is `https://demo-proving.cairn.pub` and `DEMO_WORKER` is `cairn-demo-proving`, with no `{id}`. `releaseDirs` sorts the themes, so the proving run deploys Pennant, confirms it (`catalog: <origin> serves pennant@1.0.0`), then deploys Waymark over it. |
| M28 | Run `43774294689` (pass 3, green); `.github/workflows/test.yml:15`, `:130-131`; `catalog.yml:44`; `check-render.mjs:30-39`; `viewer/headless.mjs:79-82` | The test job took 24 of its 45 minutes. `test:theme` took 11, and `check:theme -- --catalog` took 2.9 over Waymark's two builds. The render rule builds once per option combination and mode, so Pennant's full run is ten builds, about 14 more minutes, near 40 in all. The catalog publish job took 6 of its 60. The render rule checks each page's status and console errors only. |
| M29 | `node --version` (v26.13.1 local); `test.yml:26` (Node 24) | Both strip TypeScript types by default, so `check.test.mjs` can import a `.ts` helper with its extension. |
| M24 | `BACKLOG.md:9` (#525) | Places a fix to Waymark's 320 px brand overflow in this pass, in `themes/waymark`, which is outside the row. Waymark's kind is `blog`, so its demo never uses the organization set (pass 3's kind lookup), and the overflow never reaches a live demo. |

## Recorded searches

| Search | Hits |
| --- | --- |
| `grep -n "four custom\|overrides.css" <design>` | Goal 2 (line 63): "setting four values in `src/site/overrides.css`: each color and the text color that sits on it." Call 13 names them: `--color-neutral`, `--color-neutral-content`, `--color-secondary`, `--color-secondary-content`. |
| `grep -rn "engine" tool --include=*.go` | Only `doctor/check_floors.go` (package floors) and `health/check_engine.go` (the site's own engine pin). No theme range. |
| `grep -n "#412" BACKLOG.md` | Open at line 155. |

## Scope

Files written:

- `themes/pennant/**`: `cairn-theme.json`, `README.md`, `components/` (`ArticleView`,
  `EntryRow`, `SiteFooter`, `SiteHeader`, `Crest`, `crest.ts`, `home-split.ts`,
  `admin-link.ts`), `directives/` (as Waymark's),
  `fonts/`, `icons.ts`, `modes/{light,dark}.css`, `screenshots/`, `site.css`, `theme.css`,
  `theme-names.ts` if Waymark's layout needs it, and `tokens/{resolver.json,tokens.json,tokens.css}`
  plus the option sheets `build-tokens.mjs` writes.
- `scripts/theme/check-rules.mjs`, `scripts/theme/check-render.mjs`, `scripts/theme/check.test.mjs`.
- `scripts/theme/build-tokens.mjs` and `scripts/theme/build-tokens.test.mjs` only if standing
  answer 3 fires.
- `scripts/theme/fixtures/pennant-photos/**`, `scripts/theme/fixtures/pennant-bare/**`, and an
  options-theme copy with a failing value if decision 2's test needs a committed fixture.
- `BACKLOG.md`.

Rows added at planning: none. `sets/organization/**` is in the row but is touched only under
standing answer 12, which raises its version.

Never touched: `docs/STATUS.md` (the conductor's, except a `## Stop`), `.github/**`,
`scripts/release/**`, `scripts/checks/**`, `scripts/catalog/**`, `.claude/settings*`,
`schema/**`, `src/**` (above all `src/lib/audit/`), `templates/**` (including
`templates/catalog.json`), `examples/**`, `themes/waymark/**`, `tool/**`, `package.json`.
`CHANGELOG.md` and `MIGRATION-NOTES.md` get no entry (decision 12).

## Standing answers

The twelve in `round-run.md` hold, with the design's thirteen. These bear on this pass:

- **Design 2.** Option values measured already: drop the work and keep items 1 and 2. M1 shows
  they aren't.
- **Design 3.** The `colors` option hits #412: fix #412 in `build-tokens.mjs` with a fixture
  test, inside the estimate plus 30 minutes. Decision 4 is built to avoid it; T2 proves which.
- **Design 4.** A set misses 4.5:1 in one mode: tune the ink or the text color within its hue
  and list the old and new values in the PR. Grounds stay the mockup's. No set is dropped.
- **Design 5.** A 403 from R2 or a deploy: never widen a token, never try another credential.
  Park with the request, the response, and the token's name.
- **Design 8.** The proving run goes red for a cause outside the files: file it through
  `standards:log-issue`; the conductor parks if it blocks a publish.
- **Design 9.** The grader fails a render after two fix rounds: the close packet shows it beside
  the mockup and asks.
- **Design 10.** Pennant paints a pair the check doesn't measure: move the pair onto a measured
  role. Never edit `src/lib/audit/`.
- **Design 12.** A change to the organization set raises its version in the same PR.
- **Design 13.** The engine range: decision 3.
- **Planner.** CI's test job passes 36 minutes (80% of its 45) on the PR, after decision 18:
  park with the job's step durations as an owner ask on `.github/workflows/test.yml`'s timeout.
  The catalog publish job is held to the same 80% of its 60.
- **Planner.** The fonts exceed 400 KiB: drop the latin-ext subsets first, then Barlow 500, and
  never a family. A weight the mockup uses and the budget can't hold is synthesized by the
  nearest kept weight and named in the PR.

## Decisions made at planning

1. **Option values are measured in `check-rules.mjs` (items 1 and 2).** The `audit` rule loops
   over every value of every option in the resolver. For each value it parses the value's option
   sheet with postcss (already a dependency), drops every selector holding `:has(` (M2), writes
   the result to `src/site/theme-options.css` in the showcase copy, and runs the audit with that
   file added to the public stylesheet chain after `src/theme/theme.css` (M3). Each finding's
   message is prefixed `colors=<value> <light|dark>`, the mode read from the finding's daisyUI
   block through the manifest's `colorModes`, since a block's name need not carry its mode.
   The pair counts come from `measureThemeContrast` over `loadImportChain`, both exported from
   `dist/audit` (T1 confirms the names), because `runStatic`'s report carries findings only.
   The notes channel gets one line per value per mode: the option, the value, the mode, and the
   measured and unmeasured pair counts. Pennant prints ten lines and the options fixture four.
   An unmeasured pair from an option sheet is a finding. A theme with no options runs once, as
   today. No change to `src/lib/audit`, `optionCss`, or the chain the site uses.
2. **Item 2's test** lives in `check.test.mjs`, which already edits a fixture copy per case
   (line 73). It copies `scripts/theme/fixtures/options-theme`, sets one value's
   `--color-accent-content` to a value under 4.5:1 in dark only, rebuilds the copy's tokens,
   runs the audit, and asserts the failure names `accent=<value> dark`. A twin case does the
   same for light. A third asserts the unchanged fixture passes with four notes lines.
3. **The engine range.** Pennant's `engine` is `>=0.99.0-rc.5`, call 15 as approved. The
   `engine-range` rule changes to admit the repository's version or the next prerelease of it
   (`semver.inc(version, 'prerelease')`), and nothing further. A theme whose range starts at the
   next prerelease passes, since it can only publish before that release exists, and any later
   bound still fails. `check.test.mjs` gains two cases derived from `package.json`'s version so
   the next bump keeps them true: `>=<inc(v)>` passes and `>=<inc(inc(v))>` fails. The two
   existing cases (M9) stay red. The schema admits the form (M7),
   and no other reader compares a theme's range with a version (M8). The organization set keeps
   `>=0.99.0-rc.5`. [advisor]
   Call: design call 15 asks for a range that excludes rc.4, and the theme check refuses any
   range that excludes the repository's own version (M7). Standing answer 13 offered the nearest
   range that reads, `>=0.99.0-0`, but Pennant 1.0.0's manifest is permanent and would tell an
   rc.4 site it can run a theme that needs passes 1 and 2. The rule change is one revertible
   commit in `scripts/theme/`; the manifest isn't.
4. **Color tokens and #412.** The `colors` option has five values, `fireweed` (the default),
   `navy`, `scarlet`, `purple`, and `orange`. Each value's light and dark groups set only
   comma-free oklch properties: `--color-neutral`, `--color-neutral-content`,
   `--color-secondary`, `--color-secondary-content`. The mockup's color 1 and color 2 are the
   grounds (M19). Every derived token (tinted grounds, borders, the ink) is a `color-mix()` in
   oklch in the base or mode tokens over those four `var()`s (call 14), so an option sheet never
   holds a comma value and the M4 collision never forms. The four tokens' base values also stay
   literal oklch in both modes, because `build-tokens.mjs:298` makes a token unlayered when
   either mode's value holds a comma. A `check.test.mjs` case asserts the unlayered `:root` block
   in Pennant's `tokens.css` names none of the four. T2 proves the whole by building the viewer
   site with `navy` and no cookie and reading the computed `--color-neutral` on `html`. If it
   reads fireweed, standing answer 3 fires.
5. **The link ink derives from color 1.** `--color-primary` is
   `color-mix(in oklch, var(--color-neutral) P%, var(--color-base-content))`, set per mode in
   `tokens.json` (the `modes/*.css` files are `build-tokens.mjs` output and are never hand
   edited), one P for light and one for dark, so links and the news dates follow color 1 and a
   club's override (item 7) moves them too. T2 picks the two values of P and records the
   measured ratios of every pair the audit gates: `--color-primary` on `--color-base-100` and
   `--color-base-200`, `--color-primary-content` on `--color-primary`, the focus ring at 3:1 on
   both grounds, `--color-base-content` and the muted text on `--color-base-200`,
   `--color-neutral-content` on `--color-neutral`, and `--color-secondary-content` on
   `--color-secondary`. A set that misses takes standing answer 4: first P, then that set's
   `-content` color within its hue. Grounds stay the mockup's. If no single P per mode clears
   every set, that set alone gets a literal comma-free `--color-primary` in its option sheet,
   and the PR records it as a `Call:` with the numbers, saying links in that set don't follow a
   club's override. [advisor]
   Call: call 13 says `--color-primary` is "an ink form of color 1 fixed per set and per mode".
   Pennant derives it with one mix per mode instead of a literal per set, so item 7's links
   recolor from the four overrides.
6. **Item 7's overrides.** The four custom properties are the ones decision 4 names. The README
   shows them set on `:root, html:root:not([data-theme]) { ... }`, because a plain `:root` rule
   loses to the mode pin for a visitor with no cookie (M25). The sixth pair is an invented club
   color pair chosen by T5 (two colors no set uses, for example a teal and a coral), each with
   its text color, which T5 measures first. Because an override applies in both modes (M10), it
   must pass both. Item 7's check, as written, is "the site's `theme-contrast` audit passes on
   that pair". The site's chain doesn't read `overrides.css` (M11), so the check runs the audit
   with the chain the site ships: `src/theme/theme.css`, then `src/site/theme-options.css` as
   `writeOptions` writes it (the default value's option sheet with its `:has(` selectors
   stripped, then `modes/light.css`), then `src/site/overrides.css`, through decision 1's code
   path. The PR prints the command. Item 7's render harness checks the override in three
   states with the mode sheet present: no cookie on a light OS, no cookie on a dark OS, and the
   cookie set.
   Call: the README teaches the two-selector form, which Pennant 1.0.0's README keeps for good.
   The pin's specificity is the engine's to fix in `build-tokens.mjs`, which would rebuild
   Waymark's files, outside this pass; T6 files it through `standards:log-issue`.
   Call: item 7's check is amended to an explicit chain, because the site's own audit never reads
   `overrides.css`. A template that audits overrides is a template change, filed through
   `standards:log-issue`.
7. **The home page.** `ArticleView` with `home` renders, in order: a leading banner lifted out
   of `home.before`, the hero, the rest of `home.before`, the news section, and `home.after`.
   The lift lives in `components/home-split.ts`, a pure function that matches a
   `<div data-cairn-island="banner"` at the very start of `home.before` (after whitespace) and
   finds the wrapper's end by counting `<div` and `</div>` depth, as `home.ts` `splitAtLastRule`
   scans (M26). Anything else stays in place. Its `check.test.mjs` cases cover a live banner, an
   expired one (`banner-expired` inside the wrapper), no banner, and the organization set's
   `home.md:8` rendered. The hero is a two-column grid at 760 px and up: the
   title (`h1`, Barlow Semi Condensed), the description, and up to two buttons from
   `page.data.actions` (the first filled in `--color-secondary`, the second outlined), beside
   the image. With no image, the crest (decision 8) sits there on a color-1 ground. The hero
   prints no caption. The news section is the newest three posts (M16), each an `EntryRow` with
   its date, and an archive link. The home body sits in the wide container (M18), about 1120 px
   with a 28 px gutter, while posts and pages keep the reading measure.
8. **The header and the crest.** `SiteHeader` is a color-1 bar (`--color-neutral` ground,
   `--color-neutral-content` text) holding the crest, the site name in Big Shoulders Display
   800, up to five `nav` links, and a Join button from the first `actions` link in
   `--color-secondary`. The crest is `components/Crest.svelte`, a CSS `clip-path` shield in
   `--color-secondary` holding up to three initials from `siteName`, and both the header and
   the hero use it. The initials come from `components/crest.ts`: the first letter of each word
   that starts with a letter, skipping "the", "of", "and", and "a" unless that leaves none. A
   name with no letters gives an empty shield. Its `check.test.mjs` cases import it by its
   `.ts` path (M29): "The Turnagain Geographic Society" gives "TGS", "Anchorage FC" gives "AF",
   "4321" gives an empty string, and each case is seen failing once on a stub. Under 760 px the links fold into a native `details` menu (no script), and the
   name wraps rather than overflowing at 320 (M24's failure mode). The menu's border is a
   `color-mix()` of `--color-neutral-content` with transparent, not the mockup's relative color
   (M19).
9. **Cards (both departures).** `site.css` styles the `cards` block in Pennant's look and keeps
   the chassis grid, so columns follow pass 1. A card whose title is a link (departure 1) sets
   that link as the heading, and an `em` inside its text is set upright and small, in the ink
   for the first (the audience line) and with a top rule for the last (the meeting line). A
   `cards` block with no image and no link in any item (departure 2) is styled as the mockup's
   facts row: no card box, a bold lead as the term, and the text under it. The supporters block
   takes the same text-only form at four across, laid out as the mockup's logos row. The
   selector reads the rendered markup; T4 reads pass 1's `cards` renderer for the classes, and
   uses `:has()` only for layout, never inside a token rule.
10. **Pages, posts, the archive, and the 404.** `ArticleView` without `home` keeps Waymark's
    structure and reading measure, restyled in Pennant's type and color. `EntryRow` is the
    mockup's `.post` row: the date in the ink above the year, the title, the description, and a
    150 px thumbnail when the post has an image; with none, the row has two columns. The
    archive and the 404 use these components and the template's routes.
11. **Harnesses.** Items 3, 4, 5, 6, and 7 run from node scripts under the executor's job `tmp`
    (M12, M13) that reuse the viewer's own functions: compose with `composeSite`, copy the
    organization set's config with `siteName` set to the home title as `buildDemo` does,
    `writeOptions` per value and mode, `buildSite`, and serve with `startSite`
    (`viewer/site.mjs:311`), which binds 127.0.0.1 and returns its own stop handle. Playwright
    comes from the showcase's modules. Each page waits for `load`, then `document.fonts.ready`,
    then for every `[data-cairn-island]` to hydrate, before a shot or an axe run. Items 3 and 4
    share ten builds over `sets/organization` (five values, two modes). Item 5 adds two builds
    (one per fixture), item 6 one over the viewer's default content with `colorScheme: 'light'`,
    and item 7 one, fourteen in all. Item 5 builds over two fixtures, `scripts/theme/fixtures/pennant-photos`
    (an image in every slot: the home image, each program card, each post, a page hero) and
    `scripts/theme/fixtures/pennant-bare` (no image anywhere). Their images are WebP renders of
    the mockup's `ph-*.svg` placeholders at 720x480, made with `sharp`, each under 100 KB. The
    harness scripts aren't committed; the PR lists each one's command and output path.
12. **No `CHANGELOG.md` or `MIGRATION-NOTES.md` entry.** Nothing the npm package ships changes
    (M23), and `MIGRATION-NOTES.md` is outside the row. The catalog announces the release, and
    the manifest's `notes` reads "First release.".
13. **Screenshots.** The manifest lists `screenshots/home-light.png` (1440x960, first, 3:2 for
    the catalog card, M20), `home-dark.png` (1440x960), and `home-mobile.png` (390x960), each in
    `fireweed` over the organization set, as Waymark's do. T5 checks the card builds under
    100 KB with `buildCard`.
14. **#525 is declined here.** Its fix lies in `themes/waymark`, outside the row, and Waymark's
    demo never shows the organization set (M24). T6 rewords its placement to the next Waymark
    release, and the planner tells the conductor. Pennant's own header meets the 320 bar
    (decision 8).
15. **The PR's `catalog` run** deploys both Waymark and Pennant to the proving target, the live
    two-theme proof pass 3's item 3 left to this pass. A cancelled or superseded run gets
    `gh run rerun <run-id>` once; if auto mode refuses it, the PR records the run id and the
    refusal for the conductor. The proving origin has no `{id}`, so the run deploys Pennant,
    confirms it, then deploys Waymark over it (M27). Pennant's evidence is the run log's
    `catalog: https://demo-proving.cairn.pub/ serves pennant@1.0.0` line. After a green run, a
    read-only `curl -s https://demo-proving.cairn.pub/` carries Waymark's marker, and the PR
    records both lines.
16. **The fast lane** after each task is the legs
    `node scripts/checks/gate-tier.mjs --fast --range a6d064500..HEAD` prints, each through
    `cairn-run-gate` per `cairn-pass` "Fast lane". If a leg is `make -C tool check`, drop it and
    record that in the PR. The close gate is the same command without `--fast`.
17. **Dependency flags.** PR #251's `[advisor]` call 2 (a `columns="4"` block is two across in
    the measure) and PR #254's `[advisor]` decision 5 (the home keeps three-column cards) both
    bear on decision 7's wide container, and the PR's `## Decisions` names them.
18. **The render rule's full run** renders every option value in the light mode, plus the
    default values in each other mode: six builds for Pennant, not ten (M28). An option sheet
    changes color only, and the rule checks status codes and console errors, which color can't
    move. Dark contrast is measured by item 1's audit and item 3's axe run. The quick run is
    unchanged. T1 makes the change in `check-render.mjs` with its doc comment, and a
    `check.test.mjs` case asserts the combination list for the options fixture (two values: three
    builds).
    Call: the theme check's render covers fewer option and mode pairs, so CI's test job stays
    inside its 45 minutes without a `.github` change.

## Tasks

T0 runs in the executor's own session, since no implementer has web tools. Then dispatch each
task to `cairn-implementer` in its own worktree off `pennant-4`, naming the model and effort on
every dispatch. Group 1 is T1 beside T2's head (steps 1 to 6); T2's tail (steps 7 to 10) runs in
T2's worktree after T1 merges and T2 merges `pennant-4` in, because T1 owns
`scripts/theme/check.test.mjs` until then and step 9 needs T1's measurement. Group 2 is T3
beside T4, after group 1 merges; neither edits `check.test.mjs`. T5 beside T6 follows. Each task
ends with the fast lane (decision 16), and its minutes include it. Push only at a group's end,
after its tasks merge.

### T0. The fonts (15 min, the executor's session, before group 1)

1. Fetch Big Shoulders Display (700, 800), Barlow Semi Condensed (600, 700), and Barlow (400,
   500, 600, and 400 italic if the budget allows) as latin and latin-ext `.woff2` files from
   `@fontsource` through `npm pack` into an empty directory under the job's `tmp`, then copy only
   the `.woff2` files out. Each family's license is `OFL-1.1`; confirm it in each package's
   `LICENSE` and record the package version.
2. Sum the sizes against 400 KiB (M22) and apply the planner's standing answer if over.
3. Hand the file list, sizes, and sources to T2.

### T1. Measure every option value; admit the next prerelease (60 min, Opus `medium`, group 1)

Load `cairn-writing-engine-code` and `standards:ts-conventions`.

1. In `scripts/theme/check-rules.mjs`, apply decision 1 to `audit` and decision 3 to
   `engine-range`, with doc comments that say why.
2. In `scripts/theme/check-render.mjs`, apply decision 18.
3. In `scripts/theme/check.test.mjs`, add decision 2's three cases, decision 3's two, and
   decision 18's one.

Done when `node --test scripts/theme/check.test.mjs` passes and
`node scripts/theme/check.mjs themes/waymark` still passes.

### T2. Tokens, fonts, the manifest, the crest, and the README (head 50 min, tail 35 min, Opus `medium`, group 1)

Load `standards:visual-fidelity`, `cairn-following-public-design`, `standards:daisyui`, and
`standards:svelte-conventions`. Read `varsity-3.html` lines 1-160 and Waymark's `tokens/`,
`modes/`, `theme.css`, `fonts/`, and manifest.

Head, beside T1:

1. Write `themes/pennant/tokens/resolver.json` and `tokens.json` with a `mode` modifier and a
   `colors` modifier of five values (decisions 4 and 5, M19), modelled on
   `scripts/theme/fixtures/options-theme/tokens/resolver.json`. The derived tokens and decision
   5's ink go in `tokens.json` per mode. Run `build-tokens.mjs` to write `tokens.css`,
   `modes/light.css`, `modes/dark.css`, and the option sheets; never hand edit an output. Radii
   10 px on boxes and 7 px on fields.
2. Write `theme.css` (the type scale and the imports) and `fonts/fonts.css` (the `@font-face`
   rules the contract requires, `schema/cairn-theme-contract-1.json`) from T0's files.
3. Write `cairn-theme.json`: `id: pennant`, `name: Pennant`, the description exactly "A
   two-color club and team look that's easy to recolor.", `version: 1.0.0`,
   `notes: First release.`, a summary, `engine` per decision 3, `kinds: ["organization"]`,
   `license: MIT`, `contract: 1`, the color modes, the `colors` option, the three fonts with
   `OFL-1.1`, and decision 13's screenshots (placeholders until T5).
4. Write `components/crest.ts` and `components/Crest.svelte` (decision 8), and
   `components/home-split.ts` (decision 7).
5. Write `README.md`: the five sets, and the four `overrides.css` lines in decision 6's
   two-selector form.
6. Copy Waymark's other `components/` and `directives/` unchanged as a starting point so the
   check can render; T3 and T4 replace the components.

Tail, after T1 merges:

7. Add to `check.test.mjs`: item 8's manifest test (three fonts each `OFL-1.1`, `kinds` exactly
   `["organization"]`, the description exact and 60 characters or fewer), decision 4's
   unlayered-block assertion, and the `crest.ts` and `home-split.ts` cases (decisions 7 and 8).
8. Build the viewer site with `navy` and no cookie and read the computed `--color-neutral` on
   `html` (decision 4). On fireweed, standing answer 3.
9. Run `node scripts/theme/check.mjs themes/pennant --rules audit` and tune per decision 5.
   Record every pair's ratio per set and mode.
10. Run the full `node scripts/theme/check.mjs themes/pennant` and record its wall time.

Done when the check passes and its notes list ten measured lines with no unmeasured pair.

### T3. The header and the footer (45 min, Opus `medium`, group 2)

Load `standards:visual-fidelity`, `cairn-following-public-design`, `standards:daisyui`,
`frontend-design:frontend-design`, and `standards:svelte-conventions`. Read the mockup's header
(lines 60-78, 144-150) and footer.

1. Write `components/SiteHeader.svelte` per decision 8, with its styles in the component and
   the crest from T2's `Crest.svelte`.
2. Write `components/SiteFooter.svelte` in the mockup's footer: the footer menu, the site name,
   and the color-mode toggle if the mockup puts it there; otherwise the toggle stays in the
   header, as Waymark's does.

Done when the fast lane passes and a 320 px render shows no horizontal overflow.

### T4. The home page, cards, pages, posts, and rows (75 min, Opus `medium`, group 2)

Load the same skills as T3. Read the mockup's sections (lines 79-138) and pass 1's `cards`
renderer.

1. Write `components/ArticleView.svelte` per decisions 7 and 10, keeping Waymark's head, SEO,
   twin-link, author, and related-post behavior. The banner lift calls T2's `home-split.ts`, and
   the hero with no image places T2's `Crest.svelte`.
2. Write `components/EntryRow.svelte` per decision 10.
3. Write `site.css` for the home sections, the cards (decision 9), and the banner.

Done when `node scripts/theme/check.mjs themes/pennant` passes, including `render` and
`directive-styled`.

### T5. Fixtures, harnesses, screenshots, and evidence (110 min, Sonnet `medium`, after group 2)

1. Write the two fixtures (decision 11): pages and posts in the starter overlay's shapes, with a
   `home` page holding the banner, programs, facts, a rule, and supporters, as the organization
   set's does.
2. Write the harnesses under the job's `tmp` (decision 11) and run them, fourteen builds in all:
   - item 3: axe `color-contrast` over `/`, a post, a page, `/archive/1`, and a 404 in all ten
     states (five values, two modes) over `sets/organization`, recording violations per page and
     state;
   - item 4: the 26 home renders, from the same ten builds;
   - item 5: the five page types at 390 and 1440 over each fixture, light `fireweed`;
   - item 6: the viewer site with `navy` and no cookie on a light OS, the header's computed
     ground, and a screenshot;
   - item 7: the sixth pair in `overrides.css` in decision 6's form, screenshots of the home
     page, a post, and the archive in the three states decision 6 names, and decision 6's audit
     command.
3. Write the three manifest screenshots (decision 13) and check `buildCard` on the theme.

Done when every harness has run and its output paths and results are in the task report.

### T6. The backlog (10 min, Sonnet `low`, beside T5)

In `BACKLOG.md`, reword #525's placement per decision 14, and file two items through
`standards:log-issue`: decision 6's template gap (a site's audit never reads `overrides.css`)
and the mode pin that outranks a plain `:root` override (M25). Read each entry first, since
main's copy has moved since the base.

### The grade (95 min with one fix round, the executor's session, after T5)

Read every render with your own eyes first. Then dispatch `standards:visual-verifier` in a
fresh context with the mockup, `v3-bare.png`, `v3-dark.png`, `v3-mobile.png`, and
`v3-navy.png` as separate labeled references, the design's "Fidelity" section with both
departures, and T5's 26 home renders and the item 5 renders. A STRUCTURAL verdict goes back to
T3 or T4 as a fix dispatch, then T5's affected harness reruns and the grader reads again (about
45 minutes a round). After two fix rounds, standing answer 9.

## Acceptance

| # | Item (verbatim from the design) | Task | Evidence |
| --- | --- | --- | --- |
| 1 | `node scripts/theme/check.mjs themes/pennant` passes, and its output lists a contrast measurement for each of the five `colors` values in light and in dark, with no pair recorded as unmeasured. | T1, T2 | The command's output in the PR, with the ten notes lines |
| 2 | With one color set's text color changed to fail 4.5:1, the same command fails and names the set and the mode. | T1 | `check.test.mjs`'s failing-value cases under `node --test`, and one manual run on a Pennant copy with `navy`'s `--color-neutral-content` lowered and its tokens rebuilt, output in the PR naming `colors=navy` and the mode |
| 3 | An axe `color-contrast` run over the home page, a post, a page, the archive, and the 404 page reports no violation in each of the ten states. | T5 | The item 3 harness's table, 50 rows, in the PR |
| 4 | A fresh grader compares the demo's home page with `varsity-3.html` under the "Fidelity" bar: at 320, 390, 768, 1440, and 2560 pixels in the default set, light and dark, and at 390 and 1440 in the other four sets, light and dark. It passes each of the 26 renders, or the close packet shows the failing one. | T5, the grade | The grader's verdict per render, and the renders beside the mockup in the close packet |
| 5 | The home page, a page, a post, the archive, and the 404 page are rendered at 390 and 1440, once with a photo fixture in every image slot and once with none. The grader passes both against the mockup's type, color, and spacing, and against `v3-bare.png` for the home page with no photo. | T5, the grade | The grader's verdict on the 20 renders |
| 6 | The viewer's scratch site (`scripts/theme/viewer/site.mjs`), built with the `navy` value and no color-mode cookie, shows navy as the header's ground on first load. | T2, T5 | T2's computed `--color-neutral` read, then T5's header computed `background-color` and a screenshot |
| 7 | Four custom properties in `src/site/overrides.css` recolor the header, the buttons, the links, and the card accents. Screenshots of the home page, a post, and the archive in a sixth color pair show it, and the site's `theme-contrast` audit passes on that pair. | T5 | Three screenshots in each of decision 6's three states, and decision 6's amended audit command with its output (flagged) |
| 8 | `themes/pennant/cairn-theme.json` names the three fonts with their SPDX license, lists `kinds: ["organization"]`, and carries the description under "Rulings" exactly. A test asserts the description is 60 characters or fewer. | T2 | The manifest test in `check.test.mjs` |
| 9 | After merge, `catalog.cairn.pub/index.json` lists Pennant 1.0.0. `demo-pennant.cairn.pub` serves the society's home page in the `fireweed` set with all six sections in order, and `/admin` there is absent. | After merge | The conductor's read of both URLs after the `catalog` run on `main`; before merge, the PR's proving run (decision 15) |
| E1 | The pull request shows evidence for each item. | Close | The PR's `## Acceptance` section, one line per item |
| E2 | Everything written for a person follows `~/.claude/docs/voice/written-for-people.md` or the repo's docs rules. | T2, Close | The README and the PR body's opening paragraph |

## Close

Close is 50 minutes on the path. Run the `cairn-running-passes` close checklist. Then:

- If GitHub reports the PR as conflicting with `main`, merge `origin/main` into `pennant-4` with
  a merge commit, keep both sides' `BACKLOG.md` entries, and rerun the fast lane. Never rebase a
  pushed branch.
- The close gate per decision 16.
- In one round, dispatch `standards:diff-reviewer` (whole-branch, `a6d064500..HEAD`) with the
  plan and the design, `standards:svelte-reviewer` on `themes/pennant/components/`, and
  `standards:daisyui-a11y-reviewer` on `themes/pennant/`. Fold what they find first.
- The PR body carries `Round: pennant`, `Pass: 4 theme`, `Review: <verdict>, open findings <n>`,
  `Calls:` (decisions 3, 5, 6, and 18), `## Decisions` (decision 17's dependency lines), `## Planning
  misses`, the full check's wall time and the CI test job's duration, the measured ratios per set and mode with any standing answer 4 tuning, the
  grader's verdicts, the cleanups filed through `standards:log-issue`, and the proving run's
  result.
- The close packet, sent by the conductor, shows the grader's renders beside the mockup.
- The last commit deletes this plan and its executor prompt. Rerun `npm run check:docs-gate`
  after it.

## Planning misses

- [mechanism] The design takes for granted that the theme check reads a range excluding rc.4,
  and it refuses one (M7). Decision 3.
- [mechanism] Item 7 assumes the site's audit reads `overrides.css`, and it doesn't (M11).
  Decision 6.
- [mechanism] Call 13's fixed per-set ink would leave links unmoved by a club's override.
  Decision 5.
- [file-list] The design names no harness home for axe and the renders, and both tools sit
  outside the row (M12). Decision 11.
- [mechanism] Item 7's override loses to the mode pin for a visitor with no cookie (M25), which
  no planner probe caught because none loaded a mode sheet. Decision 6.
- [mechanism] M17 read the banner's own markup, not the island wrapper it reaches the page in
  (M26). Decision 7.
- [mechanism] Decision 15's first draft expected Pennant's marker on the proving origin, which
  Waymark's deploy overwrites (M27).
- [estimate] The first draft's 310-minute path left out the render count, grade fix rounds, and
  fast lanes; the review raised it to 440. Ten render builds would have pushed CI's test job
  near its 45 minutes (M28). Decision 18.
- [file-list] T1 and T2 both wrote `check.test.mjs`, and T3 and T4 both needed the crest. T2's
  tail and T2's crest settle both.

## Advisor fold

The advisor read the plan's mechanism before drafting. It reversed its earlier reading of
design standing answer 13: Pennant 1.0.0's manifest can never be withdrawn, so a `>=0.99.0-0`
range would tell an rc.4 site it can run a theme that needs passes 1 and 2. Decision 3 takes the
narrow rule change instead. It also held that links can follow a club's four overrides only if
the ink derives from `--color-neutral`, which decision 5 builds. The `[advisor]` marks name the
lines it shaped.

## Plan review fold

One `standards:plan-reviewer` read (Opus, `medium`) returned 1 blocker, 8 major, and 9 minor
findings. The planner re-checked the blocker and majors 2, 3, and 4 against the code (M25 to
M28) before folding. All were folded:

- Blocker 1, the override and the mode pin: decision 6 (the README's two-selector form, the
  shipped chain, three states) and T6's filed item. Recorded as a `Call:`.
- Major 2, the banner wrapper: decision 7 and `home-split.ts` with four cases.
- Major 3, CI time: decision 18 and the planner's CI standing answer, with M28's measured
  durations in place of a pre-launch timing run.
- Major 4, the proving marker: decision 15.
- Majors 5, 6, and 7, test runners and shared files: decisions 7 and 8, M29, and T2's head and
  tail.
- Major 8, hard-coded versions: decision 3.
- Major 9, the estimate: the header and every task heading.
- Minors 10 and 11: decisions 1 and 2. Minor 12: decision 4 and T2 step 8. Minor 13: decision 5
  and T2 step 1. Minor 14: decision 4. Minor 15: decision 5. Minor 16: T2 step 2. Minor 17:
  decision 3 and item 2's evidence. Minor 18: decision 11.
