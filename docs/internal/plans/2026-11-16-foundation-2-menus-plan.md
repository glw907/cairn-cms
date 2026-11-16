# Pass foundation-2: menus

Initiative: theme-garden
Round: foundation
Pass: 2 of 6, `foundation-2` (menus), class `ordinary`, base `f2c95910e`, branch `foundation-2`

Design: `~/Projects/initiatives/theme-garden/specs/2026-11-15-foundation-design.md` ("Several
menus", "Pennant", "How it fails", "Passes" row 2, "Acceptance", "Standing answers"). Approved by
Geoff in queue document `20261115-223648-1d48b9` (2026-11-15). Earlier passes in this round:
pass 1, merged as PR #256. Its body carries no `[advisor]` line, so this plan builds on no flagged
choice.

Outcome: `editor.nav` becomes a list of menu configs. The admin shows one sidebar entry and one
editing screen for each declared menu at `/admin/nav/<name>`, and saves each menu under its key in
`site.config.yaml`. The showcase, and so the template and both catalog demos, declare Pennant's
`actions` menu on the list, so it is edited through the admin. No theme or set file changes, so
the merge publishes nothing.

Planned path: 185 minutes against the design's 120 (parking ceiling 240, standing answer 20). See
"Path".

Scope premise (`cairn-judging-scope`): the menu editor is the admin frame's own job, and the engine
already ships it bound to one menu. Lifting the bound to a list is the leanest form: no new
export, no new actor, one access rule, and one route shape. `docs/internal/engine-rulings.md`
holds no entry on nav or menus (`grep -n "^## " docs/internal/engine-rulings.md | grep -i "nav\|menu"`
prints nothing). The premise holds.

## Pre-flight

Permissions checked: read `~/.local/state/claude-denials.jsonl` on 2026-11-16. The log holds 112
rows, from 2026-11-01T00:55:05Z to 2026-11-16T19:24:52Z, all inside the 30-day window. Classes and
row counts: Classifier unavailable 44; Self-Modification 10; server classifier with no explanation
10; Interfere With Workloads 9; Destructive or Unwanted Actions 7; Merge Without Review 3;
Auto-Mode Bypass 3; Irreversible Local Destruction 2; Git Destructive 2; Create Public Surface 2;
Unverifiable Deletion Scope 2; Sensitive-Source Provenance 2; Security Weaken 2; Undermining
Oversight 2; Unauthorized Access 2; one each of Production Deploy, Secret-Store Writes, DNS /
Domain / Cert Changes, Bot Check Circumvention, Code from External, Shared Scratch Sweep, Safety
Bypass Flag, Out-of-Place Publication, PII Data Handling, Modify Shared Resources. Rows that touch
this pass's commands, with the form to use instead:

| Refused form (date, class) | This pass uses |
| --- | --- |
| `gh workflow run e2e.yml --repo glw907/cairn-cms --ref worktree-tool-fixes-run` with no input (2026-11-02, Auto-Mode Bypass, twice) | The baseline regen only, with its input and this branch: `gh workflow run e2e.yml --repo glw907/cairn-cms --ref foundation-2 -f update_snapshots=true`. The same form ran unrefused on `pennant-1` on 2026-11-15 (runs `43691961674`, `43696163070`) |
| The setup command piped to `tail` and chained with `ls` (2026-11-14, Destructive or Unwanted Actions) | The setup command alone and bare: `npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync)` |
| `pkill -f 'lane:fast'`, `kill <pid>` of test runs (2026-11-01, 2026-11-15 twice) | Never kill a process. A server the harness starts is stopped by the script that spawned it, or by `TaskStop` |
| `claude stop` chained with other commands (2026-11-10, 2026-11-13, 2026-11-16) | `claude stop <id>` alone, only for a job this session launched |
| `git push origin HEAD:main` (2026-11-10, 2026-11-15 Modify Shared Resources) | Push only `foundation-2`: `git push -u origin foundation-2` |
| `git push origin --delete <branch>` (Git Destructive) | No remote branch is deleted |
| `gh pr merge` and a `gh pr view` chained into one (2026-11-10, 2026-11-11 Merge Without Review) | Never `gh pr merge`. `conductor-foundation` lands the PR with `approval-queue land` (`approval-packet` step 1) |
| Edits to `settings.json` (Self-Modification, 10 rows) | The pass writes no Claude settings file |
| Classifier unavailable (44 rows, transient) | Retry the same command once, bare and alone |

Reviewed: one `standards:plan-reviewer` read on 2026-11-16 (a plan inside a round takes one read
whatever its class), with `planner.md` "Stops" and "Pre-flight" added to its prompt; findings
folded below (see "Review folded").

Evidence: the mechanism table and the recorded searches below.

Geoff steps: none. The pass needs no credential, no secret, no sign-in, and no permission rule.
Values the run needs: none from any store. Writes read against auto mode: files in the pass
worktree, commits and a push to `foundation-2`, one draft PR, and one `workflow_dispatch` of
`e2e.yml` on `foundation-2` with `update_snapshots=true`, whose bot commit lands on the same
branch. No write to Claude's settings, a credential file, or new public surface (no publish, no
deploy, no version bump). The launch runs from the main checkout, which sessions have opened
before, so no workspace trust prompt.

## Mechanism table

Read at `f2c95910e`.

