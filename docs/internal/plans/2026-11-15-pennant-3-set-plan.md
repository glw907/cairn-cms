# Pennant pass 3: the organization set

Initiative: theme-garden
Round: pennant
Pass: 3 set

The design is `~/Projects/initiatives/theme-garden/specs/2026-11-14-pennant-design.md`, approved
by Geoff through packet `20261115-041501-ead5c5`. Packet `20261115-182911-58b350` added the contact
page with no form. The pass runs in worktree `.claude/worktrees/pennant-3` on branch `pennant-3`,
based on `91b3738a3` (the head of `pennant-2`). The PR base is `main`. Until PRs #251 and #253
merge, the PR's diff also shows passes 1 and 2; the review range is `91b3738a3..HEAD`. Class
`ordinary`, `live-account`. The conductor is `conductor-pennant`. The design's path is 120 minutes,
and this plan's is 230 (T0 25, group 1 75, T2 30, T3 50, Close 50; sum of all minutes 315). The
pass parks at 240, so the path sits just under the line; the plan launches and flags it.

Outcome: `sets/organization/`, written from the society sheet as the Turnagain Geographic
Society's member site. The publish job picks a theme's set by the theme's first kind, builds each
demo with the demo's own origin, and the reference check proves each demo in turn on the one
proving Worker. Merging publishes the organization set 1.0.0, a permanent release, and the PR
lands on review as the design's "Rulings" say.

## Pre-flight

- **Owner steps.** None. The proving bucket, the proving Worker `cairn-demo-proving`, and their
  tokens exist from the catalog round. No proving Worker is added.
- **Permissions checked.** The denials log (`~/.local/state/claude-denials.jsonl`, 2026-11-01 to
  2026-11-15, 71 rows) was read by class. The routes below avoid every class the pass could
  meet. The pass deploys nothing by hand: the PR's `catalog` run deploys to the proving target
  from CI.
- **Reviewed.** One `standards:plan-reviewer` read (Opus, `medium`), folded below. The class is
  `ordinary`, which needs none, but the pass changes the publish job of a permanent release.
- **Evidence.** Probes ran in a scratch copy at `91b3738a3` with dependencies installed (M1 to
  M12).

### Auto-mode routes

| Refused class seen in the log | Route the pass takes |
| --- | --- |
| Interfere With Workloads | Never `kill`, `pkill`, or `claude stop`. A background command stops with `TaskStop`. Tests start no server they don't close through their own handle. |
| Classifier unavailable | Retry the same call once, then park with the call. |
| Self-Modification, Security Weaken, Safety Bypass Flag | No edit to `.claude/settings*`, hooks, or agent files. Never `--no-verify`. |
| Destructive or Unwanted, Git Destructive, Irreversible Local Destruction | No `git reset --hard`, no `git checkout -- .`, no `rm -rf` outside a path the task created under `$TMPDIR` or the job's `tmp`. |
| Merge Without Review | The executor never merges. Under the conductor it ends at PR-ready. |
| Production Deploy, Create Public Surface, Out-of-Place Publication | No `wrangler deploy` and no R2 write from the workstation. The PR's `catalog` run uses the proving target only, and the workflow is never dispatched by hand. |
| Secret-Store Writes, DNS/Domain/Cert Changes | None needed. On a 403, standing answer 5. |
| Code from External | Downloaded maps go in their own empty directory under the job's `tmp`. Nothing downloaded is executed or imported. |
| PII Data Handling | The set names no real person and no person at all (decision 6). |

## Mechanism table

