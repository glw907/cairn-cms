# Symlink dev: zero-publish local cairn-cms

The `~/Projects/cairn` meta-workspace is an npm workspace. Its point is to let a
consumer site import the local `cairn-cms` working tree directly, so an engine change
shows up in the site with no publish and no version bump. This runbook covers when that
link engages, the two traps that silently break it, and where to start a session.

The mechanism was proven end to end on 2026-05-30 with 907-life: a live edit to the
local engine became visible through the site's own module resolution, with nothing
published and nothing committed.

## When the link engages

npm links a workspace member into a consumer only when the member's version satisfies
the consumer's declared range. Two conditions both have to hold, and missing either one
sends npm to the registry tarball instead.

1. **The site declares a range the local version satisfies.** The sites pin
   `"@glw907/cairn-cms": "0.6.0"` today, which only the exact `0.6.0` satisfies. Local
   cairn-cms is past that, so npm fetches the published `0.6.0` and the link never forms.
   A site engages the link by moving to `^0.7.0` (or later), which also forces the
   `renderPreview`-to-`render` adapter rename and a deploy. That belongs in the site's
   own migration pass, not here.

2. **The local version runs ahead of the published one.** This is the trap. If local
   cairn-cms is exactly `0.7.0` and `0.7.0` is also the latest on the registry, npm
   treats the registry tarball as an equally good match and copies it into the site's
   `node_modules` rather than linking the local member. Bump the local version one patch
   ahead of the registry (a proper `0.7.1`, committed or not) and the local member
   becomes the strict best match, so npm links it.

   A prerelease bump does not work here. `0.7.1-dev.0` does not satisfy `^0.7.0` under
   semver, so npm falls back to the registry. Use a plain `0.7.1`.

## Engage the link

Run these from the workspace root. The example site is 907-life.

```bash
cd ~/Projects/cairn

# 1. Local engine ahead of the registry (skip if it already is).
#    Edit cairn-cms/package.json "version" to a plain patch above the published one, e.g. 0.7.1.

# 2. Site on a range the local version satisfies, plus the adapter rename.
#    907-life/package.json:        "@glw907/cairn-cms": "^0.7.0"
#    907-life/src/lib/cairn.config.ts: render: ... (was renderPreview:)

# 3. Fresh resolve. A stale lock pins the old registry answer, so clear it first.
rm -f package-lock.json
rm -rf 907-life/node_modules
npm install --no-audit --no-fund

# 4. Confirm the site resolves cairn-cms to the local member.
( cd 907-life && node -e "console.log(require('node:fs').realpathSync(require.resolve('@glw907/cairn-cms/package.json')))" )
```

Step 4 must print a path under `~/Projects/cairn/cairn-cms/`. A path under
`907-life/node_modules/...` that is a real directory means a registry copy is shadowing
the link; recheck steps 1 and 3.

## The two traps, named

**Stale root lock.** `npm install` honors an existing `package-lock.json` before it
re-resolves ranges. After a version bump or a range change, an unchanged install prints
`up to date` and the link does not form. Delete the root `package-lock.json` and
reinstall. The root lock is a derived artifact (the workspace root is not a git repo, so
nothing tracks it), so regenerating it costs nothing.

**Member-local shadow.** Node resolves the nearest `node_modules` first. If
`907-life/node_modules/@glw907/cairn-cms` exists as a real directory (left by an earlier
in-site `npm ci`, or written when condition 2 above was not met), it wins over the
workspace link even when the link is present at the root. Remove `907-life/node_modules`
before the fresh install so the workspace link is the only copy.

## CI safety: never commit a linked lock

Each site's CI runs `npm ci` against the site's own committed `package-lock.json`, and
that lock must resolve cairn-cms from the registry. A root or in-site install that links
the local member writes a lock that points at the local path, which breaks `npm ci` on a
fresh checkout.

A root-level `npm install` leaves the committed site locks untouched (verified
2026-05-30: a root install changed neither site's tracked lock, and `npm ci` stayed green
for both). The danger is an install run from inside a site. When a site lock does drift,
restore a clean registry-resolved standalone lock before committing:

```bash
# From ~/Projects/cairn, with <site> = ecnordic-ski or 907-life
mv package.json /tmp/cairn-root-package.json
mv package-lock.json /tmp/cairn-root-lock.json
cd <site>
rm -rf node_modules package-lock.json
npm install --no-audit --no-fund   # standalone: resolves cairn-cms from the registry
cd ..
mv /tmp/cairn-root-package.json package.json
mv /tmp/cairn-root-lock.json package-lock.json
```

## Where to start a session

| Work | Start Claude in |
|------|-----------------|
| Workspace chores (worktree or root-config edits, this teardown) | `~/Projects/cairn` |
| A cairn-cms engine pass | `~/Projects/cairn/cairn-cms` |
| A site pass (ecnordic-ski / 907-life) | that site's directory |

Starting inside a repo still loads the workspace `CLAUDE.md` as a parent, and it keeps
that repo's own `.claude/` hooks, rules, and per-project memory active. The workspace root
does not load a site's `.claude/` guardrails, so reserve it for cross-repo work.
