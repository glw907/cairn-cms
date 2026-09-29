# Harvest recheck: task 2 (audit admin)

One line per item, per rule 4 of `docs/superpowers/research/2026-09-29-harvest-theme-lineage-brief.md`. Resolution column is filled by task 6b.

- `f:udg87q` (new bullet, `admin.md`): Source cites `src/lib/components/ManageEditors.svelte`; repoint to `src/lib/admin/ManageEditors.svelte` and re-check the line ranges after the rename. Resolution:
- `f:iqlr1w` (new bullet, `admin.md`): Source cites `src/lib/components/CairnAdminShell.svelte` (the `isDeskRoute` branch); repoint to `src/lib/admin/CairnAdminShell.svelte` and re-check the lines. Resolution:
- `f:zhpap6` (new bullet, `admin.md`): Source cites `src/lib/components/media-upload-outcome.ts`; repoint to `src/lib/admin/media-upload-outcome.ts` and re-check the comment lines. Resolution:
- `f:rzjq7y` (frozen): Source cites `src/lib/components/ManageEditors.svelte`; repoint to `src/lib/admin/`. Its tag qualifier also quotes a deleted page (`docs/admin/invite-editors.md:35-37`); drop that quotation. Resolution:
- `f:54vcy2` (frozen): Source cites `src/lib/components/ManageEditors.svelte`; repoint to `src/lib/admin/`. Resolution:
- `f:hi9nim` (frozen): Source cites `src/lib/components/CairnAdminShell.svelte:855`; repoint to `src/lib/admin/CairnAdminShell.svelte`. The line has also drifted: the `{#if pending && pending.length > 0}` gate now sits at 876 and 1011, and the Publish site button at 879. Resolution:
- `f:1wimos` (frozen): Source cites `src/lib/components/media-upload-outcome.ts:49`; repoint to `src/lib/admin/`. Its tag qualifier quotes a deleted page (`docs/admin/troubleshooting.md:121-123`); drop that quotation. Resolution:
- `f:71luk5` (frozen): Source cites `src/lib/components/ConfirmPage.svelte:64`; repoint to `src/lib/admin/ConfirmPage.svelte`. Resolution:
- `f:01tx08` (frozen): the claim describes the deleted page's own example ("the dependency-floor check example in the page"), which step 5 retags `[rejected: describes a deleted page]` or rewrites to a code-only claim (the engine peer floors are `@sveltejs/kit ^2.70` and `svelte ^5.56.10`). Its Source `package.json:210-211` has also drifted to `package.json:211-212`. Resolution:
