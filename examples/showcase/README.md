# cairn showcase

This is Waymark, cairn's starter template: a complete, working cairn site built in the DaisyUI and Tailwind idiom. The engine's own e2e and design suites run against this directory in CI, and it's the companion to [`docs/extend/build-a-site-by-hand.md`](../../docs/extend/build-a-site-by-hand.md): every file that page builds by hand already exists here and runs.

The showcase depends on cairn through the relative `file:../..` path, so it always builds against the engine version in this checkout, not a published release.

## Run it locally

```sh
cd examples/showcase
npm install
npm run dev
```

The admin runs against cairn's development backend, so it needs no GitHub App, database, or email setup. Signing in at `/admin` logs you in directly.

## What to do with it

Read it as the worked example every guide in `docs/` refers back to. Once you have your own site, restyle or replace it however you like. For the rest of the docs, start at [`docs/README.md`](../../docs/README.md).

## Fixture convention

This directory doubles as the source `create-cairn-site` scaffolds from, per
[`docs/extend/what-the-scaffold-wrote.md`](../../docs/extend/what-the-scaffold-wrote.md). A few
files exist only to drive the engine's own tests and never belong in the tree the CLI produces.
`.cairn-template.json`'s `exclude` list keeps them out of that tree. `src/routes/probe-craft` is
the admin design lab, and `src/routes/(site)/+layout.server.ts` is a fixture load returning
`siteLayoutSentinel`, which `e2e/preview.spec.ts` uses to prove what a group layout leaks into a
preview page's payload. The `../../members` traversals a few showcase files carry are fixture-only
too, and they already live in files the exclude list drops.

To add a fixture, put it behind a path the exclude list already covers, or add its path, a
directory or a single file, to `.cairn-template.json`'s `exclude` array. Reach for the
`cairn-template:exclude-start`/`-end` markers, in
[`scripts/build/emit-template.mjs`](../../scripts/build/emit-template.mjs), only when the fixture
is a few lines inside a file the produced site otherwise needs whole. Run `npm run emit:template`
afterward and commit the regenerated `templates/waymark`.
