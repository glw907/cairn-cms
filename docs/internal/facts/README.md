# The facts container

This directory holds agent-facing facts about cairn: one bullet per fact, each carrying its
source and a status tag. It is never shipped in the published docs arms (`docs/admin/`,
`docs/editors/`, `docs/extend/`, `docs/reference/`, `docs/why-cairn.md`), and it is not
register-graded the way those pages are; the register standard governs a page a reader opens,
this container is a working record for whoever, agent or person, next needs to verify a claim
against the code. It is the fact basis the eventual public docs draw from and check against, not
a draft of them.

## Fact format

Every fact is one bullet:

```
- <the claim>. Source: <file, symbol, line, or doc citation>. [<tag>]
```

A bullet ends with exactly one status tag. A fact with a compound story (partly confirmed,
partly not) still gets one tag, with the nuance folded into the tag's own qualifier text
(`[verified: the core claim traces to X; a secondary detail was not independently re-checked]`)
rather than a second bracket.

## Tag vocabulary

- **`[verified]`**: traced to a specific source file, symbol, line, or constant, and it matches
  the claim exactly.
- **`[docs-drift: page says "..."]`**: the code says one thing and a published doc page says
  another; the bullet records what the code actually does and quotes the page's wording so the
  drift is visible without opening the page.
- **`[external: <platform>]`**: a fact about GitHub, Cloudflare, SvelteKit, Vite, DaisyUI, or
  another platform cairn depends on but doesn't own; kept only because an implementer acts on it.
- **`[vendor: link, not a repo fact]`**: a price, plan name, or other vendor figure that lives on
  the vendor's own pricing or product page, not in this repo; the number itself is not restated
  here since a vendor changes it without telling cairn.
- **`[candidate: ...]`**: a claim that reads as plausible and is stated precisely, but was not
  independently traced to a source this pass; the qualifier says what was and wasn't checked.
- **`[rejected: ...]`**: a claim that turned out false, with the qualifier saying why; the bullet
  stays in place, tagged, so nobody re-harvests the same wrong claim later.

## Rules

- Every fact has a source. A fact with no traceable source is a `[candidate]`, never a bare
  assertion.
- A fact that contradicts the code is recorded as the code has it, tagged `[docs-drift]`, with
  the page's own wording quoted in the tag.
- An external platform fact is kept only when a site or an implementer acts on it; a platform
  detail nobody depends on is left out rather than harvested for its own sake.
- A vendor figure (a price, a plan name, a quota) gets a link or a citation, never a restated
  number, since cairn does not own it and it goes stale silently.
- A rejected fact stays as a bullet, tagged `[rejected]` with the reason, so it is not
  re-harvested as if it were still open.
- No em dash anywhere in this container; use a comma, a colon, or a new sentence instead.

## How this container grows

A pass that changes a public behavior adds or corrects the facts it touched, in the arm file for
the docs track that behavior belongs to. A site pass that hits a hole in the facts (something it
needed that wasn't recorded, or was recorded wrong) appends the hole to `gaps.md` rather than
guessing or silently working around it; `gaps.md`'s own header carries its entry shape and its
triage rule.

The `cairn-fact` command and an automated container check (a `check:facts`-shaped gate verifying
every bullet carries a source and a single tag) are planned for the docs-to-facts pass and are
**not built yet**. Until they land, adding and correcting facts here is a manual, reviewed
step, the same as editing any other doc.

## Index

One row per arm file, fact counts by status tag.

| Arm | Facts | Verified | Drift | External | Vendor | Candidate | Rejected |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `admin.md` | 86 | 75 | 4 | 0 | 7 | 0 | 0 |
| `editors.md` | 83 | 79 | 4 | 0 | 0 | 0 | 0 |
| `front-door.md` | 42 | 37 | 0 | 0 | 0 | 5 | 0 |
| `extend.md` | 335 | 302 | 5 | 26 | 0 | 1 | 1 |
| `reference.md` | 181 | 148 | 1 | 7 | 0 | 25 | 0 |
| **Total** | **727** | **641** | **14** | **33** | **7** | **31** | **1** |

`gaps.md` is the intake file for holes a site pass finds; it carries no fact bullets of its own
and is not counted in this table.
