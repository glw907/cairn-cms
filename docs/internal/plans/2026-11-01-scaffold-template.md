# Scaffold template pass plan

Initiative: none. A cairn-only pass; this plan lives on its branch and is deleted at close.
Design: `docs/internal/plans/2026-11-01-scaffold-pass-design.md`, a verbatim copy, approved by Geoff on
2026-11-01: "design and scaffold-setup's merge are pre-approved".
Risk class: `ordinary`. Not `live-account`.
Repo: glw907/cairn-cms. Main checkout `/var/home/glw907/Projects/cairn-cms`. Push target
`glw907/cairn-cms`. Branch `scaffold-template`, worktree
`/var/home/glw907/Projects/cairn-cms/.claude/worktrees/scaffold-template`, PR base `main`.
Executor: `cairn-cms-scaffold-template`, Sonnet at medium. Pairs go to `cairn-implementer`.
Path estimate: 115 minutes (design 110, ceiling 220). Review: mechanics lens, folded by the planner.

Cleared items: #45, #59, #121, #152, #154, #158. Nothing bumps or publishes.

## Pre-flight

None from Geoff. Launch checks, run by the planner: PR #170 merged, main checkout on `main` with
`rev-list --count HEAD..origin/main` at 0, `.claude/worktrees/` ignored, no process on this worktree.

## Read this first

The design's "Scope", "Parallel run", and "Standing answers" sections govern. These findings from
planning settle what the design marked unverified, and each one binds the tasks below.

- `examples/showcase/src/theme/components/ArticleView.svelte:22,103` is the only `CairnHead` mount.
  `(site)/+page.svelte:44-46` sets only a `<title>`, so #158 adds a head and nothing competes with it.
- `buildSiteDescriptors` and `buildSitemapView` are both exported from `@glw907/cairn-cms/delivery`
  (`src/lib/delivery/data.ts:57,63`), so the sitemap route needs no new import path.
- `src/content/pages/about.md` declares `robots: noindex` in the showcase and in Waymark, so `/about`
  leaves both sitemaps. That is the intended behavior, and the e2e check uses it as its fixture.
- `pages` declares `robots` and `posts` does not. A post's `robots` frontmatter is dropped by
  validation, so the sitemap, like the head, honors `robots` only where the fieldset declares it.
- `scripts/checks/gate-table.json` maps e2e specs and sits on the `runner` map. A new spec file would
  need a row there and lift this pass's class. Add the e2e cases to `markdown-twin.spec.ts`, which
  already covers noindex delivery. Touch no path under `scripts/checks/`.
- `packages/create-cairn-site/scripts/emit-template-dir.mjs` runs the bake, and the bake runs
  `pruneShowcaseOnlyPackageFields`. Adding to `PRUNED_SCRIPTS` therefore removes the script from
  `templates/waymark/package.json` by emit as well.
- `src/tests/unit/packaging-guidance.test.ts:85` pins `check:cairn:rendered` in the snippet's keys, and
  the design's table omits that file. T2 edits it.
- `references/public-routes.md:73` says noindex entries "still appear in the sitemap and feeds". After
  #152 that holds only for feeds. T3 edits it too; the design named only about line 55.

## Rules for every task

- Run the setup command from `cairn-running-passes` in each new worktree.
- After each task: `npm run lane:fast -- --range <base>..HEAD`, through `cairn-run-gate` per
  `cairn-pass`. `RUN_GATE_IF_BUSY=defer` is allowed on this pass. Gates share the heavy lane with the
  media and setup passes, so waiting is normal.
- Any showcase source change runs `npm run emit:template` and commits `templates/waymark/**`.
- Write the clock file per `pass-core` "Clock stop" with the estimate below.
- Scope stays as listed. Found work goes to `BACKLOG.md` through `/standards:log-issue`.

## Tasks

### Pair 1 (path 60, the larger of the two)

Commit the plan, then run T1 and T2 as a pair with `isolation: "worktree"`, descriptions
`scaffold-template task T1` and `scaffold-template task T2`. Merge both, run the fast lane, push, and
open the draft PR. T1 changes no skill, so the two tasks' emitted output stays disjoint.

