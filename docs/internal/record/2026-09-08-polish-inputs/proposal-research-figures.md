# Proposal research, lens 7a: how the exemplar docs use figures

Research for `docs-standard-proposal.md` revision 2 (Opus, fresh context, 2026-09-08), with every exemplar page fetched and its figures counted. Folded into revision 2.

---

## What I checked

Repo (read-only, nothing edited): `docs/internal/docs-register.md` "Visuals", the 2026-08-15 rulings record it points at, `docs/internal/site-figures.svg` + `scripts/figures/build-site-figures.mjs`, the two emitted SVGs and their sidecars under `docs/extend/assets/`, `scripts/checks/check-visuals.mjs`, the uncommitted `check:figures` wiring, all 11 mermaid fences in the published arms, and the front-door draft `docs/internal/record/2026-09-04-cairn-case/25-front-door-proposal.md`. Web: every exemplar named in the structure research, plus Kubernetes' diagram guide, Google's image rules, W3C/WCAG, and six diagram-discipline comparison sets.

---

## Evidence: what the exemplars actually do

Counts are of explanatory figures. Site chrome, logos, and promo art are excluded and noted separately.

| Page | Explanatory figures | Kind | Instead |
|---|---|---|---|
| SQLite, *Appropriate Uses* | **0** | — | prose, bulleted use-case lists, one 3-item decision checklist |
| Kubernetes, *Overview* | 1 | authored SVG, three-era timeline | — |
| Kubernetes, *Cluster Architecture* | 1 | authored SVG, architecture boxes | — |
| Kubernetes, *Workloads* (index) | **0** | — | ~35 links, no table |
| *Why Astro* | **0** | (2 sidebar promo WebP) | prose + a five-item design-principles list |
| PostgreSQL, *Concurrency Control* | **0** | — | prose only, 0 tables, 0 code blocks |
| PostgreSQL, *CREATE INDEX* | **0** | — | BNF synopsis block + 10 example blocks; no railroad diagram |
| MDN, *scrollIntoView* | **0** static | 2 live interactive examples | code blocks |
| Cloudflare Workers, *Get started* | **0** | — | 6 code blocks, one per step |
| GitHub Docs, *Creating a pull request* | **8** | annotated screenshots (`.png`) | — |
| Astro tutorial (intro + a step) | **0** | (promo banners only) | 4 code blocks + a checkbox progress tracker |
| Cloudflare Workers *Errors* | **0** | — | **5 tables** of error codes + 8 code blocks |
| GitLab *Troubleshooting Git* | **0** | — | ~35 code blocks |
| GOV.UK guidance page | **0** | — | prose + lists |
| Mozilla SUMO article | bot-gated, unverified | (house style is annotated screenshots) | — |

Extension sets:

- **Tailscale, "How Tailscale works":** 8 figures, all network topology, one palette, each captioned `Figure N.` plus a full sentence, each placed immediately after the paragraph that introduces its concept. https://tailscale.com/blog/how-tailscale-works
- **Raft paper:** the exemplar is that **two of its most-cited "figures" are not pictures**. Figure 2 is a boxed condensed specification (state fields, two RPCs, rules for servers) and Figure 3 is five named safety properties. Only Figure 4 (server states) is a real state machine and Figure 6 (log arrays) a real data picture. Every caption is a standalone 2 to 4 sentence paragraph; every figure is cross-referenced from prose by number; later figures reuse the earlier figures' visual grammar. https://raft.github.io/raft.pdf
- **Cloudflare reference architecture (SASE):** 29+ diagrams on one page, no figure numbers, captions as ordinary sentences under each image, one consistent icon/line/palette vocabulary, and a "progressive redraw" device where the same base topology gains one highlighted piece per step. https://developers.cloudflare.com/reference-architecture/architectures/sase/
- **Google SRE book, ch. 21:** 2 figures in the chapter (one histogram, one dependency stack), numbered `Figure 21-1`, captions terse (a few words). Retry-state discussion stays in prose. https://sre.google/sre-book/handling-overload/
- **Stripe:** the premise did not hold. Raw HTML for `/payments/payment-intents`, `/connect`, and `/billing/subscriptions/overview` shows **zero content diagrams**; the subscription lifecycle, a literal state machine, is rendered as **two status tables**. Whatever Stripe's reputation, these concept pages are table-driven.
- **SQLite:** exactly one diagram across `arch.html`, `fileformat2.html`, `docs.html` (an inline Pikchr-generated SVG on `arch.html`) with **no caption, no alt, no number**, referred to only as "a nearby diagram". `fileformat2.html` uses 10 tables where other specs would draw byte layouts.
- **Rust Reference:** zero images; grammar productions, code blocks, and bracketed rule IDs (`[destructors.scope.nesting.function-body]`) carry the structure.

