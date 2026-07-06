---
title: Predefined color schemes
date: 2026-05-16
description: Some of the well-crafted, updated predefined color schemes for AstroPaper.
tags:
  - astro
  - color-schemes
---

Beyond the default paper-and-ink palette, AstroPaper ships a handful of alternate schemes a site
owner can drop in: a warmer "ember" tone, a cooler "jadeite" green, and a near-monochrome
"espresso" for a quieter reading surface.

Each scheme is the same five-role shape (background, foreground, accent, muted, border), so
swapping one in is a drop-in file replacement, never a template edit. The five-role discipline is
exactly what makes a scheme swap safe: nothing outside that file can be color-literal, or the
swap would leave something behind.
