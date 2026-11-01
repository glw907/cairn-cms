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
declaration in the installed package's `dist` folder, and the installed skills carry the recipes.

- `requireAccess`, `createSectionAction`, `locals.cairnEditor`: the auth guard and the per-route
  factories. The `cairn-extending-a-site` skill's admin-access reference covers them.
- `CairnAdminShell`, `navLayout`: the shared admin frame and its declared navigation. The
  `cairn-building-admin-screens` skill covers them.
- The field, screen-scaffold, and formatter primitives a custom `/admin/` screen composes. The
  `cairn-building-admin-screens` skill's custom-screen reference covers them.
- `createAuthChannel`: a site's login channel for a second sign-in group (request, confirm, logout) over
  a site-owned database. The `cairn-extending-a-site` skill's second-sign-in-group reference covers it.
- `createLogger`: structured logs in the engine's record shape, with the same redaction
  rules. The `cairn-extending-a-site` skill's log-events reference lists the record shape.

## The gates

A scaffolded site's `package.json` carries `check:cairn` (the design-language audit against the
static admin markup) and `check:cairn:rendered` (the same audit against a running dev server, on
both themes). Run `npx cairn-guidance check` to see whether your repo still has these wired
up, the `CLAUDE.md` import line intact, and the guidance tree itself up to date; `--strict` exits
1 when the tree is stale.

## The DaisyUI-first rule

Before building a new admin component by hand, ask whether a stock DaisyUI component or template
already covers it. The `cairn-extending-a-site` skill opens with this question and names the seam and the
recipe for the two patterns it covers today; reach for it before writing new markup under
`/admin`.

## The Stop hook

Add this to `.claude/settings.json` to run the audit whenever an agent session stops working on
your site, so a drifted admin screen surfaces before you commit it:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "npm run check:cairn --if-present"
          }
        ]
      }
    ]
  }
}
```

It runs on `Stop`, not `PostToolUse`, because the audit is worth a full run once a session
settles on a result, not after every single tool call inside it.

## DaisyUI tooling

Install the published DaisyUI skill (`npx skills add saadeghi/daisyui --agent claude-code`) for
the component reference. A free documentation MCP server is available at
`https://gitmcp.io/saadeghi/daisyui`. Blueprint is the paid option, a rules enforcer and quality
inspector for DaisyUI markup: https://daisyui.com/blueprint/.

## Where the docs are

Start from the installed skills: `cairn-extending-a-site` routes every site job to its reference.
Each export's contract is its doc comment in the installed package's `dist` declarations, and
`node_modules/@glw907/cairn-cms/docs/extend/upgrade-cairn.md` carries the upgrade procedure and
`node_modules/@glw907/cairn-cms/docs/extend/migration-notes.md` the per-version record.
