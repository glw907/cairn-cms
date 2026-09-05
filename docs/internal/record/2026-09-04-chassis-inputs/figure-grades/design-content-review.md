# `cairn-site-anatomy` — design concept and content review

Read-only adversarial review of `docs/extend/assets/cairn-site-anatomy.svg` and its sidecar
`cairn-site-anatomy.md`, against the four renders at 720 and 1100, light and dark. Two lenses:
design concept and content. The render-mechanics lens is out of scope and not repeated.

Sources verified against: `CLAUDE.md`, `docs/internal/what-cairn-is-and-is-not.md`,
`docs/internal/docs-register.md`, `docs/extend/architecture.md`, `docs/why-cairn.md`,
`docs/extend/what-the-scaffold-wrote.md`, `docs/extend/design-your-site.md`,
`docs/extend/add-a-custom-admin-screen.md`, `docs/extend/add-cairn-to-a-sveltekit-app.md`,
`docs/admin/own-your-domain.md`, `docs/admin/before-you-start.md`,
`examples/showcase/src/chassis/README.md`, `examples/showcase/wrangler.jsonc`,
`templates/waymark/package.json`, `packages/create-cairn-site/src/github/chapter.mjs`,
`src/lib/sveltekit/admin-nav.ts`, root `package.json`, `.vale.ini`,
`docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`,
`docs/superpowers/specs/2026-09-04-chassis-passes-design.md`.

---

## Lens 1: design concept

### Does the arrangement teach ownership?

Partly, and the part it teaches best is not the part the file claims. The register device
(fill plus border plus shape, with the legend) is doing real work, and the "Your site" frame is
doing more: the dashed developer-owned container that holds rows A to D is the single strongest
ownership statement in the drawing, because containment is the one relation a reader reads
without consulting a legend.

Everything inside that frame, though, is arranged by dependency, not by ownership. Surfaces on
top, content beneath them, theme and chassis beneath that, engine at the bottom, is an import
stack. It is the same axis a developer already reads as "what calls what". Ownership then has to
ride on top of it as a per-node attribute, alternating dev / cairn / dev across row A, shared in
row B, dev / dev in row C, cairn in row D. Two lessons compete on one axis, and the louder one
wins: at 720 the eye reads the vertical progression first and the border styles second.

The falsifiable form of the complaint: cover the legend and the borders, and the drawing still
reads perfectly as a layer diagram. Cover the layer order instead and shuffle the rows, and the
ownership lesson survives unchanged. A diagram whose stated lesson is the one that survives
scrambling is not being carried by its arrangement. The arrangement is carrying dependency.

**The one change that would most improve the lesson**: band the interior by owner, not by layer.
Two labeled bands inside the frame, "cairn's" and "yours", with `/admin` and the engine in one and
the public site, custom screens, theme and chassis in the other, and `src/content/` straddling the
seam between them as the one genuinely shared thing. That makes the shared row's oddity legible
(it is the only node on the boundary) instead of a fourth legend entry, and it removes the need for
the reader to decode four border treatments at all. The registers then become confirmation rather
than the sole carrier.

### "The engine at the bottom"

Bottom-of-stack is defensible for a library: a site sits on it, calls into it, and does not modify
it. What breaks the metaphor is what sits below it. GitHub and Cloudflare are drawn under the
engine, on the same vertical axis, which turns that axis into a runtime stack it is not. GitHub is
not beneath the engine in any sense: it is a peer the engine talks to over HTTPS. Cloudflare is not
beneath the engine either; it is where the entire frame runs, which the long right-hand edge
already says correctly ("the Worker and its bindings run here"). Drawing it as a floor says it
twice, once wrongly.

GitHub's placement is the weakest single decision in the layout. It is squeezed between "the thing
the site imports" and "the thing the site runs on", implying an ordering that has no referent. A
side placement, opposite the Cloudflare edge, would say the true thing: two outside parties the
site reaches, one for content, one for runtime.

### The four-register legend

"cairn", "you", and "an outside party" are real ownership classes and map cleanly onto the
charter's boundary. "you and editors" does not survive the same test. It is a class of one, invented
for `src/content/`, and it does not describe ownership so much as write access. The developer owns
`src/content/` in every sense the other three registers mean: it is in their repository, under
their licence, and they decide its shape through the adapter's concepts. What editors have is the
ability to write into it through a gated surface. Calling that co-ownership makes the legend teach
a fourth thing that only one node uses, and it costs the reader a decode on every other node.

