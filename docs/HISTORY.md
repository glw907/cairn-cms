# cairn-cms history

The per-pass ledger for the cairn-cms engine, newest first. `docs/STATUS.md` holds only the
current state; a finished pass's detail moves here per the ledger rule (`~/.claude/CLAUDE.md`,
"Project ledgers"). Each entry condenses to what a later pass needs: what landed, what a gate
caught, and what would be wrong to rediscover. Read on demand, not at every session start.
Superseded `STATUS-archive-*.md` files under `docs/internal/history/` hold the pre-2026-08
detail this file only summarizes.

## 2026-08-26: engine-consultation pass closed

Plan and post-mortem: `docs/superpowers/plans/2026-08-26-engine-consultation-pass.md`; spec
`docs/superpowers/specs/2026-08-26-engine-consultation-design.md`. Landed on `main` directly
(docs and Claude infrastructure only). Shipped the consultation protocol: the
`engine-consult` skill, the `engine-triage` agent, both pass-skill hooks (cold-start tested
with a negative control), the rulings ledger, the consultations arm, and both CLAUDE.md
edits. Ran both audits under Geoff's thoroughness ruling: the whole-surface any-site audit
(535 items, 384 keep / 57 reshape / 94 retire, trustworthy on run 2 after its own auditor
condemned run 1 for a conductor script bug) and the mid-pass-directed internals+chassis
audit (175 findings, 10 rewrite-tier, trustworthy; the FieldDescriptor exhaustiveness gap
proven by a live mutation experiment). Re-reviewed both held absorption plans against the
rulings; verdicts appended in each plan file.

What a later pass would be wrong to rediscover: the five conductor adjudications over
recorded verification dissent are in the audit record's "merge repair" section, argued, not
just tallied; the R4 export closure is over-applied and its re-derivation (with the
`ContentRoutes` narrowing) re-tests adapter's ~22 C2_READDED keeps; the admin-toolkit field
tier retired because the shipped sheet's class inventory is a de facto public API
(`admin-css-safelist.ts:104`), the same ground that keeps `FieldLabel`; workflow subagent
file writes with `/`-carrying names create nested directories (four verify files landed
under mangled paths and were normalized into the record dir); and a condemned workflow run
resumes from cache, so fix-and-resume costs only the re-run agents, never the fleet.

## 2026-08-22: newest-toolchain pass merged

Plan and post-mortem: `docs/superpowers/plans/2026-08-21-newest-toolchain-before-beta.md`.
Worktree `newest-toolchain` off `main` at `13726d57`, merged as `d2972d11`. Pushed every floor
to current: Node `>=24`, `@sveltejs/kit ^2.70`, `svelte ^5.56.10`, DaisyUI 5.7.20, Tailwind
4.3.3, Wrangler 4.125.0, Vite 8.2.2, ESLint 10, `@anthropic-ai/sdk` 0.120 (peer widened to
`>=0.105.0 <1`), `actions/checkout`/`setup-node` v7, `compatibility_date` `2026-08-21`. Shipped
the admin upgrade map (`docs/admin/what-to-run-and-when.md` + `check:target-stack`), an advisory
weekly `check:tsgo` job, Cloudflare Images' `aspect-crop`/`scale-up`/`upscale` fit modes, and
moved Tidy's default model to `claude-sonnet-5` at `effort: low`.

Scope grew from 7 planned tasks to 16 plus roughly a dozen pass-end folds (~7.5M subagent
tokens against a 1.5M ceiling raised twice, to 3M then 4.5M); every addition traced to a real
Geoff ruling, but the lesson banked is to split at the chain-2 boundary next time a ruling adds
genuinely new surface mid-pass. `secrets.required` for the GitHub App key was tried and
withdrawn at review (wrangler 4.125 filters `.dev.vars` once a `secrets` block exists, and a
first deploy of a not-yet-existing Worker throws on an unset required secret); the redesign
brief is in `ROADMAP.md` Next, "Declare required Worker secrets without breaking local dev."
`check:transcripts` and `check:symbols` both caught locally-green work; the `cairn-pass`
ritual's CI-only gate list grew from four to six. A weekly rate-limit outage cost roughly 8
hours of wall clock and one duplicated dispatch; a stall guard now runs on every large single
dispatch, not only workflow-mode runs. Full evidence, every falsifiability proof, and the
decisions locked in are in the plan's own post-mortem section.

