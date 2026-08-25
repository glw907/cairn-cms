# Pass 5 (Contract core and publication): cairn DX harvest findings

This platform is the second system, after the ASC site, to extend the cairn admin
interface (`CLAUDE.md`'s own "Standing DX-harvest duty"). Every task in this pass logs a
finding here as it lands, not retroactively at pass close.

## Filed during execution

### Review fold, batch 2: `prose.css`'s `.prose pre` assumes every `<pre>` is `pre.shiki`

`chassis/prose.css`'s `.prose pre` rule sets only a fenced block's measure, spacing, leading,
horizontal overflow, and the scroll-edge affordance gradient; the actual ground, ink, and
border come from a separate rule, `pre.shiki` in `chassis/tokens.css`, which only the
markdown-rendering pipeline's own syntax highlighter ever attaches. A route that hand-authors
`<pre><code>` outside that pipeline (this platform's six `/docs/contract` pages, written as
plain `.svelte` markup rather than markdown content) gets a `<pre>` with no ground at all: no
background, no border, and `.prose pre`'s own scroll-edge gradient paints a fade toward
`--cairn-code-bg` as if the block already had that background, which reads as a visible seam
against the surrounding page rather than a scroll cue. The reviewer's measurement: a bare block
sits directly on the page background with the gradient's "cover" edge floating on top of it,
most visible on the widest unwrapped lines (the shared-log how-to's `checkin_conflict` example).

The ground/ink/border binding belongs on `.prose pre` itself at the chassis altitude, not
conditioned on `pre.shiki`: every `<pre>` inside `.prose` is prose content and should read as
one, whether or not this build's highlighter touched it. This platform's local mitigation
(`src/theme/theme.css`) is a theme-level unlayered override giving `.prose pre` the same
`--cairn-code-bg`/`-ink`/`-border` triple `pre.shiki` already carries; every future
cairn-cms consumer that hand-authors a code block outside the markdown pipeline hits the same
gap until `chassis/prose.css` binds it once for everyone.
