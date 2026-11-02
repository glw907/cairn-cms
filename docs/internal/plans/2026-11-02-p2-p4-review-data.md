# p2-p4 plan review: data integrity and failure risk

Target: `2026-11-02-p2-p4-plan.md` and `-design.md` at `925d9ca0c`. Read against the source at that
commit, `@sveltejs/kit` 3.0.1 in `node_modules`, and `origin/worktree-small-api`'s plan.

**Counts:** 1 blocker, 4 major, 15 minor (11 `correctness`, 4 `optional`). Two are OWNER FORKs.

The plan is sound where it is most sensitive: nothing here lets a dev backend reach a deployed Worker,
and T3, T4, and T5 are safe in their auth paths. The risk sits in T6's `calls update() for the rest`
and T7's validity handler.

## Findings, by consequence

### 1. Blocker, `correctness`. T7's handler refuses an emptied optional field

**Location:** plan:365-368; `src/lib/content/field-rules.ts:15-25`; `src/lib/content/fieldset.ts:302-312`.

**Defect:** the plan runs `stringLengthError` on the trimmed value on input. That helper has no empty
case: an empty value under `min` returns a message. The server never reaches it for an absent optional field
(the empty-first drop, cited in the comment at `fieldset.ts:303`), and native `minlength` also ignores
an empty value. So an editor who clears an optional `min: 3` field gets a custom validity the server
would never raise. Save and Publish are blocked until they type three or more characters. They cannot
clear the field at all. No acceptance line covers it: T7's tests paste `'  ab  '` and 12 characters.

**Fold:** skip the check on an empty trimmed value, and let `required` own emptiness. Add to T7's
acceptance: clear an optional `min: 3` field, then save. Finding 16 removes this class outright.

### 2. Major, `correctness`. An `error` result destroys the working copy

**Location:** plan:318-319 ("calls `update()` otherwise"); design:102; `src/lib/admin/EditPage.svelte:254-262`;
`node_modules/@sveltejs/kit/src/runtime/app/forms/client.js:103,218-240`; `runtime/client/client.js` (`set_nearest_error_page`).

**Defect:** `update()` passes an `error` result to `applyAction`, which replaces the screen with the
error page and unmounts the component holding `rows`, `working`, and the dialog's values. `EditPage`
refuses this on purpose: "the error page applyAction would render replaces the editor." The cluster's
whole point is that a refused action keeps the work, and these paths reach it:

- Stale CSRF. The guard returns `renderConditionResponse('auth.csrf-token-invalid')`, an HTML 403
  (the CSRF branch in `guard.ts`). `deserialize` fails, Kit throws `SvelteKitError`, and the editor sees a
  generic error page, not the branded page that says a reload recovers. The rotated-token case is
  documented at `auth-routes.ts:383-392`.
- A network failure or a Worker crash (no `location`, straight to `applyAction`).
- A thrown `HttpError`: `error(404, 'Site config not found')`, or `requireOwner`'s 403.

A native post kept the prior page in the back-forward cache, so Back could restore it. The in-app
error page keeps nothing. `viewAction`'s `fail(500)` does take the common thrown case, so this path
is narrower than a plain 500, and it needs no test harness beyond `page.route`.

**Fold:** the helper takes `EditPage`'s shape: on `redirect`, `location.assign` if the target is this
screen, else show an in-place notice; on `error`, show the notice and do not call `update()`; call
`update()` for `success` and `failure` only. `creating` clears on every non-redirect result. The
same-origin redirect off the screen is the expired session: the notice with a sign-in link keeps the
work, which a plain assign does not (parity with today, so this half is a bonus). One test beside
`edit-save-failure.spec.ts`: a 403 HTML answer on Nav leaves the rows and shows the notice.

### 3. Major, `correctness`. No in-flight guard, so a slow commit invites a second one

**Location:** plan:318-325; `client.js:147-188` (enhance has no guard); `src/lib/sveltekit/nav-routes.ts:152-174`.

**Defect:** a save is a GitHub commit, seconds long. A native post shows the browser's progress
indicator and unloads the page. `use:enhance` shows nothing, and only `ConceptList` has a `creating`
flag. A second click sends a second POST:

- Nav, tags, and tidy: if the first finished, the second reads the new head and commits again, so two
  commits and two deploys. If they overlap, the loser gets the conflict alert a moment before
  `location.assign` lands.
- `editorRemove`: the second answers `No such editor` for a removal that worked.
- `editorAdd`: the second answers `That editor already exists`, or a generic 500 from the unique index
  if both pass `findEditor`.

**Fold:** the shared submit function holds one pending flag per form and calls `cancel()` on a repeat,
clearing it on any non-redirect result. Each screen sets `disabled` or `aria-busy` on its submit
button from that flag. Add one acceptance line: a double click on Save sends one POST.

### 4. Major, `correctness`, OWNER FORK. A kept working copy can overwrite the change that refused it

**Location:** plan:328-330; `nav-routes.ts:152-171`; `content-routes-settings.ts` (`settingsSaveAction`,
`vocabularySaveAction`, `CONFIG_CONFLICT_MESSAGE`).

**Defect:** each save reads the head inside the action, so the guard covers only the action's own
window. On a conflict the message says "Reload and reapply your edits." Today the refused page
reseeds from the fresh tree. After T6 the old working copy stays and Save stays live. Pressing Save
again reads the new head, passes the guard, and commits the whole tree, list, or block over the other
editor's change. The guard's comment calls this outcome the thing it exists to prevent.

A stale tab can already do this with no refusal, so T6 adds no new class. What it adds is the case
where the editor was just told about the conflict, and the UI offers the overwrite. The copy also
now tells them to discard what the screen deliberately kept.

**Options:**

- **Recommended: keep T6's behavior and reword the conflict copy** to say someone else changed the
  settings, and saving again replaces their change, while a reload shows it and drops yours. File a
  backlog item for a load-time head. Cost: one string, about 5 minutes, and a docs check.
- On a conflict, refresh `data` and show what changed. Needs a merge view, so out of scope.
- Post a load-time head as a hidden field, closing the stale-tab case too. About 30 minutes, three
  action signatures, and an `auth-data`-adjacent commit path. Belongs in its own item.

### 5. Major, `correctness`. On a URL with a query, `update()` navigates instead of applying in place

**Location:** design:93-94,103-106; plan:326-338; `client.js:89-109`; `runtime/server/page/actions.js:74-88`;
`runtime/client/client.js:3015-3040`.

**Defect:** the design's reading of Kit stops at `applyAction`. In Kit 3 a `failure` result carries
`location`, the action URL minus its `?/name` key. From `/admin/nav?saved=1` the location is
`/admin/nav`, which `is_current_location` says is not here, so `update()` calls
`apply_action_navigation`: a client navigation that reruns the load and sets `form` from the result.

So the first refusal after a successful save, the natural sequence, takes a path the design never
read and T6's tests never run. By reading it comes out well: the query clears, so `data.saved` goes
false and no green banner sits beside the red one. The component is not keyed on it, so `rows`
survive. `finish_navigation` calls `reset_focus` only when focus is on `body`, so a focused alert
holds. But three things differ from "leaves the component alone": a GitHub read runs, a failing load
replaces the screen, and `restore_scroll` runs. `ConceptList` is the exposed one: from
`/admin/posts?publishedAll=3` or `?error=publish_conflict`, the dialog must survive a route update.

**Fold:** correct design:93. Add two acceptance lines: Nav refused from `?saved=1` shows no
`Navigation saved.`, keeps its rows, and focuses the alert; the create dialog refused from
`?publishedAll=1` stays open with its values. Do not pass `navigate: false`: that would leave the
stale success banner beside the refusal.

### 6. Minor, `correctness`. ManageEditors shows a stale allowlist after a refusal

**Location:** plan:320; `ManageEditors.svelte:129-143`; `editors-routes.ts:131-135,151-156`; `client.js:82`.

