# What to run, and when

Your site depends on several moving pieces, and each one moves on its own schedule. This page
names today's exact target for every part, where cairn sets it, and how you can tell your site is
still on target, so a mismatch tells you something real instead of leaving you guessing. If you
run any of these commands yourself, [Upgrade cairn](../extend/upgrade-cairn.md) is the developer
page that walks through them; this page names targets, not commands.

## The target stack

| Part | Target today | Where it's set | How often it moves | You're fine if |
|---|---|---|---|---|
| The cairn package | `0.95.0` | `package.json`, the `@glw907/cairn-cms` version | Every few weeks, when a release is cut | Your site's installed version satisfies its own version range, and no `Consumers must:` line in the changelog names an action you haven't taken |
| Node, on your machine | `>=24` | `engines.node` in cairn's own `package.json` | Rarely, on Node's own Active LTS (Long Term Support) calendar | `node --version` reports 24 or newer |
| SvelteKit | `^2.12` | cairn's `peerDependencies` | Rarely, only when a feature needs a newer SvelteKit capability | Your site's installed SvelteKit satisfies `^2.12` |
| Svelte | `^5.56.3` | cairn's `peerDependencies` | Rarely, on the same cadence as SvelteKit | Your site's installed Svelte satisfies `^5.56.3` |
| Wrangler | `^4` | the scaffold's `package.json`, set once when your site was created | Whenever Cloudflare ships a new Wrangler major | Deploys succeed and `npx wrangler --version` satisfies `^4` |
| `@sveltejs/adapter-cloudflare` | `^7` | the scaffold's `package.json` | Follows SvelteKit's own release line | Builds succeed with no adapter warning |
| The Workers `compatibility_date` | `2026-08-21` | `wrangler.jsonc`, set once when your site was created | Moves forward when a new template pulls in a later date; your own deployed site's date never changes on its own | Your site deploys and behaves as expected; an old date stays safe indefinitely, since Cloudflare never withdraws behavior a compatibility date already opted into |
| TypeScript | `^6` | the scaffold's `package.json` | Held deliberately for now; see the note below | `npm run check` (or your site's own type-check script) reports a 6.x TypeScript with no errors |
| The GitHub App private key | No version; rotates on demand | Your Worker's secret store, never a file cairn tracks | Only when you choose to rotate it, or GitHub tells you to | You've never received a GitHub notice about the key, and saves and publishes still work |

**Why TypeScript is held at 6.** TypeScript 7 is real and stable, but three of the tools cairn's
own build depends on, including the one that type-checks your site, still require TypeScript 6
until a later TypeScript release adds back a capability they need. [Supported
toolchain](../reference/supported-toolchain.md) carries the full detail, for a developer who wants
it; on this page, the short version is that `^6` is the deliberate target, not a stale one.

## The cadence, and the promise

cairn is versioned `0.x` under semantic versioning today, and any release before `1.0` can, in
principle, change something. In practice, most releases touch nothing you would ever notice. The
one signal that an engine upgrade needs a developer's attention is a `Consumers must:` line in the
changelog, never the version number by itself; [Upgrade cairn](../extend/upgrade-cairn.md) is
where a developer reads and acts on that line.

The targets in this table are not chasing every point release the ecosystem ships. They sit on tooling
that was current as of cairn's beta release, and cairn's promise is to hold them there until a
major version deliberately moves them again. Node moves on its own Active LTS calendar, a new line
roughly every couple of years. Wrangler rolls faster and lower-stakes than the rest of the stack,
since Cloudflare ships it as a build-time tool your site depends on to deploy, not one it depends
on while running.

## When to act

Most weeks, nothing on this page needs your attention. Act, or hand this to a developer, when you
see one of these:

- **A `Consumers must:` line in cairn's changelog** naming an action for your version range.
  [Upgrade cairn](../extend/upgrade-cairn.md) walks a developer through it.
- **A `Dependency floors` FAIL from `cairn-doctor`**, meaning your installed Svelte or SvelteKit
  has dropped below the floor cairn declares. See [Meet the dependency
  floors](./is-it-working.md#meet-the-dependency-floors).
- **A deploy failure that names a Node or Wrangler version**, printed by Cloudflare or by
  `npm install` itself. That means your machine or your build pipeline is running something older
  than this table's target.
- **A GitHub notice about your site's App key**, sent by GitHub itself, flagging it as expiring or
  already revoked. Hand a developer [Rotate the GitHub App key](../extend/rotate-the-github-app-key.md).
