# Mechanics and feasibility review: tidy-lists plan at a441c4e8b

**Verdict:** the plan is buildable, but it needs folds before launch.
- No blockers. No finding reverses a design decision.
- Seven majors and one owner fork.
- The riskiest area is T3's committed read. It has four unspecified states, unstubbed tests, and a log claim the code doesn't support.
- T5 will go red on its own gate as listed.

**How this was verified:**
- Everything was read against source at the worktree, whose code matches `d71e4401e`. Only the plan, the design note, and BACKLOG changed in the commit.
- I could not run a code probe, because neither this worktree nor the main checkout has `node_modules`. Findings on the `tsx` import and the `vi.doMock` path come from reading source and were not run.
- The null-conventions throw is confirmed by the comment at `src/tests/unit/cairn-admin-actions.test.ts:775-777`, not by a run.
- All plan citations below are `docs/internal/plans/2026-11-01-tidy-lists-plan.md`.

## Majors

**M1. major, correctness. Plan :330-333, :355 (T5 file list).** T5 needs `check:surface --update`, and the plan omits it.
- `CAIRN_LOG_EVENTS` and `CairnLogEvent` are both spelled out in `scripts/checks/api-surface.md:397-398`, so the new event changes that file.
- T5 edits `skills/`, which is in the `exportSurface` bucket (`scripts/checks/gate-table.json`). The fast lane therefore runs `check:surface` and fails.
- T5's implementer must then leave its file list. T3, its pair, also regenerates that file (`VocabularyData` at `:587`, plus the composed `AdminData` at `:447` and `ContentRoutes` at `:475` if they expand). So "the pairs are disjoint" (:65) is false for this output.
- The conflict answer at :67 covers only `emit:template`.
- T2's generated surface is fine: `DEFAULT_TIDY_MODEL` isn't in `api-surface.md`, so T2 needs no update.

Fold: add `api-surface.md` and the `--update` command to T5. Extend :67 to "rerun `npm run check:surface -- --update` too; the regeneration is the resolution".

