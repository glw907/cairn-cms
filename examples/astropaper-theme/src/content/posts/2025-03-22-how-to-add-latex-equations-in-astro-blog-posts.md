---
title: How to add LaTeX Equations in Astro blog posts
date: 2025-03-22
description: Learn how to add LaTeX equations in Astro blog posts using Markdown, KaTeX, and remark/rehype plugins.
tags:
  - astro
  - docs
---

A markdown pipeline that already runs remark and rehype plugins can add LaTeX support with two
more: one that parses `$...$` and `$$...$$` math delimiters, and one that renders the parsed
expression to static markup at build time.

The result ships as plain HTML and CSS, not a client-side script, so a reader with JavaScript
disabled still sees the equation exactly as written. cairn's own render pipeline runs on the
same remark/rehype foundation, so a site that wants LaTeX support adds the same two plugins to
its own `render()` function, no engine change required.
