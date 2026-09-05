# Fresh-context grade: the front-door concept figure

Read-only. Subject: `docs/extend/assets/cairn-concept.svg` with its sidecar
`cairn-concept.md`, generated from `docs/internal/site-figures.svg` by
`scripts/figures/build-site-figures.mjs`. Renders read: `concept-light-1100.png`,
`concept-dark-1100.png`, `concept-light-720.png`, `concept-dark-720.png`, plus a greyscale
conversion of the light 1100 render made for the ownership-device check.

Standards read: `07-audience-lens.md` section 4, `docs-register.md` (Visuals, the keystone, the
universal contract, the front door), the Vocabulary appendix of `2026-09-04-the-cairn-case.md`,
and the sibling figure `cairn-site-anatomy.svg` with its sidecar. Grounding sources:
`examples/showcase/wrangler.jsonc`, `docs/extend/add-a-second-audience.md`,
`docs/extend/add-a-custom-admin-screen.md`, `src/lib/audit/config.ts`.

The verdict is at the end. The form is right and the drawing is close. Three findings are
structural and the rest are copy and hygiene.

---

## Device 1: does the boundary read at a glance, before any label

**STRUCTURAL. Present in all four renders, and clearest in the greyscale conversion.**

The figure's lesson is the boundary, and the boundary is drawn with the weakest ink on the
canvas. The app outline is `.frame`, which is `stroke-width: 1.2`, dashed `5 5`, in
`--stroke-dev`, over a `--frame` fill of `#f7f7f7` on a `--bg` of `#fafafa`. Two consequences
follow.

First, the outline loses the weight contest to everything it contains. `Public site` and
`Your own screens` use the same dashed grey device at `stroke-width: 1.6`, so the container is
drawn more faintly than its own children. The outside pills carry a `--fill-outside` of
`#ececec`, which reads as more substantial ink than the app region's near-invisible `#f7f7f7`
against `#fafafa` (a fill difference of about 1.01:1 in light). In the greyscale render the eye
lands on the cairn band first, the outside pills second, and the app outline last. That inverts
the intended reading order.

Second, the boundary reuses the ownership vocabulary. Dashed grey is `you` in the legend, and
the outline is dashed grey, so a reader who maps the legend onto the outline concludes that the
whole app including cairn's screens is in the `you` register. The caption asserts "The outline
is the boundary" while the drawing says the outline is an ownership band. The one line the
figure exists to teach is the one line carrying two meanings.

The dark renders are slightly better here, because `--frame` `#171717` sits below `--bg`
`#1f1f1f` and gives the app region a real ground. Light is where the finding bites hardest.

## Device 2: legibility at 1100, and scroll behaviour at 720

**Legibility passes. Scroll composition is STRUCTURAL, and it is the weakest of the three.**

Every text run in both 1100 renders is comfortably legible. The `.f2` scale puts the smallest
type at 14 CSS px at scale 1.0, which clears the 12 px floor `site-figures.md` records with
room to spare. No text run overflows its containing box in any of the four renders. No label
collides with a rule, an arrow, or a border.

The 720 renders show the figure at natural size with the right side clipped, which is the
containment behaviour the register prescribes and not a violation on its own. The composition
is the problem. At 720 the reader sees `Public site`, `/admin`, and the whole of `cairn's
screens`, and sees nothing of `Your own screens`, which begins at x=712. The reader also loses
the Cloudflare node's body and the entire `Members' sign-in` node.

That means the initial view at the narrow width shows what cairn owns and shows none of what
the developer owns. A figure whose lesson is "what is cairn's, what is yours, what is outside"
is delivering one third of that lesson before any scroll, and it is delivering the third that a
first-time visitor is most likely to already assume. The two-part text alternative does carry
the missing half, and the register does exempt diagrams from the reflow bar, so this is a
composition defect rather than a rule breach. It still defeats the figure at the width where a
phone-shaped reader meets it.

Neither 720 render carries any cue that content continues to the right. There is no fade, no
shadow, and no partial glyph at the cut, because the cut falls in the gutter between
`cairn's screens` and `Your own screens`.

