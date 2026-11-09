# create-cairn-site

Set up a [cairn](https://github.com/glw907/cairn-cms) site. This package is a launcher: it installs
the prebuilt `cairn` command line tool for your platform and runs `cairn new`.

## Setting up with an agent

Install the cairn plugin in Claude Code, and ask it to set up a site:

```
claude plugin marketplace add glw907/cairn-cms
claude plugin install cairn@cairn
```

The agent runs `cairn new`, shows you each step, and waits while you approve it in your browser. [Set up with an agent](https://github.com/glw907/cairn-cms/blob/main/docs/admin/set-up-with-an-agent.md) covers the whole run.

## Usage

```
npm create cairn-site
```

`cairn new` asks a few questions in the terminal, then creates the site's repository, Cloudflare
resources, and first deploy, and asks you to approve each step in your browser. Node.js 24 or later
runs the launcher. Every flag goes through to `cairn new`:

```
npm create cairn-site -- --name "My Site" --email me@example.com --posture decline --dry-run --json
```

## Platforms

The binary comes from one of six optional dependencies, `@glw907/cairn-<os>-<cpu>`: macOS, Linux, and
Windows, each on x64 and arm64. If npm skipped it (`--omit=optional`, or an unsupported platform),
the launcher says so and names the package to install. You can also download the tool from the
[releases page](https://github.com/glw907/cairn-cms/releases).
