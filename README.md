# cairn

Cairn is my embedded CMS and admin-interface scaffold for [SvelteKit](https://svelte.dev/docs/kit) sites on [Cloudflare](https://www.cloudflare.com/). It's an open source project: free code that (hopefully) helps people.

I built cairn for my own sites. I host everything on Cloudflare, because nothing else does bulletproof, security-forward hosting at almost no cost, but unfortunately committing to Cloudflare limits your choice of tools. The git-based CMSes that remain get the storage right, keeping content as plain files in your own repo, but they still ask editors to think in git, and for normal human beings who write, that's a bridge too far. I wanted the people who write content for sites to get a tool that takes their writing seriously and keeps the version control invisible.

## Love your editors!

Cairn gives non-technical content editors a first-class writing experience with all the modern affordances: a markdown editor built for prose in the spirit of [iA Writer](https://ia.net/writer), a live preview that renders through the same function as your public pages (so editors see exactly what ships), focus and typewriter modes, a Zen mode, a local spellchecker with a per-site dictionary, and an optional AI copy-edit (tidy, built on [Claude](https://www.anthropic.com/claude)) that proposes fixes and never rewrites quietly. Editors sign in from an emailed link (no GitHub account, no password), and cairn exposes the signed-in identity to your own routes, so what you build next to cairn knows who's editing. The magic-link flow is a default, not a requirement: a developer can replace the auth outright. The editors' own front door is [Welcome, editors](./docs/guides/editor-welcome.md), which is also the fastest way to feel what cairn is for.

## Content storage and types

Behind the editor, cairn stores all site content as markdown committed to the site's own GitHub repo, but in no way requires editors to understand git or version control. Saves go to a holding branch, one per entry, and a conflicting edit is refused rather than merged by guesswork. Publishing copies the entry to `main` with the editor as commit author, and from there the site deploys like any other push. (The default magic-link authentication requires a small D1 database.)

Content is a fixed set of concepts you declare. Posts and Pages are available out of the box, and you can add others if you need them, each with a typed frontmatter schema. Inside the markdown, content components render through [remark](https://github.com/remarkjs/remark) directives, the accepted way of extending markdown with richer structures: the starter set covers callouts, alerts, an inline icon, pull quotes, CTAs, FAQs, video, and an expiring announcement banner, each with a schema-driven insert form in the editor, and you declare your own the same way. Figures are built into the engine itself.

## Small is beautiful

Most of the sites I build have some degree of functionality beyond being a good CMS, so whatever managed the content had to be easy to extend once I wrote it. Nothing I found gave me all three: the hosting, the editor experience, and the room to grow.

Cairn is deliberately small. It manages markdown content and the admin where editors write, and that's it. Anything else your site does, you build next to cairn, and there are documented seams where your code has to touch the engine. Your own admin screens mount inside cairn's, in the same [DaisyUI](https://daisyui.com/) and [Tailwind](https://tailwindcss.com/) idiom the scaffold is built from.

The stack is fixed: SvelteKit, Cloudflare, GitHub, no abstraction layers over any of them. [Why cairn](./docs/explanation/why-cairn.md) explains the rationale and the limits of my choices.

## Wayfinder and Topo

Cairn ships with a starter template called Wayfinder: a complete, working site with the component library wired in, built in the DaisyUI and Tailwind idiom and meant to be restyled or replaced rather than obeyed. The unmodified template runs live at [cairn.pub](https://cairn.pub), which is both the demonstration and the honest starting point, since a scaffolded site begins as exactly that site. Wayfinder is deliberately dual-natured: close to a finished site for a basic content-managed project, and a foundation to build past for one that grows.

A second template, Topo, is planned: a documentation-first derivative of Wayfinder that will carry cairn's own docs when it lands.

<!-- SCREENSHOT (paired evidence): the editor mid-edit with live preview, beside the
resulting GitHub commit showing cairn-cms[bot] as committer and the editor's name as author. Capture at the Wayfinder design review; never substitute a stock placeholder. -->

## Quickstart

```sh
npm install @glw907/cairn-cms
```

Then four steps: describe your content in an adapter (concepts, the GitHub target, your render function), mount the admin with a handful of files, bind a D1 database, an email sender, and an R2 bucket for media in `wrangler.jsonc`, and deploy. The [tutorial](./docs/tutorial/build-your-first-cairn-site.md) walks that whole path, from an empty directory to a deployed site with a working admin.

After that, the [docs](./docs/README.md) split by what you need: [guides](./docs/guides/README.md) are task recipes, with the editor-facing ones grouped separately; the [reference](./docs/reference/README.md) documents every export, one page per entry point, checked against the code in CI; and [explanation](./docs/explanation/README.md) covers the architecture, the security model, and the reasoning behind both.

Cairn is pre-1.0, and it runs two production sites today, [ecxc.ski](https://ecxc.ski) and [907.life](https://907.life). If you remove it someday, your content is still plain markdown in your own repo. You'd rewire the rendering, but nothing traps the words. Versioning and upgrades are the [upgrade guide](./docs/guides/upgrade-cairn.md)'s job. History lives in the [CHANGELOG](./CHANGELOG.md), security reporting in the [policy](./SECURITY.md), and the license is [MIT](./LICENSE).