## Device 3: the two fills inside /admin, and the legend match

**PASSES, with one COSMETIC contrast finding.**

The two fills read correctly and immediately. `cairn's screens` is `.band-cairn`, a solid
1.6 border in `--stroke-cairn` with a left rule bar and a tinted fill. `Your own screens` is
`.band-dev`, a dashed 1.6 border with a neutral fill. Side by side at equal size, equal
position, and equal typographic weight, they read as two kinds of the same thing, which is
exactly idea 2 and idea 3 of the lens brief in one stroke.

The legend's swatches use the same three classes the nodes use, verified in the source rather
than by eye: `.band-cairn` with its `.rule` bar, `.band-dev`, and `.node-outside` at pill
radius. The sibling `cairn-site-anatomy.svg` renders the identical legend from the identical
classes in the same shared `<style>` block, so the two figures cannot drift. That is the right
construction.

The ownership device survives greyscale. In the converted render the three registers remain
separable by border treatment alone: solid plus a left bar, dashed, dotted at pill radius. The
fills are a secondary cue and are not load-bearing. This device is correct.

**COSMETIC, light 1100 and light 720.** The `/admin` container is `.card`, which is
`--fill-card` `#ffffff` with a `--stroke-hair` `#c4c4c4` border. Against the `--frame` fill of
`#f7f7f7` the fill difference is about 1.02:1 and the border contrast is about 1.56:1. Both
sit under the 3:1 non-text contrast bar of WCAG 1.4.11. `/admin` is the second most important
boundary in the figure, since it is the line the two fills sit inside, and it is currently the
faintest enclosure on the canvas after the app outline. In dark the border is worse at 1.65:1,
but the fill difference between `#3a3f45` and `#171717` carries the shape, so dark reads fine.

## Device 4: the outside parties, and whether members' sign-in reads as a vendor

**STRUCTURAL, and it is the ranked-first finding. Present in all four renders where the node
is visible, which is the two 1100 renders.**

`Members' sign-in` is drawn as `.node-outside`, under the eyebrow `OUTSIDE THE APP`, in a row
of three equal pills whose other two members are `Payments provider` and `Organisational mail`.
Both of those are genuine third parties. Position, device, size, and neighbours all say the
same thing, so the node reads as a vendor. The brief asked specifically whether it does, and it
does.

It is also wrong against the code. `docs/extend/add-a-second-audience.md` path B builds a
members' audience on `createAuthChannel`, which is a cairn export the site imports. The
resulting area is normal SvelteKit routes in the same app, placed outside `/admin` rather than
outside the app. Its store is a D1 binding on the same Cloudflare account, which
`examples/showcase/wrangler.jsonc` declares as `MEMBER_DB` alongside `AUTH_DB` and `APP_DB`.
So the members' sign-in is the developer's own code, in the developer's own app, on the
developer's own hosting account, built with an engine primitive. Every one of those four facts
contradicts the dotted outside-party pill.

The source of the error is a legible reading of the lens brief, which lists the members' own
sign-in among "what stays outside for every organization". The brief's own sentence in the
sidecar is precise: "separate from the editors' and outside `/admin`". Outside `/admin` became
outside the app somewhere between the brief and the drawing.

The other four outside nodes are correct. `Your GitHub repository` and `Cloudflare` are true
external accounts, and the `runs on` and `save and publish` edges land on the right ones.
Drawing the whole Cloudflare account as one band with its four products named inside it, rather
than as four nodes, is the right call and keeps the node count at ten against the roughly
fifteen budget.

## Device 5: dark scheme parity and contrast

**PASSES.**

Structural parity is exact. The two schemes place identical geometry, identical text, and
identical clipping at 720. Nothing appears in one scheme and not the other.

Text contrast clears 4.5:1 everywhere, computed from the declared tokens rather than estimated.
The tightest pair is `--muted` `#b3aea6` on `--fill-card` `#3a3f45` at 4.82:1, which is the
`the editing screens` apposition beside `/admin`. `--accent` `#8cc0f0` on the same card gives
5.52:1 for the `/admin` code label. `--ink` on `.band-cairn` gives 10.47:1. The arrow colour
`#8a8a8a` on the dark `--bg` gives 4.77:1, which clears the 3:1 non-text bar comfortably.

The only sub-bar value in dark is the `.card` hairline at 1.65:1, covered under device 3, and
the fill difference compensates for it there.

## Device 6: voice, against the design system and the vocabulary rulings

**Four COSMETIC findings. Nothing in the figure is a pitch, and the keystone's other edge, flat
or perfunctory prose, is also cleared.**

1. **`one codebase, one deploy`** is the one line in the figure written as a slogan rather than
   a label. Both halves are true. The cadence is the problem, since a two-beat parallel claim
   in the top-right corner of a front-door figure is benefit-forward framing, and it sits close
   to the register's own killed specimen "The whole organization works in one place". A plain
   statement of the same fact carries the information without the cadence.

2. **`shell`** in `in the same shell and sign-in` is unglossed. The Vocabulary appendix records
   that admin shell stops the designer, the IT admin, the board member, and the business owner,
   with "the screen frame" as the plain equivalent. The front door's legibility floor asks for
   context or a short apposition rather than avoidance, and there is neither here.

3. **`main`** in `a publish copies it to main` is set in body type, not code type. The sibling
   anatomy figure sets the identical word as `<tspan class="t-mono">main</tspan>` in its own
   publish edge label. As plain prose the word reads as an adjective, and the reader has no cue
   that it names a branch.

4. **British spelling.** The figure renders `the organisation's own work` and
   `Organisational mail`, and the sidecar uses `organisation` seven times. Every other
   published file under `docs/extend/` uses `organization`, and `cairn-concept.md` is the only
   published doc in the repository using the British form. The figure is the front door, so
   this is the most-read instance of the outlier.

Two further terms were checked and cleared. `D1`, `R2`, `Workers`, and `Email Sending` all
appear inside self-glossing clauses of the form "X holds Y", which is the apposition the
front-door register asks for. `SvelteKit` appears unglossed in the frame title, which the
front-door primary persona of a seasoned developer permits.

## Device 7: the caption and the alt against the register

**Two COSMETIC findings. The register's hard requirements are met.**

The alt is 142 characters, under the 150 cap. It starts by naming the kind, `Diagram of`, and
never says "Image of". The caption is complete sentences in one emphasis paragraph. The text
alternative is the two-part form the register requires for a complex diagram, in four sections
that map onto the drawing's four regions. The caption is never referenced spatially. The
figure is not an image of text or of a vendor UI. All of that passes.

**The caption points at the lesson, and its first sentence is the best line in the artefact.**
"The outline is the boundary." Four words, the whole lesson, first position. That is the right
opening and it should survive any rework.

1. **Alt and caption overlap.** The register says the caption is "never redundant with the
   alt". The alt says one app holding the public site and `/admin`, with cairn's screens and
   the site's own inside. The caption's first two sentences say the outline is the boundary,
   inside it is one app holding the public site and the editing screens at `/admin`, and inside
   `/admin` cairn's own screens sit beside the site's own. That is the same three facts in the
   same order. The caption earns its place from its third sentence onward.

2. **The alt omits the outside half.** The alt describes what is inside the outline and stops.
   A screen-reader user therefore gets the app and the two fills, and gets no signal that the
   figure also draws a repository, a hosting account, and three parties beyond the line. The
   register asks the alt to describe what the reader learns in context, and a third of what
   this reader learns is missing. There is room inside 150 characters for a clause naming the
   outside.

Two smaller notes. The caption's clause "composes from the admin toolkit's primitives" carries
`primitives` unglossed, and the Vocabulary appendix gives "ready-made screen parts" for the
toolkit. The caption's "Everything in the second fill, and everything beyond the outline, is
code and accounts the organisation owns and maintains" applies "code" to the payments provider
and to organisational mail, which the organisation does not write.

## Device 8: grounding, three labels verified against the tree

All three check out.

**The `/admin` contents.** The figure lists the markdown editor and preview, the media library,
sign-in from an emailed link, and the editor roster. `src/lib/audit/config.ts` enumerates the
audited admin routes as `/admin/posts`, `/admin/pages`, `/admin/media`, and `/admin/editors`,
which is the same set with the sign-in screen added. The `cairn-site-anatomy.md` sidecar names
the same four. Verified.

**The Cloudflare bindings.** The figure says Workers runs the app, D1 holds the sign-in store,
R2 the media, Email Sending the sign-in mail, and a push deploys.
`examples/showcase/wrangler.jsonc` declares `main` on the SvelteKit Cloudflare worker output,
`d1_databases` with `AUTH_DB` described as the "self-owned magic-link auth store", `r2_buckets`
with `MEDIA_BUCKET` described as "backing the media library", and `send_email` with `EMAIL`
described as the "Email Sending binding for magic links". Every clause maps to a declared
binding. Verified.

**Members' sign-in.** `add-a-second-audience.md` path B gives "a wholly separate login with its
own D1 store, its own session, and its own area outside `/admin` entirely". The figure's own
label, "its own login and store, outside /admin", is a faithful paraphrase. The label is
accurate. Its placement is not, which is device 4.

One drawing claim in the text alternative was also checked. "A route under `src/routes/admin/`
renders inside the shared shell automatically, is gated by the same access map, and composes
from the admin toolkit's primitives" matches `add-a-custom-admin-screen.md` sentence for
sentence. Verified.

## Hygiene, outside the eight devices

**COSMETIC.** The shipped `cairn-concept.svg` carries a `.node-plain` class rule and a
four-line comment introducing it as "a fourth, neutral register used ONLY by the concept
figure's panel A". The concept figure has no panel A. It is one system with a boundary, and the
two-panel form that had a panel A was replaced. No element in either shipped figure uses
`.node-plain`. The published asset therefore ships dead CSS plus a comment describing a figure
that does not exist, and a developer who opens the SVG reads it.

`docs/internal/site-figures.md` carries the matching stale sentence in its Registers section:
"The concept figure adds a fourth, `.node-plain`, for the parts of the setup in its left panel,
which belong to neither cairn nor the developer."

**NOTE, not a finding against the figure.** The two shipped SVGs are currently in sync with
their source, confirmed by running `node scripts/figures/build-site-figures.mjs --check`.
Nothing gates that. No `package.json` script and no workflow file references
`build-site-figures.mjs`, although `site-figures.md` describes `--check` as "the shape a CI gate
wants". A hand edit to a shipped file would survive review and be silently reverted by the next
emitter run.

---

## Ranked findings

| # | Severity | Device | Finding | Renders |
| --- | --- | --- | --- | --- |
| 1 | STRUCTURAL | 4 | Members' sign-in is drawn as an outside party beyond the app, which reads as a vendor and contradicts the code | light/dark 1100 |
| 2 | STRUCTURAL | 1 | The boundary is the faintest line in the figure and reuses the legend's `you` device | all four, worst in light |
| 3 | STRUCTURAL | 2 | At 720 the initial view shows all of cairn's half and none of the developer's, with no scroll cue | light/dark 720 |
| 4 | COSMETIC | 3 | `/admin`'s enclosure is below the 3:1 non-text contrast bar in light, at about 1.56:1 | light 1100, light 720 |
| 5 | COSMETIC | 6 | `one codebase, one deploy` is slogan cadence on a no-pitch front door | all four |
| 6 | COSMETIC | 7 | The alt omits everything outside the outline | sidecar |
| 7 | COSMETIC | 7 | The caption's first two sentences restate the alt | sidecar |
| 8 | COSMETIC | 6 | `shell` unglossed, `main` not in code type | all four |
| 9 | COSMETIC | 6 | British `organisation` against the rest of `docs/extend/` | all four, and sidecar |
| 10 | COSMETIC | hygiene | Dead `.node-plain` register and its "panel A" comment ship in the published SVG | source and both shipped files |
| 11 | NOTE | hygiene | `build-site-figures.mjs --check` is wired into no gate | repository |

## Verdict

**REWORK.** The form is right, the ownership device is right, the legend match is right, and
every grounded label is true. The rework is bounded and fully specified below. Nothing here
asks for a rethink of the figure.

The call rests on findings 1 and 2. A front-door figure whose one job is the boundary should
not draw the boundary as its weakest line, and should not tell a first-time visitor that a
developer-owned area of their own app is a third party. Finding 1 in particular is a factual
error on the most-read page in the project.

---

## Fixes

Every edit below is against `docs/internal/site-figures.svg`, the authoring source, followed by
`node scripts/figures/build-site-figures.mjs` to re-emit both shipped files. Never edit
`docs/extend/assets/cairn-concept.svg` directly. After the geometry edits, re-run the scratchpad
render harness at 1100 and 720 in both schemes and confirm that no text run crosses the right
edge of its containing box.

### Fix 1, finding 1: move members' sign-in inside the app

The members' area is the developer's own code in the developer's own app, so it belongs inside
the outline in the `you` register, not below it in the outside register.

1. In the `#figure-concept` element, change `viewBox="0 0 1100 580"` to `viewBox="0 0 1100 660"`
   and `height="580"` to `height="660"`.
2. Change the app frame rect from `height="278"` to `height="358"`.
3. Add a third `.band-dev` region inside the frame, below the existing row:
   `<rect class="band-dev" x="32" y="330" width="1036" height="58" rx="10"/>`, with
   `<text class="t-box" x="50" y="356">Members' area</text>` and
   `<text class="t-edge" x="196" y="356">your own sign-in and your own store, outside /admin</text>`.
4. Shift every element currently at y >= 336 down by 80. That is the two edge paths, the two
   edge labels, the `OUTSIDE THE APP` eyebrow, and every rect and text in the outside group.
5. Delete the former `Members' sign-in` node entirely: its `.node-outside` rect at x=736 y=484
   and both of its text elements.
6. Widen the `Organisational mail` node to fill the freed span, or centre the two remaining
   nodes across the canvas width, whichever the render reads better.
7. In the figure's `<desc>`, change "and three parties that stay where they were: a payments
   provider, organisational mail, and the members' own sign-in, which has its own login and
   store outside /admin" to "and two parties that stay where they were, a payments provider and
   the organization's own mail. Inside the app, below the public site and /admin, the site's
   own members' area carries its own sign-in and its own store."
8. In `docs/extend/assets/cairn-concept.md`, rewrite the "What stays where it was" section to
   name two outside parties rather than three, and move the members' sentence into the "Inside
   the app" section. State that the members' area is normal routes in the same app, built on
   `createAuthChannel`, with its own D1 store on the same Cloudflare account.

### Fix 2, finding 2: give the boundary its own device

Do not restyle `.frame`, since both figures use it and the anatomy figure's frame should not
change. Add a concept-only class beside `.node-plain`'s current position in the shared style
block:

```
  /* The concept figure's outline. It is the figure's subject, so it is drawn heavier than
     anything it contains, and it deliberately does not reuse an ownership register's device. */
  .boundary { fill: var(--frame); stroke: var(--ink); stroke-width: 2.6; }
```

Change the concept figure's app frame from `class="frame"` to `class="boundary"`. Then deepen
the app region's ground so the outline encloses something, by changing `--frame` from `#f7f7f7`
to `#f2f2f2` in the light block only. Re-check that `--muted` `#56514b` on `#f2f2f2` still
clears 4.5:1, which it does at about 7.1:1.

### Fix 3, finding 3: put the developer's half in the first 720 units

Narrow the left column and pull the `/admin` card left, keeping the two fills at their current
width so the second fill's title lands inside 720 units.

1. `Public site` rect: change `width="300"` to `width="226"`.
2. `/admin` card rect: change `x="348"` to `x="274"` and keep `width="720"`, giving a right edge
   at 994.
3. `/admin` code label: `x="366"` becomes `x="292"`. Its apposition: `x="462"` becomes `x="388"`.
4. `cairn's screens` rect: `x="364"` becomes `x="290"`. Its `.rule` bar: `x="365"` becomes
   `x="291"`. Its four text elements: `x="384"` becomes `x="310"`.
