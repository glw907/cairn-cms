# Why cairn

This page explains why I wrote cairn in detail. It also explains why you might (or might not) want to use it.

## What cairn is

A fixed set of content concepts you declare (Posts and Pages out of the box, your own beside them), each a directory of markdown files with a frontmatter schema. An admin your site mounts with a handful of files. A commit pipeline: saves hold on a per-entry branch, publishing copies to `main`, and your deploy takes over. One render function, yours, that the editor's preview and your public pages both call. That's the job. Everything a site needs beyond it belongs to you, and cairn serves it with a seam rather than a feature.

## Who is cairn for?

Small organizations, and the developers who help them. I like helping small organizations with their technical problems, and the pattern repeats: a club, a nonprofit, or a small business needs a site its own people can keep current, and one developer stands behind it. Cairn is built for both halves of that arrangement.

## Love your editors

The people who write for a small site are normal human beings, not developers. The git-based CMSes get the storage right, keeping content as plain files in your own repo, but they were built by developers for developers, and they keep asking editors to think in commits, branches, and merge conflicts. For most people who write, that's a bridge too far, and they either give up or hand every edit back to you.

Cairn keeps the version control invisible. Signing in is clicking a link in email. Writing happens in an editor built for prose, in the spirit of iA Writer, with a low-distraction mode and a live preview that renders through the site's own pipeline, so what an editor sees is what readers get. Saving can't destroy anything, because drafts hold on a branch until a deliberate publish, and if two people edit the same entry, cairn refuses the second save rather than merging by guesswork. The editor never hears the words "commit" or "branch." They just write.

## Why markdown and not a WYSIWYG editor?

This is the choice most likely to raise an eyebrow, so it deserves a real answer. The case for WYSIWYG is obvious: everyone has used Word, nobody has to learn anything, and the modern block editors are genuinely slick. It's a long-running debate, and I'm not trying to win it here. Cairn is just an expression of which side of the argument I believe to be the better one.

The problem is that WYSIWYG editors lie a little, and the lies compound. What you see is what the editor renders, not what the site renders, so the page never quite matches the preview. Pasting from Word drags invisible formatting along with it. Authors reach for presentation ("make this big and blue") when a site needs meaning ("this is a heading"), and after a year of that, every page has its own look and someone has to clean it up. (That someone is the developer. See "I'd rather develop than support," below.)

Markdown flips the trade. The author marks meaning (a heading, a list, emphasis) with a few punctuation characters, and the site's design system decides what those things look like, everywhere, consistently. The text stays plain, so it diffs cleanly, survives every tool migration, and reads fine in an email. And the syntax burden is smaller than it sounds: the marks were chosen to look like what they mean (asterisks around a word *look* like emphasis), the toolbar types them for you, and the live preview shows the real page as you go. iA Writer built a beloved writing product on exactly this bet, and cairn borrows it deliberately.

If your editors genuinely need page-layout control, cairn is the wrong tool (see below). For writing posts, pages, and announcements, markdown plus a real preview gets you what WYSIWYG promises, without the mess.

## Why the stack?

Cairn is aggressively opinionated about its development stack, and that's exactly what lets it be a much leaner tool.

### Cloudflare

Nothing else does bulletproof, security-forward hosting at almost no cost. Workers, D1, R2, and Email Sending cover everything a small site needs from one vendor, and a small site's bill rounds to zero (Cloudflare handles roughly 20% of all web traffic, and their free tier isn't a loss leader). That alone wouldn't justify locking to one host. The stronger reason is what refusing portability buys: a host-abstraction layer would be the biggest single abstraction in the codebase, and every abstraction cairn doesn't carry is a seam that can't break. That's the trade. No Cloudflare account, no cairn.

### SvelteKit

The admin runs on form actions that work before JavaScript loads, which is SvelteKit's native grain, and it means an editor on hotel Wi-Fi still gets a working tool. Public pages are server-rendered markdown with islands of interactivity where you declare them, and that's exactly the shape of a content site. The component model the seams speak is the one you already work in. If your team lives in React, pick a different CMS rather than fight the grain.

### DaisyUI, for the admin only

