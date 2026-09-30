import type { PageServerLoad } from './$types';
import { previewMarkdown } from '@glw907/cairn-cms';
import { cairn } from '$theme/cairn.config.js';

// The styleguide renders a representative markdown sample through the SAME adapter `render` the
// article route calls, so the page shows the real prose output (the bespoke reading surface, the
// build-time highlighter, the directive components) rather than a hand-built imitation. Rendering on
// the server keeps the highlighter off the client bundle, the engine-fat rule. The route prerenders.
export const prerender = true;

// A sample that exercises every element the reading surface styles: the lead, headings, emphasis and
// a link, an unordered list, an ordered list, a task list, a blockquote, inline code, two fenced
// blocks in different languages (to show the highlighter across token kinds), a table, a horizontal
// rule, and a figure. The directive components are not written here: the load below renders one
// sample per registry entry, so a new component appears on the page without an edit to this route.
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

For a short snippet inside a sentence, wrap it in backticks so a filename like \`cairn.config.ts\` reads as code. For anything longer, a fenced block turns on the highlighter:

\`\`\`js
// The one seam the engine asks each site to fill.
export function render(markdown) {
  const trimmed = markdown.trim();
  return renderMarkdown(trimmed);
}
\`\`\`

The highlighting colors come from the same token set as the rest of the page, so a re-skin recolors code with no edit:

\`\`\`css
:root {
  --color-primary: oklch(45% 0.1 248); /* the accent */
  --font-display: 'Figtree Variable', sans-serif;
}
\`\`\`

A table handles its own alignment, the header rule, and the zebra striping:

| Element    | How you write it | What it is for                  |
| ---------- | ---------------- | ------------------------------- |
| Heading    | \`## Text\`        | The shape of the post           |
| Bold       | \`**word**\`       | A term that should stand out     |
| Code block | \`\` \`\`\`lang \`\`  | Showing code, with highlighting |

A figure holds a picture and its caption together, placed in the text column:

:::figure{.center}
![A still mountain lake reflecting the peaks above it](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80)

A centered figure holds the measure of the text.
:::

---

The horizontal rule above is a plain hairline.
`;

/** One registered component's rendered sample. */
interface ComponentSample {
  name: string;
  label: string;
  html: string;
}

export const load: PageServerLoad = async () => {
  // Render through the adapter, the same call the article route makes; with no resolvers passed,
  // the adapter's default public media resolver backs the render.
  const render = (body: string) => cairn.rendering.render({ body });

  // One sample per registry entry, from the entry's `preview` serialized as directive markdown. An
  // entry with no `preview` has nothing to render and is listed by name instead.
  const components: ComponentSample[] = [];
  const withoutPreview: string[] = [];
  for (const def of cairn.rendering.components?.defs ?? []) {
    const markdown = previewMarkdown(def);
    if (markdown === undefined) withoutPreview.push(def.name);
    else components.push({ name: def.name, label: def.label, html: await render(markdown) });
  }

  return { proseHtml: await render(SAMPLE), components, withoutPreview };
};
