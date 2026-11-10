---
title: CommonMark blocks
---
This page is the block layer of the conformance set, written against the CommonMark 0.31.2 section list: thematic breaks, ATX headings, setext headings, indented code blocks, fenced code blocks, HTML blocks, link reference definitions, paragraphs, blank lines, block quotes, list items, and lists.

## Thematic breaks

Three kinds of line make a rule.

---

***

___

## ATX headings

# Heading level one
## Heading level two
### Heading level three
#### Heading level four
##### Heading level five
###### Heading level six

## Setext headings

A setext heading level one
==========================

A setext heading level two
--------------------------

## Indented code blocks

    An indented code block keeps its text as typed.
      A second line, indented further.

    A blank line inside the block stays part of it.

## Fenced code blocks

```js
// A fenced block with a language.
const answer = 42;
```

~~~
A tilde fence with no language.
~~~

````md
A longer fence can hold a shorter one:

```
inner fence
```
````

```
A long unbroken line in a code block, to test horizontal scrolling: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

## HTML blocks

<div>
A block of raw HTML inside a div. The sanitizer keeps a div and its text.
</div>

## Link reference definitions

A reference link uses a definition made elsewhere: [the definition][ref-one] and [another one][ref-two].

[ref-one]: https://commonmark.org/ "The CommonMark site"
[ref-two]: https://spec.commonmark.org/0.31.2/

## Paragraphs and blank lines

A paragraph is one or more lines of text. This one has two lines
that run together, because a single newline is a soft break.

A second paragraph follows a blank line. Extra blank lines between paragraphs add no space.



A third paragraph follows three blank lines.

## Block quotes

> A block quote holds paragraphs.
>
> A second paragraph in the quote.
>
> > A quote nested inside the quote.
>
> - A list inside the quote.
> - A second item.

## List items and lists

- A bullet list.
- With a second item.
  - And a nested item.
    - And a third level.

* A list with a different marker is a second list.
* Its second item.

1. An ordered list.
2. With a second item.
3. And a third.

7. An ordered list that starts at seven.
8. Its second item.

- A loose list, with a blank line between items.

- Its second item has two paragraphs.

  The second paragraph belongs to the second item.

- Its third item holds a code block:

  ```
  code inside a list item
  ```

1) An ordered list with a different delimiter.
2) Its second item.
