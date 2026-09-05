# Fresh-context regrade: the front-door concept figure, after the ten fixes

Read-only. Subject: `docs/extend/assets/cairn-concept.svg` and its sidecar
`docs/extend/assets/cairn-concept.md`, generated from `docs/internal/site-figures.svg`.
Renders read: `concept-light-1100.png`, `concept-dark-1100.png`, `concept-light-720.png`,
`concept-dark-720.png`, plus `anatomy-light-1100.png` for the sibling regression check.
Prior grade read in full: `concept-figure-grade.md`, verdict REWORK bounded.

The verdict is at the end.

---

## The ten fixes, one by one

### Fix 1, members' sign-in moves inside the app: FOLDED

The former `.node-outside` pill is gone. `grep` finds no `Members' sign-in` node in the
shipped file. In its place, inside the outline:

```
<rect class="band-dev" x="32" y="330" width="946" height="58" rx="10"/>
<text class="t-box" x="50" y="366">Members' area</text>
<text class="t-edge" x="196" y="366">your own sign-in and your own store, outside /admin</text>
```

The boundary rect is `x="16" y="56" width="978" height="358"`, spanning y 56 to 414, so the
band at y 330 to 388 sits inside it. The band uses `.band-dev`, the `you` register, and it sits
below the `/admin` card rather than inside it. Both structural requirements hold: inside the
app outline, outside `/admin`, in the developer register. All four renders show it.

The `<desc>` now reads "two parties that stay where they were, a payments provider and the
organization's own mail", and adds "Below them, still inside the outline, the site's own
members' area carries its own sign-in and its own store, outside /admin". The sidecar's "What
stays where it was" section names two things, and the members' sentence has moved into "Inside
the app" with the `createAuthChannel` grounding and the same-account D1 store, as specified.

### Fix 2, the boundary gets its own device: FOLDED

The shared style block carries the new class with its comment:

```
.boundary { fill: var(--frame); stroke: var(--ink); stroke-width: 2.6; }
```

The concept figure's app rect uses `class="boundary"`. `--frame` is `#f2f2f2` in the light
block. The anatomy figure still uses `class="frame"` on its own outline, unchanged.

Measured, from the declared tokens:

| Line | Light | Dark |
| --- | --- | --- |
| boundary `--ink` against `--bg` | 16.33:1 | 13.45:1 |
| boundary `--ink` against the `--frame` fill it encloses | 15.22:1 | 14.63:1 |
| `.band-cairn` stroke against the card fill | 7.36:1 | n/a |
| `.card` hairline against `--frame` | 3.83:1 | 5.62:1 |
| `.band-dev` stroke against `--frame` | 3.58:1 | 5.19:1 |
| `.node-outside` stroke against `--bg` | 4.35:1 | 5.43:1 |

The boundary is the highest-contrast line on the canvas in both schemes by a factor of more
than two over its nearest rival, and it is also the widest stroke at 2.6 against 1.6 for every
band and 1.4 for the card. Both halves of "heaviest line" hold, weight and contrast. The
renders agree: in light the eye lands on the black outline first, and in dark on the near-white
one. The device no longer reuses the dashed grey `you` treatment, so the legend cannot be
mapped onto it.

The app region's ground is still faint against the page, at 1.07:1 in light and 1.09:1 in dark.
That no longer matters, because the outline now carries the enclosure on its own.

### Fix 3, the developer's half inside the first 720 units: PARTIAL

Every geometry edit was taken. `viewBox="0 0 1010 648"`. `Public site` is `width="226"`. The
`/admin` card is `x="274" width="720"`, right edge 994. `cairn's screens` is `x="290"`, its
rule bar `x="291"`, its text `x="310"`. `Your own screens` is `x="638"`, its text `x="658"`.
`docs/internal/site-figures.md` records the new dimensions in its scale table, 1010 x 648 at
scale 1.00 with a 14.00 CSS px floor.

The structural item passes. In both 720 renders the reader sees both fills: the whole solid
blue-bordered `cairn's screens` band, and the left portion of the dashed `Your own screens`
band with its distinct device, fill, and border clearly readable as the second of a pair. The
prior defect, a first view showing all of cairn's half and none of the developer's, is gone.

It is PARTIAL because the second band's title is cut mid-word. The label starts at x=658 and
renders as `Your ow` at the 720 cut, with its body lines cut at `the organ`, `sign-ups,`,
`in the sam`, and `code the s`. Fix 3 step 7 asked that the second fill's title land inside 720
units, and a 16px semibold `Your own screens` needs roughly 130 units from x=658, ending near
788. The intent of the fix is served, since the mid-word cut is itself an unambiguous
continues-to-the-right cue, which the old gutter cut was not. The remaining gap is that no
label completes inside the first view for the developer's half.

The fallback route was not needed and correctly not recorded.

### Fix 4, `/admin`'s enclosure: FOLDED, and better than specified

Light `--stroke-hair` is `#7a7a7a`, not the `#a8a8a8` the fix proposed, and `.card` is
`stroke-width: 1.4`. At `#7a7a7a` against the deepened `#f2f2f2` frame the ratio is 3.83:1,
which clears the 3:1 non-text bar of WCAG 1.4.11 rather than approaching it. Dark
`--stroke-hair` is `#909090` at 5.62:1. The `/admin` card is a visible enclosure in all four
renders, in both schemes.

### Fix 5, the slogan: FOLDED

`<text class="t-sub end" x="978" y="88">one codebase, deployed together</text>`. The two-beat
parallel claim is gone.

### Fix 6, the alt and the caption: FOLDED

The alt is the proposed line, and it counts at exactly 149 characters, verified by count rather
than estimate. It names the kind first, never says "Image of", and now carries the outside half
through "GitHub and Cloudflare outside", closing the omission. The character-count line is
present beneath it, matching `cairn-site-anatomy.md`'s form.