Verbatim alt text, pulled from raw HTML:

- Kubernetes architecture: `alt="The control plane (kube-apiserver, etcd, kube-controller-manager, kube-scheduler) and several nodes. Each node is running a kubelet and kube-proxy."` (a full textual equivalent)
- Kubernetes overview: `alt="Deployment evolution"` (a bare label; the register cites the first one, correctly, and should not cite this one)
- GitHub Docs: `alt="Screenshot of the 'Open a Pull Request' dialog window. A button with a dropdown icon, labeled 'base: development', is outlined in orange."`

Published house rules found:

- **Kubernetes:** "Always use diagram captions." Caption format is `Figure NUMBER.` + short text + a period, positioned **below** the diagram; a **referral** in the text precedes the diagram and must match the number; "avoid using spatial references such as ..the image below.."; "Keep Diagrams Simple." Mermaid is the sanctioned tool. https://kubernetes.io/docs/contribute/style/diagram-guide/
- **Google:** "Use images only when they provide useful visual explanations of information that is otherwise difficult to express with words." Alt "155 characters or less"; "Introduce diagrams in the text, not in the alt text"; "Figure captions (and figure numbers) are optional"; "Don't use images of text, code samples, or terminal output." https://developers.google.com/style/images
- **GOV.UK:** "Only use a diagram if it makes the content clearer or summarises a large amount of information" and "do not use images alone to provide information". The rule page itself carries no images. https://www.gov.uk/guidance/content-design/images
- **Mozilla SUMO:** "incorporate screenshots only for concepts that genuinely benefit from visual aid, and avoid overusing them". https://support.mozilla.org/en-US/kb/how-place-images-article

---

## Where cairn stands

**Already decided and holding up.** The 2026-08-15 rulings did the hard work: a threshold (three or more actors or branching paths, plus a spanning-relation criterion), an inventory pass that cut 5 of 17 proposed diagrams with a named replacement form for each, an alt/caption standard, and the reflow exemption with containment in its place. Twelve diagrams shipped, 11 mermaid fences live in the arms today. That density (about one per concept page in extend, three in admin, one in editors) sits inside the exemplar range and above the median, which is near zero.

**The two SVG figures are outside that system.** They were built after the rulings, by a different method, and nothing in the register describes them:

- One authoring file `docs/internal/site-figures.svg` holds a shared `<style>` block and two nested `<svg>` elements; `scripts/figures/build-site-figures.mjs` promotes each to a root SVG, injects the shared style and marker defs, and writes `docs/extend/assets/*.svg`. `--check` fails on staleness; `check:figures` and its `test.yml` line are uncommitted.
- Palette is a **hand-copied sRGB approximation** of the Waymark theme's oklch tokens in `examples/showcase/src/theme/theme.css`. The source comment says so and says a repalette of that file "needs a matching edit here." Nothing gates that. This is the one real drift hazard in the setup.
- Three ownership registers (`.band-cairn` solid + rule bar, `.band-dev` dashed, `.node-outside` dotted pill), one type stack, per-figure type scale only. Measured 12 px floor from the rendered DOM, not from character counts.

Five concrete problems, all currently unnoticed because the files are untracked:

1. **`check:arm-indexes` already fails on them.** I ran it: `docs/extend/assets/cairn-concept.md` and `cairn-site-anatomy.md` are unindexed pages in a published arm, and `docs/internal/site-figures.md` is unindexed in the internal arm. Worse, `docs/extend` is in `package.json` `files`, so those two authoring sidecars would **ship in the npm tarball as published docs pages** and be Vale-graded under Google.
2. **The text alternative is in the wrong place.** The register says "the essential information stated in body text." For both figures it lives in a sidecar `.md` that no reader opens. The SVGs do carry `<title>`/`<desc>`, but the sidecars state the pages will embed with `<img>`, which hides both. So the long description reaches nobody.
3. **Neither figure is embedded anywhere.** `grep` for `assets/cairn` across `docs/extend/architecture.md` and `docs/why-cairn.md` returns nothing. There is no placement to review yet.
4. **`check:visuals` has a hole for exactly this form.** It matches `<img ... alt="...">` and checks length, but an `<img>` with **no alt attribute at all** does not match the regex and passes silently. The register's own rule ("never an omitted attribute") is unenforced. HTML images also carry no caption requirement, while mermaid fences do.
5. **Node budget.** The register sets about 15. The concept figure has 16 `<rect>` and 39 `<text>`; the anatomy figure has 21 `<rect>` and 52 `<text>`. Some of those rects are bands and legend swatches, so this is not a clean breach, but the budget has no countable definition and these two are the pages that need one.

---

## Recommendations (paste-ready)

### 1. When a diagram earns its place

> A diagram appears only where a relation between three or more things, or a branch between paths, is the fact being taught, and prose would have to state that relation as a series. Everything enumerable goes to a table or a list.
>
> The threshold is Google's, sharpened by counting: "use images only when they provide useful visual explanations of information that is otherwise difficult to express with words." The exemplars set the bar high. Of the fourteen pages surveyed for the structure standard, ten carry no explanatory figure at all. *Appropriate Uses For SQLite* argues a whole architecture in prose and one three-item checklist. *Why Astro* explains island architecture with a five-item list. PostgreSQL explains MVCC, a topic about versions over time, in flat prose with no figure and no table. Stripe documents a seven-state subscription lifecycle as two status tables rather than a state diagram.
>
> Three replacement forms carry most of what a rejected diagram would have carried:
>
> - **A table**, when the content is a set of items with the same fields. Cloudflare's Workers error page is five tables of code, meaning, and fix, with no figure. SQLite documents its binary file format in ten tables rather than byte-layout drawings.
> - **An ordered list**, when the content is a sequence with one actor. This is the form the 2026-08-15 sitting already used to retire the guard-order diagram.
> - **A code block**, when the reader will type or read the thing. Cloudflare's get-started guide is six code blocks and no images. GitLab's Git troubleshooting page is about thirty-five.
>
> A fourth form is worth naming because the strongest single example in the survey uses it. **A figure may be a boxed specification rather than a picture.** Raft's Figure 2 is the algorithm's complete condensed spec in four bordered boxes, and Figure 3 is five named safety properties. Neither draws anything. Both are cross-referenced by number from the prose the way a picture would be. Where cairn has a rule set that a reader returns to (the access map, the sanitize floor's stage rules), that shape beats both a drawing and a wall of prose.
>
> One diagram per page is the working ceiling for a concept page. Kubernetes' two flagship concept pages carry one figure each. Google's SRE book carries two per chapter. The exception is a reference architecture, where a sequence of redraws of one base picture is the form (Cloudflare's SASE page runs 29), and cairn has no page of that kind.

### 2. Which diagram kinds fit which page type

> - **Concept page** (extend, and the front door's extended form): at most one figure, and only an architecture or boundary diagram, drawn as containment. A concept page never carries a sequence diagram; if the page's hard fact is an order of events, the page is a task guide wearing the wrong shape.
> - **Task guide** (admin, extend how-tos): no figure by default. The step's own code block or command is the figure. A task guide takes one flow diagram only where the path forks and the reader must pick a branch before the first step. This is the criterion `before-you-start.md` and `create-your-site.md` already meet.
> - **Reference entry:** never a diagram. The signature block is the figure. This is PostgreSQL's `CREATE INDEX`, MDN's `scrollIntoView`, and Rust's Reference, all three of which carry zero images and put the syntax block first.
> - **Index page:** never a diagram. Kubernetes' `concepts/workloads/` index is links, no image, no table.
> - **Front door:** at most one figure, and only if it carries the boundary. See recommendation 6.
> - **Troubleshooting and condition entries:** never a diagram. A table is the form (Cloudflare's error tables).
> - **Editors track:** at most one figure per page, and screenshots only where the reader is looking at the screen the page describes. GitHub Docs' annotated-screenshot convention is the model: one screenshot per step, placed after the step text, with a single annotation device (an orange outline on the one control the step names) and never a second device on the same page. The register's existing ban on picturing a vendor's UI still holds; cairn may only screenshot cairn's own admin.
>
> No page type gains a figure quota. Every one of these is a ceiling, and zero is the default at every one of them.

### 3. Caption, alt, and text alternative

> The register's existing rules stand. Three amendments, each with its reason:
>
> **The text alternative goes in the page, not beside it.** W3C's complex-image guidance names three ways to attach a long description, and all three put it where a reader can reach it: adjacent text on the same page, an alt that points at a heading on the same page, or a `figure`/`figcaption` pair. A description in a sidecar file the reader never opens satisfies none of them. For a hand-authored figure, the long description is a section of the page's own prose, and the alt names where it is, in MDN's form ("Described under the heading ..."). The `.md` sidecar stays as an authoring note and moves to `docs/internal/`.
>
> **Alt is a textual equivalent, not a label.** Kubernetes' architecture alt is the exemplar the register already cites and it is a full sentence naming the relation drawn. The same site's overview alt is `"Deployment evolution"`, which is a label, and is not an exemplar. Cap stays at 150 characters, the tighter of Google's 155 and Microsoft's 150.
>
> **Numbering and referral become mandatory for any figure the prose points at.** Kubernetes requires all three parts together: the diagram, a caption prefixed `Figure N.` below it, and a referral in the prose above it that names the same number. cairn already forbids spatial reference ("the image above"), which is precisely the rule that forces a number. Today the register makes numbering conditional and no cairn figure is numbered, which leaves the writer with no legal way to point at a figure at all. Number every figure on a page that has more than one, and every figure the prose refers to. Raft, Tailscale, and the SRE book all number; Cloudflare's architecture pages, which do not, are also the pages where captions read as loose body text.
>
> Against WCAG: alt satisfies 1.1.1 Non-text Content; the two-part alternative is W3C's own complex-image method; the reflow exemption the register claims is stated in the normative text of 1.4.10, which excepts "parts of the content which require two-dimensional layout for usage or meaning" and names "images required for understanding (such as maps and diagrams)" in its note. The register's deviation is correctly grounded. Its "containment instead" substitute is the right one, because the same Understanding document says authors "can improve the user's experience by making efforts to reduce scrolling for that type of content."

### 4. Placement

> A figure sits **after** the prose that first states its point, never before it, and never as a page's opening element.
>
> Both Kubernetes figures land after the sentence that introduces the concept, as a visual restatement. Tailscale's eight figures each follow the paragraph that introduces them. GitHub Docs' screenshots each follow the step they illustrate. No surveyed page opens with a figure.
>
> The order on the page is: the prose that states the point, then the referral sentence naming the figure number, then the figure, then the caption below it. Where the figure is complex, the section carrying the long description follows the caption.
>
> This has a second effect worth stating: a figure that cannot be placed after prose that already makes its point is a figure carrying an argument the page never makes, and it should be cut or the prose should be written.

### 5. Tooling and the gate

> **Mermaid stays the default, and hand-authored SVG stays the named escalation.** This is the 2026-08-15 ruling and nothing in the new research disturbs it. Mermaid renders on GitHub, in the artifact host, and through cairn-pub's themed render, so one source serves the repo, a review page, and the site. Kubernetes sanctions the same tool for the same reason. The escalation is used only where the themed mermaid render cannot carry the figure at the polish bar, which is true of the two ownership figures and is unlikely to be true of a third.
>
> **The escalation keeps a single generated source.** `docs/internal/site-figures.svg` plus `scripts/figures/build-site-figures.mjs` is the right shape and should be ratified as the rule: hand-authored SVG is never edited in place, it is emitted, and every emitted file carries the generated-from comment it carries today. One shared `<style>` block holds the palette, the stroke weights, the type stack, and the ownership registers, so a second figure cannot introduce a second visual language. Cloudflare's architecture pages and Tailscale's post are the evidence that one vocabulary across figures is what makes a set read as a set.
>
> **Cut the palette-drift hazard.** The palette is a hand-copied sRGB approximation of the Waymark theme's oklch tokens, and a comment is the only thing tying them together. Either derive the SVG custom properties from `theme.css` at build time, or add a check that reads both files and fails when a mapped token moves. A comment saying "needs a matching edit here" is the weakest form of watch item and the repo's own rule says so.
>
> **`check:figures` should check five things, not one.** Today it checks staleness only. Add:
>
> 1. **Staleness** (what it does now): every emitted file matches what the source would emit.
> 2. **Placement:** every emitted `.svg` under a published arm is referenced by at least one published page. An unreferenced figure is dead weight in the tarball.
> 3. **The three parts:** every referenced figure has a caption, and where the page carries more than one figure, a `Figure N.` prefix and a matching referral in the prose.
> 4. **The long description:** a figure declared complex has a named heading in the page's own prose, and its alt points at that heading.
> 5. **Node budget:** a countable definition (labelled nodes, excluding band containers and legend swatches) with the register's ~15 as the fail line.
>
> **Close the `check:visuals` hole in the same change.** The gate matches `<img ... alt="...">` and never sees an `<img>` with no `alt` attribute at all, so the register's "never an omitted attribute" rule is currently unenforced. Any `<img>` in a scanned arm without an `alt` attribute should fail.
>
> **Move the sidecars.** `docs/extend/assets/*.md` are authoring notes sitting inside a published arm. They fail `check:arm-indexes` today and they would ship in the npm tarball as public pages. They belong at `docs/internal/`, alongside `site-figures.md` (which needs a link from `docs/internal/README.md` for the same gate).

### 6. Do the front door's two figures earn their place?

> **The anatomy figure, yes. The concept figure, not on the front door.**
>
> The **ownership map** belongs on `docs/extend/architecture.md`, which is where it is already slated. It clears the threshold on the sitting's own spanning criterion: `src/content/` drawn across the seam between two ownership bands is a spanning relation, and a list cannot state a span. The page is a concept page and takes one figure. It has one, and it already carries a mermaid system diagram, so the page would then hold three figures against a one-per-concept-page ceiling. Ruling which of the three survives is the real question, and the answer is probably that the ownership map replaces the system block diagram, since both draw the engine's parts and only one draws who owns them.
>
> The **concept figure** is a harder case and the exemplar evidence goes against it. Every "why" page in the survey carries zero explanatory figures: SQLite's *Appropriate Uses*, *Why Astro*, and PostgreSQL's *Concurrency Control*. The one comparable page that does carry a figure, Kubernetes' *Overview*, is a concept overview, not a decision page, and its figure is a history timeline with a two-word alt.
>
> Three specifics compound it:
>
> - The figure's lesson is already carried by the draft's own second sentence: "A cairn site is one SvelteKit app holding the public pages and an editor admin at `/admin`." A figure that restates the sentence above it is not answering an otherwise-difficult-to-express question.
> - The fresh-context grade found the figure's own subject, the boundary outline, drawn in the weakest ink on the canvas and in the dashed grey device the legend assigns to "you", so a reader who consults the legend concludes the whole app including cairn's screens is the developer's. That grade's verdict was "ship after cosmetic fixes", but two of the three structural findings were about the boundary and the narrow-width composition, and the narrow-width one still stands: at 720 the reader sees all of cairn's screens and none of the developer's, which delivers a third of a three-part lesson and the third a first-time reader already assumes.
> - The figure has 16 rects and 39 text runs against a ~15 node budget, and the front door is the page whose reader has the least context to spend on a dense drawing.
>
> Recommended: hold the concept figure off `why-cairn.md`. If it ships, it ships on cairn.pub's marketing front page, which is not a docs page and does not grade under this standard, and the docs front door stays prose. The version of it that would earn a place on `why-cairn.md` is a much smaller drawing: the boundary, three or four things inside it, two outside, no legend, no registers. That figure would answer the one question prose answers worst, which is what is inside the app and what is not.

### 7. Corpus entries for figures

> Two entries, both narrow, both about a figure rather than a page:
>
> - **`raft-figure-2`** — Raft, "In Search of an Understandable Consensus Algorithm", Figure 2 and its caption. Public PDF; the excerpt is the caption plus one of the four boxes. It calibrates two things nothing else in the corpus does: a figure that is a condensed specification rather than a picture, and a caption that stands alone in complete sentences without the body text. Cite it when reviewing whether a proposed diagram should be a boxed rule set instead.
> - **`k8s-architecture-figure`** — Kubernetes, *Cluster Architecture*, the figure with its verbatim alt string, its `Figure 1.` caption, and the sentence that introduces it. CC BY 4.0. It calibrates the whole three-part contract in one artifact: referral, figure, numbered caption below, and a textual-equivalent alt. The register already cites this alt informally; the corpus entry makes it citable in a review verdict.
>
> A third entry is not needed. Tailscale's post is unlicensed for vendoring and its discipline (one palette, sentence captions) is already covered by the two above.

---

## Rejected, with reasons

**A figure quota per track or per page type.** Rejected. Every surveyed house rule frames figures as conditional (Google's "only when", GOV.UK's "only use a diagram if", SUMO's "only for concepts that genuinely benefit"). A quota makes zero look like a failure, which is the state most exemplar pages are in. Ceilings only.

**Numbering every figure everywhere (Kubernetes' full rule).** Rejected as stated, adopted where it bites. Kubernetes numbers every figure on every page; so does the SRE book. Cloudflare's 29-diagram architecture page numbers none and reads fine because no caption ever points at another. cairn's pages carry one or two figures, so numbering is required only where the prose refers to a figure or the page has more than one. This is Google's position ("figure captions and figure numbers are optional") plus the referral rule, which is the combination that makes the ban on "the image above" enforceable.

**Adopting Stripe as the lifecycle-diagram exemplar.** Rejected on evidence. The raw HTML of three Stripe concept pages shows zero content diagrams, and the subscription state machine is documented as two tables. The commonly cited claim that Stripe "replaces text with diagrams" is secondhand blog commentary, not observable on the pages. Stripe is a good exemplar for something else, which is that a table can carry a state machine.

**Generating the two ownership figures from mermaid.** Rejected. Mermaid has no ownership-band primitive, no control over the three border registers, and, per Kubernetes' own tips, "no Mermaid support for additional icons or artwork". A subgraph nested in a subgraph does not draw `src/content/` across a seam. The escalation to hand-authored SVG is the ruling's existing path and this is the case it was written for.

**Committing the two SVGs directly and dropping the emitter.** Rejected. The shared style block is the whole reason a second figure cannot invent a second visual language, and two hand-maintained copies of it drift by the second edit. The emitter plus `--check` is the cheap version of the one-visual-language rule.

**Adopting the SQLite figure convention (one uncaptioned inline diagram referenced as "a nearby diagram").** Rejected. It is the weakest discipline in the survey: no alt, no caption, no number, and a spatial reference of exactly the kind cairn's register already bans. Its presence in the survey is evidence that near-zero figures is a defensible posture, not that unlabelled figures are.

**Screenshots in the extend or admin tracks.** Rejected, unchanged from the register's existing rule. The one heavy screenshot exemplar (GitHub Docs) screenshots its own product, which cairn's editors track may do for cairn's own admin and no track may do for a vendor's dashboard.

**Motion, animated diagrams, and interactive figures.** Rejected, already ruled out 2026-08-15 and nothing found reopens it. MDN's live examples are the nearest counterexample and they are a code-execution system, not a figure.

---

## Sources

- https://sqlite.org/whentouse.html · https://sqlite.org/arch.html · https://sqlite.org/fileformat2.html
- https://kubernetes.io/docs/concepts/overview/ · https://kubernetes.io/docs/concepts/architecture/ · https://kubernetes.io/docs/concepts/workloads/ · https://kubernetes.io/docs/contribute/style/diagram-guide/
- https://docs.astro.build/en/concepts/why-astro/ · https://docs.astro.build/en/tutorial/0-introduction/ · https://docs.astro.build/en/tutorial/2-pages/1/
- https://www.postgresql.org/docs/current/mvcc-intro.html · https://www.postgresql.org/docs/current/sql-createindex.html
- https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
- https://developers.cloudflare.com/workers/get-started/guide/ · https://developers.cloudflare.com/workers/observability/errors/ · https://developers.cloudflare.com/reference-architecture/architectures/sase/
- https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request
- https://docs.gitlab.com/ee/topics/git/troubleshooting_git.html
- https://www.gov.uk/guidance/content-design/images · https://www.gov.uk/guidance/classifying-vehicles
- https://support.mozilla.org/en-US/kb/how-place-images-article (the SUMO article itself is bot-gated to every fetch method tried; its image counts are unverified)
- https://docs.stripe.com/payments/payment-intents · https://docs.stripe.com/connect · https://docs.stripe.com/billing/subscriptions/overview
- https://tailscale.com/blog/how-tailscale-works
- https://raft.github.io/raft.pdf
- https://sre.google/sre-book/handling-overload/
- https://doc.rust-lang.org/reference/
- https://developers.google.com/style/images
- https://www.w3.org/WAI/WCAG22/Understanding/reflow.html · https://www.w3.org/WAI/tutorials/images/complex/
- https://mermaid.js.org/config/accessibility.html
