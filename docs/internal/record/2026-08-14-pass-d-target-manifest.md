# Pass D target manifest (2026-08-14)

The rebuild's planning document: what gets built, from what inputs, and what the cutover must
touch. Consumed page by page by Phase 2's writing dispatches and, for its deletion list and gate
bill, by Phase 3's cutover.

**Governance.** The rebuild ruling (Geoff, 2026-08-14) governs every section below. The old
`docs/guides/`, `docs/tutorial/`, and `docs/explanation/` arms die at cutover, unrepaired and
unmined. The new pages are written clean-room from the code, the recorded runs, and the specs.
The old corpus appears in exactly two places in this document: [§2 the deletion
list](#2-the-deletion-list-and-redirect-map) and its redirect map. No page's input list below
names an old guide, tutorial, or explanation page (ruling 7). `docs/reference/` is the one kept
exception: it is machine-gated and current, edited rather than rewritten, so its table in §1
records edits, not clean-room inputs.

**Inputs read for this manifest**: the track outlines
([`2026-08-14-docs-track-outlines.md`](./2026-08-14-docs-track-outlines.md)), the audience
profiles ([`2026-08-14-audience-profiles.md`](./2026-08-14-audience-profiles.md)), the
competitor review
([`2026-08-14-cms-docs-competitor-review.md`](./2026-08-14-cms-docs-competitor-review.md)), the
umbrella spec's Part 2 and acceptance criteria
([`2026-08-09-admin-setup-and-docs-reset-design.md`](../../superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md)),
the plan's own Task 2 acceptance
([`2026-08-14-pass-d-docs-reset.md`](../../superpowers/plans/2026-08-14-pass-d-docs-reset.md)), the
baseline walk ([`2026-08-unagented-setup-baseline.md`](./2026-08-unagented-setup-baseline.md)),
and the source tree, which is ground truth for every claim below.

---

## 1. The target page set

74 files across the four tracks, the reference arm, and the front doors: 68 content pages (the
outline's own count, re-derived and confirmed below) plus 6 index pages (`docs/README.md`,
`docs/admin/README.md`, `docs/editors/README.md`, `docs/extend/README.md`,
`docs/reference/README.md`) not double-counted into the 68. By track: front doors 3, admin 8
(7 content + index), editors 8 (7 content + index), extend 31 (1 tutorial + 23 guides + 6
concepts + index), reference 24 (23 content + index).

An input-list entry is a real repo path, verified against the tree while writing this manifest.
No entry below names `docs/guides/`, `docs/tutorial/`, or `docs/explanation/`.

### Front doors

| Path | Contract | Inputs |
| --- | --- | --- |
| `docs/README.md` | Route four audiences by name, first screenful; the front door for everyone who is not an editor. | `docs/internal/2026-08-14-docs-track-outlines.md` ("Front door" section); `docs/internal/2026-08-14-cms-docs-competitor-review.md` rule 1 (route audiences by name); `README.md` (root, for the copyable `create-cairn-site` command's real invocation); `packages/create-cairn-site/src/args.mjs` (the real flags). |
| `README.md` (root) | The npm/GitHub front door: what cairn is, the copyable command, links to `docs/README.md` and `docs/why-cairn.md`. | `package.json` (name, description); `packages/create-cairn-site/package.json` (the `create-cairn-site` bin name); `docs/internal/2026-08-14-docs-track-outlines.md` ("Root-README kills" list). |
| `docs/why-cairn.md` | The evaluator's page: why cairn, the honest trade-offs, links the admin fact sheet for costs rather than restating them. | `docs/internal/2026-08-14-cms-docs-competitor-review.md` (the two openings section, the rules); `docs/internal/what-cairn-is-and-is-not.md` (the scope boundary, an internal standard, not an old published page); `docs/internal/2026-08-14-audience-profiles.md` (the admin profile's cost facts to link, not restate). |

### The admin track (`docs/admin/`) — 7 pages + index

Persona: the admin profile. Every transcript quoted must trace to a recorded run (competitor
review rule 3; plan global constraint).

| Path | Contract | Inputs |
| --- | --- | --- |
| `README.md` | Five-line routing and the journey map. | `docs/internal/2026-08-14-docs-track-outlines.md` (admin track list, the page order below). |
| `before-you-start.md` | "What am I getting into, what does it cost, and what stays mine?" | `packages/create-cairn-site/src/cloudflare/catalogue.mjs` (the error catalogue's wait/act/ask-someone classification); `packages/create-cairn-site/src/cloudflare/prefill.mjs` (the prefilled-token link, the confirm-every-row warning); `docs/internal/2026-08-unagented-setup-baseline.md` (drag points on money surprises arriving late); `docs/superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md` (Part 1, Acceptance criteria: "no secret is ever written under the project directory"); `docs/internal/2026-08-14-audience-profiles.md` (the admin profile's three admission prices and free-until boundary). |
| `create-your-site.md` | "From nothing to signed in, and how to sign in again." | `packages/create-cairn-site/src/args.mjs` (real flags: `--dry-run`, `--yes`, `--name`, `--github`, `--deploy`, `--sign-in`, `--domain`, `--email`, `--connect`, etc.); `packages/create-cairn-site/src/cloudflare/bootstrap.mjs` (the ten-minute bootstrap TTL, verbatim message text); `packages/create-cairn-site/src/github/chapter.mjs` and `packages/create-cairn-site/src/github/install.mjs` (App creation and installation); `docs/internal/2026-08-13-t5-task8-live-e2e.md` (the live chapter 1-3 transcript); `docs/internal/2026-08-13-t5-button-spike.md` (the button-door spike; CLI-first until the spike lands its own transcript). |
| `own-your-domain.md` | "Move the site onto a domain you own." | `packages/create-cairn-site/src/cloudflare/dns.mjs`, `zone.mjs`, `hostname.mjs`, `records.mjs` (chapter 2, the domain half); `packages/create-cairn-site/src/cloudflare/email.mjs` (the sending domain); `packages/create-cairn-site/src/cloudflare/chapter2.mjs`, `chapter3.mjs` (the two chapters' token scopes); `docs/internal/2026-08-11-t4a-domain-spike.md`; `docs/internal/2026-08-11-t4b-email-spike.md`; `docs/internal/2026-08-12-t4c-builds-spike.md` (Builds connect, chapter 3). |
| `is-it-working.md` | "A check failed; here is exactly what it means and what fixes it." | `src/lib/diagnostics/conditions.ts` (the 21-condition registry, every condition carrying a `docsAnchor` since Task 9, over 17 distinct slugs, enumerated in [§4](#4-the-live-ui-stance-the-carried-facts-and-the-fixes)); `scripts/checks/check-readiness.mjs` (the three-way contract); `src/lib/doctor/` (the CLI probe); `docs/reference/doctor.md` (the CLI reference, already gated, itself carrying a stale `svelte.config.js` claim that needs Task 8's fix, [§4](#4-the-live-ui-stance-the-carried-facts-and-the-fixes)); `src/lib/doctor/checks-local.ts` (the `config.csrf-disable` check's silent-skip defect on a scaffold with no `svelte.config.js`, [§4](#4-the-live-ui-stance-the-carried-facts-and-the-fixes) — its condition entry must not claim a coverage the check does not deliver on a current scaffold). |
| `setup-recovery.md` | "A setup step failed or was interrupted; get back on the path." | `packages/create-cairn-site/src/state.mjs` (persisted state, the site record); `packages/create-cairn-site/src/cloudflare/catalogue.mjs` (the error catalogue, wait/act/ask); `packages/create-cairn-site/src/args.mjs` (`--start-over`, `--sign-in`); `packages/create-cairn-site/src/cloudflare/bootstrap.mjs` (the `--sign-in` re-entry path). |
| `invite-editors.md` | "Get your writers in." | `src/lib/components/ManageEditors.svelte`; `src/lib/sveltekit/editors-routes.ts`; `docs/reference/auth-store.md` (already gated); `docs/internal/2026-08-14-audience-profiles.md` (the free-until-second-writer boundary, restated here). |
| `troubleshooting.md` | "The site does the wrong thing; find the fix or find out who can." | `src/lib/log/` (the vocabulary); `docs/reference/log-events.md` (already gated); `src/lib/diagnostics/conditions.ts` (`logEvent` correlations); `docs/internal/2026-08-13-t4d-task7-live-proof.md` (the localhost console's live proof, for the console-adjacent rows). |

### The editors track (`docs/editors/`) — 7 pages + index

Persona: the editor profile. Register: Microsoft. No outbound links to any other track. The
seventeen `LIVE-UI` markers are inventoried in [§4](#4-the-live-ui-stance-the-carried-facts-and-the-fixes).

| Path | Contract | Inputs |
| --- | --- | --- |
| `README.md` | The ordered list of the seven pages; the `/help` sidebar order. | `docs/internal/2026-08-14-docs-track-outlines.md` (the editors track order). |
| `welcome.md` | "What this editor is and how to get in." | `src/lib/components/LoginPage.svelte`; `src/lib/components/WelcomeView.svelte`; `packages/create-cairn-site/src/cloudflare/bootstrap.mjs` (the message an editor's own sign-in link carries is a separate, longer-lived flow; verify against `src/lib/auth/crypto.ts`'s `TOKEN_TTL_MS` before stating any editor-facing TTL). |
| `write-in-the-editor.md` | "Everything about writing and formatting a draft." | `src/lib/components/EditPage.svelte`; `src/lib/components/MarkdownEditor.svelte`; `src/lib/components/EditorToolbar.svelte`; `src/lib/components/LinkPicker.svelte` (the `cairn:` token); `src/lib/components/ComponentInsertDialog.svelte` (the `::include` subsection, first documentation anywhere); `src/lib/components/WebLinkDialog.svelte`; `src/lib/components/ShortcutsDialog.svelte`; `src/lib/components/MarkdownHelpDialog.svelte`; `src/lib/components/TidyReview.svelte`. |
| `publish-and-history.md` | "Move an entry between private and live, and get an old version back." | `src/lib/sveltekit/content-routes-core.ts` (`saveAction`, `publishAction`, `SaveHold`); `src/lib/components/CairnHistory.svelte`; `src/lib/components/ConfirmPage.svelte`; `src/lib/components/DeleteDialog.svelte`. |
| `when-something-goes-wrong.md` | "The editor refused you or something looks broken; what happened and what to do." | `src/lib/sveltekit/content-routes-core.ts` (`SaveFailure`, `CreateFailure`, `RenameFailure`, `DeleteRefusal`, `saveRefusal`; the conflict-prose fix, [§4](#4-the-live-ui-stance-the-carried-facts-and-the-fixes)); `src/lib/components/EditPage.svelte` (the `form?.body ?? data.body` reseed); `src/lib/components/VocabularyAdmin.svelte` (the tag-not-in-vocabulary refusal); `packages/create-cairn-site/src/cloudflare/bootstrap.mjs`'s message text is the create-your-site TTL, not the editor sign-in TTL: verify the editor magic-link message separately against `src/lib/auth/crypto.ts` and the auth email templates before quoting one. |
| `add-an-image.md` | "Put a picture in the draft I am writing." | `src/lib/components/MediaInsertPopover.svelte`; `src/lib/components/MediaFigureControl.svelte`; `src/lib/components/MediaHeroField.svelte`; `src/lib/components/MediaCaptureCard.svelte`. |
| `manage-the-media-library.md` | "Work on the site's images with no draft open." | `src/lib/components/CairnMediaLibrary.svelte`; `src/lib/components/MediaPicker.svelte`; `docs/reference/media.md` (already gated, the accepted-formats and HEIC facts). |
| `manage-your-tag-vocabulary.md` | "Keep the shared tag list the whole site picks from," plus who may change it. | `src/lib/components/VocabularyAdmin.svelte`; `src/lib/sveltekit/content-routes-core.ts` (`enforceTaxonomy`, `resolveAllowed`). |

### The extend track (`docs/extend/`) — tutorial + 23 guides + 6 concepts + index

Persona: the extender profile. Groups per the outline: the deep path; building blocks; admin
surfaces; design your site; extend the publishing flow; operate across versions; concepts.

| Path | Contract | Inputs |
| --- | --- | --- |
| `README.md` | Index; opens building blocks with the adapter precondition; hosts the vocabulary section; the operate group's stability statement. | `docs/internal/2026-08-14-docs-track-outlines.md` (the extend track list, groups); `docs/internal/2026-08-14-audience-profiles.md` (the extender vocabulary contract: concept, adapter, render, seam, island, holding branch, manifest, role). |
| `build-a-site-by-hand.md` | The deep path, at most roughly 668 lines, deploy pulled into the first third. | `examples/showcase/` (the whole worked tree, but not evidence of `sv create`'s own output; see the toolchain-drift finding below); `vite.config.ts` (a fresh `sv create` scaffold's actual adapter home: `npx sv@latest create --template minimal --types ts --no-add-ons`, sv 0.17.0, run 2026-08-14, emits no `svelte.config.js` at all, and wires the adapter inside the plugin call, `sveltekit({ compilerOptions: {...}, adapter: adapter() })`, importing `adapter` from `@sveltejs/adapter-auto`); `docs/internal/2026-08-unagented-setup-baseline.md` (drag point 11, reproduced live by two of five walkers); `src/lib/index.ts` (core exports); `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`. The page must state plainly that a current scaffold carries no `svelte.config.js` to edit, and give the `vite.config.ts` location for wiring `@sveltejs/adapter-cloudflare` and `csrf: { checkOrigin: false }` in its place. |
| `add-cairn-to-a-sveltekit-app.md` (new) | The existing-app task: the GitHub App, the three bindings, D1 provisioning, at task altitude. | `migrations/0000_auth.sql` through `migrations/0003_preview.sql`; `docs/reference/doctor.md`; `docs/reference/cloudflare.md`; `packages/create-cairn-site/src/github/install.mjs` (the App-install shape, narrated rather than tool-run here). |
| `what-the-scaffold-wrote.md` (new) | The generated-file map, one line per file, each linking its owning guide or reference page. | `packages/create-cairn-site/scripts/bake-template.mjs`; `packages/create-cairn-site/scripts/sync-template-repo.mjs`; `packages/create-cairn-site/src/scaffold.mjs` (the Action list, `SCAFFOLD_SENTINEL`); `packages/create-cairn-site/template-repo/` (the baked source tree). |
| `define-an-adapter-and-schema.md` | Declare content, GitHub target, render function. | `src/lib/content/` (concept and field types); `docs/reference/core.md` (already gated). |
| `declare-your-own-concept.md` | Declare your own concept and connect it with a reference field (retitled from "add authors"). | `src/lib/content/` (concept normalization); `docs/reference/core.md`. |
| `configure-rendering.md` | Build the render function every public page and the admin preview call. | `src/lib/render/`; `docs/reference/render.md` (already gated). |
| `wire-the-delivery-surface.md` | Build the catch-all route, feed, and sitemap; absorbs the AI-posture page's raw-markdown and content-negotiation halves. | `src/lib/delivery/responses.ts`, `robots.ts`; `examples/showcase/src/params/md.ts`, `examples/showcase/src/routes/(site)/[...path=md]/+server.ts` (the `.md` rest-route shape, [§4 carried fact 1](#4-the-live-ui-stance-the-carried-facts-and-the-fixes)); `docs/reference/delivery.md`, `docs/reference/delivery-data.md` (already gated). |
| `link-content-with-references.md` | The typed reference field; absorbs `reference-integrity`'s practical half. | `src/lib/components/ReferenceField.svelte`; `src/lib/content/` (reference-field validation); `docs/reference/core.md`. |
| `reuse-content-across-entries.md` | Declare Fragments; include one piece of markdown across entries. | `src/lib/components/FragmentPicker.svelte`; `src/lib/sveltekit/content-routes-core.ts` (`FRAGMENTS_CONCEPT_ID`, `extractIncludes`). |
| `add-an-island.md` | Hydrate one interactive Svelte component inside static rendered content. | `src/lib/islands/index.ts`, `src/lib/islands/types.ts`; `docs/reference/islands.md` (already gated). |
| `migrate-existing-content.md` | Map markdown from Hugo, Jekyll, or whatever came before onto cairn's concepts. | `src/lib/content/` (`parseMarkdown`, `serializeMarkdown`); `docs/reference/core.md`. |
| `add-a-custom-admin-screen.md` | Add your own SvelteKit route under `/admin`; absorbs `enforced-design`'s actionable half. | `src/lib/components/CairnAdminShell.svelte`; `src/lib/components/CairnAdmin.svelte`; `docs/reference/admin-routes.md`, `docs/reference/admin-toolkit.md` (already gated). |
| `organize-your-admin-nav.md` | Declare the whole sidebar as one arranged tree. | `src/lib/components/NavTree.svelte`; `src/lib/sveltekit/nav-routes.ts`; `docs/reference/admin-grammar-tokens.md` (already gated). |
| `restrict-admin-access.md` | Declare which roles reach which screens, gating both route and sidebar. | `src/lib/sveltekit/` (the guard's role check); `docs/reference/auth-channel.md` (already gated). |
| `add-a-second-audience.md` (new) | A second audience's login and its own admin area, one journey (merges `add-a-login-channel` and `give-a-role-its-own-admin-area`). | `src/lib/auth-channel/` (`createAuthChannel`, `defineRoles`); `src/lib/sveltekit/editors-routes.ts`; `docs/reference/auth-channel.md`, `docs/reference/admin-routes.md`; `docs/superpowers/specs/2026-07-14-extensible-roles-design.md`. |
| `design-your-site.md` (new) | Own the design and delivery surface; merges `make-waymark-your-own` and `iterate-your-design-locally`. | `examples/showcase/src/theme/` (Waymark, the token seam); `examples/showcase/src/chassis/`; `docs/internal/public-design-system.md` (an internal standard, not an old published page). |
| `enable-tidy.md` | Turn on the optional AI copy-edit; absorbs `editor-copyedit`. | `src/lib/components/CairnTidySettings.svelte`; `src/lib/components/TidyReview.svelte`; `docs/superpowers/specs/2026-06-20-cairn-editor-copyedit-design.md`. |
| `announce-on-publish.md` | Detect entries a deploy just carried across their first publish; fan out from your own endpoint. | `src/lib/delivery/manifest.ts` (the first-publish detection). |
| `share-a-draft-preview.md` | Mint an opaque link so a non-editor can read a pending draft through the site's own rendering. | `src/lib/sveltekit/content-routes-core.ts` (`previewMintAction`, `previewRevokeAction`, `PreviewMintFailure`); `migrations/0003_preview.sql`. |
| `choose-an-ai-posture.md` | Decide whether the site declines or invites AI training crawlers. | `src/lib/delivery/robots.ts` (`buildRobots`, `CONTENT_SIGNAL`); `src/lib/delivery/ai-crawlers.ts` (`AI_CRAWLERS`, 8 tokens); [§4 carried fact 3](#4-the-live-ui-stance-the-carried-facts-and-the-fixes) (the `disallow` seam). |
| `debug-your-site.md` (new) | The code-fixable symptom rows split out of the old troubleshooting page. | `src/lib/log/`; `docs/reference/log-events.md` (already gated). |
| `rotate-the-github-app-key.md` | Generate a new key with no window where the App can't authenticate. | `docs/reference/auth-crypto.md` (already gated); platform-branched commands verified against the live GitHub App settings flow, not invented. |
| `upgrade-cairn.md` | Bump the version range, run the doctor over the `Consumers must:` lines. | `CHANGELOG.md` (the `Consumers must:` convention); `docs/reference/doctor.md`, `docs/reference/supported-toolchain.md` (already gated). |
| `migration-notes.md` (new) | The per-version record, carrying `## Unreleased`. | `CHANGELOG.md`; `scripts/checks/docs-links.mjs` (`unreleasedParityMismatch`, repointed at this page, [§3](#3-the-cutover-gate-bill)). |
| `architecture.md` | The engine's shape: adapter, seams, chassis. | `src/lib/index.ts`; `src/lib/sveltekit/index.ts`; `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`. |
| `content-model.md` | The concept model: fields, frontmatter, manifest. | `src/lib/content/` (types, normalization). |
| `security-model.md` | The auth and CSRF model. | `src/lib/auth/`; `docs/superpowers/specs/2026-06-02-cairn-auth-hardening-design.md`, `2026-06-08-cairn-login-csrf-ownership-design.md`. |
| `auth-channel-security-model.md` | Kept standalone: a second-audience auth channel's own security contract. | `src/lib/auth-channel/`; `docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md`, `2026-08-04-auth-channel-consumer-proof-design.md`. |
| `render-safety.md` | What the render pipeline sanitizes and why. | `src/lib/render/sanitize-schema.ts`; `docs/superpowers/specs/2026-06-02-cairn-render-sanitize-design.md`. |
| `data-tiers.md` | What lives in D1, R2, and the manifest, and why; absorbs `media-storage`. | `migrations/`; `src/lib/media/`; `docs/superpowers/specs/2026-06-15-cairn-media-2a-ingest-delivery-design.md`. |

### The reference (`docs/reference/`) — 23 pages + index

Kept, machine-gated, current: edited, not rewritten clean-room. Confirmed against
`reference-coverage.mjs`'s `CONFIG` (15 distinct export-keyed pages: `core`, `sveltekit`,
`components`, `admin-toolkit`, `render`, `islands`, `delivery`, `delivery-data`, `media`,
`auth-store`, `auth-channel`, `auth-crypto`, `cloudflare`, `vite`, `ambient`) plus 4 CLI pages
(`cairn-audit`, `cli-cairn-manifest`, `cli-cairn-media-seed`, `doctor`) plus 4 non-export
contracts (`admin-routes`, `log-events`, `admin-grammar-tokens`, `supported-toolchain`) =
23. `authoring-syntax.md` is the one page that dies (move-and-kill; see the redirect map).
Required edits, from the outline: `core.md` gains a widget-and-validation table under a
narrative lede (absorbing `structured-fields`'s dictionary); every page opens with a short
narrative lede before its tables; the index gains an "also for site admins" grouping
(`doctor`, `log-events`, `supported-toolchain`) linked by name from the admin track; the
index's "two pages are not export-keyed" line is corrected (it is 8 non-`CONFIG` pages: 4
CLI + 4 contracts, not 2).

---

## 2. The deletion list and redirect map

### Deletion list

50 files, every one of them: the whole of `docs/guides/` (35 files: 34 content pages plus its
`README.md`), the whole of `docs/tutorial/` (2 files, no `README.md` of its own), the whole of
`docs/explanation/` (12 files: 11 content pages plus its `README.md`), and
`docs/reference/authoring-syntax.md` (1 file). 34 + 1 + 2 + 11 + 1 + 1 = 50.

### Redirect map

One row per old source file. The published URL(s) column carries every URL that file served
(the six editor guides serve at both `/docs/guides/<stem>` and `/help/<stem>`, since
cairn-pub's loader carries both keys for the same rendered body). Task 12 emits one redirect
rule per URL in that column. Every one of the 50 deleted files appears exactly once below,
matching the deletion list exactly.

| Old file | Published URL(s) | New path | Reason |
| --- | --- | --- | --- |
| `docs/guides/define-an-adapter-and-schema.md` | `/docs/guides/define-an-adapter-and-schema` | `extend/define-an-adapter-and-schema.md` | kept, unchanged job |
| `docs/guides/configure-rendering.md` | `/docs/guides/configure-rendering` | `extend/configure-rendering.md` | kept, unchanged job |
| `docs/guides/configure-auth-and-d1.md` | `/docs/guides/configure-auth-and-d1` | `extend/add-cairn-to-a-sveltekit-app.md` | hand-provisioning job now split between the tool (`admin/create-your-site.md`) and the existing-app developer path |
| `docs/guides/add-a-login-channel.md` | `/docs/guides/add-a-login-channel` | `extend/add-a-second-audience.md` | merges with `give-a-role-its-own-admin-area` into one second-audience journey |
| `docs/guides/set-up-the-github-app.md` | `/docs/guides/set-up-the-github-app` | `admin/create-your-site.md` | the tool now creates and installs the App; quoted from its transcript |
| `docs/guides/deploy-to-cloudflare.md` | `/docs/guides/deploy-to-cloudflare` | `admin/create-your-site.md` | tool-led deploy replaces the hand-authored mount and bindings steps (a hand-build path survives at `extend/build-a-site-by-hand.md`) |
| `docs/guides/cloudflare-readiness.md` | `/docs/guides/cloudflare-readiness` | `admin/is-it-working.md` | the doctor-organized readiness page, renamed; carries the `check:readiness` anchors |
| `docs/guides/wire-the-delivery-surface.md` | `/docs/guides/wire-the-delivery-surface` | `extend/wire-the-delivery-surface.md` | kept, absorbs the AI-posture page's raw-markdown and content-negotiation halves |
| `docs/guides/choose-an-ai-posture.md` | `/docs/guides/choose-an-ai-posture` | `extend/choose-an-ai-posture.md` | kept, slimmed to the posture decision |
| `docs/guides/add-an-island.md` | `/docs/guides/add-an-island` | `extend/add-an-island.md` | kept, unchanged job |
| `docs/guides/add-a-custom-admin-screen.md` | `/docs/guides/add-a-custom-admin-screen` | `extend/add-a-custom-admin-screen.md` | kept, absorbs `enforced-design`'s actionable half |
| `docs/guides/organize-your-admin-nav.md` | `/docs/guides/organize-your-admin-nav` | `extend/organize-your-admin-nav.md` | kept, unchanged job |
| `docs/guides/give-a-role-its-own-admin-area.md` | `/docs/guides/give-a-role-its-own-admin-area` | `extend/add-a-second-audience.md` | merges with `add-a-login-channel` into one second-audience journey |
| `docs/guides/restrict-admin-access.md` | `/docs/guides/restrict-admin-access` | `extend/restrict-admin-access.md` | kept, unchanged job |
| `docs/guides/link-content-with-references.md` | `/docs/guides/link-content-with-references` | `extend/link-content-with-references.md` | kept, slimmed to the typed reference field, absorbs `reference-integrity`'s practical half |
| `docs/guides/reuse-content-across-entries.md` | `/docs/guides/reuse-content-across-entries` | `extend/reuse-content-across-entries.md` | kept, unchanged job |
| `docs/guides/structured-fields.md` | `/docs/guides/structured-fields` | `reference/core.md` | killed as a page; its dictionary folds into `core.md`'s fields section |
| `docs/guides/add-authors.md` | `/docs/guides/add-authors` | `extend/declare-your-own-concept.md` | retitled to the job it teaches: declaring your own concept |
| `docs/guides/enable-tidy.md` | `/docs/guides/enable-tidy` | `extend/enable-tidy.md` | kept, absorbs `editor-copyedit` |
| `docs/guides/make-waymark-your-own.md` | `/docs/guides/make-waymark-your-own` | `extend/design-your-site.md` | merges with `iterate-your-design-locally` |
| `docs/guides/iterate-your-design-locally.md` | `/docs/guides/iterate-your-design-locally` | `extend/design-your-site.md` | merges with `make-waymark-your-own` |
| `docs/guides/read-cairn-logs.md` | `/docs/guides/read-cairn-logs` | `admin/troubleshooting.md` | the log-querying mechanics become its opening section; extend links `reference/log-events` directly instead of a separate page |
| `docs/guides/rotate-the-github-app-key.md` | `/docs/guides/rotate-the-github-app-key` | `extend/rotate-the-github-app-key.md` | kept, moves track from admin to extend (a terminal-and-`wrangler` task) |
| `docs/guides/announce-on-publish.md` | `/docs/guides/announce-on-publish` | `extend/announce-on-publish.md` | kept, unchanged job |
| `docs/guides/migrate-existing-content.md` | `/docs/guides/migrate-existing-content` | `extend/migrate-existing-content.md` | kept, unchanged job |
| `docs/guides/share-a-draft-preview.md` | `/docs/guides/share-a-draft-preview` | `extend/share-a-draft-preview.md` | kept, unchanged job |
| `docs/guides/upgrade-cairn.md` | `/docs/guides/upgrade-cairn` | `extend/upgrade-cairn.md` | split; keeps the short bump-doctor-`Consumers must:` task (the per-version record splits to `extend/migration-notes.md`) |
| `docs/guides/troubleshooting.md` | `/docs/guides/troubleshooting` | `admin/troubleshooting.md` | the live-site symptom table; code-fixable rows split to `extend/debug-your-site.md` |
| `docs/guides/editor-welcome.md` | `/docs/guides/editor-welcome`, `/help/editor-welcome` | `editors/welcome.md` | kept, renamed; the markup-history essay dies |
| `docs/guides/write-in-the-editor.md` | `/docs/guides/write-in-the-editor`, `/help/write-in-the-editor` | `editors/write-in-the-editor.md` | kept, unchanged job |
| `docs/guides/add-an-image.md` | `/docs/guides/add-an-image`, `/help/add-an-image` | `editors/add-an-image.md` | kept, unchanged job |
| `docs/guides/publish-and-discard.md` | `/docs/guides/publish-and-discard`, `/help/publish-and-discard` | `editors/publish-and-history.md` | kept, renamed; refusal sections move out to `when-something-goes-wrong.md` |
| `docs/guides/manage-the-media-library.md` | `/docs/guides/manage-the-media-library`, `/help/manage-the-media-library` | `editors/manage-the-media-library.md` | kept, unchanged job |
| `docs/guides/manage-your-tag-vocabulary.md` | `/docs/guides/manage-your-tag-vocabulary`, `/help/manage-your-tag-vocabulary` | `editors/manage-your-tag-vocabulary.md` | kept, unchanged job |
| `docs/guides/README.md` | `/docs/guides` | `admin/README.md`, `editors/README.md`, `extend/README.md` | one shared guides index splits into three track indexes |
| `docs/tutorial/build-your-first-cairn-site.md` | `/docs/tutorial` | `extend/build-a-site-by-hand.md` | retitled as the extender's deep path |
| `docs/tutorial/build-a-theme.md` | `/docs/tutorial/build-a-theme` | `extend/design-your-site.md` | nearest page; the chassis-template tutorial's job is not in the new page set (`chassis-template` does not exist; an unfulfilled ROADMAP-tracked gap, not reproduced) |
| `docs/explanation/architecture.md` | `/docs/explanation/architecture` | `extend/architecture.md` | kept (rewritten clean-room) |
| `docs/explanation/auth-channel-security-model.md` | `/docs/explanation/auth-channel-security-model` | `extend/auth-channel-security-model.md` | kept standalone deliberately: a security contract stays findable |
| `docs/explanation/content-model.md` | `/docs/explanation/content-model` | `extend/content-model.md` | kept (rewritten clean-room) |
| `docs/explanation/data-tiers.md` | `/docs/explanation/data-tiers` | `extend/data-tiers.md` | kept, absorbs `media-storage` as its worked case |
| `docs/explanation/editor-copyedit.md` | `/docs/explanation/editor-copyedit` | `extend/enable-tidy.md` | absorbed, after verifying the editor track still answers "why doesn't spellcheck fix everything" |
| `docs/explanation/enforced-design.md` | `/docs/explanation/enforced-design` | `extend/add-a-custom-admin-screen.md` | actionable half absorbed; the essay of record is Task 9 mining-sweep territory, not part of Phase 2's page set |
| `docs/explanation/media-storage.md` | `/docs/explanation/media-storage` | `extend/data-tiers.md` | absorbed as its worked case |
| `docs/explanation/reference-integrity.md` | `/docs/explanation/reference-integrity` | `extend/link-content-with-references.md` | killed as a page; practical half absorbed into the typed reference field |
| `docs/explanation/render-safety.md` | `/docs/explanation/render-safety` | `extend/render-safety.md` | kept (rewritten clean-room) |
| `docs/explanation/security-model.md` | `/docs/explanation/security-model` | `extend/security-model.md` | kept (rewritten clean-room) |
| `docs/explanation/why-cairn.md` | `/docs/explanation/why-cairn` | `docs/why-cairn.md` | moves to the front-door orbit as a sibling of `docs/README.md` |
| `docs/explanation/README.md` | `/docs/explanation` | `extend/README.md` | the concepts grouping absorbs this index's job |
| `docs/reference/authoring-syntax.md` | `/docs/reference/authoring-syntax` | `editors/write-in-the-editor.md` | move-and-kill: the entire content is author-facing; the codec and resolver contracts already live on `reference/media.md` |

50 rows, 50 deleted files: exact membership match.

---

## 3. The cutover gate bill

Every file the cutover edits, re-derived against the current tree.

**`package.json` `files`** (line 160): today
`["dist", "migrations", "skills", "CHANGELOG.md", "docs/README.md", "docs/reference", "docs/guides", "docs/explanation", "docs/tutorial"]`.
At cutover: drop `docs/guides`, `docs/explanation`, `docs/tutorial`; add `docs/admin`,
`docs/editors`, `docs/extend`; keep `docs/README.md`, `docs/reference`, `docs/why-cairn.md`
(new entry, a single file, not covered by any directory glob above), root `README.md` is
already published separately (not through this array).

**`scripts/checks/check-package-files.mjs`**: `DOCS_INDEX_PATHS` (lines 39-45, today
`docs/README.md`, `docs/reference/README.md`, `docs/guides/README.md`,
`docs/explanation/README.md`, `docs/tutorial/build-your-first-cairn-site.md`) becomes
`docs/README.md`, `docs/why-cairn.md`, `docs/reference/README.md`, `docs/admin/README.md`,
`docs/editors/README.md`, `docs/extend/README.md`. `DOCS_ALLOWED_ARM_PREFIXES` (lines 50-55,
today `docs/reference/`, `docs/guides/`, `docs/explanation/`, `docs/tutorial/`) becomes
`docs/reference/`, `docs/admin/`, `docs/editors/`, `docs/extend/`. The unit-test fixtures that
pin these: `src/tests/unit/check-package-files.test.ts` (`describe('checkDocsPacked', ...)`,
lines 42-93), whose `arms` array (lines 43-52) hardcodes
`docs/guides/README.md`, `docs/guides/deploy.md`, `docs/explanation/README.md`,
`docs/explanation/why-cairn.md`, `docs/tutorial/build-your-first-cairn-site.md`; every one of
those five needs a track-shaped replacement (the test is a synthetic-list unit test, not a
tree walk, so it never goes red on its own from a tree change; it silently stops proving what
its comment claims unless someone edits it by hand at cutover).

**`scripts/checks/check-arm-indexes.mjs`**: `ARMS` (lines 20-25, today
`{ dir: 'docs/reference', index: 'docs/reference/README.md' }`,
`{ dir: 'docs/guides', index: 'docs/guides/README.md' }`,
`{ dir: 'docs/explanation', index: 'docs/explanation/README.md' }`,
`{ dir: 'docs/tutorial', index: 'docs/README.md' }`) becomes four entries: `docs/reference`
(unchanged), `docs/admin` -> `docs/admin/README.md`, `docs/editors` ->
`docs/editors/README.md`, `docs/extend` -> `docs/extend/README.md`. The `why-cairn`
front-door mapping needs new script logic, not just a data edit: `docs/why-cairn.md` is a
single file with no directory of its own (the same shape the tutorial arm needed today,
which is why `ARMS` carries the `{ dir: 'docs/tutorial', index: 'docs/README.md' }`
special case), so the gate needs either a bare-file entry shape or a dedicated check that
`docs/README.md` links `docs/why-cairn.md`. Task 3 also adds a non-recursive `docs/internal`
entry (its own item, separate from this track migration).

**`scripts/checks/check-snippets.mjs`**: `DOC_DIRS` (line 47, today
`['docs/tutorial', 'docs/guides', 'docs/reference']`) becomes
`['docs/admin', 'docs/editors', 'docs/extend', 'docs/reference']`.

**`scripts/checks/reference-coverage.mjs`** and **`scripts/checks/check-reference-signatures.mjs`**:
their shared `CONFIG` (declared once in `reference-coverage.mjs`, line 297, imported by
`check-reference-signatures.mjs`) needs **no edit**. `authoring-syntax.md` was never a
`CONFIG` entry (it is one of the 8 non-export reference pages, and even among those it is the
one this cutover kills, not one of the 4 CLI or 4 contract pages `CONFIG` never touched
either). The only reference-arm edit at cutover is removing `authoring-syntax.md`'s one link
from `docs/reference/README.md`'s index (line 60), which `check:docs` would otherwise flag as
a broken link once the file is gone.

**`scripts/checks/check-readiness.mjs`**: `DOC` (line 10, today
`'docs/guides/cloudflare-readiness.md'`) becomes `'docs/admin/is-it-working.md'`. The
condition registry loads from a built artifact
(`dist/diagnostics/conditions.js`, line 12), so the cutover must run `npm run package`
before this gate proves anything against the new heading set; a source-only edit to
`src/lib/diagnostics/conditions.ts` is invisible to the gate until packaged. Every one of the
`docsAnchor` string value in `src/lib/diagnostics/conditions.ts` carried the filename prefix
`cloudflare-readiness.md#`. **Task 9 already did this migration**, so the gate bill item is
done rather than owed: all of them now read `is-it-working.md#`, `check-readiness.mjs`'s `DOC`
constant follows, and `src/tests/unit/conditions.test.ts`'s pinned assertions match. Task 9
also gave the one previously unanchored condition its section, emptying the allowlist, so the
registry stands at 21 conditions, 21 anchors, 17 distinct slugs. Every distinct slug must
survive as a real heading in the new page.

**The gate now checks both halves of a `docsAnchor`.** It used to parse only the part after
`#`, so a value naming a file that does not exist still passed, and a page rename could have
left every anchor wrong and green. Proven red against a deliberately wrong filename before it
was trusted.

**`src/tests/unit/github-slug-contract.test.ts`**: the fixture corpus (`cases` array, line
21 on) cites `source` paths scoped to `docs/reference/` (7 cases, unaffected) and
`docs/tutorial/` (2 cases, lines 62-79: `docs/tutorial/build-a-theme.md` and
`docs/tutorial/build-your-first-cairn-site.md`). Both tutorial-sourced cases need a
replacement heading pulled from the new tree once it exists (`extend/design-your-site.md` or
`extend/build-a-site-by-hand.md`), since the literal headings the two cases assert (e.g. a
duplicate-heading case) may not survive the rewrite verbatim; whoever edits this at cutover
re-derives the case from the actual new heading, not from the dying page's text.

**`.vale.ini`**: the path scoping (`[docs/**/*.md]` today applies `Google, Cairn` to
everything under `docs/`) needs a `[docs/editors/**]` block on top applying the vendored
Microsoft package (Task 3 vendors it under `.vale/styles`; Task 3's own item, not this
cutover's, but the block itself lands here since it must exist before `docs/editors/` ships).
No other track needs a new block; `docs/admin/**`, `docs/extend/**`, `docs/reference/**`, and
the front doors keep the existing `Google, Cairn` scoping.

**`scripts/checks/docs-links.mjs`**: today carries no legacy-path map at all; this is new
logic, not a data edit to an existing map. `filesInScope` (line 35) already walks the live
`docs/` tree and the five `ROOT_DOCS` (`README.md`, `SECURITY.md`, `ROADMAP.md`,
`CHANGELOG.md`, `CONTRIBUTING.md`, line 15) plus `findBrokenLinks` (line 150) resolves every
relative link against files that exist on disk today. Once the 50 old files are deleted,
every one of `CHANGELOG.md`'s 45 links into those paths (29 distinct targets; see the
re-derived count below) breaks unless the gate learns to treat a legacy path specially when
the referring file is `CHANGELOG.md`. The needed shape: a `LEGACY_PATH_MAP` (old path -> new
path or "resolves historically, do not require the file") consulted only when
`file === 'CHANGELOG.md'`, so every other file's links keep failing loud on a truly dead
target. The `unreleasedParityMismatch` function (line 136) and its caller in `main()` (lines
197-200) hardcode `docs/guides/upgrade-cairn.md` as the pairing partner for `CHANGELOG.md`'s
`## Unreleased` heading; this repoints to `docs/extend/migration-notes.md`, the page that
inherits the per-version record per the outline.

### The re-derived `CHANGELOG.md` inbound-link count

`CHANGELOG.md` carries 144 relative markdown links total (measured with `docs-links.mjs`'s
own `linksIn()` against the file, normalizing a leading `./`). 143 of those point into `docs/`
at all (only one relative link in the whole file points somewhere else). Of the 143, **45
point at paths that die at cutover** (`docs/guides/`, `docs/tutorial/`, `docs/explanation/`,
or `docs/reference/authoring-syntax.md`), spanning **29 distinct old targets**: 38 links to
`docs/guides/*`, 6 to `docs/explanation/*`, 1 to `docs/reference/authoring-syntax.md`. This
corrects the spec's stale "~143 gate-checked edits, 43 inside `CHANGELOG.md`" line: the
"~143" figure turns out to already describe the right thing (links into `docs/` from
`CHANGELOG.md`), a coincidental survival rather than a verified equivalence, since it was
derived under the older move-based plan. The "43 inside `CHANGELOG.md`" figure is the one
that needs the map, and the real count is **45, across 29 distinct targets**, not 43. The
remaining 98 `docs/`-pointing links in `CHANGELOG.md` resolve fine after cutover with no map
entry: 83 point into `docs/reference/` (the arm that stays put) and the rest point at
`docs/README.md` or other surviving root docs.

---

## 4. The LIVE-UI stance, the carried facts, and the fixes

### LIVE-UI marker inventory

17 `LIVE-UI` HTML-comment markers exist today, all inside `docs/guides/`, across the four
editor-facing pages that become the editors track:

| Old file | Marker count | New page |
| --- | --- | --- |
| `docs/guides/write-in-the-editor.md` | 6 (lines 25, 31, 200, 284, 298, 351) | `editors/write-in-the-editor.md` |
| `docs/guides/add-an-image.md` | 3 (lines 14, 46, 130) | `editors/add-an-image.md` |
| `docs/guides/manage-your-tag-vocabulary.md` | 3 (lines 18, 52, 73) | `editors/manage-your-tag-vocabulary.md` |
| `docs/guides/manage-the-media-library.md` | 5 (lines 21, 39, 78, 114, 141) | `editors/manage-the-media-library.md` |

6 + 3 + 3 + 5 = 17. **Stance:** every one of these 17 markers dies with its page at cutover.
A new page either earns a live reproduction of the described UI through cairn-pub's `/help`
rendering pipeline, or it carries nothing at that spot: no marker, no placeholder, no
"screenshot coming soon." The no-stub rule (competitor review rule 4; plan global constraint)
applies inside a page, not just at page level, so a live-reproduction seam that Phase 2 has
not yet built is not something a new page names in advance.

### Two code-verified doc defects the new pages fix

**The edit-conflict prose contradicts the code.** `docs/guides/troubleshooting.md` (line 37)
reads: "The page reloads with 'This file changed since you opened it. Reload and reapply your
edits.'" ... "Reload the entry and reapply your edits." This is wrong on the mechanics.
`src/lib/sveltekit/content-routes-core.ts`'s `saveToBranch` calls `saveRefusal(message,
body)` on a commit conflict (line 1413), and `saveRefusal` (line 1230) returns the typed
`SaveFailure` with `body` set to the author's just-typed markdown, not the stale committed
version. `src/lib/components/EditPage.svelte` (line 147) seeds its local `body` state from
`form?.body ?? data.body`, so a refused save re-renders the edit form with the author's
typing already restored, no reload needed and no "reapplying" required. A literal reload
would be actively wrong advice: a real browser reload fetches `data.body` (the last committed
version), discarding the very unsaved work the refused-save response preserved. **The fix:**
`editors/when-something-goes-wrong.md`'s conflict entry states that a refused save (or
conflict) keeps the author's typing on screen already; the action is to review the message,
resolve it if needed, and save again, never "reload."

**The bootstrap sign-in TTL is documented nowhere.** `packages/create-cairn-site/src/cloudflare/bootstrap.mjs`
(line 20) sets `TOKEN_TTL_MS = 10 * 60 * 1000`, the same ten-minute constant as the engine's
own `TOKEN_TTL_MS` in `src/lib/auth/crypto.ts` (line 59; the bootstrap module's own comment,
line 19, cross-references it deliberately so the two cannot drift silently). No published
page states this today. **The fix:** `admin/create-your-site.md`'s "Getting back in" section
and `admin/setup-recovery.md`'s `--sign-in` row both state the ten-minute figure, quoting
`bootstrap.mjs`'s own message text (line 29-30: "The link works for ten minutes; if it
expires, re-run with `--sign-in` for a fresh one.").

### The toolchain-drift finding: `sv create` emits no `svelte.config.js`

Verified by running the tool: `npx sv@latest create --template minimal --types ts
--no-add-ons` (sv 0.17.0, run 2026-08-14) produces **no `svelte.config.js` at all**. The
adapter lives inside `vite.config.ts`'s plugin call instead: `sveltekit({ compilerOptions:
{...}, adapter: adapter() })`, importing `adapter` from `@sveltejs/adapter-auto` by default.
`examples/showcase/svelte.config.js` is this repo's own hand-maintained tree, built and
edited by cairn's developers over months, not the CLI's output, and an earlier pass of this
manifest cited it as evidence of what `sv create` scaffolds, which is the wrong-premise
failure: it answered "what does this repo's tree look like" instead of "has the CLI's output
drifted." The baseline walk (`docs/internal/2026-08-unagented-setup-baseline.md`, drag point
11, reproduced live by two of five walkers) already had this right; the real situation is
worse than that record describes, since there is no `svelte.config.js` on disk to edit at
all, not merely an out-of-date one. **The fix:** `extend/build-a-site-by-hand.md` names
`vite.config.ts` as the adapter's home, states plainly that a current scaffold carries no
`svelte.config.js`, and gives the `sveltekit({ ..., adapter: adapter() })` shape as the real
edit point for both `@sveltejs/adapter-cloudflare` and `csrf: { checkOrigin: false }`.

### An engine defect this uncovered, filed rather than fixed

**The doctor's CSRF-handoff check silently skips on every current scaffold.**
`src/lib/doctor/checks-local.ts:90-91` (`configCsrfDisable`, condition
`config.csrf-disable-missing`) reads `const text = await ctx.readFile('svelte.config.js');
if (text === null) return skip('svelte.config.js not found');`. Since a current `sv create`
scaffold never writes `svelte.config.js` (previous finding), this check now skips on every
fresh site rather than checking anything, and a skip is not visually distinct from a pass in
the doctor's own report: the run looks clean while the CSRF-handoff check never executed.
This is engine work, out of Pass D's docs scope, so it is filed to `ROADMAP.md` (below)
rather than fixed here. **Required facts for the docs regardless:**
`admin/is-it-working.md`'s condition entry for `config.csrf-disable-missing` must not claim a
coverage the check does not deliver on a current scaffold (state the skip behavior plainly,
not just the pass/fail pair the reference table implies); `extend/build-a-site-by-hand.md`
names the same gap where it walks the reader through wiring the CSRF handoff by hand, so a
reader who follows the page correctly still cannot lean on the doctor to confirm it.

### Reference-arm pages carrying the stale claim (Task 8 corrections)

Two pages in the kept reference arm reference `svelte.config.js` and therefore survive the
cutover carrying a stale claim unless Task 8 corrects them:

- **`docs/reference/doctor.md`**: line 21 ("holds `wrangler.jsonc` (or `wrangler.toml`),
  `svelte.config.js`, `site.config.yaml`, and...") and line 80 (the `config.csrf-disable`
  table row, whose "Skip" column reads "`svelte.config.js` is absent"). Both need the
  `vite.config.ts` correction, and the table row should additionally name the silent-skip
  defect above rather than describing it as a neutral, expected outcome.
- **`docs/reference/admin-routes.md`**: line 9 ("This wiring assumes the site sets `csrf: {
  checkOrigin: false }` in `svelte.config.js`, since...") needs the same correction.

`docs/guides/deploy-to-cloudflare.md`, `docs/guides/cloudflare-readiness.md`, and
`docs/tutorial/build-your-first-cairn-site.md` carry the same stale claim but die at cutover
with no redirect target that inherits the literal instruction verbatim (their jobs land on
`admin/create-your-site.md`, `admin/is-it-working.md`, and `extend/build-a-site-by-hand.md`
respectively, each written clean-room against the corrected fact above), so they need no fix
of their own.

### Three carried facts

Pass D Task 1 closed three friction-log findings as superseded because the new extend track
inherits their jobs. Their substance is recorded here so it survives the page move, each
tagged to the new page that must carry it.

1. **`extend/wire-the-delivery-surface.md`: the `.md` rest-route shape.** A suffix-matched
   rest route needs a param matcher claiming only `.md`-suffixed segments, coexisting with a
   plain catch-all with no collision; SvelteKit's own docs do not state this pattern.
   Verified in this repo: `examples/showcase/src/params/md.ts` (`export const match:
   ParamMatcher = (param) => param.endsWith('.md')`) paired with the route directory
   `examples/showcase/src/routes/(site)/[...path=md]/+server.ts`, which calls
   `routes.markdownLoad` and returns `markdownResponse({ body })` from
   `@glw907/cairn-cms/delivery`. The plain catch-all `[...path]` (no `=md` matcher) claims
   every other segment with no conflict, since SvelteKit resolves the more specific matcher
   first.
2. **`extend/wire-the-delivery-surface.md`: the charset re-derivation gap.**
   `markdownResponse` (`src/lib/delivery/responses.ts`, line 41-45) sets `Content-Type:
   text/markdown; charset=utf-8` deliberately. Cloudflare's static-asset layer re-derives a
   served file's content type from its extension at the edge, so this deliberate charset may
   not survive for a `.md`-suffixed URL the way it does for other extensions, and `vite
   preview` is known to report a third, different answer again locally. **No recorded run in
   this repo holds a measurement of what actually ships for `.md` under `wrangler dev` or a
   real deploy.** The manifest records this as a fact the page's writer must re-measure
   against a real `wrangler dev` run before stating a number; a number nobody re-measured
   does not ship, per the no-invented-output constraint.
3. **`extend/choose-an-ai-posture.md`: the `disallow` seam.** Verified in
   `src/lib/delivery/robots.ts`'s `buildRobots` (lines 35-46): `opts.disallow` paths are
   emitted as `Disallow:` lines under the blanket `User-agent: *` group (lines 36-40), before
   any posture-specific group. The `posture: 'decline'` branch (lines 41-43) separately
   iterates the fixed `AI_CRAWLERS` table (`src/lib/delivery/ai-crawlers.ts`, 8 tokens) to
   emit one `User-agent`/`Disallow` pair per named crawler. There is no first-class seam in
   `disallow` for declining one specific named crawler token; the only way to target a named
   crawler is the fixed `AI_CRAWLERS` table under `posture: 'decline'`. This is deliberate:
   cairn does not ship a token it has no first-party documentation for. The page states this
   as the actual seam, not a gap to fill.

---

## Verification notes: outline and spec claims checked against the code

Every claim below was checked directly against the source tree while writing this manifest,
per the task's instruction to verify the way the outline's own adversarial gate did.

| Claim | Source | Verified? | Evidence |
| --- | --- | --- | --- |
| `is-it-working.md` keeps "its 20 anchors" | outline, `2026-08-14-docs-track-outlines.md` line 127 | **The outline was RIGHT and this manifest's own correction was wrong** (conductor error, fixed 2026-08-14 at Task 9). The bad number came from `grep -c "docsAnchor"`, which counts the interface's field declaration alongside the assignments. The row below it even contradicted itself, claiming 21 entries and then that the 21st carried none. | At the time: 21 conditions, **20** of them carrying a `docsAnchor` over 16 distinct anchors, with `skill.admin-screens-stale` `ALLOWLIST`-excused. **Now: 21 conditions, all 21 carrying a `docsAnchor`, over 17 distinct anchors, and the allowlist is empty.** Task 9 gave the skill condition the anchor its rebuilt section earned, since the exception's stated reason (a tooling nudge is not a *Cloudflare deploy-readiness* condition) died with the Cloudflare framing when the page became "is it working?". |
| `check-readiness.mjs` loads conditions from a built artifact | conductor-supplied correction | Confirmed. | `scripts/checks/check-readiness.mjs` line 12: `CONDITIONS_JS = 'dist/diagnostics/conditions.js'`; `main()` exits 2 if the dist file is missing, naming `npm run package` as the fix. |
| `docs/reference/` holds 24 content pages plus its index today, 23 once `authoring-syntax.md` dies | conductor-supplied correction | Confirmed. | `ls docs/reference/*.md` returns 25 files (24 content + `README.md`); `authoring-syntax.md` is one of the 24; `reference-coverage.mjs`'s `CONFIG` never references it. |
| 71 content pages today | outline, line 27 | Confirmed. | `docs/guides` 34 content + `docs/tutorial` 2 + `docs/explanation` 11 content + `docs/reference` 24 content (before `authoring-syntax` dies) = 71. |
| 68 content pages in the revision | outline, line 27 | Confirmed. | admin 7 + editors 7 + extend (1 tutorial + 23 guides + 6 concepts = 30) + reference 23 + `why-cairn.md` 1 = 68 (the 6 index pages and root `README.md` are not counted as content). |
| The reference index's "two pages are not export-keyed" | outline §"The reference", line 254-263 (implied by the outline's correction note) | **Wrong**, corrected. | The non-`CONFIG` reference pages number 8, not 2: 4 CLI pages (`cairn-audit`, `cli-cairn-manifest`, `cli-cairn-media-seed`, `doctor`) plus 4 non-export contracts (`admin-routes`, `log-events`, `admin-grammar-tokens`, `supported-toolchain`). `CONFIG` itself carries exactly 15 distinct-page entries. |
| The `sv create` adapter location | task prompt, "concrete claims worth checking" | **Wrong initial verdict, corrected.** My first pass read `examples/showcase/svelte.config.js` and called this confirmed with no drift; that is the wrong-premise failure named in the review below, not evidence of the CLI's own output. **Drift found**, running the CLI itself. | `npx sv@latest create --template minimal --types ts --no-add-ons` (sv 0.17.0, run 2026-08-14) emits **no `svelte.config.js` at all**; the adapter lives inside `vite.config.ts`'s plugin call (`sveltekit({ compilerOptions: {...}, adapter: adapter() })`), importing `adapter` from `@sveltejs/adapter-auto` by default. `examples/showcase/`'s own `svelte.config.js` is this repo's hand-maintained tree, not the CLI's output, and citing it answered a different question than the one asked. The baseline walk (`docs/internal/2026-08-unagented-setup-baseline.md`, drag point 11, reproduced live by two of five walkers) already had this right; the situation is worse than that record describes, since there is no `svelte.config.js` on disk to edit at all, not merely an out-of-date one. See the engine-defect and reference-arm corrections this uncovers, below. |
| The seventeen `LIVE-UI` markers | outline, line 155 | Confirmed exactly. | `grep -rn "LIVE-UI" docs/guides/*.md` returns 17 matches across the 4 files listed in §4. |
| The spec's "~143 gate-checked edits, 43 inside `CHANGELOG.md`" | umbrella spec, line 246-247 | **Stale**, corrected. | `CHANGELOG.md` carries 143 links into `docs/` (the "~143" figure survives coincidentally), but only 45 of those, across 29 distinct targets, point at paths dying at cutover, not 43. See §3. |
| `check-package-files.mjs`'s `DOCS_INDEX_PATHS` at "~line 39" and `DOCS_ALLOWED_ARM_PREFIXES` at "~line 50" | task prompt | Confirmed. | `DOCS_INDEX_PATHS` starts at line 39; `DOCS_ALLOWED_ARM_PREFIXES` starts at line 50, in the current file. |
| `check-arm-indexes.mjs`'s `ARMS` at "~line 20" | task prompt | Confirmed. | `ARMS` is declared at line 20 in the current file. |
| `github-slug-contract.test.ts`'s fixture corpus scoped to `docs/reference/` and `docs/tutorial/` | task prompt | Confirmed. | 7 of 9 cases cite `docs/reference/*` sources; 2 cite `docs/tutorial/build-a-theme.md` and `docs/tutorial/build-your-first-cairn-site.md`. Both tutorial-sourced cases need re-deriving at cutover per §3. |
| `docs-links.mjs` already carries a legacy-path map | task prompt (implicit, describing what the cutover repoints) | **Does not exist yet.** | The current file has no map of any kind; only a single hardcoded pairing (`unreleasedParityMismatch`) naming `docs/guides/upgrade-cairn.md`. The legacy-path map is new logic Task 10 must add, not an existing structure to edit. Recorded precisely in §3. |
