# create-cairn-site

Scaffold a branded [cairn](https://github.com/glw907/cairn-cms) site from the Waymark starter
theme and run it locally.

## Usage

```
npm create cairn-site
```

The command requires Node.js 22 or later, tracking the `@glw907/cairn-cms` engine's own floor.

## Status

Only the local scaffold half exists today. The command does not yet create a GitHub repository,
provision Cloudflare, or configure email; those arrive in a later release. Once scaffolded, you
run the site locally with `npm run dev` and sign in to `/admin` against the local dev backend.