## 2026-08-21: dependency upgrade landed, e2e baselines regenerated

Three commits (`9b30e756`, `d633ad5f`, `8c9de10f`) took DaisyUI 5.7.20, Tailwind 4.3.3,
SvelteKit 2.70.3, Svelte 5.56.10, Vite 8.2.2, Wrangler 4.125, ESLint 10,
`@cloudflare/workers-types` 5, and `@cloudflare/vitest-pool-workers` 0.22. All local gates and
the `test`/`scaffold`/`design`/`create-site` workflows went green; `e2e` was red only on visual
baselines, an upstream DaisyUI `.alert` grid improvement rather than a regression. The
regeneration dispatch lost a push race to a STATUS handoff commit; the re-dispatch landed
baselines as `25dae7ad`, and `e2e.yml` now rebases before its bot push so the race cannot
recur. A `tsgo`-flagged implicit `any` in `check-snippets.mjs` was a JSDoc comment whose triple
backticks hid the `@param` from the Go compiler; reworded, not a real type gap.

## 2026-08-20: release `0.95.0` cut and published

`0.95.0` published on npm for both `@glw907/cairn-cms` and `@glw907/cairn-cms-dev`; GitHub
release `v0.95.0` cut against `main` at `e0033063`. All five CI workflows were green before the
tag.

Three things the cut decided, one it could not. **`create-cairn-site` held, never shipped**
(`npm view` still 404s): the GitHub App's "Only select repositories" mode strands a first run,
and recovery needs a `delete_repo` permission a reader may not have; its cost-narrative plan is
drafted, not approved. **The dev backend's first OIDC publish 422'd** because
`packages/cairn-cms-dev/package.json` carried no `repository` field; fixed in `48961469`, now
asserted by `check:dev-package`, and the publish job gained an already-published guard so a
recovery run no longer dies on the half that already landed. **The `--strip-dev-backend` watch
fired and is discharged** (`ae839697`): `0.95.0` published the dev backend unstripped through
the release path, so the weekly drift compare stopped stripping. **What the cut could not do:**
the public template repo sync failed (`glw907/cairn-waymark-template` never existed,
`TEMPLATE_REPO_TOKEN` unset); Geoff ruled the fix instead of chasing the credential: the
template moved in-repo to `templates/waymark/`, emitted by `emit-template-dir.mjs` and gated by
`check:template`, and `sync-template.yml`, its `publish.yml` job, and `sync-template-repo.mjs`
are deleted.

What consumers owe on this window: five compile-time breaks (`SiteConfig` lost its index
signature; `AdminShellData.mediaBase` and `EditData.singular` are new required fields;
`DeleteDialog`/`RenameDialog` renamed `label` to `singular`) plus one operational fact, stated
plainly per Geoff's 2026-08-19 ruling: a cairn site runs on Cloudflare Workers Paid ($5/month)
from its first deploy.

Watches from this window: the SvelteKit `checkOrigin` deprecation FIRED in a real build
(`ROADMAP.md` Now); `check:surface` proved blind to a removed index signature (`ROADMAP.md`
Now, both still open); TypeScript 7 and `vitest-browser-svelte` 3 were both held with named
triggers (both later resolved, see 2026-08-21 and 2026-08-22 above); `@cloudflare/workers-types`
5's `Buffer: any` scar is marked with a `WATCH` comment on `scripts/build/emit-template.mjs`.

## 2026-08-20: Go `cairn` tool, sub-project 1 opened (parallel track)

Design approved by Geoff in a Fable brainstorm, written to
`docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md`, then revised after a
five-vantage adversarial review and a 24-agent verify pass (chapter spine as Go types, a
read-only health HUD, poplar's root-model-plus-registry shape, a split credential model,
`tool/` in-repo). Plan: `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`, three
passes (A foundation, B checks and CLI, C the HUD), 29 tasks. Runs independently of the engine
window; does not block site updates or the editors rewrite.

## 2026-08-19: live-reproduction seam built, both halves

