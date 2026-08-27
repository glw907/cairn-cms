# Internals rank: site chassis (`examples/showcase`)

Audited at `0406f1d5` against `docs/internal/code-idioms.md`, the TSDoc standard
(CLAUDE.md "Authoring"), `examples/showcase/src/chassis/README.md`, and the two chassis
duties (exemplar consumer; starting copy for every next theme).

## State of the area

This is the best-documented tree in the repo and, on prose alone, the strongest argument
cairn has for its own extensibility story. Every module opens with a real orientation
comment that records *why*, not what: `dev-gate.ts` explains the two-halves fold and cites
the `wrangler deploy --dry-run` verification date; `challenge-token.ts` explains why it is
a leaf module in one paragraph a new developer can act on; `site.css`'s `.site-main` block
explains a cross-axis flex bug better than most CSS specs do. Svelte 5 runes usage is
correct and disciplined throughout: `$derived`/`$derived.by` for computation, `$state` only
for genuine local mutability, and not one `$effect` used for derivation anywhere in the
tree. SvelteKit 2 shape is right: `entries` generators on prerendered dynamic routes, page
options colocated, `$app/state` rather than the retired `$app/stores`, no store-based
smuggling of route data.

The failures are all of one kind: **the reference site does not run the reference code.**
A paginated archive subsystem of ~270 lines cannot render with the corpus the repo ships
and has bought a permanent exception in `svelte.config.js` to stay green. Two theme
components totalling 464 lines are imported by nothing. `composition.css`'s whole primitive
set is unused by its own admission, including the one primitive whose bug fix the showcase's
theme then hand-rolls anyway. The chassis's pure logic (`paginateArchive`, `formatDate`,
`isBannerExpired`, `isAdminHref`) has zero unit tests, because the showcase has no unit test
project at all. Meanwhile the emitted scaffold template carries two internal fixtures out
to every consumer site. The second, quieter failure is idiom fork: import specifiers, error
throwing, route-handler typing, props declaration and module headers each have two live
answers inside one small tree, which is exactly the surface an agent copies from its nearest
neighbour.

**Grade: B.** The writing and the runes discipline are A-grade. The gap between what the
chassis claims (in a genuinely excellent README) and what the tree proves is what costs it
two letters, and every item below is bounded — none of the shapes are wrong, several of them
are simply not exercised.

---

## 1. The paginated archive subsystem never executes, and buys a permanent build-gate exception to stay green

**Tier: refactor. Limb: comprehension (+ agent-extensibility).**

`src/chassis/archive.ts` sets the page size against a fixture that is not in the tree:

```ts
// src/chassis/archive.ts:8-10
// Entries per archive page. Derived against the 220-post review fixture: at this size the home
// document's entry markup stays well under the audit's 100KB weight flag (measured well under half
// of it), while still reading as a substantial archive page rather than a token sliver.
export const ARCHIVE_PAGE_SIZE = 50;
```

`src/content/posts/` holds **14** posts. `(site)/+page.server.ts` hands `paginateArchive`
`entries.slice(1)`, so 13 entries against a page size of 50: `totalPages` is always 1.
Therefore:

- `(site)/archive/[page]/+page.svelte` (188 lines) and its `+page.server.ts` (31 lines) never
  render, in dev, in CI, or in any visual baseline.
- The pagination block in `(site)/+page.svelte:161-178` never renders either
  (`data.archive.totalPages > 1` is never true).
- The `entries` generator returns an empty array, which is precisely why the build config
  carries a named exception for that one route:

```js
// svelte.config.js:47-50
handleUnseenRoutes: ({ routes, message }) => {
  const hasUnexpected = routes.some((route) => route !== '/(site)/archive/[page]');
  if (hasUnexpected) throw new Error(message);
},
```

- No e2e spec covers the archive: `grep -rln "archive\|paginate" e2e/` returns only
  `site-visual`, `golden-path`, `vocabulary-admin`, `tag-filter`, `media-insert`,
  `media-slice`, none of which visits `/archive/2`.
