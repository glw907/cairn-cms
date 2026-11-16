# Pennant pass 4: the theme

Initiative: theme-garden
Round: pennant
Pass: 4 theme

The design is `~/Projects/initiatives/theme-garden/specs/2026-11-14-pennant-design.md`, approved
by Geoff through packet `20261115-041501-ead5c5`. The pass runs in worktree
`.claude/worktrees/pennant-4` on branch `pennant-4`, based on `a6d064500` (the head of
`pennant-3`). The PR base is `main`. Until PRs #251, #253, and #254 merge, the PR's diff also
shows passes 1 to 3; the review range is `a6d064500..HEAD`. Class `ordinary`, `live-account`.
The conductor is `conductor-pennant`. The design's path is 260 minutes, and this plan's is 310
(T0 15, group 1 60, group 2 75, T5 60, the grade 50, Close 50; sum of all minutes 430). The pass
parks at planning over 520, twice the design's estimate, so it launches. The executor's path
ceiling is 620 minutes, twice the plan's path (`round-run.md` standing answer 7, by the analogy
pass 3 used). [advisor]

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
  `EntryRow`, `SiteFooter`, `SiteHeader`, `admin-link.ts`), `directives/` (as Waymark's),
  `fonts/`, `icons.ts`, `modes/{light,dark}.css`, `screenshots/`, `site.css`, `theme.css`,
  `theme-names.ts` if Waymark's layout needs it, and `tokens/{resolver.json,tokens.json,tokens.css}`
  plus the option sheets `build-tokens.mjs` writes.
- `scripts/theme/check-rules.mjs`, `scripts/theme/check.test.mjs`.
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
- **Planner.** The fonts exceed 400 KiB: drop the latin-ext subsets first, then Barlow 500, and
  never a family. A weight the mockup uses and the budget can't hold is synthesized by the
  nearest kept weight and named in the PR.

## Decisions made at planning

1. **Option values are measured in `check-rules.mjs` (items 1 and 2).** The `audit` rule loops
   over every value of every option in the resolver. For each value it parses the value's option
   sheet with postcss (already a dependency), drops every selector holding `:has(` (M2), writes
   the result to `src/site/theme-options.css` in the showcase copy, and runs the audit with that
   file added to the public stylesheet chain after `src/theme/theme.css` (M3). Each finding's
   message is prefixed `colors=<value>`, which already carries the mode in its scheme column.
   Each run adds one line per value to the rule's notes channel: the option, the value, and the
   number of measured and unmeasured pairs in light and dark. An unmeasured pair from an option
   sheet is a finding. A theme with no options runs once, as today. No change to `src/lib/audit`,
   `optionCss`, or the chain the site uses.
2. **Item 2's test** lives in `check.test.mjs`, which already edits a fixture copy per case
   (line 73). It copies `scripts/theme/fixtures/options-theme`, sets one value's
   `--color-accent-content` to a value under 4.5:1 in dark only, runs the audit, and asserts the
   failure names `accent=<value>` and the dark scheme. A twin case does the same for light. A
   third asserts the unchanged fixture passes with a notes line for each of its two values.
3. **The engine range.** Pennant's `engine` is `>=0.99.0-rc.5`, call 15 as approved. The
   `engine-range` rule changes to admit the repository's version or the next prerelease of it
   (`semver.inc(version, 'prerelease')`), and nothing further. A theme or set whose range starts
   at the next prerelease passes, since it can only publish before that release exists, and any
   later bound still fails. `check.test.mjs` gains two cases: `>=0.99.0-rc.5` passes and
   `>=0.99.0-rc.6` fails; the two existing cases (M9) stay red. The schema admits the form (M7),
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
   holds a comma value and the M4 collision never forms. T2 proves it by building the viewer
   site with `navy` and no cookie (item 6). If the header still paints fireweed, standing answer
   3 fires.
5. **The link ink derives from color 1.** `--color-primary` is
   `color-mix(in oklch, var(--color-neutral) P%, var(--color-base-content))` in each mode sheet,
   one P for light and one for dark, so links and the news dates follow color 1 and a club's
   override (item 7) moves them too. T2 picks the two values of P so all five sets reach 4.5:1
   on the page ground in both modes, and records the measured ratios. A set that misses takes
   standing answer 4 through its own `--color-neutral` lightness, never through a per-set
   override of `--color-primary`. [advisor]
   Call: call 13 says `--color-primary` is "an ink form of color 1 fixed per set and per mode".
   Pennant derives it with one mix per mode instead of a literal per set, so item 7's links
   recolor from the four overrides.
6. **Item 7's overrides.** The four custom properties are the ones decision 4 names. The README
   shows a `:root` block setting them. The sixth pair is an invented club color pair chosen by
   T5 (two colors no set uses, for example a teal and a coral), each with its text color, which
   T5 measures first. Because an override applies in both modes (M10), it must pass both.
   Item 7's check, as written, is "the site's `theme-contrast` audit passes on that pair". The
   site's chain doesn't read `overrides.css` (M11), so the check runs the audit with an explicit
   three-entry chain: `src/theme/theme.css`, the default value's stripped option sheet, and
   `src/site/overrides.css`, through decision 1's code path. The PR prints the command.
   Call: item 7's check is amended to an explicit chain, because the site's own audit never reads
   `overrides.css`. A template that audits overrides is a template change, filed through
   `standards:log-issue`.
7. **The home page.** `ArticleView` with `home` renders, in order: a leading `div.banner` lifted
   out of `home.before` (M17), the hero, the rest of `home.before`, the news section, and
   `home.after`. The lift matches only a `div` with class `banner` at the very start of
   `home.before`, whose content is one `p` and an optional link, so it ends at the first
   `</div>`; anything else stays in place. The hero is a two-column grid at 760 px and up: the
   title (`h1`, Barlow Semi Condensed), the description, and up to two buttons from
   `page.data.actions` (the first filled in `--color-secondary`, the second outlined), beside
   the image. With no image, the crest (decision 8) sits there on a color-1 ground. The hero
   prints no caption. The news section is the newest three posts (M16), each an `EntryRow` with
   its date, and an archive link. The home body sits in the wide container (M18), about 1120 px
   with a 28 px gutter, while posts and pages keep the reading measure.
8. **The header and the crest.** `SiteHeader` is a color-1 bar (`--color-neutral` ground,
   `--color-neutral-content` text) holding the crest, the site name in Big Shoulders Display
   800, up to five `nav` links, and a Join button from the first `actions` link in
   `--color-secondary`. The crest is a CSS `clip-path` shield in `--color-secondary` holding up
   to three initials from `siteName`: the first letter of each word that starts with a letter,
   skipping "the", "of", "and", and "a" unless that leaves none. A name with no letters gives an
   empty shield. Under 760 px the links fold into a native `details` menu (no script), and the
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
    (M12, M13): compose with `composeSite`, copy the organization set's config with `siteName`
    set to the home title as `buildDemo` does, `writeOptions` per value and mode, `buildSite`,
    serve with `npx wrangler dev --local` on 127.0.0.1 as a background task, drive Playwright
    from the showcase's modules, and stop the server with `TaskStop`. Item 4 builds over
    `sets/organization`. Item 5 builds over two fixtures, `scripts/theme/fixtures/pennant-photos`
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
    refusal for the conductor. After a green run, a read-only
    `curl -s https://demo-proving.cairn.pub/` must carry Pennant's release marker, and the PR
    records the line.
16. **The fast lane** after each task is the legs
    `node scripts/checks/gate-tier.mjs --fast --range a6d064500..HEAD` prints, each through
    `cairn-run-gate` per `cairn-pass` "Fast lane". If a leg is `make -C tool check`, drop it and
    record that in the PR. The close gate is the same command without `--fast`.
17. **Dependency flags.** PR #251's `[advisor]` call 2 (a `columns="4"` block is two across in
    the measure) and PR #254's `[advisor]` decision 5 (the home keeps three-column cards) both
    bear on decision 7's wide container, and the PR's `## Decisions` names them.

## Tasks

T0 runs in the executor's own session, since no implementer has web tools. Then dispatch each
task to `cairn-implementer` in its own worktree off `pennant-4`, naming the model and effort on
every dispatch. Group 1 is T1 beside T2. Group 2 is T3 beside T4, after group 1 merges. T5 beside
T6 follows. Each task ends with the fast lane (decision 16). Push only at a group's end, after its
tasks merge.

### T0. The fonts (15 min, the executor's session, before group 1)

1. Fetch Big Shoulders Display (700, 800), Barlow Semi Condensed (600, 700), and Barlow (400,
   500, 600, and 400 italic if the budget allows) as latin and latin-ext `.woff2` files from
   `@fontsource` through `npm pack` into an empty directory under the job's `tmp`, then copy only
   the `.woff2` files out. Each family's license is `OFL-1.1`; confirm it in each package's
   `LICENSE` and record the package version.
2. Sum the sizes against 400 KiB (M22) and apply the planner's standing answer if over.
3. Hand the file list, sizes, and sources to T2.

### T1. Measure every option value; admit the next prerelease (55 min, Opus `medium`, group 1)

Load `cairn-writing-engine-code` and `standards:ts-conventions`.

1. In `scripts/theme/check-rules.mjs`, apply decision 1 to `audit` and decision 3 to
   `engine-range`, with doc comments that say why.
