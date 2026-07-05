# cairn showcase

This is Waymark, cairn's starter template: a complete, working cairn site built in the DaisyUI and Tailwind idiom. The engine's own e2e and design suites run against this directory in CI, and it's the companion to [`docs/tutorial/build-your-first-cairn-site.md`](../../docs/tutorial/build-your-first-cairn-site.md): every file the tutorial builds by hand already exists here and runs.

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
