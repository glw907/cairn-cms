# What to run, and when

Your site depends on a few moving pieces, and each one moves on its own schedule. The table
below names what each one should be today, where it gets set, and how you can tell yours still
matches. If a developer asks you for exact version numbers, [Supported
toolchain](../reference/supported-toolchain.md) has them.

## The target stack

| Part | Target today | Where it's set | How often it moves | You're fine if |
|---|---|---|---|---|
| cairn itself | Whatever version a developer last installed for your site; [Supported toolchain](../reference/supported-toolchain.md) names cairn's newest release | `package.json`, the `@glw907/cairn-cms` version | When a release ships | No `Consumers must:` line in cairn's changelog names an action nobody has taken yet |
| Node.js, on your computer | `24` or newer | Set by cairn; the site creator refuses an older Node, and a plain install only warns | Rarely, on Node's own long-term-support calendar | A developer confirms your build machine is on Node 24 or later |
| Wrangler, Cloudflare's deploy tool | Whatever version your site was created with | Your site's own setup files, written once when your site was created | When Cloudflare ships a new major version | Your deploys finish without an error naming Wrangler's version |
| The GitHub App private key | No version; rotates on demand | Your Worker's secret store, never a file cairn tracks | Only when you choose to rotate it, or GitHub tells you to | You've never received a GitHub notice about the key, and saves and publishes still work |

## How often this changes

cairn hasn't reached its 1.0 release yet, so any release can in principle change something. In
practice, most releases touch nothing you would notice. The one signal that an engine upgrade
needs a developer's attention is a `Consumers must:` line in the changelog, never the version
number by itself.

Nothing in this table follows every release the tools it names put out. cairn's own row moves
when a release's changelog carries a `Consumers must:` line. Node moves on its own
long-term-support calendar, a new line every couple of years or so. Wrangler moves when
Cloudflare ships a new major version of it, which happens more often and matters less: it is
what puts your site online, and it is not part of your site once your site is running.

## When to act

Most weeks, nothing on this page needs your attention. Act, or hand this to a developer, when you
see one of these:

- **A `Consumers must:` line in cairn's changelog** naming an action for your version range.
  [Upgrade cairn](../extend/upgrade-cairn.md) walks a developer through it.
- **A `Dependency floors` FAIL from `cairn-doctor`**, meaning your site's Svelte or SvelteKit is
  below the floor cairn declares. See [Meet the dependency
  floors](./is-it-working.md#meet-the-dependency-floors).
- **A deploy failure that names an old version**, printed by Cloudflare or during install. That
  usually means your machine is running something older than this table's target.
- **A GitHub notice about your site's App key**, sent by GitHub itself, flagging it as expiring or
  already revoked. Hand a developer [Rotate the GitHub App key](../extend/rotate-the-github-app-key.md).
