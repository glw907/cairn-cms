# Site upgrade brief

This is an internal planning artifact for the site round that upgrades aksailingclub-org,
ecxc-ski, and 907-life to the `0.97.0` cut (each moving from `^0.96.0`). It is not a published
docs page and is not register-graded. This document carries the tools section only; the rest of
the brief (per-site upgrade steps, the `Consumers must:` checklist, the schedule) is a later
pass's work.

## Tools

Every command a site can run during its upgrade, verified against `package.json`'s `bin` block
at `HEAD` and against each bin's own usage string.

### `npx cairn-guidance install`

Bin target: `./dist/guidance/bin.js`. Copies the package's shipped skills, the
`cairn-extension-reviewer` agent, and the `CLAUDE.md` fragment into `.claude/`. It writes
`<dest>.orig` beside anything the site had edited, so the edit is never overwritten without a
recovery copy, and a `MANIFEST` of what it wrote. It never deletes.

The install report distinguishes three outcomes per destination:

- `wrote <path>` / `left existing <path>.orig` / `wrote <path>.orig`: a normal write, or the
  `.orig` bookkeeping around a diverged edit.
- `refused <path>: outside .claude/, a symlink, or not a regular file`: a containment refusal.
  When a destination's `.orig` could not be made, the destination itself is also listed here,
  alongside the `.orig` path, so the site sees which files were left stale.
- `write error <path>: <code>`: the write failed with a disk error (an `ENOSPC`, an `EACCES`,
  ...) rather than a containment refusal, carrying the failed write's error code. This is kept
  separate from a refusal so the site knows to check disk space or permissions, not the
  containment rules.

### `npx cairn-guidance check`

Same bin. Reports whether the installed guidance tree, the `CLAUDE.md` import line
(`@.claude/cairn/CLAUDE.md`), the `check:cairn` script, `cairn-audit.config.json`, the
`.github/workflows/check.yml` CI workflow, the `.claude/` Tailwind-source exclusion, and any
leftover `.orig` file match what the package expects. Exits 0 by default; `--strict` exits 1 when
the guidance tree is stale or missing. A site upgrade runs this after `install` to confirm the
tree landed clean, and again after resolving any `.orig` files to confirm none remain.

### `npx cairn-doctor`

Bin target: `./dist/doctor/bin.js`. The adoption and configuration check
`docs/extend/upgrade-cairn.md:50` already names. A site upgrade runs this after bumping the
`@glw907/cairn-cms` pin to confirm the site's own configuration still matches what the new
version expects.

### `npx cairn-audit`

Bin target: `./dist/audit/bin.js`. The admin-surface audit. A site upgrade runs this to confirm
no custom admin route or component has drifted from the surface the new version ships.

### `npx cairn-manifest`

Bin target: `./dist/vite/bin.js`. Generates the content manifest the admin and public pages read.
A site upgrade runs this if the manifest format moved, per the release's `Consumers must:` list.

### `npx cairn-media-seed`

Bin target: `./dist/media-seed/bin.js`. Seeds media entries. A site upgrade runs this only if the
release's `Consumers must:` list calls for a media re-seed; otherwise it is not part of a routine
upgrade.

### Out of scope

The Go `cairn` operator CLI under `tool/` is not part of the npm package a site installs. It
ships no operator-facing command yet and has no released binary, so it carries no row here.
