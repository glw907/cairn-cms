# Fixture: the facts container check-provenance resolves brief citations against

## docs/admin/example.md
- `f:pv0001` Run `cairn doctor --json` in the site directory; it exits 0 when every check passes, from version 0.96.0. Source: `tool/cmd/cairn/doctor.go:10`. [verified]
- `f:pv0002` The logger lives at `src/lib/log/`, `defineConcept` declares a concept, and `npm run check:facts` walks 810 facts. Source: page text. [verified]
- `f:pv0003` A GitHub installation token expires after one hour. Source: GitHub's REST documentation. [external: GitHub]
- `f:pv0004` Workers Paid is priced on Cloudflare's own plan page, https://example.com/pricing. Source: the vendor page. [vendor: link, not a repo fact]
- `f:pv0005` The token lasts 30 minutes. Source: page text. [docs-drift: page says "60 minutes"]
- `f:pv0006` An untraced claim. Source: page text. [candidate: sourced to the page only, not traced to code]
- `f:pv0007` An excluded claim. Source: page text. [candidate: excluded, its evidence lives only in the record]
- `f:pv0008` A false claim. Source: page text. [rejected: the code says otherwise]

## docs/internal/what-cairn-is-and-is-not.md (owner brief)
- `f:pv0009` The defaults can be replaced. Key phrase: "floors, not ceilings". Source: same file, "The defaults are floors, not ceilings." [verified]

## Harvest record
- A harvest note, never citable.
