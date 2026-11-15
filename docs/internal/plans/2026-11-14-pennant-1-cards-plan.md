Initiative: theme-garden
Round: pennant
Pass: 1 cards

# Pass 1 `cards`: one card block, laid out and plainly styled by the chassis

Design: `~/Projects/initiatives/theme-garden/specs/2026-11-14-pennant-design.md`, approved by
Geoff through design packet `20261115-041501-ead5c5` on 2026-11-15 with the ruling "Keep it, as
one `cards` block". Worktree `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/pennant-1`,
branch `pennant-1`, base `4ebfb0e9e`. PR base `main`. Class `ordinary`. Conductor
`conductor-pennant`. The design's path is 110 minutes; this plan's path is 120 with pairs (sum of
task minutes 160). The park line at planning is 220, and the retry ceiling is 220, twice the
approved 110.

## Pre-flight

Owner steps: none. Nothing in this pass needs a sign-in, a secret, a dialog, or a new permission
rule. Its merge publishes nothing (design "What each merge publishes").

- Permissions checked: every task's writes and commands were read against auto mode and the
  denials log (`~/.local/state/claude-denials.jsonl`, 68 rows, 2026-11-01 to 2026-11-15). The pass
  writes repo files only, no `.claude/settings*`, no `.github/**`, no `scripts/release/**`, no
  credential, and no public surface. One command carries refusal history: the visual-baseline
  regeneration, `gh workflow run e2e.yml`. The denials log holds one "Auto-Mode Bypass" refusal of
  it (2026-11-02, branch `worktree-tool-fixes-run`), and the Actions API shows six successful
  `workflow_dispatch` runs that day by `glw907`, two of them on that same branch 13 seconds apart.
  The refused call was a repeat dispatch for a head already being regenerated. The route is one
  dispatch per head (Task 7). Its named alternative is the PR's `## Before merge`, under round-run
  standing answer 2. The other refused classes are listed under "Auto-mode routes".
- Reviewed: one `standards:plan-reviewer` read (Opus, `medium`), with pass-core `planner.md`
  "Stops" and "Pre-flight" added to its prompt. Findings folded under "Plan review fold".
- Evidence: the mechanism table and the recorded searches below. Every row is a probe run at
  `9525823a1` (code identical to `4ebfb0e9e` outside `BACKLOG.md`) on 2026-11-14, or a quoted
  source line.

### Auto-mode routes

| Refused class (denials log) | Route this pass takes |
| --- | --- |
| Auto-Mode Bypass (`gh workflow run e2e.yml`, a repeat dispatch) | One dispatch per head, after the last commit that changes a rendered page (Task 7). A second refusal puts the command in `## Before merge` and flags it. |
| Interfere With Workloads (`kill`, `pkill`, `claude stop`) | Never stop a process. A hung command runs under `timeout`. A busy dev-server port is waited out with a Monitor until-loop. |
| Irreversible Local Destruction (`git reset --hard`) | The acceptance 3 throwaway commit goes on a detached HEAD (Task 2), then `git switch pennant-1`. |
| Safety Bypass Flag (`--no-verify`) | Never. A failing hook is a defect to fix. |
| Destructive (setup command compounded and piped to `tail`) | Run the setup command bare, alone in its own call. Gates and CI watches run bare, never piped. |
| Merge Without Review (`gh pr merge`) | Merge only through `approval-queue`. |
| Self-Modification (`.claude/settings*`, `stow claude`) | Never. `templates/waymark/.claude/**` changes only through `npm run emit:template`. |
| Classifier unavailable | Retry the same call once after a pause. |

## Mechanism table

