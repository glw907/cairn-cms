# Brief template

One document, saved under the site's own docs (for example
`docs/internal/consultations/YYYY-MM-DD-<what-it-presses>.md`), never inside the cairn-cms
checkout. One item per edge pressed; a pass that presses more than one edge lists more than one
item in the same document.

```markdown
### <item slug>

1. **What the pass builds:** <the site feature, one paragraph>
2. **The engine edge it presses:** <surface, `file:line` where known>
3. **Evidence for the any-site case:** <recurrence, measurements, prior instances>
4. **The site's fallback if declined:** <the hand-roll, with its rough size>
```

Field 4 matters even when nobody asks: it prices the decline, and on a decline it becomes the
sanctioned end state rather than debt to work off later. Field 2 wants a `file:line` whenever the
edge is a specific export or component; when it is a whole missing capability, name the seam that
would carry it instead.

Test each item against `references/the-standard.md` before filing: an item that fails the gate
there (the hand-roll is small, domain-shaped, or a discoverability problem an export would not
fix) is not worth sending, whether or not filing succeeds.