**Defect:** today every refusal reloads the table. `update()` refreshes on `success` only. After `No
such editor` the ghost row stays. After `You cannot demote the last owner`, a custom vocabulary's
`<select>` keeps showing the refused role beside a badge showing the real one. The server stays
authoritative, so nothing commits wrong, but this screen decides who can sign in.

**Fold:** on ManageEditors, call `update({ refreshAll: true })` for a failure. Confirm in the Editors
test that Name and Email keep their text through the refresh, and that the select returns to the
row's role, since a select left uncontrolled may need its `selected` reasserted.

### 7. Minor, `correctness`. ManageEditors' success path changes and nothing tests it

**Location:** design:98-102 ("keeps every screen's success path exactly as it is"); plan:326-339;
`editors-routes.ts:124,138,158`.

**Defect:** the editor actions return `{ ok: true }`, never a redirect, so the claim holds for three
screens only. Success now resets the form, refreshes in place, and moves focus to `body`. The polite
region goes, and no status replaces it, so a change to who can sign in is silent to a screen reader.
Every T6 test is a refusal, so a broken refresh would pass.

**Fold:** narrow the design's sentence. Add one Editors test: add, role change, and remove each update
the table with no reload. Add a `role="status"` line for the three outcomes, or file it, and list the
choice in `## Decisions`.

### 8. Minor, `correctness`. `ConceptList` cannot tell a create refusal from any other

**Location:** plan:321-322; `ConceptList.svelte:270,278`.

**Defect:** "shows the alert inside it... keeps its banner for every other action" needs a
discriminant, and `ContentFormFailure` has none. `form?.error` is shared with the generic `fail(500)`.
The alert also stays in the dialog when it is closed and reopened.

**Fold:** set a local `createRefused` in the submit callback, and clear it when the dialog closes.

### 9. Minor, `correctness`. "Finds the control by name" can land on nothing

**Location:** plan:360-362; `fieldset.ts:498-502`; `FieldInput.svelte:313`; `EditPage.svelte:342-357`.

**Defect:** `errors` keys are top-level field names, so a nested refusal matches no control and the
banner fallback is right. But a media field's value lives in hidden inputs and a checkbox group
shares one name. `focus()` on a hidden input does nothing, the plan's rule "no single control" does
not say so, and the banner never takes focus. `onFormInvalid` also flips Preview back to Write; the
plan cites only Details, so a refused `title` in Preview focuses a hidden control.

**Fold:** a match counts only when it is one element, not `type=hidden`. Reuse both reveals. Use
`form.elements.namedItem(field)` rather than a selector, so no field name needs escaping. Add a
component test on a hidden-input field.

### 10. Minor, `correctness`. T7's file list misses public comments it makes false

**Location:** plan:345-347; `src/lib/content/fields.ts:44-48,66-70`.

**Defect:** six public doc comments say an entry's form renders `minlength` and `maxlength`. Under S1
they stop being true, and `fields.ts` is not listed. The S1 consequence, that a too-long value is
reported rather than truncated, also needs a `CHANGELOG.md` line; T11 names `ContentFormFailure.field`
only.

**Fold:** add `fields.ts`, and rerun `check:surface -- --update`. Add the behavior to T11's list.

### 11. Minor, `correctness`. T1's list omits edits the outcome needs

**Location:** plan:142-145,155-161.

**Defect:** each is caught by a gate or test, at the cost of a failed run.

- `examples/showcase/src/app.d.ts:32` types `CAIRN_DEV_BACKEND`. `CAIRN_DEV_CONTENT` needs the same
  line, or `env.CAIRN_DEV_CONTENT` fails the type check. Mark it excluded from the template.
- `hooks.server.ts:3` is outside the exclude block. A `devBackendContent` added to that import leaves
  the template importing a missing name. It needs its own excluded import line.
- `handle.ts:135` is a two-way ternary, so `'empty'` falls through to `createRepositoryBackend`.
- `fake-github.ts:42-47` seeds `SEED_POST` at module load, so `seedEmptySite` must delete it.
- The second server's `--var` list names `CAIRN_DEV_CONTENT` and `PUBLIC_ORIGIN` but not
  `CAIRN_DEV_BACKEND:1`, without which it runs the real guard.

