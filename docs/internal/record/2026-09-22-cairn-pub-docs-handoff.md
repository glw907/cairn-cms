# Handoff to cairn-pub: the tool's contract pages and the `/schema/` route (draft docs pass A, 2026-09-22)

Written at draft docs pass A's close, for whoever conducts the next cairn-pub pass. cairn.pub
renders the doc arms shipped inside the npm tarball from its installed engine version, so
everything below arrives at cairn.pub the moment its dependency pin moves to the release that
carries this pass. Nothing here is a cairn-cms task.

## The pin problem comes first

`docs/STATUS.md` records cairn.pub as un-pinnable against the registry since `0.95.0`, on branch
`pass-d-docs-tracks`. Until that is fixed, cairn.pub cannot take a newer engine, so none of the
three items below can ship however ready the engine side is. Fix the pin first; the rest is
routing.

## Three new reference pages for the nav

The pass added three pages to the reference arm, all of them moved from the Go tool's interim
`tool/docs/reference/` copies:

- `docs/reference/cli-cairn-exit-codes.md`, served at
  `https://cairn.pub/docs/reference/cli-cairn-exit-codes`
- `docs/reference/cli-cairn-json-output.md`, served at
  `https://cairn.pub/docs/reference/cli-cairn-json-output`
- `docs/reference/cli-cairn-doctor.md`, served at
  `https://cairn.pub/docs/reference/cli-cairn-doctor`

They are reference-arm pages and belong in that nav group. Their reader is a scripter or an agent
automating against the `cairn` binary, not the extending developer the rest of the arm serves.
`docs/reference/README.md` already links all three, so an index-driven nav needs no separate edit.

No page was renamed, so no redirect row is owed for this pass. The deleted paths are under
`tool/`, which cairn.pub never served.

## The `/schema/` route

The seven published JSON schemas now live at `docs/reference/schema/`, inside the tarball:
`cairn-adopt-list`, `cairn-auth-check`, `cairn-doctor`, `cairn-health`, `cairn-health-summary`,
`cairn-logs`, and `cairn-sites-list`, each `*.schema.json`.

Each file's `$id` is `https://cairn.pub/schema/<name>.schema.json`, frozen at `tool/v1.0.0` and
unchangeable. cairn.pub owes a route that serves the directory verbatim at `/schema/`: the same
bytes, `application/schema+json`, no rewriting of `$id` or of any `$ref`. A validator fetches
these URLs, so a transformed body is a broken contract.

## The URL shape is a contract the binary prints

`https://cairn.pub/docs/<arm>/<page>`, no file extension, is the shape the `cairn` binary's fix
lines and help text print, pinned by Go tests in `tool/internal/render` and `tool/cmd/cairn`. A
cairn.pub routing change that adds an extension, a trailing slash that does not resolve, or an
arm-level prefix breaks links a shipped binary already prints, which no engine release can fix
for an operator who installed an older one. Treat the shape as frozen and serve redirects rather
than moving a page.

The live proof owed before the `tool/v1.1.0` tag is the other direction: each distinct
`https://cairn.pub/docs/admin/<page>` a failure block prints must resolve on the deployed
cairn.pub. That check belongs to the tag session, recorded in `docs/STATUS.md`.
