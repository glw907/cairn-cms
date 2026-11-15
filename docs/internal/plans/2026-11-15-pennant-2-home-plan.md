Initiative: theme-garden
Round: pennant
Pass: 2 home

# Pass 2 `home`: a page as the home page, with the newest posts

Design: `~/Projects/initiatives/theme-garden/specs/2026-11-14-pennant-design.md`, approved by
Geoff through design packet `20261115-041501-ead5c5` on 2026-11-15. His later packet
`20261115-043946-a5b754` ruled that the home route hands its lists as named members of one object
(`posts` today) and that events wait for the next round. Worktree
`/var/home/glw907/Projects/cairn-cms/.claude/worktrees/pennant-2`, branch `pennant-2`, base
`d86f8b24e` (the head of `pennant-1`, whose PR #251 waits for its close packet). PR base `main`.
Class `auth-data` (decision 1), where the design's row reads `ordinary, live-account`; the
`live-account` part is the catalog proving publish the PR run makes. Conductor `conductor-pennant`.
The design's path is 150 minutes; this plan's path is 150 with pairs (sum of task minutes 215).
The park line at planning is 300, and the retry ceiling is 300, twice the approved 150.

## Pre-flight

Owner steps: none. Nothing in this pass needs a sign-in, a secret, a dialog, or a new permission
rule. Its merge publishes Waymark 1.2.0 to the hosted catalog through the `catalog` workflow, a
release that can't be withdrawn (design "What each merge publishes"). The PR run publishes to the
`catalog-proving` environment first, so the release is proved before the merge.

- Permissions checked: every task's writes and commands were read against auto mode and the
  denials log (`~/.local/state/claude-denials.jsonl`, 70 rows, 2026-11-01 to 2026-11-15). The pass
  writes repo files only, with no `.claude/settings*`, no `.github/**`, no `scripts/release/**`,
  no credential, and no new public surface. The classes with refusals are Interfere With
  Workloads 9, classifier "judged dangerous" 8, Self-Modification 10 (7 Bash, 3 Edit), classifier
  unavailable 6, Destructive or Unwanted 5, Merge Without Review 3, Auto-Mode Bypass 3,
  Irreversible Local Destruction 2, Git Destructive 2, Create Public Surface 2, Security Weaken 2,
  Undermining Oversight 2, and Production Deploy 1. The pass's own risks are the one server T8
  starts for its screenshots (a script stops it through the child handle it holds, never `kill`
  or `pkill`), the setup command (run bare, alone), and the Go tool leg the gate prints for a
  `site.config.yaml` change, which this pass never runs (decision 14). The routes are under
  "Auto-mode routes".
- Reviewed: one `standards:plan-reviewer` read (Opus, `medium`), as the `auth-data` class
  requires, with pass-core `planner.md` "Stops" and "Pre-flight" added to its prompt. Findings
  folded under "Plan review fold".
- Evidence: the mechanism table and the recorded searches below. Every row is a probe run at
  `d86f8b24e` on 2026-11-15 or a quoted source line at that commit. Rows M24 to M28 are the plan
  reviewer's probes, run in scratch directories outside the worktree.

### Auto-mode routes

| Refused class (denials log) | Route this pass takes |
| --- | --- |
| Interfere With Workloads (`kill`, `pkill`, `claude stop`) | Never stop a process from the shell. The tests start no server of their own (decision 10). T8's screenshot script starts `npx wrangler dev` as its child and stops it with `child.kill()` before it exits (M28). A busy port is waited out with a Monitor until-loop, never freed by force. |
| Destructive or Unwanted (setup chain piped to `tail`) | Run the setup command bare, alone in its own call. Gates and CI watches run bare, never piped. |
| Irreversible Local Destruction, Git Destructive (`git reset --hard`, `git checkout --`) | Never. Unwanted work is reverted with a new commit. |
| Merge Without Review (`gh pr merge`) | Merge only through `approval-queue`. |
| Self-Modification (`.claude/settings*`, `stow claude`) | Never. `templates/waymark/.claude/**` changes only through `npm run emit:template`. |
| Auto-Mode Bypass (a repeat `gh workflow run e2e.yml`) | This pass expects no baseline change (acceptance 7). If CI shows one, it is a defect to trace, not a regeneration. A regeneration, if one is ever needed, is one dispatch per head, and a second refusal puts it in `## Before merge`. |
| Create Public Surface, Production Deploy | The pass deploys nothing. The catalog publish runs only in CI, from the workflow, on the PR (proving) and on merge. |
| Classifier unavailable | Retry the same call once after a pause. |

## Mechanism table

| # | Mechanism | Probe or source | Result |
| --- | --- | --- | --- |
| M1 | A build copy of the template with a `home` page | Probe script (planning scratch) mirroring `examples/showcase/scripts/starter-build.test.mjs`: `emitTemplate({ from: showcase, to, engineSpec: 'file:../..', devSpec: 'file:../../packages/cairn-cms-dev', starterOverlay: STARTER_OVERLAY_DIR })`, `layIn(themes/waymark, to)`, `stripLayIn(pkg)`, symlink the showcase `node_modules`, write `src/content/pages/home.md` and a `draft: true` post, `npm run cairn:manifest`, `npm run build` | Builds in about 10 seconds. Without `starterOverlay` the build fails with `ENOENT ... src/content/.cairn/index.json`. Without `cairn:manifest` the new files are not in the index. |
| M2 | What the build does with a `home.md` today | Same probe | `home.html` and `home.md` are prerendered, the sitemap lists `/` and `/home`, `/home.html` carries canonical and `og:url` `https://showcase.test/home`, and the draft is absent from `/`. |
| M3 | How a rule line renders | Same probe, body `First part.\n\n---\n\nSecond part.\n\nA setext line\n---\n\n> quoted\n>\n> ---\n` | The paragraph-separated `---` renders as a top-level `<hr>`. `A setext line\n---` renders as an `<h2>`, not a rule. `> ---` renders as an `<hr>` nested in the `<blockquote>`, on its own line in the HTML. A last-`<hr>` string match would split inside the quote, so the split needs depth. |
| M4 | A redirect for `/home` | `if (url.pathname === '/home') redirect(308, '/')` added to the `[...path]` load, then the build, then `wrangler dev --port 4391` | The build writes a meta-refresh `home.html` and a `_redirects` line `/home / 308`. `/` 200; `/home` 308 to `/`; `/home/` 307 to `/home`; `/home.md` still 200, so the markdown twin needs its own exclusion. |
| M5 | Prerender failure handling | `examples/showcase/vite.config.ts` `prerender.handleHttpError` and `handleUnseenRoutes` | `handleHttpError` throws on any non-2xx the crawl meets, so a link to a missing page fails the build. `handleUnseenRoutes` allows only `/(site)/archive/[page]`. A `/.md` link from the home view would fail the crawl. |
| M6 | The home route today | `examples/showcase/src/routes/(site)/+page.server.ts` | Returns `featured` (`posts.all()[0]`), `archive` (`paginateArchive(entries.slice(1), 1)`), the vocabulary, `seo` from `buildSeoMeta` with canonical `origin + '/'`, type `website`, the feeds, and `description`. Its `+page.svelte` is site markup (masthead `h1`, lead, year-grouped index of `EntryRow`, tag filter, pagination), not a theme component. |
| M7 | The archive today | `examples/showcase/src/routes/(site)/archive/[page]/` and `src/chassis/archive.ts` | `archiveEntries()` is `posts.all().slice(1)`; the entries generator starts at page 2; the load 404s when `requested < 2`; `+page.svelte` sets `noindex`, and its Newer link goes to `/` from page 2. `paginateArchive(entries, page, pageSize = 13)`. |
| M8 | The sitemap | `examples/showcase/src/routes/sitemap.xml/+server.ts:15` | `buildSitemapResponse(buildSitemapView(site, buildSiteDescriptors(cairn), siteMeta.origin, ['/']))`. `buildSitemapView` returns a `SitemapUrl[]` the route can filter before the response. No archive page is listed today. |
| M9 | The markdown twin | `examples/showcase/src/routes/(site)/[...path=md]/+server.ts` | Its entries are `routes.markdownEntries()` and its handler is `routes.markdownLoad`. |
| M10 | The page and preview mounts | `(site)/[...path]/+page.svelte`, `(site)/preview/[token]/+page.server.ts` and `+page.svelte` | The page mount renders `<ArticleView {data} titleTemplate=... />`. The preview load is `loadPreview(event, { runtime, publicRoutes: publicRoutesConfig }).then(withReferences)`, and its mount renders `<PreviewBanner>` over `<ArticleView {data} preview />`. |
| M11 | `ArticleView` | `themes/waymark/components/ArticleView.svelte` (182 lines) | Props `data`, `preview = false`, `titleTemplate`. On preview it strips `og:url` and canonical. `markdownUrl` is undefined on preview or `noindex`, otherwise `data.canonicalUrl + '.md'`. It renders `<CairnHead>`, the hero figure from `data.heroImage` or a raw `image.src` fallback (`'image' in data.entry.frontmatter`, :81-83), the `h1` (:128), and `{@html data.html}` (:145). It renders no `description`. |
| M12 | The pages fieldset | `examples/showcase/src/site/cairn.config.ts:133-136` | `title` (required) and `robots` only. Posts declare `description: fields.textarea({ label: 'Description' })` and `image: fields.image({ label: 'Hero image', seo: true })` (:88-89). |
| M13 | Menus | `src/lib/nav/site-config.ts:343-347`, `examples/showcase/src/site/site-config.ts:9,23,30`, `site.config.yaml:3-19` | `readMenu(config, name, maxDepth)` returns `[]` for an absent menu. `site-config.ts` exports `siteConfig`, `primaryNav`, `footerNav`, and `siteName`, so the root layout can read `actions` without editing `site-config.ts`. `setMenu` (:349-362) does not keep YAML comments, so an owner's nav save drops a commented example. |
| M14 | The root layout load | `examples/showcase/src/routes/+layout.server.ts` | Returns `hasIslands`, `nav`, `footerNav`, `siteName`. Every prerendered page inlines this data in its start script. |
| M15 | The theme contract | `schema/cairn-theme-contract-1.json` | Lists paths and tokens only. It has no prop list, so a new `ArticleView` prop changes nothing in it. `**/*.test.ts` is an allowed theme path. |
| M16 | The catalog tests pin the Waymark version | `scripts/catalog/demo.test.mjs:55,58` (`waymark@1.1.0`, built from the real `themes/waymark`); `scripts/catalog/publish.test.mjs:35-39,280-294,402-427` (20 lines, `themes/waymark/1.1.0...`, from a scratch copy of the real manifest) | Raising the version to 1.2.0 turns both red until the pins move. `index.test.mjs`'s `1.1.0` lines are synthetic and stay. |
| M17 | Version-rise check | `.github/workflows/test.yml:139-142`, `scripts/catalog/version-rise.mjs` | CI fails a range that changes `themes/<id>/**` without raising that theme's `version`. |
| M18 | E2E server | `examples/showcase/playwright.config.ts:49-61` | `VITE_CAIRN_E2E=1 npm run build && npx wrangler dev --port 4173 --inspector-port 4174 --var CAIRN_DEV_BACKEND:1 ...`, and a second server on 4175/4176. Prerendered pages are static, so a page the admin creates never changes `/` on this server; the preview route runs live. |
| M19 | Spec mapping | `src/tests/unit/gate-tier.test.ts:384` ("reaches every showcase spec"), `scripts/checks/gate-table.json` | A new `e2e/*.spec.ts` needs a mapping in `scripts/checks/gate-table.json`, which is outside the row and in the `runner` class. A non-spec helper `.ts` in `e2e/` needs none. The map row for `(site)/`, `src/chassis/`, `src/theme/`, and `themes/` selects `site-visual`, `markdown-twin`, `preview`, and 16 others. |
| M20 | Template unit tests | `templates/waymark/src/routes/healthz/server.test.ts`; showcase vitest includes `src/**/*.test.ts`; `.github/workflows/test.yml` runs `npm --prefix examples/showcase run test:unit` | A route-local `*.test.ts` ships with the template and runs in CI. The showcase vitest runs in node with no Svelte plugin, and the site declares no HTML parser (`@glw907/cairn-cms`, `hastscript`, `remark-smartypants` only). |
| M21 | Preview create flow | `examples/showcase/e2e/preview.spec.ts` | `openCreateDialog(page)`, fill the title and `input[name="slug"]`, click Create, wait for `/new=1/`, take the id from the path, `fillTitleWhenHydrated`, `setBody`, `save`. Discarding a never-published draft returns to the list. |
| M22 | Starter content | `scripts/build/starter-overlay/src/content/` | Seven posts dated 2026-11-01 to 2026-11-07, pages `about`, `author`, `contact`, one fragment. No `home` page. |
| M23 | Template emit | `scripts/build/emit-template-dir.mjs`; `.cairn-template.json` | `templates/waymark/` is regenerated wholesale from the showcase, the starter overlay, the Waymark lay-in, and `skills/`. The emit excludes `e2e`, `scripts`, `src/content`, and `src/theme` from the showcase copy, then lays the theme into `src/theme/`. `check:template` fails on drift. |
| M24 | A build copy served from a temp directory | Reviewer: the M1 copy under `npx wrangler dev` | Static files answer (`/` 200). Every route the worker renders answers 500 (`TypeError ... createRequire`, rolldown-runtime, the open sveltejs/kit#15960); the cause is specific to the temp copy, since the repo showcase's worker-rendered 404s pass on CI. Every route this pass proves is prerendered (`prerender = true` in `(site)/+page.server.ts`, `archive/[page]`, `[...path]`, `[...path=md]`, `sitemap.xml`), so the build output is the proof and no copy is served for the tests. |
| M25 | The no-home `/` once its route imports `ArticleView` | Reviewer: two base copies, one with `ArticleView` imported behind a never-true branch in `(site)/+page.svelte` | After normalizing build noise, the one difference is an added `<link href="./_app/immutable/assets/ArticleView.*.css" rel="stylesheet">`, from the component's `<style>` block. Its rules are scoped to Svelte-hashed classes, so nothing on `/` paints differently. |
| M26 | Build noise between two identical builds | Reviewer: two base builds | They differ in hashed names under `/_app/immutable/`, the `version` string, the per-build `__sveltekit_<id>` global, and Svelte's hydration comments. With those four normalized, the two builds match byte for byte. |
| M27 | Fixture content | Reviewer: the M1 copy with starter content removed | Removing the starter posts fails the crawl (`content link is dangling: pages/author links to posts/2026-11-05-add-an-image`), and removing `author` fails on `pages/about`. With the posts, `about`, and `author` all removed, a copy of `contact`, `home`, and no posts builds. |
| M28 | Playwright hook timeouts | Playwright docs, `examples/showcase/playwright.config.ts` | "`beforeAll` and `afterAll` hooks have a separate timeout, by default equal to test timeout"; the config sets none, so 30 s applies. One copy builds in 9 to 11 s locally. `child.kill()` on `npx wrangler dev` closed its port (reviewer probe). |

## Recorded searches

| Search | Hits |
| --- | --- |
| `git grep -il "home page" docs/admin docs/editors` | 0 files |
| `git grep -il "menus\." docs/admin docs/editors` | 0 files |
| `git grep -il "/archive" docs/admin docs/editors` | 0 files |
| `git grep -il "front page\|homepage\|archive\|menu" docs/admin docs/editors` | 2 files: `docs/editors/publish-and-history.md`, `docs/editors/write-in-the-editor.md` |
| `git grep -n "ArticleView" skills/ schema/` | 2: `skills/cairn-styling-public-pages/references/theme-directory.md:28`, `schema/cairn-theme-contract-1.json:16` |
| `git grep -ln "menus\|footerNav" -- skills` | 3: `cairn-extending-a-site/references/{daisyui-first,make-it-yours,public-routes}.md` |
| `git grep -n "'home'" -- src/lib` | 0, so the engine reserves no `home` id |
| `git grep -n '1\.1\.0' -- themes templates/catalog.json scripts/catalog sets` | 33, all in `scripts/catalog/*.test.mjs` (M16) |
| `git grep -n "site home\|archive page 2" examples/showcase/e2e` | 1 file, `site-visual.spec.ts` (the tests the local run inverts out) |

## Scope

Files the pass writes, from the design's row:

- `examples/showcase/src/routes/**`, regenerated into `templates/waymark/src/routes/**` by `npm run emit:template`
- `examples/showcase/src/site/{cairn.config.ts,site.config.yaml}`, and the same under `templates/waymark/` by the emit
- `examples/showcase/e2e/**`
- `themes/waymark/**`
- `docs/admin/**`, `docs/editors/**`
- `MIGRATION-NOTES.md`, `CHANGELOG.md`, `docs/internal/engine-rulings.md`

`schema/cairn-theme-contract-1.json` is in the row but doesn't change (M15).

Rows this plan adds, each flagged under "Planning misses":

- `scripts/catalog/demo.test.mjs` and `scripts/catalog/publish.test.mjs`, the Waymark version pins only (M16). Pass 3 owns these files later; this pass changes `1.1.0` to `1.2.0` where the line reads the real Waymark manifest and nothing else.
- `skills/cairn-styling-public-pages/references/theme-directory.md` and `skills/cairn-extending-a-site/references/public-routes.md`, the `home` prop and the home page route. The repo rule `docs-with-code.md` requires the packaged skill to teach a public contract change. `skills/cairn-extending-a-site/references/draft-preview.md:21-40` quotes the preview mount T5 changes, so T7 updates its quote.
- `templates/waymark/**` beyond the routes and site files, only as `npm run emit:template` writes it (the theme lay-in under `src/theme/` and the skills under `.claude/`).

Never touched: `src/lib/**`, `examples/showcase/src/chassis/**`, `examples/showcase/src/site/site-config.ts`, `examples/showcase/scripts/**`, `examples/showcase/playwright.config.ts`, `examples/showcase/package.json`, `scripts/checks/**`, `src/tests/**`, `.cairn-template.json`, `.github/**`, `scripts/release/**`, `.claude/settings*`, `tool/**`, `docs/STATUS.md` (except the `## Stop` a stop writes on the branch), `templates/catalog.json`. A task that needs one parks the pass.

## Standing answers

Round-run standing answers 1 to 12 and the design's 1 to 13 hold. The ones this pass is likely to
meet:

- Design 11: if the split can't be made as decision 4 says, take the nearest form that keeps call
  7's two properties (the editor places the list with ordinary markdown, and no block is added),
  flag it in the PR, and go on.
- Round-run 5: a 403 from the catalog proving run parks with the request, the response, and the
  token name. Never widen a token or try another credential.
- A stop commits, pushes, opens or keeps the draft PR, writes `## Stop` to STATUS on the branch,
  and ends.
- If PR #251 takes a fold to a route or the chassis before it merges, merge `main` (or the new
  `pennant-1` head) into `pennant-2`, then recapture the golden and the frozen route twins at the
  new merge base in one commit that says why. This is the one case where a golden is recaptured.
- After the whole-branch review, a Low finding from a delta read is folded once or filed through
  `standards:log-issue`; it never starts another review round. A Medium or higher finding is
  folded and its fix read once more by the reviewer that raised it.

## Decisions made at planning

1. Class `auth-data`, where the design table says `ordinary`. The preview task edits
   `examples/showcase/src/routes/(site)/preview/[token]/**`, which the path map puts in `auth-data`
   (`**/preview/\[token\]/**`). The close adds `standards:web-auth-security-reviewer` and the local
   admin smoke on the preview path. [advisor]
   Call: `approval-packet` step 1 never lands an `auth-data` PR, so this pass goes to Geoff as a
   close packet rather than landing on review as his ruling for passes 2 and 3 expected. The
   preview edit is the cause: the pass instructions require the preview to pass the marker.
2. The marker is one optional `ArticleView` prop, `home`. Its presence is the marker:
   `home?: { posts: HomePost[]; archiveUrl: string; before: string; after: string }`. `posts` is a
   named member, as Geoff's packet ruled, so a later round adds `events` beside it. Each `HomePost`
   is the entry shape the archive hands `EntryRow` today, so a theme renders the list with its own
   `EntryRow`. `ArticleView.svelte` owns the `home` type and exports it from its module script;
   the routes import it from `#theme`, so T4 lands before T3 starts. `data.html` stays the whole body: a theme that knows no `home` prop renders the body
   whole with no list, and Waymark 1.2.0 with no `home` prop renders as 1.1.0 did. The contract
   schema has no prop list (M15), so it doesn't change. `MIGRATION-NOTES.md` still names the new
   prop for theme authors. [advisor]
3. `/home` redirects to `/` with a 308 from the `[...path]` load, as probed (M4). The entries
   generator keeps `/home`, so the build writes the `_redirects` line. `/home.md` is absent: the
   markdown twin's entries drop the `home` page. The twin route is prerendered (M24), so a page
   left out of its entries has no file and no handler call; the handler needs no 404 branch of its
   own. A canonical link alone was ruled out by the pass instructions. [advisor]
4. The body splits at its last `<hr>` that is a direct child of the rendered body, never one
   inside a blockquote, list, or block (M3). A route-local helper,
   `examples/showcase/src/routes/(site)/home.ts`, scans the HTML string with a quote-aware tag
   scanner that tracks depth, since the site declares no HTML parser (M20) and the scope rules
   forbid a new dependency for this. `before` is the HTML ahead of that rule, `after` the HTML
   after it, and the rule itself is dropped. With no top-level rule, `before` is the whole body and
   `after` is empty, so the list follows the body. Its tests live beside it in `home.test.ts` and
   ship with the template as `healthz/server.test.ts` does. [advisor]
5. The home load builds on the engine's page load: it calls `routes.entryLoad` for the `home`
   page through a URL built for `/home` (it reads only the pathname), passes the result through
   `withReferences`, then overwrites `canonicalUrl` with `origin + '/'` and rebuilds `seo` with
   `buildSeoMeta` from the inputs `composeEntryData` uses (`src/lib/delivery/public-routes.ts:199-213`:
   the page title, its `description` or excerpt, its hero image, its `robots`), with canonical and
   `og:url` `origin + '/'`, and attaches `home`. In home mode `ArticleView` emits no
   markdown-twin link, since `/.md` would fail the crawl (M5). No `href` on the built `/` points at
   `/home`; `entry.permalink` may still read `/home` inside the serialized data, which no link
   uses. [advisor]
6. In home mode the archive starts at the newest post on page 1: `archiveEntries()` returns all
   posts, the entries generator starts at 1, page 1 drops `noindex`, page 2's Newer link points to
   `/archive/1`, and the sitemap lists `/archive/1`. With a `home` page and no posts, the entries
   generator yields no archive page and the sitemap lists none, so no empty `/archive/1` is built.
   With no `home` page every one of these is exactly as on `main`. [advisor]
7. The preview attaches `home` only after `loadPreview` succeeds and only for the `pages` entry
   whose id is `home`. Its posts come from the published index (`posts.all()` from
   `#chassis/content.js`), never the preview backend, so a preview shows no other draft. Headers,
   tokens, and the preview banner are untouched. [advisor]
8. The `actions` menu goes in `site.config.yaml` as a commented example after the footer menu,
   with the footer's note that a developer edits it in the file. The root layout reads
   `readMenu(siteConfig, 'actions', 1)` and returns it as `actions` only when it holds a link, so a
   site with no menu serializes the same layout data as today. Pass 4's theme reads `page.data.actions`
   without touching a route (pass 4's row has none). Waymark renders no button, so the commented
   menu leaves every baseline alone. [advisor]
   Call: the template ships the `actions` menu commented out, so a new site shows no Join button
   until a developer writes one. An uncommented default would need a link target the starter
   doesn't have.
9. Pages gain `description: fields.textarea({ label: 'Description' })` and
   `image: fields.image({ label: 'Hero image', seo: true })`, the posts fields as declared (M12).
   Waymark already renders an entry's hero image and puts `description` in the page's meta, and
   it prints no description text. Pennant's hero (pass 4) shows both.
10. Tests add no new spec file (M19). Every build-copy test lives in one serial `describe` in
    `e2e/site-visual.spec.ts`, which the `(site)/` and `themes/` changes already select, under a
    title with neither "site home" nor "archive page 2" in it, so the local inverted grep keeps
    it. A non-spec helper, `e2e/home-fixture.ts`, builds each copy (M1 recipe) and returns its
    output directory. No test serves a copy (M24): every route the pass proves is prerendered, so
    the tests read the build output. A page's HTML is read from the output and loaded with
    `page.setContent`, and the assertions use locators on it. A redirect is the `_redirects` line
    (M4 showed `wrangler dev` honours it), and a route that answers no 200 is a file absent from
    the output. The helper owns all of a copy's content: it removes the starter posts and the
    `about` and `author` pages (M27), then writes four dated posts, one `draft: true` post, and
    `home.md` when asked. The `beforeAll` that builds the copies calls `test.setTimeout(300_000)`
    (M28). [advisor]
11. The byte proof for acceptance 2 and 8 compares against goldens captured in Task 1 at the base,
    before any route changes: `e2e/fixtures/home-golden/index.html` (the normalized `/`) and the
    absence of `archive/1.html` from the output. The normalizer has two levels.
    - Build noise, the four things two identical builds differ in (M26): hashed names under
      `/_app/immutable/`, the `version` string, the `__sveltekit_<id>` global, and the hydration
      comments. Acceptance 8 passes on this level alone, since the frozen routes import nothing new.
    - The pass's named difference: on the no-home `/` the current routes add one stylesheet link
      for `ArticleView`'s CSS (M25). Acceptance 2 asserts that the build-noise-normalized `/`
      differs from the golden by exactly that one link and nothing else, so any other change
      fails. If T3 meets another difference, it is a defect to remove, never a line to add here.
    The frozen base routes for acceptance 8 are copies of each route file the pass changes, stored
    as `e2e/fixtures/home-base-routes/**.fixture` so no tool type-checks them; the helper lays them
    over the copy for that build. [advisor]
    Call: the pass instructions say `/` stays byte for byte as on `main` with no `home` page. With
    `ArticleView` imported on `/`, the served HTML gains one stylesheet link whose rules are scoped
    to classes `/` never uses, so nothing renders differently and the site-visual baselines hold.
    Keeping it out would mean `/` can't render home mode through the theme's article view, which
    call 7 requires. The test pins that one link as the whole difference.
12. A failed split has no run-time form (decision 4 always yields `before` and `after`), so the
    pass adds no log event.
13. `docs/internal/engine-rulings.md` gains one entry: the home page is a site convention (calls 5
    to 7) in the template's routes, with no engine surface, so a later pass doesn't move it into
    `src/lib/`.
14. `examples/showcase/src/site/site.config.yaml` is a `toolInputs` path
    (`scripts/checks/gate-table.json:66`), so from T2 on the fast lane and the close gate print a
    `make -C tool check` leg. The pass instructions forbid that command. The executor never runs
    `npm run lane:fast`, which would run it; it runs the legs
    `node scripts/checks/gate-tier.mjs --fast --range d86f8b24e..HEAD` prints, each through
    `cairn-run-gate` per `cairn-pass` "Fast lane", with `make -C tool check` removed from the
    string, and records the dropped leg in the PR. CI's `tool` workflow doesn't trigger on that
    file, so nothing runs the Go tests on it. The change is a commented block the YAML parser
    skips, and T2 shows the showcase build still reads the config and `readMenu(siteConfig,
    'actions', 1)` returns `[]`.

## Tasks

Dispatch each task to `cairn-implementer` in its own worktree off `pennant-2`, naming the model and
effort on every dispatch. T1, T2, and T4 run side by side; T3 starts after all three merge; T5 runs
beside T6. Each task ends with the fast lane as decision 14 sets out, never `npm run lane:fast`.
Edit the showcase and run `npm run emit:template` in the same task, never `templates/waymark/**`
by hand. Every `.svelte` file goes through the Svelte MCP autofixer, after loading
`standards:svelte-conventions`.

A task's local e2e runs only its own spec, on a port no other worktree uses. Check the port first
with `ss -ltn` and wait out a busy one; T5 takes 4273 and T6 takes 4373 (each server also takes the
next three ports):

```
E2E_PORT=<port> npm --prefix examples/showcase run test:e2e -- e2e/<spec>.ts --retries=0 --grep-invert "site home|archive page 2"
```

### T1. The fixture helper and the goldens, before any change (25 min, Opus `medium`, beside T2 and T4)

1. Write `examples/showcase/e2e/home-fixture.ts`. `buildHomeCopy({ home?: string, posts?: boolean, baseRoutes?: boolean })`
   builds a copy by the M1 recipe into a temp directory and returns its output directory. It owns
   all of the copy's content (decision 10, M27): it removes the starter posts and the `about` and
   `author` pages, then writes four dated posts and one `draft: true` post unless `posts` is
   `false`, and `src/content/pages/home.md` when `home` is given. With `baseRoutes` it lays the
   frozen routes over the copy. It runs `cairn:manifest` and `build`. `removeCopy(dir)` deletes the
   directory. The helper starts no server.
2. Write the build-noise normalizer (decision 11, M26). Build two base copies with no `home` page
   and confirm they match after it; if a fifth difference shows up, add it to the build-noise
   level and record it.
3. Capture the golden from a base copy with no `home` page into `e2e/fixtures/home-golden/`.
   Commit it with the first test, in a serial `describe` in `e2e/site-visual.spec.ts` whose title
   holds neither "site home" nor "archive page 2": "with no home page, `/` matches the golden and
   no `archive/1.html` is built". Its `beforeAll` calls `test.setTimeout(300_000)`. It runs green
   at the base.
4. Copy each route file T3 and T5 will change into `e2e/fixtures/home-base-routes/`, with the
   `.fixture` suffix: `(site)/+page.server.ts`, `(site)/+page.svelte`, `(site)/[...path]/+page.server.ts`,
   `(site)/[...path=md]/+server.ts`, `(site)/archive/[page]/+page.server.ts`,
   `(site)/archive/[page]/+page.svelte`, `(site)/preview/[token]/+page.server.ts`,
   `(site)/preview/[token]/+page.svelte`, `sitemap.xml/+server.ts`, `+layout.server.ts`.
5. Probe that the admin on the e2e server can create a page with the slug `home` (M21), and record
   the answer for T5.

Done when the golden test passes on the base and the probe is recorded in the task report.

### T2. The split helper, the page fields, and the menu example (25 min, Opus `medium`, beside T1 and T4)

1. Write `examples/showcase/src/routes/(site)/home.ts` with `splitAtLastRule(html)` (decision 4)
   and `home.test.ts` beside it. The cases: no rule (the list follows the body), one top-level
   rule, two top-level rules (the split is at the second), a rule as the last element (`after` is
   empty), a rule only inside a blockquote (treated as no rule), and a rule inside a block's
   markup (treated as no rule). The scanner must hold its depth across a `>` inside an attribute
   value, void elements (`<br>`, `<img>`, `<hr>` itself), a self-closing `/>` in inline SVG, and an
   HTML comment, each with a case.
2. Add `description` and `image` to the `pages` concept in `examples/showcase/src/site/cairn.config.ts`
   (decision 9).
3. Add the commented `actions` example to `examples/showcase/src/site/site.config.yaml` (decision 8),
   and show that the showcase still builds and `readMenu(siteConfig, 'actions', 1)` returns `[]`
   (decision 14).
4. `npm run emit:template`.

Done when `home.test.ts` passes under `npm --prefix examples/showcase run test:unit`.

### T4. Waymark's `home` prop and version 1.2.0 (20 min, Sonnet `medium`, beside T1 and T2)

1. `themes/waymark/components/ArticleView.svelte`: add the `home` prop and export its type from the
   module script (decision 2). With it, render `before`, then the news list, then `after`, and
   suppress the markdown-twin link. The list is a heading ("Latest news"), the posts through
   Waymark's `EntryRow` with their dates, and a link to `archiveUrl`. With `posts` empty, render
   neither the heading nor the link. Without the prop, the output is byte-identical to today's.
2. `themes/waymark/cairn-theme.json`: `"version": "1.2.0"`, `"notes": "Renders a page whose id is home as the home page, with the newest posts."`
3. Move the Waymark version pins in `scripts/catalog/demo.test.mjs` and `scripts/catalog/publish.test.mjs`
   from `1.1.0` to `1.2.0` (M16), and nothing else in those files.
4. `npm run theme:lay-in` and `npm run emit:template`; `npm run test:catalog`.

Done when `npm run test:catalog`, the theme check, and the fast lane are green.

### T3. The home route, the archive, the redirect, the twin, and the sitemap (30 min, Opus `medium`)

Starts after T1, T2, and T4 merge. Every change is a no-op without a `home` page, apart from the one
stylesheet link decision 11 names.

1. `(site)/+page.server.ts`: when a `pages` entry with id `home` exists, return
   `{ home: true, ...homeData }` built per decision 5, with `posts` the newest three of
   `posts.all()` and `archiveUrl` `/archive/1` (no `archiveUrl` link when there are no posts);
   otherwise return exactly what it returns today.
2. `(site)/+page.svelte`: with `data.home`, render `<ArticleView data={...} home={...} />` with the
   same `titleTemplate` the page mount uses; otherwise the existing markup, untouched.
3. `(site)/archive/[page]/`: home mode per decision 6.
4. `(site)/[...path]/+page.server.ts`: the 308 per decision 3.
5. `(site)/[...path=md]/+server.ts`: drop the `home` page from the entries (decision 3).
6. `sitemap.xml/+server.ts`: in home mode, filter `/home` and add `/archive/1` when posts exist.
7. `+layout.server.ts`: `actions` per decision 8.
8. Change the T1 golden test to its final form (decision 11): the normalized `/` must hold exactly
   one `ArticleView` stylesheet link, and with that one line removed it must equal the golden.
   This is the only change T3 makes to that test.
9. `npm run emit:template`.

Done when the golden test passes, `svelte-check` passes, and the fast lane is green.

### T5. The preview (20 min, Opus `medium`, beside T6)

1. `(site)/preview/[token]/+page.server.ts`: attach `home` per decision 7, using `splitAtLastRule`
   and the same newest-three shape T3 builds.
2. `(site)/preview/[token]/+page.svelte`: pass `home={data.home}` to `ArticleView`.
3. `e2e/preview.spec.ts`: one test that creates a page with the slug `home` through the admin
   (idempotent: it reuses one that exists), sets a body with a rule line, opens its preview, and
   asserts the news list sits between the two parts with three dated posts. It then discards the
   never-published draft. If T1's probe found the admin refuses the slug, the pass parks: the
   preview is an `auth-data` path and its test has no other form.
4. `npm run emit:template`.

Done when `e2e/preview.spec.ts` passes locally on port 4273.

### T6. The built-copy tests (25 min, Sonnet `medium`, beside T5)

In the T1 `describe` in `e2e/site-visual.spec.ts`, each copy built once in the `beforeAll`, every
assertion read from the build output (decision 10):

- Home copy (a `home` page with a rule line, four posts, one draft): acceptance 1 (the `h1` of
  `index.html` is the page title, `archive/1.html` exists, its first entry is the newest post), 3
  (three posts with dates, the archive link, no draft), 4 (the list between the parts), and 5
  (`_redirects` holds `/home / 308`, the output holds no `home.md`, the sitemap lists `/` once and
  `/archive/1`, and never `/home`), and no `href` on `index.html` points at `/home`.
- No-rule copy (a `home` page with no rule line, `posts: false`): acceptance 3's empty case (no
  list heading, no archive link, no `archive/1.html`) and 4's second order (the list after the
  body; with no posts the test reads the order on a third copy with posts and no rule line).
