---
title: The reading surface
date: 2026-04-05
description: A working tour of every element this theme styles, written as the markdown an author actually types.
author: about
image:
  src: https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80
  alt: A trail of light through a green forest
  caption: A path through the trees.
---
<p class="lead">This post is the manual for writing here. Every paragraph below is a real element, rendered by the same theme your readers see. Read it once and you will know how to write a post, drop in a component, and change the look of the whole site.</p>

You write in markdown. Markdown is plain text with a few punctuation marks that stand in for formatting, so a heading is a line that starts with `#`, and a list is a line that starts with `-`. The editor shows your raw text on the left and this rendered surface on the right. Nothing here is a hidden setting in a toolbar. What you type is what gets saved to the repository, and what gets saved is what the site reads.

## Headings give a post its shape

A second-level heading like the one above starts with two hash marks. Use one when you start a new section. The theme gives it room above and pulls it close to the text that follows, so the heading reads as a label on the section it introduces.

### Third-level headings sit inside a section

Three hash marks make a third-level heading. Reach for it when a section grows long enough to need its own subsections. Going deeper than this is usually a sign the post wants to be split in two.

## Text you can emphasize, and links

Inside a paragraph you can make a word **bold** by wrapping it in two asterisks, or *italic* with one. Bold is for a term you want to stand out on a skim. Italic is for a lighter stress or a title. You can also link to anywhere, like the [Unsplash photo library](https://unsplash.com), by putting the link text in square brackets and the address in parentheses right after.

To link to another post or page on this same site, write `cairn:posts/<id>` instead of a full web address. The engine turns that into the live link when the page renders, so the link keeps working even if you later change the post's date or title. The [about page](cairn:pages/about) is linked that way.

## Lists, in two flavors

An unordered list is for items with no particular order. Start each line with a dash:

- Each item is one line that begins with a dash.
- Keep items short and parallel in shape.
- The theme keeps the plain marker your browser already draws.

A numbered list is for steps that happen in sequence. Start each line with a number and a period, and let the editor count for you:

1. Write the first step.
2. Write the next one.
3. The numbers render in the display face, in the accent color.

A task list is a checklist. Add `[ ]` for an open item or `[x]` for a done one, right after the dash:

- [x] Decide what the post is about
- [x] Write a first draft
- [ ] Read it out loud and cut a third of it
- [ ] Publish

The boxes render as real checkboxes, fixed in place for reading. A reader sees at a glance what is done and what is left.

## Quotes, set apart

A line that starts with `>` becomes a blockquote. Use it when you quote someone else at length, or set off a passage you want the reader to slow down for.

> A good interface is like a joke. If you have to explain it, it is not that good.

When you want a single line from your own writing to land hard, make it a pull quote with the `pull-quote` component:

:::pull-quote[Write the post you wish someone had handed you on your first day.]
:::

The line sets in the display face and picks up an opening quotation mark in the accent color. Use it once in a post, at most. Its power comes from being rare. Give it `{attribution="..."}` when the line is not your own words.

## Code, inline and in blocks

For a short snippet inside a sentence, wrap it in backticks, so a filename like `cairn.config.ts` reads as code. For anything longer, use a fenced block: three backticks, the language name, your code, then three more backticks. Naming the language turns on syntax highlighting, which the theme colors from the same palette as everything else.

```js
// The one seam the engine asks each site to fill.
export function render(markdown) {
  return renderMarkdown(markdown);
}
```

The highlighting colors come from a small set of variables in the theme, the same ones that color the rest of the page. Change the palette and every code block recolors with it.

```css
/* These tokens drive the reading surface. */
:root {
  --color-primary: oklch(55% 0.13 250); /* the accent */
  --font-display: 'Figtree Variable', sans-serif;
}
```

To see your changes, build the site and open it. One command does both:

```bash
npm run build && npm run preview
```

## Tables, for anything with rows and columns

A table is rows of text separated by pipe characters, with a row of dashes under the header to mark it. The spacing in your raw text does not have to be tidy. The theme handles the alignment, the header rule, and the zebra striping.

| Element       | How you write it            | What it is for                       |
| ------------- | --------------------------- | ------------------------------------ |
| Heading       | `## Text`                   | The shape of the post                |
| Bold          | `**word**`                  | A term that should stand out         |
| Link          | `[text](address)`           | Sending a reader somewhere           |
| Code block    | ` ```lang `                 | Showing code, with highlighting      |

## Images, placed three ways

An image goes inside a figure, which is a block that holds the picture and its caption together. Wrap the image in `:::figure` and choose where it sits. The default is the text column. Add `{.center}` to keep it centered at the column width:

:::figure{.center}
![A still mountain lake reflecting the peaks above it](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80)

A centered figure holds the measure of the text.
:::

Add `{.wide}` to let the image break past the text column on a large screen, which suits a landscape:

:::figure{.wide}
![A long alpine ridge under a clear sky](https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1600&q=80)

A wide figure reaches past the column on either side.
:::

Add `{.full}` for an image that spans the full width of the page, for a moment that deserves the room:

:::figure{.full}
![Layered mountains fading into morning mist](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&q=80)

A full-bleed figure runs edge to edge.
:::

The caption is whatever text you put under the image inside the figure. In a finished site you would store your own pictures in the Media Library and reference them by a short `media:` handle instead of a web address, so the link never breaks when an image is renamed.

---

## Components, for the things markdown cannot say

That horizontal rule above is three dashes on their own line. It marks a real break in the post.

Some things you want to say do not fit any plain markdown element. For those, this site ships a small set of components, and you drop them into your text with the same kind of block syntax as a figure. The first is a callout, for pulling one idea out of the flow. It comes in three tones.

A note is the calm one, for an aside or a definition:

::::callout[A quick definition]{tone="note"}
A *concept* is a kind of content, like a post or a page. This site has two of them. A new concept is a change to the site's setup, not something you make while writing.
::::

A tip is for advice that will save the reader trouble:

::::callout[Write the title last]{tone="tip"}
The title is a promise about the post. You will know what you actually promised only after the post is written. Drafting it last saves you from a title that no longer fits.

:::points
- A vague title is a sign of a vague post.
- If you cannot title it, the post is not finished.
:::
::::

A warning is for something the reader needs to be careful about:

::::callout[Publishing is public]{tone="warning"}
Saving keeps your work on a private draft. Publishing copies it to the live site, where anyone can read it. There is no separate review step, so read the post once more before you publish.
::::

The second component is an alert, for a caution set in a bordered card with an icon. It reads as a heavier signal than a callout, so save it for the rare note a reader must not miss:

:::alert[Check the date before you publish]{role=caution}
The post's date sets its place in the archive and its web address. Fixing it after you publish changes the link, which can break anything pointing at the old one. Get it right the first time.
:::

The third component is an icon, a single glyph from the site's icon set for a short line that wants a marker of its own, with no card and no title:

:::icon{name="flag"}
:::

Pick the glyph from the same picker the callout and alert icons use. An icon name outside the declared set is not a shape the site can draw, so it fails the build rather than rendering a blank one.

The fourth component is a video link. It never requests the video platform until a reader clicks through; before that it is a static panel naming where the link goes:

:::video{url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="A short walkthrough"}
:::

The fifth is a CTA, a single link styled like a button, for pointing the reader at the one next step that matters:

:::cta{label="Read the getting-started guide" url="https://example.com/guide" variant="primary"}
:::

The sixth is an FAQ question, a native disclosure widget that works with no JavaScript. The answer takes full markdown, including a **bold** term or a [link](https://example.com):

:::faq{question="Does the FAQ component support formatting in the answer?"}
Yes. The answer slot is **markdown**, so you can add emphasis, a [link](https://example.com), or even a short list:

- It renders through the same pipeline as a post's body.
- Nothing here is a plain-text-only special case.
:::

## Changing the look

Everything you have seen draws its type, color, and spacing from one set of variables, the design tokens, in a single theme file. The accent color, the heading font, the width of the text column, and the rhythm between blocks are all named values you can edit in one place. Change `--color-primary` and the links, the list markers, the blockquote rule, and the callout accents all move together. The point of a surface like this is that the writing and the site stay in step, so a post written today still looks right after the next redesign.

You now know every element. Open the editor, start a post, and try them.