| # | Mechanism | Probe or source | Result |
| --- | --- | --- | --- |
| M1 | A repeatable item holding an image, a link, and text round-trips the grammar | Vitest probe of `serializeComponent`, `parseComponent`, and `componentRoundTripSafety` (`src/lib/render/component-grammar.ts`) with a `cards` def: `columns` a `fields.select` of `2`/`3`/`4`, slot `items` `kind: 'repeatable'`, `itemFields: { text: fields.text(...) }` | `![A trail map](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=720) [Junior program](/programs/junior) Ages 10 to 16. *Saturdays at ten.*` re-serializes byte-identical, `safety {"safe":true}`. Image only, link first, `**strong**` first, plain text, and `columns="7"` items are all identical and safe. Standing answer 1 does not fire at the grammar. |
| M2 | Serialized form | Same probe | `::::cards{columns="4"}\n:::items\n- <item>\n- <item>\n:::\n::::`. A block with a slot takes a four-colon fence, so nesting it in another block needs a five-colon outer fence. An absent `columns` is omitted from the opener. |
| M3 | Characters the grammar normalizes | Same probe | A bare `&` in a URL re-serializes as `\&`, a bare `*` as `\*`, and brackets inside link text are escaped. Each is `safe:true`, so the edit is lossless but not byte-identical. The normalization is remark-stringify's in `readListItems` and predates the pass. Fixtures for acceptance 2 avoid all three; Task 1 files a log-issue for it. |
| M4 | The hast the `build` sees per item | Vitest probe of `createRenderer({ blocks: [cards] })` (`src/lib/render/pipeline.ts:124`), dumping `ctx.items('items')` from `build` | Image, link, and text: `[img{src,alt}, " ", a{href}["Junior program"], " Ages 10 to 16. ", em[...]]`. Image only: `[img]`, with no figure wrap. Link first: `[a, " Second Tuesday..."]`. Strong first: `[strong["Where we ski"], " Kincaid Park chalet. ", a]`. Plain: `[" Plain text only, no title."]`. `columns="7"` reaches `ctx.attr('columns')` as `"7"`, so render does not validate a select value. An empty block (`:::cards{columns="3"}\n:::`) calls `build` with `items: []`. |
| M5 | Heading collection | `src/lib/render/collect-headings.ts:25-30`; `pipeline.ts:153` (`rehypeSlug` after `rehypeDispatch`) | `collectHeadings` gathers every `h1` to `h6` after `rehypeSlug` stamps ids. A heading in a card would join a site's outline, and its slug could take a real heading's id and push that heading to `-1`. The callout titles with `p.callout-title` (`examples/showcase/src/chassis/directives/vocabulary.ts:63`). |
| M6 | The `directive-styled` rule | `scripts/theme/check-rules.mjs` (`hasClass` matches `\.cls(?![\w-])`); it reads `examples/showcase/src/chassis/directives/classes.json` and the chassis, engine public, and theme sheets | A `cards` entry in `classes.json` needs a selector with a bare `.cards` in a loaded sheet. `.cards-item` alone does not count. `git grep -nP "\.cards(?![\w-])" -- '*.css'` returns nothing today, so the negative case of acceptance 3 can fail. |
| M7 | Theme check tests | `node --test --test-force-exit scripts/theme/check.test.mjs` at base | 33 pass, 0 fail. `check.test.mjs:55` "waymark passes every rule but render"; `:64` asserts `result.notes.length` equals the vocabulary's size, today 9. |
| M8 | Conformance rules per directive | `scripts/theme/conformance.test.mjs:167-178`; `DIRECTIVES` from `classes.json` | Each directive must appear empty (`inner.trim() === ''`), long (`inner.length + head.length >= 400`), and nested (`depth >= 1`), and on `scripts/theme/conformance/src/content/pages/directives.md`. Local images there: `/images/conformance-{square,tall,wide}.svg`. The manifest regenerates with `npm run package` then `node scripts/theme/conformance/manifest.mjs`. |
| M9 | Starter content | `scripts/build/starter-overlay.test.mjs:127-136` | Each registry directive appears exactly once across the overlay content. The overlay ships one image, `static/images/starter-cairn.svg`. `.cairn/index.json` entries carry a `links` array, which Task 5 checks after its edit. |
| M10 | Public skill check | `scripts/checks/check-public-skill.mjs` (`npm run check:public-skill`, which packages first) | A page per registry directive under `skills/cairn-styling-public-pages/references/directive-<name>.md`, listed in that folder's `README.md`, with snippet classes that exist. |
| M11 | Template emit | `npm run emit:template`, `npm run check:template` (`scripts/build/emit-template-dir.mjs`) | `templates/waymark/` is generated from the showcase, the starter overlay, and `skills/`. A skills edit fails `src/tests/unit/guidance/bin.test.ts` until the emit runs; `templates/waymark/.claude/cairn/MANIFEST` lists the skill files. |
| M12 | Vocabulary order and groups | `examples/showcase/src/chassis/directives/vocabulary.ts` | Export order callout, alert, icon, video, pull-quote, cta, micro-cta, faq, banner. Groups Callouts, Notices, Media, Quotes, Actions, Structure (faq). |
| M13 | Picker icon | `src/lib/admin/ComponentInsertDialog.svelte:455` `{#if def.icon && icons?.[def.icon]}` | A def with no `icon` renders its picker row with no glyph. Waymark's icon set holds snowflake, leaf, callout, alert, flag, play, quote, arrow-right, and chevron-down, and `themes/` is off-limits. |
| M14 | daisyUI class names | `examples/showcase/src/chassis/tokens.css:60` loads daisyUI unprefixed | `card`, `card-body`, and `card-title` are live daisyUI component classes, so the block uses `cards` and `cards-*` only. `.cairn-card` already exists in the admin. |
| M15 | Styleguide | `examples/showcase/src/routes/(site)/styleguide/+page.server.ts` | Renders `SAMPLE` plus one `previewMarkdown(def)` per registry block. Its existing remote image is `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80` (`:75`). |
| M16 | E2E patterns | `examples/showcase/e2e/styleguide.spec.ts:20-37` (per-test `page.emulateMedia({ colorScheme })`); `e2e/admin-visual.spec.ts:9` (`WIDTH_BAR = [320, 390, 768, 1440, 2560]`); `e2e/golden-path.spec.ts:480` (callout round trip) | Golden path: Insert block, pick `[data-testid="cairn-pk-row"]`, Insert, click the opener line, Edit block, Update, assert on `.cm-content`; the hidden body is `input[name="body"]`. `EditPage.svelte:1008` `editBlock` parses the block at the caret and reopens the insert dialog with its values. |
| M17 | Baseline regeneration | `.github/workflows/e2e.yml` `workflow_dispatch` input `update_snapshots`; `gh api .../e2e.yml/runs?event=workflow_dispatch` | Last eight dispatches all `success`, triggering actor `glw907`, 2026-11-02. The bot commits "chore(e2e): regenerate..." to the dispatched branch. |
| M18 | Generated guidance hashes | `scripts/build/build-guidance-hashes.mjs:2-8` | Rebuilt from shipping tags only, so this pass leaves `guidance-hashes.json` alone. |

## Recorded searches

| Search | Hits |
| --- | --- |
| Acceptance 4 regex at base, over the item's paths | 7: `examples/showcase/src/chassis/README.md:37,38`, `examples/showcase/src/chassis/directives/compose.test.ts:40`, the three template mirrors, and `docs/internal/plans/2026-11-14-tui-language-1-style-plan.md:376` (another round's plan, about terminal blocks; see Decision 10) |
| `\bnine\b` over `skills/`, the showcase chassis, `scripts/theme`, `scripts/build`, `docs/editors`, `docs/admin` | Change: `components-and-islands.md:19`, `theme-directory.md:98`, `compose.ts:17`, `vocabulary.ts:393`, `compose.test.ts:88`, plus the acceptance 4 hits. Dismiss: `skills/cairn-building-admin-screens/references/admin-mount.md:179` (janitorial actions), `chassis/README.md:257` (importers). `MIGRATION-NOTES.md:121` describes a past version's move and stays as written. |
| `micro-cta` (one block's name), unfiltered, outside plans and specs | 18 files: showcase chassis `classes.json`, `compose.test.ts`, `vocabulary.ts`, `prose.css`; `guidance-hashes.json` (M18); the starter post; the conformance `directives.md`; the public skill's `README.md` and `directive-micro-cta.md`; `src/tests/unit/check-public-skill.test.ts` (a fixture list, not the registry; dismissed); and the template mirrors. Every non-dismissed file is a Task 1 or Task 5 site. |
| `site-facts.json` | 4 copies; none lists blocks (`{"version":1,"mediaBucketBinding":...}`). Dismissed. |
| `.cards` selector in any CSS | None (M6). |
| Render baselines under `themes/` | `themes/waymark/screenshots/*.png` (3), catalog screenshots of the home page, not a test baseline. Untouched. |

## Scope

Files (the design's row): `templates/waymark/src/chassis/**`, `examples/showcase/src/chassis/**`,
`examples/showcase/src/routes/(site)/styleguide/`, `examples/showcase/e2e/**`,
`scripts/theme/conformance/**`, `scripts/build/starter-overlay/**`,
`skills/cairn-styling-public-pages/**`, `skills/cairn-extending-a-site/**`,
`templates/waymark/.claude/**`, `docs/**`, `MIGRATION-NOTES.md`, `CHANGELOG.md`,
`docs/internal/engine-rulings.md`.

Added by this plan, each flagged under "Planning misses":

- `scripts/theme/check.test.mjs`, one assertion (`:64`, the note count).
- `templates/waymark/src/content/**`, written only by `npm run emit:template` from the starter
  overlay.
- `examples/showcase/e2e/*-snapshots/**`, written only by the CI regeneration bot.
- `BACKLOG.md`, written only by `standards:log-issue` (T1 step 4, standing answer 9).
- This plan and its executor prompt, deleted at Close (`cairn-running-passes` SKILL.md:10).

Never touched: `themes/**`, `src/lib/**`, `tool/**`, `docs/STATUS.md`, `.github/**`,
`scripts/release/**`, `.claude/settings*`, `templates/catalog.json`, `guidance-hashes.json`. The
pass never runs `make -C tool check`. A task that needs a held or untouched path parks the pass.

## Decisions made at planning

1. **Item shape.** One line of markdown per item: an optional leading image, then an optional
   title, then text. The title is a leading link (a linked title) or, failing that, a leading
   `**strong**` run (a plain title). Text-only items have no title. Later links stay in the text.
   The design names the link as the title and says where-and-when items carry no link; it names
   no title source for them. The strong-run title fills that gap (`[design-gap]`).
2. **Markup.** `div.cards.cards-cols-N` holds one `div.cards-item` per item. An item holds an
   optional `img.cards-image` and a `div.cards-body`, which holds an optional `p.cards-title` (its
   child is the `a`, or the strong run's children as plain content) and an optional
   `p.cards-text`. Leading whitespace is trimmed from the text. No element renders for an absent
   part, so an imageless card starts with its title and shows no empty box.
3. **Title element is a `p`, not a heading** (M5). It follows `p.callout-title` and keeps card
   titles out of a site's outline and its slug space. The mockup's `h3` size is kept in CSS.
4. **Columns.** `N` is the `columns` value when it is `2`, `3`, or `4`, and `3` otherwise,
   clamped in `build` (M4: render does not validate a select). The modifier is a class, as the
   callout's tone is.
5. **Fields.** `columns: fields.select({ label: 'Columns', options: ['2', '3', '4'] })`, not
   required. Slot `{ name: 'items', label: 'Cards', kind: 'repeatable', itemFields: { text:
   fields.text({ label: 'Card' }) } }` with help text that gives the item shape. `fields.text`,
   since an item is one line.
6. **Placement.** The block is the tenth export of `vocabulary.ts`, after `banner`, in the
   Structure group, with no `icon` (M13). The picker row shows no glyph, flagged for
   `## Decisions`.
7. **Preview.** The registry preview is the four-item, `columns="4"` block of acceptance 1, text
   and links only. The preview ships in every site's insert dialog, so it loads nothing from
   another host. The three-item, `columns="3"` block goes into the styleguide's `SAMPLE`: one
   image and linked title (one-param image URL `?w=720`, no `&`), one linked title, one plain
   text. `SAMPLE` already loads an Unsplash image (M15), so the styleguide gains no new host.
   (Plan review finding 13; a method call, not an owner fork.)
8. **CSS.** In `examples/showcase/src/chassis/prose.css` only, inside its `@layer components`, near
   the callout section. Mobile first: one column, then `repeat(N, minmax(0, 1fr))` from
   `min-width: 40rem`. The default look follows the mockup (`varsity-3.html`) in the public
   theme's tokens: gap about 22px; a card on the base surface with a 1px border, the box radius,
   `overflow: hidden`, and a flex column; a 3/2 image with `object-fit: cover`; body padding 16px
   18px 18px; the title near 1.4rem; muted text. `.prose .cards:empty { margin: 0; }` follows
   `.callout-points:empty`. The template copy comes from the emit, never by hand.
9. **Lists stay `div`s.** The chassis `prose.css` styles `.prose ul` and a flourish
   `ul > li::before`, which a card list would inherit, so the grid is `div`-based.
10. **Acceptance 4's `docs/` path** reaches `docs/internal/plans/2026-11-14-tui-language-1-style-plan.md:376`,
    a live round's plan about terminal blocks, which this pass must not edit. The amended check is
    in `## Acceptance` (advisor.md "Acceptance items").
11. **Rulings.** Two entries in `docs/internal/engine-rulings.md`, by the pass instructions: the
    card block (kept by Geoff over the triage's decline) and page as home (accepted, reshaped).
    Wording refers to "the block list" without a count.

## Standing answers

From the round design and `round-run.md`. A stop with none parks the pass.

1. (Design 1) A repeatable item can't carry an image and a link as designed. Take the nearest form
   that keeps one block and the insert form, flag it, go on. Task 1's probe tests it first.
2. (round-run 1) Retry up to twice the approved path minutes (220) while each retry fixes a
   traced cause.
3. (round-run 2) An auto-mode refusal: use the named alternative in "Auto-mode routes" once; after
   a second refusal, flag the task and go on.
4. (round-run 3) A needed setting change goes into the close packet's commands, never into a task.
5. (round-run 8) A plan step that can't go as written takes the advisor's choice, flagged.
6. (round-run 12) An acceptance item that can't be met as written is amended per `advisor.md`
   "Acceptance items" and flagged. No item is dropped.
7. (Design 5) A 403 from any service: never widen a token, never try another credential; park
   with the request, the response, and the token's name.
8. (Design 9) The grader fails a render after two fix rounds: the packet shows the failing render
   and asks.
9. Cleanup found on the way that is not in this plan: file it through `standards:log-issue` and
   list it in the PR. Never do it.

Run rules the lens requires:

- Each accepted task's report names the CI verdict on that head, or says CI has not run on it.
- After the whole-branch review, a Low finding from a delta read is folded once, checked by the
  session's own diff read and CI, or filed through `standards:log-issue`. It never starts another
  review round.
- If an acceptance item becomes unreachable mid-run, every other item still runs; the pass
  closes, the PR reports that item unmet with its cause, and the packet says so first.

## Tasks

Every task goes to `cairn-implementer` in its own worktree off the pass branch (Sonnet, `medium`;
Task 1 at Opus, `medium`, because its `build` carries the item rule). Each implementer loads
`cairn-writing-engine-code` and `standards:ts-conventions` for TypeScript, and
`cairn-following-public-design` plus `standards:daisyui` before any CSS. Code comments follow
TSDoc; the em dash is banned in them.

After each task commits, from the pass worktree:

```sh
npm run lane:fast -- --range 4ebfb0e9e..HEAD
```

A task's local e2e runs only its own spec, from the pass worktree:
`npm --prefix examples/showcase run test:e2e -- e2e/<spec>.ts`. The site-visual styleguide
baselines fail locally from T2 on, because the block changes that page and CI owns the
baselines (durable gotchas, "CI-canonical baselines"). That failure is expected until T7. In this
worktree the showcase's `@glw907/cairn-cms` resolves to the worktree root, and the pass changes
no engine code anyway.

Path: T1 → T2 → (T3 beside T4) → (T5 beside T6) → T7. 25 + 20 + 25 + 25 + 25 = 120 minutes on the
path; the sum of all tasks is 160.

### T1. The block, probed first (25 min, Opus)

1. Probe, in a test that stays: in `examples/showcase/src/chassis/directives/` add the `cards` def
   (Decisions 1 to 7) and a unit test beside `compose.test.ts` that, for the preview block and for
   the acceptance 2 fixture (two items: `![A trail map](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=720)
   [Junior program](/programs/junior) Ages 10 to 16.` and `[Map night](/map-night) Second
   Tuesday.`), asserts `serializeComponent(parseComponent(md))` equals `md` and
   `componentRoundTripSafety` is safe. The showcase has no static image, and M1 proved this URL.
   If the probe fails, standing answer 1 applies before anything else is built.
2. `build`: the item rule and the columns clamp. Unit tests, one per failure row in the design's
   "How it fails": no image among imaged cards, no link (plain-title and no-title items), one item,
   nine items, `columns` absent and `columns="7"` (both give `cards-cols-3`), and an empty block
   (a `div.cards` with no children).
3. Add `"cards": "cards"` to `classes.json`. `compose.ts:31` derives the blocks from
   `Object.keys(vocabulary)`, so it gets no registration line. Update `compose.test.ts:40` and
   `:88` (names and order, ten entries). Reword `compose.ts:17` and
   `vocabulary.ts:393` to say "the vocabulary's blocks" without a count, and the two rows of
   `examples/showcase/src/chassis/README.md:37-38` the same way.
4. File one `standards:log-issue` item for M3 (the `&`, `*`, and bracket normalization in
   `readListItems`), tagged `#initiative:theme-garden`.

Done when the new tests pass and `npm run lane:fast` is green. Acceptance: 2 (grammar side), 4
(chassis hits).

### T2. The grid and its default look (20 min)

1. Load `cairn-following-public-design` and `standards:daisyui`. Write the `cards` rules in
   `examples/showcase/src/chassis/prose.css` (Decision 8). The selector list includes a bare
   `.prose .cards` rule (M6).
2. Update `scripts/theme/check.test.mjs:64` from 9 to 10 notes.
3. Acceptance 3's failing half, in the implementer's worktree after its task commit:
   `git switch --detach`, delete the `cards` rules, commit, run `npm run test:theme` bare (about
   six minutes on pavilion), and save the output lines that name `directive-styled` and Waymark.
   Then `git switch -` to return to the task branch. Never `git reset --hard`. The implementer's
   report gives the executor the throwaway commit id and the saved lines, and the executor puts
   both in the PR. The passing half is CI's test job on the pass head, which runs
   `npm run test:theme` (`test.yml:130`).

Acceptance: 3.

### T3. The styleguide and its e2e (25 min, beside T4)

1. Add the three-item `columns="3"` block to `SAMPLE` in
   `examples/showcase/src/routes/(site)/styleguide/+page.server.ts` (Decision 7). Update
   `load.test.ts` if it counts blocks.
2. Add `examples/showcase/e2e/cards.spec.ts`. For each width in `[320, 390, 768, 1440, 2560]` and
   each color scheme (`page.emulateMedia({ colorScheme })`, as `styleguide.spec.ts` does), load
   `/styleguide` and assert: `document.documentElement.scrollWidth <= window.innerWidth`; every
   `img` in a `.cards` block has a non-empty `src`; the page has two `.cards` blocks, one with
   three items and one with four. Count columns as the number of distinct `offsetLeft` values of a
   block's `.cards-item`s, so the count does not depend on how the grid is written: at 1440 the
   first block has 3 and the second 4; at 320 both have 1.
3. Run `npm --prefix examples/showcase run test:e2e -- e2e/cards.spec.ts e2e/styleguide.spec.ts`
   and confirm the two styleguide axe tests still pass in both schemes.

Acceptance: 1.

### T4. The admin round trip (20 min, beside T3)

Add `examples/showcase/e2e/cards-admin.spec.ts` on the model at `golden-path.spec.ts:480`:

1. Create a fresh post, never the shared `/admin/posts/2026-06-hello` that other specs overwrite:
   the `openCreateDialog`, `fillTitleWhenHydrated`, navbar Save, `toHaveURL(/saved=1/)` pattern
   from the golden path.
2. Insert block and pick the `cards` row. The form seeds from `previewValues(def)`
   (`src/lib/admin/ComponentForm.svelte:55`), so it opens with the preview's four items and
   `columns` 4. Press `Remove item` until two remain, fill `Cards 1` and `Cards 2` with the T1
   fixture strings (find the aria-label and button names in `ComponentForm.svelte` before
   writing the locators), set the `Columns` select, and Insert.
3. Read `input[name="body"]`. Click the opener line, Edit block, Update with no change, and
   assert the hidden body is byte-identical to the first read.
4. Save, reload the post, and assert the saved body is byte-identical too.

The fixture holds no `&`, no bare `*`, and no brackets inside link text (M3). Run
`npm --prefix examples/showcase run test:e2e -- e2e/cards-admin.spec.ts`.

Acceptance: 2.

### T5. Content, the packaged skills, and the emit (25 min, beside T6)

1. `scripts/theme/conformance/src/content/pages/directives.md`: a `## Cards` section before
   `## Fragments`, in the page's form, with an empty block, a long block (inner plus head of 400
   characters or more, three items, one with `/images/conformance-wide.svg`), and a block nested
   in a callout with a five-colon outer fence (M2, M8). Regenerate the manifest:
   `npm run package`, then `node scripts/theme/conformance/manifest.mjs`.
2. The starter post `scripts/build/starter-overlay/src/content/posts/2026-11-01-every-element-on-this-site.md`:
   one `cards` block of two or three items, text and links only, with links to pages the starter
   has. After the edit, check that `.cairn/index.json`'s `links` for that entry still match
   (`node --test scripts/build/starter-overlay.test.mjs`); regenerate it the way the test's
   failure names if it does not.
3. `skills/cairn-styling-public-pages/references/directive-cards.md`, on the model of
   `directive-micro-cta.md`: the markup of Decision 2, the classes, and a snippet whose classes
   exist. Add its row to that folder's `README.md`.
4. Reword `skills/cairn-extending-a-site/references/components-and-islands.md:19` and
   `skills/cairn-styling-public-pages/references/theme-directory.md:98` to drop the count.
5. `npm run emit:template`, commit the generated tree, then `npm run check:template` and
   `npm run check:public-skill`.

Acceptance: 4 (skills and template hits).

### T6. Editor docs, the records, and the rulings (25 min, beside T5)

1. Load `cairn-writing-docs` and `writing-voice` (Microsoft, for `docs/editors/`). In
   `docs/editors/write-in-the-editor.md`, under "## Add blocks and fragments" (line 149), add a
   section on adding cards: the block is named `cards`, `columns` takes 2, 3, or 4 (3 when left
   empty), each card is one line with an optional picture, a link that becomes its title, and
   text. Phrase it as a block a site has, since a site may not carry it.
2. Dispatch `docs-fact-checker` on the changed lines; fold to no finding. Run
   `npm run check:docs-gate`.
3. `CHANGELOG.md` under `## Unreleased`: one bullet for the block, with a "Consumers must:" line
   (a site that re-emits its chassis gets the block; a theme owes nothing because the chassis
   styles it). Keep `<!-- release-size: minor -->`.
4. `MIGRATION-NOTES.md` under `## Unreleased` (line 85): the block list grows by one, contract 1
   keeps its number, and a theme can style `.cards` further.
5. `docs/internal/engine-rulings.md`, two entries after `scope-verdict-setup-token` (line 540), in
   the ledger's form (`## slug: title (verdict, date, source)`, then **Verdict:**, **Shape:**,
   **Reopens on:**):
   - `scope-verdict-cards`: kept by Geoff, 2026-11-15, packet `20261115-041501-ead5c5`, over the
     triage's decline that rested on `scope-verdict-361`. Shape: one `cards` block with a
     repeatable list of one-line items and `columns`, laid out and styled by the chassis so no
     theme owes a rule. Reopens on: a theme round asking for another block.
   - `scope-verdict-page-home`: accepted, reshaped, 2026-11-14 triage, approved 2026-11-15. Shape:
     the page with id `home` serves `/`, the route is site-owned, `src/lib/` does not change, the
     archive serves page one, the newest three posts join the home, and `home` is not served again
     at `/home`. Reopens on: a need the template route can't meet without engine code.

Acceptance: 5, every pass item 2.

### T7. Baselines, then close (20 min)

1. After the last commit that changes a rendered page, dispatch once:
   `gh workflow run e2e.yml --repo glw907/cairn-cms --ref pennant-1 -f update_snapshots=true`. Wait
   for the bot's "chore(e2e): regenerate..." commit, then `git pull --ff-only` before any further
   push. Read every changed baseline. Only the ten site-visual
   `styleguide-{light,dark}-{320,390,768,1440,2560}-linux.png` files may change; any other changed
   baseline is a finding. A refusal takes the "Auto-mode routes" alternative.
2. The bot's commit gets no CI, because a push made with `GITHUB_TOKEN` starts no workflow run.
   The Close steps end with a human commit on top of it, and that head is the one CI must pass.
3. The steps under "Close".

## Acceptance

Copied verbatim from the design, each mapped to its task and its evidence.

1. The showcase's `/styleguide` page shows two `cards` blocks. One has three items with `columns="3"`: one item with an image and a linked title, one with a linked title only, one with plain text only. The other has four items with `columns="4"`. An end-to-end test reads the page at 320, 390, 768, 1440, and 2560 pixels, light and dark, and asserts no horizontal scroll, no `img` without a `src`, three columns at 1440 for the first block and four for the second, and one column at 320.
   - T1 (preview), T3. Evidence: `cards.spec.ts` in CI's e2e job, and its local run's pass lines in the PR.
2. In the admin, the insert form adds a `cards` block with two items, one holding an image and a link. Editing that block and saving leaves the markdown byte-identical. A test asserts it.
   - T1 (grammar test), T4. Evidence: the e2e test's name and pass line in CI.
3. With the `cards` rules removed from the chassis `prose.css`, `npm run test:theme` fails on `directive-styled` for Waymark. With them present it passes, and `git diff --stat` shows no file under `themes/`.
   - T2. Evidence: the detached commit id and its failing `npm run test:theme` lines, CI's test job (which runs `npm run test:theme`) passing on the final head, and `git diff --stat main...HEAD -- themes/` printing nothing.
4. `git grep -n -i -E "nine (blocks|directives)|9 (blocks|directives)"` over `templates/`, `examples/showcase/`, `skills/`, `scripts/`, `docs/`, `src/lib/`, and `MIGRATION-NOTES.md` returns nothing.
   - T1, T5. Amended check (advisor.md "Acceptance items", Decision 10): the same command with the pathspec `':!docs/internal/plans/2026-11-14-tui-language-1-style-plan.md'` added returns nothing. The excluded file is round `tui-language`'s pass 1 plan; its line 376 counts the Go tool's terminal blocks, not the directive vocabulary, and this pass may not edit it. The outcome (no stale count of the block list) holds. Evidence: the amended command and its empty output, and the unamended output showing only that line.
5. `docs/editors/` gains a section on adding a card that names the `cards` block and its `columns` values, the fact-checker returns no finding on it, and `npm run check:docs-gate` passes.
   - T6. Evidence: the section's heading, the fact-checker's empty findings, and the gate's pass line.
6. Every pass: the pull request shows evidence for each item.
   - Close. Evidence: the PR body's acceptance section.
7. Every pass: everything written for a person follows `~/.claude/docs/voice/written-for-people.md` or the repo's docs rules.
   - T5, T6, Close. Evidence: Vale over `docs/**` in the docs gate, the fact-checker, and the PR body's opening paragraph.

Added checks:

- Closing review reads Waymark's cards at the five widths, light and dark (the pass
  instructions): a fresh `standards:visual-verifier` grades the styleguide's two blocks from
  full-page screenshots at 320, 390, 768, 1440, and 2560, both schemes, against the mockup's card
  (`varsity-3.html`).
- `git diff --stat main...HEAD -- src/lib tool themes` prints nothing.
- `npm run check:template` and `npm run check:public-skill` pass.
- `node --test scripts/theme/conformance.test.mjs scripts/build/starter-overlay.test.mjs` passes.

## Close

1. Whole-branch `standards:diff-reviewer` against this plan and the design, and in the same round
   `standards:daisyui-a11y-reviewer` on the `prose.css` rules and the styleguide sample
   (`cairn-running-passes` "Review checklists by path"). Fold their findings first.
2. Fresh `standards:visual-verifier` on the styleguide screenshots (Added checks). The grader
   never built the work.
3. The targeted gate, run bare from the pass worktree:
   `cairn-run-gate "$(node scripts/checks/gate-tier.mjs --range 4ebfb0e9e..HEAD --class ordinary)"`.
4. Push; the first push opens the draft PR against `main`, with a `Round: pennant` line.
5. T7's regeneration, then `git pull --ff-only`.
6. One commit deleting this plan and its executor prompt (`git rm` of the two files), pushed on
   top of the bot's commit. Run `ci-green <that sha> --pr <n> --wait` as a background task from
   the pass worktree. The land test needs a green CI verdict on this human head, never on the
   bot's.
7. The PR body opens with a paragraph written per `~/.claude/docs/voice/written-for-people.md`,
   then what landed, the acceptance evidence, every log-issue filing, `## Decisions` (Decisions 1,
   3, 6, and 7 at least), `## Planning misses`, and the score.
8. Land through `approval-queue land <owner/repo#n> "<claim>"` once the land test in
   `round-run.md` holds; otherwise send the packet through `approval-packet`.

## Planning misses

- `[file-list]` The design's row omits `scripts/theme/check.test.mjs`, whose line 64 asserts the
  note count; the plan adds it for one assertion.
- `[file-list]` The design's row omits `templates/waymark/src/content/**`, which the emit writes
  from the starter overlay; the plan adds it as emit output only.
- `[file-list]` The design's row omits the e2e snapshot folders, which the CI bot rewrites.
- `[design-gap]` The design names no title source for a where-and-when card, which carries no
  link; the plan reads a leading `**strong**` run as a plain title (Decision 1).
- `[conflict]` Acceptance 4's `docs/` path reaches another live round's plan; amended check per
  Decision 10.
- `[stale-fact]` The design's mockup titles a card with an `h3`; the plan uses a `p` (Decision 3,
  M5).
