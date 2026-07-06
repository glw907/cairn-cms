---
title: Customizing AstroPaper theme color schemes
date: 2026-05-17
description: How you can enable/disable light and dark mode, and customize color schemes of AstroPaper theme.
tags:
  - astro
  - color-schemes
  - configuration
---

AstroPaper's palette lives in one small block of CSS custom properties: a background, a
foreground, an accent, a muted pair, and a border. Everything else, every link, every heading,
every hairline, reads one of those five roles.

```css
:root, [data-theme="light"] {
  --background: #fdfdfd;
  --foreground: #282728;
  --accent: #006cac;
  --muted: #e6e6e6;
  --border: #ece9e9;
}
```

The dark theme is a second block with the same five keys, and nothing requires the two to share
a hue. AstroPaper's own dark mode swaps the accent from blue to orange rather than just
lightening it, which this cairn port carries forward exactly.
