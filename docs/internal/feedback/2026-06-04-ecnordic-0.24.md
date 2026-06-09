# cairn-cms DX feedback: ecnordic 0.21 → 0.24 upgrade

**Source.** ecnordic.ski moved from `^0.21.0` to `^0.24.0` on 2026-06-04. This is brainstorm input
for a future cairn-cms pass, not a plan. It is a companion to the 907.life feedback from the same day
(`cairn-dx-feedback-2026-06-04.md`); where they overlap, this note sharpens that document's item #5.

## Context

This was a routine version bump, not a structural migration. One consumer code change covered the
whole upgrade: the `CairnHead` import moved from `@glw907/cairn-cms/delivery` to
`@glw907/cairn-cms/delivery/head` (the 0.22 breaking change). The 0.23 date and tags validation
tightening needed no work, because the existing content already held a valid `YYYY-MM-DD` date and a
tag inside the declared vocabulary. ecnordic uses no `summaryFields` and no `defaultIconByRole`, so
those breaking notes did not apply. Gates stayed green: `check` 0/0, `npm test` 50 passed, build clean.

## What worked, keep it

The per-version CHANGELOG discipline that 907 finding #5 asked for has landed, and it paid off here.
Every breaking entry for 0.22, 0.23, and 0.24 carries a "Consumers must…" line. Reconstructing the
0.21 → 0.24 action list was a read of three changelog entries against the codebase, not an
investigation. This is the cheap-upgrade path 907's migration wanted.

## The one finding: the upgrade docs do not reach an npm consumer

The CHANGELOG and the new `docs/upgrading.md` live only in the GitHub repo. The published 0.24.0
tarball ships `dist`, `src/lib`, `README.md`, `LICENSE`, and `package.json`. It carries no
`CHANGELOG.md`, no `docs/`, and the `package.json` has no `homepage` field. A consumer who installs
from npm and wants to upgrade has nothing in the package, and nothing on the registry page, that
points to the changelog or the upgrade guide. They have to already know to read the GitHub repo.

This extends 907 finding #5 rather than repeating it. That item is about writing the guide. This one
is about shipping and linking it. The discipline is in place; the packaging has not caught up.

**Evidence.** The installed 0.24.0 `package.json` has `"files": ["dist","src/lib"]` and no
`homepage`. Its package directory holds `dist`, `src`, `README.md`, `LICENSE`, and `package.json`
only.

**Direction.** Add `CHANGELOG.md` (and optionally `docs/upgrading.md`) to the package `files` array,
so the upgrade record installs with the package. Set `homepage` to the repo or the upgrade guide, so
the npm registry page links it. Both are one-line `package.json` edits.

## Triage at a glance

| # | Issue | Area | Rough cost to fix |
|---|---|---|---|
| 1 | Upgrade docs (CHANGELOG, upgrading.md) ship neither in the tarball nor via `homepage` | packaging | small (`package.json` `files` + `homepage`) |
