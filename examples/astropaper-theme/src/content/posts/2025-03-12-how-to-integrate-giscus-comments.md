---
title: How to integrate Giscus comments into AstroPaper
date: 2025-03-12
description: Comment function on a static blog hosted on GitHub Pages with Giscus.
tags:
  - astro
  - docs
---

A static site has no server to store a comment in, so AstroPaper's own recommendation is Giscus:
a comments widget backed entirely by GitHub Discussions. A reader signs in with GitHub, the
comment posts as a Discussion reply, and the widget embeds it back on the page.

Nothing about this is cairn-specific. A site adds the Giscus script tag to its own post
template the same way it would on any static site; the CMS's job stops at rendering the
markdown, and a reader-facing widget like this sits entirely in the theme's own layer.
