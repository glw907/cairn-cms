# CairnHead

Renders a page's SEO head from a `SeoMeta` value into `svelte:head`. It carries no CSS, so it reads no class and no token and pulls in no stylesheet. Import it from `@glw907/cairn-cms/delivery/head`.

Rendered markup:

```html
<title>Page title · Site</title>
<meta name="description" content="A one-line summary.">
<link rel="canonical" href="https://example.com/page">
<link rel="alternate" type="text/markdown" href="https://example.com/page.md">
<script type="application/ld+json">{"@type":"Article"}</script>
```

Reads:

- `seo` is the plain-data head. `title` replaces the title, or `false` lets the site own it. `titleTemplate` wraps the title in the site's suffix. `markdownUrl` adds the alternate link to the raw-markdown twin.

Override seams:

- Nothing to restyle. A theme that wants a `theme-color` meta tag adds it in its own layout head, since the tag follows a site color and not a cairn role.