- The clamping contract in `paginateArchive` and the 404 rule that depends on it
  (`archive/[page]/+page.server.ts:27-29`, "paginateArchive clamps an out-of-range page into
  range rather than returning nothing; a request past the last real page must 404") are
  asserted nowhere.

A new developer reading the chassis README's archive row is told the module exists "so the
slicing rule never drifts between the two routes". Nothing in the repo can detect that
drift. An agent asked to change the archive shape has no failing test to steer by and no
rendered page to look at.

**Remediation.** Lower `ARCHIVE_PAGE_SIZE` to a value the shipped corpus exceeds (6 gives
three pages over 13 entries), which makes `/archive/2` a real prerendered page, lights the
home page's pagination block, and lets the `handleUnseenRoutes` exception be deleted
outright. Add a table-driven unit test for `paginateArchive` (clamp low, clamp high, exact
boundary, year-group runs, undated tail) per idiom T6, and one e2e that walks home → page 2 →
back. Re-derive the 100KB weight note against the real corpus or drop it.

---

## 2. The emitted scaffold template ships two internal fixtures to every consumer site

**Tier: refactor. Limb: agent-extensibility (+ comprehension).**

`.cairn-template.json` excludes the e2e harness and the members fixture, but not two others:

```json
// examples/showcase/.cairn-template.json:2-12
"exclude": [
  "src/routes/test",
  "src/members",
  "src/routes/members",
  "migrations-members",
  "e2e",
  "playwright.config.ts",
  ".claude",
  "scripts",
  "README.md"
]
```

**(a) `/probe-craft` ships.** It is a design-acceptance fixture whose own header states it is
deliberately wrong:

```svelte
<!-- src/routes/probe-craft/+page.svelte:1-12 -->
The craft chapter's acceptance fixture (design infrastructure Pass 3, Task 11): a small
admin-shaped screen assembled entirely from stock DaisyUI v5 components ...
Deliberately un-cairn: no `cairn-admin.css`, no `admin-toolkit` import, no grammar token
```

It carries fabricated personal-looking records:

```ts
// src/routes/probe-craft/+page.svelte:34-39
const members = [
  { name: 'Priya Natarajan', standing: 'Current', joined: '2024-03-11', balance: '$85.00' },
  { name: 'Owen Fitzgerald', standing: 'Overdue', joined: '2022-09-02', balance: '$1,240.00' },
```

It has no `+page.server.ts` and no `prerender` opt-out, so it is a live SSR route on every
scaffolded production site, outside the `(site)` chrome, showing invented member names and
dollar balances at a guessable path. Its own comment says the markup "stays as-is between
runs" for round-to-round comparability, which is a reason to keep it in this repo and a
reason it must never leave it.

**(b) The e2e leak sentinel ships.** The `(site)` group layout returns a test-only value on
every public page payload, with no `cairn-template:exclude` marker anywhere in the file:

```ts
// src/routes/(site)/+layout.server.ts:15-17
export const load: LayoutServerLoad = () => {
  return { siteLayoutSentinel: 'cairn-showcase-site-layout' };
};
```

Its own TSDoc names it "A minimal fixture field for the preview pass's leak-sentinel e2e
(preview.spec.ts)". Every scaffolded site therefore serializes
`"siteLayoutSentinel":"cairn-showcase-site-layout"` into the payload of every public page it
serves, forever, and the load function that carries it is the first `+layout.server.ts` a new
developer opens.

**Remediation.** Add `src/routes/probe-craft` to the `.cairn-template.json` exclude list.
Wrap the sentinel return in `cairn-template:exclude-start`/`-end` markers (the mechanism
`hooks.server.ts:21-30` and `app.d.ts:44-49` already use for exactly this), leaving the
scaffolded load either absent or returning `{}`. Add a `check:template` assertion that the
emitted tree contains no route named in a fixture allowlist, so the next fixture cannot leak
the same way.

---

## 3. `[...path=md]` hand-rolls its own `PublicRoutesConfig`, defeating the single-source guarantee `public-routes.ts` exists to make

**Tier: refactor. Limb: idiom (+ comprehension).**

`src/chassis/public-routes.ts` opens with an unambiguous claim:

```ts
// src/chassis/public-routes.ts:1-6
// The showcase's one PublicRoutesConfig literal ... Both `(site)/[...path]/+page.server.ts`
// ... and `(site)/preview/[token]/+page.server.ts` ... import this ONE binding, so a site can
// never drift the two routes' rendering config apart by editing one copy and forgetting the other.
```

There is a third consumer, and it does not import the binding:

```ts
// src/routes/(site)/[...path=md]/+server.ts:13-21
const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
  description: SITE_DESCRIPTION,
  resolveMedia: publicMediaResolver,
  assetsEnabled: mediaEnabled,
});
```

Seven of the nine fields are retyped by hand; `defaultImage` and `feeds` are silently
dropped. The drift the module was written to prevent already exists inside the tree that
teaches the pattern, and the README repeats the "one literal" claim in its seam table. An
agent told to change the site's rendering config will edit `public-routes.ts`, run the gate
green, and ship a `.md` twin that disagrees with its own HTML page.

The same duplication appears one level down in the feed routes: `feed.xml/+server.ts:11-13`
and `feed.json/+server.ts:11-13` each hand-build the identical channel metadata literal
(`{ title, description, siteUrl, feedUrl }`) even though `feed.ts` exists specifically so
"the two feed formats ... can never drift from each other". Only the *items* were factored.

**Remediation.** Have `[...path=md]/+server.ts` import `publicRoutesConfig` and pass it
whole; if `markdownLoad` genuinely needs a narrower object, export that narrowing from
`public-routes.ts` (`markdownRoutesConfig`, derived from the same literal) rather than
retyping it. Move the shared feed channel metadata into `chassis/feed.ts` beside
`buildFeedItems`, leaving each route with only its own `feedUrl`. Then the README's claim is
true rather than aspirational.

---

## 4. The chassis's pure logic has no unit tests, because the showcase has no unit test project

**Tier: refactor. Limb: agent-extensibility.**

`examples/showcase/src/tests` does not exist. `package.json`'s only test script is
`test:e2e`. The engine's `src/tests` reaches the showcase only through gate-script tests
(`check-chassis-boundary.test.ts`, `check-invisible-craft.test.ts`,
`showcase-pages-singular.test.ts`), none of which imports a chassis module.

Every pure function in the chassis is therefore unasserted:

- `paginateArchive` (`archive.ts:36`): clamping, year grouping, undated bucketing.
- `sortNewestFirst` (`archive.ts:27`): the undated-sorts-last contract stated in its own doc.
- `formatDate` (`date.ts:15`): returns the string `"Invalid Date"` for malformed input, a
  behaviour nothing documents or asserts.
- `isBannerExpired` (`islands/banner-expiry.ts:14`): the load-bearing fail-closed rule
  ("A missing or unparsable `expires` counts as expired too"), which the server `build()` and
  the client component must agree on independently. Its whole reason for existing is that
  two code paths must not diverge, and nothing checks that they do not.
- `isAdminHref` (`components/admin-link.ts:9`): the predicate the prerender crawler's
  correctness depends on (`svelte.config.js:28-31` cites it by name as the reason
  `handleHttpError` can throw on everything).

The repo's own charter is emphatic that a watch becomes a test wherever it can
("Converting a watch into a failing test is the gold standard"), and idioms T3/T4/T6 assume
a unit project exists. For the artifact every next theme is copied from, the absence is
structural: the copy carries the untested helpers forward.

**Remediation.** Add a `vitest` unit project to `examples/showcase` covering the five
functions above, table-driven per T6, with `describe('<symbol>: <one-line contract>')` titles
per T3. Wire it into the same CI job that already runs the showcase e2e. These are pure,
dependency-free functions; the harness cost is one config file.

---

## 5. Two theme components (464 lines) are imported by nothing, and both violate the props idiom

**Tier: refactor. Limb: idiom (+ comprehension).**

`src/theme/components/IntroLedger.svelte` (267 lines) and
`src/theme/components/Carousel.svelte` (197 lines) are referenced by no `.svelte` or `.ts`
file in `src/` or `e2e/`. Their only mentions anywhere in the repo are `CHANGELOG.md`, a
plan doc, a STATUS archive, and one docs line. Git history records them as banked from
cairn.pub (`cc3ae8f7 Bank the cairn.pub carousel as a generic showcase component`), not as
components the showcase composes with.

Both also carry the props shape idiom S1 retired. The charter's own showcase sweep item
reads "showcase components converge on S1"; these two did not:

```svelte
<!-- src/theme/components/IntroLedger.svelte:26-51 -->
let {
  mark = false,
  title = 'What is cairn?',
  ...
}: {
  /** Render the cairn mark (the Temaki cairn) beside the title. */
  mark?: boolean;
  ...
} = $props();
```

Eight props declared through an inline type literal, where `Banner.svelte:15-22`,
`ArticleView.svelte:23-30`, `admin/+layout.svelte:12-19` and
`admin/[...path]/+page.svelte:13-20` all use `interface Props`. `Carousel.svelte:28-38` has
the same shape with three props. So the tree teaches two answers, and the two that teach the
retired one are the two nothing renders.

Compounding it, the public docs describe them wrongly:

```
docs/extend/what-the-scaffold-wrote.md:130
| `components/` | The theme's registered markdown components (`ArticleView`, `Carousel`, and the rest) ... |
```

Neither `ArticleView` nor `Carousel` is a registered markdown component; the registered
components are the nine `defineComponent` declarations in `cairn.config.ts`, and the only
registered *island* is `Banner`. A new developer following that sentence looks in the wrong
directory for the component registry.

**Remediation.** Either compose both into a real page (the styleguide is the obvious host,
and would give them visual-baseline coverage) or move them out of the shipped template into
a `docs/` snippet or a lab directory. Whichever survives converges on `interface Props`.
Correct the `what-the-scaffold-wrote.md` row to name the registry's actual home.

---

## 6. The archive entry row is written three times and its CSS twice, verbatim

**Tier: refactor. Limb: idiom.**

The same fifteen-line article block appears twice in one file and a third time in another:

```svelte
<!-- src/routes/(site)/+page.svelte:119-131 (filtered branch) -->
<article class="entry" class:entry--undated={!post.date} data-cairn-post>
  {#if post.date}<div class="entry__date">{formatDate(post.date)}</div>{/if}
  <div>
    <h2 class="entry__title"><a href={post.permalink}>{post.title}</a></h2>
    {#if post.fields.description}<p class="entry__excerpt">{post.fields.description}</p>{/if}
  </div>
</article>
```

byte-identical at `src/routes/(site)/+page.svelte:140-152` (the year-grouped branch) and again
at `src/routes/(site)/archive/[page]/+page.svelte:34-46`.

The styling is duplicated with it. `archive/[page]/+page.svelte:68-187` repeats `.listing`,
`.index__head`, `.index__count`, `.index__year`, `.index__year--first`, `.entry`,
`.entry--undated`, `.entry__date`, `.entry__title` (plus its three link states),
`.entry__excerpt`, `.pagination`, `.pagination__link` (plus two states),
`.pagination__status` and the `max-width: 34rem` block — roughly 120 lines identical to
`(site)/+page.svelte:181-424`. The `.index__head` count row markup is duplicated too
(`+page.svelte:83-89` vs `archive/[page]/+page.svelte:23-29`).

Svelte 5 has the exact tool for the in-file half (`{#snippet entryRow(post)}` rendered from
both branches), and the cross-file half is a `$theme/components/ArchiveIndex.svelte` —
precisely the "copy-in chrome component" pattern `SiteHeader`/`SiteFooter` already establish.
Today a re-skin of the archive row has to be applied in two files and cannot be applied
consistently by grep, and the duplicate that never renders (finding 1) will silently rot.

**Remediation.** Extract `ArchiveIndex.svelte` into `$theme/components/`, taking
`{ years, count }` and owning the row markup plus its style block; have it declare a
`{#snippet}` for the row so the home page's filtered branch and its grouped branch share one
definition. Both routes then render the component and keep only their own page-level chrome.

---

## 7. Site identity is hardcoded in four files while `siteConfig.siteName` exists, and the footer nav forks from the header nav

**Tier: refactor. Limb: comprehension.**

`site.config.yaml:1` declares `siteName: Waymark`, and the feed routes read it
(`feed.xml/+server.ts:12`). Four surfaces ignore it:

```svelte
src/theme/components/SiteHeader.svelte:112   >Waymark</span
src/theme/components/SiteFooter.svelte:52    >Waymark</span
src/routes/+error.svelte:23                  <title>{page.status} | Waymark</title>
src/routes/(site)/archive/[page]/+page.svelte:17  <title>Archive, page {data.archive.page} · Waymark</title>
```

`siteName` is editable from `/admin/settings`, so an editor who renames the site sees the
feeds change and the wordmark stay. For the template every scaffolded site starts from, the
first thing a new owner wants to change is the name, and it is in four places none of the
docs enumerate.

The origin and description have the same problem one layer down, and they sit on the wrong
side of the chassis boundary:

```ts
// src/chassis/content.ts:29-30
export const ORIGIN = 'https://showcase.test';
export const SITE_DESCRIPTION = 'The cairn showcase site.';
```

The chassis README's own boundary rule is "a theme is everything that isn't chassis" and
"genre-free plumbing ... belongs here; a specific look, a specific chrome, or a specific
content model belongs to the theme". A site's canonical origin and its meta description are
site identity, not genre-free plumbing, and they are read by six routes through
`$chassis/content`. A theme that changes nothing else still has to edit a chassis file.

Separately, the two chrome components answer "where does nav come from?" differently.
`SiteHeader.svelte:63-67` derives it from `page.data.nav` (the config-driven,
`/admin/nav`-editable menu). `SiteFooter.svelte:33-37` hardcodes its own:

```ts
/** The footer's nav targets. A scaffolded site owner edits this list. */
const nav: NavItem[] = [
  { label: 'Writing', href: '/' },
  { label: 'Admin', href: '/admin' },
  { label: 'Feed', href: '/feed.xml' },
];
```

Two sibling components, one question, two answers, with no note in either explaining why the
footer opted out. An agent asked to add a nav item has a 50% chance of editing the wrong one.

**Remediation.** Have `SiteHeader`/`SiteFooter` read the name from `siteConfig.siteName`
(both already sit under the root load that resolves `primaryNav`; add `siteName` to the same
payload so `+error.svelte` gets it too, with a literal fallback for the unmatched-path case).
Move `ORIGIN` and `SITE_DESCRIPTION` into `site.config.yaml`/`$theme`, leaving
`chassis/content.ts` genre-free, and update the README's seam table. Either point the footer
at a named menu in `site.config.yaml` (`menus.footer`) or add one sentence to its
`@component` block stating why it is deliberately static.

---

## 8. The site-shell mechanic lives at three altitudes and the chassis primitive built for it is unused

**Tier: refactor. Limb: idiom.**

`composition.css` ships the primitive, with a long comment recording the flex cross-axis bug
it bakes in:

```css
/* src/chassis/composition.css:107-116 */
.cairn-site-shell { display: flex; flex-direction: column; min-height: 100vh; }
.cairn-site-main  { flex: 1 1 0%; width: 100%; min-width: 0; }
```

The showcase's own layout does not use it. It hand-rolls the flex column in Tailwind
utilities on a class that has no CSS rule of its own:

```svelte
<!-- src/routes/(site)/+layout.svelte:45 -->
<div class="site-shell flex min-h-screen flex-col bg-base-100 font-body text-base-content">
```

(`.site-shell` is defined nowhere as a rule; it exists only as a selector hook in
`theme.css:376`.) `src/routes/+error.svelte:26` repeats the same string a second time. And
`site.css` re-derives the fix by hand on `.site-main`, saying so explicitly:

```css
/* src/theme/site.css:61-64 */
     width does. Chassis's own `.cairn-site-main` recipe (composition.css) documents and bakes in
     this exact fix; this hand-rolled shell needs the same explicit width. */
  width: 100%;
  min-width: 0;
```

So one mechanic has three homes, and the authoritative one is the dead one. The chassis
README concedes the general case in its removal table: "nothing else references it today,
since no theme markup in this showcase currently uses `.cairn-card`/`.cairn-band`/
`.cairn-section`/`.cairn-hero`/`.cairn-sidebar-layout`/`.cairn-site-shell`/`.cairn-site-main`".
`composition.css` is 117 lines of primitives the reference site never renders, so no visual
baseline, no e2e, and no CI width-matrix run has ever painted one of them. Under the
workstation's own rule, a repeated local workaround for a mechanic that already has an engine
home is the loudest possible filing signal, and this one is written down in the workaround's
own comment.

**Remediation.** Adopt the pair in `(site)/+layout.svelte` and `+error.svelte`
(`class="cairn-site-shell ..."`, `class="cairn-site-main ..."`), delete the duplicated
`width`/`min-width` from `site.css`'s `.site-main` (keeping only the measure and gutters),
and keep `.site-shell` as the transition hook if `theme.css` still needs it. Then adopt at
least one more primitive somewhere real (`.cairn-card` on the home lead, or `.cairn-band` on
the styleguide) so the CI width matrix paints them; a primitive the reference never renders
is a promise nothing tests.

---

## 9. Import specifiers fork between `.js` and bare across the same modules

**Tier: refactor. Limb: agent-extensibility.**

Counting every `$chassis`/`$theme` specifier in `src/`:

```
7  $theme/cairn.config.js        5  $theme/cairn.config
5  $chassis/cairn.server.js      7  $chassis/content       (never with .js)
3  $chassis/dev-gate.js          1  $chassis/dev-gate
1  $chassis/public-routes.js     1  $chassis/public-routes
1  $chassis/entry-data.js        1  $chassis/entry-data
1  $chassis/theme-toggle.js      2  $chassis/archive       (never with .js)
1  $chassis/render.js            3  $chassis/date          (never with .js)
```

Four modules are imported both ways, sometimes from sibling files in one directory:
`(site)/[...path]/+page.server.ts:3-4` uses bare (`$chassis/public-routes`,
`$chassis/entry-data`) while `(site)/preview/[token]/+page.server.ts:11-12` uses `.js` for the
same two modules, and their own header comment is about those two files sharing one config.

This is the plainest one-obvious-way violation in the tree and it costs an agent directly: a
grep for `from '$chassis/content.js'` returns nothing, a grep for `from '$chassis/date'`
misses nothing only by luck, and a rename or a move has to be done twice. A newcomer copying
the nearest neighbour picks up whichever form that neighbour happened to use.

**Remediation.** Pick the `.js` form (it is the NodeNext-correct spelling, it is what the
chassis boundary gate normalizes against in `seamBaseName`, and it is already the majority for
`cairn.config`/`cairn.server`), convert the ~13 bare specifiers, and add the rule to
`code-idioms.md` under Modules so the next file has one answer. A one-line check in
`check-chassis-boundary.mjs` can enforce it, since that script already parses every import
specifier in the tree.

---

## 10. `cairn.config.ts` is a 520-line monolith whose adapter is buried under nine component definitions

**Tier: refactor. Limb: comprehension.**

`src/theme/cairn.config.ts` is described everywhere in the docs as "the single seam the
engine consumes" and is the first file a new developer opens. Lines 18-346 are the icon set
plus nine `defineComponent` declarations, each with a five-to-fifteen-line design rationale
(the `video` facade's justification alone runs `151-159`). The thing the file is named for —
the concepts, the backend, the media wiring, the editor nav layout — starts at line 375 and
runs to 515.

The comments are individually excellent and worth keeping; the problem is placement. A
developer asking "what concepts does this site declare?" or "where is `navLayout`?" scrolls
past 350 lines of component grammar to reach them. An agent asked to add a field to `posts`
must read the whole file to find the fieldset, and an agent asked to add a component has no
obvious file to create.

The tree already has the right shape one directory over: `$theme/islands/registry.ts` was
split out of this file for exactly this reason, and its header says so ("Kept in its own
module, separate from cairn.config.ts, so the root layout can import just this small map").
`$theme/components/` exists but holds only Svelte components.

Minor idiom residue in the same file: `cairn.config.ts:9-11` imports siblings through the
`$theme` alias (`$theme/islands/registry.js`, `$theme/islands/banner-expiry.js`,
`$chassis/render.js`) while `:15-16` and `:520` import siblings relatively
(`./theme.css?url`, `./site-config.js`) — two answers inside twelve lines.

**Remediation.** Move the icon set and the nine components into
`src/theme/grammar/` (one file per component, or one `components.ts` plus `icons.ts`),
exporting a single `registry`. `cairn.config.ts` then opens on the adapter and reads as the
declaration it is described as. Fix the sibling-import fork to relative-within-`$theme` while
in there.

---

## 11. `sortNewestFirst` re-implements a guarantee the engine already makes

**Tier: note. Limb: idiom.**

```ts
// src/chassis/archive.ts:26-29
/** Sort entries newest first. An undated entry has no year marker to sort by, so it sorts last. */
export function sortNewestFirst(entries: ContentSummary[]): ContentSummary[] {
  return [...entries].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}
```

The engine's index already returns entries in exactly that order, with a byte-identical
comparator:

```ts
// src/lib/delivery/content-index.ts:139-142
// Dated concepts sort newest-first; undated concepts (Pages) sort by title.
const sorted = [...entries].sort((a, b) =>
  descriptor.routing.dated ? (b.date ?? '').localeCompare(a.date ?? '') : a.title.localeCompare(b.title),
);
```

`posts` is `routing: 'feed'` (`cairn.config.ts:385`), hence dated, so both call sites
(`(site)/+page.server.ts:13`, `archive/[page]/+page.server.ts:11`) re-sort an already-sorted
array with a copy allocation. Harmless today; the cost is that the reference site teaches
every theme to distrust `all()`'s documented ordering, and if the engine's comparator ever
changed the chassis would silently disagree with the feeds and the sitemap, which do trust it.

**Remediation.** Delete `sortNewestFirst`, call `posts.all()` directly at both sites, and
document the ordering guarantee on `ConceptIndex.all()` in `docs/reference/delivery.md` if it
is not already there — the whole point of removing the local re-sort is that the guarantee
becomes the contract. If the re-sort is kept deliberately (defensive against a future
unordered index), say so in the doc comment, since today it reads as ignorance of the engine.

---

## 12. Route-handler and error idioms fork inside one directory

**Tier: note. Limb: idiom.**

Two live styles for a `+server.ts` GET, in sibling files under `src/routes/test/`:

```ts
// src/routes/test/last-commit/+server.ts:9      (untyped, bare export)
export async function GET() {
// src/routes/test/last-otp/+server.ts:23        (typed via ./$types)
export const GET: RequestHandler = async ({ url, platform }) => {
```

`branch-file` and `render-media` follow the first; `last-otp`, `reset-members` and
`revoke-member-session` follow the second, as does every route outside `test/`. The typed
form is the SvelteKit 2 idiom and the one the rest of the tree uses.

Two live styles for raising an HTTP error, in the same tree:

```ts
// src/routes/(site)/archive/[page]/+page.server.ts:25
if (!Number.isInteger(requested) || requested < 2) throw error(404, 'Not found');
// src/routes/test/last-otp/+server.ts:25
  error(404, 'Not found');
```

SvelteKit 2 removed the need for `throw` and its own docs use the bare call; the showcase
uses both, and the bare form is what its own newest files use. (The engine's `src/lib`
consistently uses `throw error(...)`, so converging the showcase on the bare form is a
showcase-scoped decision unless the charter takes it repo-wide.)

Three copies of one predicate, with a note that miscounts them:

```ts
// src/routes/test/last-otp/+server.ts:13-14
// Duplicated in the two sibling routes rather than imported from a shared module, the same
// duplication `factory.ts`'s own `isLocalHost` documents for `guard.ts`'s.
```

`isLocalHost` is copied verbatim at `last-otp/+server.ts:19-21`,
`reset-members/+server.ts:20-22` and `revoke-member-session/+server.ts:18-20` — three, not
two. The engine's reason for duplicating across a package boundary does not transfer to three
files in one directory.

**Remediation.** Convert the three untyped handlers to `RequestHandler`. Pick the bare
`error(...)` form throughout the showcase and record the choice in `code-idioms.md` under
Errors. Hoist `isLocalHost` into a single `src/routes/test/_local-host.ts` (the `_` prefix is
already the repo's convention for a non-test helper, per N6) and fix the stale "two sibling
routes" wording.

---

## 13. Module headers fork on the `cairn-cms:` prefix, and the members tree reaches back by relative path

**Tier: note. Limb: agent-extensibility.**

Idiom M1: "Every module opens with a `// cairn-cms: <one-paragraph orientation>` header".
Inside `src/chassis/`, two of twelve modules carry the prefix (`dev-gate.ts:1`,
`feed.ts:1`); `content.ts`, `archive.ts`, `date.ts`, `entry-data.ts`, `public-routes.ts`,
`render.ts` and `theme-toggle.ts` all open with a bare `//`. `src/members/` carries it on all
four files. The orientation paragraphs themselves are uniformly good, so this is purely the
marker — but the marker is what makes the convention greppable, which is its whole job.

Second, `src/members/` and `src/routes/members/` reach each other by relative traversal while
two aliases exist for exactly this purpose:

```ts
src/routes/members/+page.server.ts:7            from '../../members/channel.js'
src/routes/members/login/+page.server.ts:8      from '../../../members/channel.js'
src/routes/test/last-otp/+server.ts:17          from '../../../members/capture-transport.js'
```

`svelte.config.js:15-20` declares `$chassis` and `$theme` and its comment states `$lib` is
deliberately unused. A third top-level source tree with no alias is a gap in that scheme, and
the depth-dependent `../../../` prefixes are the kind of thing a route move breaks silently.

**Remediation.** Add the `// cairn-cms:` prefix to the seven chassis headers. Either add a
`$members` alias (three lines in `svelte.config.js`) or fold `src/members/` under a tree that
already has one; the exclusion list in `.cairn-template.json` handles either shape unchanged.

---

## 14. Idiom residue: tab indentation, an ad hoc `fail` literal, an unwrapped app shell, an un-flagged watch item

**Tier: note. Limb: multiple.**

**(a) `playwright.config.ts` mixes tabs and spaces.** Lines 4-14 (the `maxDiffPixels`
rationale and the `expect` key) are tab-indented; line 15 onward are 2-space. Idiom M4:
"Indentation is 2-space everywhere". This is the only tab-indented file in the showcase.

**(b) The custom admin screen teaches the retired `fail` shape.**

```ts
// src/routes/admin/signups/+page.server.ts:32
if (!name || !email) return fail(400, { error: 'missing' });
```

Idiom E4 names this exactly: "Ad hoc `fail(400, { error })` literals and dropped `satisfies`
annotations converge", against "a named `*Failure`/`*Refusal` interface carrying `error:
string` plus context". This route is the repo's advertised proof of the custom-screen seam
("the Plan 1 extension-seam proof", line 1), so it is the shape a developer copies. The same
file uses `event.platform!.env` non-null assertions three times (`:20`, `:33`, `:42`) where
the rest of the tree uses `platform?.env` with an explicit refusal.

**(c) `app.html` wraps the app in a bare `<div>`.**

```html
<!-- src/app.html:19 -->
<div>%sveltekit.body%</div>
```

SvelteKit's own scaffold uses `<div style="display: contents">` so the wrapper introduces no
box into the layout. The bare div is invisible here only because `.site-shell` sets
`min-h-screen`; a theme that relies on `body`-level layout inherits a silent extra block box.

**(d) The `checkOrigin` watch has no co-located marker.**

```js
// svelte.config.js:52-56
// cairn's guard owns CSRF for the admin with its own double-submit token ...
csrf: { checkOrigin: false },
```

The comment explains the handoff well but does not flag that `checkOrigin` is on SvelteKit's
removal path (kit#15992), which the workstation charter tracks as the standing watch-item
example. The charter's own rule is that a next-time-you-touch-X note becomes a co-located
`// WATCH:` comment, and this line is the X.

**Remediation.** Reformat `playwright.config.ts` to 2-space. Give the signups actions a
named `SignupFailure` interface with `satisfies`, and replace the `platform!` assertions with
an explicit guard. Add `style="display: contents"` to the `app.html` wrapper. Add a
`// WATCH: kit#15992 removes checkOrigin; re-verify the guard handoff on the next Kit major`
line beside the csrf option.
