# Harvest recheck: task 6 (audit extend, second half, 12 pages)

One line per item, per rule 4 of `docs/superpowers/research/2026-09-29-harvest-theme-lineage-brief.md`.
Resolution column is filled by task 6b. No claim mapped to a fact, and no fact filed, depends on a
rule-3 rule count, scope default, the `./components` subpath, or a chassis token; every line below
is a source path under `src/lib/components/` or a frozen bullet that needs a change.

- `f:66alqp` (new bullet, `extend.md`, enable-tidy): Source cites `src/lib/components/spellcheck.ts:264` and `src/lib/components/TidyReview.svelte`; repoint to `src/lib/admin/` and re-check line 264. Resolution:
- `f:bbovmp` (new bullet, `extend.md`, link-content-with-references): Source cites `src/lib/components/ReferenceField.svelte:2-9`; repoint to `src/lib/admin/ReferenceField.svelte` and re-check the comment lines. Resolution:
- `f:xjdhau` (new bullet, `extend.md`, migrate-existing-content): Source cites `src/lib/components/MediaUploadDialog.svelte:2-19,217-223` and `src/lib/components/CairnMediaLibrary.svelte:1-24`; repoint to `src/lib/admin/` and re-check the lines. Resolution:
- `f:pgwmi4` (new bullet, `extend.md`, organize-your-admin-nav): Source cites `src/lib/components/CairnAdminShell.svelte:195-222`; repoint to `src/lib/admin/CairnAdminShell.svelte` and re-check the lines. Resolution:
- `f:5adbqm` (new bullet, `extend.md`, reuse-content-across-entries): Source cites `src/lib/components/EditPage.svelte:1401`; repoint to `src/lib/admin/EditPage.svelte` and re-check the line. Resolution:
- `f:7250yh` (new bullet, `extend.md`, reuse-content-across-entries): Source cites `src/lib/components/EditPage.svelte:696-712,2333-2336`; repoint to `src/lib/admin/EditPage.svelte` and re-check both ranges. Resolution:
- `f:9pmipf` (new bullet, `extend.md`, security-model): Source cites `src/lib/components/LoginPage.svelte:61,156-162` and `src/lib/components/ConfirmPage.svelte:59-64`; repoint to `src/lib/admin/` and re-check the lines. Resolution:
- `f:4c92fh` (not frozen, `extend.md`, enable-tidy): Source names `CairnTidySettings.svelte:401` with no directory; repoint to `src/lib/admin/CairnTidySettings.svelte` and re-check the line. Resolution:
- `f:q412re` (frozen): Source cites `src/lib/components/tidy-validate.ts`; repoint to `src/lib/admin/tidy-validate.ts`. Resolution:
- `f:noqkmx` (frozen): Source cites `src/lib/components/TidyReview.svelte:2-12`; repoint to `src/lib/admin/TidyReview.svelte`. Resolution:
- `f:rcoz6t` (frozen): Source cites `src/lib/components/CairnTidySettings.svelte:6-17`; repoint to `src/lib/admin/CairnTidySettings.svelte`. Resolution:
- `f:s6av65` (frozen): Source cites `src/lib/components/tidy-validate.ts:7-11,39-40`; repoint to `src/lib/admin/tidy-validate.ts`. Resolution:
- `f:jay6aq` (frozen): Source cites `src/lib/components/spellcheck.ts:264`; repoint to `src/lib/admin/spellcheck.ts`. Resolution:
- `f:3zswxq` (frozen): Source cites `src/lib/components/ReferenceField.svelte:6`; repoint to `src/lib/admin/ReferenceField.svelte`. Resolution:
- `f:s4kynf` (frozen): Source cites `src/lib/components/admin-nav-icons.ts`; repoint to `src/lib/admin/admin-nav-icons.ts`. Resolution:
- `f:iewhzh` (frozen): Source cites `src/lib/components/MediaInsertPopover.svelte`; repoint to `src/lib/admin/MediaInsertPopover.svelte`. Resolution:
- `f:0w7xeu` (frozen): Source cites `src/lib/components/editor-include.ts:96-97`; repoint to `src/lib/admin/editor-include.ts`. Resolution:
- `f:0gltjq` (frozen): its Source names `docs/extend/sign-in-through-your-organization.md`, a deletion-list page, so the scoped verifier run fails on it until the pointer is dropped (the Access CORS mechanic can be re-sourced to Cloudflare's CORS page, https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/cors/, with the code half `X-Cairn-CSRF` kept); it also cites `src/lib/components/client-ingest.ts:237`, which becomes `src/lib/admin/client-ingest.ts`. Resolution: Source-only edit under the rule 2 exception; expect a one-line merge conflict with the lineage's path repoint, keep both changes
- `f:aj9516` (frozen, `migration-notes.md` section, kept page): Source cites `src/lib/components/DeleteDialog.svelte:21` and `RenameDialog.svelte:21`; repoint to `src/lib/admin/`. Resolution:
