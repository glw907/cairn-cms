# Checking a theme

The public-scope audit runs from the site's root:

```bash
npx cairn-audit --rule public-literals --rule theme-conformance --rule theme-contrast
```

## What the audit reads

`public.scope` in `cairn-audit.config.json` decides what is read: `src/theme`, `src/chassis`, `src/routes`, `src/lib/public`, and `src/lib/components` by default, minus `src/routes/admin`. The audit reads those roots and no others. A theme drafted in another directory is outside them, so copy it into the site's `src/theme/` before the run. To confirm a file is covered, put a color literal in it, run the audit, and look for a `public-literals` finding that names the file. Remove the literal.

## Build-checking a theme directory

To build-check a theme directory without touching a site, run this from the cairn-cms repository:

```bash
node scripts/lab/theme-fixture.mjs --build-only --theme-dir <dir>
```

It overlays `<dir>` onto `src/theme` in a temporary copy of the showcase, so the directory needs only the files it replaces, then builds and smoke-loads the pages.
