# Fixture: a container that breaks the grammar, one bullet per rule

## docs/example/bad.md
- `f:bad001` A fact missing its Source field entirely. [verified]
- `f:bad002` A fact whose tag is outside the vocabulary. Source: page text. [maybe: not sure]
- `f:bad003` A fact carrying two tags at once. Source: page text. [verified] [candidate: also this]
- `f:bad004` A fact whose tag uses a space qualifier instead of the colon form. Source: page text. [candidate sourced to the page only]
- `f:bad005` A fact pointing at a file that does not exist. Source: `missing-file-does-not-exist.ts:1`. [verified]
- `f:bad006` A fact citing a line past the end of the file. Source: `target.ts:999`. [verified]
- `f:bad007` A fact whose quoted anchor names a token the file does not carry. Source: `target.ts:1` (`totallyWrongToken`). [verified]
- A fact with no leading id at all. Source: page text. [verified]

## Harvest record
- A fact missing its Source field entirely, but under the skipped heading so it does not fail. [verified]
