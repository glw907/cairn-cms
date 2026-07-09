# Iterate your design locally

Redesigning a live cairn site the naive way means deploying every tweak to see it: push, wait for
the build, reload the real URL, repeat. This guide covers the faster loop: run the site locally
against real content and real media, watch the change appear under `vite dev`, and deploy once at
the end. It works whether you're driving the loop yourself or through an AI coding agent like
Claude Code; either way, the tightening comes from the same thing, cutting deploy latency out of
every single tweak.

The worked example throughout is taking [Waymark](./make-waymark-your-own.md), cairn's starter
template, and making it your own: swapping the palette, the type, the flourishes, against your
site's actual posts and images rather than placeholder content. The same loop applies to any
design change on any cairn site, a token swap, a new component, a layout rework.

## What you need first

A cairn site that's already deployed, with real content and at least a few media objects in its
library. This guide assumes you're iterating an existing site's design, not building one from
scratch; if you don't have a site yet, work through [the
tutorial](../tutorial/build-your-first-cairn-site.md) or copy
[`examples/showcase`](../../examples/showcase/README.md) first, deploy it, and add some content.

Clone the site's repository and install its dependencies:

```bash
git clone <your-site-repo>
cd <your-site-repo>
npm install
```

The markdown content and the committed media manifest come along with the clone, so the public
pages render locally with no further setup. Images don't: they live in R2, not git, so the next
step brings them local too.

## Seed local media once

`vite dev` runs your site's Worker locally, including a local simulator for the R2 bucket the
media route reads from. A fresh clone's local bucket starts empty, so every image request fails with a 404 until you
seed it. [`cairn-media-seed`](../reference/cli-cairn-media-seed.md) does that in one pass, pulling
every object your committed manifest lists from the deployed site into local R2 state:

```bash
npx cairn-media-seed --from https://your-site.com
```

If the site sits behind Cloudflare Access or another auth gate, pass the credential as a header
on every download:

```bash
npx cairn-media-seed --from https://staging.your-site.com \
  --header 'CF-Access-Client-Id: <id>' \
  --header 'CF-Access-Client-Secret: <secret>'
```

Run this once per session. Re-run it later only if the deployed library has gained objects you
want locally too; it's idempotent, so a re-run just overwrites the same keys with the same bytes.

## Start the dev server

```bash
npm run dev
```

This is `vite dev` under a site built with `@sveltejs/adapter-cloudflare`, so it simulates the
Cloudflare bindings, including the R2 bucket you just seeded, without a real deploy. Open the
origin it prints; every page now renders with your site's real content and real images.

## The loop

Each iteration is a small, testable change followed by a look. Keep changes small enough that a
verdict, keep it, revert it, or push it further, is obvious from one look.

1. **Make the change.** Edit `theme.css`, a component, or a layout file. `vite dev`'s hot module
   reload picks it up without a manual reload.
2. **Watch the terminal running `vite dev`.** A hot-reload failure or a console error shows there
   first, before it shows in the browser. For a pure CSS or copy tweak, that's the only check you
   need; your own eyes on the live tab are the rest of the gate.
3. **For a structural change** (a new wrapper element, a conditional render, anything touching
   markup shape rather than just style), run the file's own test if one exists and glance at the
   rendered DOM. Structural bugs hide behind a page that looks right at a glance but breaks in a
   state you didn't check.
4. **Decide.** Keep it, revert it (`git checkout` the file, or undo the edit), or iterate further
   on the same change. A kept change is worth its own small commit; commits are your undo log
   here, not ceremony, so there's no need to batch several tweaks into one.

Skip the full test suite, the linter, and any packaging step on every tweak. None of them catch a
design judgment call, and running them per iteration is the exact latency this loop exists to cut.
Save that gate for once, at the end.

Every several iterations, or before you'd call the design ready, step back and look at the whole
page rather than the one element you were just tuning. A change that reads right in isolation can
throw off the page around it, spacing that no longer lines up, a color that clashes with a
neighboring section. Check a narrow viewport and a wide one; cairn's own design work holds to a
five-viewport standard (320, 390, 768, 1440, 2560) for exactly this reason.

## Ship once

When the design is settled, run the site's full checks the way you would for any other change,
`npm run check`, the test suite, and whatever the site's own CI expects, then commit, push, and
deploy as usual. See [Deploy to Cloudflare](./deploy-to-cloudflare.md) if the site isn't wired for
deploys yet. After the deploy, load the live site once and confirm it matches what you saw
locally; the local R2 simulator and the real bucket hold the same objects, so nothing about the
media should differ.

## See also

- [Make Waymark your own](./make-waymark-your-own.md) for the token seam this loop is built to
  exercise fast, the single file most design changes touch.
- [The `cairn-media-seed` CLI](../reference/cli-cairn-media-seed.md) for the flags, the bucket
  resolution rule, and the manifest shape it reads.
- [Cloudflare readiness](./cloudflare-readiness.md) and [Deploy to
  Cloudflare](./deploy-to-cloudflare.md) for the deploy this loop defers until the end.
