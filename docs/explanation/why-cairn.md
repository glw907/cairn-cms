# Why cairn

Cairn exists for two people at once. The developer gets a thin engine they install as a
library: every route, template, and byte of CSS stays theirs, and the engine's job ends at
managing markdown content and the editor's admin. The editor gets a quiet writing surface
behind an emailed sign-in link: no GitHub account, no password, no dashboard—markdown with a
live preview, a Save that holds, and a Publish that means something. Most tools pick one of
these people and make the other suffer. Cairn's charter is to serve both, and everything else
about it follows from that.

That charter reads two ways, and both are the product. Read from the simple end, cairn plus
its starter template is close to the whole job: a clean, professional content-managed site,
running quickly, that for many sites is legitimately the finish line. Read from the growing
end, cairn is a foundation: thin documented seams, a token-driven template you can take
anywhere visually, and a build-alongside model that lets your own routes, data, and domain
logic live next to the engine without touching it. Wayfinder, the starter template, is where
you can see this in thirty seconds instead of an afternoon—the same template is both a
finished look and a substrate designed to be redirected.

## What cairn is

A fixed set of content concepts you declare (Posts and Pages out of the box, your own beside
them), each a directory of markdown with a frontmatter schema. An admin your site mounts with
a handful of files. A commit pipeline: saves hold on a per-entry branch, Publish copies to
`main`, your deploy takes over. One `render` function—yours—that both the editor's preview
and your public pages call. That's the job. Everything a site needs beyond it belongs to you,
and cairn serves it with a seam, not a feature.

## Who it serves

**The developer who owns everything.** You install a package, not a platform. The public
surface is narrow, versioned, and enforced by gates, so pulling updates doesn't rework your
site. When you need what cairn doesn't do—your own data, your own auth outside the admin,
whole subsystems—you build them beside the engine, and the seams (a custom admin screen, the
identity hand-off, the token layer) are documented contracts, not internals you hope stay
still. Leaving is cheap by design: your content was markdown in your repo all along.

**The editor who deserves a good tool.** Signing in is clicking a link in email. Writing is
markdown in an editor built for prose, with the site's real rendering as the preview. Saving
can't destroy anything—edits hold on a branch until a deliberate Publish—and if two people
collide, cairn refuses the save rather than merging by guesswork. There's no cPanel energy
anywhere: the admin is quiet, fast, and shaped like the work.

## Why this stack

**Why Cloudflare.** Workers, D1, R2, and Email Sending are a complete substrate for a small
site from one vendor at small-site prices, and cairn uses them directly. The deeper reason is
what cairn refuses: a portability layer over "any host" would be the largest abstraction in
the codebase, and every abstraction cairn doesn't carry is a seam that can't break. The cost
is real and stated plainly: no Cloudflare account, no cairn.

**Why SvelteKit.** The admin is built on form actions that work before JavaScript loads,
which is SvelteKit's native grain—an editor on a bad connection still gets a working tool.
Public pages are server-rendered markdown with islands of interactivity where you declare
them, which is exactly the shape of a content site. And the component model the engine's
seams speak is the one you already work in. The cost, equally plain: a React team should
look elsewhere rather than fight the grain.

**Why DaisyUI, for the admin only.** Your public site carries none of this—`render` is yours.
The admin skeleton uses DaisyUI over Tailwind so that extending it means working in the most
copyable idiom in the ecosystem instead of learning a bespoke design system. The cost: it's
Tailwind's idiom or none; there's no theming API to adapt it to some other system.

## Who should not choose cairn

- **Teams without (or against) a Cloudflare account.** The stack is the product. Cairn won't
  meet you halfway on hosting, and pretending otherwise would cost everyone the leanness
  that makes it good.
- **React shops.** Not a value judgment—a grain judgment. Everything from the seams to the
  starter template assumes Svelte.
- **Sites that need open-ended, user-defined collections.** Cairn's content model is a fixed
  set of concepts declared up front, because an engine with opinions about what a Post is
  can protect editors in ways a generic collection builder can't. If your content model is
  itself user-generated, you want a different kind of tool.

## Where cairn sits

If you know the neighborhood: cairn aims for the point where Kirby's two-persona honesty,
Eleventy's leanness creed, and iA Writer's respect for the act of writing intersect—on the
one stack it refuses to abstract away. There's also a hosted-platform road this project
deliberately didn't take; the price of that choice is yours to host, and the payoff is that
nothing about your site lives anywhere you don't control.
