# cairn showcase

This is Waymark, cairn's starter template: a complete, working cairn site built in the DaisyUI and Tailwind idiom. The engine's own e2e and design suites run against this directory in CI.

The showcase depends on cairn through the relative `file:../..` path, so it always builds against the engine version in this checkout, not a published release.

## Run it locally

```sh
cd examples/showcase
npm install
npm run dev
```

The admin runs against cairn's development backend, so it needs no GitHub App, database, or email setup. Signing in at `/admin` logs you in directly.

## What to do with it

Read it as the worked example. Once you have your own site, restyle or replace it however you like. For the contracts it uses, start at [`docs/reference/README.md`](../../docs/reference/README.md).

## Fixture convention

This directory doubles as the source `create-cairn-site` scaffolds from. A few
files exist only to drive the engine's own tests and never belong in the tree the CLI produces.
`.cairn-template.json`'s `exclude` list keeps them out of that tree. `src/routes/probe-craft` is
the admin design lab, and `src/routes/(site)/+layout.server.ts` is a fixture load returning
`siteLayoutSentinel`, which `e2e/preview.spec.ts` uses to prove what a group layout leaks into a
preview page's payload. The `../../members` traversals a few showcase files carry are fixture-only
too, and they already live in files the exclude list drops. The exclude list also drops the
thirteen `src/content/posts/2025-*.md` posts, kept out not as fixtures but so a site
`create-cairn-site` produces ships fourteen sample posts instead of the engine's larger
development set.

To add a fixture, put it behind a path the exclude list already covers, or add its path, a
directory or a single file, to `.cairn-template.json`'s `exclude` array. Reach for the
`cairn-template:exclude-start` / `cairn-template:exclude-end` markers, in
[`scripts/build/emit-template.mjs`](../../scripts/build/emit-template.mjs), only when the fixture
is a few lines inside a file the produced site otherwise needs whole. Run `npm run emit:template`
afterward and commit the regenerated `templates/waymark`.
