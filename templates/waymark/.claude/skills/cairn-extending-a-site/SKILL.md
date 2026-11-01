---
name: cairn-extending-a-site
description: Build or change a cairn site's own code against the engine's seams. Load before adding cairn to an app, migrating content, adding a concept or field, writing a markdown component or island, building public routes, configuring media, previews, tidy, roles, a second sign-in group, Cloudflare Access, a post-deploy job, a custom admin action, or before debugging a cairn site or fixing a cairn-audit finding. Routes each job to a reference with the exact registration points.
---

# Extending a cairn site

## First: whose job is it?

Before writing code, decide where the change belongs:

- **The site.** Cairn manages markdown content and the editor and admin frame, and little else. A
  site's own functionality, actors, auth, data, and domain logic are site code built on a seam.
  Most jobs land here; the router below names the seam.
- **The engine.** Never patch `node_modules` or copy engine internals. If the documented seams do
  not reach what the site needs, or you have worked around the engine twice, stop and load
  `cairn-consulting-the-engine`, which writes the brief for the maintainers.
- **Not this skill.** Admin screen markup and register: `cairn-building-admin-screens`. Public theme,
  `prose.css`, directive styles, public components: `cairn-styling-public-pages`.

Before writing admin markup, ask whether DaisyUI already ships the component; a home-grown one needs a
dated ruling in cairn's rulings ledger. `references/daisyui-first.md` lists where cairn's admin
diverges from stock and why.

## Router

Read only the reference for the job at hand.

| Job | Reference |
|---|---|
| Add cairn to an existing SvelteKit app; dev backend; go to production | `references/adopt-cairn.md` |
| Move old Jekyll, Hugo, or markdown posts in | `references/migrate-content.md` |
| Add a concept or field, a cross-field rule, tags, ids, permalinks; delete, rename, link, include rules | `references/content-model.md` |
| Write a markdown component or a hydrated island | `references/components-and-islands.md` |
| Entry pages, head, feeds, sitemap, robots, archive, tags, menu | `references/public-routes.md` |
| Share a draft preview link | `references/draft-preview.md` |
| Media upload limits, image URLs, media route, srcset | `references/media.md` |
| Mount the admin, gate a custom screen or action, roles and access map, refusal shape, audit table | `references/admin-access.md` |
| A second audience: a role or an auth channel; rolling your own token flow | `references/second-sign-in-group.md` |
| Replace magic links with Cloudflare Access | `references/cloudflare-access.md` |
| Announce newly published posts after deploy | `references/newly-published.md` |
| Turn on tidy; set the AI training posture | `references/tidy-and-ai-posture.md` |
| Run `cairn-audit` and fix its findings | `references/audit.md` |
| Diagnose a failure: logs first | `references/debug.md` |
| Look up a log event, its level, fields, and reasons | `references/log-events.md` |
| Check work before calling it done | `references/preflight.md` |

## Habits that hold everywhere

- Read the structured logs before editing code to fix a fault (`references/debug.md`).
- Regenerate the manifest (`npx cairn-manifest`) after any content edit outside the admin, then
  build. A build is the content check.
- An action with more than two outcomes returns a discriminated `outcome`, never a boolean.
- Site logging goes through `createLogger` from `@glw907/cairn-cms/log`, never a bare `console` call.
- A setting that ships in the build (site config, adapter, `wrangler.jsonc`) takes effect only after
  a deploy. Say so when you stop.
- Never write a secret into the repo. Name the `npx wrangler secret put <NAME>` command for the
  developer to run.

`cairn-guidance install` overwrites this skill on upgrade; record a site's own patterns in its own
docs, not here.
