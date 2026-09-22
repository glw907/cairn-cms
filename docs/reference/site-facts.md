# The `site-facts.json` contract

`src/content/.cairn/site-facts.json` is a committed file carrying the three adapter-derived
values a Go program cannot read on its own, since only Node can evaluate a site's TypeScript
adapter through Vite. The [`cairn-manifest`](./cli-cairn-manifest.md) CLI writes it, and the
[`cairnManifest`](./vite.md) plugin verifies it on every build, the same pairing the content
manifest uses.

## What it carries

```json
{
  "version": 1,
  "mediaBucketBinding": "MEDIA_BUCKET",
  "roles": { "owner": "owner" },
  "aiPosture": "decline"
}
```

- `version` is always `1`.
- `mediaBucketBinding` mirrors `cairn.media.bucketBinding`. Omitted when the adapter declares no
  media.
- `roles` mirrors `cairn.roles`, the site's declared role vocabulary. Omitted for a zero-config
  site that uses the implicit owner/editor pair.
- `aiPosture` mirrors `cairn.aiPosture`, the site's stated stance toward AI training crawlers.
  Omitted when the site states no posture.

Nothing else of the adapter crosses into this file: `cairn.backend`'s owner and repo and
`cairn.email.from` are the adapter's own identity, not this contract's concern, and never appear
here.

## Who writes it and who verifies it

The [`cairn-manifest`](./cli-cairn-manifest.md) CLI writes `site-facts.json` alongside the
content manifest, reading the same three fields off the adapter that
[`cairn-doctor`](./doctor.md) derives for its own checks. Run it after you edit your adapter's
media, roles, or AI-posture declaration, so the committed file tracks what the adapter states.

The `cairnManifest` plugin verifies the file in `buildStart`, on every build. Verification has
two outcomes, not one:

- **The file does not exist.** This is not drift: a site upgrading to the version that introduces
  this contract has no `site-facts.json` until it runs `cairn-manifest`, and no site's `build`
  script runs that command on its own. The build proceeds, and the build log carries one warning
  naming `npx cairn-manifest` as the command that creates the file.
- **The file exists but no longer matches the adapter.** This is drift, and the build fails with
  an error naming the file and the same fix, `npx cairn-manifest`, then committing the result.

## Why a Go program reads it

The `cairn` operator CLI (`tool/`) runs outside any Node or Vite process, so it cannot import a
site's adapter to ask what media bucket it declares or what AI-crawler posture it states. Reading
the committed `site-facts.json` gives it those three values without evaluating any TypeScript.
