# Spec review, contract and criteria lens: engine pass before stage 2b (2026-10-07)

Target: `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md` at `32fd9b1c`, read with
its rulings file at the same commit. Code read on `draft-docs-2a`: at `ccec538c` when the review
started, and at `38af392d` by its end. Between the two, the F4 fix round merged. It touched only
`check:leaks`, `src/lib/audit/norms.ts`, and the create-cairn-site fixtures, so no line this spec
cites moved. The F4 review filed no friction-log entry; see m10. Scope: correctness gaps and unmet
requirements only. Every finding was checked against the tree. `L<n>` is a line of the spec.

Counts: 0 blocker, 9 major, 10 minor. Separately, 4 over-ceremony notes (1 major, 3 minor). No
owner fork beyond the two the spec already puts to Geoff.

## Major

**M1. The lead's own acceptance implies `runtime` is optional, and an optional `runtime` brings the bug class back** (L77-79, L136-137, L138-141).
Today `createAuthGuard(config: AuthGuardConfig = {})` (`guard.ts:170`), `devBackendHandle(config?)`
(`packages/cairn-cms-dev/src/handle.ts:100`), and `createEditorRoutes(config = {})`
(`editors-routes.ts:51`) all accept a missing argument. The spec never says whether `{ runtime }`
becomes required. L136-137 keeps a doctor failure for "a bare `createAuthGuard()` with custom roles
declared", which only makes sense if a bare call still compiles. A bare call would then fall back
to `DEFAULT_ROLES` and attach `{}`, ignoring the adapter. That is the same split the lead claims to
remove "by construction" (L73, L88). The Consumers must line (L138-141, L551-553) covers only sites
that passed `{ roles, access }`. A hand-built zero-config site calls `createAuthGuard()` bare, and
the line does not cover it.
**Fold:** make `runtime` a required member on all three factories, so a bare call is a type error,
and say so in the Decision. Reword the Consumers must line: "every `createAuthGuard`,
`devBackendHandle`, and per-route `createEditorRoutes` call passes `{ runtime }` (plus
`identity`/`includeSubDomains` unchanged)". Restate the doctor criterion: the bare-call failure
stays for a site on an older engine, which the tool still serves. Add a type test
(`// @ts-expect-error` on `createAuthGuard()` and on `createAuthGuard({ access })`) as the
criterion that fails today.

**M2. The lead's headline test can pass without testing the wiring** (L132-134).
"A test proves that an `access` rule on the adapter gates the engine screen, the sidebar entry,
`requireAccess`, and `createSectionAction` alike." The existing helper tests seed
`event.locals.cairnAccess` by hand. A test built that way passes today and after the change,
because it never runs the guard. The defect is the hand-off from the adapter to the locals. The
list also leaves out `createAdminAction`'s `access` option, a fourth reader of
`locals.cairnAccess` (`admin-action.ts:294`).
**Fold:** name the fixture. Use one adapter with `access: { media: ['owner'], '/admin/x': ['owner'] }`
and a declared `none`/editor role. Build it through `composeRuntime`. Run `createAuthGuard({ runtime })`'s
handle over a real event with no locals set, and assert all five readers refuse an editor session
from that one event: the media screen through `requireEngineAccess`, the nav resolver,
`requireAccess`, `createSectionAction`, and `createAdminAction` with `access`. Repeat with
`devBackendHandle({ runtime })` for the locals it attaches. State the failure today: the guard has
no `runtime` input, so the scaffold's wiring leaves `runtime.access` unread by the guard.

