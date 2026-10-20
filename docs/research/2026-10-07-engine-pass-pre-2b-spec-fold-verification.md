# Engine pass before stage 2b: spec fold verification (2026-10-07)

Target: `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md` at `ff34fa92` (cited as
`spec:<line>`). Read with the fold record (`-spec-fold.md`, cited `fold:<line>`), the four reviews,
and the owner rulings. Code read at `draft-docs-2a` with `git show`. Kit read from a fresh
`npm pack @sveltejs/kit@3.0.1`. Probes ran in the session scratchpad. The reader took no part in the
review or the fold.

Scope: unclosed blockers and majors, new contradictions, and unproven mechanisms only.

**Counts: 0 blocker, 3 major, 5 minor. Verdict: needs a second fold** (the three majors).

## Majors

### V-M1. The single-flight live mint repeats the hazard the engine's own incident record names

- **Location:** `spec:236-244`; `fold:21`, `fold:162-166`.
- **Defect.** The spec coalesces concurrent misses "on one in-flight mint", raced against one
  `AbortSignal.timeout(5000)` "whose signal the mint's `fetch` also carries", with "the slot clears
  on settle or timeout". It concludes that a mint "canceled with its request therefore never leaves
  a dead promise in the slot". The cited sources do not support that conclusion. Go's
  `singleflight` runs where no caller's cancellation kills shared work. `AbortSignal.timeout` says
  nothing about workerd's per-request lifetime. The engine's record says the opposite:
  - `docs/internal/record/2026-07-13-admin-token-cache-poisoning.md`, "Fix directions":
    "Cross-request coalescing on a shared pending promise is exactly the hazard under workerd's
    per-request cancellation".
  - Cloudflare, "Context" (`waitUntil`): "An async call that is neither awaited nor passed to
    `ctx.waitUntil()` can be canceled when the invocation ends".

  The timer and the slot-clearing continuation belong to the request that started the mint. If
  that request ends early, they are canceled with it. A health monitor that times out and
  disconnects is enough. Then the shared promise never settles, the timeout never fires, the slot
  never clears, and every later `live=1` caller in the isolate awaits it. That is the
  `signing.ts:95-103` incident moved to `/healthz`. The draft mechanism was weaker but could not
  wedge an isolate. The fold's version can.
- **Effect on fork 2.** The "Yes" answer's bound, "one mint per isolate per minute", rests on this
  mechanism.
- **Proposed fold.**
  - The slot stores `{ promise, startedAt }`.
  - Every caller, the starter included, races the shared promise against a timer created in its
    own request.
  - A caller that finds `now - startedAt` past the timeout treats the slot as empty and starts a
    fresh mint. The slot clears by timestamp, never only by the starter's continuation.
  - Optionally, the starter hands the mint to `event.platform.context.waitUntil` (Cloudflare's
    documented way to outlive the invocation, capped at 30 seconds).
  - Add one criterion that mirrors `github-token-cache.test.ts`'s "never serves an unsettled
    in-flight mint to a later caller": a slot holding a never-settling promise, with the starter's
    timer never firing, answers a later caller with the unreachable class within that caller's own
    timeout, and the next call mints again.
  - Change `fold:21` and `fold:162-166` to cite the incident record as the constraint, so the
    sources stop implying that a timeout alone answers it.

### V-M2. The I-2 refusal rests on a false premise: publish's fail-closed guard collides with the page's own dictionary commit

- **Location:** `spec:467-475` (C11, publish); `fold:127` (the I-2 refusal).
- **Defect.** The refusal says a publish conflict "needs a commit to `main` inside a seconds-wide
  window". The edit page creates that commit itself. `onEditSubmit` fires
  `void commitPendingDictionary()` on every Save and Publish submit (`EditPage.svelte:163-171`). The
  call POSTs `?/dictionaryAdd`, which commits the dictionary file to `main`
  (`EditPage.svelte:421-436`, `content-routes-dictionary.ts:57-73`). Publish runs several GitHub
  calls before its `main` commit (`content-routes-entry-write.ts:336-381`). Today the head-merge
  retry re-parents the publish over that disjoint commit, which is safe, since `commitFiles`
  "Builds the new tree on the current head's tree" (`repo.ts:263`). Under C11, publish reads the
  head first and commits fail-closed (`repo.ts:290-293`). So any publish submitted with a pending
  dictionary word races its own dictionary commit and can answer "Your edits are saved. Publish
  again." The second publish then works. The fold creates this defect: a self-inflicted conflict on
  the hottest path, which no race test in C11's acceptance covers.
- **Proposed fold** (the leanest is an existing mechanism):
  - A6's enhance submit function awaits `commitPendingDictionary()` before the action POST. Kit
    awaits the submit function before it fetches (`src/runtime/app/forms/client.js`:
    `(await submit({...})) ?? fallback_callback`, verified in 3.0.1).
  - State the ordering in A6 (task 8, which precedes task 10).
  - Add a C11 publish criterion: a publish with a pending dictionary word lands without a conflict,
    and the word commits.
  - Otherwise, revisit I-2's merge-inside-retry, but a conflict must never come from one click.

### V-M3. A6's in-place failure keeps the page's "Saved" state from the previous save

- **Location:** `spec:442-450` (A6), against `EditPage.svelte:190-193` and `:1139-1142`.
- **Defect.** The redesign deliberately applies a failure in place at `?saved=1`, so `data.saved`
  stays `true` from the last load. Two readers then misreport the failed save:
  - The flash strip still reads "Saved. Your site keeps showing the published version until you
    publish." (`:1141-1142`). This happens on every failure, including the 500 the acceptance tests.
  - A refusal that echoes `body` makes `bodyDirty` false (`body !== (form?.body ?? data.body)`,
    `:190`). Examples are a 400 validation refusal and the 409 "This file changed since you opened
    it" (`content-routes-entry-write.ts:184,306`, `commit-log.ts:60-62`). So `saveState` reads
    `'Saved'` (`:193`), and the leave guard stands down.

  The editor is told the save succeeded when it did not. With the guard off, leaving drops the
  writing A6 exists to keep. Today the failed POST reloads at the action URL with no `saved` flag,
  so no "Saved" appears. The fold introduces this.
- **Proposed fold.**
  - A failure applied in place clears the page's saved signals. For example, a local flag set by
    the enhance callback suppresses the `data.saved` flash and `saveState`'s "Saved" until the next
    load. The dirty baseline for an in-place failure is the loaded `data.body`, not the echoed
    `form.body`.
  - Extend the e2e: after the 500 from `?saved=1`, no "Saved" text shows. Add a 409 from `?saved=1`
    (the same `page.route` forge) that shows "Unsaved changes" and a leave guard that prompts.

## Minors

- **V-m1. The doctor pin breaks task 1's gate** (`spec:147-148`, `spec:809`). `check:tool-heuristics`
  pins the literal `export function createAuthGuard(config: AuthGuardConfig = {}): Handle {`
  (`scripts/checks/check-tool-heuristics.mjs:50`). `src/tests/unit/check-tool-heuristics.test.ts:13-15`
  asserts it under `npm test`. Task 1 makes `runtime` required, so it changes that signature, and
  its own gate goes red. The spec gives the pin to the doctor, which is task 2. **Fold:** the pin
  regex updates in task 1. Task 2 keeps the Go heuristic and the remediations.
- **V-m2. The dev-handle repeat cannot assert a refusal** (`spec:160-162`). `devBackendHandle`
  always mints `role: 'owner'` (`packages/cairn-cms-dev/src/handle.ts:160-166`), so "an editor
  session is refused" cannot repeat through it. **Fold:** through the dev handle, assert that
  `locals.cairnAccess` is `runtime.access` (and `{}` when the adapter declares none).
- **V-m3. The fingerprint format and its criterion disagree** (`spec:251`, `spec:274`). The spec
  reports `'SHA256:<base64>'`, while the criterion compares with "the value the openssl pipeline
  prints", which is bare base64. GitHub's "Verifying private keys" section gives the command but not
  a displayed prefix. **Fold:** the criterion compares the base64 after the prefix. Keep the prefix
  only if a capture of the App settings page shows it. Otherwise drop it. The computation itself is
  proven: a scratchpad probe on a fresh PKCS#1 key gave the same value from
  `openssl rsa -pubout -outform DER | openssl sha256 -binary | openssl base64` and from Web Crypto
  (extractable `pkcs8` import, `jwk` export, public `jwk` re-import, `spki` export, SHA-256).
