# Fixture: pre-migration content for the id-insertion migration script

## docs/example/page.md
- A claim that soft-wraps across two lines,
  finishing here. Source: page text. [candidate: sourced to the page only, not traced to code]
- `f:zzz999` A claim that already carries an id and must be left untouched. Source: page text. [verified]
- Another claim needing an id. Source: page text. [external: GitHub]

## Harvest record
- A note under the skipped heading that never gets an id, even though it starts with a dash.

## Provenance
- Another skipped-heading note.