Plan and five post-mortems: `docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md`.
The delivery half shipped in `cairn-pub` on `pass-d-docs-tracks` (`8bef4f0`..`e182f36`); two
load-bearing engine commits landed here alongside it: `42b9d105` lets a prerendered route mount
`EditPage` (four of 25 story pages emitted no HTML at all without it), and `a5a069a8` binds a
story's chip numbers rather than only its marker keys.

Two of three pre-embed obligations closed engine-side. `ReproStory.pose` now receives the
mounted component's own exports as a required second argument (`media/insert-panel` no longer
pictures a control the real admin never renders; the handoff runs synchronously inside the
mount, not from an effect). `tags/screen`'s declared column height grew from 700 to 940, proven
by a new geometric gate, `src/tests/component/reproductions-marker-crop.test.ts` (its blind spot:
a `column` story is proven at the docs measure only, filed `ROADMAP.md` Now). The third
obligation, a longer accessible-name standard for the three locate-many-controls screens, is
filed to `ROADMAP.md` Now and belongs to the editors rewrite, not the engine.

`cairn-pub`'s next engine install must thread the instance through
`repro-story-lifecycle.ts` and the `[...story]` route's `ReproContext` mount, since widening
`pose` is a compile-time break. A four-lens review found 54 findings; five folded here, the rest
filed as `cairn-pub` Pass 7.

## 2026-08-15 to 2026-08-19: visual layer, diagram pages, capture pass, `cairn-pub` prepared

Geoff ruled 2026-08-15 that release one waits for the visual layer: no hurry to release, docs go
out at best quality with the beta release. The editors-track read was deferred, not skipped,
after a first-contact question about missing images and diagrams; prose written to stand alone
without a picture needs rewriting, not illustrating. Research banked at
`docs/internal/record/2026-08-15-docs-visual-practice-research.md`; the rulings at
`docs/internal/record/2026-08-15-docs-visual-layer-rulings.md`.

The diagram-pages pass merged 2026-08-16 (`817d155a`): eleven mermaid diagrams across ten
pages, nine page rewrites, and the `check:visuals` gate, reviewed by eleven register-editor
fan-outs. The capture pass ran 2026-08-17 (plan and post-mortems:
`docs/superpowers/plans/2026-08-16-capture-pass.md`); transcript fixtures now exist and both
admin pages quote them. The admin-screen reference capture (2026-08-15) banked 44 captures under
`docs/internal/reference-captures/2026-08-15-admin-screens/`, internal-only and excluded from
the npm `files` whitelist.

`cairn-pub` branch `pass-d-docs-tracks` pushed 2026-08-15: 81 prerendered pages, zero broken
links, a clean rebuild against a packed tarball. It was deliberately left unmerged until release
one shipped the docs-restructure payload its build depends on (now satisfied, see the
2026-08-20 release entry above). Its own open item, not yet resolved: the `cairn-cms` GitHub App
installation does not cover `glw907/cairn-pub`, needing Geoff in a browser at the App's own
installation settings.

The `.gitignore` scaffold defect (npm's packlist strips any file literally named `.gitignore`
from a tarball, wherever it sits) was fixed 2026-08-15: `bakeForPacking()` stores it dot-free,
`scaffold.mjs` renames it back in the scaffolded site, proven red-then-green plus an end-to-end
`npm pack`.

## 2026-08-20: nine hand-credential chores, six done or ruled closed

A standing operational list, independent of any pass. Closed by Geoff's ruling rather than
action: the Advanced Certificate Manager line item (copy hedges instead, with a test pinning
the hedge) and the estate Cloudflare token exposure (screen was secured, nobody reached it).
Torn down and verified by listing: the capture-pass scratch estate (repo, worker, two D1
databases, R2 bucket, local state, wrangler session), all 2026-08-17. `TEMPLATE_REPO_TOKEN` is
no longer owed, since the 2026-08-20 template move deleted the sync that needed it. Still open
as of this date, none urgent: delete GitHub Apps `cairn-t4b-live-03cd31`, `cairn-t5-scratch`
(id `4585219`), and `cairn-cairn-capture-scratch` (three Apps total); revoke the T4c spike API
token `d07b2a25f05151591830c45053186979` and remove its local config files; revoke three
Cloudflare API tokens named for `create-cairn-site` at dash.cloudflare.com/profile/api-tokens;
confirm the Workers Paid opt-in taken at T5 run 2; 907-life's push-to-deploy has been broken
since 2026-07-14 (`ROADMAP.md` line on the build-token risk).