| Mechanism | Probe or source | Result |
| --- | --- | --- |
| The menu setting's type | `src/lib/content/types.ts:327-328` `/** Which menu in the site-config YAML the nav editor manages. */ nav?: NavMenuConfig;`; `NavMenuConfig` at `:174-186` (`menuName`, `label`, `maxDepth?`), `@public`, exported at `src/lib/index.ts:35` | `nav?: NavMenuConfig[]`. `NavMenuConfig` is unchanged, so no export changes |
| The runtime field | `types.ts:453` `navMenu?: NavMenuConfig;` on `CairnRuntime`, which is `@public` (`types.ts:414`) and exported at `src/lib/index.ts:39`; `scripts/checks/api-surface.md:20` lists it | Renamed to `navMenus: NavMenuConfig[]`, always present. A second consumer-visible change, carried in the same `Consumers must:` line (Decisions 3) |
| Where the adapter is checked | The design names `defineCairn`, which does not exist. `src/lib/content/adapter.ts:38` `defineAdapter` is the build-time chokepoint; its precedent throw is `'cairn: the \`components\` key under \`rendering\` is gone. Pass your block definitions as \`blocks\`, an array.'` | The three new throws go in `defineAdapter`, in the same voice |
| The runtime is composed | `src/lib/content/compose.ts` maps `navMenu: adapter.editor?.nav` | `navMenus: adapter.editor?.nav ?? []` |
| The one path authority | `src/lib/sveltekit/admin-dispatch.ts:19` `\| { view: 'nav' }`; `:63` `if (head === 'nav') return { view: 'nav' };`; `:77` `if (RESERVED_SEGMENTS.has(head)) return null;` in the two-segment branch; `RESERVED_SEGMENTS = RESERVED_VIEW_IDS` (`:30`, from `src/lib/content/concepts.ts:29`) | One-segment `nav` returns null. A two-segment branch for `head === 'nav'` returns `{ view: 'nav', menu: <segment> }` before the reserved check. `src/tests/unit/admin-dispatch.test.ts:114` expects `/admin/nav/main` rejected today, and flips |
| The dispatcher | `src/lib/sveltekit/cairn-admin.ts:110` `const nav = runtime.navMenu ? createNavRoutes({ runtime }) : null;`; `:163-165` `case 'nav'` 404s when `nav` is null; `:273-276` `save: viewAction('save', ['edit', 'nav'], …)` calls `nav.navSaveAction`; `AdminData` `:76` `{ view: 'nav'; page: NavData }` | `nav` exists when `navMenus.length > 0`. The load and the save pass the parsed menu name on |
| The nav load and save | `src/lib/sveltekit/nav-routes.ts:78-85`: `requireEditor`, then `requireEngineAccess(runtime.access, editor, 'nav')`, then the menu lookup and `error(404, 'No navigation menu configured')`; `:166` `setMenu(raw, navMenu.menuName, tree)`; `:168` message `` `Update ${navMenu.label.toLowerCase()}` ``; commit fields `{ scope: 'nav', id: 'site-config', editor }`; `:178` `redirect(303, '/admin/nav?saved=1')` | The load and save take a menu name and look it up after the access check, so a role without `nav` gets 403 on every address. The message carries `menuName`, the redirect goes to `/admin/nav/<name>?saved=1` |
| `NavData` | `scripts/checks/api-surface.md:281` `{ menu: { name; label; maxDepth }; tree; pages; saved }`, exported as a type at `src/lib/sveltekit/index.ts:40` | Unchanged |
| The YAML reader and writer | `src/lib/nav/site-config.ts:343` `readMenu` returns `[]` for a missing key; `:355` `setMenu` uses `doc.setIn(['menus', name], tree)` | Saving `actions` writes only `menus.actions`; `primary` is carried through by the YAML document |
| The sidebar resolver | `src/lib/sveltekit/admin-nav.ts`: `ResolveNavLayoutOptions.navMenuLabel: string \| null` (`:477`); `ENGINE_SCREEN_DEFAULTS.nav` href `/admin/nav` (`:498`); `engineDefault` (`:505-512`); `engineVisible` (`:522-525`); `engineEntry` (`:528-544`); `utilityScreenOrder` (`:570-572`); `resolveDeclaredLayout` and `resolveDefaultLayout` each turn one `nav` ref into one entry | `navMenuLabel` becomes `navMenus: { name; label }[]`, and a `nav` ref expands into one `ResolvedEngineNavEntry` per menu, `screen: 'nav'`, href `/admin/nav/<name>`, in config order, in both arrangements and in `fallback` |
| The layout check | `admin-nav.ts:248` `navMenuConfigured: boolean`; `:283-284` the throw `'navLayout: screen "nav" is referenced but no navMenu is configured; set editor.nav (a NavMenuConfig) on the adapter, or drop the "nav" screen from navLayout'` | `navMenuCount: number`. The message names the list. A `label` on a `nav` ref throws when more than one menu is declared (Decisions 6) |
| The two callers | `src/lib/sveltekit/content-routes-context.ts:365` `navMenuConfigured: runtime.navMenu !== undefined`; `src/lib/sveltekit/content-routes-shell.ts:203` `navMenuLabel: runtime.navMenu?.label ?? null` | Each passes the list's count or names |
| The shell's active state and icons | `src/lib/admin/CairnAdminShell.svelte` `isActive(href)` matches exactly or as a `/` prefix; items keyed by index; icon from `ENGINE_NAV_ICONS[node.screen]` | `/admin/nav/primary` and `/admin/nav/actions` never match each other. Both entries take the `nav` icon |
| The breadcrumb | `CairnAdminShell.svelte:501-521`: segment 2 is looked up as a concept or a site entry (`flattenSiteEntries` skips engine doors), else the raw segment, linked to `/admin/<seg>`; a third segment is pushed as an id crumb; `pageTitle` is the deepest crumb (`:524`) | At `/admin/nav/actions` the trail would read `nav` (linking to a 404) then `actions`, and the tab would read `actions`. Fixed in Task 3 |
| The nav screen | `src/lib/admin/NavTree.svelte` posts to the relative `?/save`, titles the page `PageHeader eyebrow="Settings" title={data.menu.label}`; `CairnAdmin.svelte:107` renders the view | Unchanged: a relative action posts to `/admin/nav/<name>?/save` |
| Where Pennant's `actions` is declared | `sets/organization/src/site/site.config.yaml` holds `menus.actions` (Join the society, Contact us); `themes/pennant/components/SiteHeader.svelte:53-55` renders the first link with a url; `examples/showcase/src/routes/+layout.server.ts:24` reads `readMenu(siteConfig, 'actions', 1)`. No theme or set holds a `cairn.config.ts`: `git grep -l "editor" -- themes/pennant sets/organization` finds no adapter | The showcase's `cairn.config.ts` governs every Pennant site's admin |
| Why the showcase config is the Pennant config | `scripts/theme/viewer/site.mjs:135-143` `composeSite` copies the showcase, removes the `.cairn-template.json` paths, strips marked blocks from `site.config.yaml` only, then the set's `site.config.yaml` lands over it; `templates/waymark` is `npm run emit:template` of the showcase | Declaring `actions` in the showcase's list (outside any exclude block) puts it in the template and in both demos |
| The showcase's menus today | `examples/showcase/src/site/site.config.yaml` declares `menus.primary` and `menus.footer`; `actions` exists only as a comment; its comment says `/admin/nav` edits only `menus.primary`. The template copy says the same | Saving no YAML change keeps public output equal; the two comments are corrected (Task 4) |
| The showcase's adapter | `examples/showcase/src/site/cairn.config.ts:219-224` and `templates/waymark/src/site/cairn.config.ts:182-187` `editor: { nav: { menuName: 'primary', label: 'Navigation', maxDepth: 2 }, navLayout: [...] }`; the `navLayout` places `{ screen: 'nav' }` with no relabel | The list holds `primary` then `actions` |
| The dev backend's commit recorder | `packages/cairn-cms-dev/src/fake-github.ts`: `RecordedCommit { path; branch; author; committer; content }`, no message; `/test/last-commit`; the store is a module singleton per server process | The e2e checks the committed content. The menu name in the message is a unit test on `nav-routes` |
| The dev backend's session | The dev backend mints an owner session (`examples/showcase/src/site/cairn.config.ts` comment beside the excluded access map) | The 403 on every menu address is a unit test with a role lacking `nav` |
| E2E state between specs | `examples/showcase/playwright.config.ts`: `workers: 1`, `fullyParallel: false`; the zero-state server runs on port `+2` with `CAIRN_DEV_CONTENT:empty` and its own store | A save of `actions` on the main server can't reach the zero-state baselines. Only `admin-visual.spec.ts` and `refused-forms.spec.ts` name `/admin/nav` |
| Visual baselines are CI-canonical | `.github/workflows/e2e.yml:11-14` `update_snapshots` input; `:144-148` runs `admin-visual.spec.ts` and `site-visual.spec.ts` with `--update-snapshots`; `:153-161` commits both snapshot folders back as `github-actions[bot]` with `chore(e2e): regenerate the admin-visual and site-visual baselines`, after `git pull --rebase` | Admin baselines change (the sidebar gains an entry, the zero-nav path moves). One dispatch regenerates them. A push by `GITHUB_TOKEN` starts no workflow, so a later commit of ours runs CI on the head |
| The release size | `CHANGELOG.md` `## Unreleased` already carries `<!-- release-size: minor -->`; `cairn-releasing` SKILL.md:112-117: in `0.x` a breaking change is a minor | The marker stays. No edit |
| The `Consumers must:` shape | `CONTRIBUTING.md:154-156`: alone on one physical line, at column 0 or two spaces | One line, two spaces, under the bullet |

