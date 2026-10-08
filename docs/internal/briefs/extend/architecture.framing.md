# Framing: architecture (intro round, 2026-10-04)

Agent-facing. Drives the introduction of `docs/extend/architecture.md` only; the body is fixed.

## Readers, where they come from, what they want

- **Evaluator.** Svelte-fluent developer comparing cairn with other CMSs. Arrives from the root
  README, `docs/why-cairn.md`, cairn.pub, or a search for "cairn architecture". Knows SvelteKit;
  does not know whether cairn is a hosted service, a separate app, or a library, nor what it
  locks a site into (SvelteKit, Cloudflare, GitHub) or how stable its surface is. Wants: the
  general model first, then what the boundary commits a site to. Reads end to end.
- **Inheritor.** Developer holding a site the setup command scaffolded (the usual path:
  `create-cairn-site` makes the App, repo, bindings, and deploy in one run, `f:kldwss`). Arrives
  from the extend README's "Start" group or from Scaffolded site files. Knows the files exist;
  lacks which of them are engine contracts and which are theirs. Wants: a map from files to
  import points, seams, stores, and the promise an upgrade keeps.
- **Extender in flight.** Arrives by link from a task page (custom admin screen, security model,
  replace magic links) to place one seam in the whole. Wants the seams table and the tiers; the
  intro only has to tell them the page holds the whole picture.

## Background the page rests on (and the old intro lacked)

- cairn is an embedded CMS: an npm package inside the site's own SvelteKit app, running in the
  site's one Cloudflare Worker, no CMS server (`f:4zpvor`, new `f:j0ut9n`).
- Where SvelteKit fits: the admin and public pages are the site's route files, their load
  functions and actions supplied by the engine's factories (`f:j0ut9n`).
- Where Cloudflare fits: the Worker host, plus D1 for sign-in rows and R2 for media bytes
  (`f:i74t7g`, `f:pgy0mr`).
- Where GitHub fits: content is markdown in git; a publish is a commit through the site's App,
  which triggers the site's existing deploy (`f:djoxr9`, `f:cjonmm`).
- Why the boundary exists: cairn owns content and the admin frame, the rest is the developer's,
  reached through a narrow versioned surface (`f:99f221`, `f:bhyvqg`, `f:gknz29`).

## Place in the doc set

The extend track's concept anchor, first under "Start". Task pages link here for the whole;
this page links out to them for each seam. Its sibling start page (add cairn by hand) builds the
same model file by file.

## Intro plan

1. Model paragraph, opening on a statement of what cairn is: embedded, npm package in the
   site's SvelteKit app, one Worker; markdown in git, publish = App commit -> deploy; D1 and R2
   hold the rest.
2. Boundary paragraph: the existing three contract sentences (unchanged wording, own facts).
3. Readers paragraph: evaluator's question, inheritor's question (setup command already wired
   it; Scaffolded site files maps each file), each answered by the same subjects; leads into
   the covers list.
4. Covers list, prior-knowledge + out-of-scope list, definition paragraph: unchanged.
