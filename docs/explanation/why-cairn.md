# Why cairn

This page explains why I wrote cairn in detail. It also explains why you might (or might not) want to use it.

## What cairn is

Cairn is a SvelteKit library that turns a repo of markdown files into a site your editors can manage from the browser. You declare your content as concepts (Posts and Pages ship with it, and you can add your own), and each concept is a directory of markdown files with a typed frontmatter schema. The admin mounts as a catch-all route and a layout pair inside your own app. When an editor saves, cairn commits the markdown to a branch named for the entry, and when they publish, it copies the entry to `main` and your normal deploy takes it from there. Rendering is one function your site provides, and both the editor's preview and your public pages call it. That's the whole job. Everything a site needs beyond it is your code, and cairn's seams exist so your code can plug in without touching engine internals.

## Who is cairn for?

Cairn is for small organizations, and for the developers who help them. I like helping small organizations with their technical problems, and the pattern repeats: a club, a nonprofit, or a small business needs a site its own people can keep current, and one developer stands behind it. Cairn is built for both halves of that arrangement.

### For editors

The people who write for a small site are normal human beings, not developers. Content wants to live in git (plain files, history, attribution), but asking editors to actually use git, with its commits, branches, and merge conflicts, is a bridge too far for most people who write, and they either give up or hand every edit back to you.

Cairn keeps the version control invisible. Signing in is clicking a link in email. Writing happens in an editor built for prose (in the spirit of iA Writer, with a low-distraction mode), and the preview renders through the site's own pipeline, so what an editor sees is what readers get. A save can't destroy anything, because drafts hold on a branch until a deliberate publish, and if two people edit the same entry, cairn refuses the second save rather than merging by guesswork. The editor just writes, and never hears the word "commit."

### For developers

Cairn is a developer's tool as much as an editor's. A new site starts quickly (the starter template plus a few steps of wiring), whatever you build next to it stays yours, and pulling updates is boring on purpose, because the public surface is narrow and checked by gates. The admin is a scaffold you extend in place rather than a black box you work around. And it contains very real developer affordances: a fully typed adapter (your content schema typechecks), a doctor command that diagnoses a misconfigured site, structured logs for every operationally meaningful event, and a local dev backend so you can build without touching real GitHub. The details are in [Built to be built on](#built-to-be-built-on), below.

## Why the stack?

Cairn is aggressively opinionated about its development stack, and that's exactly what lets it be a much leaner tool. The choices also aren't independent: cairn starts from the premise that Cloudflare is a great hosting platform, and each choice after that follows from working within the limits of the one before it.

### Cloudflare

Nothing else does bulletproof, security-forward hosting at almost no cost. Workers, D1, R2, and Email Sending cover everything a small site needs from one vendor, and a small site's bill rounds to zero (Cloudflare handles roughly 20% of all web traffic, and at that scale a small site is a rounding error, which is why their free tier isn't a loss leader). That alone wouldn't justify locking to one host. The stronger reason shows up in the code: a host-abstraction layer would be the biggest single abstraction in the codebase, and every abstraction cairn doesn't carry is code that can't break. The trade is that cairn runs on Cloudflare or not at all. And the premise sets the terms for everything downstream: Workers run JavaScript and TypeScript, so the rest of the stack has to live there. (I'd write cairn in Python or Go if I could, but that's not a viable option given Cloudflare.)

### SvelteKit

Only options that run on Cloudflare are candidates at all. Within that field, and because cairn was a greenfield project with no legacy to serve, the right move was to pick the framework developers actually love, and by that measure Svelte and SvelteKit have sat at or near the top of the developer surveys for years. The admin is built on form actions, so every editor operation works as a plain HTML form before hydration. Content pages are what SvelteKit's server rendering exists for, the islands cairn renders into your markdown hydrate as ordinary Svelte components, and the seams speak the idiom you already work in: props, snippets, `locals`.

### DaisyUI

DaisyUI follows because it shares SvelteKit's less-is-more philosophy: components as plain class names, no runtime, nothing to configure before you can use it. It's the idiom of the admin skeleton and the starter template both, so extending either means working in the most copyable idiom on the web instead of learning my bespoke design system. Your public site isn't locked to it (render is yours, and the template is built to be restyled), but the scaffold you start from speaks DaisyUI throughout, although you could certainly build your own template without it. The admin skeleton is the one place the idiom is fixed: extending it means Tailwind's idiom or none, since there's no theming API to point it at another system.

### Storage, by fit

The same logic picks the storage: the best store for each thing. Git is perfect for markdown site content, which wants exactly what git gives away for free: versions, attribution, review, and a deploy hook. What could be better? Auth is a different need entirely. Magic links want short-lived tokens and session rows a Worker can check in a few milliseconds, and that's what D1 is adapted to, while the sign-in mail itself goes out through Cloudflare's Email Sending, so even the mail needs stay on the platform. Media bytes are big and immutable, so they land in R2, with only their references living in git.

## Why markdown and not a WYSIWYG editor?

Mostly because a website is not a document. Plenty of great prose gets written in Word, and for a standalone document, where the author owns the presentation, WYSIWYG is the right tool. A site is different: presentation belongs to the design system, and an editor that invites presentational choices hands authors a decision the site's design system already owns. It's a long-running argument that I'm not trying to win here. Cairn is an expression of which side of the argument I believe to be the better one.

