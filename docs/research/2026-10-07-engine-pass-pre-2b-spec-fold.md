# Engine pass before stage 2b: spec fold record (2026-10-07)

Target: `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md` (draft at `32fd9b1c`,
reviews at `5477ea41`). Inputs: the four reviews in this directory (`-contract`, `-mechanics`,
`-integrity`, `-consistency`) and the owner rulings file. Every finding below was checked against
`draft-docs-2a` (now `38af392d`) with `git show`, against `@sveltejs/kit@3.0.1` from a fresh
`npm pack`, or against Cloudflare's documentation, before a disposition was written.

IDs: `C-` contract, `X-` mechanics (`X-OC` its over-ceremony items), `I-` integrity, `K-`
consistency. Seventy-one findings in all: contract 23, mechanics 16, integrity 19, consistency 13.

## Convergent roots (fixed once)

| Root | Finding IDs | Disposition | Where the revision carries it |
| --- | --- | --- | --- |
| `runtime` required on the guard, dev handle, and editor routes | C-M1, X-m2, I-11, K-M1, K-m9 ("two outliers") | folded | Lead, "Decision" (cites the `convention-parameter-bags` 2026-09-08 amendment), the "Required runtime" criterion, the doctor's older-engine branch, `Consumers must:` covering bare calls. `createAuthRoutes` checked: it reads neither roles nor access (`auth-routes.ts:35-47,165`), so the clause does not reach it; recorded as a decision, not a fork. |
| The nested-image fix reaches existing sites | I-1, I-4, X-M7, X-m7, C-M4 | folded | D1: four shapes, the `- src:` locator, every occurrence, `verifyManifest` narrowed to pre-field manifests (verified at `manifest.ts:325-328`), regenerated manifests, `Consumers must:` regenerate, "Surface: none" removed. |
| Alt propagation never splices a misindented `alt:` | I-5 (part) | folded | D1: alt propagation reports a nested placement and leaves the entry byte-identical, with a criterion. |
| A6 under kit 3 `use:enhance` | X-M1, I-6, C-M7 (part) | folded | A6: the location rule (verified in kit 3.0.1 `actions.js:170,186-191`, `client.js:88-109`), `applyAction` on failure (`client.js:2980-3005`), flag reset on every result, `location.assign` on redirect, an e2e from `?saved=1`. |
| Ruling 5's overlay | C-M6, X-M2, X-M3 (part), I-7 | folded | Ruling 5: tombstones, branch read-through, the manifest-backed list and its shadowing, overlay-wins-until-restart, the module seed moved to fixtures, the showcase `content: 'fixtures'` line inside bake exclude markers with an emit assertion. |
| The live check's bound | X-M6 (mechanism), I-O-1 | folded | Ruling 3, "Bounding a public route": single-flight under the constraint the incident record names (`docs/internal/record/2026-07-13-admin-token-cache-poisoning.md`, "Fix directions": cross-request coalescing on a shared pending promise is the hazard under workerd's per-request cancellation). A timeout alone does not answer it; the mechanism is the second fold's (V-M1). A concurrent-burst criterion; the key-hash cache key dropped (Cloudflare "Secrets": `wrangler secret put` deploys a new version). |
| Where the 503 lives | C-M8, X-m4, I-14 | folded | Ruling 3: the 503 is a template-route change, `ok` composition stated, a non-applicable provider reads `ok: true`, `Consumers may:` line. |
| C11 extended to publish, replace, alt, and the dictionary, head read first | I-2 (part), I-3, I-12, I-O-2 | folded | C11 rewritten over seven writers, the head-before-content rule, per-path conflict messages, a race test per path. |
| D5's undisclosed default change | C-M9, K-M4 | folded | D5: two `Consumers must:` lines, `core.md:249,257` and `sveltekit.md:1217` on its page list, a dated amendment to the functional spec's line 390. |
| Pass classes | C-O1, X-OC1, K-m3, C-O2, C-O3 (part), X-OC2 | folded | A5 `sweep` with one capture read; C5 `engine-logic` with `web-auth-security-reviewer` named; B7 and the `create-cairn-site` provisioning edit `auth-data`; pass A header `auth-data` with per-task overrides; pass B header `engine-logic` with per-task lines; B11a `sweep`. |

