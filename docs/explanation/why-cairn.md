# Why cairn

Cairn exists for two people at once. The developer installs a library and keeps every route,
template, and byte of CSS. The editor gets a writing surface behind an emailed sign-in link,
with a live preview of the real site. Most tools pick one of these people and make the other
suffer. I wanted both served well, and everything else about cairn follows from that.

The same design reads two ways, and both are intended. For a basic content-managed site,
cairn plus its starter template is close to the whole job, and for many sites that's
legitimately the finish line. For a site that will grow, cairn is a foundation: the seams are
documented and narrow, the template is built to be restyled rather than fought, and your own
routes and data live beside the engine without touching it.

## What cairn is

A fixed set of content concepts you declare (Posts and Pages out of the box, your own beside
them), each a directory of markdown files with a frontmatter schema. An admin your site
mounts with a handful of files. A commit pipeline: saves hold on a per-entry branch,
publishing copies to `main`, and your deploy takes over. One render function, yours, that the
editor's preview and your public pages both call. That's the job. Everything a site needs
beyond it belongs to you, and cairn serves it with a seam rather than a feature.

## Who it serves

The developer keeps ownership in the ways that matter. The public surface is narrow,
versioned, and enforced by gates, so pulling updates doesn't rework your site. When you need
what cairn doesn't do (your own data, your own auth outside the admin, whole subsystems), you
build it beside the engine, and the seams are documented contracts rather than internals you
hope stay still. Leaving is cheap because your content was markdown in your repo all along.

The editor gets a tool that respects the work. Signing in is clicking a link in email.
Writing is markdown in an editor built for prose, with the site's real rendering as the
preview. Saving can't destroy anything, because edits hold on a branch until a deliberate
publish, and if two people collide, cairn refuses the save rather than merging by guesswork.

## Why Cloudflare

Nothing else does bulletproof, security-forward hosting at almost no cost. Workers, D1, R2,
and Email Sending cover everything a small site needs, from one vendor, at prices that round
to zero for small-site traffic. That alone wouldn't justify locking to one host. The stronger reason is what refusing portability buys: a host-abstraction layer would
be the largest single abstraction in the codebase, and every abstraction cairn doesn't carry
is a seam that can't break. The cost is plain. No Cloudflare account, no cairn.

## Why SvelteKit

The admin is built on form actions that work before JavaScript loads, which is SvelteKit's
native grain, and it means an editor on hotel Wi-Fi still has a working tool. Public pages are
server-rendered markdown with islands of interactivity where you declare them, which is the
shape of a content site. And the component model the seams speak is the one you already work
in. A React team should pick a different CMS rather than fight this.

## Why DaisyUI, for the admin only

Your public site carries none of this, since render is yours. The admin skeleton uses DaisyUI
over Tailwind because extending it means working in the most copyable idiom in the ecosystem
instead of learning a bespoke design system. The cost: it's Tailwind's idiom or none. There
is no theming API to adapt the admin to some other system.

## Who should not choose cairn

- Teams without (or against) a Cloudflare account. The stack is the product, and cairn won't
  meet you halfway on hosting.
- React shops, or any team not working in Svelte. This is a grain judgment, not a value
  judgment. Everything from the seams to the starter template assumes Svelte.
- Sites that need open-ended, user-defined collections. Cairn's concepts are declared up
  front, because an engine with opinions about what a Post is can protect editors in ways a
  generic collection builder can't. If your content model is itself user-generated, you want
  a different kind of tool.

## Where cairn sits

If you know the neighborhood: cairn aims for the point where Kirby's two-persona honesty,
Eleventy's leanness creed, and iA Writer's respect for the act of writing intersect, on the
one stack it refuses to abstract away. There was also a hosted-platform road this project
deliberately didn't take. The price of that choice is that hosting is yours; the payoff is
that nothing about your site lives anywhere you don't control.