- No-home copy: acceptance 2 (the T1 test).
- Base-routes copy (frozen routes, Waymark 1.2.0, no `home` page): acceptance 8, equal to the golden
  on the build-noise level alone.

Done when the `describe` passes locally on port 4373 and the spec's other tests are unchanged.

### T7. Docs and records (25 min, Sonnet `medium`)

Starts after T3, T5, and T6 merge. Load `cairn-writing-docs` and `writing-voice`.

1. `docs/editors/write-in-the-editor.md`: a section on making a home page (a page whose slug is
   `home`, the rule line that places the news list, what shows with no posts). Follow the page's
   brief in `references/docs-register.md`.
2. `docs/admin/`: the docs skill decides which page, if any, carries the `actions` menu and the
   home page's address; the recorded searches found no admin page about menus.
3. `skills/cairn-styling-public-pages/references/theme-directory.md` (the `home` prop),
   `skills/cairn-extending-a-site/references/public-routes.md` (the home page route), and the
   preview mount quoted in `skills/cairn-extending-a-site/references/draft-preview.md:21-40`, then
   `npm run emit:template`.
4. `CHANGELOG.md` under `## Unreleased`, `MIGRATION-NOTES.md` (the new prop for theme authors, the
   page fields, the menu, and that the contract schema didn't change), and the
   `docs/internal/engine-rulings.md` entry (decision 13).
5. `npm run check:docs-gate`, Vale, and a fresh `docs-fact-checker` run on the changed lines.

### T8. Evidence and close (45 min)

1. Build a home copy with the helper from a scratch Node script outside the repo. The script starts
   `npx wrangler dev` in the copy as its child, screenshots `/` at 320, 390, 768, 1440, and 2560 in
   light and dark with Playwright's Chromium, and stops the child with `child.kill()` before it
   exits (M28). Only the static `/` is shot, which a served copy answers (M24). Hand the shots to a
   fresh `standards:visual-verifier` with the showcase's no-home `/` at the same widths as the
   reference.
2. Run the local admin smoke on the preview path (`cairn-running-passes` "Live admin smoke").
3. Push, open the draft PR, and run `ci-green <sha> --pr <n> --wait` in the background. CI must
   show no changed baseline (acceptance 7); a changed one is a defect to trace.
4. Whole-branch `standards:diff-reviewer`, with `standards:svelte-reviewer`,
   `standards:daisyui-a11y-reviewer`, and `standards:web-auth-security-reviewer` in the same round.
   Fold what they find first, under the review floor in "Standing answers".
5. The close checklist below, then the plan-deletion commit.

## Acceptance

| # | Item (verbatim from the design) | Task | Evidence |
| --- | --- | --- | --- |
| 1 | With a page whose id is `home` and four posts, `/` returns that page's title in its `h1`, `/archive/1` returns 200, and the first entry on `/archive/1` is the newest post. | T3, T6 | The home copy tests in `e2e/site-visual.spec.ts`, run by the T6 command; the output file stands for the 200 (decision 10) |
| 2 | With no such page, `/` and `/archive/1` answer exactly as on `main`: the post list, and 404. | T1, T3 | The golden test in the same spec, with the one named difference (decision 11) |
| 3 | With a `home` page and four published posts plus one draft, `/` shows the newest three published posts with dates and a link to the archive, and never the draft. With no posts it shows neither, and the page holds no empty heading. The test runs on the showcase with Waymark. | T4, T6 | The home copy and no-rule copy tests |
| 4 | A `home` body with a rule line renders the news list between the two parts, and one with no rule line renders it after the body. A test asserts both orders. | T2, T4, T6 | `home.test.ts` under `npm --prefix examples/showcase run test:unit`, and both copy tests |
| 5 | `/home` and `/home.md` don't answer 200 as a second copy: each redirects to `/` or is absent. `sitemap.xml` lists `/` once, lists `/archive/1`, and never lists `/home`. | T3, T6 | The home copy tests (the `_redirects` line, the absent `home.md`, the sitemap) |
| 6 | The preview of the `home` page shows the news list. | T5 | `e2e/preview.spec.ts` by the task command on port 4273 |
| 7 | The showcase gains a `home` page fixture only inside the tests that need it, so its real home page and Waymark's existing baselines don't change. The end-to-end suite is green on CI, and the pull request lists every baseline that changed. | T6, T8 | `ci-green` on the head; `git diff --stat d86f8b24e..HEAD -- '*-snapshots/**'` empty, listed in the PR |
| 8 | A site on the template at `main` with Waymark 1.2.0 renders `/` as before: the theme works with a template that passes no marker. A test asserts it. | T1, T4, T6 | The base-routes copy test |
| E1 | The PR shows evidence for each item. | T8 | The PR's `## Acceptance` section, one line per item |
| E2 | Everything written for a person follows `~/.claude/docs/voice/written-for-people.md` or the repo docs rules. | T7, T8 | `npm run check:docs-gate`, Vale, the docs fact-check, and the PR body's opening paragraph |

## Close

Run the `cairn-running-passes` close checklist. Then:

- The close gate is `node scripts/checks/gate-tier.mjs --range d86f8b24e..HEAD --class auth-data`,
  run through `cairn-run-gate` with the `make -C tool check` leg removed (decision 14). The gate
  selects the whole e2e suite, because `e2e/` helper and fixture paths and the root layout and
  sitemap routes have no map row; CI carries it.
- Check every route file modified since the base has a frozen twin:
  `git diff --name-only --diff-filter=M d86f8b24e..HEAD -- 'examples/showcase/src/routes/**'`
  against `e2e/fixtures/home-base-routes/`.
- `npm run check:template` is clean.
- The PR body carries `Round: pennant`, `Pass: 2 home`, `Review: <verdict>, open findings <n>`,
  `Calls:` (decisions 1, 8, and 11), the `auth-data` verdict, `## Decisions` (with the dropped tool
  leg), `## Planning misses`, the retried tests, the cleanups filed through `standards:log-issue`,
  and the catalog proving run's result.
- The last commit deletes this plan and its executor prompt.

## Planning misses

- [file-list] The design's row omits the catalog tests that pin the Waymark version (M16), which
  the version raise turns red. Added at planning, version pins only.
- [file-list] The design's row omits the packaged skill pages that teach `ArticleView`, the home
  route, and the preview mount, which the repo's docs rule requires. Added at planning.
- [file-list] `npm run emit:template` writes `templates/waymark/**` beyond the routes and site
  files. Added at planning as emit-only.
- [mechanism] The design classes the pass `ordinary`, but the preview route is an `auth-data`
  path (decision 1).
- [conflict] The design's row holds `site.config.yaml`, a Go tool input, while the pass
  instructions forbid the Go tool gate (decision 14).

## Plan review fold

One `standards:plan-reviewer` read (Opus, `medium`) returned "not ready" with two blockers, six
majors, and ten minors. All were folded; none changes the approved design.

- B1, a copy served from a temp directory answers 500 on worker routes: no test serves a copy, and
  every assertion reads the prerendered output (decision 10, M24). T8's screenshots shoot only the
  static `/`.
- B2, importing `ArticleView` on `/` adds one stylesheet link to the no-home page: the normalizer
  splits into build noise and that one named difference, and decision 11 carries a `Call:` line.
  The layout returns `actions` only when the menu holds a link, which removes a second difference.
- M1, the per-build `__sveltekit_<id>` global: added to the build-noise level (M26).
- M2, T3 needed T4's prop type: T4 moves beside T1 and T2, and T3 runs after them.
- M3, the starter posts can't be deleted alone: the helper owns all content (M27), and both
  fallbacks are gone.
- M4, the `beforeAll` timeout: `test.setTimeout(300_000)`.
- M5, the e2e command: the full command with distinct ports and the port check.
- M6, the close gate runs the whole e2e suite: T8 is 45 minutes, and the path is 150.
- Minors: the canonical overwrite and the `href`-scoped check (decision 5), no empty archive page
  with no posts (decision 6), the `draft-preview.md` row, the Go tool leg (decision 14), the STATUS
  exception, `--diff-filter=M`, the `live-account` note, the PR #251 recapture standing answer,
  the scanner's void, SVG, and comment cases, and the review floor.