On a site, WYSIWYG content drifts: pasted formatting rides along, and authors make presentational choices ("make this big and blue") where the design system expects structure ("this is a heading"). Reconciling the two becomes developer work over time. Choosing markdown is choosing the other trade.

That trade has an academic pedigree. Document engineering has argued since the Scribe and SGML work of the late seventies that separating a text's logical structure from its presentation makes documents more consistent and more reusable, because appearance is decided once, centrally, rather than at every paragraph. Computational academia converged on plain-text authoring for its own reasons: version control operates on lines of text, so plain text is the one authoring format for which "what changed" has an exact, automatically computable answer. Preservation practice points the same way, since the criteria archives actually use (simplicity, self-documentation, freedom from rendering dependencies) favor plain text by degree over even standardized rich formats. Markdown is the lightweight end of that tradition.

Markdown separates two decisions that WYSIWYG collapses into one: the author decides what something is (a heading, a list, emphasis), and the site decides, once and for everything, how such things look. It's the old separation of content from presentation, enforced at the point of writing rather than promised in a style guide. The marks look like what they mean (asterisks around a word *look* like emphasis), the toolbar types them for you, and cairn includes a friendly cheat-sheet for the rest. A little investment in markdown frees writers up to focus on writing and not layout.

If your editors need page-layout control, cairn is the wrong tool. For writing posts, pages, and announcements, it isn't a hardship, and the live preview gives editors most of what they would want WYSIWYG for.

## Why not use other tools?

Good tools do run on Cloudflare, and I've used several of them.

**Sveltia, Decap, and the git-based admins.** These are the closest tools to what cairn does, and I ran Sveltia myself before building cairn. They get the storage right (content as files in your repo), and Sveltia in particular is fast and light. But all of them are config-driven dashboards at heart, and that shapes how they feel to use.

A dashboard treats writing as one more form to fill out: a field list (title here, body there, tags in that box), a preview that approximates the site rather than rendering through it, and an interface built for administering records, because that's what it's doing. Nobody opens a tool like that and wants to write. Cairn starts from the other end. The editor lands in a markdown surface built for prose, the preview is the real site, and the metadata stays out of the way until you need it. A polished writing tool invites people to actually write.

And when the site grows past content editing, the dashboards don't have anywhere for that to go. A club needs sign-ups, a small business needs a booking list, and none of that lives in a content CMS, so you build it somewhere else: a separate route with its own login, its own look, and its own bookmark that half the volunteers lose. Now the newsletter editor works in one tool and the membership coordinator works in another, and you support both. Cairn's answer is to keep everything in one admin: your screens mount inside it, so everyone who runs the site sees a single interface, and adding a feature doesn't mean adding a tool.

**Keystatic.** Keystatic is thoughtful, and its GitHub mode covers similar ground. It lives in the React, Next, and Astro world, which is the wrong grain for a Svelte shop.

**The hosted headless services (Sanity, Contentful, and friends).** They pair fine with a Cloudflare frontend, and the editing UIs are polished. But your content lives in their database under their pricing, and leaving is an export project. I wasn't willing to make that trade.

**WordPress, Ghost, and the server CMSes.** They don't run on Workers at all. They need a real server somewhere, which brings back exactly the cost and attack surface that moving to Cloudflare removes.

## Built to be built on

I'd rather develop than support, and that shaped cairn as much as anything. The more user-focused the tool, the more of my time goes to development and the less to technical support. I needed a tool that let me get a site started quickly in a Cloudflare environment and then gave me a groundwork for ongoing development, because most of the sites I build have some degree of functionality beyond being a good CMS. And I wanted the people using those sites to see one interface: your own admin screens mount inside cairn's, so the volunteer who publishes the newsletter and the one who manages signups work in the same place, and nobody has to learn a second idiom for the site's other tasks.

The engine's side of that bargain is a narrow public surface, checked by gates in CI, so nothing you built on a documented seam breaks without a major version saying so. Your own routes read the signed-in identity through `locals.editor`, and the magic-link flow is only a default (a developer can replace the auth outright). And your content was plain markdown in your repo all along, so leaving cairn means rewiring the rendering, not rescuing the words.

## Where cairn sits

The nearest comparisons aren't technical. Kirby is honest about serving a developer and an editor at the same time, and cairn shares that goal. Eleventy treats staying small as a feature (cairn does too). iA Writer takes the act of writing more seriously than any CMS, and cairn's editor borrows from it openly, though none of the three overlap cairn's stack. There are also hosted platforms that do parts of this job well, and cairn deliberately isn't one. You run the hosting, and nothing about your site lives anywhere you don't control.

## Why not cairn?

Cairn is opinionated about most things, and the opinions aren't negotiable. It's the wrong tool if:

- **You don't have (or don't want) a Cloudflare account.** The stack is the product. Cairn won't meet you halfway on hosting.
- **Your team works in React**, or anything that isn't Svelte. That's a grain judgment, not a value judgment: everything from the seams to the starter template assumes Svelte.
- **You need open-ended, user-defined collections.** Cairn's concepts are declared up front, because an engine with opinions about what a Post is can protect editors in ways a generic collection builder can't. If your content model is itself user-generated, you want a different kind of tool.
