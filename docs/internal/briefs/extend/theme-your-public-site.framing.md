# Framing record: Theme your public site

Intro round, 2026-10-04. Agent-facing; disposable after the round.

## Who arrives, from where, why

| Reader | Arrives from | Came for | Knows | Lacks |
|---|---|---|---|---|
| A. Scaffolded-site owner wanting the brand | README "Public site" group; search "cairn theme / colors / fonts" | Change colors and type, keep layouts | Tailwind, daisyUI, has a running Waymark site | Where the look lives, which files are theirs, whether an upgrade overwrites them |
| B. Developer with an existing design | Search; why-cairn or a migration from another platform | Put their design on cairn | Their design, Tailwind/Svelte | What the chassis is, what a theme must supply, what stays engine-owned |
| C. Hand-built-site developer | `add-cairn-to-a-sveltekit-app.md` (links `#theme-a-hand-built-site` twice) | Style a site that has no Waymark and no chassis | Every file they wired by hand | What the engine contributes to public styling (one sheet of defaults) and that it overrides freely |
| D. Developer holding an audit finding | `run-cairn-audit-on-your-site.md`, `reference/cairn-audit.md`, a `check:cairn` run | Fix a `public-literals` / `theme-conformance` / `theme-contrast` finding | The finding text | Why the rules exist and where the fix section is |
| E. Evaluator | why-cairn, architecture | Whether cairn locks a site's look | cairn's pitch | That public output is design-agnostic and the admin is the engine's design |

## Background the page rests on (none of it was in the old intro)

- cairn styles the admin (daisyUI + Tailwind, engine design); public output is design-agnostic, the site brings `render` (`f:k6aopn`, new `f:8n6qc8`).
- Engine's public part is a sheet of defaults in `@layer theme`, lowest Tailwind layer, so anything the site writes wins (`f:c4nnu9`, `f:hva8r5`). This is the "why theming is unconstrained" claim reader E and C need.
- Waymark + chassis arrive as site files, npm ships neither, so no engine version governs the look (`f:rxj43c`, `f:l2mbcj`). Reader A's upgrade worry.
- A theme reaches the admin only in the editor preview frame, which renders through the same `render` but loads only the sheets the adapter names (`f:dl1trb`, `f:gnn3pv`). Explains why a public-theme page has an editor-preview section.
- Cloudflare: not relevant to theming (build-time CSS); left out deliberately. SvelteKit: carried by the prior-knowledge sentence and "files in the site's tree".

## Place in the doc set

Public site group, beside choose-an-ai-posture. Downstream of add-cairn (reader C) and of the setup command's scaffold. Adjacent work (rendering, routes, media, site-wide audit, scaffolded files, admin-screen styling) stays on its pages via the existing list.

## Intro plan

1. P1, the model: engine designs the admin, leaves public pages design-agnostic; engine's public part is one defaults sheet in the lowest layer; a theme touches the admin only through the preview frame.
2. P2, the starting point: Waymark + chassis from the setup command; files in the site, not the package; look = token values over engine roles, so owning the design = how far a change reaches.
3. P3, readers and routes: A re-skins, B ports, C starts at Theme a hand-built site, scaffolded order sentence(s) kept from the plan, both recipes end at the audit (what the rules check), D starts at Resolve an audit finding.
4. P4 unchanged: prior knowledge + six adjacent pages.
Opens on a statement. No sentence names the page.
