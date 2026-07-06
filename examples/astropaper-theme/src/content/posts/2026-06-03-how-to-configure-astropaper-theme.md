---
title: How to configure AstroPaper theme
date: 2026-06-03
description: How you can make AstroPaper theme absolutely yours.
tags:
  - astro
  - configuration
  - blog
featured: true
---

AstroPaper ships with a handful of knobs a site owner turns without touching the theme's own
code: the site title, the description, the social links, and the feature flags that show or
hide the archive link, the search page, and the light/dark toggle.

## Site options

| Option | Description |
| --- | --- |
| `title` | The site name, shown in the header and every page's `<title>`. |
| `author` | Your display name, read by the JSON-LD structured data on every post. |
| `desc` | The one-line description search engines and social cards show. |

## Feature flags

- `showArchives` toggles the archive icon in the header nav.
- `search` toggles the search page and its header link.
- `lightAndDarkMode` toggles the theme switch.

This cairn port keeps the same shape: a chrome layer that reads a handful of tokens, and a
composed home and archive that read the post index directly, no bespoke config format needed.