**M3. Most fix items carry no acceptance criterion, though L259 says every item names one** (L259-447).
Of the twenty-nine itemized fixes, only A1, A3, A6, C11, and D1 state acceptance (B5 shares
ruling 3's).
The plan author would invent the rest, including the security-relevant ones (C1, C5, C7, B7), and
none says why its test fails today.
**Fold:** add one acceptance line per item. Proposed lines, each failing on today's tree:

| Item | Fixture and assertion | Fails today because |
| --- | --- | --- |
| A2 | Map with `/admin/x` and `/admin/x/y/z`, route `/admin/x/[id]`: the record carries `reason: 'shadowed'`. Every emitter carries a reason (`guard.ts:444,481`, `section-action.ts:205`, `admin-action.ts:297`, `content-routes-media-ingest.ts:124`). | No `reason` field exists |
| C1 | `tidyAction` and `dictionaryAddAction` with no `concept` param, called by an editor the map denies: both 404. | The action runs ungated |
| C7 | Table over `isPublicAdminPath`: true only for `/admin/login` and `/admin/auth/confirm`. False for `/admin/auth/request`, `/admin/auth/x`, `/admin/auth/confirm/x`, `/admin/authx`. | `startsWith('/admin/auth/')` (`guard.ts:29`); see m2 |
| A7 | `verifyTurnstile` with `''` and a non-string secret logs `missing_secret`. | Logs `invalid_input` |
| A8 | The page's test passes `createChannelDb()` to `resolveDb` with no cast; tsc-checked. | `ChannelDb` is not assignable |
| A10 | `auth.branding: { siteName }` alone: the sent mail keeps the runtime's reply-to. | Whole replacement drops it |
| A5 | `check:template` asserts the scaffold carries `src/routes/admin/+error.svelte`. A showcase e2e 403 renders inside the admin theme wrapper. | No file; public chrome |
| B9 | Grep post-condition over `conditions.ts`, `conditions.json`, and `.dev.vars.example`: no `GITHUB_APP_ID` or `GITHUB_APP_INSTALLATION_ID`. `check:tool-conditions` green. | Both named |
| B11a | The key-step transcript names the rotation page. | It says "re-run this step" |
| B1 | The `npm pack` list holds `dist/**/*.js` and `.d.ts` and no `src/**/*.ts`. A fixture consumer with `skipLibCheck` and no `cloudflare:workers` or `node:sqlite` ambient declarations passes `svelte-check`. CI builds the package before the showcase e2e. | `exports` points at `./src/index.ts` |
| B2 | The stale-manifest error names `npx cairn-manifest`. | `manifest.ts:376` names `npm run cairn:manifest` |
| B3 | `emit-template-tree.test.ts` asserts a `cf-typegen` script. | Absent |
| B6 | On a fresh emitted scaffold, the check reports `.claude/` excluded; with installed and packaged `VERSION` differing, the status reads `fresh`. | Reports scanned and `stale` |
| B7 | Plugin `config` hook: `serve` gives `true`, `build` gives `false`, and a define the site set first is kept. The scaffold's `devBuildDefine` is removed and the e2e `wrangler deploy --dry-run` grep stays clean. | No hook |
| D2 | A scaffold feed test over an entry with `::include{...}` and a media image: resolved fragment, absolute `https://<origin>/media/...`. | Literal text, root-relative URL |
| A13, A14 | Composition throws on two `'Announce'` labels, and on every member of the shared reserved set (`admin-dispatch.ts:33`'s segments plus the fixed screens). | Accepted silently |
| D4 | `// @ts-expect-error` on `FieldBehavior.itemLabel`; `check:surface` shows the removal. | Member exists |
| C13 | A throwing facts derivation yields one build-log warning naming the skip. | Silent `ok` |
| D5 | An adapter with no `editor.nav`: the Settings save commits `src/theme/site.config.yaml`. | 404 "Site config not found" |
| D6 | A concept without `robots` and two entries with `robots: noindex`: one warning for the concept, naming `robots`. | Silent |
| D8a | A report holding only advisories exits 0 bare and non-zero with `--fail-on advisory`. | Always 0 |

**M4. D1 breaks every consumer build that has a nested image, and the spec says "Surface: none"** (L342-350).
The content manifest stores each entry's `mediaRefs` (`manifest.ts:32,90,112`). `cairnManifest`'s
`buildStart` throws "content manifest is stale" on any drift (`manifest.ts:367-377`). Once
`extractMediaRefs` descends into arrays and objects, every committed manifest that holds an entry
with a gallery or object image goes stale. The build and `npm run dev` both fail until the site
regenerates the manifest. That covers the scaffold's own `gallery` (`cairn.config.ts:116`) and the
showcase's committed manifest in this same task. The acceptance also tests only "a gallery asset".
`checkContainerNesting` admits three shapes (`fieldset.ts:403-416`): `array(image)`,
`object{image}`, and `array(object{image})`. "Descend one level" is ambiguous for the third.
**Fold:** add a Consumers must line: "regenerate the content manifest (`npx cairn-manifest`) and
commit it; a site with an image inside an array or object field fails its build until it does".
Add the regenerated showcase and template manifests to D1's task. Extend the acceptance to all
three shapes, each in where-used, safe-delete, and replace.

**M5. C5's fix weakens a site's own hardening, and the floor it promises is undefined** (L420-427).
"Restores the core `strip`, from a fresh copy" replaces whatever the callback returned. A site that
added tags to `strip` loses them, so the fix itself weakens that site's sanitizer. The spec also
calls the result "a security floor", and the reference page will promise one. The fix removes only
`script` from `tagNames`. A callback can still admit `on*` attributes under `'*'` or add
`javascript` to `protocols.href`, and the docstring at `sanitize-schema.ts:16-25` counts both as
part of the safe base.
**Fold:** set `strip` to the union of the core list and the callback's, never a replacement.
State the floor's members exactly in the spec and on `render.md`. Either include `on*`
attributes and the `javascript:`/`data:` protocols, with one test each, or say plainly that the
floor is `script` alone and that attributes and protocols remain the callback's responsibility.
The acceptance: a callback that adds `script` and mutates `strip` in place still yields stripped
output, and a second `buildSanitizeSchema` call in the same isolate gets an untouched default.

**M6. Ruling 5's read-through overlay is underspecified where the acceptance does not look** (L235-252).
The dev double keeps whole trees per branch (`fake-github.ts:42-48`). `createBranch` copies the
source branch's map (`fake-github.ts:805-813`). Commits delete paths from that map. Under
read-through, four behaviors the three criteria never touch break:
- **Delete.** A dev-admin delete must hide the disk file. "Overlay first, then disk" resurrects it
  unless the overlay records a tombstone.
- **Branches.** A `cairn/*` branch created from `main` copies only the overlay. Every disk file then
  reads `null` on the branch unless branches read through too.
- **The manifest.** The admin list reads `src/content/.cairn/index.json` from `main`. After the
  first dev-admin commit, the overlay's copy shadows the disk file for good. Later disk edits or
  manifest regenerations stop showing. A new file on disk never shows without a regeneration,
  since `buildStart` only verifies (see M4).
- **The module seed.** `main` is seeded at import with `2026-06-hello.md`
  (`fake-github.ts:42-46`), outside the seed functions that "do not run". It would appear in a
  real site's dev admin.

**Fold:** specify the overlay as path to content or tombstone, applied to every branch. Specify
`readEntries` as the union of disk and overlay, minus tombstones. Move the import-time seed into
the `'fixtures'` path. Add four criteria: a deleted on-disk entry stays gone; a branch read of an
untouched disk file returns its content; the list equals the disk set exactly, with no fixture id;
and a regenerated on-disk manifest shows after a prior overlay commit. If the overlay
deliberately shadows the manifest until restart, state that limit on the add-cairn page instead.
Also name the workerd predicate the construction-time throw uses, and test both branches of it.

**M7. A6's acceptance can pass vacuously** (L321-329).
"A component or e2e test with a failing backend." The defect is SvelteKit re-running `editLoad`
after a full-page POST. A component test never performs that navigation, so it passes with or
without `use:enhance`. The e2e half needs a backend that fails on both the commit and the
following read. The dev backend has no fault switch, and a search for one finds none in
`packages/cairn-cms-dev/src` or the showcase.
**Fold:** make the criterion the showcase e2e alone. Add a fault seam to the plan's A6 task, either
a dev-package option or a showcase-only route that arms the in-memory repo to throw. The assertion:
type text, arm the fault, save, see the calm message, and the textarea still holds the typed text.
Today a bare 500 replaces the page.

**M8. B5 contradicts ruling 3's design, and the 503 reaches no existing site** (L188-190, L206-209, L381-383).
L189-190 says "the site's `/healthz` route does not change". B5 says "the showcase route answers
503". `loadHealth` returns data, and the status is set by the site-owned route
(`examples/showcase/src/routes/healthz/+server.ts:14-20`, whose comment promises "always 200").
The 503 is therefore a template change. No consumer site gets it at upgrade, and the spec carries
no line telling one to adopt it. The spec also never says how `ok` composes once
`githubAppToken` exists.
**Fold:** state that the 503 lives in the template route. Delete "does not change" from L189-190.
Add a "Consumers may" line: "answer 503 when `loadHealth(...).ok` is false; an uptime monitor
keyed on status then sees a broken key". Define `ok` as `githubAppSigning.ok && (githubAppToken?.ok
?? true)`. Keep the engine helper out, which keeps the surface narrow.

**M9. D5 changes a default with no Consumers must line, and misses a reference page** (L431-438, L556).
The fallback is `src/lib/site.config.yaml` today (`content-routes-settings.ts:124`). The fix makes
the default `src/theme/site.config.yaml`. A site with its config at the old path and no
`editor.nav` loses Settings and Tags. The only line given is "Move `editor.nav.configPath`". All
five consumer sites declare `nav.configPath` at `src/theme/`, so they are covered. A hand-built
site on the old default is not. `core.md:249,257` uses `src/lib/site.config.yaml` in its example
and is not in D5's page list.
**Fold:** add a Consumers must line: "a site whose site config lives anywhere but
`src/theme/site.config.yaml` sets `editor.siteConfigPath`". Add `core.md` to D5's pages.

## Minor

**m1. Ruling 5's Consumers must line names the wrong population** (L252-253, L554-555).
`'repository'` throws under workerd whatever a site's tests assert. Any site that serves the dev
backend through `wrangler dev`, as the showcase pattern does, must pass `'fixtures'`.
**Fold:** "A site that runs the dev backend under `wrangler dev` passes `content: 'fixtures'`."

**m2. C7's acceptance must flip an existing test and two contract sentences** (L293-299).
`auth-guard.test.ts:107-111` asserts that `/admin/auth/request` passes the guard publicly. The
`createAuthRoutes` doc comment (`auth-routes.ts:160`) still says "the handlers a site's
`/admin/auth/*` routes call directly". `sveltekit.md:945` says `/admin/auth/**` "serves nothing"
under identity. A `git ls-files` check of the five consumer sites shows none mounts a route under
`/admin/auth/`, so the break is theoretical.
**Fold:** name the test flip, the doc-comment change, and the `sveltekit.md:938-946` edit in C7's
task.

**m3. A3's "engine's required set" does not exist** (L283-284).
No code or check defines one. `migrations/` holds 0000 through 0004. 0002 is opt-in, since
`audit-sink.ts:63` says "a site opts in by applying `migrations/0002_audit.sql`".
**Fold:** name the set {0000, 0001, 0003, 0004} and the 0002 exclusion in the criterion, asserted by
`emit-template-tree.test.ts`. Add a Consumers may line: "a site declaring custom roles applies
`0001_roles.sql`; it rebuilds only `editor`, so applying it after 0004 is safe."

**m4. The live-check classifier test should stub `fetch`, not the mint** (L192-198, L220-221).
`installationToken` throws a bare `Error("GitHub installation token failed: <status>")`
(`signing.ts:77`). A "stubbed mint" that throws hand-made errors never tests the status-to-class
mapping. The classifier also needs a bucket for 403 (suspended installation) and for other
statuses. A refused key logged as `github.unreachable` misnames the cause.
**Fold:** stub `fetch` with 401, 404, 403, 500, and a thrown `TypeError`. Make the classifier
total, and log a refusal under its own `reason`. Inject the clock so the 60-second expiry and
the per-key-hash entry are each asserted.

**m5. The fingerprint, if ruled in, has no acceptance** (L211-218, L458-462).
**Fold:** add a fixture key pair whose expected `SHA256:` value comes from `openssl rsa -pubout
-outform DER | openssl dgst -sha256 -binary | base64`. Assert `signingSelfTest` reports exactly
that value, in GitHub's displayed format.

**m6. The doctor fix leaves its remediation naming a removed option** (L123-126).
`tmplRoleWiringUnwired` (`check_roles.go:29`) and `auth.role-wiring-missing`'s remediation
(`conditions.ts:170-172`, mirrored at `conditions.json:62+`) both say to pass `{ roles }`. The
criterion also tests only the shorthand form.
**Fold:** name both engine eras in the remediation, `{ runtime }` (new) and `{ roles }` (older),
under `check:tool-conditions`. Test `{ runtime }`, `{ runtime: cairn }`, and
`{ runtime, identity }`.

**m7. A1's tests stop at `canReach`** (L265-272).
The defect is that `requireAccess` and `createSectionAction` refuse the `none` role's own screen.
**Fold:** add one end-to-end row per helper: a `none` session on a mapped href that names its
role is admitted. The `editors` screen stays refused.

**m8. Two declined verdicts carry reasons a reader cannot check** (L630, L646).
A12 says "false for the scaffold" with no cite. "Token-cache eviction on a 401" is batched with
the reason "not needed once the live check exists", which argues for a decline, not a batch.
**Fold:** cite the file and line that makes A12 false. Make the eviction a decline with that
reason, or give the batch a reason it is still wanted.

**m9. The lead's docs list misses the dev package README** (L142-146).
`DevBackendConfig.access` and `.roles` (`handle.ts:64-82`) carry the documented divergence the lead
removes. The dev README documents it.
**Fold:** add the README and the `DevBackendConfig` doc comment to task 1's docs.

**m10. The F4 input can be closed** (L9-10).
No friction-log entry was filed between `2f4ef9d8` and `38af392d`.
**Fold:** replace the open sentence with "F4 filed nothing (verified at `38af392d`)".

## Over-ceremony

**O1 (major, attended time). A5 as `paint` forces an owner sitting at pass B's close** (L316-320, L585).
Under pass-core, a mixed pass runs the union of its classes at the close, and `paint` settles with
"the owner sitting" plus an async owner glance. One small admin error page buys a whole sitting.
**Fold:** class A5 `engine-logic` (template file, the e2e criterion in M3) with one
`visual-verifier` read of its capture. Pass B then closes without a sitting.

**O2 (minor, tokens). Pass A as a whole `auth-data` puts mutation proofs on string and type tasks** (L569).
A6, A7, A8, A10, B9, B11a, and task 10's docs would each carry test-first, a mutation proof, and
coverage-gaps-block.
**Fold:** set the header to `engine-logic`. Give tasks 1, 3, 4, 6, 8, and 9 their own
`Pass class: auth-data` line, task 2 `tool`, and task 10 `docs`. The close still runs the
`auth-data` settle by the union rule.

**O3 (minor). Deletions and string edits classed `engine-logic`** (L183-184, L361-363).
Ruling 2's `create-cairn-site` change removes code and transcripts, and B11a changes one string.
Test-first adds nothing to either.
**Fold:** `sweep`, with the grep and transcript post-conditions in M3.

**O4 (minor). One ruling-3 criterion cannot fail today** (L221).
"The plain call makes no fetch" holds on today's tree. Keep it as a guard for the new branch, but
the plan should not count it as proof of the fix.