**M2. major, correctness. Plan :295-298, :314-315 (T3 #150, states).** The committed read leaves four states without a named result, and the log instruction misreads its source.
- **Absent.** `readFile` returns null, as `new GithubDouble({ main: {} })` does at `cairn-admin-actions.test.ts:642`. `parseSiteConfig(null)` isn't a "read failure" in the plan's terms. Name it: degrade to runtime with no log, or with a defined log.
- **Read failure.** The plan says it logs `config.invalid` "the way `vocabularyLoad` does". `vocabularyLoad` logs nothing on a read failure (`content-routes-settings.ts:330-333`). It logs only on a parse failure (`:337-344`). Logging `config.site-config-invalid` during a GitHub outage names the wrong fault in the first place `CLAUDE.md` sends a diagnoser.
- **Empty `conventions:` key.** Parsed value null makes `resolveTidyConventions(null)` throw reading off null (the comment at `cairn-admin-actions.test.ts:775-777` says so). The plan's sentence puts only the read and parse under degrade. `vocabularyLoad`'s comment says the dispatcher has no load-level try/catch, so a throw here is a 500. A site that deletes its only `fixes:` line gets exactly this YAML, because T1 teaches that step.
- **`resolveBackend` throwing.** `ctx.resolveBackend(event)` calls `runtime.backend.connect(env)` and must sit inside the guard too.

Fold: one try around resolve, read, parse, and `resolveTidyConventions`. Null or a read error degrades silently, as `vocabularyLoad` does. Only a parse error logs. Pin all three in tests.

**M3. major, correctness. Plan :295-300, file list :280-285.** T3 falsifies records it doesn't list.
- `parseSiteConfigOrFail`'s doc says nothing else in the module emits `config.invalid` with `scope: 'settings'` (`content-routes-settings.ts:162-164`). T3 adds a second such emit.
- `skills/cairn-extending-a-site/references/log-events.md:61` says only the nav and vocabulary loads degrade.
- `SettingsData.conventions`' doc also needs the new source.
- The tidy skill's `:55-57` note should say the screen shows committed values.

`log-events.md` is T5's file in the same pair, which is a second disjointness break.

Fold: T3 edits the comment. Give the `:61` row to T5 by name, with T3's wording in the plan.

**M4. major, correctness. Plan :312-318, :236-241 (test fixture state).** T3 doesn't name the fetch state of existing `settingsLoad` tests.
- `src/tests/unit/content-routes-settings.test.ts:184-250` and the hardening block at `:253-335` stub no fetch. `contentEvent` hands them the real `makeGithubBackend`.
- After T3, every `tidyEnabled` case attempts a live call to GitHub with `test-token`, then degrades.
- They would still pass, but with real outbound traffic in the unit lane and timing that depends on the network. Every case would pass through the degrade path, and each logs if M2 keeps logging.

Fold: T3 adds `new GithubDouble({ main: { [CONFIG_PATH]: SEED_YAML } }).install()` in a `beforeEach` for those two blocks. Add a one-line check that no `settingsLoad` test leaves fetch unstubbed. The `access-map-route-enforcement.test.ts:140` case needs a look too, if its runtime enables tidy.

**M5. major, correctness. Plan :127, :128-129 (T1 acceptance contradicts itself).**
- `git grep -nE "conv\.fixes|fixes: (true|false)" -- src templates examples` covers `src/tests`. The required new `nav-site-config.test.ts` case needs a YAML holding `fixes: false`, so the acceptance can't print nothing.

Fold: scope the grep to `src/lib templates examples`.

**M6. major, correctness. Plan :120-125 (T1 test list misses three failing tests).**
- `tidy-settings.test.ts:88-96` asserts `pills.length` is 2 in `h2`. One remains.
- `:112` and `:187-188` query `getByRole('button', { name: 'Fixes' })`. Those fail.
- `:119-122`, which the plan does name, is only one of the three sites using that control.
- `:80-82` passes unchanged, so the "point it at a style row" instruction is not needed.

The `git grep -l 'fixes: true'` list also has two traps.
- `SEED_YAML` at `content-routes-settings.test.ts:62` holds only `fixes: true` under `conventions:`. Dropping it makes the block null. Substitute `oxfordComma: always`.
- `nav-site-config.test.ts:268,271` use `fixes: false` as the sole key, so substitute there too.

The stale-key cases stay valid: JSON strings like `'{"fixes":true}'` at `content-routes-settings.test.ts:104,138,147,162` aren't type-checked and can remain.

**M7. major, correctness. Plan :20-24, :228-234 (T2's live API proof is weaker than the change it covers).**
- The key was proven by `GET /v1/models` only. That read doesn't show that `/v1/messages` accepts this key on both ids with `output_config`. It also doesn't show that `claude-sonnet-5` still serves.
- The T2 test fixture for `stop_reason: 'max_tokens'` is hand-written rather than taken from a real reply. With adaptive thinking, `content` may hold non-text blocks.
- Entries under 6,000 characters can't test the default model's speed. The 30-second deadline guards inputs up to 24,000 characters, and the doc's "comfortably inside the 30s deadline" claim at `content-routes-tidy.ts:45-50` was written for Sonnet 5.
- The proofread records no latency, so a slower default would ship unseen.

Fold, about 5 minutes before launch:
- Run one `messages.create` per model at `effort: 'low'`.
- Run one at `max_tokens: 5`, and write the fixture from that reply.
- In the proofread, add per-call latency and output tokens.
- Add one entry near 20,000 characters.
- Name the answer if it passes `ctx.tidyTimeoutMs`: log an item through `standards:log-issue` and list it in `## Decisions`.

Also state the script's form, which is left open at :228-234:
- It is a `.ts` file run by the repo's `tsx`, because `tidy-prompt.ts` re-exports `../nav/site-config.js`, which imports the YAML library. `python3 -I` can't load it. `tsx` is a devDependency, but `node_modules` exists only after the setup command.
- The conventions are `defaultTidyConventions()`.
- The text is the body with frontmatter stripped. `tidy-controller.svelte.ts:142` sends the body, not the file.
- The old prompt comes from reversing the two word edits, or from a dump before step 7.
- Reading `~/Projects/907-life` from a worktree-isolated subagent is not pre-flighted. Exercise it.

## OWNER FORK

**F1. OWNER FORK, correctness. Plan :59-62.** Two T2 stop answers aren't in the sheet.
- "The default stays" on a bad proofread, and "list the check as not run" on a refused key read, are both this plan's own answers.
- BACKLOG #192 says the change "needs a before-and-after proofreading check". The sheet says only that #192 reads the model list first.
- The second answer lets the default change ship with the required check unrun.

Options:
- (a) Keep both, and ask Geoff to accept them at launch.
- (b) A voice or structure break sets the pin back to `claude-sonnet-5` and files the item.
- (c) A refused read holds the PR for the conductor to run the proofread.

Recommend (a) for quality and (c) for the refusal. The conductor session can read the key itself in one step, so the check doesn't need to be skipped.

## Minors

**m1. minor, correctness. Plan :151-157, :177 (T4).** No-target state.
- "Mount one `DeleteDialog`" plus "sets the entry, awaits `tick()`, then calls `open()`" reads as `{#if target}`. The test "on any load the id count is 1" requires always mounted.
- `id` is a required string.
- Say: mount inside the `data.entries.length > 0` branch after `AdminTable`, with `id={target?.id ?? ''}`, and a bound instance typed from the component.
- Also say the refused row's target is found by `data.entries.find`, and what happens if it's absent.

Otherwise the T4 mechanism checks out:
- `trigger`, exported `open()`, `role="alertdialog"`, and the name `Delete this post` (showcase `singular: 'post'`) are all as stated.
- The dialog posts `concept` and `id`, and `listDeleteAction` reads only `id`.
- `ConceptList.test.ts:46-52` still passes, since the dialog form has a `CsrfField`.
- Keep the `CsrfField` import, because the create form at `:496` uses it.
- `publish/refusal-banner` and `editor/sidebar-list` declare no markers, and no story anchors on the row form.
- The only other row-delete specs (`custom-screen.spec.ts`) are a separate screen.

**m2. minor, correctness. Plan :261-262 (T6 #58).** The plan adds a symptom row but leaves a false one.
- `components-and-islands.md:173` says bad props JSON and a mount throw are "(all silent)". After T6 they aren't.
- Fold: edit `:173` in place, splitting the console-reporting causes from the silent ones (not scrolled to, registry mismatch).
- The rest of #58 is exact: `:43-45`, `:50-52`, and `data-cairn-island` are right. Each `catch {` must become `catch (err)`.
- #194 has no test or docs pin. #41 is true: `content-routes-entry-write.ts:254-255` says the save commits no manifest.

**m3. minor, correctness. Docs gaps (T3, T2, T7).**
- `docs/admin/is-it-working.md:232` says that to test the key, "run one Tidy suggestion in the admin". After #147 a site with no key has no button. T3 must edit it.
- `tidy-and-ai-posture.md:63-65` should name the hidden button too.
- T7's search at :377-378 has no term for islands, so it won't reach m2's row. Add `island|console`, `Fixes`, and `next deploy`.
- `content-routes-context.ts:104-111` says a proofread is "never capped mid-response". T2 makes that false, and the plan's T2 steps don't name that comment.
- `:105-108` and `content-routes-tidy.ts:45` name Sonnet 5's tokenizer. `TidyClient.tidy`'s doc should say a gateway owns truncation, since the check lives only in the default client.
- `tidyAction`'s doc at `:100-110` lists throw classes and needs the new one.
- `CairnTidySettings.svelte:20,:32` header comments name Fixes on and the On/Off pill. T1 doesn't list them.

**m4. minor, correctness. Line and quote errors.** All other quotes and line numbers match, and the quoted text is right in every case. Three of these are hazards rather than drift:

| Plan cite | Actual | Note |
|---|---|---|
| `site-config.ts:157-163` | `:158-163` | `:157` is `export interface TidyConventions {`. Deleting it as written breaks the file. |
| `tidy-prompt.test.ts:137-141` | `:136-141` | `:136` is the `it(`. As written it orphans the opener. |
| `CairnTidySettings:293-296` | `:293-297` | The closing brace is left out. |
| `CairnTidySettings:259` | `:258` | |
| `:430-478` | `:430-475` | |
| `:467-471` | `:468-472` | |
| `:351` | `:352` | |
| `:349-353` | `:350-354` | |
| `site-config.ts:197` | `:196` | |
| `content-routes-context.ts:117-122` | class `:123-128`, doc `:114-122` | |
| `content-routes-settings.ts:213-214` | `:212-213` | The "can never diverge" claim. |
| `content-routes-tidy.test.ts:372` | block at `:370` | |
| `ConceptList.svelte:442-454` | quote starts at `:443` | |

Other notes:
- T1 deletes six or more lines before `:402` and T2 adds lines at `:125-129`, so T2 and T3 cites go stale in sequence. Tell tasks to locate by the quoted text.
- `s12...json:12` also carries a stale `:124` (actual `:136`) beside the `:133` the plan fixes.

**m5. minor, correctness. Plan :7.** The arithmetic is wrong: 30 + 55 + 40 + 40 is 165, not 170. Each pair task also pays `npm ci` twice over in its own worktree, and T7's 40 minutes holds CI, three reviewers, folds, and twelve screenshots. The path is still well under the 280 ceiling, so no cut follows, but T7 will likely run long. Say so rather than trimming.

**m6. minor, correctness. Plan :14-15.** A refused `.claude/skills` write is "a stop" with no standing answer.
- The sheet's pre-launch check says to exercise the write any permission needs, and the sheet records this write as inferred-may-refuse.
- Fold: the conductor exercises a no-op write to that path before launch.
- Or give the answer: the eval line is listed in `## Decisions` and filed.

**m7. minor, optional. Plan :209, :211 (T2 #192 cap).** A truncated reply goes through the catch, so `markKeyHealthy()` at `:241` is skipped.
- The key did work, and a prior unhealthy mark stays until its TTL.
- Fold: call `markKeyHealthy()` in the new branch and pin it.
- `fail(413)` fits. `tidy-controller.svelte.ts:183-186` shows `failure.error` for any failure, so the shared copy appears.
- The `vi.doMock` approach fits the existing block's pattern at `:381-390`, with `default` as a class and `afterEach` already resetting. Don't `throw` in the factory; return `{ default: class { messages = { create } } }`.
- `reason` isn't typed in `src/lib/log/`, so drop ":215-216 if the reason is typed there". T2 doesn't touch `src/lib/log/`, and the overlap you asked about doesn't exist.

**m8. minor, optional. Plan :295.** Read only when the editor tier renders.
- The condition is `tidyEnabled`, but the conventions are unused when the key is missing or invalid.
- Fold: read after the probe, when `tidyEnabled && keyPresent && keyStatus !== 'invalid'`.
- Cost otherwise is one raw GitHub GET per screen load on a rarely opened screen, which is acceptable.

**m9. minor, optional. Plan :384 (CI only at close).** The branch's first push is at T7.
- The two e2e edits in T4 get no run for most of the pass, and the fast lane doesn't prove the worktree's engine for specs.
- Every accepted-task report can name only local checks.
- Fold: push after the T1/T4 merge, and have each merge report name the CI verdict on that head.
- The executor prompt itself is at `design-audit/prompts/tidy-lists-plan.txt`, which is out of this review's scope. Check it carries this.

**m10. minor, optional. Plan :396.** The docs gate is listed in acceptance with no ordering. Say it reruns after the last review fold.

**m11. minor, optional. Plan :215-216, :205.** The acceptance grep at :243 prints two `TIDY_MODEL_LABELS` rows (`claude-sonnet-5`, `claude-haiku-4-5`), and the plan says "row". Its "only" line needs that plural to be read correctly.

**m12. minor, optional. Plan :306.** "After step 21's sentence" means line 21, which is the fifth list item. Say "the **Save changes** item".

## Over-ceremony

None material. The sweep table and stops are what the sheet asks for. One small trim: T1's instruction at :122 to repoint `:80-82` is work on a passing test.

## Checked and sound

- **T3 #147.** `tidy-key-health.ts` can import `./workers-env.js`. `workers-env.ts` imports only a type, and every importer chain already reaches it through `content-routes-settings.ts`. So there's no cycle and no Node-entry reach. `editLoad` already reads `env` through `resolveBackend`, and `admin` isn't prerendered. The unit and component projects alias the fake. `editEvent` at `:69` needs an `env` argument for the three tests, and the plan's "all three" is right: the unhealthy test would pass vacuously otherwise. The `cairn-admin-actions` runtimes that enable tidy set the fake key at `:346,:386,:786`. `tidy.spec.ts` has the dummy key at `handle.ts:210`.
- **T3 #150 names.** `runtime.siteConfigPath` is real and required (`types.ts:495`), and the module's own `siteConfigPath()` wrapper exists. `settingsLoad` has no backend yet, and `ctx.resolveBackend(event)` is the call. Auth runs first.
- **T5.** `heldAddress(next, runtime.concepts, movedRow)` matches the signature and the publish call at `:532`. Self-match can't occur (`row.concept !== self.concept || row.id !== self.id`). `movedRow` has all four fields. `held.concept` and `held.id` exist. A non-routable concept returns null. Both follow-up tests are feasible with `renameFetch` and the `pages` concept's manifest row at `/posts/new`.
- **T1.** `validateTidyConventions` and `resolveTidyConventions` copy known keys only. `setTidy` replaces the block, so the next save drops a stale key. `parseSiteConfig` doesn't check under `tidy`, so a stale key parses and the proof must assert on the resolved value. `CheckIcon`, `CircleIcon`, `StatusChip`, `toggleBool`, and `onoffClass` all stay in use, so no import goes dead, and `joinList` is safe because the list is never empty.
- **Pairs.** T1/T2 and T2/T3 run in sequence, so their shared files don't collide. T2 and T6 emits touch different skill files, and `emit:template` regenerates whole. No settings baseline exists in `admin-visual.spec.ts-snapshots`, and the vocabulary region is empty at rest, so ":25 only if a baseline goes red" stands.
- **`cairn-cms-9b`** is the conductor's session name (ledger `:157`), and `workstation#192` merged.

Files: `docs/internal/plans/2026-11-01-tidy-lists-plan.md`, `docs/internal/plans/2026-11-01-tidy-lists-design.md`.