## Earlier (2026-05 through 2026-08-14): the rebuild, `create-cairn-site`, and the pre-visual window

The numbered rebuild plans (00 through 08) landed and merged to `main`; stable `0.6.0` shipped
and both original sites ran it. The whole `create-cairn-site` initiative (T1 through T5)
shipped as history, each pass's post-mortem holding the detail; the T4c live spike record
(`docs/internal/record/2026-08-12-t4c-builds-spike.md`) is the fixture source for every Builds
fake body and carries its teardown table. Pass D, the release-debt engine pass, closed
2026-08-14.

By this point every carry-forward defect STATUS had tracked by hand (admin error statuses
flattening to HTTP 200 under the streamed pending count, upstream `sveltejs/kit#12987`; the
SvelteKit `checkOrigin` deprecation; engine-rendered markup depending on classes Tailwind may
never emit; the `/admin/help` first-steps card overlap; the `sideEffects` coverage gate) had
already been filed into `ROADMAP.md` with its own entry and trigger, so this ledger does not
duplicate them; `ROADMAP.md` is their live home.

Superseded `STATUS-archive-*.md` files, oldest first, all still live under
`docs/internal/history/`:

- `STATUS-archive-2026-05-to-2026-07.md`: pre-standalone-repo history.
- `STATUS-archive-2026-07-02-to-2026-07-16.md`
- `STATUS-archive-2026-07-17-to-2026-07-18.md`: the `cairn.pub` step-5 launch and the Waymark
  final-review entries.
- `STATUS-archive-2026-07-19-to-2026-07-20.md`: the chassis-nav pass and the `0.88.3` safelist
  publish.
- `STATUS-archive-2026-07-21-to-2026-07-28.md`: design-infrastructure Passes 1 and 2, the
  `0.89.x` and `0.90.x` publishes, the admin-toolkit organization pass.
- `STATUS-archive-2026-07-29-to-2026-08-01.md`: the `0.91.0` publish, the `0.91.1` hotfix and
  ASC harvest fold, the `0.92.0` design-ratchet minor, the xcathletes seams pass.
- `STATUS-archive-2026-08-02-to-2026-08-03.md`: the C1 seam-shape pass, the refusal-channel
  convergence, the C2 window before merging.
- `STATUS-archive-2026-08-04-to-2026-08-05.md`: the auth-channel window, the AI-posture pass, up
  to the `0.94.0-rc.1` cut.
- `STATUS-archive-2026-08-06-to-2026-08-07.md`: the rc.2 cut, the ASC end-to-end verification,
  the RC window to the stable `0.94.0` cut.
- `STATUS-archive-2026-08-08.md`: the stable `0.94.0` window, ASC's adoption, the
  vertical-alignment pass.
- `STATUS-archive-2026-08-09-to-2026-08-11.md`: the T1 completion, the docs-refactor pass-start,
  the T3-built entries.
- `STATUS-archive-2026-08-12-t4b1-close.md`, `STATUS-archive-2026-08-12-t4c-planned.md`: the
  T4b.1 close; the state T4c's execution session started from.
- `STATUS-archive-2026-08-13-t5-task8-close.md`, `STATUS-archive-2026-08-13-t4d-close.md`: the
  T5 Task 8 live-e2e close and the T5a split; the T4d close with the live-proof and teardown
  record.
- `STATUS-archive-2026-08-14-pass-d.md`: Pass D's planning entry, its Phase 1 close, its
  Phase 3 start, and the production-gate failure that blocked Phase 3 until its fold landed.

## Registry housekeeping, not yet acted on

A stale `rc` dist-tag still points at `0.6.0-rc.1` from the pre-rebuild era, so
`npm install @glw907/cairn-cms@rc` serves something ancient. The scheme uses `next`, so `rc`
should be removed (`npm dist-tag rm @glw907/cairn-cms rc`). Left alone as an outward-facing
registry change nobody asked for.