2. In `scripts/theme/check.test.mjs`, add decision 2's three cases and decision 3's two.

Done when `node --test scripts/theme/check.test.mjs` passes and
`node scripts/theme/check.mjs themes/waymark` still passes.

### T2. Tokens, fonts, the manifest, and the README (60 min, Opus `medium`, group 1)

Load `standards:visual-fidelity`, `cairn-following-public-design`, and `standards:daisyui`. Read
`varsity-3.html` lines 1-160 and Waymark's `tokens/`, `modes/`, `theme.css`, and manifest.

1. Write `themes/pennant/tokens/resolver.json` and `tokens.json` with a `mode` modifier and a
   `colors` modifier of five values (decision 4, M19), modelled on
   `scripts/theme/fixtures/options-theme/tokens/resolver.json`. Run `build-tokens.mjs` to write
   `tokens.css` and the option sheets. Radii 10 px on boxes and 7 px on fields.
2. Write `modes/light.css` and `modes/dark.css` with the derived tokens and decision 5's ink.
3. Write `theme.css` (fonts, the type scale, the `@font-face` rules) from T0's files.
4. Write `cairn-theme.json`: `id: pennant`, `name: Pennant`, the description exactly "A
   two-color club and team look that's easy to recolor.", `version: 1.0.0`,
   `notes: First release.`, a summary, `engine` per decision 3, `kinds: ["organization"]`,
   `license: MIT`, `contract: 1`, the color modes, the `colors` option, the three fonts with
   `OFL-1.1`, and decision 13's screenshots (placeholders until T5).
5. Add item 8's test to `check.test.mjs`: Pennant's manifest names three fonts each `OFL-1.1`,
   `kinds` is exactly `["organization"]`, the description is exact and 60 characters or fewer.
6. Write `README.md`: the five sets, and the four `overrides.css` lines (decision 6).
7. Run item 1 (`node scripts/theme/check.mjs themes/pennant --rules audit` once T1 merges, or
   T1's branch merged into T2's worktree) and tune per decision 5. Record every ratio.
8. Build the viewer site with `navy` and no cookie and read the header's computed ground
   (decision 4). On fireweed, standing answer 3.

Copy Waymark's `components/` and `directives/` unchanged as a starting point so the check can
render; T3 and T4 replace the components. Done when the check's static rules pass and item 1's
notes list ten measured runs with no unmeasured pair.

### T3. The header and the footer (45 min, Opus `medium`, group 2)

Load `standards:visual-fidelity`, `cairn-following-public-design`, `standards:daisyui`,
`frontend-design:frontend-design`, and `standards:svelte-conventions`. Read the mockup's header
(lines 60-78, 144-150) and footer.

1. Write `components/SiteHeader.svelte` per decision 8, with its styles in the component.
2. Write `components/SiteFooter.svelte` in the mockup's footer: the footer menu, the site name,
   and the colour-mode toggle Waymark's header carries if the footer is where the mockup puts it;
   otherwise keep the toggle in the header.
3. Unit-test the initials function: "The Turnagain Geographic Society" gives "TGS", "Anchorage
   FC" gives "AF", "4321" gives an empty string.

Done when the fast lane passes and a 320 px render shows no horizontal overflow.

### T4. The home page, cards, pages, posts, and rows (75 min, Opus `medium`, group 2)

Load the same skills as T3. Read the mockup's sections (lines 79-138) and pass 1's `cards`
renderer.

1. Write `components/ArticleView.svelte` per decisions 7 and 10, keeping Waymark's head, SEO,
   twin-link, author, and related-post behavior.
