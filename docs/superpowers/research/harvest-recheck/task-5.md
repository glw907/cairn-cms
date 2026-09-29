# Harvest recheck: task 5 (audit extend, first half)

One line per item, per rule 4 of `docs/superpowers/research/2026-09-29-harvest-theme-lineage-brief.md`. Resolution column is filled by task 6b. Pages under this file: `add-a-custom-admin-screen`, `add-an-island`, `add-a-second-audience`, `add-cairn-to-a-sveltekit-app`, `announce-on-publish`, `auth-channel-security-model`, `configure-rendering`, `content-model`, `data-tiers`, `debug-your-site`, `declare-your-own-concept`, `define-an-adapter-and-schema`.

New bullets whose Source cites `src/lib/components/`:

- `f:my6ci3` (new bullet, `extend.md`): Source cites `src/lib/components/EditPage.svelte:1344-1372` (the debounced preview render effect); repoint to `src/lib/admin/EditPage.svelte` and re-check the line range after the rename. Resolution:
- `f:mfmmof` (new bullet, `extend.md`): Source cites `src/lib/components/MediaPicker.svelte:65` (the media-base context read with a default fallback); repoint to `src/lib/admin/MediaPicker.svelte` and re-check the line. Resolution:
- `f:5t1i7o` (new bullet, cut sweep, `extend.md`): Source cites `src/lib/components/ManageEditors.svelte:18` (its `PageHeader`/`AdminTable` import from the toolkit); repoint to `src/lib/admin/ManageEditors.svelte` and re-check the line and the import path. Resolution:
- `f:lncjdr` (new `[rejected]` bullet, cut sweep, `extend.md`): Source cites `src/lib/components/CairnAdminShell.svelte:43,689-693` (the shell's `cairn-admin.css` import and bare `data-theme` wrapper); repoint to `src/lib/admin/CairnAdminShell.svelte` and re-check both line ranges. Resolution:

New facts whose truth depends on a rule 3 item:

- `f:zpi2ux` (new bullet, `extend.md`): the claim says the compiled admin sheet scans only the engine's admin components and `src/lib/admin-toolkit/`; its Source `scripts/build/admin-css.input.css:5-9,14,22` names the `@source` for `src/lib/components/**`, which becomes `src/lib/admin/**`. Re-read the scan roots and re-check the line numbers after the rename and the `cairn-public.css` split. Resolution:
- `f:b8rkq9` (new bullet, `extend.md`): Source lines cite the waymark template's `+layout.svelte:23`; that file imports `CairnAdminShell` from the removed `./components` subpath, so the import moves to `./admin` and the line numbers may shift. Re-check the layout pair's lines. Resolution:
- `f:brfitv` (new bullet, `extend.md`): same template `+layout.svelte:3-5,23` Source as `f:b8rkq9`; re-check the lines after the `./components` to `./admin` change. Resolution:
- `f:7m5o61` (new bullet, cut sweep, `extend.md`): rests on the admin sheet compiling a Tailwind utility only when cairn's own admin source uses it; its Source `scripts/build/admin-css.input.css:5-9` names the scan root that moves from `src/lib/components/**` to `src/lib/admin/**`. Re-read the scan roots and line numbers after the rename. Resolution:
- `f:lncjdr` (new `[rejected]` bullet, cut sweep, `extend.md`): the correction says toolkit primitives outside `CairnAdminShell` render unstyled because only the shell imports `cairn-admin.css`; after the merge `dist/admin/cairn-admin.css` and the new `./cairn-public.css` export change what a site can import, so re-check whether a site outside the shell can load the admin sheet and theme root, and keep the rejection if the claim still fails without that step. Resolution:

Frozen bullets from rule 2 that need a change:

- `f:g7zuji` (frozen): Source cites `src/lib/components/chrome-guard.ts`; repoint to `src/lib/admin/chrome-guard.ts`. Resolution:
- `f:9oa6sk` (frozen): Source cites `src/lib/components/cairn-admin.css:122-124,383-385`; repoint to `src/lib/admin/cairn-admin.css` and re-check the lines. Resolution:
- `f:gc0hx3` (frozen): Source cites `src/lib/components/cairn-admin.css:937-960`; repoint to `src/lib/admin/cairn-admin.css` and re-check the lines. Resolution:
- `f:5stbq2` (frozen): Source cites `src/lib/components/cairn-admin.css:1140-1182`; repoint to `src/lib/admin/cairn-admin.css` and re-check the lines. Resolution:
- `f:bwn0uo` (frozen): Source cites `src/lib/components/cairn-admin.css:122`; repoint to `src/lib/admin/`. Its claim text also quotes a deleted page (`docs/extend/add-a-custom-admin-screen.md:94`); drop that quotation. Resolution:
- `f:hcjb3o` (frozen): Source cites `src/lib/components/ManageEditors.svelte:38-55`; repoint to `src/lib/admin/ManageEditors.svelte` and re-check the lines. Resolution:
- `f:8o2gbl` (frozen): Source cites `src/lib/components/EditPage.svelte:2128`; repoint to `src/lib/admin/EditPage.svelte`, where the sandboxed iframe line has moved. Resolution:
- `f:3l7f56` (frozen): Source cites `src/lib/components/EditPage.svelte:88-89,114`; repoint to `src/lib/admin/EditPage.svelte` and re-check the lines. Resolution:
- `f:fcqs22` (frozen): the claim says the dev package's `engines.node` field enforces the Node floor at install time, but `packages/cairn-cms-dev/src/channel-db.ts:36-38` says npm only warns on an engines mismatch. Restate it to the code-true form (no runtime guard, `node:sqlite` unflagged since Node 22.13 and the package floor is `>=24`; see `f:tnvu0a` and the `[rejected]` `f:xlej3f`). Resolution:
