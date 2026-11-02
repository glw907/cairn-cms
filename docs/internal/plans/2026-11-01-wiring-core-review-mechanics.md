# Mechanics review: wiring-core plan at `d4022d164`

Saved verbatim from the `standards:plan-reviewer` reply (Opus medium).

**Verdict: not ready to launch as written. Fold 2 blockers and 8 majors first.** All are small edits to the plan, and none is an owner fork. The types and the merge mechanics hold up. The gaps are in gate behavior and in proofs the plan cites that do not exist or cannot fail.

Scratch work is in `/var/home/glw907/.claude/jobs/752b74b4/tmp` (a copy of the tree plus a trial T1 patch). Nothing in the worktree was edited.

Line numbers below are in `docs/internal/plans/2026-11-01-wiring-core-plan.md` unless the citation names another file.

## Blockers

**1. blocker, correctness: T3 line 216 and its Files list. Removing `ResolvedMediaConfig` from `/media` fails `check:surface`, and `--update` cannot clear it.**
- Probe: dropped `normalizeAssets, type ResolvedAssetConfig` from `src/lib/media/index.ts`, ran `svelte-package`, then `check-surface-leaks.mjs`. Result: `+ ResolvedAssetConfig at .`, `at /media`, and `at /sveltekit` (type-checker), all UNRECORDED.
- `CairnRuntime.media` still names the type, and CairnRuntime is public on `.` and `/sveltekit`.
- `check:surface` is `npm run package && check-surface-leaks.mjs && check-surface.mjs`. The `-- --update` flag reaches only the last command, so the leak failure stops the chain before anything updates (lines 90-91 assume otherwise).
- `scripts/checks/check-surface-leaks.json` is in no task's Files.
- Fold: pick one in the plan and name the file.
  - (a) Add the three entries to `check-surface-leaks.json` with a `standing-unverdicted` citation to shape 8, which removes the runtime member.
  - (b) Keep the type exported, on `/sveltekit` and `.` only, and drop only `normalizeMedia` from `/media`.
  - Recommend (a), since the design note says the type leaves the surface.

**2. blocker, correctness: T6 lines 391-395. The "real proof" names a leg that does not exist and cannot fail.**
- The fast lane has no e2e leg. `gate-tier.mjs:19-20`: "The fast lane runs no whole node project and no e2e."
- e2e does not run the dev build. `playwright.config.ts:31-48` runs `VITE_CAIRN_E2E=1 npm run build`, then `wrangler dev`. It never runs `vite dev`, which is the failure mode ergonomics 17 guards (`MIGRATION-NOTES.md:212`, `/admin` 500 under `vite dev`).
- The showcase cannot prove this either way. It reaches the engine through a `file:../..` symlink, which Vite treats as linked rather than external, so dropping `noExternal` there is likely invisible. This is from Vite's documented behavior for linked dependencies; not run.
- The real proof is `create-site.yml`. It installs packed tarballs, builds, and runs `npm run dev` with a `/admin` probe (lines 40-49, 210-255). A recent successful run took about 3 minutes.
- As written, that verdict arrives at T8, after T7 has edited `s15`, so the standing answer has no path back.
- Fold:
  - T6's acceptance becomes "push the head and name `create-site`'s verdict on it".
  - The standing answer fires on that verdict.
  - T7's `s15` edit waits for it.
  - The local showcase build stays as a smoke check only.
  - Per `cairn-running-passes`, the first push opens the draft PR, so CI is available by then.

## Majors

**3. major, correctness: line 87. `CAIRN_GATE_LANE=light` on "legs that drive no browser" reproduces a recorded out-of-memory failure.**
- Fast line 1 drives no browser, and it is pinned to the heavy lane.
- `gate-tier.mjs:155-163` (`FAST_LINE_1_LANE = ''`): a dist-reading check ran out of heap under the light cap.
- `pass-gate-tiers.md:163-168`: "Line 1 therefore stays on the heavy lane."
- Fold: "run each printed line as printed; set no lane prefix".

**4. major, correctness: T1 lines 116-123. `check:options` goes red on the design note's proved forms.**
- Probe on the trial patch: `defineAdapter.adapter.editor`, `defineAdapter.adapter.editor.navLayout`, and `defineConcept.concept.summaryFields` each report "has no doc comment".
- The walker descends into the inline intersection members. T1 names doc comments only for the helper type.
- Fold: add "each inline member in the two parameters carries a doc comment". After that, `check:tiers`, leaks, and self-use pass with one helper. The trial used two helpers, and the second one drew a self-use hit, so keep to the plan's one.

**5. major, correctness: T3 line 271-273. The acceptance grep can never print nothing.**
- `src/lib/admin/spellcheck-assets/dictionary-en-us.txt:11002` contains `transformations`.
- These hits sit outside T3's Files:
  - `src/lib/delivery/data.ts:17`
  - `src/lib/nav/site-config.ts:334` (a user-facing error string naming `AssetConfig`; a test may pin it)
  - `src/lib/sveltekit/content-routes-media-shared.ts:7,110` (a real type reader)
  - `src/lib/media/sniff.ts` (the acceptance names it, Files omits it)
- `editor-media.ts:62,75,94,215,222,256,263,270` uses `publicBase` as a local name, and no task says to rename it. The same is true of `MediaPicker.svelte:15,27,56-58`.
- Fold: exclude `src/lib/admin/spellcheck-assets`, add the four files, and state the local rename.

**6. major, correctness: T2 lines 188-189. The acceptance grep cannot pass without an edit the plan does not cover.**
- `examples/showcase/src/content/posts/2026-04-05-the-reading-surface.md:72` prints, as does the fenced sample at `styleguide/+page.server.ts:51`. The plan allows only "the styleguide's quoted sample".
- Editing the post changes published content, which site-visual reads, with no standing answer.
- Fold: state that all three lines are illustrative samples and exclude them by path, or rewrite them to `render(...)` and name what the baselines do. Recommend exclusion.

**7. major, correctness: T4 lines 282-290. Two showcase callers are missing, and other tests and files fall outside the task.**
- `chassis/entry-data.ts:15` and `routes/sitemap.xml/+server.ts:17` call `buildSiteDescriptors(cairn, siteConfig)`. After `:14` drops the parameter, each is an extra-argument type error, so the showcase's `npm run check` (`scaffold.yml:43`) fails. Neither is in Files, and neither matches "the showcase routes that import `posts`". `public-routes.md:50,69` and `content-model.md:156` teach the same call.
- Acceptance names `vite-manifest*.test.ts`, which matches one file. `vite-site-facts`, `vite-verify-nested-media`, `vite-verify-references`, and `vite-dev-build-define` also carry the `content:` option. Those that write real fixture sites also export `siteConfig`.
- `delivery-views.test.ts:15,24,31` uses `dir: 'posts'` against `/src/content/posts/...` keys, so both new refusals fire once it moves to one record.
- The `manifestPath|siteFactsPath` acceptance grep hits these, and only `assemble.ts:9` sits outside Files:
  - `src/lib/vite/assemble.ts:9` (bin help text)
  - `internal.ts:73,81,393,400,403,413,612` (locals and comments)
- The grep's stated exception is wrong: `CairnRuntime.manifestPath` is in `src/lib/content`, outside the grep's scope.
- Fold: add the files, name the five vite tests, and either rename the locals or narrow the grep to `opts\.manifestPath`.

**8. major, correctness: T7 lines 405-411. The listed line numbers leave `createSiteIndexes` behind, so the acceptance grep fails.**
- Missing: `S07-new-concept.json:5` and `s15-adopt-and-migrate.json:13`.
- `s15-adopt-and-migrate-bad.mjs:35,40` needs the rename and the new argument shape (`createSiteResolver(cairn, files)`), not only the loss of `{ validate: false }`. T4's API takes neither `{}` nor `{ posts }`.
- `s15`'s `cairnManifest({ configModule, content })` setup and expectation (`:21`) need checking against the dropped `content` option.
- Fold: correct the list.

**9. major, correctness: T1 Files. A taught cast survives every gate.**
- `skills/cairn-extending-a-site/references/tidy-and-ai-posture.md:104` teaches `posture: (cairn as CairnAdapter).aiPosture`. It still type-checks, so `check:snippets` stays green, and T1's grep covers only `examples/showcase`.
- Fold: add the file and widen the grep to `skills`.

**10. major, correctness: lines 80-81, clock stop. The second overrun stops on a count alone.**
- "A traced cause gets twice the estimate once" means a second overrun with a traced cause stops the line.
- The workstation lens requires that only a ceiling, an untraced cause, or a disallowed escalation stops a run.
- The plan also has no answer for actual minutes passing 780 mid-run. Lines 53-54 are a plan-time cut.
- Fold:
  - A traced cause keeps running up to the ceiling.
  - Over 780 actual, take the named set-asides not yet built, then close and report.

## Minors

**11. minor, correctness: line 95.** "`check:docs-gate` reads the range" is false. `docs-gate.mjs:7` reads the whole tree, and only `--page` narrows it. The same-commit rule is still right, because `check:snippets` type-checks every skill against the built `dist`. Fix the reason.

**12. minor, correctness: T6 line 385.** "`evalVirtual` adds it to the inline config" invites `ssr: { noExternal: [...] }` over `...inlineConfig`, which drops a site's own list. Give `cairnVirtualOnly` a `config()` hook returning the same constant, so Vite merges it. Neither `noExternal: true` nor a regex then needs a special case.

**13. minor, correctness: T5 Files.** `skills/cairn-extending-a-site/references/components-and-islands.md:23` teaches `registry={...}`. T5's own grep would catch it, but it is not in Files.

**14. minor, correctness: T3 test paragraph, lines 256-267.** Unnamed mechanical work that `npm run check` will surface:
- About 18 `createPublicRoutes({` sites need `resolveMedia: null`, for example in `public-routes.test.ts`, `-seo`, `-markdown`, and `factory-contracts.test.ts`.
- Six shell fixtures carry `mediaBase: '/media'`.
- `media-public-base.test.ts:100-125` is the second test pinning the shell's `setContext`. The standing answer covers it, but the plan names only `reproductions-stories`.
- Also, `resolveMedia: null` must become `undefined` before it reaches `render`.

**15. minor, correctness: T3 line 247.** The `:321` conditional resolves one way: `createMediaResolver` names `MediaConfig` on `/media`, so the entry stays and its reason changes. State that, and also `media/index.ts:12`'s comment. Simulated leak output shows the name is needed.

**16. minor, correctness: T4.**
- `SiteResolver`'s new interfaces no longer match `check-options.mjs:60`'s `EXCLUDED_TYPE`, and `check-options.mjs` is not in T4's Files. The members are walked instead, and they do carry comments. Update the regex and the root list at `:12-13`.
- Self-use will flag the two interfaces if only their declaring module uses them. Add allowlist entries, not just the `SiteIndexes` removal. T4 already lists that JSON.
- `types.ts:81-82` says the engine "never validates" `dir`, which becomes false.
- `check-surface-reexports.json:117,189,267` hold stale reasons.
- `site.concept(...)?.adjacent(...)` needs `?? {}` before destructuring.
- A preview whose permalink changed now gets neighbors, where today it gets none. That is harmless, but list it.

**17. minor, correctness: T4 line 346.** A single-sample 20% comparison beside four sibling sessions has no rerun rule.
- `**` and `*/*` return the same 30 showcase files, so glob-side cost can only be one directory walk.
- Fold: time inside the gate, excluding queue wait, and rerun both once on a breach.
- The narrowed glob also silently drops a stray file at `src/content/stray.md`, which removes the throw. The PR should say so.

**18. minor, correctness: lines 436 and 440-441.** The plan requires a CI verdict only at T8. Add "each accepted-task report names the CI verdict on that head", since CI runs on push once the draft PR exists.

