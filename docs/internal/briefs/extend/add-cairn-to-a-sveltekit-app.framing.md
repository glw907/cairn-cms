# Framing record: `docs/extend/add-cairn-to-a-sveltekit-app.md` introduction

Agent-facing, disposable after the build. Intro round of 2026-10-04 (Geoff: "Adding cairn to a
SvelteKit app isn't the normal path to using cairn. So we need to talk about the 'usual' way and
why this section exists. (Both because somebody might want to do this manually, and because
reading this through helps explain what cairn is doing.)").

## Who arrives, from where, and why

| Reader | Arrives from | Why they came | Knows | Lacks |
|---|---|---|---|---|
| A. Existing-app developer | Search ("add cms to sveltekit"), extend README "Start" | Put cairn's admin into an app they already run | SvelteKit, their app | That the setup command cannot help them (refuses a non-empty dir, f:9slxqf); what pieces cairn adds |
| B. Own-design developer | Front door, extend README | A new cairn site without Waymark | SvelteKit | That the npm package carries no theme or chassis (f:rxj43c), so hand-building is the bare route |
| C. Curious developer or evaluator | Architecture page, after running the setup command, search | Understand what cairn does underneath / what the scaffold wired | Maybe the scaffolded tree | The model: engine as npm package, SvelteKit wiring points, Cloudflare bindings, GitHub App |
| D. Misrouted newcomer | Search, extend README "Start" (this page sits second) | Wants a cairn site, any route | Little | That the setup command is the usual, much easier route (f:kldwss) |

## Background the page rests on

- cairn is embedded in a SvelteKit site on Cloudflare Workers (f:4zpvor, f:i74t7g).
- SvelteKit fit: npm package installed (f:ew4uk7); admin mounted as routes (f:dqe7ij); server hook
  guard (f:f21bcz, f:9xthnq); Vite manifest plugin at build (f:n0laoh).
- Cloudflare fit: D1 auth store (f:u77pea) and Email Sending binding (f:i74t7g).
- GitHub fit: per-site App, publish commits (f:gyu7jc, f:qehbx3).
- The usual route: `npx create-cairn-site` (f:yvfzr2), Waymark starter (f:u705t5, f:rxj43c), App,
  repo, bindings, deploy in one run (f:kldwss).

## Place in the doc set

Second page under "Start", after Architecture (the model in full). The scaffolded-tree page
(Scaffolded site files, 2b) explains the setup command's output; this page is the by-hand twin.
Body milestones already carry the steps; the intro carries the model and the route choice.

## Intro plan

1. Model paragraph: what cairn is, where SvelteKit, Cloudflare, and GitHub each fit. Opens on a
   statement about cairn, never the page.
2. Usual-route paragraph: the setup command, what it does in one run, that it is much easier for
   a new site; link Scaffolded site files.
3. Readers paragraph: why this page exists: existing app (setup command refuses), no Waymark,
   curious reader can read it through.
4. Keep the existing Field Notes, prior-knowledge, milestone list, closing-section line, and
   pointers; add Architecture to the pointers for reader C.