## Recorded searches

| Search (at `f2c95910e`) | Hits | Disposition |
| --- | --- | --- |
| `git grep -n "editor\.nav\|navMenu\b\|navMenuLabel\|navMenuConfigured" -- src/lib` | 7 files | `content/{types,compose,adapter}.ts`, `sveltekit/{admin-nav,cairn-admin,content-routes-context,content-routes-shell,nav-routes}.ts`: all in the row, all changed in Tasks 1 to 3 |
| `git grep -ln "navMenu\|navMenuLabel" -- src/tests` | 15 | Unit: `cairn-admin-actions`, `cairn-admin-load`, `content-routes-layout`, `content-routes-settings`, `content-routes-vocabulary`, `nav-layout-resolve`, `nav-layout-validate`, `nav-routes-load`, `nav-routes-save`, `site-config-path`. Integration: `one-map-four-readers`. Component: `CairnAdminShell`, `admin-compiled-sheet-guard`, `admin-layout-help-nav`, `admin-shell-theme-override`. Each moves to `navMenus` with the task that changes its subject |
| `git grep -n "admin/nav" -- examples/showcase/e2e` | 2 files | `admin-visual.spec.ts:717` (zero-state path) and `refused-forms.spec.ts` (eight `/admin/nav` uses at `:61`, `:167`, `:195`, `:203`, `:214`, `:218`, `:226`, `:265`, and `isAction(url, '/admin/nav', 'save')`). Both move to `/admin/nav/primary` (Task 4) |
| `git grep -n "'Navigation'" -- examples/showcase/e2e` | 1 | `admin-nav-layout.spec.ts:29`: the Site section's links gain `Action links` after `Navigation` |
| `git grep -n "editor\.nav\|admin/nav" -- skills` | 4 lines in 2 files | `cairn-extending-a-site/references/public-routes.md:185,193` and `cairn-building-admin-screens/references/sidebar-and-access.md:125,178`. Corrected in Task 5 |
| `grep -n "nav\b\|editor\.nav\|admin/nav\|menu" skills/cairn-building-admin-screens/SKILL.md` | 0 on the setting | `SKILL.md` names `editor.navLayout` in its description and no menu setting. Acceptance item 9 counts it among the three; Task 5 reads it again and states the outcome (Decisions 9) |
| `git grep -n -i "menu\|navigation\|editor\.nav\|admin/nav" -- docs/editors docs/admin docs/why-cairn.md` | 11, none on the menu editor | Every hit is the editor's More actions or More formatting menu. No page describes the menu editor, so no docs page changes (the `docs-with-code` rule's search, shown here) |
| `git grep -n "admin/nav" -- themes scripts/theme/fixtures` | 5 | Comments in `themes/waymark/components/SiteFooter.svelte:16`, `SiteHeader.svelte:14`, `themes/pennant/components/SiteFooter.svelte:15`, and the `options-theme` fixture's two copies. A theme edit raises its version, so these are filed through `standards:log-issue` (Decisions 10) |
| `git grep -n "admin/nav" -- src/lib/nav scripts/checks ROADMAP.md` | 3 | `src/lib/nav/site-config.ts:2` (comment, Task 2); `scripts/checks/check-self-use-allowlist.json:36` `NavMenuConfig` reason (Task 5); `ROADMAP.md:1807-1810`, "The second-menu editing question", which this pass answers (Task 5, Decisions 11) |
| `git grep -n "editor: {" -A3 -- '*cairn.config.ts' ':!templates'` and the same in `templates/` | 2 | The showcase's and the template's adapters; no other config in the repo declares `editor.nav` |
| `grep -n "^## " docs/internal/engine-rulings.md \| grep -i "nav\|menu"` | 0 | No ruling to read |
| `git grep -n "nav" -- skills/cairn-extending-a-site/references/log-events.md` | 3 rows | `commit.succeeded` `scope` `nav`, `config.invalid` and `config.missing` `scope` `nav`. The scope stays `nav`, so no row changes |

## Rulings and standing answers

The twelve standing answers in `round-run.md` hold, with the design's 13 to 20. The ones this
pass can meet:

- 14: a needed `src/lib/**` file outside the row parks the pass. Every `src/lib` file this plan
  changes sits under `content/`, `nav/`, `sveltekit/`, or `admin/`, all in the row.
- 15: a pixel or public-output difference is fixed at its cause, never by a new baseline. This
  governs the public pages. The admin baselines change by design and are regenerated on CI
  (Task 8), and the regen commit touches no `site-visual` PNG.
- 18: plan against the files as merged. Done at `f2c95910e`, which is main after PR #256.
- 19: a needed change under `.github/**`, `scripts/release/**`, or `.claude/settings*` is left
  alone and recorded for the round's `merge` document. None is foreseen. The regen dispatch
  uses `e2e.yml` as it stands.
- 20: over 240 path minutes at planning parks (twice the design's 120). 185 planned.

The run's ceilings are the ones the design names: the round stops new launches past 1,380 path
minutes, and the usage ceiling is 85 percent of the weekly allowance. Retries go on while each
fixes a traced cause, as `planner.md` "Stops" says, until one of those is reached.

Every other stop the run meets goes through `advisor.md`. The ones foreseen:

| Stop | Answer |
| --- | --- |
| The regen dispatch is refused | Use the alternative once (standing answer 2): send `conductor-foundation` one message asking it to run the same command, and wait for the bot commit. A second refusal flags Task 8 and the pass goes on with the rest, the PR stating that the admin baselines are not regenerated |
| The regen's bot commit changes a `site-visual` PNG | A visitor-visible change. Trace it to its cause and fix the cause, then dispatch again (standing answer 15). Never keep the changed site baseline |
| A CI run fails in a job this pass didn't touch | Re-run once; a repeat goes to the advisor, and a real regression is fixed at cause |
| The `catalog` workflow's proving job fails on this PR | Read its log. A failure in code this pass changed is fixed; a Cloudflare 403 parks the pass. Never widen a token or try another credential |
| A unit test outside the recorded list builds `navMenu` | Move it to `navMenus` in the task that meets it; `src/tests/**` is in reach (Decisions 2) |
| The whole-branch review asks for work outside the row | `standards:log-issue`, listed in the PR body |
| A theme or set file would change | Stop that edit. Pass 2 changes nothing under `themes/` or `sets/<kind>/` |

## Acceptance

Every pass:

- CI is green on the head commit, and the whole-branch review is accepted with no open finding.
  - Task 8: `ci-green <sha> --pr <n> --wait` exit 0 on the head commit; the
    `standards:diff-reviewer` whole-branch verdict `accept` quoted in the PR.
- The built showcase, the Waymark demo, and the Pennant demo show no visitor-visible change. A
  fresh `standards:visual-verifier` compares each of the home page, a post, a plain page, and the
  archive at the five widths with the same page built from the pass's base commit, and returns no
  difference.
  - Tasks 0 and 6: 60 base/head screenshot pairs, the pixel compare's count, and the three
    verifiers' verdicts quoted in the PR.
- The showcase's built public output (every prerendered page, the feeds, the sitemap, and
  `robots.txt`) equals the base commit's, file for file, once hashed asset names are replaced
  with a fixed token. The PR lists any file that differs, with the reason.
  - Tasks 0 and 6: the normalized hash list diff, pasted in the PR.

