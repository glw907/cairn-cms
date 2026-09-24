# Fixture: a container that follows the grammar

## docs/example/page.md
- `f:aaa001` `greet` returns a templated hello string. Source: `target.ts:1-3` (`export function greet(name: string): string`). [verified]
- `f:aaa002` The fixture's version constant is 1. Source: `target.ts:5` (`VERSION = 1`). [verified]
- `f:aaa003` A claim sourced only to a doc page, not traced to code. Source: page text. [candidate: sourced to the page only, not traced to code]
- `f:aaa004` A fact about a platform cairn depends on but does not own. Source: none found in repo. [external: SvelteKit]
- `f:aaa005` A vendor figure that lives on the vendor's own page. Source: none found in repo. [vendor: link, not a repo fact]
- `f:aaa006` A claim that turned out false. Source: page text. [rejected: contradicted by target.ts's actual export]

## Harvest record
- Pages covered: 1. This bullet carries no Source and no tag, and that is fine under this heading.
- Total facts: 6.

## Provenance
- Harvested for the fixture. No Source, no tag needed here either.