**Fold:** add the five to T1's text and `app.d.ts` to its Files.

### 12. Minor, `correctness`. T4 leaves false comments on auth paths

**Location:** plan:262-267; `src/lib/sveltekit/auth-error-codes.ts:14-25`; `auth-routes.ts:109-117`;
`content-routes-shell.ts:310`; `refusal-codes.ts:8`.

**Defect:** `NO_PENDING_REQUEST_ERROR`'s `@beta` doc comment says the two codes "need different
instructions" and that both pages branch on it. `PENDING_COOKIE_TTL_MULTIPLE`'s comment says its
longer life buys the "that link expired" reading, which T4 retires, so the cookie's rationale goes.
The plan allows an edit to `auth-routes.ts:344-349` only. T4's grep looks for the exact sentences, so
it misses these.

**Fold:** add `auth-error-codes.ts` and `content-routes-shell.ts` to Files, and widen the permitted
comment edit to `auth-routes.ts:109-117`. Leave the TTL multiple as is: a shorter cookie is a behavior
change this pass does not need.

### 13. Minor, `correctness`. `auth.link.sent` reads as universal, and fires only on the default sender

**Location:** plan:228,237-238; design:87-88.

**Defect:** a site passing `send` gets no record. An owner reading `troubleshooting.md` could read the
absence as a failed send.

**Fold:** `log-events.md` and `troubleshooting.md:40` each say the record comes from the default
Cloudflare sender, and a custom sender logs for itself.

### 14. Minor, `correctness`. T5's constant is not true for every status

**Location:** plan:289-291; `src/lib/github/repo.ts:62-65`.

**Defect:** `listMarkdown` takes an optional token, so a 403 or 429 can be a rate limit on an
unauthenticated read. "Check the GitHub App's install" sends the owner the wrong way.

**Fold:** the constant adds that a 403 or 429 can be a rate limit. Nothing else in T5 changes.

### 15. Minor, `correctness`. T10 and T12 disagree on the last merge, and the watch may find nothing

**Location:** plan:94,425,454,431.

**Defect:** the overlap table says T10 runs after the last `main` merge, and T12 merges `main` after
it. T12's fold can also change a render. Separately, `e2e.yml`'s commit is a `GITHUB_TOKEN` push,
which fires no `pull_request` run, so "Run the CI watch after the commit" has nothing to watch until
the next commit. The executor must also pull that commit before T11, or T11's push is refused.

**Fold:** say that a `main` merge or a fold touching `examples/showcase/e2e/*-snapshots`, `src/lib/admin`,
or admin CSS redispatches T10, and on a binary conflict take `main`'s side and redispatch. Replace the
watch with: pull the bot's commit, and the CI proof is T11's push.

### 16. Minor, `correctness`. The pre-flight contradicts T7

**Location:** plan:72,347.

**Defect:** "No task edits `scripts/checks/**`," and T7 writes `scripts/checks/api-surface.md`. Under
"a refusal is a stop," an executor could read this as a stop.

**Fold:** except the generated `api-surface.md` by name.

### 17. Minor, `optional`. The second server should fail loudly on a held port

**Location:** plan:161; `scripts/checks/gate-tier.mjs:152-153`; `playwright.config.ts:3-5`.

**Defect:** `gate-tier.mjs` guards only `E2E_PORT`. With `reuseExistingServer`, a leftover server on
`+2` from another worktree serves the wrong engine to the zero-state tests, the hazard the config's
first comment names.

**Fold:** `reuseExistingServer: false` on the second entry.

## Over-ceremony, by cost

### 18. Minor, `optional`, OWNER FORK. `setCustomValidity` is unnecessary once the server half lands (about 20 minutes)

**Location:** plan:42-51,365-368.

Dropping `maxlength` alone stops the truncation. The server half then answers a too-long save with its
own message, the field focused, and the text kept, since `EditPage` already posts through `use:enhance`.
The client handler adds typing-time feedback and its risks: finding 1, a second place running the
server's rule, and a new browser-blocking state for Publish.

**Options:**

