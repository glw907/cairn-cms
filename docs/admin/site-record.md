# Site record reference

The `cairn` command is being rebuilt inside the `@glw907/cairn-cms` package, and the commands on this page don't run until it ships.

This page lists every field of `cairn-site.json`, the file at the root of your site that holds the facts about it that have no other home. It is for the person who runs the site and needs to read the record, correct a value, or add a record to a site that has none. It assumes you can open a file in a text editor. It doesn't cover the theme, the Cloudflare names, or the site's name, which the record leaves out.

## The site record

`cairn new` writes `cairn-site.json` when it creates the site and rewrites its `deploy` values as setup finishes. It writes no TypeScript. The site's `cairn.config.ts` imports the record and reads the public address, the sign-in sender, the GitHub App's identity, and the AI posture from it, so you change a value in the record. After you change `aiPosture`, run `npx cairn-manifest` to regenerate `src/content/.cairn/site-facts.json`, because a stale copy fails the build.

The record follows a fixed set of rules, written down in [`schema/cairn-site-1.schema.json`](https://github.com/glw907/cairn-cms/blob/main/schema/cairn-site-1.schema.json). The site's build checks the record against those rules before it does anything else. A record that is missing, isn't JSON, or breaks the rules stops the build with one line that names the file and, for a broken rule, the first field at fault. [Check that your site works](./is-it-working.md#validate-the-site-record) covers the same check in `cairn doctor`.

The record is plain JSON. It can't hold comments, and it allows no field that this page doesn't list.

## Fields

The following table lists every field. A dotted name such as `deploy.github.owner` is the field `owner` inside `github`, inside `deploy`.

| Field | What it holds | Set by | Required |
| --- | --- | --- | --- |
| `kind` | The kind of site: `blog`, `portfolio`, `docs`, `landing`, or `organization`. | The template | Yes |
| `features` | The features the site turns on, as a list. | The template | Yes |
| `themeOptions` | The theme's option choices, keyed by the option names in the theme's manifest. | The template | Yes |
| `aiPosture` | Whether the site invites or declines AI use of its content: `invite` or `decline`. Leave it out until the owner chooses. | `cairn new`, from your answer | No |
| `scaffold.engine` | The engine version that `cairn new` installed. | `cairn new` | Yes |
| `scaffold.composer` | The composer that assembled the site, when one did. `cairn new` doesn't write it. | Not set by `cairn new` | No |
| `deploy.publicOrigin` | The site's public address, written as an `https` origin with no path. | `cairn new` | Yes |
| `deploy.emailFrom` | The address that sign-in emails come from. | `cairn new` | Yes |
| `deploy.github.owner` | The GitHub account or organization that owns the repository. | `cairn new` | Yes |
| `deploy.github.repo` | The repository's name. | `cairn new` | Yes |
| `deploy.github.branch` | The branch that the CMS commits to. | `cairn new` | Yes |
| `deploy.github.appId` | The GitHub App's id. | `cairn new` | Yes |
| `deploy.github.installationId` | The id of the App's installation on the repository. | `cairn new` | Yes |

## What the record leaves out

The record holds none of the following.

- The theme. It comes with the template.
- The Cloudflare names, such as the Worker, the database, and the bucket. `wrangler.jsonc` holds those.
- The site name. `site.config.yaml` holds it.
- Any secret. The GitHub App's private key and the deploy key live in Cloudflare and GitHub. The record carries only the App's ids.

## The public address is stated twice

The public origin appears in two files. `deploy.publicOrigin` in the record is what the build reads for the feed, the sitemap, and canonical links. `PUBLIC_ORIGIN` in the `vars` of `wrangler.jsonc` is the value the Worker reads while it runs. `cairn new` writes both with the same value.

When you move the site to another domain, change both. A site that `cairn new` wrote carries a unit test that fails when the two differ, which you run with `npm run test:unit`, and `cairn doctor` reports the mismatch under the `config.public-origin` check, naming both values. A record that is missing or invalid fails the `config.site-record` check instead.

## Add a record to a site that has none

A site that `cairn new` wrote before the record existed has no `cairn-site.json`. [Upgrade notes](https://github.com/glw907/cairn-cms/blob/main/MIGRATION-NOTES.md) give the steps. The site's developer copies the record's shape from this page and fills the `deploy` values from the site's existing configuration and `wrangler.jsonc`.