**19. minor, optional: line 18.** The auto-mode line in `settings.json:420` covers "edits and commits" under `.claude/skills/` for a task under the sheet. Neither the two deletes in T7 nor `templates/waymark/.claude/skills/**` is literally named or probed. Plan-time cost is one line: the conductor exercises a delete in pre-launch, or the plan quotes the line and accepts the risk of a stop.

**20. minor, correctness: line 173.** `src/lib/docs/loader.ts:44` does not exist in this repo. Say `cairn-pub`'s path.

**21. minor, optional: estimates.**
- T3 (90): about 35 source files, 31 fixtures, 18 construction sites, and 9 skill pages. It reads closer to 120.
- T4 (85): 20 test files, 84 call lines, 5 vite fixture tests, and two builds. It reads closer to 110.
- T2 (70) is fine with a script, but the script must also convert about 71 `createRenderer(reg, …)` sites, not just the 147 `renderMarkdown` calls.
- Path stays near 450, well under 780. No cut.

**22. minor, optional: T2.** T2 drops `?? publicMediaResolver`, and T3 restores it through the bag. Between them, `render({ body })` callers (styleguide, insert preview) carry no resolver. T2 could pass the bag's `resolveMedia` at once by moving line 48 below `:68`. CI sees only the head, so this is cosmetic.

**23. minor, optional: T6 line 377.** The right neighbor test is `vite-dev-build-define.test.ts`, which already drives the hook. Its site-set-define case still passes through `result?.define`.

**24. minor, optional, over-ceremony: line 416, T4's timing.** Two showcase builds cost little, but finding 17 shows they can barely measure the question. The sheet requires the check, so it stays. Its result should not be expected to move anything.

## Verified clean

- **`@ts-expect-error` in unit tests:** `npm run check` reads `src/tests/unit/*.test.ts`. svelte-check reported a planted error there, and it reports `Unused '@ts-expect-error' directive` when the keyed type is removed. So T1's and T4's type tests can fail. `src/tests/types` is the excluded path, and only for the Env program.
- **T1 types on real code:** `summaryFields`, `screen` (nested `children` included), `aiPosture`, and `cairn.content.posts.dir` all check against the real `NavLayout` types. The real showcase adapter also compiled under them. The only error was the unstubbed `./site-config.js` import. The T1 standing answer is unlikely to fire.
- **T6 merge:** Vite 8.3.3 `mergeConfigRecursively` (`node_modules/vite/dist/node/chunks/node.js:2883-2895`) concatenates arrays and keeps `true`. Probe through a `config` hook: a list, a regex, `true`, and unset all land in both `ssr.noExternal` and `environments.ssr.resolve.noExternal`. The design note's "unproved" can be closed with those lines.
- **T4 glob:** `dot: !!options.exhaustive` (`node.js:27810`) excludes `.cairn`. Keys arrive as `/src/content/...`. The 11 concepts and 111 files across the four sites are confirmed: all flat under `src/content`, with no loose markdown. The showcase has 30 markdown files, also flat. A site's relative glob would produce `../content/...` keys, which the throw refuses. The docs should teach the absolute form.
- **T2:** `render`, `renderDocument`, and `SiteRender` can share one input. `preview.ts:358` and `EditPage` always pass a function, so the bag default never overrides them. Every `render` call site is covered. `adopt-cairn.md:38` is the only skill teaching the shape.
- **T3:** `publicPath`'s other callers need nothing beyond what they pass, since each already passes `mediaBase`. `normalizeMedia` can leave `/media`, since the only readers outside `compose.ts` are the showcase and tests that T3 rewrites. `ReproContext` keeps fixtures working. `opaque` has no other reader.
- **T5 and T6:** disjoint in hand-edited files. `runtime.registry` has no reader outside `compose.ts:59`.
- **Risk class:** `ordinary` plus `runner` fits. No task touches a path on the `auth-data` map, and `cairn.config.ts:160` is unmoved.
- **Citations:** most of the plan's `file:line` quotes were checked against the current tree and are correct, apart from the ones flagged above and a one-line drift on `preview.ts:354`, where "publicBase, presets" sits at `:355`.

No **OWNER FORK** arose. Every fold is a method call the plan can make.
