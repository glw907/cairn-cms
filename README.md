# cairn

Cairn is my embedded CMS and admin-interface scaffold for SvelteKit sites on Cloudflare. It
gives non-technical content editors a first-class writing experience with all the modern
affordances, including a polished markdown editor in the spirit of iA Writer, a
pixel-precise preview (the editor's preview and your public pages render through the same
function, so editors see exactly what ships), and a low-distraction mode. Cairn provides
default magic-link authentication for editors, and includes an auth seam so a developer can
tie cairn to any other identity management solution.

Cairn stores all site content as markdown committed to the site's own GitHub repo, but in no
way requires editors to understand git or version control. Saves go to a holding branch, one
per entry, and a conflicting edit is refused rather than merged by guesswork. Publishing
copies the entry to `main` with the editor as commit author, and from there the site deploys
like any other push. (The default magic-link authentication requires a small D1 database.)

Content is a fixed set of concepts you declare. Posts and Pages are available out of the
box, and you can add others if you need them, each with a typed frontmatter schema. Inside
the markdown, content components render through remark directives: the starter set covers
callouts, figures, pull quotes, FAQs, video, and an expiring announcement banner, each with
a schema-driven insert form in the editor, and you declare your own the same way.

I built cairn for my own sites. I host everything on Cloudflare, because nothing else does
bulletproof, security-forward hosting at almost no cost, but unfortunately committing to
Cloudflare limits your choice of tools. And I wanted the people who write content for sites
to have a professional and polished writing experience without learning git.

Most of the sites I build have some degree of functionality beyond being a good CMS, so
whatever managed the content had to be easy to extend once I wrote it. Nothing I found gave
me all three.

Cairn is deliberately small. It manages markdown content and the admin where editors write,
and that's it. Anything else your site does, you build next to cairn, and there are
documented seams where your code has to touch the engine. Your own admin screens mount
inside cairn's, in the same DaisyUI and Tailwind idiom the scaffold is built from. The stack is fixed: SvelteKit, Cloudflare, GitHub, no
abstraction layers over any of them.
[Why cairn](./docs/explanation/why-cairn.md) explains both the rationale and the practical
limits of my choices.

<!-- SCREENSHOT (paired evidence): the editor mid-edit with live preview, beside the
     resulting GitHub commit showing cairn-cms[bot] as committer and the editor's name as
     author. Capture at the Wayfinder design review; never substitute a stock placeholder. -->

```sh
npm install @glw907/cairn-cms
```

The short version of a build: describe your content in an adapter (concepts, the GitHub
target, your render function), mount the admin with a handful of files, bind a D1 database
and an email sender in `wrangler.jsonc`, and deploy. The
[tutorial](./docs/tutorial/build-your-first-cairn-site.md) walks that whole path, from an
empty directory to a deployed site with a working admin.

After that, the [docs](./docs/README.md) split by what you need:
[guides](./docs/guides/README.md) are task recipes, for developers and for editors
separately; the [reference](./docs/reference/README.md) documents every export, one page per
entry point, checked against the code in CI; and
[explanation](./docs/explanation/README.md) covers the architecture, the security model,
and the reasoning behind both.

Cairn is pre-1.0, and it runs two production sites today, [ecxc.ski](https://ecxc.ski) and
[907.life](https://907.life). If you remove it someday, you're left with a repo of markdown
that still builds. Versioning and upgrades are the
[upgrade guide](./docs/guides/upgrade-cairn.md)'s job, history lives in the
[CHANGELOG](./CHANGELOG.md), security reporting in the [policy](./SECURITY.md), and the
license is [MIT](./LICENSE).
