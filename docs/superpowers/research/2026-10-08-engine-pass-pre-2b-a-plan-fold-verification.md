# Engine pass A before stage 2b: fold verification (2026-10-08)

Target: `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md` at `eb5e5ef4` ("Fold the three
plan A reviews"). The reader is fresh and took no part in the reviews or the fold. Inputs: the fold
record, the three reviews, the spec, plan B at `afa59a46` (read only), `~/.claude/workflows/pass-execute.js`,
and `~/.claude/skills/pass-core/SKILL.md`. Code was read on `main`. `scripts/checks/gate-tier.mjs` was
probed with `--range HEAD~1..HEAD --pin full|engine|docs|tool`, and every pin printed its string and
exited 0. Task 1's two grep post-conditions were run on `main`.

Bar: only gaps that affect correctness or a stated requirement are listed.

**Counts:** 0 blocker, 4 major, 3 minor.

**Verdict:** needs a second fold. The four majors are small. Three are wording or scope edits. The
fourth (V-M4) is a method call the conductor can make alone, so it is not an owner fork.

## Question 1: did each blocker and major close where the fold says?

| Item | Closed? | Evidence |
|---|---|---|
| Args mapping | yes | plan:91-98 sets `criteria` to Outcome, Acceptance, Mutations, and Decisions carried. `implementPrompt` (pass-execute.js:413) and `reviewPrompt` (:606) both render `Acceptance criteria: ${t.criteria}`, so both agents get all four. `notes` reaches the implementer only (:415), and the plan accounts for that. Decisions carried blocks sit in Tasks 1, 2, 4, 6, 7, 11, and 12, and every Decision those tasks cite is quoted in full. |
| Task 1 identity, admit half, `{}` mutation | yes | plan:511, 515-516, 518-520, 546-547. The fail-today claim holds. `requireAccess` 403s an owner on an unmatched target (guard.ts:462-465, 479), and `authorizeAdminTarget` returns `no-rule` first (admin-action.ts:123), so the owner admit on `/admin/x` fails today under `{}`. |
| Task 1 added files | yes, with a defect in the grep (V-M1) | plan:473-477 lists option-map (rows at `option-map.json:45,48,125` exist), facts pointer repairs (`f:3z1uxv` at extend.md:839 cites the deleted file), and `admin-routes.md:218` (the bare `createAuthGuard()` at :224). |
| Task 4 `condition.go` | yes | plan:681-682. `TestConditionsMatchEmbeddedMirror` (conditions_test.go:93) and `Conditions()` (condition.go:76) exist. |
| Gate pins and lanes | yes | `full` is a valid pin on Tasks 1, 3, 7, 8, and 10. Under a pin, `resolveGate` returns `a.gate` (pass-execute.js:685-686). `stripGateAssignments` drops the allowlisted `export E2E_PORT=4392` step, so the classifier's F matches. Task 2's `gateLane: "heavy"` wins over the `tool` default, because `t.gateLane` is read first and is not `"light"` (:404, :545). Its diff computes to `engine+tool`, which runs Chromium. Task 12's docs tier is `check:docs-gate`, and none of its legs drives a browser, so the light lane fits. Task 4 computes to `full+tool`, because the migration `.sql` is unclassified and so counts as full. Task 7's pinned `full` skips T, but no Go test or golden reads the `github.app-unreachable` remediation text, and `check:tool-conditions` runs inside the docs gate. |
| Task 8 `error` path and abort e2e | yes, but its coverage claim cannot hold (V-M3) | plan:849-852, 863-864; mutation at :875. |
| Task 9 and 10 injection point | yes | plan:906-908 and 942-944 place the injection after the first read and before the commit. This kills the reorder mutation. |
| Decision 16 delete gate | yes as written; the cost is understated (V-M4) | plan:257-266, 993-1002, 1013-1017. |
| Close: serialized tests and scratch-showcase smoke | yes | Close step 2 (plan:1246-1249) and step 5 (plan:1270-1280). |
| Task 6 on Opus | yes | plan:100-102 and 1045. `implOpts` carries `t.model` into the first dispatch and the fix round (pass-execute.js:526, 535, 571). |

## Question 2: do the two plans agree at their seams?

- **Marker block:** they agree on no nesting. Pass A has one inner `theme-kit` block and no marker in
  the doc comment (plan:197-206 and 535-537). Plan B replaces that block with one block around the
  member (plan B:531). Plan B never says the block includes the member's doc comment (V-m3).
- **Ledger and ROADMAP split:** they agree. Pass A's Decisions 8 and 9 match plan B's Decision 7
  (plan B:290-295) and precondition 5 (plan B:211-219).
- **STATUS hand-off:** they agree. Pass A's close step 9 writes the list (plan:1303-1305), and plan B's
  Task 0 copies it verbatim into its Ledger (plan B:222-225).
- **Headless smoke:** they agree. Pass A's Decision 14 matches plan B's Decision 11 (plan B:309-313).
- **E2 (never the stock `npm test`):** they agree. See plan:1246-1249 and plan B:1160-1162.
- **E3 (empty range, PR after the first commit):** they agree. See plan:370-378 and plan B:442-448.

## Question 3: contradictions, build order, and gates that cannot run

The build order holds. The contradictions and unrunnable gates are V-M1, V-M2, V-M3, and V-m1 below.

## Question 4: new mechanisms stated from memory

- **The fail-closed delete gate** is grounded in code. The index reads only `mediaRefs` (usage.ts:83-94).
  An empty `mediaRefs` is omitted (manifest.ts:112, 160). The 409 and typed-slug in-use refusal exists
  (content-routes-media-delete.ts:159-170), and so does the `media.delete_refused` event (events.ts:53).
  The disclosed cost was not derived in full (V-M4).
- **The null-head refusal** is proven. `branchHead` returns null only when the branch does not exist
  (backend.ts:35-36; branches.ts:24-33, a 404 maps to null). The dev backend seeds `main` (fake-github.ts:48,
  740-742), so the refusal never fires on the showcase path. The refused head-sha half is also grounded
  (fake-github.ts:715-721).
- **The mode-600 `.dev.vars` key probe** is half proven. Loading `.dev.vars` is documented: "Put secrets
  for use in local development in either a `.dev.vars` file or a `.env` file, in the same directory as
  the Wrangler configuration file" (developers.cloudflare.com/workers/configuration/secrets/). The
  showcase's `wrangler.jsonc` has no `secrets.required` and the directory has no `.env`, so the key
  would load. The plan cites none of this. The ids half is wrong (V-M2).

## Question 5: Decision 16's cost

**It is material, and one answer dominates, so this is not an owner fork.** See V-M4.

The suggested refinement is not available. The manifest carries no marker field. `Manifest.version` is
the literal type `1` (manifest.ts:64-67), and `parseManifest` throws on any other value. A marker would
therefore be new mechanism, a version bump that older readers refuse.

## Findings

### V-M1 (major): Task 1's multi-line grep cannot pass within Task 1's Files

- **Where:** plan:540-541 (the fold's widened pattern, C-m5).
- **Defect:** run on `main`, the pattern also hits two lines no Task 1 edit may clear:
  - `src/lib/diagnostics/conditions.ts:173`, the `auth.role-wiring-missing` remediation
    `createAuthGuard({ roles })`. That file is Task 2's, and Task 2 keeps the `{ roles }` form on
    purpose for older engines (plan:586-588).
  - `docs/reference/admin-routes.md:191`, which carries `createAuthGuard()` in prose. Task 1's Files
    allow "the snippet at `:218` only" (plan:474).

  On an `auth-data` task, a failed post-condition that stands after one fix round stops the run
  (plan:303-306).
- **Fold:**
  - Add `-g '!src/lib/diagnostics/conditions.ts'` to the grep, with a one-clause reason: Task 2 owns the
    remediation and keeps the older-era form.
  - Widen Task 1's `admin-routes.md` entry to "the `:191` prose and the `:218` snippet".

### V-M2 (major): the close's key probe sets env vars no code reads, so "ok against the real App" cannot pass

- **Where:** plan:1285-1291 (close step 6).
- **Defect:** the probe writes `GITHUB_APP_ID` and `GITHUB_APP_INSTALLATION_ID` into `.dev.vars`, but
  nothing under `src/lib` reads either name. The only occurrence is the remediation string that Task 7
  deletes. The showcase adapter hard-codes `appId: '1', installationId: '2'`
  (examples/showcase/src/theme/cairn.config.ts:149), and this pass's B9 says the ids live on the
  adapter. The live mint would therefore target installation 2 and report "installation not found" or
  "refused key". The close's only live proof of Task 6 then fails or misreports.
- **Fold:**
  - `.dev.vars` carries only `GITHUB_APP_PRIVATE_KEY_B64`, the one name the engine reads
    (src/lib/github/credentials.ts:18).
  - The same script rewrites the scratch copy's `createGithubApp({ ... appId, installationId })`
    literal from the sourced env values, printing neither value.
  - Cite the Cloudflare `.dev.vars` sentence quoted under question 4.

### V-M3 (major): Task 8 is "blocking for coverage", but the runner and the plan both demote its coverage notes

- **Where:** plan:307-309 and 857 ("every row is blocking for coverage"), against plan:298-299 (the
  conductor folds an `engine-logic` coverage-only note into the next task's notes).
- **Defect:** Task 8 runs as `engine-logic`, whose class has `coverageBlocks: false`. For that class,
  `applyClassBar` (pass-execute.js:345-359) moves every `coverageOnly` blocking finding to
  `nonBlocking` and turns a `fix` with nothing left into `accept`. The class prompt also tells the
  reviewer to mark a coverage gap "with no behavior defect" as `coverageOnly`. A missing abort or
  dictionary-hold row is exactly that gap. It would come back as an accepted task with a batched note,
  and the plan's own rule would then fold the note forward. R-M2 and R-m5 exist to stop exactly that
  outcome for a writing-loss path.
- **Fold:** add a carve-out to the plan:298-299 bullet. A Task 8 `batchedNotes` item that names one of
  its Acceptance rows or Mutations is a standing coverage gap. The conductor runs the hand-dispatched
  Opus chain under "Models" for it, and a gap still standing after that chain stops the run. This
  keeps the spec's class for the gate.

### V-M4 (major): Decision 16's refusal is reachable by ordinary editing, misdirects its fix, and a cheaper build-time form dominates it

- **Where:** plan:257-266 (Decision 16), 993-1002 and 1013-1017 (Task 11), 1030-1036 (the carried copy).
- **Defect:** the plan discloses the cost as "a regenerated site whose content references no image at
  all". The state is wider than that, and an editor can reach it:
  - The template declares `gallery: array(image)` (templates/waymark/src/theme/cairn.config.ts:116), and
    its starter manifest carries exactly one `mediaRefs` key.
  - Once a developer clears the starter content, the manifest has no `mediaRefs` key and the gate
    engages.
  - An editor on a small site can also reach it. Removing the last image reference and publishing
    re-derives that entry with no `mediaRefs` key (manifest.ts:112, the optional spread), and the gate
    engages.
  - From then on, every delete of an asset that reads unused, which is every asset, answers 409. The
    message tells the user to run `npx cairn-manifest`. That command regenerates the same manifest and
    clears nothing.

  The editor cannot act on the message. The developer's action does nothing.
- **Why a version marker cannot replace it:** see question 5.
- **Proposed fold (dominating):** move the fail-closed point from the delete to the build, using
  machinery that already exists.
  - **The change:** `verifyManifest` drops a built `mediaRefs` for a pre-field manifest only when no
    committed entry carries the key **and** no concept declares a nested image shape. With a nested
    shape declared, it compares exactly.
  - **Why the runtime gate becomes unnecessary:** verify runs on every build and dev start, with the
    adapter in scope (src/lib/vite/internal.ts:84-93, the generated source, and :270-280,
    `buildStart`). On a nested-shape site, a deployed manifest with no `mediaRefs` key then proves the
    corpus references no image.
  - **What is dropped:** the runtime delete gate, its 409, its `reason` value, its gate rows, and
    Decision 16's cost. The delete path stays as it is today.
  - **The price:**
    - `verifyManifest` gains an optional argument. The function is public (core.md:854,
      api-surface.md:115), so this is an additive surface change, and Task 11 already owns the
      api-surface line.
    - A nested-shape site that has not regenerated fails its build at upgrade, not at its first
      referencing publish. The `Consumers must:` regenerate line already demands that regenerate.
  - **Acceptance rows that replace the gate rows:**
    - With a nested shape declared, a manifest that carries no `mediaRefs`, and gallery refs in the
      corpus, the build fails with the regenerate message.
    - With the same shape and manifest, and no image references in the corpus, the manifest verifies.
    - With no nested shape declared, a pre-field manifest over top-level refs still verifies.
  - **Mutation:** "drop on a nested-shape site".
  - **Status:** this reverses conductor ruling 3's mechanism but keeps its fail-closed posture. It is a
    method call, so the conductor can rule on it alone.
  - **If the conductor keeps Decision 16:** correct the disclosed cost to the editor-reachable state,
    and make the 409's message say that an entry must reference an image. Regenerating alone does not
    clear the state.

### V-m1 (minor): the `E2E_PORT` export reaches pinned tasks only

- **Where:** plan:165-166 ("the runner's `gate` string exports it").
- **Defect:** `resolveGate` uses `a.gate` only under a pin or as the fallback (pass-execute.js:484-507).
  Task 4 computes to `full+tool`, and so does Task 11 when it regenerates the manifests. The
  independent Haiku gate run for either task executes the classifier's bare string, so its e2e takes
  playwright's default port 4173 (examples/showcase/playwright.config.ts:6). No port has a listener
  today, so the defect is latent.
- **Fold:** restate the claim as "pinned tasks only". Have the conductor confirm 4173 is free before
  the S2 and S4 launches.

### V-m2 (minor): Task 1's second grep is not mechanical

- **Where:** plan:542-543.
- **Defect:** on `main` the pattern matches 22 legitimate `cairn` and `siteConfig` imports, and only
  three of them are the cycle (sveltekit.md:131, 1046; core.md:1020). Whether it passes is a judgment
  call, not a count.
- **Fold:** replace it with
  `rg -n "import \{[^}]*\broles\b[^}]*\} from ['\"][^'\"]*cairn\.config" docs/reference`, which must
  print nothing.

### V-m3 (minor, for plan B's verifier): does the outer block take the doc comment?

- **Where:** plan B:531, against this fold record's Seam 1 ("doc comment included").
- **Defect:** this is not a nesting risk. If plan B's block wraps the member but not its JSDoc, the
  emitted adapter keeps an orphan doc comment.
- **Fold:** plan B:531 says "the member and its doc comment". Pass A needs no change.

## What holds

- All fifty dispositions were checked. The R-m3 refusal and the R-M5 move to `wrangler dev` are
  grounded in code.
- No fold edit breaks the build order. Task 7 still runs before Task 6, Tasks 8 and 9 before Task 10,
  and Task 12 runs last.
- Decision 6 matches the emitter. `emit:template` runs `wrangler types --env-file=.dev.vars.example`
  (emit-template-dir.mjs:74, 86), and the overlay's `.dev.vars.example` is byte-identical to the
  template's.
- `npx cairn-manifest` is a real bin (package.json:200).
