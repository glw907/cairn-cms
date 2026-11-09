---
title: Every element on this site
date: 2026-11-01
description: One post that shows how each kind of markdown and each block renders, so you can see them side by side.
author: author
---
This post shows every element a post can hold, each rendered once. Use it to compare how your site's design treats them. The post's title is the page's first-level heading, so the sections below start at the second level.

::include{fragment="sample-content-note"}

## Headings

A heading gives a section its name. The editor's **Heading** button makes a second-level heading, and **Smaller heading** makes a third-level one. Lower levels exist, and they're rarely needed.

### Third-level heading

#### Fourth-level heading

##### Fifth-level heading

###### Sixth-level heading

Six levels exist.

## Paragraphs and line breaks

A paragraph is one or more lines of text with a blank line before and after. Write a second paragraph to see the space between them.

To break a line inside a paragraph, end the line with two spaces.  
The text after the break starts on a new line in the same paragraph.

## Inline text

Make a word **bold** to stand out, or *italic* for lighter stress. Cross out ~~text you've removed~~ with strikethrough. Set `inline code` in code style, such as a filename like `site.config.yaml`.

Links come in three forms. A [web link](https://commonmark.org/help/) goes to another website. A bare address such as https://commonmark.org turns into a link automatically. A [link to a page](cairn:pages/about) goes to an entry on this site and survives a change of address.

## Lists

An unordered list starts each item with a dash. Items can nest.

- The first item.
- The second item, with two items inside it.
  - An item one level in.
  - Another item one level in.
- The third item.

An ordered list numbers its items.

1. Write the first step.
2. Write the next step.
3. Check the result.

A task list adds a checkbox to each item.

- [x] Sign in to the editor
- [x] Write a post
- [ ] Publish it

## Quotes

A line that starts with `>` becomes a block quote, which sets a passage apart.

> A cairn is a stack of stones that marks a path. Each traveler adds one.
>
> A second paragraph can sit inside the same quote.

A pull quote sets one line in large type as a visual break.

:::pull-quote[Write the post you wish someone had handed you.]
:::

## Code

Inline code sits inside a sentence. A fenced block holds longer code, and naming the language turns on color.

```js
// Add two numbers.
export function add(a, b) {
  return a + b;
}
```

A fenced block with no language stays plain.

```
Plain text, in a block.
Line two.
```

    An indented block, four spaces in, is code too.

## Tables

A table lines text up in rows and columns. A colon in the divider row sets a column's alignment.

| Left aligned | Centered | Right aligned |
| :----------- | :--------: | ------------: |
| Bold | `**text**` | Ctrl+B |
| Italic | `*text*` | Ctrl+I |
| Link | `[text](address)` | Ctrl+K |

## Dividers

Three dashes on a separate line make a horizontal rule, which marks a break between sections of a post.

---

## Images and figures

A plain image is `![description](address)`, and the description is its alt text.

![A cairn of five stacked stones on a hill under a pale sky](/images/starter-cairn.svg)

A figure wraps an image with a visible caption. The `.wide` setting lets it extend past the text column on a large screen.

:::figure{.wide}
![A cairn of five stacked stones on a hill under a pale sky](/images/starter-cairn.svg)

A cairn marks the path.
:::

## Blocks

A block is a ready-made piece of content. In the editor, select **Insert block** to choose one and fill in its form. Each block in this section appears once.

A callout draws attention to one idea. Its tone is a note, a tip, or a warning.

::::callout[You can publish without saving first]{tone="tip"}
**Publish** saves your edits first, so you don't have to select **Save** beforehand.

:::points
- Save as often as you like.
- Publish when the post is ready.
:::
::::

An alert is a heavier notice for something a reader must not miss.

:::alert[Check the address]{role="caution"}
A post's address is set when you create it, and it doesn't follow the title after that. To change it later, open **Details** and select **Change address**. Links from other entries update automatically.
:::

An icon shows a single symbol from the site's icon set.

:::icon{name="flag"}
:::

A video link shows a panel that names where the video lives. The site requests nothing from the video platform until a reader selects it, and then it opens in a new tab.

:::video{url="https://www.youtube.com/watch?v=YE7VzlLtp-4" title="Big Buck Bunny, a short film from the Blender Foundation"}
:::

A call to action is a button-style link for the one step you most want a reader to take.

:::cta{label="Read the documentation" url="https://cairn.pub" variant="primary"}
:::

A compact pointer link suits further reading at the end of a section.

:::micro-cta{label="More about cairn" url="https://cairn.pub" note="the project's documentation"}
:::

A question and answer opens and closes when a reader selects the question.

:::faq{question="Can I delete the sample posts?"}
Yes. Delete any post or page from its list when you no longer need it.
:::

A banner announces something for a limited time. It removes itself after its expiry date.

:::banner{message="This banner is a sample, and it shows until the year 2999." expires="2999-01-01"}
:::

An include places a fragment, a piece of text you write once on the **Fragments** screen, wherever you want it. The sample content note near the top of this post is one. To add one, select **Include a fragment** in the toolbar.