## Per-finding dispositions

### Contract and criteria

| ID | Disposition | Note |
| --- | --- | --- |
| C-M1 | folded | Convergent root, runtime. |
| C-M2 | folded | Lead criterion "One map, five readers", `createAdminAction` included (`admin-action.ts:294` verified). |
| C-M3 | folded | Every fix item now carries an acceptance line naming its fixture and why it fails today, taken from the review's table with corrections (A5 reclassed, B7 per X-M5). |
| C-M4 | folded | Convergent root, D1. |
| C-M5 | folded | C5: fresh copy to the callback, `strip` as a union, the floor stated exactly (`script` and the core `strip`), attributes and protocols named as the callback's. |
| C-M6 | folded | Convergent root, overlay. |
| C-M7 | folded in part | The e2e-only criterion and the `?saved=1` start are folded; see the refusal below. |
| C-M8 | folded | Convergent root, 503. |
| C-M9 | folded | Convergent root, D5. |
| C-m1 | folded | `Consumers must:` now names a site running the dev backend under `wrangler dev`. |
| C-m2 | folded | C7: the `auth-guard.test.ts:107-111` flip (verified), the `auth-routes.ts:160,169,407` comments, `sveltekit.md:938-946`. |
| C-m3 | folded | A3: the set {0000, 0001, 0003, 0004}, 0002 opt-in, asserted by the emit test; `Consumers may:` line. |
| C-m4 | folded | Ruling 3: `fetch` stubbed per status, a typed mint error, a total classifier including 403, an injected clock, the refusal logged with its `reason`. |
| C-m5 | folded | Ruling 3 criterion: a fixture key pair against the openssl pipeline. |
| C-m6 | folded | The doctor's remediation names both eras; three argument forms tested. |
| C-m7 | folded | A1: one end-to-end row each through `requireAccess` and `createSectionAction`. |
| C-m8 | folded | A12 cites `templates/waymark/src/routes/(site)/+page.server.ts:7`; token-cache eviction becomes a decline with `token-cache-no-401-eviction`. |
| C-m9 | folded | The dev README and the `DevBackendConfig` doc comment join the lead's docs. |
| C-m10 | folded | Header: "F4 filed nothing (verified at `38af392d`)"; no friction-log commit on the branch after `a72250ca`. |
| C-O1 | folded | Pass-class root. |
| C-O2 | folded | Same effect as proposed, in K-m3's form: pass A header `auth-data`, tasks 2, 5, 8, 12 overridden. |
| C-O3 | folded in part | B11a is `sweep`; see the refusal below for ruling 2's provisioning half. |
| C-O4 | folded | Ruling 3 criterion marked as a guard that proves nothing today. |

### Mechanics and feasibility

