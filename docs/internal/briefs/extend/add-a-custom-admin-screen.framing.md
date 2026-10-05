# Framing: Add a custom admin screen (intro round, 2026-10-04)

Agent-facing. Drives the introduction only; the body is fixed.

## Readers and their reasons

1. **Developer with non-content data.** Site needs to manage something that is not markdown
   (signups, members, events, a directory) and wants it in `/admin` beside the editors' screens.
   Arrives from the extend README ("Extend the admin"), Architecture's seams table row "Custom
   admin routes", or a search ("cairn custom admin page"). Knows SvelteKit routes, loads, actions.
   Lacks: that cairn deliberately leaves the site's domain to the developer (so no built-in
   "collections"), that `/admin` is ordinary SvelteKit routing under the shell, and which parts the
   route location gives for free versus which the site must add.
2. **Developer reading the scaffold's `signups/` screen.** Opened `src/routes/admin/signups/` in a
   scaffolded site (or `examples/showcase`) and wants to know what it is, change it, or copy it.
   Lacks: that it is the worked example of this seam, and why each call in it (`requireAccess`,
   `createSectionAction`, `ctx.audit`) is there.
3. **Wrong-place readers.** (a) Has another kind of markdown content: needs a concept, not a
   screen. This is the decision reader 1 may be weighing, so the routing sentence sits right after
   the model, not buried. (b) Wants to change who reaches a screen: Restrict admin access. (c) Wants
   it in the sidebar: Arrange the admin sidebar.

## Background the page rests on (the thin part of the old intro)

- The boundary: cairn owns markdown content and the admin frame; a site's own data and domain are
  the developer's, served by a thin seam (`f:bhyvqg`, `f:nguseg`). The custom screen is that seam
  in the admin. Architecture opens on the same boundary, so word it fresh, do not recycle.
- SvelteKit: the screen is just a route; SvelteKit's precedence puts it ahead of the engine's
  `[...path]` catch-all, and the admin layout renders it in `CairnAdminShell` (`f:03zj56`,
  `f:9xthnq`).
- Cloudflare: the data lives in a D1 database the site binds; the scaffold provisions `APP_DB` for
  developer use beside the engine's `AUTH_DB` (`f:gcuj1j`, `f:onqm6k`).
- Why the four duties exist (the "why" the old intro never gave): location gives the shell and the
  subtree sign-in guard, but the guard decides no per-route authorization (`f:2sd4if`), so the
  access check is the screen's; an entry's history comes from git, and a screen's D1 writes are
  outside it, so the audit trail is their record (`f:hcydfe`, `f:pgy0mr`, `f:wnvqlz`);
  `cairn-audit` scans `src/routes/admin` with the engine's rules (`f:326755`).
- Do not claim the engine's screens write audit records (`f:2tqkv9` rejected).

## Place in the doc set

Only page in "Extend the admin". Upstream: Architecture (seams), Add cairn / scaffold (the shape it
assumes). Siblings it routes to: Define an adapter and schema, Restrict admin access, Arrange the
admin sidebar; See also holds Security model, cairn-audit, media.

## Intro plan

- P1, the model: boundary statement (statement, not imperative) -> the custom screen is the admin's
  seam for it, as a SvelteKit route in the shell behind the guard -> what it is for, D1 data via
  `APP_DB`. Then the concept-versus-screen routing sentence.
- P2, why the duties: the route gives shell + guard; the guard does not authorize per route; git
  does not see D1 writes; `cairn-audit` holds the screen to the engine's rules. Then the contract
  sentence (the anatomy's one-liner, now inside the framing): the steps add a screen that renders
  in the shell, enforces the access map on reads and writes, audits each write, passes
  `cairn-audit`.
- P3, the readers' entry and bounds: the worked example is the scaffold's `signups/` (reader 2
  learns this page explains the file they opened), optional sections, prior knowledge.
- P4: remaining wrong-place routes (access map, sidebar, See also), unchanged.
