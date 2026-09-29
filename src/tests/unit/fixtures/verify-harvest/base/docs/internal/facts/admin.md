# Admin facts

Fixture container for the harvest verifier's unit test.

## docs/admin/alpha.md

- `f:aa0001` Alpha states one checkable thing. Source: `src/alpha.ts:1`. [verified]
- `f:aa0002` A list item makes a claim. Source: `src/alpha.ts:2`. [verified]
- `f:aa0003` A claim still awaiting a trace. Source: page text. [candidate: not traced to code]
- `f:aa0004` A claim the code contradicts. Source: `src/alpha.ts:3`. [docs-drift: page says "x"]

## docs/admin/bravo.md

- `f:bb0001` Bravo claim A is a platform fact. Source: https://example.com/a. [external: GitHub]
- `f:bb0002` Bravo claim B is a vendor figure. Source: https://example.com/b. [vendor: link, not a repo fact]
- `f:bb0003` Bravo claim C is false. Source: `docs/internal/record/harvest/admin/bravo.json`. [rejected: describes a deleted page]

## Harvest record

- A note with no id, exempt from every rule here, even one naming docs/admin/alpha.md in a Source: field.