| ID | Disposition | Note |
| --- | --- | --- |
| X-M1 | folded | Convergent root, A6. |
| X-M2 | folded | Convergent root, overlay (template markers verified: the two hooks files are byte-identical). |
| X-M3 | folded in part | Points 1, 3, and 4 and the criteria are folded; see the refusal of the mtime rule below. |
| X-M4 | folded | B1: build from the root `package` script, no workspace `prepare`, `files: ['dist']`, the clean-clone pack criterion. Rests on the review's npm 11.19 probe. |
| X-M5 | folded | B7: the engine define carries `VITE_CAIRN_E2E` (template expression verified at `templates/waymark/vite.config.ts:22-33`); both copies drop their plugin; the `WATCH:` comment on the verify server. |
| X-M6 | folded (mechanism); owner fork 2 (anonymous mint) | Convergent root, bound. Source and defect in the measures block. |
| X-M7 | folded | Convergent root, D1 (`- src:` verified against `media-rewrite.ts:132` and the template's `hello.md:20-22`). |
| X-m1 | folded | Ruling 5, Workerd: `navigator.userAgent` quoted from Cloudflare's compatibility-flags page, a dynamic `node:fs` import, `process.cwd()`. |
| X-m2 | folded | Convergent root, runtime. |
| X-m3 | folded in part | The claim is corrected and a build-fail criterion added (with I-16); the split is refused below. |
| X-m4 | folded | Convergent root, 503. |
| X-m5 | folded | With C-m4. |
| X-m6 | folded | B7: both `app.d.ts:20` copies go (verified); `Consumers may:` delete their own. |
| X-m7 | folded | Convergent root, D1. |
| X-OC1 | folded | Pass-class root. |
| X-OC2 | folded | C5 is `engine-logic` with the reviewer named. Its stated aim, dropping pass B's live auth smoke, does not follow: B7 and the provisioning edit are `auth-data`, so the spec says pass B still runs the smoke. |

### Data integrity and failure risk

| ID | Disposition | Note |
| --- | --- | --- |
| I-1 | folded | Convergent root, D1 (the blocker). |
| I-2 | folded in part | Publish and publish-all take the fail-closed `expectedHead`; the refusal of merge-inside-retry below is retracted as reasoned and its consequence folded in the second fold (V-M2). |
| I-3 | folded | C11: replace and alt rewrite entries (`CONTENT_CONFLICT_MESSAGE` verified at `metadata.ts:393,549`); head read before content; the delete docstring note. |
| I-4 | folded | Convergent root, D1 (four shapes, an asset twice in one array). |
| I-5 | folded in part | Alt propagation skips nested placements; see the refusal of the re-parse invariant below. |
| I-6 | folded | Convergent root, A6. |
| I-7 | folded | Convergent root, overlay (`createBranch` copy verified at `fake-github.ts:805-813`). |
| I-8 | owner fork 1 | The dev-save fork now recommends in-memory plus a persistent notice. |
| I-9 | owner fork 2 | Presented beside X-M6's opposite recommendation. |
| I-10 | folded | The fingerprint fork is closed as a decision: the rollout window is a second false-`ok` route, so declining leaves ruling 3's rotation step with no safe signal. One answer dominates. |
| I-11 | folded | Convergent root, runtime. |
| I-12 | folded | C11 includes the dictionary (no `expectedHead` verified at `content-routes-dictionary.ts:56-73`). |
| I-13 | folded | A3: every role write (`store.ts:271,468,506-509,544` verified) routes through the named failure; the message names the four-column rebuild. |
| I-14 | folded | Convergent root, 503 (`health.ts:28-30` verified). |
| I-15 | folded | With X-m1. |
| I-16 | folded | The lead's cost paragraph is corrected and a build-fail criterion added. |
| I-17 | folded | `Consumers must:` adds "reconcile them; the adapter's now governs every reader". |
| I-O-1 | folded | Convergent root, bound. |
| I-O-2 | folded | With I-12. |

### Consistency

| ID | Disposition | Note |
| --- | --- | --- |
| K-M1 | folded | Convergent root, runtime; settled as a decision by the `convention-parameter-bags` amendment, not a fork. |
| K-M2 | folded | New section "Ledger entries this pass falsifies", nine annotations, the `AccessMap` and `RolesDeclaration` keeps re-argued, and the divergence entry's `Verified:` line. All verified against the ledger text. The close writes them. |
| K-M3 | folded (decision, not fork) | "This spec's own decision on batching": ruling 1 governs; the ROADMAP boundary-test amendment is owed; every batched row with a caveat names its page. |
| K-M4 | folded | Convergent root, D5. |
| K-m1 | folded | C7 now argues the confirm page is the sign-in flow's landing step and owes a one-phrase charter clarification for Geoff's read. |
| K-m2 | folded | With C-m2, plus the functional spec's dated amendment owed. |
| K-m3 | folded in part | Pass-class root; its "keep A5 `paint`" option is refused below. |
| K-m4 | folded | "Already correct" replaced; `log-events.md:81` and the `handle.ts` comment added (rows verified). |
| K-m5 | folded | `csrf-no-rotation-under-identity` reworded: no cairn sign-in occurs; a cairn logout still clears the value. |
| K-m6 | folded | C12 and D13 entries dropped, citing `audit-log-content-field-behavior-failed` and `log-export`; A11 keeps its entry with the C1 plan as Record, and "the reference gets one table" is dropped because `sveltekit.md:413` already has it. |
| K-m7 | folded | `'1'` or the boolean `true`, cross-referencing `dev-backend-flag-refusal`. |
| K-m8 | folded | The "start 2b between the passes" option is removed; stage 2b starts after pass B. |
| K-m9 | folded | `report.ts:55` (`exitCodeFor`), `sveltekit.md:1217`, `guidance.md:30` and `:136`, `README.md:28` removed from ruling 2's docs (it makes no scaffold claim), "two outliers" corrected (runtime root), and the "twelve-task line" citation replaced by the actual reason for two passes. |

### Refusals

| ID (part) | Refused | Reason |
| --- | --- | --- |
| C-M7 | A dev-package fault switch for A6's e2e | Playwright `page.route`, already used at `examples/showcase/e2e/csrf-helpers.ts:60`, fails the save and the following `__data.json` without new published surface. |
| X-M3 | Overlay yields to a disk file with a newer mtime | Invented rule with no named source; the spec states the plain limit (overlay wins until restart) and scopes the criterion to unwritten files. |
| I-5 | Re-parse the rewritten frontmatter and skip unless only target values changed | New validator with no named source; once alt propagation never splices a nested placement and replace only swaps a token span, no measured defect remains for it. |
| I-2 | Re-read and re-merge `media.json` and `index.json` inside publish's retry | **Retracted as reasoned (second fold, V-M2).** The premise that a conflict needs an outside commit inside a seconds-wide window was false: the edit page's own `?/dictionaryAdd` commits to `main` beside every publish with a pending word. The fail-closed guard stands, with that commit sequenced before the publish POST (A6), so merge-inside-retry is still not adopted. |
| X-m3 | Split `cairn.server.ts` into a compose-only module for the hooks | A new scaffold file and doc row; `composeRuntime` throws widen to every dynamic route either way, and the prerender's hooks import fails `vite build` first. Per-isolate admin construction is one-time. |
| K-m3 | Keep A5 `paint`, with a settle the plan names | `paint` brings an owner sitting for one calm-copy error page; a capture read in the main loop catches the same defect. |
| C-O3 | `sweep` for ruling 2's `create-cairn-site` half | It edits D1 provisioning beside `AUTH_DB`, which the class table puts under `auth-data` (K-m3). |

## Counts

- Folded: 69 of 71 findings, 7 of them in part; X-M6 also feeds a fork.
- Refused: 7 parts of findings whose remainder folded; no whole finding.
- Owner forks: 2 rulings from three finding parts (I-8 became ruling 1; I-9 and X-M6's fork became
  ruling 2). The draft's fingerprint fork was folded as a decision (I-10).

The fold refused no whole finding. Every finding that reached the fold was verified true against
the code, the kit source, or a quoted document; the refusals land on the proposed mechanism, where
the conventional fix already in the codebase covers the defect.

## Owed errata (the close writes these; this fold edits none of them)

1. `docs/internal/engine-rulings.md`: the nine dated annotations listed in the spec's "Ledger
   entries this pass falsifies", the new entries (`access-map-one-declaration`,
   `admin-toolkit-shell-only`, `refusal-channels-per-call-site`, `csrf-no-rotation-under-identity`,
   `admin-headers-scope`, `dev-flag-strict-read`, `token-cache-no-401-eviction`).
