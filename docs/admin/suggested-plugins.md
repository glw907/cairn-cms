# Suggested plugins

A site that `cairn new` sets up carries Claude Code settings that suggest three plugins, and a `.mcp.json` file that adds the Svelte Model Context Protocol (MCP) server. You install a fourth plugin, `cairn`, before the site exists. This page lists them and shows how each person installs their copy. It is for the owner or developer who opens the site's folder in Claude Code, and it leaves out what each plugin teaches.

## What the site suggests

The site's `.claude/settings.json` declares three marketplaces and the plugin each one offers. The `cairn` plugin comes from a marketplace you add before a site exists, so the site doesn't declare it.

| Marketplace | Source repository | Plugin | Declared by the site |
| --- | --- | --- | --- |
| `cairn` | `glw907/cairn-cms` | `cairn` | No |
| `svelte` | `sveltejs/ai-tools` | `svelte` | Yes |
| `cloudflare` | `cloudflare/skills` | `cloudflare` | Yes |
| `daisyui` | `saadeghi/daisyui` | `daisyui` | Yes |

The `saadeghi/daisyui` repository also publishes `daisyui-blueprint`, which needs a paid license, so the site doesn't suggest it. Its [marketplace file](https://raw.githubusercontent.com/saadeghi/daisyui/master/.claude-plugin/marketplace.json) says so.

## Install your own copy

Claude Code offers the marketplaces the site declares when you trust the site's folder, as the [Claude Code plugin documentation](https://code.claude.com/docs/en/plugins/) describes. A plugin from an external source still needs one install for each person, so each person who opens the folder installs the plugins once.

1. Open the site's folder in Claude Code and accept the trust prompt.
2. If Claude Code doesn't offer a marketplace, add it by its source repository. For example:

   ```
   /plugin marketplace add sveltejs/ai-tools
   ```

3. Install each plugin by its name and marketplace. For example:

   ```
   /plugin install svelte@svelte
   ```

The same commands work for every row of the table:

- For `cairn`, run `/plugin marketplace add glw907/cairn-cms` and then `/plugin install cairn@cairn`.
- For `cloudflare`, use the source `cloudflare/skills` and the plugin `cloudflare@cloudflare`.
- For `daisyui`, use the source `saadeghi/daisyui` and the plugin `daisyui@daisyui`.

## Verify the install

- In Claude Code, run `/plugin` and confirm each plugin you installed appears in the list.

## See also

- [Set up a site with an agent](./set-up-with-an-agent.md) uses the `cairn` plugin to hand setup to an agent.
- [Before you start](./before-you-start.md) lists what the site needs before setup begins.
