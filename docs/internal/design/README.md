# Design reference artifacts

This folder holds admin UI design mockups and their frozen references. Two ideas govern it: the polish
**bar** is the live components, and a **mockup** is a throwaway tool for exploring a screen that has no
component yet.

## The polish bar is the live components

The bar every admin surface matches is the real, shipped admin, rendered on the showcase. It is the most
recent version by construction, it is authored in the DaisyUI 5 + Tailwind 4 utility classes the whole
admin uses, and it never drifts the way a hand-maintained static twin does. A static HTML file is not the
bar (`2026-06-12-editor-shell-gold-standard.html` was, and went stale; it is kept only so old links
resolve).

To see and capture the bar, build the showcase and drive the real admin behind the dev-backend session
(the same harness the e2e specs use):

```bash
npm run package                                  # build the engine the showcase consumes
npm --prefix examples/showcase run build
npm --prefix examples/showcase run preview        # serve the showcase
# the admin mounts at /admin/* behind the injected dev session; screenshot the office list,
# the edit page, the settings screens, and the media library as the reference states.
```

The standing design language (tokens, type, the component recipes, the load-bearing rules) lives in
`docs/internal/admin-design-system.md`. When polishing or adding an admin surface, match the live
components and that doc, not a static file.

## Mockups: exploring a screen that has no component yet

When a new screen needs a design before any component exists, an HTML mockup is the right tool, and it
must be authored in the same DaisyUI/Tailwind utility classes the component will carry, inside a
`data-theme` wrapper, never hand-rolled CSS against the tokens. Two reasons:

- The mockup is the source the component ports from. With the real utility classes, the port is a
  transcription, not a re-derivation, so spacing, contrast, and alignment cannot drift between the
  screenshot you approved and the component that ships.
- It keeps the whole admin idiomatic and maintainable, which is the point of the admin stack.

Ground a mockup in the closest live component (read its real class strings) so it starts from the bar.
Build the preview sheet with the real toolchain (it scans the design HTML as an extra Tailwind
`@source`, so your mockup's utility classes compile in), then serve the folder:

```bash
npm run design:mockup-css
python3 -m http.server 4180 -d docs/internal/design
# open http://localhost:4180/<your-mockup>.html
```

While iterating on a mockup's markup, rerun only `node scripts/build-mockup-css.mjs` to recompile without
repackaging. The compiled sheet and the copied fonts stay untracked (`.gitignore` beside this file); only
the mockup HTML and the design-reference markdown are the record.

## Freeze the design

When a mockup wins, freeze it as a `*-design-reference.md` beside it (see the media-library reference for
the convention): the chosen layout, the recipes used, the interaction, and the a11y notes, with the
winning HTML kept as the visual record. The interaction rules a mockup illustrates live with its spec
under `docs/superpowers/specs/`.