2. `ROADMAP.md` boundary-test entry: clause 1 runs after ruling 1's product test; clause 3's
   "whichever engine pass runs next" reads "the final engine batch" unless a stage close pulls an
   item forward. The batched rows carry their page tags.
3. `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`: dated amendments for C7
   ("Request a link", "Guard") and D5 (line 390's site-config default).
4. `docs/superpowers/specs/2026-06-15-cairn-media-2a-ingest-delivery-design.md`, decision 1
   (`:162-168`): the publish snapshot's last-writer-wins trade becomes a fail-closed head guard.
5. `docs/internal/what-cairn-is-and-is-not.md:107`: the proposed phrase "the sign-in form and its
   confirm page", for Geoff's read. The spec's C7 reasoning stands on the current text either way.

## Measures

- **New-mechanism findings: 2 folded, 4 refused.**
  - Folded: X-M6's single-flight mint with a timeout. Source: Go's `golang.org/x/sync/singleflight`
    for the coalescing, constrained by the engine's incident record
    (`docs/internal/record/2026-07-13-admin-token-cache-poisoning.md`, "Fix directions"), which
    names cross-request coalescing on a shared pending promise as the hazard under workerd's
    per-request cancellation; `AbortSignal.timeout` bounds only the starting request's wait (second
    fold, V-M1). Defect: the draft's stated bound ("at most one mint
    per isolate per minute") cannot hold under the engine's result-only cache posture
    (`signing.ts:95-103`), and `installationToken` has no timeout (`signing.ts:66-79`), both read in
    the code.
  - Folded: the key fingerprint (I-10, formerly a fork). Source: GitHub's "Verifying private keys"
    documentation, which runs the same SHA-256 over the public key. Defect: the recorded rotation
    friction entry (B10, a wrong deploy target that passes every check), plus the rollout window.
  - Refused: the A6 fault switch (C-M7), the mtime yield rule (X-M3), the re-parse invariant (I-5),
    and the publish merge-inside-retry (I-2).
  - Not counted as new mechanism: the `verifyManifest` narrowing (I-1) narrows an existing
    normalization; the bake exclude markers (X-M2) and `expectedHead` (C11) are existing mechanisms.
