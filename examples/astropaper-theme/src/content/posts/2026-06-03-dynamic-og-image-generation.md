---
title: Dynamic OG image generation in AstroPaper blog posts
date: 2026-06-03
description: New feature in AstroPaper v1.4.0, introducing dynamic OG image generation for blog posts.
tags:
  - astro
  - blog
---

A shared post to a chat app or a social feed shows a preview card, and that card's image is the
`og:image` meta tag. AstroPaper generates one automatically per post, from the title and the
site's own brand colors, so every share gets a card with no manual design step.

The generated image is a static file, built once at deploy time, not rendered per request. A
reader's browser never triggers the generation; it only ever fetches the finished PNG.

This port keeps the same idea available through cairn's own SEO head component, which already
resolves a default share image per site; wiring a generated per-post image is a small addition
on top, not a new mechanism.
