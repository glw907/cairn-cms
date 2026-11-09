# Make a scaffolded site yours

A scaffolded site ships sample content and the sample site's identity. Work down this list once,
then run `npx cairn-manifest` and `npm run check`.

1. **Name and description.** Set `siteName` and `description` in `src/theme/site.config.yaml`.
   The home page intro, the feed, and the page metadata read `description`.
2. **Public origin.** Set `publicOrigin` in `src/theme/cairn.config.ts` to the address the site
   will live at, so the feed and the sitemap carry the right address.
3. **Sample posts.** Delete the files under `src/content/posts/` and write your own. Each post
   names an `author`; the sample ones point at the `author` page.
4. **Sample pages.** Rewrite `src/content/pages/about.md`, `author.md`, and `contact.md`, and put your
   own address in the contact page. Delete a sample page once no post or page links to it or names
   it as an `author`.
5. **Menus.** Edit `menus.primary` and `menus.footer` in `src/theme/site.config.yaml`. The owner
   edits the primary menu in the admin afterwards.
6. **Tags.** Replace the `vocabulary` entries in the same file with your own tags.
7. **Rebuild the manifest.** Run `npx cairn-manifest` after any content file is added, removed,
   or renamed. A stale manifest fails the build.

## Help contact

The admin's Help screen ends in a **Get help** hand-off. Set `editor.supportContact` on the adapter
to an email, a URL, or a name and instruction to point your editors at you. Left unset, the hand-off
uses cairn's hosted help at `https://cairn.pub/help`, and an explicit `''` renders no hand-off.