- **Line count:** 677 before, 919 after (+242, +36%). The growth is past the 25% signal. Its
  sources: about 70 lines are the per-item acceptance criteria rule 4 and C-M3 require (twenty-two
  items that had none); about 25 are the ledger-annotation section K-M2 requires; about 60 are the
  root fixes the convergences require (the overlay, A6's kit 3 redesign, C11's seven writers, D1's
  manifest reach); the rest is the second fork's two options and the batch decision. Two forks
  shrank to two with the fingerprint folded, the C12 and D13 entries were dropped, and the A6, C11,
  ruling 3, and fork prose was tightened in a second pass. No section grew from an over-ceremony
  finding.
- **Ceiling:** the spec carries no token ceiling; the plan sets it. No change.

## Re-sizing after the fold

Twenty-three tasks, two passes, cut after pass A's docs task.

- **Pass A** (header `auth-data`, twelve tasks): the lead; the doctor (`tool`); A1, A2, C1, C7; A3;
  A7, A8, A10 (`engine-logic`); ruling 3's live check and fingerprint; B5, B9, B11a; A6
  (`engine-logic`); C11 Library and dictionary; C11 publish; D1; docs (`docs`).
- **Pass B** (header `engine-logic`, eleven tasks): ruling 2's bake (`sweep`); ruling 2's
  `create-cairn-site` (`auth-data`); ruling 5; B1; A5, B2, B3, D2; B6; B7 (`auth-data`); A13, A14,
  D4; C5, C13, D6; D5, D8a; docs (`docs`).

Neither pass grows past about twelve, so no third pass is cut. Three task splits came from the fold
(ruling 3 from B5's strings, C11 into Library and publish, ruling 2 into bake and provisioning);
each separates a different class or a disjoint file set, and the plan should watch for a fourth.

## Second fold (2026-10-07)

Input: the verification read (`-spec-fold-verification.md`), its 3 majors and 5 minors only. Each
finding was checked again before it was folded: code at `draft-docs-2a` with `git show`, kit from a
fresh `npm pack @sveltejs/kit@3.0.1` in the session scratchpad, and Cloudflare's and GitHub's
documentation fetched live. Nothing else in the spec changed. The owner forks stay open.

| ID | Disposition | Evidence and where the spec carries it |
| --- | --- | --- |
| V-M1 | folded | Ruling 3, "Bounding a public route", now quotes the incident record ("Cross-request coalescing on a shared pending promise is exactly the hazard under workerd's per-request cancellation") and Cloudflare "Context" ("An async call that is neither awaited nor passed to `ctx.waitUntil()` can be canceled when the invocation ends"). The mechanism is the read's: a `{ promise, startedAt }` slot, a per-caller race against each caller's own timer, a stale slot treated as empty, and only a settled mint writing the verdict. `waitUntil` applies: the engine already wraps it (`src/lib/sveltekit/workers-env.ts:43`, over `cloudflare:workers`), and Cloudflare caps it at "30 seconds after the response is sent or the client disconnects", outside the 5-second timeout. New criterion mirroring `github-token-cache.test.ts:61`. Proof: a scratchpad Node probe of the slot with an injected clock answered a burst of eight with one mint, a later caller beside a never-settling, never-awaited starter with `unreachable` inside its own timeout, and the call past the stale point with a fresh mint. Rows `fold:21` and the measures entry now cite the incident record as the constraint. |
| V-M2 | folded; the I-2 refusal retracted | Verified: `onEditSubmit` fires `void commitPendingDictionary()` (`EditPage.svelte:163-171`), which POSTs `?/dictionaryAdd`, and `mergeAndCommitDictionary` commits to `backend.defaultBranch` (`content-routes-dictionary.ts:57-73`). Kit 3.0.1 awaits the submit function before it fetches: `client.js:147-155` reads `const callback = (await submit({ ... })) ?? fallback_callback;`, and the `fetch(action, ...)` follows at `:182`. A6 now awaits the dictionary commit in the submit function; `postFormAction` resolves every failure to `{ ok: false }` (`client-action.ts:29-39`), so the await never blocks the POST. C11 carries the ordering and the new publish criterion. The refusal row is marked retracted in place; merge-inside-retry is still not adopted, because sequencing the page's own commit closes the self-inflicted conflict. |
| V-M3 | folded | Verified: `flash` reads `data.saved` (`EditPage.svelte:1139-1142`), `bodyDirty` compares against `form?.body ?? data.body` (`:190`), `saveState` reads "Saved" when not dirty and `data.saved` (`:193`), and the 400 and 409 refusals echo `body` (`content-routes-entry-write.ts:184,306`, `commit-log.ts:60-62`). A6 now clears the saved signals on an in-place failure and uses `data.body` as the dirty baseline; the e2e asserts no "Saved" text after the 500, and adds the 409 forge with "Unsaved changes" and a prompting leave guard. |
| V-m1 | folded | Verified at `scripts/checks/check-tool-heuristics.mjs:50` and `src/tests/unit/check-tool-heuristics.test.ts:13-15`; the signature sits at `guard.ts:172`, not `:170`. The pin update moves to task 1 (the doctor section and pass A task 1's line); task 2 keeps the Go heuristic and the remediations. |
| V-m2 | folded | Verified: `devBackendHandle` mints `role: 'owner'` (`packages/cairn-cms-dev/src/handle.ts:160-166`). The criterion now asserts the attached map through the dev handle: `locals.cairnAccess` is `runtime.access`, or `{}` when the adapter declares none. |
| V-m3 | folded; the prefix kept | GitHub's prose gives the command and no prefix, but the "Verifying private keys" step's own screenshot of the App settings page (`github-apps-private-key-fingerprint-new.png`, fetched from docs.github.com) shows `SHA256:V5iaE4MInJc3Em4dGLQjbzG0Py64ZPJ/G8IcDaOG4MI=`. The read's condition for keeping the prefix is met. The spec cites the screenshot, and the criterion compares the base64 after the prefix with the openssl output. |
| V-m4 | folded | D1 states the residual: a site whose only image references are nested commits no `mediaRefs` key, reads as pre-field, and builds green; the `Consumers must:` regenerate line covers it. The manifest `version` bump was not taken (the brief asked only for the note). |
| V-m5 | folded | Pass A task 7 carries `engine-logic`. B5 was judged not `auth-data`: it changes the health route's status and `ok` composition and the non-applicable report, and no signing, session, D1, or commit-path code. B9 is `engine-logic` and B11a `sweep`, so the task takes the stricter of the two. |

Fork 2 gains one sentence: the one-mint bound holds once V-M1's mechanism lands, which the spec now
carries. Neither fork was ruled.

Refused: none. The fold-record counts above read 7 refusals; with I-2 retracted as reasoned, 6
stand.

Line count: 919 before, 987 after (+68, +7%). V-M1's mechanism and criterion are about 30 lines,
V-M2 and V-M3 in A6 and C11 about 25, and the five minors the rest.
