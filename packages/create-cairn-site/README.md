# create-cairn-site

Scaffold a branded [cairn](https://github.com/glw907/cairn-cms) site from the Waymark starter
theme and run it locally.

## Usage

```
npm create cairn-site
```

The command asks for the site's name, description, brand color, and target directory, then writes
a ready-to-run SvelteKit site. Node.js 22 or later is required, tracking the `@glw907/cairn-cms`
engine's own floor.

Answer any prompt ahead of time with a flag, and the command skips it:

| Flag | Effect |
| --- | --- |
| `--name` | The site's name, written into `site.config.yaml`. |
| `--description` | A short, one-line description of the site. Omit for none. |
| `--brand-color` | A hex color, an `oklch(...)` string, or a bare hue. Rotates the theme's brand accent. |
| `--dir` | Where to create the site. Defaults to a slug of the name. |
| `--yes` | Accept the defaults for anything not given by a flag. |
| `--dry-run` | Print every action and perform none. |

## Running the site

```
cd <your-site>
npm install
CAIRN_DEV_BACKEND=1 npm run dev
```

On Windows PowerShell, the last line is `$env:CAIRN_DEV_BACKEND=1; npm run dev`.

Then open `http://localhost:5173/admin`. That admin runs against a local stand-in backend, which
signs you in without an email loop and never touches GitHub or sends real email. The environment
variable is what turns the stand-in on; without it the site starts, but its admin expects the
production bindings a local project does not have.

## Status

Only the local scaffold half exists today. The command does not create a GitHub repository,
provision Cloudflare, or configure email, and it needs no credentials of any kind. Those steps
arrive in a later release.

Scaffolding writes nothing outside the site directory except one record of the site under
`~/.config/cairn/sites/`, mode `0600`. No secret is ever written into the project.
