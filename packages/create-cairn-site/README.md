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

## The GitHub chapter

Right after the site is scaffolded, the command walks you through publishing it to GitHub. This
step is interactive by default. `--yes` alone skips it; add `--github` to opt in without a prompt.

### What gets created, and why

The chapter creates a GitHub App that this site's admin owns, using GitHub's manifest flow: a
one-time form that hands the tool a brand-new App's credentials, with no admin console step and
no credential to type in first. That App is its own OAuth client. There is no shared or standing
OAuth client that every scaffolded site reuses.

The App asks for two permissions on your personal account. It needs write access to the
repository's contents, to commit and push the site, and it needs Administration. That second one
is stated here as plainly as the tool states it before you approve:

> The App will be able to write this site's content and manage the repository's settings,
> including deleting it. GitHub does not allow an App's permissions to be reduced later, so this
> stays for as long as the App exists. This is what lets the tool create and publish to the
> repository for you.

Creating the App under an organization adds one more permission: read access to the
organization's members. GitHub requires that to confirm you are a member before the tool creates
the repository there.

### Two trips to your browser

The chapter opens your browser twice.

1. GitHub's "Create GitHub App" page. You click one button, and GitHub creates the App and hands
   its credentials back to the tool.
2. GitHub's install page for that App, which doubles as its authorize page. You choose where to
   install it, your personal account or the organization, and approve.

The tool waits on each trip and prints what it is waiting for. Nothing else needs typing in the
browser.

### Flags

| Flag | Effect |
| --- | --- |
| `--github` | Opt into the GitHub chapter without an interactive prompt. Pair with `--yes` for a fully unattended run. |
| `--app-name` | The GitHub App's name. Defaults to `cairn-<site-slug>`. |
| `--org` | Create the App and repository under this organization instead of your personal account. |
| `--repo-name` | The repository's name. Defaults to the site's slug. |
| `--start-over` | Set aside a previous run's saved progress and start the GitHub chapter fresh. |

### Resuming

Every hop, the App's credentials, the installation, the repository, is saved to the site's local
state record as soon as it completes. Running the command again with the same `--dir` finds that
record and resumes from the next unfinished hop. It never re-asks for the site's name, and it
never creates a second App.

An explicit `--org`, `--repo-name`, or `--app-name` on the resumed run overrides the saved answer
for whatever hop has not run yet.

`--start-over` is the escape hatch. It sets the saved record aside and starts the chapter over, as
if the command were run for the first time.

### Waiting on organization approval

An organization can require an owner's approval before installing a new App. When that happens,
the tool prints that GitHub has already notified the owners, saves its progress, and exits
cleanly. Nothing is lost. Running the command again, once an owner approves, picks up exactly
where it left off.

## Running the site

```
cd <your-site>
npm install
npm run dev
```

Then open `http://localhost:5173/admin`. That admin runs against a local stand-in backend, which
signs you in without an email loop and never touches GitHub or sends real email. The scaffold's
own `dev` script turns the stand-in on, so no environment variable is needed.

## Status

The local scaffold and the GitHub chapter both exist today. The command does not yet provision
Cloudflare or configure email, so the site cannot be deployed to the internet. Those steps arrive
in a later release.

Scaffolding writes nothing outside the site directory except one record of the site under
`~/.config/cairn/sites/`, mode `0600`. No secret is ever written into the project.
