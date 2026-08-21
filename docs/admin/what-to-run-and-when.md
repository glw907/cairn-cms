# What to run, and when

Your site depends on a few moving pieces, and each one moves on its own schedule. This page names
today's target for the parts you can act on yourself, where cairn sets each one, and how you can
tell your site is still on target, so a mismatch tells you something real instead of leaving you
guessing. [Supported toolchain](../reference/supported-toolchain.md) is the exact versions, for
whoever maintains the code, if a developer asks you for the full list. If you run any of these
commands yourself, [Upgrade cairn](../extend/upgrade-cairn.md) is the developer page that walks
through them; this page names targets, not commands.

## The target stack

| Part | Target today | Where it's set | How often it moves | You're fine if |
|---|---|---|---|---|
| cairn itself | `0.95.0` | `package.json`, the `@glw907/cairn-cms` version | When a release ships, and only when its changelog names something for you to do | Your site's installed version satisfies its own version range, and no `Consumers must:` line in the changelog names an action you haven't taken |
| Node.js, on your computer | `24` or newer | Set by cairn, checked when you install | Rarely, on Node's own long-term-support calendar | `node --version` reports 24 or newer |
| Your Cloudflare hosting tooling | Whatever version your site was scaffolded with | Your site's own setup files, written once when your site was created | Whenever Cloudflare ships a new major version of its deploy tooling | Deploys succeed and your site behaves as expected |
| The GitHub App private key | No version; rotates on demand | Your Worker's secret store, never a file cairn tracks | Only when you choose to rotate it, or GitHub tells you to | You've never received a GitHub notice about the key, and saves and publishes still work |

## The cadence, and the promise

cairn is versioned `0.x` under semantic versioning today, and any release before `1.0` can, in
principle, change something. In practice, most releases touch nothing you would ever notice. The
one signal that an engine upgrade needs a developer's attention is a `Consumers must:` line in the
changelog, never the version number by itself; [Upgrade cairn](../extend/upgrade-cairn.md) is
where a developer reads and acts on that line.

The targets in this table are not chasing every point release the ecosystem ships. They move only
when a release's changelog carries a `Consumers must:` line naming the change, never on a fixed
schedule. Node moves on its own long-term-support calendar, a new line every couple of years or
so. Your Cloudflare hosting tooling moves faster and lower-stakes than the rest, since it's a
build-time tool your site depends on to deploy, not one it depends on while running.

## When to act

Most weeks, nothing on this page needs your attention. Act, or hand this to a developer, when you
see one of these:

- **A `Consumers must:` line in cairn's changelog** naming an action for your version range.
  [Upgrade cairn](../extend/upgrade-cairn.md) walks a developer through it.
- **A `Dependency floors` FAIL from `cairn-doctor`**, meaning your installed Svelte or SvelteKit
  has dropped below the floor cairn declares. See [Meet the dependency
  floors](./is-it-working.md#meet-the-dependency-floors).
- **A deploy failure that names an old version**, printed by Cloudflare or by `npm install`
  itself. That means your machine or your build pipeline is running something older than this
  table's target.
- **A GitHub notice about your site's App key**, sent by GitHub itself, flagging it as expiring or
  already revoked. Hand a developer [Rotate the GitHub App key](../extend/rotate-the-github-app-key.md).
