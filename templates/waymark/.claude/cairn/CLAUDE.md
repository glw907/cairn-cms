This is cairn's own agent guidance, imported by your site's root `CLAUDE.md`. Everything under
`.claude/cairn/` is engine-owned and refreshed by `npx cairn-guidance install` on every upgrade;
put site-specific guidance in your own `CLAUDE.md`, never in this file, since an install
overwrites it.

## The boundary

cairn is a lean, opinionated CMS that makes a non-technical author productive editing raw
markdown on a SvelteKit + Cloudflare site, and publishes through a GitHub App. It serves a
developer who wants a content-managed site fast, then appends their own functionality to it.
cairn is a starting framework and an admin skeleton, not a platform: it does one job well and
gets out of the way.

cairn owns its core job, managing markdown content and the editor/admin frame, and little else.
Everything a site needs beyond that, its own functionality, actors, auth, data, and domain
logic, belongs to the developer, and cairn serves it with a thin seam, not a built-in feature.
When a task reaches for something the engine does not offer, build it as site code first; reach
for `cairn-consult` only when the same workaround repeats, or when nothing in the engine's seams
gets you there at all.

## The atoms

The named primitives a site builds on, each documented with its full contract:

- `requireAccess`, `createSectionAction`, `locals.cairnEditor`: the auth guard and the per-route
  factories. See [SvelteKit](../docs/reference/sveltekit.md).
- `CairnAdminShell`, `navLayout`: the shared admin frame and its declared navigation. See
  [Components](../docs/reference/components.md).
- The field, screen-scaffold, and formatter primitives a custom `/admin/` screen composes. See
  [The admin toolkit](../docs/reference/admin-toolkit.md).
- `createAuthChannel`: a site's own second-audience login channel (request, confirm, logout) over
  a site-owned database. See [Auth channel](../docs/reference/auth-channel.md).
- `createLogger`: structured logs in the engine's own record shape, with the same redaction
  rules. See [Log](../docs/reference/log.md).

## The gates

A scaffolded site's `package.json` carries `check:cairn` (the design-language audit against the
static admin markup) and `check:cairn:rendered` (the same audit against a running dev server, on
both themes). Run `npx cairn-guidance check` to see whether your own repo still has these wired
up, the `CLAUDE.md` import line intact, and the guidance tree itself up to date; `--strict` exits
1 when the tree is stale.

## The DaisyUI-first rule

Before building a new admin component by hand, ask whether a stock DaisyUI component or template
already covers it. The `cairn-extend` skill opens with this question and names the seam and the
showcase example for common patterns; reach for it before writing new markup under `/admin`.

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
`https://gitmcp.io/saadeghi/daisyui`; Blueprint is the paid option, with a rules enforcer and a
quality inspector.

## Where the docs are

If the Go `cairn` tool is installed, `cairn docs <query>` searches the installed engine version's
docs directly. Otherwise, read [the reference index](../docs/reference/README.md), shipped in
this package next to this file.