Your public site carries none of this (render is yours). The admin skeleton uses DaisyUI over Tailwind because extending the admin means working in the most copyable idiom on the web instead of learning my bespoke design system. The cost: it's Tailwind's idiom or none. There's no theming API to point the admin at something else.

## Why not use other tools?

A fair question, because good tools do run on Cloudflare, and I've used several of them.

**Sveltia, Decap, and the git-based admins.** The closest family, and the site that taught me the most ran Sveltia before cairn. They get the storage right (content as files in your repo), and Sveltia in particular is fast and light. But they're config-driven dashboards, and that shows up in two ways that matter.

The first is what editors see. A dashboard treats writing as one more form to fill out: a field list (title here, body there, tags in that box), a preview that approximates the site rather than rendering through it, and an interface that looks like database administration because that's what it is. Nobody opens a tool like that and wants to write. Cairn starts from the other end. The editor lands in a markdown surface built for prose, the preview is the real site, and the metadata stays out of the way until you need it. A polished writing tool invites people to actually write.

The second is what happens when the site grows. A club needs sign-ups, a small business needs a booking list, and none of that lives in a content CMS, so you build it somewhere else: a separate route with its own login, its own look, and its own bookmark that half the volunteers lose. Now the newsletter editor works in one tool and the membership coordinator works in another, and you support both. Cairn's answer is one admin. Your screens mount inside it, everyone who runs the site sees a single interface, and adding a feature doesn't add a tool.

**Keystatic.** Thoughtful, and its GitHub mode covers similar ground. It lives in the React, Next, and Astro world, which is the wrong grain for a Svelte shop.

**The hosted headless services (Sanity, Contentful, and friends).** They pair fine with a Cloudflare frontend, and the editing UIs are polished. But your content lives in their database under their pricing, and leaving is an export project. I wasn't willing to make that trade.

**WordPress, Ghost, and the server CMSes.** They don't run on Workers at all. They need a real server somewhere, which brings back exactly the cost and attack surface that moving to Cloudflare removes.

## Built to be built on

I'd rather develop than support, and that shaped cairn as much as anything. The more user-focused the tool, the more of my time goes to development and the less to technical support. I needed a tool that let me get a site started quickly in a Cloudflare environment and then gave me a groundwork for ongoing development, because most of the sites I build have some degree of functionality beyond being a good CMS. And I wanted the people using those sites to see one interface: your own admin screens mount inside cairn's, so the volunteer who publishes the newsletter and the one who manages signups work in the same place, and nobody has to learn a second idiom for the site's other tasks.

The engine's side of that bargain is a narrow public surface, versioned and enforced by gates in CI, which is what makes pulling updates boring: nothing you built on a documented seam breaks without a major version saying so. Your own routes read the signed-in identity through `locals.editor`, so the features you add know who's editing without touching engine internals. The magic-link flow is a default, not a requirement: a developer can replace the auth outright. And leaving is cheap, because your content was plain markdown in your own repo all along. You'd rewire the rendering, but nothing traps the words.

## When you shouldn't use cairn

Cairn is opinionated about most things, and the opinions aren't negotiable. It's the wrong tool if:

- **You don't have (or don't want) a Cloudflare account.** The stack is the product. Cairn won't meet you halfway on hosting.
- **Your team works in React**, or anything that isn't Svelte. That's a grain judgment, not a value judgment: everything from the seams to the starter template assumes Svelte.
- **You need open-ended, user-defined collections.** Cairn's concepts are declared up front, because an engine with opinions about what a Post is can protect editors in ways a generic collection builder can't. If your content model is itself user-generated, you want a different kind of tool.

## Where cairn sits

The nearest comparisons aren't technical. Kirby is honest about serving a developer and an editor at the same time, and cairn shares that goal. Eleventy treats staying small as a feature, and cairn does too. iA Writer takes the act of writing more seriously than any CMS does, and cairn's editor borrows from it openly. None of the three overlap cairn's stack. There are also hosted platforms that do parts of this job well, and cairn deliberately isn't one. You run the hosting, and nothing about your site lives anywhere you don't control.
