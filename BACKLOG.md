# BACKLOG

> Project issue tracker. Managed by `/log-issue`.

## High
- [ ] **#74** Media replace leaves the content manifest's `mediaRefs` on the old hash `#bug` `#cairn-cms` *(2026-10-25)*
  The replace action commits each rewritten entry plus the new `media.json` row straight to the default branch, but not `runtime.manifestPath` (`src/lib/sveltekit/content-routes-media-metadata.ts:400-411`); delete and rename both rewrite it (`content-routes-entry-destructive.ts:178,388`). The default-branch usage index reads the manifest's `mediaRefs` (`src/lib/media/usage.ts:81-95`), so after a replace the new asset shows as unused and the delete gate would let an editor delete an image live pages render. Likely also a build failure: `verifyManifest` compares `mediaRefs` exactly once any committed entry carries them, so the site's next build would fail on drift. Alt propagation (`:574-580`) rewrites entry files too; check it the same way. Fix: rebuild each affected entry's manifest row in the same commit, with a test. Found by the Architecture page's fact-check, 2026-10-25.
- [ ] **#55** Refuse exit 0 in `gate-tier.mjs` when the fast lane prints no legs `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  In the PR #137 sweep a slice agent's edit script emptied `scripts/checks/gate-tier.mjs` (929 lines) and committed it, and the fast lane printed nothing and exited 0, because the fast lane is that file. Exit nonzero when no leg runs. The sweep-side check (a `git diff --numstat` for unequal counts) lands in the workstation's word-sweep method.

## Medium
- [ ] **#75** `cairn-guidance check` misjudges the `.claude/` Tailwind exclusion and advises a line that excludes the wrong directory `#bug` `#cairn-cms` *(2026-10-25)*
  `judgeSourceExclusion` (`src/lib/guidance/check.ts:76-91`) reads only `src/admin.css` and `src/theme/admin.css` and counts as excluded only the literal `SOURCE_EXCLUSION_LINE`, `@source not "./.claude";` (`:21`). Tailwind resolves an `@source` path against the stylesheet that carries it, so in `src/admin.css` that line excludes `src/.claude`, not the project root's `.claude/`; a correct `@source not "../.claude";` reads as not excluded, and the advice at `:201` makes a site add the wrong line. It also never reads the public stylesheet (the scaffold's exclusion is `templates/waymark/src/chassis/tokens.css:55`, `../../.claude`). Fix: resolve each `@source not` path against its file and compare to the root `.claude`, and read the site's Tailwind entries, with tests. Found by the Claude Code page's recheck, 2026-10-25.
- [ ] **#73** Type-check the hooks snippets instead of skipping them `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25)*
  Engine pass B (`37797ff35`, 2026-10-08) made `{ runtime }` required on the hook handles, and seven extend pages kept the old calls until the runtime-bag sweep (#142). Every stale block carried `snippet-check-skip`, for reading the site-declared `__CAIRN_DEV_BUILD__` global, for importing `cloudflare:workers` (which `check:snippets` has no types for), or for being an excerpt of the scaffold's hooks file, so the snippet check never saw them. Give the check an ambient `declare const __CAIRN_DEV_BUILD__: boolean`, a `cloudflare:workers` declaration, and a stub for the excerpts' elided imports, then drop those skips so an API break fails the docs gate.
- [ ] **#70** Audit the shipped agent guidance's routes to the docs once the arms are complete `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25)*
  Agents reach the docs through the four packaged skills and the `claude/CLAUDE.md` fragment, which read the installed version under `node_modules/@glw907/cairn-cms/docs/`. No general docs-reference skill: a catch-all description triggers poorly, and the routing already exists. Check that every task row and seam cites its finished page and that every finished page is reachable from some route (a candidate gate beside `check:reference`). Fix the links in `skills/cairn-extend/SKILL.md` to the engine rulings and the admin design system on GitHub `main`, which drift from the installed version: ship or summarize what an agent needs. Fold the result into the planned `docs/claude-code/` arm (ROADMAP, "The Claude Code arm").
- [ ] **#69** Loosen the register's task-guide item 5 for a feature with no log event `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25)*
  `docs/internal/docs-register.md` item 5 asks every task guide for failure paths that point at the track's recovery surface (`extend/debug-your-site.md`). A feature that logs no event has nothing there to point at, so the item should let such a page point at the checks that settle it instead.
- [ ] **#64** Put the admin's icons on one size scale and Lucide glyphs `#improvement` `#cairn-cms` *(2026-10-25)*
  The admin draws 192 Lucide icons at 11 sizes (`size-3` to `h-8 w-8`), and about a dozen hand-drawn inline SVGs (in `MediaFigureControl`, `MediaHeroField`, `ReferenceField`, `EditorToolbar`) carry their own strokes from 1.75 to 3, out of reach of the 1.75px rule (`admin-design-system.md:394`). Survey v1.4.0's "Icons" section (14, 16, 20, 24px by context) is a reference, not a dependency. Stroke weight stays a site choice (Geoff, 2026-10-25): the engine keeps 1.75px, and a Survey site's `.lucide` rule overrides it. Design session prompt: `docs/plans/2026-10-25-icon-sizes-design-prompt.txt`.
- [ ] **#63** Mark a reader-site path so `check:symbols` doesn't reject it `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25)*
  `check:symbols` resolves a path only against the repo root and `templates/waymark` (`scripts/checks/check-symbols.mjs:609-615`), so it rejects a path in the reader's site: `src/app.css` made a page's author write "`app.css` under `src`" to get past it, a showcase-only file such as `src/lib/env-check.ts` cannot be named by path, and `src/theme/admin.css` (read by `src/lib/guidance/check.ts:29`) has no allowlist entry. Paths a page names in the reader's site need a marker or a standing allowlist group, so the gate doesn't push the prose into circumlocution.
- [ ] **#62** Fix the published-page defects found in the extend track's fourth review batch `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  run-cairn-audit's CI fragment runs `npx playwright install chromium` but never installs the `playwright` package, and it sets `BASE_URL` to 4173 while the scaffold's `preview` is `wrangler dev`. `docs/extend/share-a-draft-preview.md:43` links a removed anchor.
- [ ] **#59** Fix the scaffold's stale comments `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `templates/waymark/src/theme/theme.css` names `check:public-tokens` (lines 11-12, 66, 126), an engine-repo script a site doesn't have, and its recipe says "about fourteen" values for twelve. The chassis README's `content.ts` dependents row misses `(site)/archive/[page]` and three chassis modules.
- [ ] **#58** Decide whether a failed island logs `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `src/lib/islands/index.ts:43-51` swallows a props parse failure and a mount throw in bare `catch` blocks; nothing reaches the console or Workers Logs. Geoff's call, since a log event widens the vocabulary.
- [ ] **#57** Fix the publishActions doc comment: a bad entry also fails `vite build` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `publish-actions.ts:30-33` says a bad entry "fails at server start". SvelteKit's build analysis loads every route's server node (`analyse.js:69`), so on a scaffolded site it also fails `vite build`.
- [ ] **#50** Name a concept by its key in every concept error `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `defineConcept` names a concept in its errors by `label ?? dir` (`src/lib/content/concepts.ts:67`), while `normalizeConcepts` names it by its content-map key, so one concept shows under two names.
- [ ] **#49** Add `mediaLibraryUpload` to the typed admin routes contract `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `mediaUpload` stores bytes and commits no manifest row, so a custom screen's upload resolves as missing until an entry save records it. `mediaLibraryUpload` commits the row but `CairnAdminRoutes` leaves it out (`src/lib/sveltekit/cairn-admin.ts:390`), so typed code reaches it only through a cast. Geoff, 2026-10-24: Configure media documents both paths as the code stands (the uncommitted `mediaUpload`, and `mediaLibraryUpload` reached through a cast) until this lands. When it lands, update the custom-screen upload section of `docs/extend/configure-media.md` in the same pass.
- [ ] **#48** Honor `publicBase` and `urlForm` in the edit page's live preview `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  The live preview builds `/media/<slug>.<hash>.<ext>` paths whatever the media config says (`src/lib/admin/EditPage.svelte:1359`, `src/lib/render/resolve-media.ts:141`), so a site that moves `publicBase` gets 404 preview images unless it also keeps a `/media` route. Geoff, 2026-10-24: Configure media documents the workaround (keep a `/media` route beside the moved one) until this lands. When it lands, remove that step and its failure row from `docs/extend/configure-media.md` in the same pass.
- [ ] **#47** Fold Reuse content across entries into Content model `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  A scaffolded site already declares the `fragments` concept, globs it, lists it in the manifest plugin (`templates/waymark/src/theme/cairn.config.ts:137`), and forwards `resolveFragment`, as does the add-cairn tutorial's render (`add-cairn-to-a-sveltekit-app.md:333`). Define an adapter and schema now walks through adding a concept, the `fragments` routing rule included, and the include syntax is editor material. Recommended for Geoff: give Content model one "Fragments" section (the reserved concept and its `embedded` routing, resolution one pass deep and the refused nested include, the build check and the delete guard, the empty and not-found notices); move the diagnosis rows to Debug your site; retire the page. Not authored overnight; waits for Geoff's call.
- [ ] **#46** Fold Link content with references into Content model `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  On a scaffolded site a reference field is one declaration line that the scaffold already resolves (`withReferences`, `src/chassis/entry-data.ts:30-37`) and renders (`ArticleView.svelte:56-58`), so the page's walkthrough repeats the scaffold and `delivery-data.md#resolvereferences`. Recommended for Geoff: give Content model one "Reference fields" section (the declarations and the undeclared-target throw, the picker in a sentence, the build check and the save, delete, and rename guards in order, and where a `cairn:` token is live or inert); leave Build the public routes a two-sentence note at its entry loader for a hand-built site; retire the page. Nine pages link it; the deep link is `build-the-public-routes.md:271`. Not authored overnight; waits for Geoff's call.
- [ ] **#45** Keep a renamed posts concept's feed from going empty `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  Renaming the scaffold's posts concept empties its feed. 
- [ ] **#44** Check inbound cairn.pub links to the extend headings PR #137 renamed `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  Dropping "own" changed the anchors `upload-from-your-screen`, `mint-and-revoke-from-your-admin-route`, and `port-your-theme-onto-the-chassis`. In-repo links are fixed; inbound links from cairn.pub are unchecked.
- [ ] **#43** Say that a local D1 needs `--local` for the `AUTH_DB` migrations `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  Deploy applies the migrations with `--remote` only, so a local D1 still needs `--local`. Document it on the page that has the reader apply the `AUTH_DB` migrations, or change the step.
- [ ] **#42** Settle the scaffold's two origins `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  The scaffold names its origin twice, a literal `https://showcase.test` and the setup-written `PUBLIC_ORIGIN` `workers.dev` URL, so a deployed site has two.
- [ ] **#41** Fix the stale header comment in `manifest.ts` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `src/lib/content/manifest.ts:3-4` says "save path patches one entry"; the docs friction log also lists it, unfixed.
- [ ] **#39** Give the tutorial site's layout a code source `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  No code in the repo shows the add-cairn tutorial site's layout, so a claim about it has nothing to check against. Add a fixture or record a ruling that pages make no claim about the tutorial site.
- [ ] **#33** Fix the `branch_gone` row in the log-events reference `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-22)*
  `docs/reference/log-events.md:40` says `branch_gone` comes from discarding a never-published entry. That discard deletes the entry's link rows, so the link logs `unknown` instead; `branch_gone` needs the branch gone with the row still there, such as after a failed cleanup. Found while checking the share-a-draft-preview page. The `loadPreview` entry in `docs/reference/sveltekit.md` may repeat the claim.
- [ ] **#32** Remove `RoutingRule.inFeeds` or wire it `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-22)*
  `src/lib/content/types.ts:329` declares `inFeeds`, whose doc comment says it decides feed and sitemap membership. Nothing in `src/lib` has read it since the first content model (2026-05-28). The content-model page says feed membership is the site's choice and leaves the flag out.
- [ ] **#31** Reconcile the address-collision advisory with the resolver throw `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-22)*
  The edit page's advisory says "Publish this one and it replaces the other at that address" (`src/lib/sveltekit/content-routes-entry-read.ts:412`), the 2026-06-23 advisory design's last-write-wins. `createSiteResolver` instead throws on the duplicate permalink (`src/lib/delivery/site-resolver.ts:86`), so the next build fails. The content-model page states both as the code has them.
- [ ] **#22** Correct the wrong claims outside the seven acceptance pages `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-20)*
  `docs/reference/log-events.md:74` and `:83` (the `admin.action.misconfigured` reason fires only when a site hook sets `cairnEditor` without `cairnAccess`), `docs/extend/upgrade-cairn.md:101`, `docs/reference/sveltekit.md:2100`, and the doc comments at `src/lib/admin-action.ts:155-157` and `guard.ts:377`.
- [ ] **#24** Update the engine's owner-editor fallback wording `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-20)*
  `src/lib/conditions.ts:181` and the Go tool's `check_roles.go:29` describe the older owner-and-editor fallback; a guard with no runtime now throws (`guard.ts:181-183`). Also `install.ts:303`.
- [ ] **#10** Give the rotate page's third-key step a failure row for the App's key limit `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  Generate a third key can meet the limit on private keys an App may hold, and the page has no row for it. Read GitHub's page on managing private keys for the limit and the fix, then add the row beside Generate a third key.
- [ ] **#1** Say in the rotate page that a rollback restores signing only as the token cache expires `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  `docs/extend/rotate-the-github-app-key.md` (Roll back to the old key) says re-pushing the old key's base64 "restores signing with it immediately". `src/lib/github/signing.ts#createInstallationTokenCache` caches the installation token per isolate for 55 minutes, which the same page states under Verify the new key, so a warm isolate keeps signing with the new key's token until its entry expires and the restore holds only for tokens minted from then on. State the bound in the section and in its opening sentence.
- [ ] **#77** Derive the checks' arm lists from `ARM_DIRS`, and say an arm's first page needs its index `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25)*
  Registering an arm takes hand edits across the scripts: `scripts/checks/arm-state.mjs` exports `ARM_NAMES` and `ARM_DIRS`, but `check-admin-prose.mjs`, `check-arm-indexes.mjs`, `check-snippets.mjs`, `check-symbols.mjs`, `check-visuals.mjs`, and others keep separate arm lists, and a missed list fails silently. Derive each from `ARM_DIRS`. Separately, an arm cannot take its first page without its index (`check:arm-indexes`, `check:package`), and ROADMAP's arm-stage text does not say so. Found by the Claude Code page run, 2026-10-25.
- [ ] **#78** Document these options on their reference pages `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25)*
  The options check now keys each option to a reference heading that names it in inline code, and these 27 rows are `pending` in `docs/internal/option-map.json` because no reference section does (`pendingCount` is 27). Each needs a section naming it in inline code, then its row re-keyed to the anchor. On `core`: `CairnAdapter.rendering.components`, `CairnAdapter.rendering.icons`, `ComponentDef.defaultIconByRole`, `ComponentDef.insertTemplate`, `ComponentDef.preview.slots`, `ComponentDef.slots`, `ConceptConfig.dir`, `ConceptConfig.summaryFields`, `FieldBase.default`, `NavLayoutSection.children`, `RendererConfig.anchorRel`, `RendererConfig.unsafeDisableSanitize`, `SlotDef.itemFields`, `SlotDef.required`, `defineRegistry.arg0.components`, and the `TidyConventions` members `brandCaps`, `ellipsis`, `emDash`, `enDashRanges`, `fixes`, `measurements`, `numberStyle`, `oxfordComma`, `percent`, `smartQuotes`, `timeFormat`. On `delivery`: `PublicRoutesConfig.feeds.rss`. Several are already documented on `docs/extend/write-a-markdown-component.md` or `docs/extend/turn-on-tidy.md` and only need the reference mention.
- [ ] **#79** Correct the security model's access-map sentence `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-25)*
  `docs/extend/security-model.md`, "Access map coverage", says "The sidebar reads the adapter's map and `requireAccess` reads the guard's, so a map given to only one of them gates only that one." There is one map, the adapter's `access` member carried onto the runtime (`src/lib/content/compose.ts:51`); the guard reads `runtime.access` (`src/lib/sveltekit/guard.ts:184`), attaches it to `locals.cairnAccess` (`:358`), and `requireAccess` reads that (`:493`). No guard-only map exists.
- [ ] **#80** Correct the upgrade page's `worker-configuration.d.ts` line claim `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-25)*
  `docs/extend/upgrade-cairn.md`, "When your range crosses SvelteKit 3", calls `--include-runtime=false` "the command a scaffolded site's `worker-configuration.d.ts` records on its first line". `templates/waymark/worker-configuration.d.ts:1` is `/* eslint-disable */`; the `wrangler types` command is on line 2. The scaffold's `cf-typegen` script (`templates/waymark/package.json:26`) is the better pointer.
- [ ] **#81** Close the reference-page gaps the retired page plans recorded `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25)*
  Each verified against the code on 2026-10-25. `docs/reference/site-facts.md`, "Who writes it and who verifies it": names two verification outcomes (absent, drifted) but `checkSiteFacts` has a third, `skipped` with a warning, when the adapter cannot derive the facts (`src/lib/vite/internal.ts:596-608,636`). `docs/reference/sveltekit.md`, `createAuthGuard`: `devBackendHandle` takes the same required `runtime` and attaches the same map (`packages/cairn-cms-dev/src/handle.ts:80,192`), and no reference page documents `devBackendHandle`. `loadHealth`: the three signing-failure details are not named (`src/lib/sveltekit/health.ts:205`, `src/lib/github/signing.ts:219,221`). `no_pending_request_error`: the entry says the code is returned when the token is bound to another browser's nonce, but any failed consume from a browser with no pending cookie redirects with it (`src/lib/sveltekit/auth-routes.ts:360-364`). `docs/reference/auth-store.md`, `deleteEditor`: the preview-token delete runs outside the atomic batch and swallows only "no such table" (`src/lib/auth/store.ts:341-345`). `docs/reference/auth-crypto.md`: a cookie-less confirm passes a null nonce hash, so only an unbound row matches (`src/lib/sveltekit/auth-routes.ts:350`, `src/lib/auth/store.ts:208`). `docs/reference/guidance.md`, `install`: states exit codes only for `check`, but `install` exits 0 on a refusal or write error (`src/lib/guidance/bin.ts:84-104`). `docs/reference/cli-cairn-doctor.md`: no list of the conditions no doctor check raises (`tool/internal/spine/condition.go:20-43`). `docs/reference/admin-toolkit.md`: never says that no toolkit component reads an editor session.
- [ ] **#82** Say where engine records appear under the development server `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25)*
  `docs/extend/debug-your-site.md`, "Find the records", lists only deployed surfaces (Workers Logs, `wrangler tail`, `cairn logs`, `cairn health`), while the introduction names the development server as a reason to arrive. The default sink writes each record with `console.log`, `console.warn`, or `console.error` (`src/lib/log/create.ts:122-124`), so under `vite dev` or `wrangler dev` the records appear in the terminal that runs it.

## Low
- [ ] **#6** Add the rotate page's missing recovery notes `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  Recover from a failed key reads `/healthz` details and one `github.unreachable` shell record but names no `health.failed` record, which `loadHealth` logs when its checks throw (`docs/reference/log-events.md:44`). The Verify step runs `curl`, which Windows PowerShell 5.1 aliases to `Invoke-WebRequest`; add the Windows form beside the Linux and macOS one, verifying the PowerShell behavior first.

## Done
- [x] **#76** Re-point drifted fact anchors and retire "Deploy-button tree" from the facts `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25 → 2026-10-25)*
  The full `drafter check` on `redraft-prep` (`fae1aca1b`) flags about 17 pointers in `docs/internal/facts/extend.md` whose anchor no longer sits in the cited lines (near lines 74, 105, 126, 282, 283, 311, 585, 586, 693, 731, 738, 908, 1089, 1257), plus 13 errors unchanged from `main`, and debug-your-site's facts carry 27 more anchorless or drifted pointers. Separately, f:jtl15v (admin.md) and f:pe4vuc, f:rxj43c, f:n7t4bn, f:qlgggh, f:n0fg3w (extend.md) still say "Deploy-button tree" or "overlay"; give each the wording f:nls26c now uses (the `templates/waymark/` copy, pre-release).
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#72** Run the unnamed `drafter check` in CI once it reaches zero errors `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25 → 2026-10-25)*
  CI runs `drafter check` on no blueprint set, so errors outside a pass's pages build up unseen: 27 on `main` at batch 5 (2026-10-25), from the pilot blueprints #30 covers plus stale anchors and fact pointers in `facts/admin.md`, `facts/extend.md`, and `facts/reference.md`. Clear them, then add the unnamed run to `check:docs-gate` or the docs CI job so a new error fails the PR that adds it.
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#71** Redraft the published extend pages that disagree with their blueprints `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-25 → 2026-10-25)*
  The runtime-bag sweep (batch 5) fixed the pages' hooks calls and the removed signups demo, and found these left over. `restrict-admin-access.md` has the reader create `src/access.ts`, which its blueprint never does, and `add-a-second-sign-in-group.md:96` points at it. `add-a-custom-admin-screen.md:14` says the setup command writes a signups screen at `src/routes/admin/signups/`, which `.cairn-template.json` excludes. `add-cairn-to-a-sveltekit-app.md` shows a hand-written `devBuildDefine` plugin and an `app.d.ts` declaration its blueprint forbids (`f:xluud1`, `f:n52h8f`). `scaffolded-site-files.md` lists `.dev.vars.example` and `LICENSE` in its tree, which `f:qlgggh` puts only in the Deploy-button tree, and Restrict admin access (231, 235, 343-346) says the site's auth database still limits the roster to owner and editor and has the reader copy `0001_roles.sql`, but the scaffold ships and applies that migration (`f:rn62i1`, `f:gepykz`), so only a site scaffolded before it shipped needs the copy step. `restrict-admin-access.md:333` and its blueprint's `x-role-unknown` symptom say an unknown role is refused on every screen, but `/admin` shows the welcome view (`content-routes-shell.ts:309-323`).
  Lock drift: add-a-custom-admin-screen, add-an-island, architecture, content-model, replace-magic-links-with-cloudflare-access, rotate-the-github-app-key, and security-model name an older blueprint blob than the current one, and the sweep's hand edits to add-a-second-sign-in-group, scaffolded-site-files, debug-your-site, and add-cairn-to-a-sveltekit-app may add to them. Some are hand edits carried to both files, so read each diff before redrafting with `drafter page <blueprint>`. `add-a-custom-admin-screen.blueprint.md` also fails `drafter check` with 9 format errors.
  Done: the runtime-bag sweep and the redraft-prep pass fixed each page the item listed, and the blueprints the redraft followed are retired.

- [x] **#66** Anchor the remaining anchorless fact pointers `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25 → 2026-10-25)*
  A named `drafter check` now fails on a line pointer with no anchor, and names a suggested one (glw907/drafter#67). The unnamed check on `origin/main` at `75b6138` printed 1,836 `anchorless` warnings. Once they are anchored, drafter #110 makes the unnamed run fail on them too. Some suggestions are weak (`The`, `const`, `import`); drafter #111 tracks that, so review each suggestion before pasting it.
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#65** Run the full docs gate on a batch's integration branch before its pages are queued `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25 → 2026-10-25)*
  Batch 4 queued three pages on #140 with `check:provenance` red (7 defects), and CI caught it only after Geoff approved them, so the fix (`92b2cfce2`) landed after approval. Two causes: hand edits to `scaffolded-site-files.md` and `share-a-draft-preview.md` left their briefs quoting old anchors, and the batch 3 rewrite of `f:0elmiu` dropped the `/sitemap.xml` that `build-the-public-routes.json` cites, where `drafter refs f:0elmiu` would have named the brief. Make a green `npm run check:docs-gate` on the merged branch a precondition of `approval-queue page`, a rule for `cairn-pass` or the batch prompt beside #60.
  Record: `~/Projects/initiatives/docs-system/research/2026-10-24-extend-blueprints-batch-4/RESUME.md`
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#61** Record a run for a behavioral fact with a case split `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24 → 2026-10-25)*
  `f:w3m0ac` (delete-and-recreate inside one diff window) was `[verified]` and wrong: reading the pointer showed the general case, and only running the function showed the split. A behavioral fact with a case split wants a recorded run, not a read.
  Record: ~/Projects/initiatives/docs-system/research/2026-10-24-extend-blueprints-batch-4-friction.md (cairn-cms 8)
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#60** Merge each batch's approved blueprints before the next batch cuts `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24 → 2026-10-25)*
  Batch 3's six approved blueprints sat unmerged, so batch 4 built an integration branch (`ebp4-base`) and settled shared-fact conflicts both sides had corrected (`f:68w9k9`, `f:g39nkp`, `f:sz71ur`, `f:n07oiu`), each with one drifted range. Make the merge a precondition of cutting the next batch; a rule for `cairn-pass` or the batch prompt.
  Record: ~/Projects/initiatives/docs-system/research/2026-10-24-extend-blueprints-batch-4-friction.md (cairn-cms 6)
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#54** Split fact f:q07rd5, and drop plan constraints the code now settles `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24 → 2026-10-25)*
  `f:q07rd5` bundles a code-sourced scaffold path with tutorial paths sourced only from a docs page and an unrelated hooks note, so ruling D1 blocks a blueprint that cites it for the scaffold alone. Split it into one fact per source. Some page plans still state as constraints things the code now settles (the build error's count prefix, `parseMarkdown` and TOML); see B3-24. Record B3-30 in `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`.
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#53** Mark a page plan and framing record superseded when its page is narrowed or trimmed `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24 → 2026-10-25)*
  After the premise trim, configure-media's plan and framing record (2026-10-12) and the narrowed page's 782-line plan and 254-line framing record were mostly out of scope, and reading them cost more than they returned. Record B3-8, B3-24.
  Batch 4: every author read a 488 to 836-line plan, or a 53 KB one that predated the trims. Repeat of B3-8, B3-24. Record: ~/Projects/initiatives/docs-system/research/2026-10-24-extend-blueprints-batch-4-friction.md (cairn-cms 5)
  Batch 4 drafting: the register editor's act-on review asked for a failure-path section and a heading rename, both from the stale page plan (`briefs/extend/<slug>.plan.md`), which the approved blueprint overrides. Record: ~/Projects/initiatives/docs-system/research/2026-10-24-extend-blueprints-batch-4/friction.md (P8)
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#51** Fail `check:facts` on an `external` fact with no URL `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24 → 2026-10-25)*
  An `external` fact with no URL (`f:34wt4f`) passes `check:facts` silently. `scripts/checks/check-facts.mjs`. Record B3-7.
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#40** Add a `ContentRoutesConfig` heading to `docs/reference/sveltekit.md` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24 → 2026-10-25)*
  The page has no such heading, so the plan's link target can't exist; the sidebar blueprint links `createCairnAdmin` instead (record 49).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`
  Done: sveltekit.md carries a ContentRoutesConfig anchor, and the link check resolves it.

- [x] **#38** Make `check:facts` and `drafter check --fact` agree on a `path#Symbol` source outside `src/` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24 → 2026-10-25)*
  `check:facts` refuses it while `drafter check --fact` accepts it (`packages/create-cairn-site/...#applyMigrations`) (record 46).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`
  Seen again in batch 3: a code span inside a `[verified: ...]` note passed `drafter check --fact` but failed `check:facts` as an unresolved path (drafter #71). Record B3-13.
  drafter's rule since glw907/drafter#60: a tag note's code spans are commentary, never pointers; `check:facts` should match it.
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#37** Correct the facts still marked `[verified]` that the code or their source contradicts, and split bundled bullets `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24 → 2026-10-25)*
  `f:0elmiu` (sign-in page indexed, but `LoginPage` sets `noindex`), `f:niuzzg`, `f:s4prb0` (a README source), and `f:q07rd5` (a docs source) are stale or prose-sourced. `f:q07rd5` also joins a code clause with docs-only clauses, so D1 blocks citing the code part alone (record 44, 45).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`
  Seen again in batch 3: duplicate facts state one claim (`f:pdgkex`, `f:4mz4tp`, `f:yef4lo`; `f:fe46lo`, `f:97c6g1`), and `f:q07rd5` is `[verified]` from a docs page against ruling D1. Merge the duplicates. Record B3-16.
  Batch 4: more of the same in the facts store: `f:lv29ox` duplicates `f:mcxxpp` (the showcase and template layouts are byte-identical); `f:ctognq`, `f:i9pgd2`, and `f:9zxml1` name the showcase where the scaffold was meant; `f:59u3b9` reads a code comment as an engine claim; `f:7sc3pe` in reference.md carries the drifted `EditPage.svelte:2243`; and act-on's facts sit in two homes (`## announce-on-publish.md` and `### act-on-newly-published-entries`). Repeat of B3-16. Record: ~/Projects/initiatives/docs-system/research/2026-10-24-extend-blueprints-batch-4-friction.md (cairn-cms 7)
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#36** Flag a plan or framing record when a fact it cites is corrected `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24 → 2026-10-25)*
  Plans inherit wrong facts and nothing flags them: `f:ld6xam` reached the sidebar plan, the content model's carried about a dozen code-contradicted claims, and build-the-public-routes' plan predates D1. All four batch 2 authors hit it (record 43).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`
  Seen again in batch 3: the plan inputs carried the wrong vocabulary storage path (`editor.nav.configPath`) into the outline. Record B3-16.
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#35** Add `blueprints/**` to Vale's scope once Survey #1's check exists `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24 → 2026-10-25)*
  `check:vale` covers `docs`, `README.md`, and the showcase README only, so the empty "own" reached Geoff on two blueprints unflagged. `package.json:52` (record 41).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#30** Move the three pilot blueprints to the markdown forms and drop `track: extend` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-22 → 2026-10-25)*
  glw907/drafter#58 gives markdown blueprints `Code:` bullets with a `/`-rooted `:source[...]` and a fence, `Figure:` bullets, and a `:::constraints` block, and makes a named `track` an error when the outline declares none, as cairn's does. `drafter check` now flags the bare fences and `track: extend` in `blueprints/docs/extend/add-a-custom-admin-screen.blueprint.md`, `architecture.blueprint.md`, and `replace-magic-links-with-cloudflare-access.blueprint.md`.
  Batch 2: an unnamed `drafter check` on main has 15 errors, all from the three pilot blueprints, and PR #134's troubleshooting blueprint adds another (`track: "admin"`, an error since drafter #58). Name both (record 40).
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#29** Let an explicit code `Source:` override the owner-brief heading in check:facts `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-22 → 2026-10-25)*
  A bullet re-pointed from the charter to code still failed the owner tier until it moved sections (`f:gknz29`). `scripts/checks/check-facts.mjs` (record 29).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-pilot-friction.md`
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#28** Rename the Access page's facts section to its current page name `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-22 → 2026-10-25)*
  `docs/internal/facts/extend.md` still files them under `## docs/extend/sign-in-through-your-organization.md` (record 24).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-pilot-friction.md`
  Batch 2: the sidebar page's facts still sit under `## organize-your-admin-nav.md` and an `### arrange-the-admin-sidebar` subsection too (record 42).
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#27** Tighten the provenance fixes' coverage `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-20 → 2026-10-25)*
  Copy B3c's scaffolded-site-files sentences 152 and 225 into a fixture; the link-text blanking now hides a claim sentence's only linked name from provenance; "npm version" and "the npm docs" still read as commands. `scripts/checks/check-provenance.mjs:152-159`, `:257-266`
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#26** Give `blueprints/` its own docs-gate bucket `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-20 → 2026-10-25)*
  A blueprint edit today selects every static check and the component suite (factsheet-cairn section 10).
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#25** Make the remaining non-excerptable fact pointers resolve `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-20 → 2026-10-25)*
  After the acceptance pass's re-anchor, 19 pointers name a directory, 18 name a path inside a dependency, and 35 are prose, so drafter can't excerpt them for the fact seat. Dotted anchors outside the seven pages remain too.
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#23** Bring dispositions and links in line with the corrected facts `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-20 → 2026-10-25)*
  security-model's blueprint disposition at `:1522-1525` still says `admin.action.misconfigured` "fires only outside every hook's coverage" (corrected f:u78zg6 says otherwise); f:q07rd5's hooks clause goes stale once add-cairn redrafts; rotate-the-github-app-key links `scaffolded-site-files.md#devvarsexample` at `:250`, `:846`, `:1361`, and its `:1363` disposition says the scaffold ships `.dev.vars.example`.
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#21** Resolve the two fact conflicts that escalated pages at the blueprint read `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-20 → 2026-10-25)*
  restrict-admin-access escalated at read 2 on f:zo034s against f:p1xmp5 and f:0qb73i, and scaffolded-site-files at read 3 on f:rn62i1 (migration 0003 opt-in) against f:gepykz (0003 shipped). No pass edit made either conflict. `docs/internal/facts/`
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#19** Settle the outline's add-cairn branding entry and the `createAdminAction` 403 variant `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-25)*
  The B3c fix rounds left the add-cairn outline entry's branding line stale and did not place `createAdminAction`'s 403 refusal on debug-your-site. `blueprints/outline.yaml`
  Done: debug-your-site covers the createAdminAction 403 refusal, and the outline entry the item named is retired.

- [x] **#18** Have the two drafts B3c lost to review findings carry their code items and links `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-25)*
  using-claude-code-with-cairn's redrafts drop the `c-script` and `c-ci-workflow` snippet blocks; restrict-admin-access's drops the link to security-model's limits section. Both blueprints are accepted; the next run starts from them.
  Done: restrict-admin-access links Limits of access map coverage in the security model, and the using-claude-code page the item named no longer exists.

- [x] **#17** Finish the rotate page's rollback re-push handler `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-25)*
  Rotate's read blocked three times on `rb-repush`, last on the `GITHUB_APP_PRIVATE_KEY_B64 is not configured` detail sent to a third key though it does not mean the file is the wrong key. Rotate is escalated with its bar committed. `blueprints/docs/extend/rotate-the-github-app-key.blueprint.yaml`
  Done: Recover from a failed key step 1 sends the not-configured detail to a second push, and step 3 sends a refused JWT to the rollback or a third key.

- [x] **#13** Give the key-rotation failures `x-third-verify`, `x-check-threw`, and `x-logs-empty` a handler the reader can act on `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-25)*
  Each names a fact or a verbatim lead-in as its handler, which leaves the reader no next action. The fix points them at a step, a logs step, and a link to the setup section. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
  Done: the page sends each failure to a step: Verify the new key step 6 (empty logs), Recover step 3, and Generate a third key step 3.

- [x] **#12** Point `s-rec-checks` at a step a reader with no key can take `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-25)*
  It points at the rows of its own section and requires a state a reader with no key lacks. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
  Done: Recover from a failed key opens with what a rollback needs and sends a reader without the old key to Generate a third key.

- [x] **#11** Add the 55-minute token bound to the rollback route `rb-fact` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-25)*
  The rollback route leaves out the installation-token cache bound. Related to #1. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
  Dropped: duplicate of #1, which carries the 55-minute bound.

- [x] **#9** Merge `x-fingerprint` and `x-wrong-key` into one failure row with a route to push `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-25)*
  They are one failure written as two rows. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
  Done: the page has one row for an unusable key (Recover from a failed key, step 2).

- [x] **#8** Keep `x-editor` free-standing after a `from` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-25)*
  A `from` on it made the whole read object. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#7** Stop the `use` fields of five rotate-blueprint items restating their facts `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-25)*
  `ver-live-result`, `rec-editor-timing`, `del-no-restore`, `third-fact`, and `rec-logs-observability`. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#5** Decide where the rotate page reads the logs `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-25)*
  The outline's `covers` line puts the logs under verifying signing, while the blueprint reads them under recovery. A call for whoever owns the outline entry. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
  Done: the rotate page reads the logs in Verify the new key (step 6) and in Recover from a failed key (step 3).

- [x] **#4** Fix the stale line range on fact `f:6hmgmv` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-18 → 2026-10-25)*
  `docs/internal/facts/extend.md:780` cites `templates/waymark/.../+page.svelte:1-15`, but the file has 13 lines. Neither `check:facts` nor `drafter check` catches it, since both skip route paths. Found by drafter F1's cairn comparison (glw907/drafter#50); land it with F2's cairn change.
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#3** Read the unreachable fact pair `f:72yc97` and `f:olofdb` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-18 → 2026-10-25)*
  The drafter format test (glw907/drafter#49) could not reach this pair and never read it. A run's "Unplaced:" warning reasoned about it.
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#2** Confirm three fact pairs are scope differences, not conflicts `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-18 → 2026-10-25)*
  The drafter format test (glw907/drafter#49) found no defect in `f:ejuoh6` against `f:vg42j3` (the live check skips the publishing path's cache), `f:86h9o6` against `f:vg42j3` (deploy time against cache lifetime), or `f:ejuoh6` against `f:1pb077` (the 60-second per-isolate verdict is a separate cache from the 55-minute token cache). A sentence in each scoping its cache would stop the read pairing them.
  Dropped: the docs-as-code cutover retired the system it served.

- [x] **#68** Set `facts.id_command` in `drafter.toml` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25 → 2026-10-25)*
  drafter now has the setting (glw907/drafter#67), and the blueprint skill tells an author to mint each new fact id with it. Set `facts.id_command = "node scripts/checks/check-facts.mjs --mint"`.
  Done: set as specified.

- [x] **#67** Set `facts.prose_sources` to globs for the template READMEs in `drafter.toml` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-25 → 2026-10-25)*
  drafter now reads each entry as a `path.Match` pattern, where `*` stays inside one directory and there is no `**` (glw907/drafter#67). Replace the two exact paths with globs such as `templates/*/README.md` and `templates/*/src/*/README.md`, so a new template's README excerpts with no config change.
  Done: `templates/*/README.md` and `templates/*/src/*/README.md`.

- [x] **#56** Set `check.sentence_words = 26` in `drafter.toml`, and list `docs/reference/sveltekit.md` and `choose-an-ai-posture` in the outline as `managed: false` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24 → 2026-10-25)*
  drafter now has the sentence-length warning (off by default), and a crossLink to an unlisted page misfires where a `managed: false` entry would resolve (glw907/drafter#60).
  Batch 4: two authors hand-scripted the register's 26-word rule again because the setting is still off. Record: ~/Projects/initiatives/docs-system/research/2026-10-24-extend-blueprints-batch-4-friction.md (cairn-cms 4)
  Batch 4 friction (glw907/drafter#67): drafter's new unlisted-link error fires on a link to a `docs/extend` page the outline doesn't list, in `drafter check`, `drafter gate`, and `drafter page` stage 1. List `docs/extend/upgrade-cairn.md` (linked by seven blueprints) and `docs/extend/share-a-draft-preview.md` (linked by none today) as `managed: false` beside `choose-an-ai-posture` (linked by three). drafter's install waits until the outline lists `upgrade-cairn.md` and `choose-an-ai-posture.md`, since nine blueprints otherwise stop at stage 1.
  Done: `check.sentence_words = 26`, and `upgrade-cairn`, `choose-an-ai-posture`, and `share-a-draft-preview` listed as `managed: false`. `docs/reference/sveltekit.md` stays unlisted: one listed reference page makes drafter treat all of `docs/reference/` as outline-covered, so every link into the reference arm became an unlisted-link error.

- [x] **#34** Sweep the empty "own" from the Go tool, the scaffolder, the baked agent files, and developer-facing messages `#improvement` `#cairn-cms` `#initiative:cairn-docs-standard` *(2026-10-22 → 2026-10-24)*
  Follow-up to PR #137, on Geoff's packet answer: sweep everything except the admin's editor copy. Covers `tool/` (about 1,200 uses), `packages/` (about 900), the sources of the template's generated agent files (repo-root `claude/`, `skills/`, `packages/create-cairn-site/template-repo`, then `npm run emit:template`), and about 75 runtime strings (audit findings, CLI diagnostics, the tidy prompt, e2e test names, showcase content), updating the tests a message change touches. Leave editor-facing admin copy ("Your own custom rules") as it reads. Run the dangling-idiom scan after any scripted removal: PR #137 needed 14 repairs ("a second live region of its.").
  Batch 2: about 240 hits remain in `templates/waymark/.claude/**`, `README.md`, and `CLAUDE.md`, which `emit:template` bakes from repo-root `claude/`, `skills/`, and `packages/create-cairn-site/template-repo`; sweep the sources, then emit (record 54).

- [x] **#16** Re-anchor facts that cite `section-action.ts#createSectionAction.wrap` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-20)*
  f:i1dayf, f:nup3og, and f:gy2h7p cite an anchor whose excerpt reads "declaration not found", so the fact seat blocks debug-your-site on them. B3c could not edit facts. `docs/internal/facts/extend.md`
