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

## The pin ceiling is `0.98.0` (added at the draft docs harvest's close, 2026-09-30)

cairn.pub's engine pin must not pass `0.98.0` until cairn's narrative doc arms are rebuilt.
`0.98.0` is the last release that ships the old admin, editors, and extend arms and the front
door (`docs/README.md`, `docs/why-cairn.md`). The harvest's merge deletes those 49 pages from
`main`, after `0.98.0` published, so every later release ships the reference arm plus three kept
extend pages (`migration-notes.md`, `upgrade-cairn.md`, `choose-an-ai-posture.md`) until each
arm's rebuild stage lands. A pin past `0.98.0` before then leaves cairn.pub no narrative page to
render. The repaired and re-armed paths, keyed to the stage that restores each, are in
`docs/internal/record/harvest/relink.json`. cairn-pub's `docs/STATUS.md` carries the same line.

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

## Redirect rows for the rebuilt extend arm (added at draft docs stage 2a's close, 2026-10-07)

The extend rebuild retires 15 old page paths. cairn.pub serves `https://cairn.pub/docs/extend/<page>`
for each `from` path below and should redirect it to the `to` page, since a shipped binary, a
search engine, or an old bookmark may still hold the old URL. A row whose target lands with stage
2b has no page to redirect to until that stage merges, so serve those rows from 2b on. The source
of truth is the `redirects` list in `docs/internal/outlines/extend.json`, which is deleted at the
2b merge; these rows outlive it.

| From | To | Target | Reason |
| --- | --- | --- | --- |
| `docs/extend/data-tiers.md` | `docs/extend/architecture.md` | live now (stage 2a) | Absorbed: the data tiers become the architecture page's state section |
| `docs/extend/build-a-site-by-hand.md` | `docs/extend/add-cairn-to-a-sveltekit-app.md` | live now (stage 2a) | Absorbed: its milestones become the page's sections |
| `docs/extend/declare-your-own-concept.md` | `docs/extend/define-an-adapter-and-schema.md` | lands with stage 2b | Absorbed: adding a concept is a section of declaring the adapter |
| `docs/extend/animate-a-custom-screen.md` | `docs/extend/add-a-custom-admin-screen.md` | live now (stage 2a) | Absorbed as the page's motion section |
| `docs/extend/auth-channel-security-model.md` | `docs/extend/security-model.md` | live now (stage 2a) | Absorbed as the auth channel threat catalogue section |
| `docs/extend/render-safety.md` | `docs/extend/security-model.md` | live now (stage 2a) | Absorbed as the render safety section |
| `docs/extend/what-the-scaffold-wrote.md` | `docs/extend/scaffolded-site-files.md` | live now (stage 2a) | Renamed to match its title |
| `docs/extend/design-your-site.md` | `docs/extend/theme-your-public-site.md` | live now (stage 2a) | Renamed to match its title |
| `docs/extend/wire-the-delivery-surface.md` | `docs/extend/build-the-public-routes.md` | lands with stage 2b | Renamed to match its title |
| `docs/extend/announce-on-publish.md` | `docs/extend/act-on-newly-published-entries.md` | lands with stage 2b | Renamed to match its title |
| `docs/extend/organize-your-admin-nav.md` | `docs/extend/arrange-the-admin-sidebar.md` | lands with stage 2b | Renamed to match its title |
| `docs/extend/enable-tidy.md` | `docs/extend/turn-on-tidy.md` | lands with stage 2b | Renamed to match its title |
| `docs/extend/sign-in-through-your-organization.md` | `docs/extend/replace-magic-links-with-cloudflare-access.md` | live now (stage 2a) | Renamed to match its title |
| `docs/extend/add-a-second-audience.md` | `docs/extend/add-a-second-sign-in-group.md` | live now (stage 2a) | Renamed to match its title |
| `docs/extend/gate-your-site-with-cairn-audit.md` | `docs/extend/run-cairn-audit-on-your-site.md` | lands with stage 2b | Renamed to match its title |

No consumer site, cairn.pub included, moves to the engine that carries these pages until every
docs track is rebuilt (Geoff, 2026-10-07). One release then ships SvelteKit 3, the engine fixes,
and the complete docs, and each site migrates to it as a site pass that follows the docs. The
`0.98.0` ceiling above holds until that release.
