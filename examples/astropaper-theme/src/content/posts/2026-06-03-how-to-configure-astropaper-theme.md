---
title: How to configure AstroPaper theme
date: 2026-06-03
modDate: 2026-06-05
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

## Configuring the site

All the site-wide settings above live in one config object, so a new site starts from a single
file instead of hunting through the theme's components:

<div class="code-card" data-filename="astro-paper.config.ts">

```ts
export default {
  site: {
    title: 'AstroPaper',
    author: 'Sat Naing',
    desc: 'A minimal, responsive and SEO-friendly Astro blog theme.',
  },
  showArchives: true,
  search: true,
  lightAndDarkMode: true,
};
```

</div>

<div class="callout callout-warning">
<p class="callout-title">Warning</p>
<div class="callout-body">

Restart the dev server after editing this file. Astro only reads site-wide config at startup,
so a saved change is silent until the next `astro dev`.

</div>
</div>

## Adding a custom social link

The social row in the header and footer reads the same list, so adding a platform there adds it
in both places:

<div class="code-card" data-filename="src/theme/components/SiteFooter.svelte">

```ts
const socials: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/glw907/cairn-cms', path: '...' },
  { label: 'Mastodon', href: 'https://mastodon.social/@astropaper', path: '...' },
];
```

</div>

This cairn port keeps the same shape: a chrome layer that reads a handful of tokens, and a
composed home and archive that read the post index directly, no bespoke config format needed.
