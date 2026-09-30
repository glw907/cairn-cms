# Theme identity pass B plan review: mechanics and feasibility

Target: `docs/superpowers/plans/2026-09-27-theme-identity-pass-b.md` at `07035110` (branch
`theme-b-plan`, pass A's head `1486f3f7` plus the plan). Lens: does every mechanism the plan relies
on behave as stated, and can each task build in the stated order.

Method: a scratch clone at `07035110` under the session scratchpad (`pb-mech/repo`, with
`node_modules` borrowed read-only by symlink from pass A's worktree, now unlinked). The rename was
applied mechanically there (`git mv`, relative imports, `exports`, the sheet build paths), then
packaged, type-checked, surface-checked, audited, and merge-probed. No engine browser suite and no
`cairn-run-gate` ran. The one side effect outside the scratchpad: `svelte-check` touched the empty
`node_modules/.vite-temp` directory in pass A's worktree (gitignored, empty before and after).

Counts: 1 blocker, 3 major, 7 minor, 2 over-ceremony.

## Where the plan is sound (verified)

- **The rename builds.** After `git mv src/lib/components src/lib/admin`, moving `PreviewBanner`
  to `src/lib/public/`, and repointing the 30 relative imports, `npm run package` emits
  `dist/admin/` (with `fonts/` and the compiled `cairn-admin.css`) and `dist/public/{index.js,
  PreviewBanner.svelte,...}`, and `dist/components` is gone. `svelte-check` over the moved tree
  reports errors only under `src/tests/` (184 errors, all from test paths not yet repointed), none
  under `src/lib`. `publint --strict` prints "All good!" and `check-package-files.mjs` passes.
- **The admin sheet does not move.** With `@source` repointed to `src/lib/admin/**` and
  `src/lib/public` left out, the compiled sheet is byte-identical to the baseline
  (`cmp` clean, 652,839 bytes both). Decision 3's safelist contingency will not fire.
- **`PreviewBanner` keeps its coverage.** `check-invisible-craft.mjs` with `src/lib/public` added
  to `SCAN_SCOPE`: "0 errors, 0 advisories, 16 suppressed" before and after; the only diff is
  "977 files scanned" becoming 978 (the new `public/index.ts`). Its only directives are the eight
  `token-colors` suppressions, so moving it out of `ADMIN_SCOPE` strands no motion directive.
  Nothing admin-side imports it (`git grep PreviewBanner -- src/lib` outside the file and barrel
  prints nothing).
- **The surface gates follow.** With `/admin` and `/public` mapped in `SUBPATH_SETTINGS`,
  `check-surface-leaks.mjs` prints "OK (46 recorded leaks)" (unchanged), and
  `check-surface.mjs --update` rewrites `api-surface.md` with `## /admin` and `## /public` in place
  of `## /components`. An unmapped `/admin` fails loudly: "package.json exports /admin with no
  CONFIG mapping and no exclusion".
- **Rename detection holds at this scale.** A merge of a branch editing
  `src/lib/components/{cairn-admin.css,PreviewBanner.svelte,index.ts}` into the rename commit
  (103 `R`, 14 `M`, 1 `A`) lands each edit on `src/lib/admin/` or `src/lib/public/` with no
  conflict. A new file under the old folder raises a conflict (M7).
- **The runner and classifier behave as the Gates section says.** `gate-tier.mjs --pin targeted`
  prints "unknown --pin tier" to stderr, nothing to stdout, and exits 1; `pass-execute.js:335`
  then runs `t.gate`. `--pin engine` prints exactly the plan's engine string.
- **Plan-time counts match.** Grep 1: 486 lines in 181 files; decision 6's greps: 30 lines, 19
  files, 28 lines. `RATIFIED_NORMS`: 12 rows over the 8 named roles. `node dist/audit/bin.js norms
  button-primary` works today. The three `0.98.0` constants sit where decision 13 says. The Go
  heuristic keys on `CairnAdminShell` (`check_mount.go:37`). The only user-scope hit is
  `cairn-release/SKILL.md:107` plus a dated record.
- **Decisions 9 and 12 read the tree correctly.** The two rule comments justify their reach by
  `src/lib/components` as quoted. The six `bg-primary/10` sites are all non-`btn` elements, and
  the only `bg-neutral` is the shell's avatar `div`.
- **Task 2 is safe for existing tests.** The `MarkdownEditor` component test asserts
  `toContain('INSERTED')`; the round-trip e2e asserts by text; `fragments.spec.ts` counts
  include occurrences. None pins exact whitespace.
- **The segment A isolation is well-founded.** Svelte 5's default `cssHash` hashes the filename
  (`validate-options.js:77`, `hash(filename === '(unknown)' ? css : filename ?? css)`), so every
  scoped component's class hash changes with the move. `admin-sheet.spec.ts` compares sheet content
  only for the absence of one utility (`:150`), so it survives, but a cross-component cascade
  order change is possible in principle. CI's visual specs at the segment A boundary are the right
  proof.

## Findings

### M1 (blocker): decision 14's test cannot pass as specified

`plan:366-374`, task 3 acceptance `plan:830-831`.

The test runs `stock-default-hazards` (all arms, not only the three new ones) over the engine tree
and every guidance fence, and asserts zero findings. Three facts break it.

1. The existing guarded-retirement arm fires four advisory findings in cairn's own tree today.
   Probe (`runStatic` with only `stock-default-hazards`, over `src/lib/admin`,
   `src/lib/admin-toolkit`, `examples/showcase/src/routes/admin`):
   ```
   advisory src/lib/admin/EditPage.svelte:1630 class "cairn-btn-guarded" is retired; ...
   advisory src/lib/admin/EditPage.svelte:1918 ...
   advisory src/lib/admin/EditPage.svelte:2014 ...
   advisory src/lib/admin/EditPage.svelte:2394 ...
   ```
   No suppression directive for this rule exists anywhere in the tree.
2. Shipped guidance teaches `badge-ghost` in a fence and in bold prose
   (`skills/cairn-admin-screens/references/exemplar-detail.md:115` and `:130`). The existing
   error-tier arm flags it. Task 3's Files do not include that page, and task 5's pattern list
   (`plan:890-892`) omits `badge-ghost`, so task 0's claim "no retired recipe ... in any fenced
   block" is false for this retired pattern.
3. Five of the 13 `svelte`/`html` fences under `skills/**` fail `parseComponent` (`dist/audit/markup.js`)
   with "Unexpected token": elisions such as `onclick={...}` and a TypeScript snippet parameter
   (`{#snippet panel(datum: HouseholdListRow)}`, `exemplar-list.md`). Normalizing `{...}` to `{_}`
   recovers three; two stay unparseable ("`<div>` was left open", the TS parameter). The
   `badge-ghost` fence is one of the two. A test that skips unparseable fences goes green without
   checking the fence that carries the defect.

Fold:
- Scope decision 14's assertion to `radius-scale` plus the three new arms, identified by their
  message constants or an arm field, and zero error-tier findings from `stock-default-hazards`.
  Leave the guarded-retirement advisory alone; it belongs to the `0.98.0` promise decision 13
  already surfaces.
- Add `exemplar-detail.md` to task 3's Files (or move the guidance leg to task 5). Replace
  `badge-ghost` with the ratified quiet chip register in the fence and the prose at `:130`. Add
  `badge-ghost` to task 5's "no shipped guidance teaches" list.
- State the fence strategy: normalize `{...}` and bare `...` elisions, prefix
  `<script lang="ts"></script>` for TypeScript, and fail, never skip, a fence that still does not
  parse. Rewrite the two fragment fences to close their elements. Alternatively, collect class
  sets per element with a regex over `class="..."` for the guidance leg alone.

### M2 (major): the rename greps contradict text the plan itself requires

Task 1 acceptance `plan:719-727` and `plan:737-739`; close `plan:974-980`, `plan:1002`,
`plan:1015`.

Grep 1 (`lib/components`) and grep 3 (`` `/components` ``) must print nothing over the whole tree
except the spec's eight exclusions. Several places the plan mandates must name the old path:

- Task 1's own acceptance requires a `config.test.ts` case naming `src/lib/components` under
  `static.scope` (Review focus 2). That literal sits in `src/tests/`, which grep 1 covers.
- Decision 9 and the close require `docs/reference/cairn-audit.md` to tell a site how to restore
  the narrowed reach ("name the root under `static.scope`"). That sentence names
  `src/lib/components`.
- The close writes `docs/extend/upgrade-cairn.md` "with the old subpath named". It is not excluded
  (only `migration-notes.md` is). It is also a generic procedure page with no per-version section,
  so the per-version text belongs in `migration-notes.md` alone.
- The close's facts bullets (the rename, the narrowing), the live ROADMAP pass-B entry (today at
  `ROADMAP.md:289`: "B renames `./components` to"), and STATUS's topology note will name the old
  path. The final-head acceptance re-runs all four greps.
- ROADMAP's historical lines (`:1005-1010`, `:1362-1364`, `:2579`, `:2590`, `:2760`) describe the
  old tree. `plan:666` says "path mentions of the live tree only", but no grep exclusion says so,
  so the implementer must choose between rewriting history and failing the grep.

Fold: make the post-condition "every remaining hit is on an allowlisted line". Commit the
allowlist beside the greps: the `config.test.ts` restore case, the `cairn-audit.md` restore
sentence, ROADMAP, `docs/STATUS.md`, and the facts bullets that record the rename. Drop
`upgrade-cairn.md` from the close's per-version writes. Alternatively, scope the final-head greps
to code and shipped surfaces (`src`, `scripts`, `examples`, `templates`, `packages`, `skills`,
`claude`, `tool`, `docs/reference`, `docs/admin`, `docs/editors`, `docs/extend` minus the
migration notes).

### M3 (major): task 4's `norms:check` task check cannot run as written, and proves nothing here

`plan:225`, `plan:862-863`.

`generate-norms-manifest.mjs` never starts a server. It reads `BASE_URL`, default
`http://localhost:4173` (`:32`), and fails with "no server answering at ...; start
examples/showcase's preview (VITE_CAIRN_E2E=1 npm run build && CAIRN_DEV_BACKEND=1 npm run preview
-- --port 4173) or set BASE_URL" (`:127`). CI's `norms.yml` starts that preview first. The plan's
`cairn-run-gate 'npm run norms:check'` either fails red, which the task-check rule makes blocking,
or measures whatever else holds 4173, the port the Global constraints bar for exactly that reason.
Decision 15 puts the recipe rows outside the manifest, so no task 4 change can alter the check's
result. It is also CI-only by design ("It is deliberately outside the `check:*` family",
`norms.yml` header).

Fold: drop `norms:check` from task 4. Keep `git diff --exit-code src/lib/audit/norms-manifest.json`,
which the acceptance already carries, and a unit assertion that `buildManifest`'s output is
unchanged by the new rows. If a render proof is wanted, dispatch `gh workflow run norms.yml --ref
theme-identity-b` at segment B's boundary and let the Haiku probe read it.

### M4 (major): the restore instruction for `src/lib/components` silently drops coverage or hard-fails

`Consumers must:` at `plan:965-970`, decision 9 at `plan:318-319`, Review focus 2 at `plan:536-538`.

`static.scope` replaces the defaults; it does not add to them. `asPathList` returns the configured
list unchanged when present (`config.ts:157-163`). A configured root that does not exist is a hard
error: "the configured static scan scope does not exist" (`run.ts:65-72`). So:

- A site that follows "name `src/lib/components` under ... `static.scope`" literally, with
  `["src/lib/components"]`, drops `src/routes/admin` from every static rule without a word.
- A site that copies the full new default list gets a hard failure on `src/lib/admin` or
  `src/lib/admin-toolkit`, which most consumer trees lack.
- "The admin scope (`static.scope`)" conflates two keys. The three `adminOnly` motion rules read
  `static.adminScope` (`run.ts:165`). Review focus 2's "every static rule reads them again" is
  false for those three, which never read `src/lib/components` before either (it was absent from
  `DEFAULT_ADMIN_SCOPE`). A `config.test.ts` case written to that sentence fails.

Fold: word the `Consumers must:` line, the migration note, and `cairn-audit.md` as "set
`static.scope` to the admin roots your tree has plus `src/lib/components` (for example
`["src/routes/admin", "src/lib/components"]`); the list replaces the defaults." Drop "the admin
scope" as a label for `static.scope`. Change Review focus 2 and task 1's acceptance to "every
non-`adminOnly` static rule".

### M5 (minor): task 5's gate never runs the test its acceptance requires

`plan:897-899`. The acceptance says "Decision 14's test still passes", but the docs string runs no
unit test, and task 6's sync string runs only its own file. A guidance fence that reintroduces a
patch lands red until the segment C CI run. Fold: add a light task check,
`CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit <decision-14 test file>'`, to
tasks 5 and 7.

### M6 (minor): `radius-scale` misses Tailwind v4's parenthesized variable shorthand

`plan:332-345`. Decision 11 flags `rounded-[...]` but not `rounded-(...)`. Tailwind 4.3.3 in this
tree compiles it (probe):
```
.rounded-\(--radius-field\) { border-radius: var(--radius-field);
.rounded-t-\(--radius-box\) { border-top-left-radius: var(--radius-box); ...
```
An agent writing `rounded-(--radius-field)` or `rounded-(--my-radius)` passes silently. Fold: treat
`rounded(-side)?-(...)` like the bracket form, naming the role class for `--radius-{selector,field,box}`,
and add one fixture of each.

### M7 (minor): the merge-forward protocol does not name the conflict a new file raises

`plan:159-165`. Probe output for a new file under the old folder:
```
CONFLICT (file location): src/lib/components/NewThing.svelte added in probe-a inside a directory
that was renamed in HEAD, suggesting it should perhaps be moved to src/lib/admin/NewThing.svelte.
```
The merge halts before step 3's greps run, and a new file whose content never names the old path
would not show in the greps anyway. Fold: step 2 names this conflict. Accept git's suggested
`src/lib/admin/` location, or move the file to `src/lib/public/` when it is public markup, then
`git add` it. Step 3 then adds `test ! -e src/lib/components` to the greps.

### M8 (minor): path forms the four greps miss

Decision 6 at `plan:295-300`. None of the four greps matches these forms (probe greps):
- `scripts/checks/check-admin-prose.mjs:23`: `join(ROOT, 'src', 'lib', 'components')`. It is in
  Files, and `readdirSync` throws loudly if it is missed. Decision 3 also needs this single
  `COMPONENTS_DIR` to become a list.
- `src/tests/unit/check-editor-quotes.test.ts:100,118` and `engine-isolation.test.ts:36,62`
  (`join(libDir, 'components/cairn-admin.css')` and the regex `\.\.\/components\/`). These fail
  loudly in the gate.
- `src/tests/unit/components-barrel-prune.test.ts:44-46`: `'./components/spellcheck-worker'`
  and similar keys. These pass vacuously after the rename. Repoint them to `./admin/...`.
- `src/lib/admin-toolkit/index.ts:46`: "The media picker files under `components/`" goes stale.

Fold: add a fifth grep for `components/` and the `'components'` literal over `src` and `scripts`,
with daisyUI's `node_modules/daisyui/components` and `@layer components` excluded.

### M9 (minor): the new Vale tokens inherit a Go-tool message and case sensitivity

Decision 8 at `plan:305-313`. `Cairn/Names.yml` is one `existence` rule. Its message is about "the
Go tool" and capital "Cairn", and it has no `ignorecase`, since it must match `Cairn` exactly. A
"Site component" at a sentence start slips, and a hit prints a message about the Go tool. Fold: put
the component-name tokens in their own rule file (for example `Cairn/ComponentNames.yml`,
`level: error`, `ignorecase: true`) with a message pointing at the Names grid.

### M10 (minor): probe 1 cannot enforce "reads only the shipped guidance"

Decision 20 at `plan:413-422`. An Agent-tool subagent inherits the session's context: this repo's
`CLAUDE.md` (which points at `admin-design-system.md`) and the user-scope DaisyUI-first rules. This
review's own agent received both. The probe therefore measures guidance plus engine orientation,
which flatters the guidance. Separately, the rendered audit needs the build and serve flags the
norms generator names (`VITE_CAIRN_E2E=1` build, `CAIRN_DEV_BACKEND=1` preview) to reach an
authenticated `/admin/probe`; the plan says only "serves the probe's showcase build on port 4391".
Fold: record the contamination as a stated limit in the ledger, or run the probe as a headless
`claude -p` from a scratch tree outside `~/Projects/cairn-cms` with project settings only. Name the
two env flags in S1.

### M11 (minor): two identical count sentences, only one of which changes

Task 3 outcome at `plan:808-812`. `docs/reference/cairn-audit.md:73` ("Seventeen rules run:
fifteen error tier, and two advisory") is the static count and moves to eighteen. `:275`
("Seventeen rules run. The first seven are error tier") is the rendered count and must not change.
Fold: cite both line numbers in task 3 so a find-and-replace does not hit `:275`.

## Over-ceremony

### O1: `norms:check` in task 4

Covered by M3. Its cost is one heavy-lock slot, a full showcase build and a browser render per
attempt, with fix rounds repeating it, for a result task 4 cannot change.

### O2 (low): task 1's local five-spec e2e duplicates the boundary CI run

`plan:201-202`. Segment A holds only task 1, and its boundary pushes to CI's full e2e, both visual
specs included, right after the task. The local `test:e2e -- preview.spec.ts ...` leg costs one
heavy-lane showcase build and run per attempt, repeated on every fix round. Keeping it saves a
push-and-read cycle when the rename breaks a route, so this is a choice between costs, not a
defect. Option: drop the e2e leg and keep `check:close`, the node projects, and the component
project; the boundary CI read is already the rename's proof. Recommendation: keep only
`preview.spec.ts` (the one route whose import moves to `/public`), and let CI carry the rest.
