# Scaffold pass: design

Facts are read at `agent-first-4` commit `3aff52061` (PR #170's head, not yet merged) unless marked. Initiative: none applies; this is a cairn-only pass, so each plan lives on its pass branch. "Media pass" means `next-pass-design.md`.

## Brief

This pass makes what `create-cairn-site` produces honest, and it readies the package to publish. Today a scaffolded site deploys with a placeholder address in every sitemap and feed, and the setup run's own words send a first-time owner the wrong way. The work splits into two passes because their risk classes differ, and both can run beside the media pass. Neither bumps nor publishes.

### What changes

- A site's prerendered address is its real one. Setup writes it where it writes `PUBLIC_ORIGIN`, then rebuilds, so the sitemap, feeds, and canonical links stop naming `showcase.test` (#42, your High item).
- A fresh site stops shipping what it can't back: a social image that 404s (#154), a gate it can't run (#121), a home page with no description or social card (#158), a sitemap that ignores `updated` and lists noindex entries (#152), a feed that silently empties (#45), and stale comments (#59).
- A first run recovers. The install prompt names "All repositories" (#175), the remedy agrees (#97), and a re-run after that failure no longer stops on the repository it just made (#97).
- The setup copy stops misstating things. That covers seven lines (#177), a warning before it writes a domain-wide DMARC policy (#184), a warning beside the printed link (#174), and a decline that really can be re-offered (#183).
- `publish.yml` gains a `create-cairn-site` job and `cairn-releasing` gains its steps. The job lands unrun (#195's workflow half).

### If you approve

1. Once PR #170 merges, a planning session writes two plans unattended. It starts `cairn-cms-scaffold-template` itself and hands `cairn-cms-scaffold-setup` to `conductor-cairn-cms`.
2. Both run beside the media pass in their own worktrees (see "Parallel run").
3. The template pass is `ordinary`, so it merges itself on a green suite and an accepted review. Your approval is the merge word it carries.
4. The setup pass is `auth-data` and `runner`, so it does not merge itself. The first Decide below says how it merges.
5. Approving also approves the backlog and ROADMAP edits listed below, and extends your 2026-11-01 "fact-check alone, no docs review" rule to this pass's `docs/admin` edits. That rule named only #159 and #160, and the docs procedure otherwise routes each page to you.
6. Nothing is published. Each `CHANGELOG.md` entry stays under `## Unreleased`.

### Decide: How the setup pass merges

Its `auth-data` class comes from paths, not from auth logic. `packages/create-cairn-site/src/{github,cloudflare}/**` is on the map, and the changes there are copy, one reordered save, and the origin write. No runtime auth code moves. It still gets the full treatment: failing tests first, a commit-by-commit diff review, the security read, and the live smoke. Nothing after it waits on it, since the final engine batch touches neither the package nor the workflow, so a held PR stops no other pass.

Source: `cairn-running-passes` "Risk classes"; `pass-core` "Close"; ledger ruling of 2026-10-31 ("pre-approved for the pass 3 merge too").

- Pre-approve the merge on a green suite, a review with no open security finding, and a passing live smoke, with a record packet first, as you did for pass 3 (recommended)
- Keep the packet as the gate, so it waits for your read while other passes run

### Decide: When create-cairn-site first reaches npm

An early placeholder gains nothing and breaks npm's rules. A trusted publisher can't bind to a package that doesn't exist, and a new binding "must complete its first successful publish within 2 days" or it expires, so one made now would lapse before the release. npm's terms also bar "content that exists only to 'reserve' a name". The pass needs none of this, since the job lands unrun. The one cost of waiting is the name: it is free today (E404, checked today), and npm says it won't change an owner because someone else wants a name.

The steps are yours and sit in the release act, since no session can do them: no `~/.npmrc` exists, `npm whoami` answers `ENEEDAUTH`, and `npm trust` needs your account's 2FA. They take one terminal sitting on release day:

1. `npm login`, then `npm publish <tarball> --access public --tag next` on the release candidate's real build, which the session bakes and packs.
2. `npm trust github create-cairn-site --file publish.yml --repo glw907/cairn-cms --allow-publish`. `--allow-publish` is needed because `publish.yml` runs `npm publish` directly.
3. The session cuts the next candidate inside the 2 days. That first OIDC publish proves the job, and the real install runs from it.

Source: `.github/workflows/publish.yml:91-92`; [npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust); [trusted publishers](https://docs.npmjs.com/trusted-publishers); [disputes policy](https://docs.npmjs.com/policies/disputes); [open source terms](https://docs.npmjs.com/policies/open-source-terms).

- Publish the real candidate by hand on release day, the 2026-08-16 way, with no placeholder (recommended)
- Publish a real prerelease by hand once the setup pass merges, which holds the name early but puts a public tool out ahead of the one release
- Publish a stub now to hold the name, which the terms bar

### Worth knowing

**The split is a call I made, not a fork.** One pass would take the highest class and hold six plain template items behind the setup pass's review. Two passes let those six merge themselves.

**#185 leaves this pass.** It needs a live capture, which needs your browser and real accounts, so it would stop the run. The transcript README forbids editing a fixture ("A fixture is never edited"). The recapture belongs in the real install you already placed in the release act, on the same run.

**#177 therefore leaves quoted docs behind for a while.** Five of its lines sit in `01-create-cairn-site.txt`, and `create-your-site.md` quotes that fixture. `check:transcripts` compares page to fixture, so it stays green while both show the old copy. No reader sees this, since cairn.pub takes the docs only after the release, and the recapture fixes it before then.

**The release act grows by one item from ROADMAP.** See "Owed before the tool publishes".

### Parallel run

The media pass and both scaffold passes can run at once. No source file is shared, and nothing must wait. The two scaffold passes need no order between them either.

| Area | Media pass | Scaffold template | Scaffold setup |
|---|---|---|---|
| Engine | `src/lib/sveltekit/*`, `render/`, `media/`, `delivery/manifest.ts`, `admin/EditPage.svelte` | `src/lib/delivery/views.ts` | none |
| Showcase source | none named | `chassis/{feed-items,public-routes}.ts`, `routes/sitemap.xml/+server.ts`, `routes/(site)/+page.{svelte,server.ts}`, `theme/theme.css`, styleguide, `chassis/README.md`, bake's `PRUNED_SCRIPTS` | `chassis/content.ts`, `theme/cairn.config.ts` |
| Setup tool | none | none | `packages/create-cairn-site/**` except the bake |
| Workflows and checks | none | none | `publish.yml`, `create-site.yml`, `scripts/checks/{check-leaks,check-dev-package}.mjs` |
| Skills | `references/{media,newly-published,content-model,log-events}.md`, `admin-mount.md` | `references/{public-routes,audit}.md`, `claude/CLAUDE.md`, `claude/snippets/check-cairn.json` | `references/public-routes.md:24`, `.claude/skills/cairn-releasing/SKILL.md` |
| Docs | none | none | `docs/admin/{setup-recovery,own-your-domain,create-your-site}.md` |

Three things are shared, and all of them merge mechanically.

- All three passes write the ledgers: `CHANGELOG.md`, `MIGRATION-NOTES.md`, `BACKLOG.md`, `docs/STATUS.md`, and `ROADMAP.md`.
- All three re-emit `templates/waymark/**`, including its `.claude/` copy of the skills and `.claude/cairn/MANIFEST`.
- The two scaffold passes both edit `references/public-routes.md`, at about line 55 and at line 24.

`scripts/checks/api-surface.md` stays media's alone, since `buildSitemapView` keeps its signature.

The rule for the second pass to merge: merge `main`, keep both `## Unreleased` entries, run `npm run emit:template`, and rerun the fast lane. The plans are the same from either base, so if the media pass lands first, each simply starts from it.

Three things make it safe to launch them together:

1. **The media launch prompt needs one word changed.** `next-pass-prompt.txt` says "no executor is busy in this repo", which would stop a parallel launch. It should read "in its worktree", which is the actual rule. The conductor makes that edit.
2. **Gates take turns.** Every fast lane's first line runs on the shared heavy lane (`gate-tier.mjs:20`), so three passes queue, which adds wait and no risk. The two `ordinary` passes may set `RUN_GATE_IF_BUSY=defer`, since CI is the full-suite home. The setup pass never sets it.
3. **Keep each STATUS edit to close.** Each pass writes STATUS once, at its close, so the merges meet one small hunk.

The pairs inside each pass, by the plan's own rule of disjoint files with generated output counted:

| Pass | Pair | Task A | Task B |
|---|---|---|---|
| Template | 1 | #152, #158 (touches no skill) | #45, #154, #59, #121 |
| Setup | 1 | Cloudflare side: #42, #183, #184, `src/cloudflare` lines of #177 | GitHub side: #97, #174, #175, `src/github` lines of #177 |
| Setup | 2 | #195 | Docs pages and the package README |

The tasks in between run alone: the template pass's reference edits, then its close; the setup pass's end-to-end check, then its close. Each template task emits its own output, which stays disjoint because only task B changes a skill.

### Sequence

1. PR #170 closes.
2. Media, scaffold template, and scaffold setup run at once.
3. Final engine batch, in slices.
4. The cleanup round.
5. The one release: the dependency sweep, the bump, the npm steps above, the real install with #185's recapture, then each site migrates.

### #195's workflow half

The job is a sibling of `publish-dev`, in the same workflow file, so the trusted publisher's `publish.yml` name covers it.

- **It runs after `publish` and `publish-dev`,** because a scaffold pins both.
- **It reuses `create-site.yml`'s two commands,** the bake with `--engine-spec` and `--dev-spec` and `npm pack --ignore-scripts`. CI proves both on every PR, so the only unrun line is `npm publish <tgz> --access public --tag "$TAG" --provenance`.
- **It keeps the sibling guards:** version-derived tag, skip if already published.
- **It adds two guards.** It fails if the package version differs from the root's, because a forgotten bump would publish `0.0.0` and move `latest`. It skips with a notice on E404, so the first candidate's run stays green before your hand publish.

The package needs three fixes before the job could succeed, none of them filed:

- `packages/create-cairn-site/package.json` has no `repository`. npm rejects a provenance publish with a 422 when the manifest disagrees, which is how the dev backend failed at 0.95.0 (`check-dev-package.mjs:28-30`). Add it with `directory`, and extend `check:dev-package` to read this manifest too.
- `files` ships `src`, so 46 `*.test.mjs` files go in the tarball. Exclude them.
- `bin` needs the `npm pkg fix` form STATUS already names.

`cairn-releasing` gains the third package in step 2's bump, the release-day owner steps, `npm view create-cairn-site version` in step 7, retiring the template-repo notice, and two corrections to stale text on the same lines: `npm@latest` (the job pins `npm@11`) and the allowed-action date, since npm's page now says new configurations default to `npm stage publish` and need publish chosen.

### Scope

- **Template pass files:** in the table above, plus `templates/waymark/**` by emit and `examples/showcase/package.json` staying as is. The showcase keeps `check:cairn:rendered` because it has Playwright; the bake prunes it.
- **Setup pass files:** in the table above.
- **Public interfaces:** `buildSitemapView` changes behavior by skipping noindex entries, which needs a changelog line. `check:surface` should not move. `writePublicOrigin` is internal to the package.
- **Scope check:** `cairn-judging-scope` passes all of it. No export, seam, or actor is added, and the ledger's `audit-cli-create-cairn-site-...` entry settles that setup tooling may provision.
- **Ruling read, #42:** `public-origin-only-origin-source` declines an env-sourced origin, because a page diffed against a baseline needs one fixed value. This fix keeps a committed literal, so the ruling stands.
- **Contestable, decided here:**
  - **#42's literal moves to `src/theme/cairn.config.ts`.** Setup already rewrites that file by key (`writeEmailFrom`) and already reconciles it to the repository (`RECONCILED_FILES`), and `content.ts` already imports from it. Leaving it in `content.ts` would add a third tool-owned file, one a developer edits by hand.
  - **#42 adds a `npm run build` before the second deploy and before the domain cutover's deploy,** since the value is now bundled. `chapter.mjs:241-243` and `hostname.mjs:363` deploy without one today, and the `chapter2.mjs:771` comment goes.
  - **#42 adds no build check** comparing the two values, which would be new surface. A developer who changes the domain by hand still edits both, and `public-routes.md` says so.
  - **#97 drops the filed "adopt the repository".** `chapter.mjs` saves `repo-created` only after `verifyInstallationCovers`, so that check's failure leaves no record and the re-run's `createRepo` collides. Saving right after `createRepo` fixes it, and the resume branch re-verifies. Adopting a repository by name is a riskier write, and nothing needs it.
  - **#154 unsets `defaultImage`** and ships no image, which avoids a taste call. The option is already optional (`public-routes.ts:51`).
  - **#177 adds one string:** the consent's "deploying again later updates it" (`chapter.mjs:118`) now warns that an existing Worker of that name is replaced. See the next section.
- **Out of scope:** the setup run's existence probe, the secrets block, every other backlog item.

### Owed before the tool publishes

ROADMAP holds seven notes on `create-cairn-site` that no BACKLOG item carries. Four tie themselves to the tool's publish, and one names "the next `create-cairn-site` pass".

| ROADMAP entry | Verdict |
|---|---|
| `check:leaks` skips the package, "before that package's first publish" (`:713`) | Fold into #195 |
| Terminal DMARC copy tells owners to do something impossible (`:460`) | Fold into #184; same lines |
| Two more copy defects of #177's root: `bin.mjs:258`, `chapter3.mjs:975` (`:447`) | Fold into #177 |
| Template-repo pre-release notice (`:421`) | Stays; a `cairn-releasing` step retires it in the publishing change, as its `WATCH` says |
| Placeholder sender `cms@showcase.test` on a workers.dev site (`:437`) | Stays; the entry calls its effect on `cairn health` unverified, and the real install will show it |
| Two sites with alike names adopt each other's Worker (`:640`) | Copy warning now (#177); the probe goes to after the release. Resume can trip it, since a deploy that crashed before its record saves looks like a foreign Worker |
| Declare required secrets, "the next `create-cairn-site` pass" (`:1294`) | Repoint to after the release; its stated trigger would pull a design that needs a live first deploy |

### End-to-end check

One new step in `create-site.yml` fails on the base commit and passes on the head. It uses the packed CLI's real scaffold in that job. It calls `writePublicOrigin` from the packed package with a workers.dev address, runs `npm run build`, and asserts the sitemap, `robots.txt`, feed, and one entry's canonical link all carry that address and that no prerendered text file holds `showcase.test`. It then lists the tarball and asserts `template/` is present, no `.test.mjs` is, and the manifest has `repository`. The worker bundle stays outside the search, since it holds the placeholder sender. Where the prerendered files land is unverified; the planner reads it first.

It proves the setup half and needs nothing from the template pass, so the two passes don't wait on each other.

### Risk class and pre-flight

- **Template pass: `ordinary`.** No path is on the map; `src/lib/delivery/views.ts`, chassis files, and `bake-template.mjs` all sit outside it.
- **Setup pass: `auth-data`, with `runner`.** Paths: `packages/create-cairn-site/src/{github,cloudflare}/**` for #42, #97, #174, #175, #177, #183, #184; `.github/workflows/**` and `scripts/checks/**` for #195 and the check. `wrangler.*` and `templates/*/migrations*/**` are not touched.
- **`live-account`: neither.** Every setup test runs on the fake GitHub and Cloudflare, and #185's capture has left. The live admin smoke still applies, as the adapter sets it. It runs locally on `wrangler dev` with no account and no sign-in, as pass 3's did. It proves the runtime still signs in, not these changes, since no runtime auth moves.
- **Setup's extra duties:** an `auth-data` task writes its failing test first, `standards:diff-reviewer` reads each such commit while CI runs, and close loads `standards:web-auth-security-reviewer`. The planner hands the pass to the conductor and closes. `.github/workflows/` is on the protected list, so tasks touching it print `ciWait`.

Every step that needs you or that auto mode could refuse, each settled ahead:

| Step | Settled by |
|---|---|
| `gh pr merge` on the template PR | The launch prompt quotes your approval and merges with `--match-head-commit <head>`. The `permissions.allow` rule and the `autoMode` merge line both cover it |
| `gh pr merge` on the setup PR | Your first Decide. If pre-approved, the conductor's prompt quotes it the same way. If not, the queue's approve is the word |
| Pushing the `publish.yml` job | Pushing branches is listed as routine, but no run has pushed a new OIDC job. A refusal has a standing answer below, so it can't stop the run |
| `npm login`, `npm publish`, `npm trust` | Not in the pass. Your second Decide places them in the release act |
| Live GitHub or Cloudflare runs | None in either pass |
| `wrangler dev` smoke | No sign-in; it reads local email output, as pass 3 did |
| Starting two executors beside the media pass | The launch-prompt edit above. The folder is trusted |

**Before launch, no action from you:** PR #170 merged, the main checkout pulled, `git status` clean in each new worktree. Your pre-flight list for both passes is empty. A `claude agents --json` read today shows `conductor-cairn-cms` and `cairn-cms-agent-first-4` busy, so launch waits on #170.

### Estimate

The design estimates are 110 path minutes for the template pass and 245 for setup, with about 50 and 120 actual expected. Recent passes ran at 0.2 to 0.5 of plan path: engine pass B 605 to 289, docs finalization 1,450 to about 180, agent-first pass 3 1,120 to about 250. Setup sits at the top of that range because `auth-data` adds a failing test first, a diff read per commit, the security read, and the smoke. If the media pass's score is in by planning, the planner resets these from it.

- **Template:** pair 1 at 55, reference edits and emit 20, close 35.
- **Setup:** pair 1 at 115 (#42 at 60), pair 2 at 55, end-to-end check 25, close 50.

Run together, the wall clock is the longest of the three passes, not their sum.

### Standing answers

These settle each stop the run can foresee. A stop not listed here still stops.

- **Template plan over 220 path minutes:** cut #59, then #45, to the backlog and go on. Stop only if still over.
- **Setup plan over 490:** cut #174, then #177's non-misstating lines. Stop only if still over.
- **May escalate, template:** #59, #45, #158, and #152's noindex half. **May not:** #154, #121.
- **May escalate, setup:** #174, #177, #183, #184's clause on an existing record, and #195's job only on an auto-mode refusal. **May not:** #42, #97, #175, and #195's manifest, leak-scan, and skill changes.
- **#183 escalates:** fix the README's "Declining costs you nothing" promise to match the code in the same pass.
- **Auto mode refuses the `publish.yml` push:** take the job out of the branch, land everything else, record the planning miss, and file the job for the release act. No stop.
- **A template-pass item turns out to need a path on the `auth-data` or `runner` map:** move that item to the setup pass.
- **Cloudflare's docs can't say whether onboarding replaces an existing `_dmarc` record (they didn't today):** word the prompt so it is true either way, and leave the question to the real install. Don't claim either.
- **A test pins old copy:** change the test and list it under `## Decisions`.
- **A transcript block is now stale:** leave page and fixture alone. List the blocks in the PR for the recapture.
- **`docs-fact-checker` finds a wrong claim:** fix it. Dispute goes under `## Decisions`, and no docs review is sent.
- **`check:leaks` flags the package once scanned:** a real leak is removed; the public repository URL is allowed the way the check already allows it.
- **The smoke prints pass 3's one FAIL** (the same link refused, landing at `/admin/login?error=no-pending-request`): that lands at a refusal, so it counts as a pass with a note. Any other failure stops the line.
- **A merge conflict with the media pass:** apply the rule under "Parallel run". A conflict outside the shared list stops the line.
- **A security-read `fix`:** fix forward and rerun. It stops the line, not the pass.
- **A retried test:** list it as flake evidence in the PR. No stop.

### Backlog sweep

These verdicts are proposals, read at `3aff52061`. The design agent ran the sweep inline, not in a separate subagent. All 14 items were checked at their current lines. Sizes are mine. No `drop` is proposed.

| Item | Verdict | Fix shape, minutes |
|---|---|---|
| #42 | fold | literal in `cairn.config.ts`, one write, rebuild before deploy, 60 |
| #97 | fold, reword | remedy names "All repositories"; save `repo-created` early; no adoption, 20 |
| #174 | fold | "use this link, not GitHub's own form" beside the link; profile-free fallback in the abandon message, 15 |
| #175 | fold | name the choice at `install.mjs:235`, 5 |
| #177 | fold, reword | seven lines plus `bin.mjs:258`, `chapter3.mjs:975`, and the consent warning, 20 |
| #183 | fold | re-entry asks again; `--yes` without `--email` stays a decline; `bin.mjs:479`'s comment already promises this, 30 |
| #184 | fold, reword | prompt names the effect; closing copy loses the impossible instruction, 15 |
| #195 | reword | split as above; workflow half here, 55 |
| #45 | fold | throw at build naming the concept, 15 |
| #59 | fold | `theme.css:58,66,126`, styleguide `:13,:105`, chassis README `content.ts` row. The script is real (`package.json:59`) but a site has none, 10 |
| #121 | fold | add to `PRUNED_SCRIPTS`; `check-cairn.json:8`, `claude/CLAUDE.md:33`, `audit.md:123`, 20 |
| #152 | fold, reword | route on `buildSitemapView`; skip noindex by reading the entry through `readSeoFields` (`public-routes.ts:250`). Cut the feeds clause, 30 |
| #154 | fold | drop the line in `chassis/public-routes.ts:18`; `public-routes.md:55` caveat goes, 10 |
| #158 | fold | `buildSeoMeta` head on the home, 25 |
| #185 | reword | move to the release act; the strings are in `01-create-cairn-site.txt` (9 matches) and `01d-resume.txt` is gone |
| #147, #159, #75, #157, #32 | keep | they name a scaffold file or a seam this pass calls, outside the rewritten lines |
| #196, #168 | keep | cleanup round and after the release |

Settled by this sweep: #152's open question reads no, `ContentSummary` carries no `robots`. A full sweep is due at this read (29 unstamped). The media pass's planner runs it, so this pass runs none.

### Later

Each of these has a destination and none is built here.

- **The one release:** the npm steps, the `0.0.0` bump in lockstep, the real install, #185's recapture, the template-repo notice, and a check of the placeholder sender.
- **After the release:** the Worker existence probe, required secrets, #168, #64, P5.
- **Final engine batch and cleanup round:** as in the media pass's "Later".

### Not verified

These claims rest on inference or were not run.

- No code was run. Every fix shape comes from reading source, and no test or gate ran.
- That the `publish.yml` job works. It can't run before a release; that is the point of landing it unrun.
- That `npm publish <tgz> --provenance` validates as the folder form does. The first candidate's OIDC run proves it.
- What `latest` does on a first publish with `--tag next`. npm's page leaves that case out. If it moves, a bare `npx create-cairn-site` serves the candidate for that window, which works.
- That #183's re-entry works once the token is gone. A decline deletes it, so the run must collect one again; the plan's failing test settles it.
- Whether Cloudflare replaces an existing `_dmarc`. Its docs don't say.
- Whether #174's cause is Chromium's profile. The item calls it likely and unproven.
- That `glw907.workers.dev` can be neutral in a recapture. That subdomain looks account-wide, so #185 may reduce to the path.
- Where npm's credential is recorded. No `npm` item shows in the two vaults `claude-pass` reaches; other vaults were not checked.
- How the home page's head renders. The layout and entry page weren't found to read `seo`, so the planner reads it first; #158's 25 minutes rests on that.
- Whether a `pull --ff-only` after the first merge counts an executor launched from the main checkout as a live session in it. If so, the checkout is reported stale and the next session pulls.
- That the smoke's "FAIL" is the script's mismatch and not a defect. It reads as a refusal; pass 3's ledger records the smoke as passing.
- Pass 4's close. All facts here are at its current head, and it may still move.
