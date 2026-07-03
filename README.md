# cairn

Cairn is my embedded CMS and admin-interface scaffold for [SvelteKit](https://svelte.dev/docs/kit) sites on [Cloudflare](https://www.cloudflare.com/). It's an open source project: free code that (hopefully) helps people.

I built cairn for my own sites. I host everything on Cloudflare, because nothing else does bulletproof, security-forward hosting at almost no cost, but unfortunately committing to Cloudflare limits your choice of tools. The git-based CMSes that remain get the storage right, keeping content as plain files in your own repo, but they still ask editors to think in git, and for normal human beings who write, that's a bridge too far. I wanted the people who write content for sites to get a tool that takes their writing seriously and keeps the version control invisible.

## Love your editors!

Cairn gives non-technical content editors a first-class writing experience with all the modern affordances: a markdown editor built for prose in the spirit of [iA Writer](https://ia.net/writer), a live preview that renders through the same function as your public pages (so editors see exactly what ships), focus, typewriter, and Zen modes, a spellchecker with a per-site dictionary, and an optional AI copy-edit (tidy, built on [Claude](https://www.anthropic.com/claude)) that proposes fixes and never rewrites quietly. Editors sign in from an emailed link (no GitHub account, no password), and cairn exposes the signed-in identity to your own routes, so what you build next to cairn knows who's editing. The magic-link flow is a default, not a requirement: a developer can replace the auth outright. The editors' own front door is [Welcome, editors](./docs/guides/editor-welcome.md).

## Content storage and types

Behind the editor, cairn stores all site content as markdown committed to the site's own GitHub repo, but in no way requires editors to understand git or version control. Saves go to a holding branch, one per entry, and a conflicting edit is refused rather than merged by guesswork. Publishing copies the entry to `main` with the editor as commit author, and from there the site deploys like any other push. (The default magic-link authentication requires a small D1 database.)

Content is a fixed set of concepts you declare. Posts and Pages are available out of the box, and you can add others if you need them, each with a typed frontmatter schema. Inside the markdown, content components render through [remark](https://github.com/remarkjs/remark) directives, the accepted way of extending markdown with richer structures: the starter set covers callouts, alerts, an inline icon, pull quotes, CTAs, FAQs, video, and an expiring announcement banner, each with a schema-driven insert form in the editor, and you declare your own the same way. Figures are built into the engine itself.

## Small is beautiful

Most of the sites I build have some degree of functionality beyond being a good CMS, so whatever managed the content had to be easy to extend once I wrote it. Nothing I found gave me all three: the hosting, the editor experience, and the room to grow.

Cairn is deliberately small. It manages markdown content and the admin where editors write, and that's it. Anything else your site does, you build next to cairn, and there are documented seams where your code has to touch the engine. Your own admin screens mount inside cairn's, in the same [DaisyUI](https://daisyui.com/) and [Tailwind](https://tailwindcss.com/) idiom the scaffold is built from.

The stack is fixed: SvelteKit, Cloudflare, GitHub, no abstraction layers over any of them. [Why cairn](./docs/explanation/why-cairn.md) explains the rationale and the limits of my choices.

## Wayfinder and Topo

Cairn ships with a starter template called Wayfinder (the [`examples/showcase`](./examples/showcase) site in this repo): a complete, working site with cairn's content components wired in, built in the DaisyUI and Tailwind idiom and meant to be restyled or replaced. The unmodified template runs live at [cairn.pub](https://cairn.pub), and a scaffolded site begins as exactly that site. For many basic sites it's most of what they'll need, and a site that grows can keep building on it rather than starting over.

A second template, Topo, is planned: a documentation-first derivative of Wayfinder that will carry cairn's own docs when it lands.

<!-- SCREENSHOT (paired evidence): the editor mid-edit with live preview, beside the
resulting GitHub commit showing cairn-cms[bot] as committer and the editor's name as author. Capture at the Wayfinder design review; never substitute a stock placeholder. -->

## Quickstart

```sh
npm install @glw907/cairn-cms
```

A working site needs four things from you. Write an adapter that describes your content: the concepts, the GitHub repo to commit to, your render function. Mount the admin routes, which is a handful of copied files. Give the Worker its bindings in `wrangler.jsonc`: a D1 database for auth, an email sender for the sign-in links, and an R2 bucket for media. Then deploy. The [tutorial](./docs/tutorial/build-your-first-cairn-site.md) covers each step with the real files.

The [docs](./docs/README.md) have three more arms when you need them. The [guides](./docs/guides/README.md) are task recipes, and the editor-facing ones are grouped on their own. The [reference](./docs/reference/README.md) has a page per package entry point, and CI checks it against the code. The [explanation](./docs/explanation/README.md) pages cover the architecture and the security model.

Cairn is pre-1.0. It runs two production sites today, [ecxc.ski](https://ecxc.ski) and [907.life](https://907.life). If you ever remove it, your content is still plain markdown in your repo, and the rendering is what you'd rewire. Versioning and upgrades live in the [upgrade guide](./docs/guides/upgrade-cairn.md). History is in the [CHANGELOG](./CHANGELOG.md). Security reporting goes through the [policy](./SECURITY.md), and the license is [MIT](./LICENSE).
