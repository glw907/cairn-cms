Put site-specific guidance in your own `CLAUDE.md`, never in this file: `npx cairn-guidance
install` overwrites everything under `.claude/cairn/` on every upgrade. This file is cairn's own
agent guidance, imported by your site's root `CLAUDE.md`.

## The boundary

cairn owns its core job, managing markdown content and the editor/admin frame, and little else.
Everything a site needs beyond that, its functionality, actors, auth, data, and domain
logic, belongs to the developer, and cairn serves it with a thin seam, not a built-in feature.
When a task reaches for something the engine does not offer, build it as site code first; reach
for `cairn-consulting-the-engine` only when the same workaround repeats, or when nothing in the engine's seams
gets you there at all.

## The atoms

The named primitives a site builds on. Each export's full contract is the doc comment on its
declaration in `node_modules/@glw907/cairn-cms/dist/`, and the installed skills carry the recipes.

- `requireAccess`, `createSectionAction`, `locals.cairnEditor`: the auth guard and the per-route
  factories. The `cairn-extending-a-site` skill's admin-access reference covers them.
- `CairnAdminShell`, `navLayout`: the shared admin frame and its declared navigation. The
  `cairn-building-admin-screens` skill covers them.
- The field, screen-scaffold, and formatter primitives a custom `/admin/` screen composes. The
  `cairn-building-admin-screens` skill's custom-screen reference covers them.
- `createLogger`: structured logs in the engine's record shape, with the same redaction
  rules. The `cairn-extending-a-site` skill's log-events reference lists the record shape.

## The gates

A scaffolded site's `package.json` carries `check:cairn` (the design-language audit against the
static admin markup). Run `npx cairn-guidance check` to see whether your repo still has these wired
up, the `CLAUDE.md` import line intact, and the guidance tree itself up to date; `--strict` exits
1 on any `FIX` line. The optional Stop hook that runs the audit when a session ends is in the
`cairn-extending-a-site` skill's `adopt-cairn.md`, under "Agent tooling".

## The DaisyUI-first rule

Before building a new admin component by hand, ask whether a stock DaisyUI component or template
already covers it. The `cairn-extending-a-site` skill opens with the question of whose job a thing is, and its
`daisyui-first.md` reference names the seam and the recipe; reach for it before writing new markup
under `/admin`.

## Where the docs are

Start from the installed skills: `cairn-extending-a-site` routes every site job to its reference.
Public theme work goes to `cairn-styling-public-pages`. Each export's contract is its doc comment in `node_modules/@glw907/cairn-cms/dist/`, and
`node_modules/@glw907/cairn-cms/MIGRATION-NOTES.md` carries the upgrade procedure and the
per-version record.