Pass 2:

- `editor.nav` is typed as a list. Today: `src/lib/content/types.ts` line 328 reads `nav?: NavMenuConfig;`.
  - Task 1: `git grep -n "nav?: NavMenuConfig\[\]" HEAD -- src/lib/content/types.ts` prints the
    line; `scripts/checks/api-surface.md` shows `nav?: NavMenuConfig[]` after
    `npm run check:surface -- --update`.
- With two menus declared, an end-to-end test opens each menu's admin screen by name, adds a link to the second, saves, and finds the link under that menu's key in the committed `site.config.yaml`, with the first menu unchanged.
  - Task 4: `examples/showcase/e2e/nav-menus.spec.ts`, green in the PR's CI e2e job (named in
    the PR with the run id).
- The admin sidebar lists one entry for each declared menu, in the config's order.
  - Task 3: `nav-layout-resolve.test.ts` cases for the declared and default arrangements and the
    fallback; Task 4: `admin-nav-layout.spec.ts` expects `Navigation` then `Action links`; Task 6:
    the rendered sidebar graded by the verifier.
- An address for a menu the config doesn't declare returns 404.
  - Task 2: `cairn-admin-load.test.ts` with `/admin/nav/nope` and bare `/admin/nav`;
    Task 4: `nav-menus.spec.ts` asserts the 404 status of `/admin/nav/nope`.
- A unit test for each of the last two rows of "How it fails" asserts the thrown line.
  - Task 1: `define-adapter-nav.test.ts` asserts the exact single-object, duplicate-name, and
    over-eight messages (the single-object row is the third-to-last, and is tested too).
- The showcase declares its menus as a list. Its fixture declares a second menu, which the end-to-end test above edits. Every config in the repo that declares Pennant's `actions` menu has it on the list, and `git grep` finds no `editor.nav` given as one object.
  - Task 4: `git grep -n -A2 "nav: {" HEAD -- '*.ts' '*.md'` finds no adapter or skill example
    of the single form (the PR pastes the command and its output), and the showcase and template
    `cairn.config.ts` list `primary` then `actions`. Three hits are expected to remain and are not
    the single form: `src/lib/sveltekit/admin-nav.ts:498` (the engine screen defaults),
    `src/tests/component/CairnAdmin.test.ts:24`, and `src/tests/unit/site-config-path.test.ts:44`
    (an `@ts-expect-error` case that still errors), plus the "before" sample in the new
    `MIGRATION-NOTES.md` entry. Leave them.
- A user whose role lacks the `nav` rule gets 403 on every menu's address, and a commit from the second menu's screen carries that menu's name in its message.
  - Task 2: `cairn-admin-load.test.ts` and `cairn-admin-actions.test.ts` with a role lacking
    `nav`, for the load and the save at `/admin/nav/primary` and `/admin/nav/actions`;
    `nav-routes-save.test.ts` asserts the commit message for `actions` contains `actions`.
- `CHANGELOG.md` carries a `Consumers must:` line for the change, and `MIGRATION-NOTES.md` shows the before and after.
  - Task 5: the bullet and line quoted in the PR; `npm run check:docs-gate` passes.
- The three packaged skill files that name the menu setting describe the list. Today: `cairn-building-admin-screens/SKILL.md`, its `references/sidebar-and-access.md`, and `cairn-extending-a-site/references/public-routes.md` name the single form.
  - Task 5: the edited lines quoted in the PR; `npm run check:template` passes after
    `npm run emit:template`.

## Skills the executor loads