The caption is the proposed replacement. The redundant opening is folded away, the best line
survives in first position, `primitives` is glossed as "ready-made screen parts", and the
earlier "code and accounts the organization owns" is now "are the organization's to own and
maintain", which no longer asserts the organization writes the payments provider.

One residue, below the bar of a finding: the caption's second clause, "cairn's own screens sit
beside screens the site writes", still restates the alt's "cairn's screens beside the site's
own". The register asks that a caption not be redundant with the alt, and one clause of five
sentences is within tolerance for a figure whose lesson has to appear in both.

### Fix 7, `shell` and `main`: FOLDED

`in the same admin frame and sign-in` appears in the figure, and `admin frame` appears in the
`<desc>` and in the sidecar's "Inside the admin" section. No occurrence of `shell` remains in
either concept file. `main` is set as
`<tspan class="t-mono">main</tspan>`, and it renders in the accent mono face in all four
renders, matching the anatomy figure's treatment of the same word.

### Fix 8, American spelling: FOLDED

`grep -rn "organis"` returns nothing across `docs/internal/site-figures.svg`,
`docs/extend/assets/cairn-concept.svg`, and `docs/extend/assets/cairn-concept.md`. The figure
renders `Organizational mail` and `the organization's own work`.

### Fix 9, the dead register: FOLDED

`grep` for `node-plain`, `fill-plain`, `stroke-plain`, and `panel A` returns nothing in
`docs/internal/site-figures.svg`, `docs/internal/site-figures.md`, or either shipped SVG. The
Registers section of `site-figures.md` now describes three registers plus `.boundary`, and
explains why the outline is not a register. The published asset ships no dead CSS and no
comment about a figure that does not exist.

### Fix 10, the emitter gate: FOLDED

`package.json` carries `"check:figures": "node scripts/figures/build-site-figures.mjs --check"`,
and `.github/workflows/test.yml` runs `npm run check:figures` in the same block as the other
`check:` gates. Running the checker in this working tree reports `up to date` for both shipped
files and exits 0, so the shipped assets match the source.

---

## The three structural confirmations

1. **Members' area inside the app outline and outside `/admin` in the developer register.**
   Confirmed in the source geometry and in all four renders. See fix 1.
2. **The app outline as its own device and the heaviest line on the canvas in both schemes.**
   Confirmed by measurement. 16.33:1 in light and 13.45:1 in dark against the page, 15.22:1 and
   14.63:1 against the frame fill it encloses, at stroke-width 2.6 against 1.6 for every
   competing band. See fix 2.
3. **Both fills visible in the first 720 viewport.** Confirmed in both 720 renders. The second
   fill's title is cut mid-word, which is the PARTIAL under fix 3.

## New defects introduced by the rework

**COSMETIC.** `/admin` is set in body type in the new Members' area label,
`your own sign-in and your own store, outside /admin`, while the same token is set in code type
as `<text class="t-code">/admin</text>` on the card two rows above, and the anatomy figure sets
it in `.t-mono`. The same rework put `main` into code type for exactly this reason, so the one
new label in the figure is now the one place a path is set as prose.

**NOTE, not a defect.** The `Public site` column keeps its 214-unit height after narrowing to
226 units wide, leaving about 90 units of empty ground below its last line in all four renders.
The height matches the `/admin` card beside it, so the empty space buys row alignment. Leave it.

**NOTE, cross-figure drift.** The sibling `cairn-site-anatomy.svg` and its sidecar still carry
`inside cairn's shell`, unglossed, which the concept figure has now replaced with `admin frame`.
The vocabulary ruling is not scoped to the concept figure. The anatomy figure was not this
rework's subject, so this is reported rather than charged against it.

## Sibling regression: the docs figure after the shared style changed

`cairn-site-anatomy.svg` shares the style block, so it took the `--frame` deepening to
`#f2f2f2`, the `--stroke-hair` change to `#7a7a7a`, and the `.card` stroke-width raise to 1.4.
Its own outline still uses `.frame`, unchanged, as the fix required. The rendered ladder at
1100 is intact: the two owner bands, the six cards, `src/content/` drawn across the seam, the
outside row, and both edge labels. The darker hairline makes the eight cards read more crisply
against the deepened ground, and no text contrast moved, with `--muted` on `--frame` measuring
7.01:1. The floor is unchanged at 800 x 972, scale 0.90, 12.15 CSS px, as the scale table
still records. No regression.

---

## Verdict

**SHIP AFTER COSMETIC FIXES.**

Nine of the ten fixes are folded, the tenth is folded in geometry and serves its purpose with
one label cut mid-word, all three structural items are confirmed by measurement and by render,
the sibling figure is unharmed, and the emitter is gated. One new cosmetic defect arrived with
the rework.

The fixes, verbatim, both against `docs/internal/site-figures.svg` followed by
`node scripts/figures/build-site-figures.mjs`:

1. Change
   `<text class="t-edge" x="196" y="366">your own sign-in and your own store, outside /admin</text>`
   to
   `<text class="t-edge" x="196" y="366">your own sign-in and your own store, outside <tspan class="t-mono">/admin</tspan></text>`,
   matching the treatment `main` received in the same rework. Re-render and confirm the line
   still ends inside the band's right edge at x=978.

2. Optional, and only if the mid-word cut is judged too rough: move `Your own screens` and its
   four body lines from `x="658"` to `x="650"`, and its band from `x="638"` to `x="630"`,
   which buys eight units toward the title clearing the 720 cut. Do not narrow the band
   further, since its longest line, `in the same admin frame and sign-in`, already sets the
   width.
