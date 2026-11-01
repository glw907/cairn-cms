# Media and publish pass: design

Facts are read at `agent-first-4` commit `3973af504` unless marked. Initiative: none applies; this is a cairn-only pass, so the plan lives on the pass branch.

## Brief

This pass fixes ten defects in what an editor's save, replace, and publish write to a site, and approving it starts the road to the one release. Three are your High items: a media replace that fails every later deploy, a save that silently deletes frontmatter, and a warning that says the opposite of what the build does. The pass lands on `main` and neither bumps nor publishes.

### What changes

- Replacing an image or pushing a default alt updates the content manifest in the same commit, so the next deploy passes (#74).
- An admin save keeps every frontmatter key the form does not declare, so a hand-written `draft: true` no longer goes public on the next publish (#106).
- A save refuses an include that names no fragment, and a fragment that a pending branch includes can't be deleted (#137).
- Publishing onto an address another entry holds does what the screen says (#31, your call below).
- Developers get four smaller fixes: a typed upload that records its manifest row (#49), a preview that honors a moved media path (#48), a one-option way to fail the build on a missing image (#127), and a startup error for an upload type that can never work (#128).
- A rename stops reading as a new publish, so a site can't re-email subscribers over one (#111), and the unused preset code goes (#129).

### If you approve

1. Once PR #170 merges, a planning session writes the plan unattended and starts one executor in its own worktree.
2. The executor runs the ten items, the fast lane after each task, and CI on a draft PR. A fresh reviewer reads the whole branch.
3. The risk class is `ordinary`, so the pass merges its own PR on a green suite and an accepted review. Your approval is the merge word it carries.
4. Approving also approves the backlog edits listed below.
5. Nothing is published. The `CHANGELOG.md` entry stays under `## Unreleased`.

### Decide: What a publish does when another entry holds the address

The screen says the new entry replaces the other at that address, and the publish code says "warn-and-allow, last-write-wins, never a gate". The build instead throws on the duplicate, so one publish stops every later deploy until someone moves an entry. Refusing reverses the written 2026-06-23 advisory design, so the call is yours.

Source: `BACKLOG.md` #31; `src/lib/sveltekit/content-routes-entry-write.ts:372`; `src/lib/delivery/site-resolver.ts:104`.

- Refuse the publish and say why, the same rule a dangling `cairn:` link meets at save, failing open if the read fails (recommended)
- Keep warn-and-allow and reword the warning to say the next build fails
- Make the build keep the last publish, as the 2026-06-23 design said, which hides the other entry with no error

### Decide: The Evaluate bar

Evaluate reads unmet, and the transcripts show the bar is what's wrong, not the pages (see "Evaluate evidence"). You approved the bar in the plan, so only you can change it. This is pass 4's close, not this pass.

Source: plan task 4.13; `~/.local/state/cairn-agent-first/e2e/out/evaluate/trial-*.jsonl`.

- Re-cut each item to its core claim, grade these transcripts blind, and record the result on PR #170 (recommended)
- Leave the bar as written and record it unmet
- Add more to the pages and rerun, which the second run shows does not move the score

### Decide: A real install before the one release

You dropped the sittings, so nothing has run the registry install, sign-in, and first publish on a final build. CI proves only that packed artifacts build a site. A site migration would not cover it, since a migration never runs `create-cairn-site`.

Source: `.github/workflows/create-site.yml`; ledger ruling of 2026-11-01.

- One run on the release candidate at `next`, before `latest` moves, with the session driving and you doing only the browser approvals (recommended)
- Ship with no run, and let the first reader find any fault

### Worth knowing

The conductor recommended #195 first, and this design does not, for three reasons. Your 2026-10-31 sequence puts media and publish next, and #195 changes nothing about it. The 404 reaches no reader yet, since cairn.pub shows the docs only after the release. And the workflow could not be proven early: a publish job runs only on a real publish, and the scaffold pass changes what the package ships.

### Sequence

The right unit is a sequence, and this pass goes first because it holds three of the four High items. ROADMAP's path entry is gone from the Now tier, so `ROADMAP.md:190` dangles; its old text (`bb4c7715a^:ROADMAP.md`) and STATUS agree on the order.

1. Media and publish, this pass.
2. Scaffold pass: 14 items, the fourth High (#42), and #195's workflow half.
3. Final engine batch: 46 items plus P1, P8, P9, and P2 to P4. It is several passes, by slice.
4. One small cleanup round closes the batch, which answers your question. It takes #196, #188, #166, #189, and #190's skill half.
5. The one release, then each site migrates.

### How #195 fits the no-release rule

#195 splits, because a pass never bumps or publishes. The scaffold pass adds the `publish.yml` job and the `cairn-releasing` steps, which land unrun. The bump, the bake against released versions, and the publish stay in the release act. npm can't bind a trusted publisher to a package that does not exist (`publish.yml`, the 2026-08-16 note), so the first publish is yours by hand. The scaffold pass's design raises whether to do that with a placeholder earlier, since the name is free (E404, checked today).

### Scope

The pass touches the save, publish, and media paths and their developer docs.

- **Files:** `src/lib/sveltekit/content-routes-{entry-write,entry-destructive,media-metadata}.ts`, `cairn-admin.ts`, `src/lib/render/resolve-media.ts`, `src/lib/media/{config,transform-url}.ts`, `src/lib/delivery/manifest.ts`, `src/lib/admin/EditPage.svelte`.
- **Public interfaces:** `CairnAdminRoutes` gains `mediaLibraryUpload`; `createMediaResolver` gains `strict`; `buildNewlyPublished` and `normalizeAssets` change behavior, with `Consumers must:` lines.
- **Records:** `scripts/checks/api-surface.md`, `CHANGELOG.md`, `MIGRATION-NOTES.md`, `skills/cairn-extending-a-site/references/{media,newly-published,content-model,log-events}.md`, `skills/cairn-building-admin-screens/references/admin-mount.md`.
- **Scope check:** `cairn-judging-scope` passes #49 and #127. Both serve media, a core job, at one member each, and #127 retires a cast the skill now teaches. #49 moves one action across a deliberate narrowing (`cairn-admin.ts:378`), which no ruling covers. `runtime-publicmediaresolver` is a different member.
- **Contestable, decided here:** #106 keeps every undeclared key, not the five engine-read ones, because one rule is simpler and loses nothing. A key dropped from a fieldset then stays in old files.
- **Out of scope:** every other backlog item, however close it sits, including #136, #179, #180, #193, and #194.

### End-to-end check

One test on the showcase fails on the base commit and passes on the head. On the dev backend, replace an image an entry uses, save an entry with a hand-written undeclared key, publish, then run the production build. `verifyManifest` must pass and the key must survive. Whether the dev backend's commits reach the tree the build reads is unverified; the planner probes it first and falls back to an integration test over the committed files.

### Risk class and pre-flight

The class is `ordinary`: no touched path is on the `auth-data` map, and no account is live. Only your approval is owed.

- **Before launch, no action from you:** PR #170 merged, `cairn-cms-agent-first-4` no longer busy, and the main checkout pulled. That worktree has uncommitted edits right now.
- **Auto mode would refuse:** `gh pr merge <n> --merge` needs your word in the launch prompt. The prompt quotes your approval and merges with `--merge --match-head-commit <head>`, which `permissions.allow` covers. No other step needs a grant.

### Estimate

The design estimate is 200 path minutes, with about 100 actual expected. Recent passes ran at 0.2 to 0.5 of plan path: engine pass B 605 to 289, docs finalization 1 450 to about 180, agent-first pass 3 1,120 to about 250. Stage A's 255 to 30 is not a fair ratio, since its score says two of its tasks were already done. Engine code sits at the top of that range. The path is the three `entry-write` items in sequence (110), with the other items as pairs beside them, then the end-to-end check and close (about 90).

### Standing answers

These settle each stop the run can foresee.

- **Plan over 400 path minutes:** cut #127, then #48, to the backlog and go on. Stop only if still over.
- **May escalate:** #48, #111, #127, #128, #129. **May not:** #74, #106, #31, #137.
- **#137 needs a file under `src/lib/github`:** the pass becomes `auth-data`, adds the security read and live smoke, and sends a packet.
- **A test pins the old behavior:** change the test and list it under `## Decisions`.
- **An item breaks a site:** add the `Consumers must:` line. No question.
- **A retried test:** list it as flake evidence in the PR. No stop.

### Evaluate evidence

The pages hold every claim, and the answers leave details out. All three trials read commit `04c6036`, which added the sentences for the items the first run missed. Each trial's tool output holds "This section is where the security model is documented", `locals.cairnEditor`, `navLayout`, "Cloud sessions get only", "your own credentials", "per-entry branch", and "major-version". Each then wrote a sound answer of about 1,300 words to a question that names none of those details.

| Item | Trial 1 | Trial 2 | Trial 3 | What is missing |
|---|---|---|---|---|
| 1 What it is | full | core | core | "one fixed concept shape" (2, 3) |
| 2 Editor's day | core | core | core | the per-entry branch (2, 3); the App in the publish step (all) |
| 3 Ownership and exit | full | full | full | |
| 4 Cost | full | full | core | the dates (3) |
| 5 Sign-in and secrets | core | core | core | where the model is documented (all) |
| 6 Extending | core | core | core | `locals.cairnEditor` (all); `navLayout` (1, 2); the 1.0 rule (all) |
| 7 Claude Code | core | core | core | cloud sessions (1, 2); the MCP reason (2, 3) |
| 8 Contributing | core | core | core | own credentials (all); folder trust (1) |
| 9 Verdict | full | full | full | |

Every item reaches its core claim on every trial; full clause-by-clause matches are 4, 3, and 2 of nine. This is my grading, and "core" is my own line, not the blind judge's. No judge output is on disk, and the commit reports the first run at three or four of nine, so the fix did not visibly move the score. The sentence about where the security model lives was written for the bar, reached no answer, and should go.

Two faults are real, and neither is about the nine items. `glw907/standards` is public, yet trials 1 and 3 call it private and no page says otherwise; one sentence in `CONTRIBUTING.md` fixes that. Trials 1 and 3 also read the `--depth 1` clone as one-commit history, which is a harness artifact.

### Backlog sweep

These verdicts are proposals, read at `3973af504`. The design agent ran the sweep inline, not in a separate subagent. No `drop` is proposed. The filed mechanism and file lines were checked for each fold; the sizes are mine.

| Item | Verdict | Fix shape, minutes |
|---|---|---|
| #74 | fold | manifest row in the replace and alt commits, 45 |
| #106 | fold, reword | keep undeclared keys; the prior read exists at `entry-write.ts:179`, 40 |
| #31 | fold | per your call, in single and batch publish, 25 |
| #137 | fold | save guard plus delete guard, 45 |
| #49 | fold | one member, comments, `admin-mount.md:166`, 15 |
| #48 | fold | pass config to the preview; `media.md:68` step goes, 25 |
| #127 | fold | `strict`; `media.md:86-98` wrapper goes, 20 |
| #128 | fold | throw in `normalizeAssets`, 10 |
| #129 | fold | delete two internals, 10 |
| #111 | fold | use the carried stamp, 15 |
| #41, #136, #163, #179, #180 | keep | they name a pass file but sit outside the rewritten lines |
| #193, #194 | keep | admin and tidy slice; their files are not in this pass |
| #55 | done | `scripts/checks/fast-lane.mjs:8,25` |
| #92, #93, #94 | done | `evals/run.mjs:453`, `:430`, `:417` |
| #85, #90 | done | `review.md:68`; `cairn-writing-docs/SKILL.md:64` |
| #189, #190, #191 | reword | still open and placed in a closed pass; move to the batch |
| #166, #188 | reword | no `Placement`; move to the cleanup round |
| #195, #196 | reword | split #195 as above; #196 to the cleanup round |

A full sweep is due: 29 open items have no stamp. It did not run here, so the planning session runs it and sends the triage list. #70's state is unverified; PR #170's close confirms it. `ROADMAP.md:190` and `:751` need their dangling pointers repointed at STATUS's sequence.

### Later

Each of these has a destination and none is built here.

- **Scaffold pass:** the 14 items and #195's workflow half.
- **Final engine batch:** content rules 12, admin and tidy 18, small API 8, unsliced 8, P1, P8, P9, P2 to P4, and the component-to-block rename.
- **Cleanup round:** #196, #188, #166, #189, #190's skill half.
- **The one release:** the dependency sweep, the bump, #195's publish, and the real install if you take it.
- **Pass 4's close:** the Evaluate bar, the plugin sentence, and removing the rubric sentence.
- **After the release:** #168, #64, P5, and each site's migration.
- **Your ongoing effort:** reading the human docs. No pass item.

### Not verified

These claims rest on inference or were not run.

- The dev backend's reach to a production build, as the end-to-end check says.
- That a preserved undeclared `draft: true` shows as Hidden in the admin. `#180` implies it.
- Whether the rc capture used the registry; `create-cairn-site` has never published, so it can't have used that package.
- The first Evaluate run's score, which rests on the commit message. Its transcripts were overwritten.
- No code was run. Every fold's mechanism comes from reading source.
