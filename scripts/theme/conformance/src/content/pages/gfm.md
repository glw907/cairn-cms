---
title: GitHub Flavored Markdown
---
This page is the GFM layer of the conformance set: tables, task lists, strikethrough, extended autolinks, and footnotes.

## Tables

| Left aligned | Centered | Right aligned |
| :----------- | :------: | ------------: |
| One | Two | 3 |
| A `code` cell | A **bold** cell | A [link](https://commonmark.org/) |
| A very long cell that holds enough words to force this table wider than a narrow screen and so test how the table scrolls or wraps | Short | 1,000,000 |

A table with a single column:

| Alone |
| ----- |
| A row |

## Task lists

- [x] A finished task
- [ ] An open task
- [ ] An open task with a long description that runs on until it wraps at a narrow width, to show where the box sits against the second line
  - [x] A nested finished task
  - [ ] A nested open task

## Strikethrough

This text is ~~crossed out~~ and this is ~~crossed out with **bold** inside~~.

## Extended autolinks

A bare address: https://commonmark.org/help/ and a www address: www.example.com and a bare email: someone@example.com, and a long one: https://commonmark.org/help/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.

## Footnotes

A sentence with a footnote.[^first] A second sentence cites another.[^second] The third reuses the first note.[^first]

[^first]: The first footnote, a short one.
[^second]: The second footnote has two paragraphs.

    The second paragraph of the second footnote, indented under it.