- `[file-list]` The design's pass 1 row omits `BACKLOG.md`, which `standards:log-issue` writes;
  its pass 3 and 4 rows carry it.

## Plan review fold

One `standards:plan-reviewer` read (Opus, `medium`) at `2f276b4b3` returned 2 blockers, 4 majors,
and 7 minors. All are folded:

1. Blocker: `git switch pennant-1` fails in an implementer worktree, since the pass worktree holds
   that branch. T2 now uses `git switch -` and names who records the commit id.
2. Blocker: the regeneration bot's commit gets no CI. Close step 6 pushes a human commit on top
   and runs `ci-green` on it.
3. `BACKLOG.md` added to the file list and to "Planning misses".
4. `standards:daisyui-a11y-reviewer` added to Close step 1.
5. T2 ran `npm run test:theme` twice (about six minutes each). The failing half stays local with
   the verbatim command; the passing half is CI's test job. T2 is now 20 minutes, the path 120.
6. Close step 6 deletes the plan and the prompt.
7. T7 names the ten styleguide baselines that may change.
8. Close step 3 writes the gate command out in full.
9. Each task's local e2e runs only its own spec, and the styleguide baseline failure is named as
   expected.
10. T4 now creates a fresh post, trims the seeded items to two, and reloads before the last
    assertion.
11. T1 step 3 no longer asks for a registration line in `compose.ts`.
12. The engine-resolution line now says the worktree install resolves to the worktree.
13. The preview no longer hot-links an image; Decision 7 swaps the two blocks.