The banded-by-owner alternative above disposes of it: put `src/content/` on the boundary line and
label the relationship on the node ("editors write here"), which is what is actually true.

Separately, the registers under-serve the charter's real boundary. The charter's line is not
"cairn's files versus yours"; it is "cairn owns content management and the admin frame, everything
else is the developer's, served by a thin seam". The word *seam* never appears in the diagram. Three
seam names are printed on the Custom admin node as bare identifiers, with nothing saying they are
the contract that makes the boundary survive an upgrade. That is the charter's load-bearing idea
and the diagram omits it while spending three lines on identifiers a reader cannot use from a
picture.

### The four Cloudflare products

Wrong altitude for an ownership map. All four chips carry exactly one ownership fact between them,
"an outside party", which the containing Cloudflare box already states. They add four nodes of the
fifteen-node budget, roughly a quarter of the drawing's complexity, to say something the map is not
about. Workers, D1, R2, and Email Sending are a *provisioning* concern, and they already have a
home: `docs/admin/before-you-start.md` prices them and `what-the-scaffold-wrote.md` maps them to
`wrangler.jsonc` bindings. On an ownership map, one line inside the Cloudflare box ("Workers, D1,
R2, Email Sending") carries the same information at a fifth of the cost.

The chips also introduce a category slip the rest of the drawing avoids: they are the only nodes
that name a vendor's product catalogue, which sits close to the register's "a vendor's specifics
get a link, never a copy" rule. Cloudflare renames and re-tiers these; "Email Sending" is already
a name that has moved once.

### The canvas and what a stricter editor cuts

800 x 1012 renders about 911 CSS px tall in a 720px docs column. That is more than a laptop
viewport. On the cairn.pub front door, where an evaluator is skimming, a figure that cannot be seen
whole in one look is not a figure, it is a page. The front door's job is one glance that leaves an
impression; this asks for a scroll and a legend decode first.

A stricter editor cuts, in order: the four Cloudflare chips (four nodes, one fact), the three seam
identifiers on the Custom admin node (unusable from an image, and the page links the guide), the
`DaisyUI on Tailwind` line (a stack fact, not an ownership fact), and the scaffold-origin brace
plus its 92-character caption (true, but it is a provenance note wearing a diagram's clothes, and it
is the one element whose dashed bracket the file's own comment has to defend against being read as
a relation). That is roughly 250 units of height and gets the figure close to square.

### Decorative, and missing

Nothing is decorative in the sense of ornament; the file is disciplined about that. The
scaffold-origin brace is the closest thing to a non-load-bearing element, and it is the one device
whose meaning has to be explained in a comment.

Missing, ranked by how much a reader would want it:

- **The write path's two branches.** The single arrow labelled "saves and publishes" collapses the
  mechanism that makes cairn cairn. A save goes to a holding branch; a publish is a separate,
  deliberate copy onto `main`. The GitHub node's body prose says this, so the picture and its own
  label disagree about how many operations there are. Two arrows, or one arrow labelled "save" plus
  a second labelled "publish", is the fix, and it is the highest-value addition available.
- **Roles and the access map.** The legend names editors as a party but nothing shows that who may
  reach which admin screen is the developer's declaration. That is a charter-central seam
  (`defineAccess`, `defineRoles`) and its absence lets a reader infer cairn owns authorization.
- **The preview link.** A share-a-draft preview reaches a visitor without the entry being on `main`.
  It is the one path in the system that crosses from the editor's side to the public side without
  a publish, and it is the kind of thing a diagram is for.

### One figure or two

Two. The two audiences want different things and the current file is a compromise that serves
neither cleanly.

The front-door evaluator wants "who owns what, and what does cairn take off my hands". That is five
or six nodes, one screenful, no directory paths, no identifiers, no vendor products. It should be
wide rather than tall.

The architecture-page reader wants the tree they are about to open. That is this figure, minus the
Cloudflare chips, plus the write path's branches, and it belongs next to the prose that names the
same directories.

There is also a redundancy problem on the destination page. `docs/extend/architecture.md` already
opens with a mermaid figure whose whole subject is the site/engine boundary and the three stores,
and carries a second sequence figure for the write path. Folding this one in makes three figures on
one page, two of which draw the same boundary and two of which draw the same write path. The
register's "a visual earns its place or is absent" threshold is a per-page test, not a per-image
one. If this diagram lands there, the existing export-groups figure should be reconsidered in the
same edit, or this one should be cut down to the parts that figure does not already carry.

---

## Lens 2: content

Every label, sub-label, and sidecar sentence checked against the tree and the docs. Defects below,
with evidence.

### D1. `cairn-cms[bot]` is not what a scaffolded site's commits say

**Where:** SVG line 243, "`cairn-cms[bot]` makes every commit, through a GitHub App." Sidecar
line 81, same claim.

**Evidence:** `packages/create-cairn-site/src/github/chapter.mjs:161` sets the App name to
`flags.appName ?? \`cairn-${slug}\``. GitHub derives the bot login from the App's own name, so a
site scaffolded into `alpine-club` commits as `cairn-alpine-club[bot]`.
`docs/extend/add-cairn-to-a-sveltekit-app.md:36` confirms the name is the developer's choice:
"Everything else on the form, the App's name, its homepage URL, is cosmetic."
`cairn-cms[bot]` is the login of Geoff's own App (`CLAUDE.md`, GITHUB_APP_ID `3847496`), not a
property of cairn.

**Why it matters more here than in the prose that already carries it:** a developer looking for
their bot in `git log`, or allowlisting a committer in a branch protection rule, will search for a
string that does not exist in their repository. The existing prose defects are inherited; the
diagram states it at maximum prominence on the front door.

**Correction:** "Your GitHub App makes every commit, with the editor as author." Drop the literal
login, or write it as `cairn-<your-site>[bot]`.

### D2. Two claims that overstate authorship at once

Same line. "makes every commit" is false twice over. First, the developer's own pushes are commits
in the same repository and no App made them. Second, `docs/extend/architecture.md:114` states the
actual contract: "The commit author is the editor; the committer is `cairn-cms[bot]`". The diagram
prints the committer half and drops the author half, which is the half that carries the product
argument (git history attributes each change to the person who made it). The diagram keeps the
mechanism and throws away the point.

**Correction:** "An editor's save commits with the editor as author and your App as committer."

### D3. `npm run check:chassis-boundary` does not exist in a scaffolded site

**Where:** sidecar line 49, in "The chassis", addressed to a developer about their own repository:
"`npm run check:chassis-boundary` enforces the boundary between this layer and the theme."

**Evidence:** the script is defined only in the cairn-cms root `package.json:57`.
`templates/waymark/package.json` carries five scripts (`dev`, `build`, `preview`, `cairn:manifest`,
`check`) and not this one. `docs/extend/design-your-site.md:19` says it explicitly: "a scaffolded
site inherits the boundary as a convention, not a gate."

A developer following the sidecar runs the command and gets `Missing script`. This is a direct
contradiction of a sibling page in the same track.

**Correction:** "The engine's own repository gates this boundary with `check:chassis-boundary`;
a scaffolded site inherits it as a convention, not a gate."

### D4. The `cairn` CLI is placed inside the engine, which the charter forbids

**Where:** SVG line 233, inside the `@glw907/cairn-cms` node: "The `cairn` CLI adopts your site and
runs read-only health checks over it." Sidecar lines 40-42, same, plus "The CLI is forthcoming, and
this section links its docs page once it ships."

Geoff's ruling covers existence, not altitude, so the present-tense framing is sanctioned. The
placement is not. `docs/internal/what-cairn-is-and-is-not.md:80-89` is explicit under its own
heading: "The `cairn` tool is the operator's cockpit, not engine surface. […] It […] never adds to
the engine's public surface." The plan agrees on distribution:
`2026-08-20-cairn-tool-spine-and-hud.md:29` — "Nothing under `tool/` is reachable from `npm test`
or the npm tarball." It is a separate Go module.

So the one node on the diagram whose subject is "the npm package your site installs by version
range" also contains a Go binary that is not in that package, is not installed by that version
range, and by charter is not engine surface at all. On an *ownership* map this is the most
consequential misplacement available, because the whole figure's thesis is which box a thing lives
in.

Second problem: "adopts your site" reads, to a developer, as something done to their site. The
tool's own vocabulary means the reverse — an owner adopts sites they operate into a local registry
(`plan:484` `adopt`, `:554` "adopt the four" production sites). A reader will take it as an
engine-side onboarding step.

**Correction:** move the CLI out of the engine node entirely, or drop it from this figure. If it
stays, it needs its own node in the "an outside party" or a fifth "operator" register, and the verb
needs rewriting: "An owner-side `cairn` CLI can register your site and run read-only health checks
against it."

Also delete "The CLI is forthcoming, and this section links its docs page once it ships." A
published page does not carry its own TODO, and the register's "no prose about the docs' own
writing" rule covers it.

### D5. "The repository is the database" is a metaphor in a definitional slot, and it is false

**Where:** SVG line 202, on `src/content/`. Sidecar line 65, same sentence, with "so a content
change is a commit" appended.

**Register:** the universal contract bans a coined metaphor in a definitional or structural
position. This one sits as the defining sub-label of a node. It is also the diagram's most
quotable line, which is exactly why it will be repeated.

**Content:** `docs/extend/architecture.md:129` and `docs/extend/data-tiers.md` exist because there
are three stores, not one. D1 holds the editor allowlist, sessions, magic-link tokens, preview
tokens and login nonces. R2 holds media bytes. The committed manifest at `src/content/.cairn/index.json`
is a JSON projection that exists specifically *because* the repository is a poor database for
"what links here". A reader who takes the aphorism literally concludes cairn needs no D1, which the
same diagram contradicts two rows below.

**Correction:** "Your markdown, one file per entry. A content change is a commit." True, concrete,
and it keeps the actual payoff.

### D6. `src/theme/cairn.config.ts` contradicts the page it is going on

**Where:** SVG line 210, "cairn.config.ts: the adapter, concepts, backend and nav layout".

**Evidence:** the destination page, `docs/extend/architecture.md:47`, says "A site declares a single
`CairnAdapter` object, typically at `src/lib/cairn.config.ts`". The scaffold puts it at
`src/theme/cairn.config.ts` (`what-the-scaffold-wrote.md:127`). Both are true of different sites;
one page cannot say both without noticing.

**Deeper problem:** `src/chassis/` and `src/theme/` exist only in a scaffolded or showcase-derived
tree. `docs/extend/build-a-site-by-hand.md` produces a site with neither, and
`docs/extend/design-your-site.md:4` says so: "A site built by hand from [that page] has no chassis."
A figure titled "Ownership map of a cairn site" that hard-codes two directories half the track's
readers will not have is over-specified for its title.

**Correction:** either retitle to name the scaffold ("Anatomy of a scaffolded cairn site"), or
label the two row-C nodes by role with the paths as parenthetical scaffold defaults. Then fix the
architecture page's `src/lib/` sentence in the same edit so the page and its figure agree.

### D7. The deploy claim is true only for a site that opted in

**Where:** SVG line 278, edge label "a push to main deploys through Workers Builds". Sidecar line
83, "A push to `main` deploys the Worker through Workers Builds." SVG `<desc>` line 3, same.

**Evidence:** `docs/admin/own-your-domain.md:130` — "This is optional, and separate from everything
above". It requires a second, wider Cloudflare API token, authorizing Cloudflare's "Workers and
Pages" GitHub App, and a separate `create-cairn-site --connect` run.
`docs/admin/setup-recovery.md:77` states the declined case: "You declined connecting to Workers
Builds | Nothing is wrong; deploys still go through this tool." There is no `.github/workflows` in
the scaffolded tree (`what-the-scaffold-wrote.md:19-89`), so a site that has not connected deploys
by `create-cairn-site`, from a laptop, and a push to `main` deploys nothing at all.

This is stated three times (label, desc, sidecar) with no qualification, and it is the claim most
likely to be acted on: a reader will push and wait.

**Correction:** "Connect Workers Builds and a push to `main` deploys the Worker; otherwise
`create-cairn-site` deploys it."

### D8. "design-agnostic" on the Public site node

**Where:** SVG line 173, third sub-label of the Public site node.

**Evidence:** the string appears in no published doc. Grep of `docs/*.md` and `docs/extend/*.md`
returns nothing; it lives in `CLAUDE.md` and the internal charter. `docs/why-cairn.md` makes the
same point in reader language and never uses the term.

Two problems. It is undefined jargon at the front door, where the register's legibility floor asks
that a technical term either carry information or be glossed. And it attaches the property to the
wrong subject: a site's public output is emphatically not design-agnostic, it is the one place the
design lives. What is design-agnostic is *cairn*, with respect to that output. On a node labelled
"Public site", the adjective reads as a property of the reader's own site.

**Correction:** delete it. The line above, "your own render()", already carries the fact, and the
node's dashed developer border says who owns the look.

### D9. The chassis description, against the chassis's own boundary statement

**Where:** SVG line 218, "the plumbing every site copies: content indexes, feeds, runtime
composition, prose and token CSS".

**Against `examples/showcase/src/chassis/README.md:3-20`:** the README's boundary statement is "a
theme is everything that isn't chassis", and it names two halves, not one: "the plumbing no site
skips regardless of what it looks like, **and the composition primitives a theme reaches for
instead of hand-rolling its own**." The README then rules the layer "deliberately generous, not
minimal (Geoff, 2026-07-05)". The diagram carries only the plumbing half. The primitives half is
the half a developer makes a decision about.

**"every site copies" is doubly wrong.** A hand-built site copies nothing (D6). And per
`docs/superpowers/specs/2026-09-04-chassis-passes-design.md`, the copy story is about to move:
chassis-B's organizing rule 2 is "the exemplar uses the chassis it ships", the spec records that
"zero of seven composition primitives appear in any markup", and chassis-A adds Prettier config and
`format` scripts to the emitted scaffold. The phrase describes a snapshot that both passes are
aimed at changing.

**Correction:** "genre-free plumbing plus composition primitives: content indexes, feeds, runtime
composition, prose and token CSS. Yours to edit or delete." That last clause is the chassis's actual
distinguishing property (README's "Subtracting an element" section) and it is an *ownership* fact,
which is what this figure is for.

### D10. The scaffold-origin claim

**Where:** SVG line 224, "create-cairn-site scaffolds both from the Waymark template. You own them
from then on."

Substantially correct and well-phrased; `what-the-scaffold-wrote.md:7` confirms Waymark is the
source and the pruning. Two small things. The scaffold writes considerably more than "both" (routes,
migrations, `wrangler.jsonc`, `hooks.server.ts`, content), so a brace spanning only row C
under-describes what it is claiming. And the sidecar adds a claim the SVG does not: "you update it
by copying a newer version over it" (line 48). No published page describes that procedure;
`docs/extend/upgrade-cairn.md` does not mention the chassis at all. That is an unsupported update
story on a page a developer will follow.

**Correction:** drop the update sentence, or point it at whatever page will own it.

### D11. The admin's feature list

**Where:** SVG lines 182-184, "sign-in, editor, preview / media library / DaisyUI on Tailwind".

**Evidence:** `src/lib/sveltekit/admin-nav.ts:414-419` registers Library, Tags, Nav, Settings,
Editors, Help alongside the content concepts. The list omits the editor roster, which matters
here specifically: the legend introduces "editors" as an ownership party and nothing in the drawing
says who admits one. It is the one omission that costs the figure's own lesson.

The media library also overstates. `docs/extend/architecture.md:82` calls `AssetConfig` "a site's
**optional** media declaration"; a site with no R2 bucket has no media library. Listed flat beside
sign-in and the editor, it reads as always present.

"DaisyUI on Tailwind" is true (charter: the admin skeleton is DaisyUI + Tailwind) but it is a stack
fact on an ownership map, and it is the line most likely to be misread as applying to the public
site next door.

**Correction:** "sign-in, the markdown editor and preview, the editor roster, and an optional
media library."

### D12. The seam names on the Custom admin node

**Where:** SVG lines 192-194, `CairnAdminShell` / `createSectionAction` / `locals.cairnEditor`.

All three exist. The framing is wrong for one of them. The sidecar (line 73) calls it "the
`CairnAdminShell` custom-route seam", but `docs/extend/add-a-custom-admin-screen.md:25` says the
opposite of a seam a custom screen calls: "It renders inside the shared shell (`CairnAdminShell`)
automatically, since the shell wraps everything under `/admin`." A developer adding a screen never
imports it (the page's worked example imports `requireAccess`, `createSectionAction`, and the
admin toolkit, and never the shell). `CairnAdminShell` is imported once, by the `/admin/+layout.svelte`
mount (`build-a-site-by-hand.md:322`), which the same page says "you won't usually touch".

The guide's actual three are `requireAccess`, `createSectionAction`, and
`@glw907/cairn-cms/admin-toolkit`. The toolkit is the one whose absence is most felt: it is the
"UI toolkit to extend" the front-door content anchor names by name, and it is missing from a
front-door figure.

**Correction:** `requireAccess` / `createSectionAction` / `admin-toolkit`. Or, better, drop all
three (D-design: identifiers are unusable from an image) and label the node "your own screens,
inside cairn's shell and sign-in".

### D13. The D1 chip's sub-label

"magic-link auth store" undersells and slightly misdescribes. `examples/showcase/wrangler.jsonc:26`
names it "editor allowlist, sessions, tokens"; the scaffold applies `0000_auth.sql`,
`0003_preview.sql`, and `0004_login_nonce.sql`, so preview tokens for share-a-draft live there too.
"the auth store" alone would be both shorter and more accurate. Minor, and moot if the chips go.

### D14. The caption's scope

Sidecar line 28: "The developer owns the rest of the tree." The engine is not in the tree; it is in
`node_modules`, which is the whole point of the sentence before it. "The rest of the tree" is
therefore trivially true and says less than it appears to. And the admin interface, which the
caption assigns to cairn, is reached through `src/routes/admin/` files that are in the tree and are
the developer's (`what-the-scaffold-wrote.md:134`). The caption's tree/not-tree axis is not the
ownership axis.

**Correction:** "cairn owns the engine package and the `/admin` interface it serves. Everything
else is yours. You and your editors share `src/content/`: editors write the markdown, and your
adapter's concepts shape it."

### D15. The sidecar ships to consumers as an extend-track page

**Where:** the file `docs/extend/assets/cairn-site-anatomy.md` itself.

**Evidence:** root `package.json:191` includes `docs/extend` in `files`, so the whole subtree goes
into the npm tarball. `CLAUDE.md` records that cairn.pub renders the doc arms from the installed
tarball. `.vale.ini` globs `docs/**/*.md` onto Google, so this file is graded as published
developer documentation.

The file is a writer's worksheet. It contains "125 characters.", instructions to a future editor
("Keep the alt and the `<title>` saying the same thing"), a note about `<img>` font fallback, and a
promissory TODO. None of that is for a reader, and all of it will ship.

**Correction:** move it to `docs/internal/` (where the register's contributor zone puts exactly this
kind of artifact), or fold the three pieces into `architecture.md` and delete it. Either way it must
not stay under `docs/extend/`.

### Register findings, beyond those already named

- **The no-pitch keystone** holds overall. The sidecar is admirably free of selling. Two phrases
  lean: "design-agnostic" (D8) and "The repository is the database" (D5), both of which read as
  positioning rather than description. Fixing them for accuracy fixes the register too.
- **Alt text** is compliant: 125 characters, under the 150 cap, names the kind ("Diagram of"),
  and describes the relationship rather than the pixels. It matches the SVG `<title>` in substance.
  Good.
- **Caption** is one emphasis paragraph of complete sentences, placed after the figure, not
  spatially referenced. Compliant in form. Its content has the D14 problem.
- **Two-part text alternative**: present and substantive. But the `<desc>` at SVG line 3 is a third
  alternative, and it carries the D7 Workers Builds error independently of the other two. Three
  copies of the same content is three places to drift; the sidecar itself notes the `<desc>` is not
  exposed under `<img>`. Keep them, but the fix list has to touch all three.
- **Voice**: clean. One idea per sentence throughout, no em-dash tails, no setup-colon triads, no
  three-item list cadences. Better than the average page in the track.
- **One prose defect**: sidecar line 41, "The engine's companion is the `cairn` CLI" — "companion"
  is doing metaphor work in a definitional slot for a thing that is not a companion but a separate
  owner-side product (D4).

---

## Ranked top ten, both lenses

1. **The `cairn` CLI is inside the engine node** (D4). The charter says in as many words that the
   tool is not engine surface, and the plan says nothing under `tool/` reaches the tarball. On a map
   whose entire thesis is which box a thing belongs in, this is the one placement the charter
   explicitly forbids. **Fix:** remove it from the engine node. Give it its own node in an
   operator register, or cut it from this figure and let its own docs page introduce it.

2. **`cairn-cms[bot]` is not the reader's bot** (D1, D2). `create-cairn-site` names the App
   `cairn-<slug>`. **Fix:** "An editor's save commits with the editor as author and your GitHub App
   as committer." Drop the literal login from the SVG and the sidecar.

3. **The Workers Builds deploy claim is unqualified and optional** (D7). Stated in the edge label,
   the `<desc>`, and the sidecar; false for any site that declined `--connect`. **Fix:** "Connect
   Workers Builds and a push to `main` deploys the Worker; otherwise `create-cairn-site` deploys
   it." Change all three copies.

4. **`check:chassis-boundary` does not exist in a scaffolded site** (D3), and a sibling page says
   so explicitly. **Fix:** "The engine's own repository gates this boundary; a scaffolded site
   inherits it as a convention, not a gate."

5. **The arrangement teaches dependency, and ownership rides as an overlay** (design). **Fix:**
   band the frame's interior by owner rather than by layer, with `src/content/` straddling the
   seam. That is the single change that makes the stated lesson the one the arrangement carries,
   and it retires the four-register legend's weakest entry along the way.

6. **"The repository is the database"** (D5): a coined metaphor in a definitional slot, contradicted
   by the same figure's own D1 and R2 chips and by `data-tiers.md`. **Fix:** "Your markdown, one file
   per entry. A content change is a commit."

7. **The figure should be two figures** (design). The front door needs six nodes in one screenful;
   the architecture page needs this one, minus the Cloudflare chips, plus the write path's two
   branches. **Fix:** split, and in the same edit reconcile with `architecture.md`'s existing
   export-groups figure, which already draws this boundary.

8. **The write path is one arrow for two operations** (design). The GitHub node's own prose says
   there are two; the arrow says one. **Fix:** two labelled edges, "save (holding branch)" and
   "publish (to `main`)". Highest-value addition available, and it costs no nodes.

9. **`src/theme/cairn.config.ts` contradicts the destination page**, and the chassis/theme split
   does not exist in a hand-built site (D6). **Fix:** retitle to name the scaffold, or label row C
   by role with paths as scaffold defaults, and fix `architecture.md:47`'s `src/lib/` sentence in
   the same edit.

10. **The sidecar ships as a published extend-track page** (D15). A worksheet with "125 characters."
    and a TODO goes into the tarball and onto cairn.pub. **Fix:** move to `docs/internal/`, or fold
    and delete.

Immediately below the cut, in order: the four Cloudflare chips at the wrong altitude (a quarter of
the node budget for one ownership fact); "design-agnostic" as undefined jargon on the wrong subject
(D8); the chassis half-description and "every site copies" against the coming chassis passes (D9);
the seam names that are not the ones the guide teaches, and the missing `admin-toolkit` (D12); the
missing editor roster in an ownership map that names editors as a party (D11); the 800x1012 canvas
for a front-door figure (design).

---

## Verdict

**SHIP AFTER FIXES.**

The reason for "after fixes" rather than "ship": seven statements across fifteen nodes are false,
unqualified, or contradicted by a sibling page in the same track, and five of them are the kind a
developer acts on — a bot login they will grep for, a deploy that will not happen, a script that
will not run, a boundary gate they do not have, and a directory that is not where the page says.
On the cairn.pub front door those are read by an evaluator with no way to check them.

The reason for "ship after fixes" rather than "rework": every one of those is a label or a sentence.
The drawing's craft is high, the register discipline is better than the track average, the register
device works, and the "Your site" frame is a genuinely good ownership instrument. Nothing needs
redrawing to make the content true.

Two items are not label fixes and should be settled before the fix pass starts, because they change
what gets fixed: whether the CLI stays in the figure at all (rank 1), and whether this is one figure
or two (rank 7). Deciding the second first is cheaper — a front-door figure would drop the
Cloudflare chips, the seam identifiers, and the directory paths, which retires four of the
lower-ranked findings without any editing at all.
