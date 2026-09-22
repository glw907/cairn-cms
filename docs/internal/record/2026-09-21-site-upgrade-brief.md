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

The install report can print any of these lines, quoted exactly from `src/lib/guidance/bin.ts`:

- `wrote <path>` / `left existing <path>` / `wrote <path>`: a normal write, or the `.orig`
  bookkeeping around a diverged edit.
- `refused packaged entry <path>: not a regular file` (`bin.ts:92`): the packaged source itself is
  not a regular file, so nothing was written for that destination.
- `refused <path>: outside .claude/, a symlink, or not a regular file` (`bin.ts:95`): a
  containment refusal on write. When a destination's `.orig` could not be made, the destination
  itself is also listed here, alongside the `.orig` path, so the site sees which files were left
  stale.
- `write error <path>: <code>`: the write failed with a disk error (an `ENOSPC`, an `EACCES`,
  ...) rather than a containment refusal, carrying the failed write's error code. This is kept
  separate from a refusal so the site knows to check disk space or permissions, not the
  containment rules.
- `removable (no longer shipped): <path>` (`bin.ts:100`): a destination the package previously
  shipped but no longer does. This matters on the 0.96 to 0.97 upgrade: a site should read each
  `removable` line and decide whether to delete the file.

### `npx cairn-guidance check`

Same bin. Reports whether the installed guidance tree, the `CLAUDE.md` import line
(`@.claude/cairn/CLAUDE.md`), the `check:cairn` script, `cairn-audit.config.json`, the
`.github/workflows/check.yml` CI workflow, the `.claude/` Tailwind-source exclusion, and any
leftover `.orig` file match what the package expects. Exits 0 by default; `--strict` exits 1 when
the guidance tree is stale or missing. A site upgrade runs this after `install` to confirm the
tree landed clean, and again after resolving any `.orig` files to confirm none remain.

### `npx cairn-doctor`

Bin target: `./dist/doctor/bin.js`. Run it as `docs/extend/upgrade-cairn.md:50` does: `npx
cairn-doctor --from editor@your-site.com --repo you/your-site`. A bare `npx cairn-doctor` leaves
its checks unchecked and exits 3 (`src/lib/doctor/bin.ts:5-6`: a failed check exits 1, an
unchecked check with no failure exits 3, a clean run exits 0). A site upgrade runs it, addressed,
after bumping the `@glw907/cairn-cms` pin to confirm the site's own configuration still matches
what the new version expects.

**This command is retiring before the `0.97.0` release**, into the `cairn` CLI below. Do not
write an upgrade procedure around it as a lasting step; check what the retirement pass left in
its place before the site round starts.

### `npx cairn-audit`

Bin target: `./dist/audit/bin.js`. The design-language audit: static rules over the admin
surfaces by default, a `--rendered` mode against a running admin, and a `norms` subcommand that
looks up a measured norm (`docs/reference/cairn-audit.md:3-13`). It is not an admin-route or
component surface-drift check.

### `npx cairn-manifest`

Bin target: `./dist/vite/bin.js`. Generates the content manifest the admin and public pages read.
A site upgrade runs this if the manifest format moved, per the release's `Consumers must:` list.

### `npx cairn-media-seed`

Bin target: `./dist/media-seed/bin.js`. Seeds wrangler's local R2 simulator with every
media-library object from a deployed cairn site, so `vite dev` serves real media with no deploy
(`docs/reference/cli-cairn-media-seed.md:3-13`). Requires `--from <base-url>`
(`src/lib/media-seed/assemble.ts:9-10`).

### `cairn` (the operator CLI)

`cairn` is part of cairn, packaged apart from the npm library only because its installation
targets vary: it is a Go binary, not a `bin` in the tarball, so it installs once per operator
machine rather than once per site.

```sh
go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest
```

Prebuilt archives for linux, macOS, and Windows on amd64 and arm64 are on the `tool/v1.0.1`
release, each with the man page beside the binary.

It needs three read credentials, `CAIRN_CF_ACCOUNT_ID`, `CAIRN_CF_READ_TOKEN`, and
`CAIRN_GH_READ_TOKEN`, held in the environment or the OS keyring (`cairn auth set`);
`cairn auth check` proves all nine permissions before an upgrade leans on them. Both tokens are
account-scoped, so a second site needs no new token.

What the site round uses it for: `cairn adopt <site>` registers each upgraded site,
`cairn health <site>` gives the before-and-after verdict on that site's own nine checks, and
`cairn logs <site>` reads the site's structured records straight from Workers Logs when an
upgrade step misbehaves.

**A model cairn site is attached by a Workers Custom Domain, and the upgrade checks it.** cairn
provisions Custom Domains and never Workers Routes, and `cairn adopt` discovers Custom Domains
only. aksailingclub.org is served by a route, a holdover from before cairn; moving it to a
Custom Domain is part of its own upgrade, and until it moves it adopts with an explicit
`--domain`.

Where its documentation lives is in motion. `tool/docs/` is the interim copy that ships with
1.0; the draft-docs pass moves the public pages under `docs/` with every other page, and a
`tool/v1.1.0` repoints the binary's own links. Read the current page from the installed
version, never from a remembered path.