- **Recommended: warn at Save.** Drop the two attributes, keep the server half, and cut the handler.
  Saves about 20 minutes, and removes finding 1. The cost is that the editor learns at Save.
- Warn while typing, as S1 is written, with finding 1's fold.

This is a refinement of S1, so it goes to `cairn-cms-9b` with S1.

### 19. Minor, `optional`. T10 and T12 read the same 42 images (about 15 minutes, 42 image reads)

**Location:** plan:430,461-462.

T10's executor reads every new image, and T12's render read, in the same loop, reads them again.

**Fold:** Count T10's read as the render read. T12 reads only what changed after T10, plus the help
panel and T3's four email PNGs.

### 20. Minor, `optional`. T5's own diff review (about 5 minutes)

**Location:** plan:278.

It reads a strings-only commit that the whole-branch review and the security reviewer both read at
close. **Fold:** cut it unless `pass-core` requires a per-task review at `auth-data`.

## Read and cleared

- **T1, deployment.** `CAIRN_DEV_CONTENT` is read only inside `__CAIRN_DEV_BUILD__ && devBackendOptIn()`,
  so a default build drops it. A flagged build deployed with the flag still gets the 503 at
  `handle.ts:158`. `devBackendContent()` reads a runtime var, the case `dev-gate.ts` says is safe to
  share, and the call site still names the define. The folding stands.
- **T1, shared state.** Both servers share `.wrangler/state`, but `/admin`, `/media`, and `/preview` use
  per-process doubles, and the only showcase route naming a binding outside them is `/test/render-media`.
  No spec relies on shared D1 or R2. The module-level store is per process, and `handle.test.ts` runs
  no fixtures-mode test, so `seedEmptySite` wipes nothing another test reads.
- **T3, logging.** `emit` catches everything and falls back (`create.ts`), and small-api's T8 stringify
  stays inside it. A record cannot turn a delivered link into `send-error`, provided `messageId` is read
  with `?.` and not `in`, which throws on a primitive. `EmailSender.send` returns `unknown`. A record
  carries `email` and `messageId`, neither a redacted key, and no token.
- **T3, HTML.** `escapeHtml` covers both quotes for a quoted attribute and for text, so `link` and
  `siteName` are safe. The text part stays unescaped, which is correct.
- **T4.** No engine path reaches `expired` through `resolveRefusalCode`. `/admin/login` reads
  `url.searchParams` raw, never the resolver, and the guard strips the session there, so no load bounces
  it to `indexLoad`. A crafted `/admin?error=expired` now drops the code, which is the resolver's job.
  `guard.ts` and `preview.ts` need no edit. The sentence is true for a bootstrap link too: 10 minutes.
- **T5.** No caller parses these strings. `isConflict` is by name, status comes from `.status`, and
  tests match `/403/` and `/tree create failed/`, which survive. The `err.message` sites that reach an
  editor wrap validators, never GitHub. Thrown text reaches logs only, and the constant carries nothing
  secret.
- **T6, same-URL redirect.** `location.assign` to the identical URL with no fragment reloads, so a
  second save stays a document load. A custom route's `?/name` action resolves against its own path, and
  small-api's E6 removes these components from `/admin` anyway. An expired session arrives as a
  `redirect` result (`respond.js:453-459`), so the assign is parity with today.
- **T7, stale validity.** The title and every field sit inside `{#key entryKey}` (`EditPage.svelte:1821-2797`),
  so a hop discards validity with the node. Rows are keyed by id and move with their node, and a
  collapsed row reveals itself on `invalid`. No code sets these controls' values, so validity cannot
  go stale apart from finding 1. A no-JS post validates on the server. The reset coverage test only
  cares if T7 adds a `$state`.
- **T7, small-api.** Nothing in its plan changes `field-rules.ts`, `FieldInput`, or the save path.
  It never names `ContentFormFailure`, though, so plan:90's "moves to its one subpath" is unsourced;
  `check:surface` settles it at the merge.
- **T10.** The dispatch runs one unsharded leg and names `admin-visual.spec.ts`, which starts both
  servers, so the zero-state baselines regenerate.
