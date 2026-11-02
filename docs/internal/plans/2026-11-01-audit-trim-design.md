# Audit trim: just-in-time design note

Pass 1b of the run sheet (`~/.local/state/cairn-agent-first/design-audit/run-sheet.md`). Geoff's
approval is the cleanup design 20261101T122027-138291 and run sheet 20261101T125326-233255. This note
records only what the code settled at `d71e4401e`. Initiative: `shared-standards`.

## Outcome

`cairn-audit` is a static tool. `--rendered`, `norms`, and the `rendered` config section are gone, with
the rendered rules, the harness, the norms manifest and its generator, `norms.yml`, and the two
graduated gates. Geoff's 12 cleanup calls are in `engine-rulings.md`. `culori`, `contrast.ts`,
`schemes.ts`, and `peers.ts` stay. `api-surface.md` doesn't change: the audit has no public subpath.

One end-to-end check: after `npm run package`, `node dist/audit/bin.js --rendered` and
`node dist/audit/bin.js norms button-primary` each exit 2 with `unknown argument`, while
`npm run check:audit-pack` passes on a real install of the packed engine.

## What the code settled

These are reversible calls inside the approved scope. Each goes under the PR's `## Decisions`.

1. **`color.ts` goes too.** The design's keep list omits it. No static rule imports it (`grep -rnE
   "color\.js" src/lib/audit/rules/static` prints nothing), and `svelte-package` ships everything
   under `src/lib`, so a kept copy would be dead weight in the tarball.
2. **Four palette tests keep running.** `badge-tier-legibility`,
   `interactive-control-edge-contrast`, `status-chip-register-tuning`, and the component test
   `BtnActiveDarkGround` prove the admin palette, not the audit, and they import `resolveColors` and
   color math from the code E1 deletes. Their helpers move into `src/tests/unit/_canvas-color.ts`.
   Test retirement waits for Geoff's read, so these stay.
3. **`vertical-metrics.ts` keeps working until pass 8.** It imports `ensurePageHelpers` from
   `rendered.js`, and `src/tests/lab/**/*.test.ts` runs in the `unit` project. R2 deletes the trio in
   pass 8, and `admin-design-system.md:1336` still calls it the executable definition. So it takes a
   local copy of `signature` and `isVisible` (about 50 lines) and a local page type. Deleting it here
   would move R2 forward, with its 79 tests and its doc ripple, for no gain to E1.
4. **The recipe table moves into its test.** `guidance-recipes-sync.test.ts` reads `RECIPE_MODEL` and
   `ROLE_RECIPES` from `norms.ts`. The three guidance copies stay, so the data moves into the test,
   minus the `role` field. `checkRoleRows` goes, since `RATIFIED_NORMS` goes.
5. **The bake loses its audit-config step.** `pruneShowcaseOnlyAuditConfig` throws when the showcase
   config has no `rendered` section. With the section gone, the file is identical to the scaffold's, so
   it joins the plain copy: the `.cairn-template.json:20` exclusion, `AUDIT_CONFIG_FILE`, and the prune
   function all go. `PRUNED_SCRIPTS` loses `check:cairn:rendered`, or the bake throws on the missing
   script.
6. **"The admin design system" means the packaged form of it.** The design says skills must point at
   the admin design system, but `admin-design-system.md` lives in `.claude/skills/` and isn't in
   `package.json`'s `files`, so a pointer would dangle on a site. Packaged skills point at the
   carriers they ship with: the "Write this, get this" table, `references/exemplar-kit.md`, and
   `references/form-anatomy.md`.
7. **`claude/snippets/check-cairn.json:8` needs nothing.** #121 removed its rendered script. Line 8 is
   the closing brace, and the file has no `rendered` token.
8. **Reversed tag-era keeps have no entry to update.** The live ledger dropped them, so each call gets
   one `cleanup-*` entry naming the tag slugs it reverses. `audit-auth-createauthchannel` is the one
   reversed ruling with a live entry, and it is rewritten in place.
9. **The run sheet's overlap line is out of date.** 1b touches neither `gate-table.json` nor
   `api-surface.md`. It does overlap 1a in `claude/CLAUDE.md`, `check-package-files.mjs`, `BACKLOG.md`,
   `CHANGELOG.md`, `MIGRATION-NOTES.md`, and `templates/waymark/`, in different hunks, and in
   `durable-gotchas.md`, on 1a's clean-up list in design.md. 1a has no plan yet, so its hunks there are
   unread. The sheet's second-of-two-PRs step covers all of them.

## Files

`src/lib/audit/**`, `src/tests/{unit,lab}/**`, `scripts/{checks,lab}/**`, `.github/workflows/`,
`.github/ci-green.json`, `skills/`, `claude/CLAUDE.md`, `packages/create-cairn-site/scripts/`,
`examples/showcase/`, `templates/waymark/` (generated), `docs/internal/engine-rulings.md`,
`BACKLOG.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `MIGRATION-NOTES.md`, three reference files under
`.claude/skills/`, and comment lines in `src/lib/admin*`.

## Out of scope

- Everything else in R2: `measure-status-inks.mjs`, `measure-prose.mjs`, the vertical-metrics trio,
  and `tsx`. Pass 8 owns them.
- `ROADMAP.md`'s rendered follow-ups (`:715-716`, `:1416`, `:1476`, `:1527-1528`, `:1550`, `:1571`,
  `:1602`, `:1633`). R9 resets that history in pass 8.
- `runtime-publicmediaresolver`'s reopen line and `audit-log-media-resolver-absent`, which the sheet
  gives to pass 2. Neither reverses a ruling.
- Every other removal the 12 calls name. This pass records them, and later passes execute them.

## Class

`ordinary` plus `runner` (`scripts/checks/**`, `.github/workflows/**`, `.github/ci-green.json`). No
path is on the `auth-data` map, and no packaged docs page teaches the rendered audit:
`grep -rlE "rendered (mode|audit)|cairn-audit norms" docs/admin docs/editors` prints nothing.
