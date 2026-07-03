# Why cairn

This page explains why I wrote cairn in detail. It also explains why you might (or might not) want to use it.

## What cairn is

A fixed set of content concepts you declare (Posts and Pages out of the box, your own beside them), each a directory of markdown files with a frontmatter schema. An admin your site mounts with a handful of files. A commit pipeline: saves hold on a per-entry branch, publishing copies to `main`, and your deploy takes over. One render function, yours, that the editor's preview and your public pages both call. That's the job. Everything a site needs beyond it belongs to you, and cairn serves it with a seam rather than a feature.

## Who is cairn for?

Small organizations, and the developers who help them. I like helping small organizations with their technical problems, and the pattern repeats: a club, a nonprofit, or a small business needs a site its own people can keep current, and one developer stands behind it. Cairn is built for both halves of that arrangement.

## Love your editors

The people who write for a small site are normal human beings, not developers. The git-based CMSes get the storage right, keeping content as plain files in your own repo, but they were built by developers for developers, and they keep asking editors to think in commits, branches, and merge conflicts. For most people who write, that's a bridge too far, and they either give up or hand every edit back to you.

Cairn keeps the version control invisible. Signing in is clicking a link in email. Writing happens in an editor built for prose, in the spirit of iA Writer, with a low-distraction mode and a live preview that renders through the site's own pipeline, so what an editor sees is what readers get. Saving can't destroy anything, because drafts hold on a branch until a deliberate publish, and if two people edit the same entry, cairn refuses the second save rather than merging by guesswork. The editor never hears the words "commit" or "branch." They just write.

## Why the stack?

### Cloudflare

Nothing else does bulletproof, security-forward hosting at almost no cost. Workers, D1, R2, and Email Sending cover everything a small site needs from one vendor, and a small site's bill rounds to zero. That alone wouldn't justify locking to one host. The stronger reason is what refusing portability buys: a host-abstraction layer would be the largest single abstraction in the codebase, and every abstraction cairn doesn't carry is a seam that can't break. The cost is plain. No Cloudflare account, no cairn.

### SvelteKit

The admin is built on form actions that work before JavaScript loads, which is SvelteKit's native grain, and it means an editor on hotel Wi-Fi still has a working tool. Public pages are server-rendered markdown with islands of interactivity where you declare them, which is the shape of a content site. And the component model the seams speak is the one you already work in. A React team should pick a different CMS rather than fight this.

### DaisyUI, for the admin only

Your public site carries none of this, since render is yours. The admin skeleton uses DaisyUI over Tailwind because extending it means working in the most copyable idiom in the ecosystem instead of learning a bespoke design system. The cost: it's Tailwind's idiom or none. There is no theming API to adapt the admin to some other system.

## Built to be built on

I'd rather develop than support, and that shaped cairn as much as anything. I needed a tool that let me get a site started quickly in a Cloudflare environment and then gave me a groundwork for ongoing development, because most of the sites I build have some degree of functionality beyond being a good CMS. And I wanted the people using those sites to see one interface: your own admin screens mount inside cairn's, so the volunteer who publishes the newsletter and the one who manages signups work in the same place, and nobody has to learn a second idiom for the site's other tasks.

The engine's side of that bargain is a narrow public surface, versioned and enforced by gates in CI, which is what makes pulling updates boring: nothing you built on a documented seam breaks without a major version saying so. Your own routes read the signed-in identity through `locals.editor`, so the features you add know who's editing without touching engine internals. The magic-link flow is a default, not a requirement: a developer can replace the auth outright. And leaving is cheap, because your content was plain markdown in your own repo all along. You'd rewire the rendering, but nothing traps the words.

## Who should not choose cairn

- Teams without (or against) a Cloudflare account. The stack is the product, and cairn won't meet you halfway on hosting.
- React shops, or any team not working in Svelte. This is a grain judgment, not a value judgment. Everything from the seams to the starter template assumes Svelte.
- Sites that need open-ended, user-defined collections. Cairn's concepts are declared up front, because an engine with opinions about what a Post is can protect editors in ways a generic collection builder can't. If your content model is itself user-generated, you want a different kind of tool.

## Where cairn sits

The nearest comparisons aren't technical. Kirby is honest about serving a developer and an editor at the same time, and cairn shares that goal. Eleventy treats staying small as a feature, and cairn does too. iA Writer takes the act of writing more seriously than any CMS does, and cairn's editor borrows from it openly. None of the three overlap cairn's stack. There are also hosted platforms that do parts of this job well, and cairn deliberately isn't one. You run the hosting, and nothing about your site lives anywhere you don't control.