| # | Probe or source | Result |
| --- | --- | --- |
| M1 | `buildDemo` at `scripts/catalog/demo.mjs:124-160`, run over Waymark and the starter overlay | Built in 24 s. `showcase.test` appears in `index.html` (canonical, `og:url`), `feed.xml`, `feed.json`, `sitemap.xml`, `robots.txt`, `__data.json`, and the pages. This is #483, red today. |
| M2 | `composeSite`, `scripts/theme/viewer/site.mjs:135` (outside the row) | Copies only each content dir's `src/content` (skipping `.cairn`) and `static`, regenerates the manifest, and builds `admin.css`. It never copies a set's `src/site/site.config.yaml`, so `demo.mjs` lays that file itself after `composeSite` and before `removeAdminMenus`. `src/lib/vite` doesn't read `site.config.yaml`, so the overwrite doesn't stale the manifest. |
| M3 | Set-only scratch build (`contentDirs: [set]`, the set's config copied, the origin replaced in `cairn.config.ts`, then `writeMarker`, `removeAdminMenus`, `buildSite`) | Passed with no starter overlay. Output holds `archive/1`, the `home` page with `_redirects` `/home / 308`, the contact page, and the posts. Canonical, `og:url`, the `robots.txt` Sitemap line, the sitemap, and the feed carry the new origin. |
| M4 | The same build, grepped whole | One `showcase.test` remains, in an `_app/immutable` chunk: `email:{from:'cms@showcase.test'}`. It is the admin's sender, never rendered. The acceptance 4 test checks the five named files, not the whole tree. |
| M5 | `examples/showcase/src/site/cairn.config.ts:37` | `export const publicOrigin = 'https://showcase.test';` is the one place the origin is written. `buildDemo` replaces that literal in the composed copy and fails if it is absent. |
| M6 | The same build's titles | The feed `<title>` was "Waymark" and the index title "The Turnagain Geographic Society · Waymark": the config's `siteName` stays the literal the installer overwrites. Decision 2 fills it for the demo. |
| M7 | `examples/showcase/vite.config.ts:23-50` | `prerender.handleHttpError` throws on any non-2xx the crawl meets; `handleUnseenRoutes` allows only `/(site)/archive/[page]`. Waymark doesn't render `actions`, so an `actions` link to a missing page passed in M3, but pass 4's Pennant will render it. Every link in the set must name a page the set holds. SvelteKit's default `handleMissingId` fails on a `#anchor` with no target, so the set uses no anchors. |
| M8 | `archive.mjs` and `schema/cairn-set-1.schema.json` | `SITE_NAME_LITERAL = 'siteName: Waymark'` must appear in the set's config. `buildSetArchive` takes the whole set directory under root `set/`. Image limit 400 KB, archive 8 MiB. The manifest's `images[]` items are `path`, `source`, `license`, with `additionalProperties: false`; the license pattern admits `Public Domain`. The schema is outside the row, so no field is added. |
| M9 | `publish.mjs:283-312` | Sets are archived with `buildSetArchive(dir)`. Each theme's demo is built with `buildDemo({ root: REPO, themeDir, out, worker })`: `REPO`, not the run's `root`, and no content or origin. The demo address is `new URL('/', DEMO_ORIGIN.replaceAll('{id}', id)).href`. |
| M10 | `reference-check.mjs:106-131` `checkAddresses` | Fetches every theme's `theme.demo` and requires its markers to equal `id@newest`. On the proving target every theme shares one address, so every theme but the last deployed fails (#486). `runReferenceCheck` takes an injected `fetch` (line 330). Its browser half allows only the page, the catalog URL, data URLs, and images, and reads the catalog cross-origin, so a test serves the fake bucket over 127.0.0.1 with CORS as `reference-check.test.mjs`'s `serveFixtures` does. |
| M11 | `index.mjs:96-118` `buildIndex` | Keeps the previous theme order and appends new ids. CI's PR run uses `--reset`, so catalog order equals deploy order on the proving target. |
| M12 | `scripts/checks/gate-tier.mjs` | `sets/` is in the showcase lane, `scripts/catalog/` is `scriptsTestOnly`. `toolInputs` holds `schema/` and the showcase's `site.config.yaml`, not `sets/`, so the range from `91b3738a3` prints no tool leg. Only `--class auth-data` changes the output, so the close gate takes no `--class`. |
| M13 | `package.json` | Version `0.99.0-rc.4`. Waymark's engine is `>=0.99.0-0`. Neither `sets/` nor `scripts/catalog/` ships in the npm `files`. |
| M14 | `.claude/agents/cairn-implementer.md:5`, the `standards:diff-reviewer` frontmatter | Neither has WebSearch or WebFetch. The executor's own session does every web step (T0), and the fact list carries a quoted excerpt per fact so the reviewer checks against the quote. |
| M15 | `scripts/theme/viewer/site.mjs:161`; SvelteKit's crawler (`crawl.js:219-241`) | `composeSite` copies each content dir's `static/` with no existence check, so a set with no `static/` throws `ENOENT`. The crawler follows `src` and `srcset`, so a page naming a missing image fails the build. |
| M16 | `publish.mjs:253`, `catalog.yml:13-20` and `46-51` | A demo is built only for a theme version the index doesn't list, so the live Waymark demo keeps `showcase.test` until Waymark's next release (#483 is reworded, not closed). Every push of `scripts/catalog/**` or `sets/**` fires the PR's `catalog` run, and a newer queued run drops an older one. |
| M17 | `examples/showcase/src/site/site.config.yaml:1-12`, `site.mjs:142-143` | The showcase config carries `cairn-template:exclude` blocks (`/styleguide`) and `/admin` entries. `composeSite` strips the blocks before the set's config is copied, so the set's config must carry no marker and no styleguide entry. |
| M18 | `examples/showcase/src/routes/(site)/+page.svelte:55` | The home `<title>` is `${title} · ${siteName}`, so with decision 2 the demo's home title reads "The Turnagain Geographic Society · The Turnagain Geographic Society". It is template behavior outside the row, filed through `standards:log-issue`. |
| M19 | Map sources | Not probed at planning: the USGS sheets are GeoTIFF or GeoPDF, often tens of MB. T0 records one sheet URL and its size before T5 starts; T5's 40 minutes assume one download per map. |

## Recorded searches

| Search | Hits |
| --- | --- |
| Web: "Are US Topo maps copyrighted" (usgs.gov FAQ) | US Topo and the Historical Topographic Map Collection are public domain, except commercially licensed layers named in a map's collar credit. |
| Web: Natural Earth terms of use | All Natural Earth raster and vector data is public domain; no credit is required. |
| `grep -rn "sets/" scripts/catalog/*.mjs` | Only `publish.mjs` and `version-rise.mjs` read `sets/`; nothing maps a theme kind to a set yet (#481). |
| `grep -n "showcase.test" examples/showcase/src/site/cairn.config.ts` | One line, 37. |
| `grep -n "#471" BACKLOG.md` | Already `[x]` at line 444, so its reword is moot. |

The executor's name searches (acceptance 2) are listed in the PR, not here.

## Scope

Files written:

- `sets/organization/**`: `cairn-set.json`, `src/content/pages/*.md`, `src/content/posts/*.md`,
  `src/site/site.config.yaml`, `static/images/*.webp`.
- `scripts/catalog/demo.mjs`, `scripts/catalog/demo.test.mjs`.
- `scripts/catalog/publish.mjs`, `scripts/catalog/publish.test.mjs`.
- `scripts/catalog/reference-check.mjs`, `scripts/catalog/reference-check.test.mjs`.
- `docs/internal/theme-catalog.md`, `BACKLOG.md`.

Rows added at planning: none.

Never touched: `docs/STATUS.md` (the conductor's, except a `## Stop`), `.github/**` (the
`catalog.yml` workflow above all), `scripts/release/**`, `scripts/checks/**`, `.claude/settings*`,
`schema/**`, `scripts/theme/**`, `themes/**`, `templates/**`, `examples/**`, `src/**`, `tool/**`.
`CHANGELOG.md` and `MIGRATION-NOTES.md` get no entry: no shipped behavior changes (decision 9).

## Standing answers

The twelve in `round-run.md` hold, with the design's thirteen. These bear on this pass:

- **Design 5.** A 403 from R2 or a deploy: never widen a token, never try another credential.
  Park with the request, the response, and the token's name.
- **Design 6.** An invented name matches a real one: change the name and record both searches.
- **Design 8.** The proving run goes red for a cause outside the pass's files: file it through
  `standards:log-issue` and say so in the PR.
- **Design 13.** The engine range: the set's `engine` is `>=0.99.0-rc.5` (design call 15), which
  the schema's pattern admits and which excludes `0.99.0-rc.4`.
- **Planner.** A map source is found to carry a licensed layer in its collar credit: drop that
  sheet and take another. A crop over 400 KB at 1600 px wide: lower the WebP quality, then the
  width, never under 1200 px.

## Decisions made at planning

1. `buildDemo` replaces its `contentDirs` option with two options, `set` and `origin`. `set` is
   an absolute path. With it, the content is that set alone, and `demo.mjs` copies the set's
   `src/site/site.config.yaml` over the composed copy's after `composeSite` and before
   `removeAdminMenus` (M2). Without it, the starter overlay is the content, as today. `origin`
   is required, so no demo ships with `showcase.test` again. It is written by a new exported
   `writeOrigin(siteDir, origin)` beside `writeMarker`, with its doc comment: it replaces the
   literal `'https://showcase.test'` in `src/site/cairn.config.ts` and throws naming the file
   when the literal is absent (M5). The CLI entry at the end of `demo.mjs` reads `DEMO_ORIGIN`,
   replaces `{id}` with the manifest id, takes `.origin`, and updates its usage lines
   (`demo.mjs:6` and `:166`); it gains no `--set` flag. The one-line `origin` argument at
   `publish.mjs:304` lands in T1, so no push between tasks breaks the PR's `catalog` run (M16).
   [advisor]
2. With `set`, `demo.mjs` writes the set's `home` page title as `siteName` in the copied
   config through `parseDocument` and `doc.set`, as `removeAdminMenus` edits YAML, so a title
   with a colon or a quote stays valid. It stands in for the owner's name the installer writes.
   The title is read from the `home` page's front matter with the `yaml` package `demo.mjs`
   already imports, before `composeSite` runs, and a set with no `home` page title fails naming
   the file. The set's own description stays. A per-kind constant, a schema field (outside the
   row), and leaving "Waymark" in the demo's titles were weighed and rejected. The doubled home
   `<title>` (M18) is filed through `standards:log-issue`. [advisor]
   Call: the demo shows "The Turnagain Geographic Society" where a real site shows its owner's
   name, so every demo of an organization theme reads as the society's site.
3. `publish.mjs` picks each theme's set by the first entry of its manifest's `kinds`:
   `sets/<kind>/` under the run's `root` when its `cairn-set.json` exists, otherwise the starter
   overlay (#481's lookup). It passes `root` (fixing `REPO`, M9), `set`, and
   `origin: new URL(DEMO_ORIGIN.replaceAll('{id}', id)).origin`. The set used is the one in the
   checkout, published or not, so a theme and its set can land in one PR. The run logs which
   content each demo used.
4. The reference check groups themes by `theme.demo` (#486). It still checks every card,
   screenshot, and demo address for a 200. Where several themes share one demo address, it
   compares the marker only for the last of them in catalog order, which is the last deployed
   (M11). `CheckResult` gains `notes: string[]`, one line naming each theme it skipped and the
   address, which `main` prints. On the real catalog every address is unique, so the grouping
   changes nothing there. No flag is added, so the workflow (held) needs no edit.
5. The set's pages: `home`, `programs`, `join`, `contact`, and `safeguarding` (titled
   "Safeguarding and privacy"), plus three posts dated in 2026.
   - `home`: a `description` (the tagline), an `image` (a map), a banner, an intro, a
     `cards` block of the four programs (monthly map night, summer field days, the junior
     program for ages 10 to 16, the lending shelf), a `cards` block of text cards for where,
     when, and questions, a `---` rule (pass 2's split, so the news list falls between), and
     a `cards` block of four invented supporters.
   - `primary` menu: Programs, News (`/archive/1`), Contact. `footer` menu: Safeguarding and
     privacy (`/safeguarding`), Contact (`/contact`). `actions` menu: Join the society (`/join`),
     Contact us (`/contact`).
   - Every card and menu link names a page the set holds, with no `#anchor` (M7).
   - The vocabulary holds the tags the posts use.
   - The config carries exactly these three menus, no `/admin` entry, no `/feed.xml` entry, and
     no marker comment (M17).
   [advisor]
6. The set names no person. People appear by role only (the president, the field-day lead, the
   junior program's coordinator), as the society sheet allows. The invented names are the
   society, the hall it meets in, the four supporters, and the mail domain. Supporters are
   invented local businesses, never real ones. The mail domain is `turnagain-geographic.example`,
   a reserved name that can't resolve.
7. The contact page gives the meeting place as the invented hall's name with its neighborhood
   and city, and no street number, so it can't point at a real house. It gives the meeting
   details (the second Tuesday of each month, 7 p.m.), the mail address, and no form, phone
   number, or name.
   Call: the ruling asked for "the club's address". The page gives a place without a street
   number, because any invented Anchorage street address could be someone's home.
8. Images: at least four maps, each a WebP crop at 1600 px wide or less and under
   `MAX_SET_IMAGE_BYTES` (400,000 bytes, decimal),
   from the USGS Historical Topographic Map Collection (topoView) or Natural Earth. Candidates:
   the Anchorage and Seward quadrangles for Turnagain Arm, Knik Arm, and Portage Valley, and a
   Natural Earth relief raster for south-central Alaska. Each manifest `source` names the
   collection, the sheet or dataset, its year, and its URL; each `license` is `Public Domain`.
   Each image's alt text says what the map shows.
9. No `CHANGELOG.md` or `MIGRATION-NOTES.md` entry. `sets/` and `scripts/catalog/` don't ship
   (M13), and neither file is in the row. The set's release is announced by the catalog, and its
   `notes` reads "First release.".
10. The set's `engine` is `>=0.99.0-rc.5`, the narrowest range that excludes `0.99.0-rc.4`
    and admits every later version (design call 15, standing answer 13). Its `license` is
    `CC0-1.0`, as the archive fixture's is, so an owner can rewrite and keep the text with no
    credit line. Neither design names a set text license. Each image's manifest `path` is
    `static/images/<name>.webp`, the fixture's form.
11. Acceptance 1's test lives in `publish.test.mjs`, which is in the row, and validates the
    set with an `Ajv2020({ allErrors: true })` over the same schema file, as
    `publish.test.mjs:20` already does. Acceptance 3's test lives there too,
    since it drives the publish run's `world()`. Acceptance 4's lives in `demo.test.mjs`, beside
    the real demo build.
12. The fast lane after each task is the legs
    `node scripts/checks/gate-tier.mjs --fast --range 91b3738a3..HEAD` prints, each through
    `cairn-run-gate` per `cairn-pass` "Fast lane". If a leg is `make -C tool check`, drop it and
    record that in the PR. The pass never runs `make -C tool check` and opens nothing under
    `tool/`.
13. Backlog: #486 is closed with a line naming this pass. #483 is reworded to "What is left:
    the live Waymark demo carries `showcase.test` until Waymark's next release" (M16). #481 is
    reworded to "What is left: Waymark's demo falls back to the starter overlay until
    `sets/blog/` exists." #471 is already closed, so it is left alone and the PR says so.
14. The PR's `catalog` run shares the proving target with other rounds. A run that is cancelled
    or superseded (M16) gets `gh run rerun <run-id>` once. After a green run, a read-only
    `curl -s https://demo-proving.cairn.pub/ | grep -o '<link rel="canonical"[^>]*>'` must name
    `https://demo-proving.cairn.pub`, and the PR records the line.

## Tasks

T0 runs in the executor's own session, since no implementer has web tools (M14). Then dispatch
each task to `cairn-implementer` in its own worktree off `pennant-3`, naming the model and effort
on every dispatch. Group 1 is T1, T4, and T5 side by side. Group 2 is T2 after group 1 merges.
Group 3 is T3 beside T6. Each task ends with the fast lane as decision 12 sets out. Push only at a
group's end, after its tasks merge.

### T0. Names, facts, and map sources (25 min, the executor's session, before group 1)

1. Search every invented name (decision 6) as an exact phrase, alone and with "Anchorage":
   the society, the hall, four supporters, and the mail domain. On a match, standing answer 6.
   Record name, query, date, and result for the PR's `## Name searches`.
2. Draft the set's place facts (Turnagain Arm, Knik Arm, the Chugach Mountains, the Kenai
   Peninsula, Portage Valley, the Matanuska Valley) and find a public source for each: a USGS
   map, GNIS, the NPS, the state, or a named reference. Record each fact with its URL and a
   quoted excerpt that supports it. A fact with no source is dropped.
3. Find the five map sheets (decision 8) in topoView and Natural Earth. Record each download
   URL, its format, and its size (M19), and read each USGS sheet's collar credit for a licensed
   layer.
4. Write the three lists to `$CLAUDE_JOB_DIR/tmp/pennant-3-t0.md`. They go to T4 and T5 in
   their dispatches, and into the PR at close.

### T1. `buildDemo` takes a set and an origin (30 min, Sonnet `medium`, group 1)

1. In `scripts/catalog/demo.mjs`, apply decisions 1 and 2: replace `contentDirs` with `set`, add
   `origin` and the exported `writeOrigin`, and update the CLI entry. Keep `writeMarker` and
   `removeAdminMenus` as they are. In `scripts/catalog/publish.mjs`, pass `origin` at line 304
   only (decision 1's last sentence); T2 does the rest.
2. Test `writeOrigin` directly on a temp directory holding a `src/site/cairn.config.ts`: it
   writes the origin, and it throws naming the file when the literal is absent.
3. In `scripts/catalog/demo.test.mjs`, pass `origin: 'https://demo-test.example'` to the
   existing build. In each of the five places acceptance 4 lists, assert both that the origin
   is present (the canonical `href`, `og:url`'s `content`, `feed.xml`'s link, a `sitemap.xml`
   `<loc>`, and `robots.txt`'s `Sitemap:` line each start with `https://demo-test.example`) and
   that `showcase.test` is absent.
4. Add a second `describe` that builds Waymark with `set` pointed at a fixture set the test
   writes to a temp directory: a `home` page with a title and an image, the image under
   `static/images/` (M15), one post, and a config with the literal. Assert acceptance 4 the
   same way on its output, and that `index.html`'s `<title>` holds the `home` page's title and
   never "Waymark".
5. Assert a set whose `home` page has no title fails naming the file, before `composeSite` runs.

Done when `npm run test:catalog` passes.

### T4. The set's prose and config (75 min, Opus `medium`, group 1)

Load `writing-voice` for the set's prose (audience: a club's members and neighbors reading the
public site), and read
`/var/home/glw907/Projects/initiatives/theme-garden/research/pennant-mockups/varsity-3.html` for the
home page's sections. The dispatch carries T0's names and facts; T4 uses no other name and states
no other fact about a real place.

1. Write `sets/organization/src/content/pages/{home,programs,join,contact,safeguarding}.md` and
   three posts in `src/content/posts/`, per decisions 5 to 7, in the front-matter shape the
   starter overlay's pages and posts use. Use the block syntax in
   `scripts/theme/conformance/src/content/pages/directives.md`. The image paths are the names
   T5 writes: `/images/turnagain-arm.webp`, `/images/knik-arm.webp`,
   `/images/portage-valley.webp`, `/images/chugach-front.webp`, and
   `/images/southcentral-alaska.webp`.
2. Write `sets/organization/src/site/site.config.yaml` with `siteName: Waymark` kept, a
   description, the three menus of decision 5 and nothing else in `menus`, the posts' tags in
   the vocabulary, and the showcase's `tidy` block. No marker comment (M17).
3. The safeguarding page states plainly how the junior program is run (two adults present,
   parents told the plan for each field day, photos only with consent) and how the society
   handles members' details (used only to run the society, never sold or shared, deleted on
   request). It gives no legal claim and names no law.
4. Return the final list of sentences that state a fact about a real place, each matched to its
   T0 source, in the task report.

The set builds only once T1 and T5 have merged; T2 step 4 is its crawl proof. Done when the pages
and config are committed and every link names a page the set holds.

### T5. The maps and the manifest (40 min, Sonnet `medium`, group 1)

The dispatch carries T0's sheet URLs.

1. Download the sheets into their own empty directory under the job's `tmp` with `curl`.
2. Crop each to the five names T4 uses (decision 8) with `magick` or `cwebp`, at 1600 px wide or
   less, each under 400,000 bytes.
3. Write `sets/organization/cairn-set.json`: `$schema`, `kind: organization`,
   `version: 1.0.0`, `engine` and `license` per decision 10, `notes: First release.`, and one
   `images` entry per file with `path`, `source`, and `license`.

Done when `buildSetArchive` over the absolute path of `sets/organization` succeeds in a one-line
node check (the set's pages may not exist yet in T5's worktree) and every image is under the limit.

### T2. The kind lookup and the set test (30 min, Sonnet `medium`, group 2, after group 1)

1. In `scripts/catalog/publish.mjs`, apply decision 3, and update the header comment's note on
   the demo build.
2. In `scripts/catalog/publish.test.mjs`, flip the assertion `w.demos[0].root === REPO`
   (line 323) to `w.root`. Assert the fake `buildDemo` gets the origin
   `https://demo-waymark.example` and no `set` for Waymark (kind `blog`, no `sets/blog/`), and
   that a theme whose first kind is `organization` gets the scratch root's `sets/organization`.
3. Add acceptance 1's test: `sets/organization/cairn-set.json` validates against the set schema,
   and the set holds a `home` page with a `description`, an `actions` menu of exactly two links,
   three posts, a `safeguarding` page and a `contact` page each linked from the `footer` menu, and
   at least four images each with a `source` and a `license`. On the contact page's body (front
   matter excluded), it finds no phone number (`\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}` or a bare run of
   seven or more digits) and no capitalized word pair outside an allowlist of the society's, the
   hall's, and the places' names. Every menu and card link names a page the set holds (M7).
4. Add the real-set leg of acceptance 4 to `demo.test.mjs`: build Waymark with
   `set: path.join(ROOT, 'sets/organization')` and assert the five places, present and absent,
   as T1 does.

Done when `npm run test:catalog` passes.

### T3. Each demo proved in turn (50 min, Opus `medium`, group 3)

1. In `scripts/catalog/reference-check.mjs`, apply decision 4.
2. In `scripts/catalog/reference-check.test.mjs`, add two cases where both fixture themes share
   one demo address. When it serves the second theme's marker, the check passes and its `notes`
   name the skipped theme. When it serves the first theme's (`alder@2.0.0`), the check fails
   naming birch. Keep the existing stale-marker case red with unique addresses.
3. Add acceptance 3's test to `publish.test.mjs`. Give `scratchRoot` an option that adds a
   second theme, a copy of Waymark with its `id` and `name` changed. Start a 127.0.0.1 server
   with CORS that serves the fake bucket's objects before the run, and pass
   `world({ env: { CATALOG_ORIGIN: <server origin>, DEMO_ORIGIN: 'https://demo-proving.example' } })`.
   Add one `w.events` array that the fake `buildDemo`, `deploy`, and `fetch` all push to, and
   assert it reads build, deploy, then a poll that sees the release, for the first theme in
   catalog order and then for the second. Then call `runReferenceCheck` with an injected
   `fetch` that answers the demo address from `w.live` and the rest from the server, and assert
   no failures. Close the server through its own handle.

Done when `npm run test:catalog` passes.

### T6. The catalog doc and the backlog (15 min, Sonnet `medium`, group 3)

1. In `docs/internal/theme-catalog.md`, rewrite the #486 paragraph (lines 86 to 88) to say what
   decision 4 does, including that it changes nothing on the real catalog, and add the set
   lookup and the origin to the demo section. Line 113 ("The proving target needs nothing new")
   stays.
2. In `BACKLOG.md`, apply decision 13 in the file's own format.

Done when the fast lane passes.

## Acceptance

| # | Item (verbatim from the design) | Task | Evidence |
| --- | --- | --- | --- |
| 1 | `sets/organization/cairn-set.json` validates against `schema/cairn-set-1.schema.json`. A test asserts the set holds a `home` page with a description, an `actions` menu of two links, three posts, a safeguarding page linked from the footer menu, a contact page linked from the footer menu with no phone number and no person's name on it, and at least four map images, each with its source and license in the manifest. | T4, T5, T2 | The set test in `publish.test.mjs` under `npm run test:catalog` |
| 2 | Every invented name in the set has a recorded search that found no real match, listed in the pull request. | T0, T4 | The PR's `## Name searches` table |
| 3 | A test runs the publish job with injected fakes over two themes and asserts each deploys in turn, each is waited on, and the proving reference check passes. The live proof with two real themes is pass 4's pull request run. | T3 | The two-theme test in `publish.test.mjs` under `npm run test:catalog` |
| 4 | A demo built with the set carries the demo's origin, never `showcase.test`, in the canonical link and `og:url` of `index.html`, in `feed.xml`, in `sitemap.xml`, and in `robots.txt`. A test asserts all five. | T1, T2 | The set builds in `demo.test.mjs` under `npm run test:catalog` |
| 5 | The pull request lists every sentence in the set that states a fact about a real place, each with its public source, and the closing reviewer checks all of them. | T0, T4, Close | The PR's `## Facts about real places` table (sentence, source URL, quoted excerpt), and the diff-reviewer's verdict on each row |
| E1 | The pull request shows evidence for each item. | Close | The PR's `## Acceptance` section, one line per item |
| E2 | Everything written for a person follows `~/.claude/docs/voice/written-for-people.md` or the repo's docs rules. | T4, T6, Close | Vale on `docs/**`, the set's prose read by `prose-voice-reviewer`, and the PR body's opening paragraph |

The PR's `catalog` run publishes to the proving target with `--reset` and deploys Waymark's demo
over the starter overlay with the proving origin. Its result and decision 14's canonical line go
in the PR.

## Close

Close is 50 minutes on the path. Run the `cairn-running-passes` close checklist. Then:

- The close gate is `node scripts/checks/gate-tier.mjs --range 91b3738a3..HEAD` through
  `cairn-run-gate`, with any `make -C tool check` leg dropped (decision 12).
- Dispatch `standards:diff-reviewer` (whole-branch) on `91b3738a3..HEAD` with the plan, the
  design, the fact list with each fact's quoted excerpt, and the name list. It checks each fact
  against its quote (it has no web tools, M14). Dispatch `prose-voice-reviewer` on the set's
  pages in the same round. Fold what they find first.
- Render the set's `home`, `programs`, and `contact` pages at 320, 390, 768, 1440, and 2560 and
  read each with your own eyes before the PR is marked ready. Build the demo with
  `buildDemo({ root, themeDir: themes/waymark, set: sets/organization, out: $CLAUDE_JOB_DIR/tmp/demo, worker: 'cairn-demo-local', origin: 'http://127.0.0.1:8799' })`
  from a one-off node script under the job's `tmp`. Serve it with
  `npx wrangler dev --local --port 8799` from that out directory as a background task, wait for
  its "Ready on" line (up to 60 seconds), take Playwright screenshots at the five widths, and stop
  the server with `TaskStop`. Waymark renders no `actions` and no cards styling of its own; the
  read checks that nothing breaks, overflows, or reads wrong.
- The PR body carries `Round: pennant`, `Pass: 3 set`, `Review: <verdict>, open findings <n>`,
  `Calls:` (decisions 2 and 7), `## Decisions`, `## Planning misses`, `## Name searches`,
  `## Facts about real places`, the cleanups filed through `standards:log-issue`, and the
  catalog proving run's result.
- The last commit deletes this plan and its executor prompt. Rerun `npm run check:docs-gate`
  after it.

## Planning misses

- [mechanism] The design says the publish job "sets the demo's origin", but nothing in the
  build reads an origin: `publicOrigin` is a literal in the template config (M5). Decision 1
  replaces it in the composed copy.
- [mechanism] The design doesn't say what the demo's site name is. The installer writes the
  owner's, and a demo has none (M6). Decision 2.
- [mechanism] `composeSite` never copies a set's site config (M2), so a set's menus would be
  lost. Decision 1.
- [file-list] The design names no step for the web work (name searches, fact sources, map
  sheets), and no implementer has web tools (M14). T0 added at planning.

## Plan review fold

One `standards:plan-reviewer` read (Opus, `medium`) returned one blocker, ten majors, and twelve
minors. All were folded; none changes the approved design.

- B1, no implementer or reviewer has web tools: T0 in the executor's session, quoted excerpts
  for the reviewer (M14).
- M1, T4's build couldn't pass in group 1: removed; T2 step 4 is the crawl proof.
- M2, the T1 fixture lacked `static/`: added with an image (M15).
- M3, the missing-literal case needed an export: `writeOrigin` is named (decision 1).
- M4, acceptance 4 was absence-only: each place asserts the origin present and `showcase.test`
  absent.
- M5, acceptance 3's server order and event order: server first, one `w.events` log.
- M6, the shared-address case had no failing twin: added.
- M7, closing #483 left the live Waymark demo on `showcase.test`: reworded, and decision 14's
  read after the proving run.
- M8, a push between groups would break the proving run: the `origin` argument lands in T1, and
  pushes happen at a group's end.
- M9, the minutes: T0 added, T4, T5, T3, and Close re-estimated; the path is 230 of 240.
- M10, the render read had no command: written out.
- Minors: YAML-safe `siteName` and the doubled title (M18), the Ajv wording, the phone pattern,
  `contentDirs` replaced and absolute `set` paths, the CLI's `{id}`, the `notes` channel, the
  set config's menus (M17), the line and path slips, the rerun rule (decision 14), the docs gate
  rerun, and the decimal image limit.