**T1. Sitemap and home head (#152, #158). `ordinary`. 60 minutes.**

- Outcome: a scaffolded sitemap uses `updated` and leaves out noindex entries, and the home page has a
  full head.
- Files: `src/lib/delivery/views.ts`, `src/tests/unit/delivery-views.test.ts`,
  `examples/showcase/src/routes/sitemap.xml/+server.ts`,
  `examples/showcase/src/routes/(site)/+page.server.ts`,
  `examples/showcase/src/routes/(site)/+page.svelte`, `examples/showcase/e2e/markdown-twin.spec.ts`,
  and `templates/waymark/**` by emit.
- Shape: `buildSitemapView` keeps its signature and skips an entry whose `readSeoFields` robots carries
  `noindex`, reading the entry through the concept index's `byId`, matching `isNoindex` in
  `src/lib/delivery/public-routes.ts`. Update its doc comment. The route calls it with
  `buildSiteDescriptors(cairn, siteConfig)`, `siteMeta.origin`, and `['/']`. The home load returns
  `seo` from `buildSeoMeta` with title, description, `canonicalUrl` of origin plus `/`, `siteName`,
  `type: 'website'`, and `feeds`, from `publicRoutesConfig`. The page replaces its `<title>` with
  `<CairnHead seo={data.seo} />`. Pass no image; the design leaves `defaultImage` unset.
- Test: in `delivery-views.test.ts`, a noindex entry is absent, and an entry with `updated` reports it
  as `lastmod`. In `markdown-twin.spec.ts`, `/sitemap.xml` lists `/` and not `/about`, and the home
  page has a `meta[name="description"]`, a `link[rel="canonical"]` ending in the origin's `/`, an
  `og:title`, and exactly one `<title>`.
- Acceptance: the unit test fails on the base commit's `views.ts`. `npm run check:surface` reports no
  change. Run that e2e file once locally if the heavy lane is free; CI is its home otherwise.

**T2. Template honesty (#45, #154, #59, #121). `ordinary`. 55 minutes.**

- Outcome: a fresh site stops shipping a dead social image, a gate it can't run, a silent empty feed,
  and stale comments.
- Files: `examples/showcase/src/chassis/{feed-items.ts,feed-items.test.ts,public-routes.ts,README.md}`,
  `examples/showcase/src/theme/theme.css`,
  `examples/showcase/src/routes/(site)/styleguide/+page.svelte`,
  `packages/create-cairn-site/scripts/bake-template.mjs`, `claude/snippets/check-cairn.json`,
  `claude/CLAUDE.md`, `skills/cairn-extending-a-site/references/audit.md`,
  `src/tests/unit/packaging-guidance.test.ts`, and `templates/waymark/**` by emit.
- Shape:
  - #45: `feedItemsFrom` throws when `site.concept('posts')` is absent, naming the concept and saying
    what to change.
  - #154: drop the `defaultImage` line in `chassis/public-routes.ts:18`, and the mention at `:2` if it
    now misstates the file.
  - #59: fix `theme.css:58,66,126` and styleguide `:13,:105`. A site has no `check:public-tokens`
    script, so name what a site has or describe the check with no script name. "About fourteen" counts
    twelve values. Bring the chassis README's `content.ts` row in line with the real importers.
  - #121: add `check:cairn:rendered` to `PRUNED_SCRIPTS`, drop it from the snippet, and reword
    `claude/CLAUDE.md:33` and `audit.md:123` so `cairn-audit --rendered` stays documented as a command a
    developer runs by hand. `examples/showcase/package.json` keeps its script.
- Test: `feed-items.test.ts` gains a case where `concept` returns undefined and asserts a rejection
  naming `posts`. `packaging-guidance.test.ts` drops the key from both lists.
- Acceptance, each of which can fail: `node -p "require('./templates/waymark/package.json').scripts['check:cairn:rendered']"`
  prints `undefined`. A search of `examples/showcase/src` and `templates/waymark/src` for `og/default`
  and `check:public-tokens` and `bout fourteen` finds nothing. Every file a search of
  `examples/showcase/src` shows importing `chassis/content` appears in the README's `content.ts` row.
  The bake's test passes with the longer list.

### T3. Skill references and emit (`ordinary`, 20 minutes, alone)

- Outcome: the packaged skill states what the scaffold now does.
- Files: `skills/cairn-extending-a-site/references/public-routes.md` and `templates/waymark/**` by emit.
- Shape: line 55 loses the 404 caveat, and `defaultImage` reads as optional with a file that must
  exist. Line 73 narrows to feeds. The `buildSitemapView` bullet at line 67 says it skips noindex
  entries. The home line near line 80 names the scaffold's home as the worked example.
- Acceptance: `npm run check:public-skill` and the fast lane pass, and the `.claude/` copy in
  `templates/waymark` matches.

### T4. Close (`ordinary`, 35 minutes, alone)

Run in this order.

1. Ledgers: `CHANGELOG.md` under `## Unreleased`, with `buildSitemapView` skipping noindex as a
   behavior line. `MIGRATION-NOTES.md`. Move the six items to `BACKLOG.md`'s `## Done`. Keep
   #152's feeds clause out of any new item; the design cut it.
2. Remove `docs/internal/plans/2026-11-01-scaffold-template.md` and the design copy in one commit.
3. Merge `origin/main` if it moved. A conflict in the shared list follows the design's rule: keep both
   `## Unreleased` entries, run `npm run emit:template`, rerun the fast lane. A conflict outside that
   list stops the line.
4. Mark the PR ready. Full suite green on the head (`ci-green <sha> --pr <n> --wait`).
5. Whole-branch `standards:diff-reviewer` against the design and this plan, loading
   `standards:svelte-reviewer` for the home and sitemap routes. One batched fix chain, quoting each
   finding verbatim. A second review runs only on a blocker.
6. Update `docs/STATUS.md` once, here, with this session's name and id. The next action stays as the
   other open passes left it, so keep the edit to one small hunk.
7. PR body: `## Brief`, what landed, `## Decisions`, `## Planning misses`, retried tests as flake
   evidence, and the score from `cairn-run-gate --records <toplevel> scaffold-template`.
8. Merge with `gh pr merge <n> --merge --match-head-commit <head>`. Geoff's approval quoted above is
   the merge word. Pull the main checkout per `pass-core` "Close"; with another live session there,
   report it stale in your final report and leave it.

## Standing answers

The design's "Standing answers" apply. For this pass:

| Event | Answer |
| --- | --- |
| Path over 220 | Cut #59, then #45, to the backlog and go on. Stop only if still over. |
| A cause returns after a structural fix | Escalate #59, #45, #158, or #152's noindex half in the PR and go on. #154 and #121 can't be escalated: that stops. |
| An item needs a path on the `auth-data` or `runner` map | Move that item to `scaffold-setup` by a note in the PR and in `BACKLOG.md`, and go on. |
| A test pins old copy | Change the test and list it under `## Decisions`. |
| Merge conflict with the media pass | The design's "Parallel run" rule. Outside the shared list it stops. |
| A retried test | List it as flake evidence. No stop. |
| A count cap, a clock stop | `pass-core`: a traced cause fixed inside the ceiling goes on. |

A stop not listed here writes one question to `docs/STATUS.md` on this branch, runs
`notify-send -u normal`, and tells `conductor-cairn-cms`.
