# Chassis-B2 Task 1: content review, the thirteen posts

`vale` matches 0 files on `examples/showcase/src/content/posts/`, the content-post path carries
no Vale section, so the four hard gates below were checked by direct read against
`~/.claude/docs/web-content-method.md`'s definitions: a banned word or phrase, an unverified or
false claim, a safety or standard-of-care promise, a cost misstatement. This record fills the gap
the implementer's own chained report carried but this repo did not: one line per post, the gates
checked, the tellgrader cadence advisory value where one applied, and fixed or declined with the
reason.

| Post | Gates checked | Cadence advisory | Outcome |
| --- | --- | --- | --- |
| `2025-01-11-cold-start.md` | no hit on any of the four | none | clean, no change |
| `2025-02-08-icefall-watch.md` | no hit; "the safe window" and "safe window on a day like this" describe an observed, closing margin, not a promise the reader will be safe | none | declined: descriptive trail-conditions language, consistent with the existing corpus's voice (for example `2026-03-10-callout.md`'s safety fragment) |
| `2025-03-08-mud-season-begins.md` | no hit on any of the four | none | clean, no change |
| `2025-04-05-creek-crossing.md` | no hit; "the safer ford" is a relative comparison between two crossings the writer describes, not a guarantee | none | declined: same descriptive-comparison reading as `icefall-watch.md` |
| `2025-05-03-wildflower-window.md` | no hit on any of the four | none | clean, no change |
| `2025-05-31-new-boots-review.md` | no hit; no price stated, so the cost gate does not apply | none | clean, no change |
| `2025-06-28-solstice-loop.md` | no hit on any of the four | none | clean, no change |
| `2025-07-26-afternoon-thunder.md` | no hit; "only safe to be on before noon" states the writer's own turnaround rule from observed storm timing, not a promise of safety at any time | none | declined: same descriptive reading; the body text itself ("that's the point to turn around regardless of how close you are") frames it as judgment, not a guarantee |
| `2025-08-23-low-water-route.md` | no hit on any of the four | none | clean, no change |
| `2025-09-20-first-color.md` | no hit on any of the four | none | clean, no change |
| `2025-10-18-hunting-season-notes.md` | no hit on any of the four | none | clean, no change |
| `2025-11-15-early-snow-gear.md` | no hit on any of the four | none | clean, no change |
| `2025-12-13-solstice-dark.md` | no hit on any of the four | none | clean, no change |

No `[ASK]` markers were left in any of the thirteen posts.
