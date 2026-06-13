# Design reference artifacts

`2026-06-12-editor-shell-gold-standard.html` is the approved gold standard for the cairn admin
UI, produced in the 2026-06-12 editor-as-home design session and declared the bar by Geoff: every
admin surface should carry this grade of polish. It renders with the real compiled admin sheet
and fonts; to view it, copy the assets beside it and serve the folder:

```bash
npm run package
cp dist/components/cairn-admin.css docs/internal/design/
cp -r dist/components/fonts docs/internal/design/
python3 -m http.server 4180 -d docs/internal/design
# open http://localhost:4180/2026-06-12-editor-shell-gold-standard.html
```

The copied assets stay untracked (.gitignore beside this file); only the mockup itself is the
record. The interaction rules it illustrates live in
`docs/superpowers/specs/2026-06-12-cairn-editor-takes-the-shell-design.md`; the standing design
language lives in `docs/internal/admin-design-system.md`.