2. Write `components/EntryRow.svelte` per decision 10.
3. Write `site.css` for the home sections, the cards (decision 9), and the banner.

Done when `node scripts/theme/check.mjs themes/pennant` passes, including `render` and
`directive-styled`.

### T5. Fixtures, harnesses, screenshots, and evidence (60 min, Sonnet `medium`, after group 2)

1. Write the two fixtures (decision 11): pages and posts in the starter overlay's shapes, with a
   `home` page holding the banner, programs, facts, a rule, and supporters, as the organization
   set's does.
2. Write the harnesses under the job's `tmp` (decision 11) and run them:
   - item 3: axe `color-contrast` over `/`, a post, a page, `/archive/1`, and a 404 in all ten
     states (five values, two modes), recording violations per page and state;
   - item 4: the 26 home renders over `sets/organization`;
   - item 5: the five page types at 390 and 1440 over each fixture, light `fireweed`;
   - item 6: the viewer site with `navy` and no cookie, the header's computed ground, and a
     screenshot;
   - item 7: the sixth pair in `overrides.css`, screenshots of the home page, a post, and the
     archive, and decision 6's audit command.
3. Write the three manifest screenshots (decision 13) and check `buildCard` on the theme.

Done when every harness has run and its output paths and results are in the task report.

### T6. The backlog (10 min, Sonnet `low`, beside T5)

In `BACKLOG.md`, reword #525's placement per decision 14, and file decision 6's template gap
through `standards:log-issue`. Read each entry first, since main's copy has moved since the base.

### The grade (50 min, the executor's session, after T5)

Dispatch `standards:visual-verifier` in a fresh context with the mockup, `v3-bare.png`,
`v3-dark.png`, `v3-mobile.png`, and `v3-navy.png` as separate labeled references, the design's
"Fidelity" section with both departures, and T5's 26 home renders and the item 5 renders. A
STRUCTURAL verdict goes back to T3 or T4 as a fix dispatch; after two fix rounds, standing answer
9. Read every render with your own eyes before the grade.

## Acceptance

| # | Item (verbatim from the design) | Task | Evidence |
| --- | --- | --- | --- |
| 1 | `node scripts/theme/check.mjs themes/pennant` passes, and its output lists a contrast measurement for each of the five `colors` values in light and in dark, with no pair recorded as unmeasured. | T1, T2 | The command's output in the PR, with the ten notes lines |
| 2 | With one color set's text color changed to fail 4.5:1, the same command fails and names the set and the mode. | T1 | `check.test.mjs`'s failing-value cases under `node --test`, and one manual run on a Pennant copy with `navy`'s `--color-neutral-content` lowered, output in the PR |
| 3 | An axe `color-contrast` run over the home page, a post, a page, the archive, and the 404 page reports no violation in each of the ten states. | T5 | The item 3 harness's table, 50 rows, in the PR |
| 4 | A fresh grader compares the demo's home page with `varsity-3.html` under the "Fidelity" bar: at 320, 390, 768, 1440, and 2560 pixels in the default set, light and dark, and at 390 and 1440 in the other four sets, light and dark. It passes each of the 26 renders, or the close packet shows the failing one. | T5, the grade | The grader's verdict per render, and the renders beside the mockup in the close packet |
| 5 | The home page, a page, a post, the archive, and the 404 page are rendered at 390 and 1440, once with a photo fixture in every image slot and once with none. The grader passes both against the mockup's type, color, and spacing, and against `v3-bare.png` for the home page with no photo. | T5, the grade | The grader's verdict on the 20 renders |
| 6 | The viewer's scratch site (`scripts/theme/viewer/site.mjs`), built with the `navy` value and no color-mode cookie, shows navy as the header's ground on first load. | T2, T5 | The header's computed `background-color` and a screenshot |
| 7 | Four custom properties in `src/site/overrides.css` recolor the header, the buttons, the links, and the card accents. Screenshots of the home page, a post, and the archive in a sixth color pair show it, and the site's `theme-contrast` audit passes on that pair. | T5 | Three screenshots and decision 6's amended audit command with its output (flagged) |
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
  `Calls:` (decisions 3, 5, and 6), `## Decisions` (decision 17's dependency lines), `## Planning
  misses`, the measured ratios per set and mode with any standing answer 4 tuning, the
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