- **V-m4. The narrowed `verifyManifest` still passes one stale case silently** (`spec:498-500`).
  "Predates the field" means that no committed entry carries `mediaRefs`. A site whose only image
  references are nested (no hero and no body image anywhere) matches that test, so its stale
  manifest still builds green. The `Consumers must:` regenerate line covers it. **Fold:** state the
  residual in D1. A stronger option keys the pre-field case on a manifest `version` bump
  (`manifest.ts:321` writes `version: 1`).
- **V-m5. Pass A task 7 carries no class override** (`spec:814`). B9 is classed `engine-logic`
  (`spec:517`) and B11a `sweep` (`spec:521`), but task 7 inherits the `auth-data` header. That
  conflicts with `fold:25` ("B11a `sweep`"), and the mutation-proof mandate lands on string edits.
  **Fold:** give task 7 an `engine-logic` line, unless B5's template status edit is judged
  `auth-data`.

## Question 1: did each blocker and major close where the fold cites?

Each one closed at its cited location, with the exceptions named above.

| Finding | Closed at | Result |
| --- | --- | --- |
| I-1 (blocker), I-4, X-M7, X-m7, C-M4 | `spec:482-507` | Closed. Four shapes, `- src:`, every occurrence, the narrowed verify (code at `manifest.ts:325-328` matches the description), `Consumers must:` regenerate. Residual V-m4. |
| Required `runtime` (C-M1, X-m2, I-11, K-M1) | `spec:87-107`, `:154-155`, `:170-173`, `:780-783` | Closed. The amendment exists (`engine-rulings.md:147`). Ordering side effect V-m1. |
| C-M2 one map, five readers | `spec:156-162` | Closed; the dev-handle half is V-m2. |
| C-M3 per-item acceptance | `spec:344-640` | Closed; every fix item now states its fixture and why it fails today. |
| C-M5 sanitize floor | `spec:600-612` | Closed. |
| C-M6, X-M2, X-M3, I-7 overlay | `spec:297-338` | Closed: tombstones, branch read-through, manifest shadowing, seed moved, bake markers with an emit assertion. |
| C-M7, X-M1, I-6 A6 under kit 3 | `spec:428-451` | The kit mechanics close and are verified in 3.0.1: `actions.js:170` (`get_action_location`), `forms/client.js` fallback (navigates unless `is_current_location`), `client.js:2980-3007` (`applyAction` on a failure updates the form and status and runs no load). New defect V-M3. |
| C-M8, X-m4, I-14 the 503 | `spec:258-266`, `:279-280` | Closed; no other `/healthz` consumer expects 200 (grepped workflows, the create-cairn-site source, and the Playwright configs). |
| C-M9, K-M4 D5 | `spec:617-629`, `:787-788` | Closed: two `Consumers must:` lines, `core.md`, the functional spec amendment. |
| M6, I-O-1 bound | `spec:236-244` | The mechanism is unsound: V-M1. |
| X-M4 B1 | `spec:525-537` | Closed. |
| X-M5 B7 | `spec:557-574` | Closed. |
| I-2, I-3, I-12, I-O-2 C11 over seven writers | `spec:455-481` | I-3 and I-12 closed: head read first, message per path. The dictionary's retry re-reads inside `mergeAndCommitDictionary`, so passing the head makes its retry fire. The I-2 refusal is unsound: V-M2. |
| I-5 alt never splices | `spec:496-497` | Closed. |
| I-8, I-9, I-10 forks | `spec:642-665`, `:246-256` | Closed as presented; see question 4. |
| K-M2 ledger annotations | `spec:714-733` | Closed; every cited entry id exists in `engine-rulings.md`. |
| K-M3 batching | `spec:39-46` | Closed. |
| Pass classes | `spec:180`, `:216-218`, `:427`, `:612`, `:805-850` | Closed except task 7: V-m5. |

## Question 2: contradictions and build order

Nothing from pass B points forward into pass A. Every dependency pass B has on pass A runs
backward and holds:

- Ruling 5 (B3) needs `devBackendHandle({ runtime })` from A1.
- Ruling 2's bake (B1) moves the access declaration that A1 relocated to the adapter.
- B1's dev-package declarations import engine types that A1 changes (`CairnRuntime`).
- B7, D5, and B6 touch files pass A leaves alone.

Within pass A:

- 1→2 holds except for the pin (V-m1).
- 1→3 holds (`guard.ts`).
- 6→7 holds (`health.ts`, then the template status).
- 9→11 holds: D1 edits the replace and alt code that task 9 guards, and the tasks run in order.
- V-M2's fold puts the dictionary ordering in task 8, which precedes task 10.

Within pass B, the bake marker for `content: 'fixtures'` belongs to ruling 5 (task 3), not the bake
(task 1). The spec says so at `spec:320-322`, and task 1 needs nothing from it.

The fold introduced no contradiction between sections. The doctor pin is the one gate-order
defect.

## Question 3: new mechanisms, quoted or proven

| Mechanism | Evidence | Result |
| --- | --- | --- |
| Single-flight mint with one timeout | Go `singleflight` and WHATWG `AbortSignal.timeout`, neither about workerd | **Unproven, and contradicted by the engine's incident record** (V-M1). |
| `AbortSignal.timeout(5000)` on the mint `fetch` | Sound only for the starting request's own wait | Covered by V-M1's fold. |
| Fingerprint, openssl against Web Crypto | Scratchpad probe: identical base64 on a fresh PKCS#1 key. GitHub's command quoted from "Managing private keys for GitHub Apps". | **Proven.** The `SHA256:` prefix is not in GitHub's text (V-m3). |
| `navigator.userAgent === 'Cloudflare-Workers'` | Cloudflare "Compatibility flags", Global `navigator`, default as of 2022-03-21: "whose value is set to `'Cloudflare-Workers'`. This property can be used to reliably determine whether code is running within the Workers environment." Node 24.20 prints `Node.js/24`. The engines floor is `>=24` and the showcase compatibility date is `2026-08-21`. | **Proven.** |
| Playwright `page.route` failure injection for A6 | `examples/showcase/e2e/csrf-helpers.ts:60` already routes and fulfills. Kit 3.0.1's enhance deserializes any response body typed `failure`, and for a failure takes `result.status` from the HTTP status. | **Proven.** The forged body must be kit's devalue action envelope, a plan detail. |
| Kit 3 `use:enhance` location rule and `applyAction` | `npm pack @sveltejs/kit@3.0.1`: the cited lines read as the spec states. | **Proven.** Its page-state consequence is V-M3. |
| GitHub secondary limits (fork 2) | "No more than 900 points per minute are allowed for REST API endpoints", and most `POST` requests cost 5 points | **Quoted correctly.** |

## Question 4: the two forks

- **Fork 1 (dev save in memory with a notice).** The owner can rule on this evidence. The "No"
  answer carries a documented data-loss path: Library cleanup writes a real `media.json` without
  live rows, and the developer commits it. The "Yes" answer matches ruling 5's "local stand-in".
  But "No" also buys real product value, `git diff` and live public pages, and narrower variants
  (entry files only) could keep that value. The fork is not dominated. It is a reading of
  Geoff's own ruling, so it stays his call.
- **Fork 2 (anonymous `live=1`).** The trade between a monitor-usable check and an anonymous
  trigger is genuine, and neither answer dominates. Its "Yes" cost, one mint per isolate per
  minute, holds only once V-M1 is fixed. Rule it after the second fold, or rule it now on the
  stated residual with V-M1's fold as a condition.

## Question 5: the seven refusals

- **C-M7 fault switch: sound.** `page.route` is proven above, and it adds no published surface.
- **X-M3 mtime rule: sound.** The stated limit is honest, and dev-only state cannot lose committed
  data.
- **I-5 re-parse invariant: sound.** Alt never splices a nested placement, and replace swaps a
  token span.
- **I-2 merge-inside-retry: unsound as reasoned** (V-M2). The fail-closed alternative is
  acceptable only once the page's own concurrent dictionary commit is sequenced.
- **X-m3 compose-only split: sound.** The prerender imports the hooks, so a composition throw
  fails the build (`spec:169`).
- **K-m3 keep A5 `paint`: sound.**
- **C-O3 `sweep` for provisioning: sound.** The edit touches D1 provisioning.
