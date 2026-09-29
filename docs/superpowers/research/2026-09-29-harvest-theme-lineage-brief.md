# Harvest brief: what the theme lineage changes

Agent-facing input for every harvest auditor running before theme identity passes B and C merge
(PR #97, carrying #95). Source: the pass C conductor session (cairn-cms-02), 2026-09-29, compiled
from `theme-identity-c` at C task 7 (`6ffe6136`) plus C's planned tasks 8 to 15. Ruling R3 in the
plan governs how it is used. Base: `origin/main` `dc9bb99b`.

## Rule 1: deferred pages

Do not audit these six pages. They are audited after #97 merges (plan task 6b):

- `docs/extend/architecture.md`
- `docs/extend/build-a-site-by-hand.md`
- `docs/extend/share-a-draft-preview.md`
- `docs/extend/design-your-site.md`
- `docs/extend/animate-a-custom-screen.md`
- `docs/extend/what-the-scaffold-wrote.md`

Their sections of `docs/internal/facts/extend.md` are also untouched until then.

## Rule 2: frozen fact ids

Never edit, retag, re-source, or move a bullet with one of these ids. A claim may still map to one
as a `fact` disposition. When a frozen bullet needs a change (a `[candidate]` or `[docs-drift]`
tag to resolve, a `Source:` that cites a deletion-list page), leave it and list it in your
recheck file (rule 4) with the change it needs.

- `admin.md`: rzjq7y, 54vcy2, hi9nim, 1wimos, 71luk5, 01tx08.
- `editors.md`: q2anbz, 0ny3ga, 0wwopk, 0zl0ha, 103hij, 1q8j2n, 24sc8a, 25zrne, 38bu9u,
  59kf07, 5zpheb, 7oxmh4, 84uow3, 9r4fv1, 9sk0at, a17le1, bbg1w2, bj2cn7, bv358u, e6ts03,
  er8yog, eufvqw, fmx8pj, gponkz, h483v2, hl6u0z, hnsyn7, i4fj93, iy77we, lm6yf5, mz51pp,
  n8bxwo, nd1j3y, nkh3fm, nndzys, objj1x, onrbcb, oyokzv, pf6p3j, pgv0o5, q20sj3, qrv8tw,
  qsdjk5, qwbmyj, rbm80t, rpbh0p, s4fa1s, ufh1q2, uhxwem, vti6ws, x7009q, xg2j0r, y6d5d7,
  yq93oc, z70wsm, zgijeo, zqzsmk, zvkaa3.
- `extend.md`: bmxw7w, jzb3d0, btx359, a7qx4m, 0duu5p, guiavc, vs6k2k, xssf06, ylmc9c,
  noqkmx, rcoz6t, s6av65, jay6aq, g7zuji, 9oa6sk, gc0hx3, 5stbq2, bwn0uo, hcjb3o, 8o2gbl,
  3l7f56, q412re, 3zswxq, aj9516, s4kynf, iewhzh, 0w7xeu, 0gltjq, 75hawi, yegr67, c8efq5,
  xv2ien, vcthwj, sjo4cx, gxdg1k, fcqs22, iel6v5, bdnzcy, kt0epf.
- `reference.md`: the harvest never edits `reference.md`.

**The one exception (conductor ruling, 2026-09-29, after tasks 3 and 6 escalated).** When the
verifier fails a frozen bullet because its `Source:` names a deletion-list page, edit that
`Source:` field alone and drop only the page pointer, keeping every code, vendor, or owner cite.
Change nothing else on the line. Log the edit in your recheck file as "Source-only edit under
the rule 2 exception; expect a one-line merge conflict with the lineage's path repoint, keep
both changes". Frozen bullets the verifier does not flag stay untouched and go to the recheck
file as before. A `[rejected: describes a deleted page]` retag may cite the page's own ledger
JSON as its `Source:`.

Every other bullet in `admin.md`, `editors.md`, and `extend.md` is yours per the plan. New bullets
are fine anywhere in your pages' sections: task 7 keeps distinct ids from both sides.

## Rule 3: renames to verify against

Verify claims against today's `main` code. These change when #97 merges, old to new:

- `src/lib/components/` becomes `src/lib/admin/` (102 files), except
  `src/lib/components/PreviewBanner.svelte`, which becomes `src/lib/public/PreviewBanner.svelte`.
- The `./components` export is removed; `./admin` and `./public` are added. `dist/components/`
  becomes `dist/admin/`, including `dist/admin/cairn-admin.css`.
- New exports: `./cairn-public.css` (source `src/lib/public/cairn-public.css`) and the root
  export `previewMarkdown`.
- `docs/reference/components.md` becomes `docs/reference/admin.md`; `docs/reference/public.md`
  is new.
- `DEFAULT_STATIC_SCOPE` and `DEFAULT_ADMIN_SCOPE` become `src/routes/admin`, `src/lib/admin`,
  and `src/lib/admin-toolkit`.
- The audit gains config keys `public.scope`, `public.exclude`, `public.themeRoots`, and
  `public.stylesheets`, and rules `radius-scale`, three `stock-default-hazards` arms, and
  `public-literals`. Rule counts move from today's to 36 total and 19 static, then 38 and 21.
- The chassis `tokens.css` stops declaring the roles, the inks, the code ramp, `--cairn-shadow`,
  the focus-ring keys, the CTA keys, `--cairn-caption-tracking`, and the `pre.shiki` and
  `.cairn-tok-*` rules; they come from `cairn-public.css`. `cairn-focus-ring` becomes a
  components-layer rule instead of an `@utility`.
- `scripts/checks/check-public-tokens.mjs` retires for `check-public-scope.mjs` (the npm script
  name stays). `culori` moves to dependencies; `daisyui` and `tailwindcss` become optional peers.

## Rule 4: the recheck file

Each audit task writes `docs/superpowers/research/harvest-recheck/<task>.md` (for example
`task-2.md`), one line per item, for every one of these cases:

- a new bullet whose `Source:` cites a path under `src/lib/components/`, `dist/components/`,
  or `docs/reference/components.md`;
- a claim mapped to a fact, or a new fact filed, whose truth depends on anything in rule 3
  (a rule count, a scope default, the `./components` subpath, a chassis token);
- a frozen bullet from rule 2 that needs a change, with the change.

An empty case list still writes the file with the line `none`. The post-merge task reads these
files and repoints or retraces each line against the merged code.

## Known behavior notes

- `docs/editors/write-in-the-editor.md` lines 155 to 160: Insert block behavior changed in code,
  but nothing on the page contradicts it.
- `docs/extend/migration-notes.md` and `upgrade-cairn.md` are the kept set and are never audited.