5. `Your own screens` rect: `x="712"` becomes `x="638"`. Its five text elements: `x="732"`
   becomes `x="658"`.
6. Change the figure's `viewBox` width and the `width` attribute from 1100 to 1010, and pull the
   frame rect and the outside row's right-hand geometry in by 90 to match.
7. Re-measure. The `Public site` body lines are the constraint, and
   `cairn brings no design to it` at 14 px is the longest. If any line crosses the narrowed box,
   shorten that line rather than widening the box, since `cairn brings no design to it` can
   become `cairn brings no design`.

If the measurement fails, fall back to leaving the geometry alone and asking the embedding page
for a right-edge scroll cue on the `overflow-x: auto` figure. Record that fallback in
`docs/internal/site-figures.md`.

### Fix 4, finding 4: make /admin's enclosure visible

In the light block of the shared style, change `--stroke-hair` from `#c4c4c4` to `#a8a8a8`,
which gives about 2.4:1 against the deepened `#f2f2f2` frame, and raise `.card`'s
`stroke-width` from `1.1` to `1.4`. If Fix 2's `--frame` change is not taken, use `#9e9e9e`
instead to clear 3:1 against `#f7f7f7`. Verify the anatomy figure still reads, since `.card` is
shared.

### Fix 5, finding 5: drop the slogan

Change `<text class="t-sub end" x="1068" y="88">one codebase, one deploy</text>` to
`one codebase, deployed together`. If the parallel cadence is still unwelcome, use
`the public site and /admin ship together` and re-measure the right-edge fit.

### Fix 6, findings 6 and 7: rewrite the alt and trim the caption

In `docs/extend/assets/cairn-concept.md`:

Alt, 149 characters, verified by count:

> Diagram of one cairn site's boundary: one app holds the public site and /admin, cairn's screens beside the site's own, GitHub and Cloudflare outside.

Caption, with the redundant opening folded away and the first sentence kept:

> *The outline is the boundary. Inside it, cairn's own screens sit beside screens the site
> writes, which a developer mounts through documented extension points and composes from the
> admin toolkit's ready-made screen parts. Those screens, and the accounts beyond the outline,
> are the organization's to own and maintain. The app runs on one Cloudflare account, and its
> content is markdown files in the organization's own GitHub repository.*

Add the character count line beneath the alt, matching `cairn-site-anatomy.md`'s form.

### Fix 7, finding 8: gloss `shell` and set `main` in code type

1. Change `<text class="t-edge" x="732" y="248">in the same shell and sign-in</text>` to
   `in the same admin frame and sign-in`. Apply the same wording in the figure's `<desc>` and in
   the sidecar's "Inside the admin" section.
2. Change `a save commits to a branch; a publish copies it to main` to
   `a save commits to a branch; a publish copies it to <tspan class="t-mono">main</tspan>`,
   matching the anatomy figure's treatment of the same word.

### Fix 8, finding 9: American spelling

Replace every `organisation` with `organization` and `Organisational` with `Organizational` in
`docs/internal/site-figures.svg` (the concept figure's text elements and its `<desc>`) and in
`docs/extend/assets/cairn-concept.md`. Re-measure the `Organizational mail` label, which gains
no width.

### Fix 9, finding 10: delete the dead register

1. Delete the `.node-plain` rule and its four-line comment from the shared `<style>` block in
   `docs/internal/site-figures.svg`. Confirm first that
   `grep -c 'class="node-plain"'` returns 0 for both shipped files, which it does today.
2. Delete `--fill-plain` and `--stroke-plain` from both the light and dark token blocks, since
   nothing else reads them.
3. In `docs/internal/site-figures.md`, delete the sentence beginning "The concept figure adds a
   fourth, `.node-plain`" and the sentence after it about the fourth register being absent from
   the docs figure.

### Fix 10, finding 11: gate the emitter

Add `"check:figures": "node scripts/figures/build-site-figures.mjs --check"` to
`package.json` scripts, and add it to whichever aggregate `check` script the repository's other
`check:` gates run under.