`cairn-pass`, `pass-core` (`references/executor.md`, `references/round-run.md`,
`references/advisor.md`), `cairn-running-passes`, `cairn-judging-scope`,
`cairn-writing-engine-code`, `cairn-following-admin-design` (Task 3's shell change),
`standards:svelte-conventions` and `standards:ts-conventions` (comments in `.svelte` and `.ts`),
`standards:daisyui` (the shell markup), and `cairn-writing-docs` (Task 5). Voice:
`~/.claude/docs/voice/written-for-people.md`.

## Tasks

The worktree is `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/foundation-2`. After each
task, run the fast lane: the legs `node scripts/checks/gate-tier.mjs --fast --range f2c95910e..HEAD`
prints, each through `cairn-run-gate`. Tasks 1, 2, and 3 run in order (each builds on the last's
types). Task 4 and Task 5 run as a pair once Task 3 lands. Task 7 (the review) runs before Task 8 (the regen), so the regen follows the last admin change.

Push once Task 1 lands, which opens the draft PR, and push after each task after it. In the PR's
e2e job, the `admin-visual.spec.ts` snapshot comparisons are red by design from Task 2 (the
zero-nav screen's crumb and path change) until the Task 8 regen, and Task 4 adds the sidebar's
second entry to every desktop shot. Read a red e2e run's failed tests: a failure in any other
spec, or in any other job, is real and stops the line.

The admin menu labels used throughout: `primary` is `Navigation` (unchanged), and `actions` is
`Action links` with `maxDepth: 1` (Decisions 4).

### Task 0: base build (25 min)

Before any edit, run the setup command bare, then `npm run package`. Build the base outputs into
`$CLAUDE_JOB_DIR/tmp/parity/base/`:

1. `npm --prefix examples/showcase run build`, then copy `examples/showcase/.svelte-kit/cloudflare`
   to `parity/base/showcase`.
2. Waymark's demo as the publish job builds it, with no set:
   `DEMO_WORKER=cairn-demo-{id} DEMO_ORIGIN=https://{id}.example node scripts/catalog/demo.mjs themes/waymark --out "$CLAUDE_JOB_DIR/tmp/parity/base/waymark"`.
3. Pennant's demo over its set, which the CLI can't pass: a `node --input-type=module -e` that
   imports `buildDemo` from `scripts/catalog/demo.mjs` and calls it with `root` the worktree,
   `themeDir` `themes/pennant`, `set` the absolute `sets/organization`, the same worker and origin
   forms, and `out` `$CLAUDE_JOB_DIR/tmp/parity/base/pennant`.

Write `$CLAUDE_JOB_DIR/tmp/parity/serve.mjs`, a static server of about 20 lines that answers a
path from `<p>`, `<p>.html`, or `<p>/index.html` under a directory it is given, bound to
127.0.0.1. Read the built pages to pick, for each site, the home page, one post, one plain page,
and the archive, and write the 12 URLs to `parity/pages.txt`, one `<site> <page> <path>` per line.
Write `parity/shoot.mjs <dir> <port-map> <out>`: it imports `chromium` from the repo's
`playwright`, and for each line and each width of 320, 390, 768, 1440, and 2560 opens a fresh page
at that width and a height of 900, goes to the URL with `waitUntil: 'networkidle'`, awaits
`document.fonts.ready`, and saves a full-page screenshot to `<out>/<site>-<page>-<width>.png`.
Task 6 runs the same script with the same arguments. Write `parity/compare.mjs base head`: with
`pngjs` from the root `node_modules`, it decodes each pair and prints `same` or
`differs (<w>x<h> vs <w>x<h>, <n> pixels)` per file, and a count.

Write `parity/hash.mjs`: walk a directory and hash only the acceptance item's set, which is every
prerendered `.html` page, the feeds, `sitemap.xml`, and `robots.txt`. Skip `_worker.js`, every
server chunk, and the `_app/immutable` client chunks. The admin client page
(`examples/showcase/src/routes/admin/[...path]/+page.svelte:10`) imports `cairn.config.ts`. This
pass changes that file, and those chunks are not public output. In each hashed
file's contents, replace hashed asset names
(`[.-][A-Za-z0-9_-]{8,}\.(js|css|woff2|svg|png|webp|avif|json)`), the `__sveltekit_<id>` global, and
the app version string with fixed tokens, so a renamed admin chunk named in a page's preload list
doesn't count as a difference. Print `sha256 path` per file, sorted by path and then hash. Run it on
`parity/base/showcase` into `parity/base/showcase.hashes`.

Write `parity/shoot-admin.mjs <out> [--with-link]`: it runs `VITE_CAIRN_E2E=1 npm run build` in
`examples/showcase`, spawns
`npx wrangler dev --ip 127.0.0.1 --port 4291 --inspector-port 4292 --var CAIRN_DEV_BACKEND:1 --var PUBLIC_ORIGIN:http://127.0.0.1:4291`
as a child process (Playwright's command at `playwright.config.ts:53` plus `--ip`), waits for
`http://127.0.0.1:4291/` to answer, shoots, and stops the child from inside the script in a
`finally`. The dev backend's session is seeded by `hooks.server.ts`, so no sign-in step is needed;
a shot of a sign-in page means the server is wrong. If the port is in use or a page shows another
build, pick two other free ports and rerun once. At the base it shoots `/admin/nav` and
`/admin/posts` at the five widths, light theme (the `cairn-admin-theme` cookie set to
`cairn-admin`, as `admin-visual.spec.ts` does), into `parity/base/admin/`. These are the reference
for Task 6's admin read. With `--with-link`, before shooting a nav screen it clicks the first
`Add item` button and fills the new row's `input[aria-label="Label"]` with `Visit us` and its URL
field with `/about`, without saving (the selectors `refused-forms.spec.ts:42-54` uses).

### Task 1: the type, the runtime, the adapter's throws, and the readers (25 min)

1. `src/lib/content/types.ts`: `nav?: NavMenuConfig[]`, its doc comment saying it lists the menus
   the admin edits, each at `/admin/nav/<menuName>`, in sidebar order, at most 8. `CairnRuntime`'s
   `navMenu?` becomes `navMenus: NavMenuConfig[]` (empty when the adapter declares none), with its
   doc comment. Both keep their tier tags.
2. `src/lib/content/compose.ts`: `navMenus: adapter.editor?.nav ?? []`.
3. `src/lib/content/adapter.ts` `defineAdapter`, after the `components` check, three throws, each
   one line:
   - `editor.nav` given and not an array:
     ``cairn: `editor.nav` is now a list of menus. Wrap the object in brackets: `nav: [{ menuName: 'primary', label: 'Navigation' }]`.``
   - two entries share a `menuName`:
     ``cairn: `editor.nav` declares the menu "<name>" twice. Give each menu its own `menuName`.``
   - more than 8 entries:
     ``cairn: `editor.nav` declares <n> menus, and the limit is 8. Remove a menu or edit it in `site.config.yaml`.``
   `defineAdapter`'s `@throws` doc comment (`adapter.ts:30-33`) adds the three cases.
4. `src/tests/unit/define-adapter-nav.test.ts` (new): asserts each exact message with
   `toThrow(<string>)`, plus that a list of 8 distinct menus passes.
5. Move the four readers of `runtime.navMenu` to the list in the same commit, reading
   `runtime.navMenus[0]` so behavior holds until Tasks 2 and 3 replace them: `nav-routes.ts`,
   `cairn-admin.ts:110` (`runtime.navMenus.length > 0`), `content-routes-context.ts:365`, and
   `content-routes-shell.ts:203`. The fast lane runs `npm run check` over the engine, so a rename
   that leaves a reader behind fails this commit.
6. Wrap the showcase's `editor.nav` in brackets (`examples/showcase/src/site/cairn.config.ts:219-224`,
   `nav: [{ menuName: 'primary', label: 'Navigation', maxDepth: 2 }]`), then run
   `npm run emit:template` and `npm run check:template`. Without it, the new throw stops every
   showcase build and e2e run until Task 4.
7. Move every unit and component test that builds `navMenu` to `navMenus`, so the fast lane is
   green on this commit. Where a test covers a subject Task 2 or 3 changes, change only the field
   it sets; the new cases come with that task.

### Task 2: the route, the load, and the save (25 min)

1. `admin-dispatch.ts`: the `nav` view becomes `{ view: 'nav'; menu: string }`. The one-segment
   `nav` branch goes. In the two-segment branch, `head === 'nav'` returns
   `{ view: 'nav', menu: <segment> }` before the reserved check. The segment is already decoded
   (`admin-dispatch.ts:53`, inside the try that returns null on malformed encoding), so decode it
   no further: a second decode turns `/admin/nav/%25` into a thrown `URIError` and a 500. A third
   segment returns null. Flip `admin-dispatch.test.ts:114` and add the bare-`/admin/nav` null case.
2. `nav-routes.ts`: `navLoad(event, menuName)` and `navSaveAction(event, menuName)`, and the
   internal `NavRoutes` interface (`:188-191`, not exported) carries the new signatures. Each keeps
   `requireEditor` and `requireEngineAccess(runtime.access, editor, 'nav')` first, then finds the
   menu in `runtime.navMenus` by `menuName` and throws `error(404, 'Not found')` when none matches.
   The save commits `setMenu(raw, menu.menuName, tree)` with the message
   `` `Update the ${menu.menuName} menu` ``, keeps
   `commitFields = { scope: 'nav', id: 'site-config', editor }`, and redirects to
   `` `/admin/nav/${encodeURIComponent(menu.menuName)}?saved=1` ``. The file's head comment and
   doc comments say one route per menu.
3. `cairn-admin.ts`: `const nav = runtime.navMenus.length > 0 ? createNavRoutes({ runtime }) : null;`.
   The `nav` load and the `save` action pass `view.menu`. Doc comments at about `:386` and `:395`
   that name `navMenu` follow the rename.
4. Tests:
   - `nav-routes-load.test.ts` and `nav-routes-save.test.ts`: two menus; each loads its own tree;
     a save of `actions` writes `menus.actions`, leaves `menus.primary` byte-equal, and its
     message contains `actions`; an undeclared name 404s; the none-capability 403 case
     (`nav-routes-load.test.ts:145`) runs for both names and for an undeclared one (403 first).
   - `cairn-admin-load.test.ts`: real pathnames `/admin/nav/primary`, `/admin/nav/actions`,
     `/admin/nav/nope` (404), `/admin/nav/%25` (404), `/admin/nav` (404). The 403 fixture is
     `access: { nav: ['owner'] }` with a session `{ role: 'editor', capability: 'editor' }`, and
     both declared addresses answer 403. `canReach` (`src/lib/auth/access.ts:179`) admits an
     editor to any target the map doesn't name, so a map with no `nav` key would admit this
     session; the fixture must name `nav`. The `capability: 'none'` case stays as its own test,
     since it 403s earlier, in `requireEditor`.
   - `cairn-admin-actions.test.ts:556`: the save at `/admin/nav/actions` with the same fixture
     answers 403, and with an owner redirects to `/admin/nav/actions?saved=1`.
5. Move the two e2e specs that name the old address with the route, so the e2e job stays
   runnable: in `refused-forms.spec.ts`, every `/admin/nav` becomes `/admin/nav/primary`, and
   `isAction(url, '/admin/nav/primary', 'save')`; in `admin-visual.spec.ts:717`, the zero-state
   path becomes `/admin/nav/primary`, and the baseline file name stays `admin-zero-nav-*`.
6. `src/lib/nav/site-config.ts:2`: the comment says each menu is edited from `/admin/nav/<name>`.
   `examples/showcase/src/site/site-config.ts:18-27`'s comments (`editor.nav.maxDepth`, and
   "`/admin/nav` edits only `menus.primary`") say the same of the list; the template copy follows
   through `npm run emit:template` in Task 4.

### Task 3: the sidebar, the layout check, and the crumb (25 min)

1. `admin-nav.ts`:
   - `ResolveNavLayoutOptions.navMenuLabel` becomes `navMenus: { name: string; label: string }[]`.
   - `engineVisible('nav')` is false when the list is empty.
   - A `nav` reference, declared or default, resolves to one `ResolvedEngineNavEntry` per menu,
     `screen: 'nav'`, `label` the menu's label, href `/admin/nav/<encoded name>`, in config order.
     A declared `icon` applies to each. `resolveDeclaredLayout`'s `resolveChild` returns a list for
     `nav`, and the section and top-level loops spread it; `fallback` and `resolveDefaultLayout`
     do the same through one helper. `utilityScreenOrder` keeps one `nav` slot.
   - `ENGINE_SCREEN_DEFAULTS.nav` loses its href; the per-menu href is built in the helper.
   - `validateNavLayout`'s `navMenuConfigured` becomes `navMenuCount`. The no-menu message becomes
     `'navLayout: screen "nav" is referenced but editor.nav declares no menu; add a menu to editor.nav, or drop the "nav" screen from navLayout'`.
     A `label` on a `nav` reference with more than one menu throws
     `'navLayout: screen "nav" places 2 or more menus, so it takes no label; set each menu's label in editor.nav'`.
   - Doc comments that say `navMenu` follow the list.
   - `validateEntry` (`:97-110`) runs a site entry's href through `parseAdminPath`. After Task 2, a
     site entry at `/admin/nav/<anything>` throws as a collision, and bare `/admin/nav` passes and
     links to a 404. Both follow from the route and stay; add a `nav-layout-validate.test.ts` case
     for each, and Task 5's MIGRATION-NOTES entry says a site entry at bare `/admin/nav` now 404s.
2. `content-routes-context.ts:365` passes `navMenuCount: runtime.navMenus.length`;
   `content-routes-shell.ts:203` passes `navMenus: runtime.navMenus.map(({ menuName, label }) => ({ name: menuName, label }))`.
3. `CairnAdminShell.svelte` crumbs: when segment 1 is `nav` and segment 2 is present, the trail is
   one crumb, labeled by the resolved sidebar entry whose href equals `/admin/nav/<segment 2>`
   (engine entries included), falling back to the decoded name, so the tab title reads the menu's
   label. Every other path keeps today's trail.
   The command palette's `{#each paletteResults as cmd, i (cmd.label)}` (`:985`) is keyed by
   label. A menu labeled like another entry ("Tags") would give a duplicate key, and Svelte's
   `each_key_duplicate` stops the whole shell rendering. Key it by `cmd.href` instead (Decisions
   14).
4. Tests: `nav-layout-resolve.test.ts` (two menus in a declared section, at top level, in the
   default arrangement, in `fallback`, an icon override on both, and the none-capability drop);
   `nav-layout-validate.test.ts` (both new messages exactly, and a relabel with one menu still
   passing); `CairnAdminShell.test.ts` (the crumb and `pageTitle` at `/admin/nav/actions`, and
   two `nav` entries each active on its own path). The four component tests that build the
   shell's options take the `navMenus` field.

### Task 4: the showcase, the template, and the e2e (pair, 25 min)

1. `examples/showcase/src/site/cairn.config.ts`, outside any exclude block, adds `actions` to the
   list Task 1 bracketed:
   `nav: [{ menuName: 'primary', label: 'Navigation', maxDepth: 2 }, { menuName: 'actions', label: 'Action links', maxDepth: 1 }]`,
   with a comment saying the theme reads `actions` when it renders call-to-action links, and
   Waymark doesn't.
2. `examples/showcase/src/site/site.config.yaml`: the comments that say `/admin/nav` edits only
   `menus.primary` say which menus the admin edits (`primary` and `actions`) and that `footer` is
   still edited in the file. No menu value changes, so the public output stays equal.
3. `npm run emit:template`, then `npm run check:template`. The template's `cairn.config.ts`,
   `site.config.yaml`, and `.claude/skills` copies come only from the generator.
4. E2E:
   - `admin-nav-layout.spec.ts:28-34`: `['Tags', 'Navigation', 'Action links', 'Signups', 'Site settings', 'Editors']`.
   - `nav-menus.spec.ts` (new): opens `/admin/nav/primary` and `/admin/nav/actions` by name and
     checks each page's heading (`Navigation`, `Action links`). On `/admin/nav/actions` it adds one
     link (label `Visit us`, url `/about`, or a page the picker offers), saves, and expects
     `/admin/nav/actions?saved=1`. It reads `/test/last-commit`: `path` is
     `src/site/site.config.yaml`, `menus.actions` holds the link, and `menus.primary` equals the
     primary menu read from the store just before the save (taken from `/test/last-commit` or the
     primary screen's rows, never a hard-coded copy). Parse with `parseSiteConfig` and `readMenu`
     from `@glw907/cairn-cms`, which the runner already loads (`nav-from-config.spec.ts:4`). Then
     it requests `/admin/nav/nope` and expects 404.
5. Run the new spec locally once from `examples/showcase`, bare, after the setup command in that
   worktree: `E2E_PORT=4473 npm run test:e2e -- e2e/nav-menus.spec.ts`. The npm script's
   `pretest:e2e` repackages the engine, which a bare `npx playwright test` skips. A unique port
   matters because `reuseExistingServer` is on outside CI, so the default port can attach to
   another session's server. If the port is in use or the page shows another build, pick another
   `E2E_PORT` and rerun once. CI carries the rest.

### Task 5: notes and skills (pair, 15 min)

1. `CHANGELOG.md`, under `## Unreleased`, one bullet in the house shape, then a blank line and:
   ``  Consumers must: change `editor.nav` in `cairn.config.ts` from one menu object to a list, `nav: [{ menuName: 'primary', label: 'Navigation' }]`, move any link to `/admin/nav` to `/admin/nav/<menuName>`, and read `CairnRuntime.navMenus` where code read `navMenu`.``
   The bullet says the admin edits each listed menu at `/admin/nav/<menuName>`, one sidebar entry
   each in list order, that bare `/admin/nav` now answers 404, the limit of 8, and the three
   build-time errors. The `release-size: minor` marker stays.
2. `MIGRATION-NOTES.md` `## Unreleased`: one paragraph and a before and after of the `editor` block
   (`nav: { … }` to `nav: [{ … }, { … }]`), plus the `navMenus` rename and the moved address. The
   paragraph on `menus.actions` (it says "uncomment the example") is corrected: the template now
   lists `actions` among the edited menus, and a nav save still drops the file's comments.
3. Skills:
   - `skills/cairn-extending-a-site/references/public-routes.md:185-194`: declare `editor.nav` as
     a list; each menu is edited at `/admin/nav/<menuName>`; without the list every `/admin/nav`
     address 404s; the footer line says a menu becomes admin-editable once it joins the list.
   - `skills/cairn-building-admin-screens/references/sidebar-and-access.md:125,178`: `screen: 'nav'`
     places every declared menu in list order and takes no `label` when there are two or more;
     the error row names the new message.
   - `skills/cairn-building-admin-screens/SKILL.md`: read again; if no line names the menu setting,
     leave it and state that in the PR (Decisions 9).
   - Then `npm run emit:template` and `npm run check:template`.
4. `scripts/checks/check-self-use-allowlist.json:36` reason: "declaring editor.nav is what turns
   /admin/nav/<menuName> from a 404 into a working screen …".
5. `ROADMAP.md:1807-1810`: drop "The second-menu editing question" entry, which this pass answers
   (Decisions 11).
6. `npm run check:surface -- --update` and commit `scripts/checks/api-surface.md`;
   `npm run check:options`, `npm run check:tiers`, `npm run check:package`, `npm run check:comments`,
   `npm run check:docs-gate`, each bare.
7. File through `standards:log-issue`: the `/admin/nav` comments in the Waymark and Pennant theme
   components and the `options-theme` fixture (Decisions 10), and the menu-neutral copy for
   `NavTree.svelte` (Decisions 15).

### Task 6: head build and parity (35 min)

After Tasks 1 to 5:

1. `git diff --stat f2c95910e..HEAD -- themes/ 'sets/*/'` prints nothing, and
   `node scripts/catalog/version-rise.mjs` passes with no rise asked.
2. Rebuild the engine first, or every parity check compares the base with itself: the showcase
   and both demos read the engine's `dist` through `file:../..`. From the worktree root, each
   bare and alone:
   1. `npm run package`.
   2. `npm --prefix examples/showcase run build`, then copy `examples/showcase/.svelte-kit/cloudflare`
      to `$CLAUDE_JOB_DIR/tmp/parity/head/showcase`.
   3. `DEMO_WORKER=cairn-demo-{id} DEMO_ORIGIN=https://{id}.example node scripts/catalog/demo.mjs themes/waymark --out "$CLAUDE_JOB_DIR/tmp/parity/head/waymark"`.
   4. The same `node --input-type=module -e` `buildDemo` call as Task 0 step 3, with `out`
      `$CLAUDE_JOB_DIR/tmp/parity/head/pennant`.
   5. `shoot.mjs` with the same arguments as Task 0, out `parity/head/shots`, and `hash.mjs` on
      `parity/head/showcase` into `parity/head/showcase.hashes`.
3. `diff parity/base/showcase.hashes parity/head/showcase.hashes` prints nothing. A difference is
   traced and fixed at its cause (standing answer 15). Paste the command and its output in the PR.
4. `node parity/compare.mjs parity/base/shots parity/head/shots`; paste the count in the PR. Read
   every pair it reports as differing with your own eyes, and trace each to its cause.
5. Dispatch three fresh `standards:visual-verifier` agents, one per site, each with that site's 20
   base/head pairs as separate, labeled images (never composited), its four URLs, the five widths,
   and the compare output for its pairs. Each verdict is "no difference" on every pair, and all
   three are quoted in the PR.
6. Run `node parity/shoot-admin.mjs parity/head/admin --with-link` at the head:
   `/admin/nav/primary`, `/admin/nav/actions` (with one unsaved link, so the tree is not empty),
   and `/admin/posts`, at the five widths, light, plus `/admin/nav/actions` dark at 390 and 1440.
   Dispatch one fresh `standards:visual-verifier` with the base `/admin/nav` and `/admin/posts`
   shots as reference and the head shots as separate labeled images. It grades that the sidebar
   shows `Navigation` then `Action links` with the same item recipe, that only the entry for the
   open menu is active, that each screen's header names its menu, that the crumb or site name in
   the top band reads as before (no raw `nav` crumb), and that nothing else on the screen moved.
   Dispatch one `standards:daisyui-a11y-reviewer` on the `CairnAdminShell.svelte` diff and the
   head shots: two links with distinct names, `aria-current` on the active one only, and the
   page title. Fold what either finds, and quote both verdicts in the PR.

### Task 7: whole-branch review (10 min)

The review runs before the baseline regen, so a fold that touches admin rendering lands before
the one dispatch.

1. `npm run check:template`, `npm run check:docs-gate`, `npm run check:surface`, each bare.
2. Dispatch `standards:diff-reviewer` at whole-branch scope with this plan and the design, and
   `standards:svelte-reviewer` on the `.svelte`, load, and action changes. Fold every finding,
   then run the fast lane again.

### Task 8: regenerate the admin baselines, delete, hand over (15 min)

1. Push `foundation-2`. Run `gh workflow run e2e.yml --repo glw907/cairn-cms --ref foundation-2 -f update_snapshots=true`,
   bare and alone. Watch the run with `gh run watch <id> --repo glw907/cairn-cms`, bare, as a
   background task.
2. When it commits, `git pull --ff-only` in the worktree. `git show --stat HEAD` lists only
   `admin-visual.spec.ts-snapshots/` PNGs. One under `site-visual.spec.ts-snapshots/` is a stop
   (the stop table).
3. Read the changed admin PNGs with your own eyes: the sidebar's extra entry and the zero-nav
   screen at its new path, and nothing else.
4. Commit the deletion of `docs/internal/plans/2026-11-16-foundation-2-menus-plan.md` and
   `docs/internal/plans/2026-11-16-foundation-2-executor-prompt.txt`, then push. The bot's push
   starts no workflow, so this commit is the head CI runs on.
5. The draft PR exists from the first push. Update its body: it opens with a paragraph per the
   voice standard, and carries `Round: foundation`, `Pass: menus`,
   `Review: accept, open findings 0`, the `Calls:` line, `## Acceptance` with the evidence item
   by item, `## Decisions` (this plan's, plus any run decision), `## Held paths` (none expected),
   `## Planning misses`, the filed issues, and the score. No `## Before merge`.
6. `ci-green <sha> --pr <n> --wait` as a background task. Then mark the PR ready and hand over by
   `approval-packet`: `conductor-foundation` reads the PR and lands it by step 1. A pass that can't
   land that way waits for the round's close packet, which the conductor sends. The executor
   writes STATUS only for a `## Stop`.

## Held paths` (none expected), `## Planning misses`, the filed
   issues, and the score. No `## Before merge`.
5. `ci-green <sha> --pr <n> --wait` as a background task. Then mark the PR ready and hand over by
   `approval-packet`: `conductor-foundation` reads the PR and lands it by step 1. A pass that can't
   land that way waits for the round's close packet, which the conductor sends. The executor
   writes STATUS only for a `## Stop`.

## Held paths

None foreseen. The regen uses `e2e.yml`'s existing `update_snapshots` input and touches no file
under `.github/**`.

## Decisions

1. `[stale-fact]` The design names `defineCairn`. The chokepoint is `defineAdapter`
   (`src/lib/content/adapter.ts:38`), which every site calls at build, so the throws go there.
2. `[file-list]` The row leaves out files the change needs: `src/tests/**` (unit and component
   tests that build `navMenu`, and two new test files), `examples/showcase/e2e/**` (three edited
   specs and `nav-menus.spec.ts`), `examples/showcase/src/site/site.config.yaml` and `site-config.ts` (comments only),
   `scripts/checks/api-surface.md` (regenerated), `scripts/checks/check-self-use-allowlist.json`
   (one reason string), `ROADMAP.md` (one entry dropped), `CHANGELOG.md` (the acceptance's
   `Consumers must:` line), `BACKLOG.md` (the `standards:log-issue` items), and the admin
   baselines the CI bot commits. None is under `src/lib/**`, so none parks the pass. The design's
   row for this pass is `src/lib/content/**`, `src/lib/nav/**`, `src/lib/sveltekit/**`,
   `src/lib/admin/**`, `examples/showcase/src/site/cairn.config.ts`, `templates/waymark/**`,
   `skills/**`, and `MIGRATION-NOTES.md`.
3. `CairnRuntime.navMenu` becomes `navMenus: NavMenuConfig[]`, always present. `CairnRuntime` is
   `@public`, so this is a second consumer-visible change; the one `Consumers must:` line carries
   it, and MIGRATION-NOTES shows it. A list with a singular name, or an optional list beside an
   empty one, would leave two ways to say "no menus".
4. `[design-gap]` The design names no admin label for `actions`. It is `Action links`, with
   `maxDepth: 1` to match the layout's `readMenu(siteConfig, 'actions', 1)`. Waymark doesn't render
   `actions`, so a Waymark site's sidebar shows an entry for a menu its theme ignores. That follows
   from one adapter serving both themes (the mechanism table) and is said in the config's comment.
5. `[mechanism]` The fixture's second menu is `actions` itself: declaring it is what the design
   asks, and it gives the e2e its second menu with no fixture-only block. `footer` stays
   developer-edited, since the design doesn't list it.
6. `screen: 'nav'` with a `label` and two or more menus throws in `validateNavLayout`, the same
   build-time idiom as the other layout errors. One label can't name several entries, and a
   per-menu label already lives in `editor.nav`. A single-menu relabel keeps working, so no
   existing layout breaks.
7. The commit message is `` `Update the ${menuName} menu` ``. The acceptance asks for the menu's
   name, and the label is not the name. The scope stays `nav` and the log record carries no new
   field, so `log-events.md` doesn't change.
8. `[mechanism]` The dev backend's recorder has no message field and its session is always an
   owner, so the message check and the 403 checks are unit tests at the dispatch layer, with real
   `/admin/nav/<name>` pathnames. The access check runs before the menu lookup, so a role without
   `nav` gets 403 for every address, declared or not.
9. `[stale-fact]` Acceptance item 9 says `cairn-building-admin-screens/SKILL.md` names the single
   form. At `f2c95910e` its only nav mention is `editor.navLayout` in the description
   (`grep -n` above). Task 5 reads it again; if nothing names the menu setting, it is left as it
   is and the PR says why, with the amended check beside the verbatim item.
10. The `/admin/nav` comments in `themes/waymark/components/SiteFooter.svelte:16`,
    `SiteHeader.svelte:14`, `themes/pennant/components/SiteFooter.svelte:15`, and the
    `options-theme` fixture become stale. A theme edit raises its version and publishes, which
    this pass rules out, so they are filed through `standards:log-issue` for the next theme
    release.
11. `ROADMAP.md`'s "second-menu editing question" is answered by this pass, so its entry is
    dropped rather than left true-looking.
12. The admin baselines are regenerated by one `update_snapshots` dispatch after the last admin
    change (Task 8). A pass-1-style ban on hand dispatch would leave the admin-visual job red,
    since the sidebar gains an entry on every desktop shot. The dispatch form is the one that ran
    unrefused on 2026-11-15.
13. Bare `/admin/nav` answers 404 with no redirect, as "Nothing guesses" asks. A site that linked
    to it moves the link, which the `Consumers must:` line says.
14. The command palette is keyed by `href`, not label (Task 3). Two menus may share a label, or a
    menu may share one with another sidebar entry, and a duplicate key stops the shell rendering.
    Keying by href is one attribute in a file the row holds; a duplicate-label throw would add a
    rule the design doesn't name.
15. `[design-gap]` `NavTree.svelte` keeps its copy ("Navigation saved.", the `Navigation items`
    list label, "Save navigation"), so the Action links screen says "Save navigation". Copy built
    from the menu's label would change the `refused-forms.spec.ts` selectors and more baselines.
    The pass stays smallest, and the copy is filed through `standards:log-issue` in Task 5.

## Path

| Task | Minutes |
| --- | --- |
| 0 base builds, scripts, screenshots, hash, admin base shots | 25 |
| 1 type, runtime, throws, readers, showcase brackets, test moves | 25 |
| 2 route, load, save, tests | 25 |
| 3 sidebar, layout check, crumb, tests | 25 |
| 4 and 5, as a pair | 25 |
| 6 head build, parity, four verifiers and the a11y read | 35 |
| 7 whole-branch review and its folds | 10 |
| 8 the regen dispatch and its read, delete, hand over (the run and CI off the path) | 15 |
| Path (4 and 5 overlap) | 185 |

Each `cairn-implementer` worktree pays its own setup (two `npm ci` runs and a package), which the
task minutes carry.

## Planning misses

- `[stale-fact]` `defineCairn` (Decisions 1) and `cairn-building-admin-screens/SKILL.md` (Decisions 9).
- `[file-list]` Tests, e2e specs, the showcase YAML comments, two check files, and `ROADMAP.md` (Decisions 2).
- `[design-gap]` The runtime field's rename (Decisions 3), the `actions` label (Decisions 4), and the nav screen's copy (Decisions 15).
- `[mechanism]` The recorder has no message and the dev session is owner-only (Decisions 8).
- `[mechanism]` The admin baselines need a CI regen dispatch the design doesn't mention (Decisions 12).
- `[estimate]` 185 against 120: the parity builds and 60 pairs every pass owes, plus the admin shots and the regen.

## Review folded

One `standards:plan-reviewer` read (Opus, medium) on 2026-11-16 returned no blocking finding,
four high, eight medium, and seven low. All were checked against the code and folded:

- High: the hash walk now covers only the acceptance item's public set and normalizes names
  inside file contents (Task 0); the head build writes out `npm run package` and each command in
  full (Task 6 step 2); the local e2e run goes through `npm run test:e2e` on a unique `E2E_PORT`
  (Task 4 step 5); the 403 fixture names `nav` in the access map, since `canReach` admits an
  editor to an unnamed target (Task 2).
- Medium: no second decode of the menu segment, and `/admin/nav/%25` is a 404 case (Task 2);
  `shoot-admin.mjs` carries the add-a-link step and binds to 127.0.0.1 throughout (Task 0); the
  palette key (Decisions 14); `validateEntry`'s two new outcomes are tested (Task 3); `NavRoutes`
  and the `@throws` doc comment are named (Tasks 1 and 2); the review runs before the one regen
  (Tasks 7 and 8); the draft PR is updated, not opened again; `Pass: menus` joins the PR lines.
- Low: the NavTree copy (Decisions 15); the expected remaining grep hits are listed under the
  acceptance; the showcase `site-config.ts` comments join Task 2; the e2e import is cited; the
  integration test's folder is corrected; Task 6 takes 35 minutes.

The advisor's read before launch found two sequencing gaps, also folded. Task 1 now moves the
four readers and brackets the showcase's `nav`, so each task's commit is green. The expected red
in the e2e job's `admin-visual` comparisons, from Task 2 until the regen, is named above the
tasks. The path is 185.
