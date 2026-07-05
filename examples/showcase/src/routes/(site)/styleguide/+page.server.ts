import type { PageServerLoad } from './$types';
import { cairn } from '$lib/cairn.config';

// The styleguide renders a representative markdown sample through the SAME adapter `render` the
// article route calls, so the page shows the real prose output (the bespoke reading surface, the
// build-time highlighter, the directive components) rather than a hand-built imitation. Rendering on
// the server keeps the highlighter off the client bundle, the engine-fat rule. The route prerenders.
export const prerender = true;

// A sample that exercises every element the reading surface styles: the lead, headings, emphasis and
// a link, an unordered list, an ordered list, a task list, a blockquote, a pull-quote, inline
// code, two fenced blocks in different languages (to show the highlighter across token kinds), a
// table, a horizontal rule, a figure, and the two directive components (callout note/tip/warning and
// the alert). It doubles as documentation, the bar's "the prose is the documentation" principle.
const SAMPLE = `<p class="lead">This is the reading surface. Every element below is rendered by the same theme a reader sees, so the styleguide shows the real prose output rather than an imitation of it.</p>

You write in markdown, and the surface binds each element to the theme tokens. Change one token and the whole surface, this article included, re-skins in lockstep.

## A second-level heading

A heading on the display face, bound to the text it introduces with a large space above and a tight space below.

### A third-level heading

Inside a section. Reach for it when a section grows long enough to want its own parts.

Inside a paragraph you can make a word **bold** or *italic*, and link to [the cairn project](https://example.com). Bold reads on a skim; italic is a lighter stress.

- An unordered list, plainly marked.
- Each item one line, parallel in shape.
- The marker reads the brand accent.

1. An ordered list for steps in sequence.
2. The numbers render in the display face.
3. They pick up the accent color.

- [x] A done item in a task list
- [x] Another finished step
- [ ] An open item still to do
- [ ] One more left

> A blockquote, set apart with a left accent rule and italic type, for a passage worth slowing down for.

<p class="pullquote">A pull-quote reads in the display face, set apart from the surrounding text.</p>

For a short snippet inside a sentence, wrap it in backticks so a filename like \`cairn.config.ts\` reads as code. For anything longer, a fenced block turns on the highlighter:

\`\`\`js
// A render adapter is the one seam the engine asks each site to fill.
export function render(markdown) {
  const trimmed = markdown.trim();
  return renderMarkdown(trimmed);
}
\`\`\`

The highlighting colors come from the same token set as the rest of the page, so a re-skin recolors code with no edit:

\`\`\`css
:root {
  --color-primary: oklch(45% 0.1 248); /* the brand accent */
  --font-display: 'Figtree Variable', sans-serif; /* headings and pull-quotes */
}
\`\`\`

A table handles its own alignment, the header rule, and the zebra striping:

| Element    | How you write it | What it is for                  |
| ---------- | ---------------- | ------------------------------- |
| Heading    | \`## Text\`        | The shape of the post           |
| Bold       | \`**word**\`       | A term that should stand out     |
| Code block | \`\\\`\\\`\\\`lang\`     | Showing code, with highlighting |

A figure holds a picture and its caption together, placed in the text column:

:::figure{.center}
![A still mountain lake reflecting the peaks above it](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80)

A centered figure holds the measure of the text.
:::

---

The horizontal rule above is a plain hairline. Below are the directive components, dropped into the text with a fenced block syntax.

::::callout[A quick definition]{tone="note"}
A *concept* is a kind of content, like a post or a page. A note callout is the calm tone, for an aside.
::::

::::callout[Write the title last]{tone="tip"}
A tip callout is for advice that saves the reader trouble.

:::points
- A vague title is a sign of a vague post.
- If you cannot title it, the post is not finished.
:::
::::

::::callout[Publishing is public]{tone="warning"}
A warning callout flags something the reader needs to be careful about before they act.
::::

:::alert[Check the date before you publish]{role=caution}
An alert is a heavier signal than a callout, set in a bordered card with an icon. Save it for the rare note a reader must not miss.
:::

## Islands

An island is a directive that renders a static, no-JavaScript fallback on the server, then a small client
runtime mounts a live Svelte component over it. The banner below shows its fallback first, then becomes
interactive once the page hydrates, re-checking its own expiry rather than trusting the server's render.
The second banner has already expired, so it renders nothing, on the server and again independently once
the page hydrates.

:::banner{message="Trail conditions updates move to the new radio channel next month." expires="2999-01-01"}
:::

:::banner{message="Early registration for the spring clinic has closed." expires="2020-01-01"}
:::
`;

export const load: PageServerLoad = async () => ({
  // Render once, on the server, through the adapter. The same call the article route makes; with no
  // resolvers passed, the adapter's default public media resolver backs the render.
  proseHtml: await cairn.rendering.render({ body: SAMPLE }),
});
