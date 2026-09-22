# Durable gotchas

Detail moved out of `CLAUDE.md` to keep that file inside its context budget. Each entry below is
pointed to from `CLAUDE.md`; read the relevant one before touching the area it names.

## Cloudflare email

Two surfaces, two error vocabularies; the `E_` table does not cross between them. The binding
`env.EMAIL.send({...})` throws `E_SENDER_NOT_VERIFIED` (the same string Routing uses for an
unverified destination, how the ecxc outage hid); `src/lib/email.ts` parses it. The REST send
(`POST /accounts/{id}/email/sending/send`) throws no `E_` codes: `10203`/`10204` (HTTP 403)
cover an unready sender, never onboarded or still propagating; elapsed time since onboarding is
the only discriminator.

Onboarding is `wrangler email sending enable <domain>` with the zone's apex name (arbitrary
recipients need Workers Paid); it writes DNS records including an apex DMARC at `p=reject`,
which deleting the subdomain leaves behind. Full detail, measured propagation, and every
captured body: `docs/internal/record/2026-08-11-t4b-email-spike.md`.

## Pointing a consumer at unreleased engine work

`npm run link:consumer -- <site-dir>` builds, packs, installs, and verifies; `--restore` puts the
site back on `^<version>` from the registry. A `file:` path cannot merge, so the un-pin has to be
as cheap as the pin.

It exists because `npm pack` derives the tarball name from the version, so re-packing changed code
reuses the filename, and a later plain `npm install` can serve the OLD build from npm's cache while
printing "up to date." The script content-hashes each pack and verifies every installed file
against it.

## A worktree showcase e2e proves MAIN's engine

In a feature worktree, `examples/showcase/node_modules` symlinks back to the main checkout, so
the showcase resolves `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` to MAIN's build, not the
worktree's, silently proving the wrong engine until a from-scratch `npm install` in the
worktree's showcase repoints both `file:` deps. The adjacent stale-`dist` trap is closed
structurally by the showcase's `pretest:e2e` repackage hook; the symlink half is not. Reinstall
before trusting a worktree e2e, or rely on CI's real checkout.

## CI-canonical baselines this workstation cannot reproduce

The visual baselines are CI-canonical (`e2e.yml`'s `update_snapshots` regen commits them). After
a regen, this workstation's Chromium renders a few surfaces a few pixels differently (chassis-B2:
the 20 home and archive2 files from `4de378ec`), so a local `CI=1 test:e2e` fails on exactly
those files and cannot go green without committing a locally biased baseline, which is
forbidden. A local gate is green when its only visual failures are exactly the files the latest
regen commit rewrote; anything else is a real red. Lasting fix, a ROADMAP chore: pin the local
e2e to the runner's Chromium build and fonts, or run it in a matching container.

## Vite 8 ships TypeScript in dist `.svelte`

Vite 8 / Rolldown parses dist `.svelte` `<script lang="ts">` as JavaScript before the consumer's
Svelte plugin runs, so shipped TypeScript fails the consumer build. The post-package step
`scripts/build/transpile-dist-svelte.mjs` (wired into `package`) transpiles each dist `<script>`
body and KEEPS the `lang="ts"` tag (the markup still carries TS the Svelte compiler must parse).
Do not remove the step or strip `lang="ts"`. Full post-mortem:
[`docs/internal/record/2026-06-21-e2e-dist-svelte-build-failure.md`](record/2026-06-21-e2e-dist-svelte-build-failure.md).
